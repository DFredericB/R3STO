// ═══════════════════════════════════════════
//  R3STO — Auth Routes
//  POST /api/auth/login
//  POST /api/auth/signup
//  POST /api/auth/logout
//  GET  /api/auth/me
// ═══════════════════════════════════════════

const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcryptjs');
const crypto  = require('crypto');
const db      = require('../config/db');

// ── Helpers ──────────────────────────────
function token() { return crypto.randomBytes(32).toString('hex'); }
function expires30d() {
  return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    .toISOString().slice(0, 19).replace('T', ' ');
}
async function getSession(req) {
  const t = req.headers['x-session-token']
    || (req.headers.authorization || '').replace('Bearer ', '');
  if (!t) return null;
  const [rows] = await db.execute(`
    SELECT s.user_id, u.restaurant_id, u.role,
           u.prenom, u.nom, u.email, u.langue
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.id = ? AND s.expires_at > NOW() AND u.actif = 1
  `, [t]);
  return rows[0] || null;
}

// ── POST /api/auth/login ─────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'Email et mot de passe requis' });

    const [rows] = await db.execute(
      'SELECT * FROM users WHERE email = ? AND actif = 1',
      [email.toLowerCase().trim()]
    );
    if (!rows.length)
      return res.status(401).json({ error: 'Identifiants incorrects' });

    const user = rows[0];
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok)
      return res.status(401).json({ error: 'Identifiants incorrects' });

    // Créer session
    const tok = token();
    await db.execute(
      'INSERT INTO sessions (id, user_id, ip_address, expires_at) VALUES (?,?,?,?)',
      [tok, user.id, req.ip, expires30d()]
    );
    await db.execute(
      'UPDATE users SET last_login = NOW() WHERE id = ?',
      [user.id]
    );

    // Récupérer infos restaurant
    const [resto] = await db.execute(
      'SELECT id, nom, statut, plan_id FROM restaurants WHERE id = ?',
      [user.restaurant_id]
    );

    res.json({
      token:          tok,
      user_id:        user.id,
      restaurant_id:  user.restaurant_id,
      role:           user.role,
      prenom:         user.prenom,
      nom:            user.nom,
      email:          user.email,
      langue:         user.langue,
      restaurant:     resto[0] || null,
    });
  } catch (e) {
    console.error('Login error:', e.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ── POST /api/auth/signup ────────────────
router.post('/signup', async (req, res) => {
  try {
    const { email, password, restaurant_nom, prenom, nom, plan } = req.body;

    if (!email || !password || !restaurant_nom)
      return res.status(400).json({ error: 'Champs obligatoires manquants' });
    if (password.length < 8)
      return res.status(400).json({ error: 'Mot de passe trop court (8 caractères min)' });

    const emailClean = email.toLowerCase().trim();

    // Email déjà utilisé ?
    const [exist] = await db.execute(
      'SELECT id FROM users WHERE email = ?', [emailClean]
    );
    if (exist.length)
      return res.status(409).json({ error: 'Email déjà utilisé' });

    // Plan
    const planCode = plan || 'starter';
    const [plans] = await db.execute(
      'SELECT id FROM plans WHERE code = ?', [planCode]
    );
    const planId = plans[0]?.id || 1;

    // Slug unique
    const slug = restaurant_nom
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 60)
      + '-' + Date.now().toString(36);

    // Trial 14 jours
    const trialEnd = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
      .toISOString().slice(0, 10);

    const conn = await db.getConnection();
    await conn.beginTransaction();
    try {
      // Créer restaurant
      const [r] = await conn.execute(
        `INSERT INTO restaurants
         (plan_id, nom, slug, email, statut, trial_ends_at, onboarding_done)
         VALUES (?,?,?,?,'trial',?,0)`,
        [planId, restaurant_nom.trim(), slug, emailClean, trialEnd]
      );
      const restaurantId = r.insertId;

      // Créer user
      const hash = await bcrypt.hash(password, 10);
      const [u] = await conn.execute(
        `INSERT INTO users
         (restaurant_id, prenom, nom, email, password_hash, role)
         VALUES (?,?,?,?,?,'owner')`,
        [restaurantId, prenom || '', nom || '', emailClean, hash]
      );
      const userId = u.insertId;

      // Options par défaut
      await conn.execute(
        'INSERT INTO options (restaurant_id) VALUES (?)', [restaurantId]
      );
      // Widget config par défaut
      await conn.execute(
        'INSERT INTO widget_config (restaurant_id) VALUES (?)', [restaurantId]
      );

      await conn.commit();
      conn.release();

      // Auto-login
      const tok = token();
      await db.execute(
        'INSERT INTO sessions (id, user_id, ip_address, expires_at) VALUES (?,?,?,?)',
        [tok, userId, req.ip, expires30d()]
      );

      res.status(201).json({
        token:         tok,
        user_id:       userId,
        restaurant_id: restaurantId,
        role:          'owner',
        prenom:        prenom || '',
        nom:           nom || '',
        email:         emailClean,
        onboarding:    true,
      });
    } catch (e) {
      await conn.rollback();
      conn.release();
      throw e;
    }
  } catch (e) {
    console.error('Signup error:', e.message);
    if (e.code === 'ER_DUP_ENTRY')
      return res.status(409).json({ error: 'Email déjà utilisé' });
    res.status(500).json({ error: 'Erreur création compte' });
  }
});

// ── POST /api/auth/logout ────────────────
router.post('/logout', async (req, res) => {
  const t = req.headers['x-session-token'] || '';
  if (t) await db.execute('DELETE FROM sessions WHERE id = ?', [t]);
  res.json({ ok: true });
});

// ── GET /api/auth/me ─────────────────────
router.get('/me', async (req, res) => {
  try {
    const session = await getSession(req);
    if (!session) return res.status(401).json({ error: 'Non authentifié' });
    res.json(session);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
module.exports.getSession = getSession;
