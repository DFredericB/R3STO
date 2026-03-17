// ═══════════════════════════════════════════
//  R3STO — Admin Routes (Didier uniquement)
//  POST /api/admin/login
//  GET  /api/admin/stats
//  GET  /api/admin/restaurants
//  GET  /api/admin/restaurants/:id
//  PUT  /api/admin/restaurants/:id
// ═══════════════════════════════════════════
const express = require('express');
const router  = express.Router();
const db      = require('../config/db');
const crypto  = require('crypto');

// Token admin simple (en mémoire — suffisant pour usage interne)
const ADMIN_TOKENS = new Set();

// Credentials admin hardcodés — à migrer en BDD plus tard
const ADMIN_EMAIL = 'admin@r3sto.com';
const ADMIN_PASS  = 'r3sto2026';

function requireAdmin(req, res) {
  const t = req.headers['x-session-token'] || '';
  if (!ADMIN_TOKENS.has(t)) {
    res.status(401).json({ error: 'Accès admin refusé' });
    return false;
  }
  return true;
}

// ── POST /api/admin/login ────────────────
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (email !== ADMIN_EMAIL || password !== ADMIN_PASS)
    return res.status(401).json({ error: 'Identifiants incorrects' });
  const token = 'adm_' + crypto.randomBytes(20).toString('hex');
  ADMIN_TOKENS.add(token);
  res.json({ token, role: 'admin' });
});

router.post('/logout', (req, res) => {
  const t = req.headers['x-session-token'] || '';
  ADMIN_TOKENS.delete(t);
  res.json({ ok: true });
});

// ── GET /api/admin/stats ─────────────────
router.get('/stats', async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;

    const [[total]]  = await db.execute('SELECT COUNT(*) AS n FROM restaurants WHERE actif=1');
    const [[trial]]  = await db.execute("SELECT COUNT(*) AS n FROM restaurants WHERE statut='trial'");
    const [[active]] = await db.execute("SELECT COUNT(*) AS n FROM restaurants WHERE statut='active'");
    const [plans]    = await db.execute('SELECT p.code, p.nom, COUNT(r.id) AS n FROM plans p LEFT JOIN restaurants r ON r.plan_id=p.id AND r.actif=1 GROUP BY p.id');
    const [[resas]]  = await db.execute("SELECT COUNT(*) AS n FROM reservations WHERE date_resa >= DATE_FORMAT(NOW(),'%Y-%m-01')");
    const [[clients]]= await db.execute('SELECT COUNT(*) AS n FROM clients');
    const [[users]]  = await db.execute('SELECT COUNT(*) AS n FROM users WHERE actif=1');

    // MRR calculé
    const [mrrData] = await db.execute(`
      SELECT SUM(p.prix_annuel) AS mrr
      FROM restaurants r
      JOIN plans p ON p.id = r.plan_id
      WHERE r.statut = 'active' AND r.actif = 1
    `);

    res.json({
      restaurants_total:  parseInt(total.n),
      restaurants_trial:  parseInt(trial.n),
      restaurants_active: parseInt(active.n),
      users_total:        parseInt(users.n),
      clients_total:      parseInt(clients.n),
      resas_month:        parseInt(resas.n),
      mrr:                parseFloat(mrrData[0]?.mrr || 0),
      plans,
    });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── GET /api/admin/restaurants ───────────
router.get('/restaurants', async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;
    const [rows] = await db.execute(`
      SELECT r.id, r.nom, r.email, r.statut, r.created_at,
             p.code AS plan_code, p.nom AS plan_nom,
             COUNT(DISTINCT res.id) AS total_resas,
             COUNT(DISTINCT c.id)   AS total_clients,
             COUNT(DISTINCT u.id)   AS total_users
      FROM restaurants r
      LEFT JOIN plans        p   ON p.id  = r.plan_id
      LEFT JOIN reservations res ON res.restaurant_id = r.id
      LEFT JOIN clients      c   ON c.restaurant_id   = r.id
      LEFT JOIN users        u   ON u.restaurant_id   = r.id AND u.actif = 1
      WHERE r.actif = 1
      GROUP BY r.id
      ORDER BY r.created_at DESC
    `);
    res.json(rows);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── GET /api/admin/restaurants/:id ───────
router.get('/restaurants/:id', async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;
    const [[resto]] = await db.execute(
      'SELECT r.*, p.code AS plan_code FROM restaurants r LEFT JOIN plans p ON p.id=r.plan_id WHERE r.id=?',
      [req.params.id]
    );
    if (!resto) return res.status(404).json({ error: 'Restaurant introuvable' });
    const [users]  = await db.execute('SELECT id,prenom,nom,email,role,last_login FROM users WHERE restaurant_id=?',[req.params.id]);
    const [[resas]]= await db.execute('SELECT COUNT(*) AS n FROM reservations WHERE restaurant_id=?',[req.params.id]);
    const [[clients]]=await db.execute('SELECT COUNT(*) AS n FROM clients WHERE restaurant_id=?',[req.params.id]);
    res.json({ ...resto, users, total_resas: resas.n, total_clients: clients.n });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── PUT /api/admin/restaurants/:id ───────
router.put('/restaurants/:id', async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;
    const b = req.body;
    const allowed = ['statut','plan_id','actif'];
    const sets=[],vals=[];
    allowed.forEach(f=>{if(b[f]!==undefined){sets.push(`${f}=?`);vals.push(b[f]);}});
    if (!sets.length) return res.status(400).json({ error: 'Rien à mettre à jour' });
    vals.push(req.params.id);
    await db.execute(`UPDATE restaurants SET ${sets.join(',')} WHERE id=?`, vals);
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
