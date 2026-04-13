#!/usr/bin/env node
// ═══════════════════════════════════════════════════
//  R3STO — API Express v1.1.0
//  Backend Node.js complet : Auth + Restaurants + Admin + Stripe
//  Base de données : MariaDB (Infomaniak)
// ═══════════════════════════════════════════════════

const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 8080;

// ── Config ────────────────────────────────────────
const DB_CONFIG = {
  host: 'pl7wy9.myd.infomaniak.com',
  port: 3306,
  user: 'pl7wy9_R3STO',
  password: 'RueNeuve20#1081',
  database: 'pl7wy9_R3STO',
  waitForConnections: true,
  connectionLimit: 10,
  charset: 'utf8mb4',
};

const JWT_SECRET = 'r3sto_jwt_secret_2026_prod';
const JWT_EXPIRES = '30d';
const SETUP_KEY = 'r3sto_setup_2026';

// Stripe (à configurer avec ta vraie clé)
const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY || '';
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';

// ── SMTP (Infomaniak) ────────────────────────────
const smtpTransport = nodemailer.createTransport({
  host: 'mail.infomaniak.com',
  port: 587,
  secure: false,
  auth: {
    user: 'noreply@r3sto.ch',
    pass: 'RueNeuve20#1081',
  },
});

// ── OTP storage (en mémoire — suffisant pour commencer) ──
const otpStore = new Map(); // email -> { code, expires }

function generateOTP() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function sendOTPEmail(email, code) {
  try {
    await smtpTransport.sendMail({
      from: '"R3STO" <noreply@r3sto.ch>',
      to: email,
      subject: `${code} — Code de vérification R3STO`,
      html: `
        <div style="font-family:'DM Sans',Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#0d1829;color:#e8edf5;border-radius:16px;">
          <div style="text-align:center;margin-bottom:24px;">
            <div style="background:#1c4f90;display:inline-block;padding:12px 24px;border-radius:10px;font-size:24px;font-weight:800;letter-spacing:2px;color:white;">R3STO</div>
          </div>
          <h2 style="text-align:center;color:#4480d8;margin-bottom:8px;">Vérification de votre compte</h2>
          <p style="text-align:center;color:#6b82a8;font-size:14px;margin-bottom:24px;">Entrez ce code dans l'application pour confirmer votre identité.</p>
          <div style="text-align:center;background:#111e35;border:2px solid #2b5ba0;border-radius:12px;padding:20px;margin:0 auto 24px;max-width:280px;">
            <span style="font-family:'DM Mono',monospace;font-size:36px;font-weight:700;letter-spacing:8px;color:#fff;">${code}</span>
          </div>
          <p style="text-align:center;color:#6b82a8;font-size:12px;">Ce code expire dans 10 minutes.<br>Si vous n'avez pas demandé ce code, ignorez cet email.</p>
        </div>
      `,
    });
    console.log(`[R3STO] OTP envoyé à ${email}`);
    return true;
  } catch (err) {
    console.error('[R3STO] Erreur envoi OTP:', err.message);
    return false;
  }
}

// ── Pool DB ───────────────────────────────────────
let pool;
try {
  pool = mysql.createPool(DB_CONFIG);
  console.log('[R3STO] Pool MariaDB créé');
} catch (err) {
  console.error('[R3STO] Erreur pool DB:', err.message);
}

// ── Middleware ─────────────────────────────────────
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Fix préfixe /api ─────────────────────────────
// Le frontend appelle /api/auth/login mais le serveur écoute sur /auth/login
// Ce middleware réécrit /api/* → /* pour la compatibilité
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    req.url = req.url.replace('/api', '');
  }
  next();
});

// ── Auth Middleware ────────────────────────────────
function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token requis' });
  }
  try {
    const decoded = jwt.verify(header.split(' ')[1], JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Token invalide ou expiré' });
  }
}

function adminMiddleware(req, res, next) {
  if (!req.user || !['superadmin', 'admin'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Accès admin requis' });
  }
  next();
}

// ═══════════════════════════════════════════════════
//  ROUTES
// ═══════════════════════════════════════════════════

// ── Health ────────────────────────────────────────
app.get('/health', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT 1 as ok');
    res.json({
      status: 'ok',
      version: '1.1.0',
      db: rows[0].ok === 1 ? 'connected' : 'error',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.json({
      status: 'ok',
      version: '1.1.0',
      db: 'disconnected',
      error: err.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// ── Setup DB ──────────────────────────────────────
app.get('/setup', async (req, res) => {
  if (req.query.key !== SETUP_KEY) {
    return res.status(403).json({ error: 'Clé setup invalide' });
  }

  try {
    const conn = await pool.getConnection();

    // Disable FK checks for clean setup
    await conn.query('SET FOREIGN_KEY_CHECKS=0');

    // Drop existing tables for clean setup
    if (req.query.reset === 'true') {
      await conn.query('DROP TABLE IF EXISTS reservations');
      await conn.query('DROP TABLE IF EXISTS sessions');
      await conn.query('DROP TABLE IF EXISTS restaurants');
      await conn.query('DROP TABLE IF EXISTS users');
      console.log('[R3STO] Tables dropped for reset');
    }

    // Table users
    await conn.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        \`password\` VARCHAR(255) NOT NULL,
        name VARCHAR(255) DEFAULT '',
        phone VARCHAR(50) DEFAULT '',
        role ENUM('owner','manager','staff','superadmin','admin') DEFAULT 'owner',
        plan ENUM('free','bistro','resto','gastro') DEFAULT 'free',
        stripe_customer_id VARCHAR(255) DEFAULT NULL,
        stripe_subscription_id VARCHAR(255) DEFAULT NULL,
        status ENUM('active','suspended','deleted') DEFAULT 'active',
        email_verified TINYINT(1) DEFAULT 0,
        last_login DATETIME DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_email (email),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Table restaurants
    await conn.query(`
      CREATE TABLE IF NOT EXISTS restaurants (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) UNIQUE,
        type ENUM('restaurant','cafe','bar','brasserie','pizzeria','other') DEFAULT 'restaurant',
        address VARCHAR(500) DEFAULT '',
        city VARCHAR(100) DEFAULT '',
        postal_code VARCHAR(20) DEFAULT '',
        canton VARCHAR(50) DEFAULT '',
        country VARCHAR(50) DEFAULT 'CH',
        phone VARCHAR(50) DEFAULT '',
        email VARCHAR(255) DEFAULT '',
        website VARCHAR(500) DEFAULT '',
        capacity INT DEFAULT 0,
        logo_url VARCHAR(500) DEFAULT '',
        cover_url VARCHAR(500) DEFAULT '',
        description TEXT,
        currency VARCHAR(10) DEFAULT 'CHF',
        timezone VARCHAR(50) DEFAULT 'Europe/Zurich',
        status ENUM('active','inactive','setup','suspended') DEFAULT 'setup',
        settings JSON DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_user (user_id),
        INDEX idx_slug (slug),
        INDEX idx_status (status),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Table sessions (login tracking)
    await conn.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        token VARCHAR(500) NOT NULL,
        ip VARCHAR(50) DEFAULT '',
        user_agent VARCHAR(500) DEFAULT '',
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user (user_id),
        INDEX idx_token (token(100)),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Table reservations
    await conn.query(`
      CREATE TABLE IF NOT EXISTS reservations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        restaurant_id INT NOT NULL,
        guest_name VARCHAR(255) NOT NULL,
        guest_email VARCHAR(255) DEFAULT '',
        guest_phone VARCHAR(50) DEFAULT '',
        party_size INT DEFAULT 2,
        date DATE NOT NULL,
        time TIME NOT NULL,
        status ENUM('reserved','confirmed','arrived','seated','done','noshow','cancelled') DEFAULT 'reserved',
        notes TEXT,
        source ENUM('app','widget','phone','walkin','admin') DEFAULT 'app',
        table_id INT DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_restaurant (restaurant_id),
        INDEX idx_date (date),
        INDEX idx_status (status),
        FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Superadmin par défaut
    const [existing] = await conn.query('SELECT id FROM users WHERE email = ?', ['didier@r3sto.com']);
    if (existing.length === 0) {
      const hash = await bcrypt.hash('R3STO2026!', 12);
      await conn.query(
        'INSERT INTO users (email, `password`, name, role, plan, status, email_verified) VALUES (?, ?, ?, ?, ?, ?, ?)',
        ['didier@r3sto.com', hash, 'Didier', 'superadmin', 'gastro', 'active', 1]
      );
      console.log('[R3STO] Superadmin créé: didier@r3sto.com');
    }

    // Re-enable FK checks
    await conn.query('SET FOREIGN_KEY_CHECKS=1');

    conn.release();

    res.json({
      status: 'ok',
      message: 'Base de données initialisée avec succès',
      tables: ['users', 'restaurants', 'sessions', 'reservations'],
      superadmin: 'didier@r3sto.com',
    });
  } catch (err) {
    console.error('[R3STO] Setup error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════
//  AUTH
// ═══════════════════════════════════════════════════

// POST /auth/register
// Compatible auth.r3sto.ch: accepts restaurantName, firstName, lastName, email, phone, password, plan
app.post('/auth/register', async (req, res) => {
  try {
    const { email, password, name, phone, firstName, lastName, restaurantName, plan, placeId, address } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email et mot de passe requis' });
    }

    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email.toLowerCase()]);
    if (existing.length > 0) {
      return res.status(409).json({ message: 'Cet email est déjà utilisé' });
    }

    // Build name from firstName+lastName or name field
    const fullName = (firstName && lastName) ? `${firstName} ${lastName}`.trim() : (name || '');
    const userPlan = plan || 'free';

    const hash = await bcrypt.hash(password, 12);
    const [result] = await pool.query(
      'INSERT INTO users (email, `password`, name, phone, role, plan, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [email.toLowerCase(), hash, fullName, phone || '', 'owner', userPlan, 'active']
    );

    const token = jwt.sign(
      { id: result.insertId, email: email.toLowerCase(), role: 'owner', plan: userPlan },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES }
    );

    // Auto-create restaurant if restaurantName provided
    if (restaurantName) {
      const slug = restaurantName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      await pool.query(
        'INSERT INTO restaurants (user_id, name, slug, address, status) VALUES (?, ?, ?, ?, ?)',
        [result.insertId, restaurantName, slug, address || '', 'setup']
      );
      console.log(`[R3STO] Restaurant "${restaurantName}" créé pour user ${result.insertId}`);
    }

    // Log session
    const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await pool.query(
      'INSERT INTO sessions (user_id, token, ip, user_agent, expires_at) VALUES (?, ?, ?, ?, ?)',
      [result.insertId, token, req.ip, req.headers['user-agent'] || '', expires]
    );

    // Return access_token (auth.r3sto.ch expects this key)
    res.status(201).json({
      ok: true,
      access_token: token,
      token,
      user: { id: result.insertId, email: email.toLowerCase(), name: fullName, role: 'owner', plan: userPlan },
    });
  } catch (err) {
    console.error('[R3STO] Register error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /auth/login
app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email et mot de passe requis' });
    }

    const [users] = await pool.query('SELECT * FROM users WHERE email = ? AND status = "active"', [email.toLowerCase()]);
    if (users.length === 0) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    const user = users[0];
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, plan: user.plan },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES }
    );

    // Update last login
    await pool.query('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);

    // Log session
    const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await pool.query(
      'INSERT INTO sessions (user_id, token, ip, user_agent, expires_at) VALUES (?, ?, ?, ?, ?)',
      [user.id, token, req.ip, req.headers['user-agent'] || '', expires]
    );

    // Return both token and access_token for compatibility
    res.json({
      ok: true,
      access_token: token,
      token,
      user: {
        id: user.id, email: user.email, name: user.name,
        role: user.role, plan: user.plan, phone: user.phone,
      },
    });
  } catch (err) {
    console.error('[R3STO] Login error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /auth/send-otp — Envoi d'un vrai code par email
app.post('/auth/send-otp', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email requis' });

  const code = generateOTP();
  otpStore.set(email.toLowerCase(), { code, expires: Date.now() + 10 * 60 * 1000 });

  const sent = await sendOTPEmail(email, code);
  res.json({ sent, method: 'email' });
});

// POST /auth/verify-otp — Vérification du code OTP
app.post('/auth/verify-otp', async (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) return res.status(400).json({ error: 'Email et code requis' });

  const stored = otpStore.get(email.toLowerCase());
  if (!stored || stored.code !== code) {
    return res.json({ verified: false, message: 'Code incorrect' });
  }
  if (Date.now() > stored.expires) {
    otpStore.delete(email.toLowerCase());
    return res.json({ verified: false, message: 'Code expiré' });
  }

  otpStore.delete(email.toLowerCase());
  await pool.query('UPDATE users SET email_verified = 1 WHERE email = ?', [email.toLowerCase()]);

  const [users] = await pool.query('SELECT id, email, role, plan FROM users WHERE email = ?', [email.toLowerCase()]);
  if (users.length > 0) {
    const u = users[0];
    const token = jwt.sign({ id: u.id, email: u.email, role: u.role, plan: u.plan }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
    return res.json({ verified: true, access_token: token });
  }
  res.json({ verified: true });
});

// GET /auth/me
app.get('/auth/me', authMiddleware, async (req, res) => {
  try {
    const [users] = await pool.query(
      'SELECT id, email, name, phone, role, plan, status, created_at, last_login FROM users WHERE id = ?',
      [req.user.id]
    );
    if (users.length === 0) return res.status(404).json({ error: 'Utilisateur non trouvé' });
    res.json({ ok: true, user: users[0] });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ═══════════════════════════════════════════════════
//  RESTAURANTS
// ═══════════════════════════════════════════════════

// POST /restaurants
app.post('/restaurants', authMiddleware, async (req, res) => {
  try {
    const { name, type, address, city, postal_code, canton, phone, email, website, capacity, description } = req.body;
    if (!name) return res.status(400).json({ error: 'Nom du restaurant requis' });

    // Generate slug
    const slug = name.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    const [result] = await pool.query(
      `INSERT INTO restaurants (user_id, name, slug, type, address, city, postal_code, canton, phone, email, website, capacity, description, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'setup')`,
      [req.user.id, name, slug, type || 'restaurant', address || '', city || '', postal_code || '',
       canton || '', phone || '', email || '', website || '', capacity || 0, description || '']
    );

    res.status(201).json({
      id: result.insertId, name, slug, status: 'setup',
      message: 'Restaurant créé avec succès',
    });
  } catch (err) {
    console.error('[R3STO] Create restaurant error:', err);
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Un restaurant avec ce nom existe déjà' });
    }
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /restaurants (mes restaurants)
app.get('/restaurants', authMiddleware, async (req, res) => {
  try {
    const [restaurants] = await pool.query(
      'SELECT * FROM restaurants WHERE user_id = ? ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json({ restaurants });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /restaurants/:id
app.get('/restaurants/:id', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM restaurants WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Restaurant non trouvé' });
    res.json({ restaurant: rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PUT /restaurants/:id
app.put('/restaurants/:id', authMiddleware, async (req, res) => {
  try {
    const fields = ['name','type','address','city','postal_code','canton','phone','email','website','capacity','description','status','settings'];
    const updates = [];
    const values = [];

    for (const f of fields) {
      if (req.body[f] !== undefined) {
        updates.push(`${f} = ?`);
        values.push(f === 'settings' ? JSON.stringify(req.body[f]) : req.body[f]);
      }
    }

    if (updates.length === 0) return res.status(400).json({ error: 'Aucune donnée à mettre à jour' });

    values.push(req.params.id, req.user.id);
    await pool.query(
      `UPDATE restaurants SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`,
      values
    );

    res.json({ message: 'Restaurant mis à jour' });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ═══════════════════════════════════════════════════
//  RESERVATIONS
// ═══════════════════════════════════════════════════

// POST /reservations
app.post('/reservations', authMiddleware, async (req, res) => {
  try {
    const { restaurant_id, guest_name, guest_email, guest_phone, party_size, date, time, notes, source } = req.body;
    if (!restaurant_id || !guest_name || !date || !time) {
      return res.status(400).json({ error: 'restaurant_id, guest_name, date et time requis' });
    }

    const [result] = await pool.query(
      `INSERT INTO reservations (restaurant_id, guest_name, guest_email, guest_phone, party_size, date, time, notes, source)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [restaurant_id, guest_name, guest_email || '', guest_phone || '', party_size || 2, date, time, notes || '', source || 'app']
    );

    res.status(201).json({ id: result.insertId, message: 'Réservation créée' });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /reservations?restaurant_id=X&date=YYYY-MM-DD
app.get('/reservations', authMiddleware, async (req, res) => {
  try {
    const { restaurant_id, date, status } = req.query;
    let sql = 'SELECT r.* FROM reservations r JOIN restaurants rest ON r.restaurant_id = rest.id WHERE rest.user_id = ?';
    const params = [req.user.id];

    if (restaurant_id) { sql += ' AND r.restaurant_id = ?'; params.push(restaurant_id); }
    if (date) { sql += ' AND r.date = ?'; params.push(date); }
    if (status) { sql += ' AND r.status = ?'; params.push(status); }

    sql += ' ORDER BY r.date DESC, r.time ASC';

    const [rows] = await pool.query(sql, params);
    res.json({ reservations: rows });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PATCH /reservations/:id/status
app.patch('/reservations/:id/status', authMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['reserved','confirmed','arrived','seated','done','noshow','cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Statut invalide' });
    }

    await pool.query(
      `UPDATE reservations r JOIN restaurants rest ON r.restaurant_id = rest.id
       SET r.status = ? WHERE r.id = ? AND rest.user_id = ?`,
      [status, req.params.id, req.user.id]
    );

    res.json({ message: 'Statut mis à jour' });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ═══════════════════════════════════════════════════
//  ADMIN (Super Admin)
// ═══════════════════════════════════════════════════

// GET /admin/stats
app.get('/admin/stats', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const [[{ totalUsers }]] = await pool.query('SELECT COUNT(*) as totalUsers FROM users');
    const [[{ totalRestaurants }]] = await pool.query('SELECT COUNT(*) as totalRestaurants FROM restaurants');
    const [[{ activeRestaurants }]] = await pool.query('SELECT COUNT(*) as activeRestaurants FROM restaurants WHERE status = "active"');
    const [[{ totalReservations }]] = await pool.query('SELECT COUNT(*) as totalReservations FROM reservations');
    const [[{ todayReservations }]] = await pool.query('SELECT COUNT(*) as todayReservations FROM reservations WHERE date = CURDATE()');

    // Users by plan
    const [planStats] = await pool.query('SELECT plan, COUNT(*) as count FROM users GROUP BY plan');

    // Recent signups (7 days)
    const [recentSignups] = await pool.query(
      'SELECT DATE(created_at) as date, COUNT(*) as count FROM users WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) GROUP BY DATE(created_at) ORDER BY date'
    );

    res.json({
      totalUsers, totalRestaurants, activeRestaurants, totalReservations, todayReservations,
      planStats, recentSignups,
    });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /admin/clients
app.get('/admin/clients', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const [clients] = await pool.query(`
      SELECT u.id, u.email, u.name, u.phone, u.role, u.plan, u.status, u.created_at, u.last_login,
             COUNT(r.id) as restaurant_count
      FROM users u
      LEFT JOIN restaurants r ON r.user_id = u.id
      GROUP BY u.id
      ORDER BY u.created_at DESC
    `);
    res.json({ clients });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /admin/clients/:id
app.get('/admin/clients/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const [users] = await pool.query(
      'SELECT id, email, name, phone, role, plan, status, created_at, last_login FROM users WHERE id = ?',
      [req.params.id]
    );
    if (users.length === 0) return res.status(404).json({ error: 'Client non trouvé' });

    const [restaurants] = await pool.query(
      'SELECT * FROM restaurants WHERE user_id = ? ORDER BY created_at DESC',
      [req.params.id]
    );

    const [reservations] = await pool.query(
      `SELECT res.* FROM reservations res
       JOIN restaurants r ON res.restaurant_id = r.id
       WHERE r.user_id = ? ORDER BY res.date DESC LIMIT 50`,
      [req.params.id]
    );

    res.json({ client: users[0], restaurants, reservations });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /admin/restaurants
app.get('/admin/restaurants', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const [restaurants] = await pool.query(`
      SELECT r.*, u.email as owner_email, u.name as owner_name, u.plan as owner_plan
      FROM restaurants r
      JOIN users u ON r.user_id = u.id
      ORDER BY r.created_at DESC
    `);
    res.json({ restaurants });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PUT /admin/clients/:id (update plan, status, role)
app.put('/admin/clients/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { plan, status, role, name, email } = req.body;
    const updates = [];
    const values = [];

    if (plan) { updates.push('plan = ?'); values.push(plan); }
    if (status) { updates.push('status = ?'); values.push(status); }
    if (role) { updates.push('role = ?'); values.push(role); }
    if (name) { updates.push('name = ?'); values.push(name); }
    if (email) { updates.push('email = ?'); values.push(email); }

    if (updates.length === 0) return res.status(400).json({ error: 'Aucune donnée' });

    values.push(req.params.id);
    await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);

    res.json({ message: 'Client mis à jour' });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ═══════════════════════════════════════════════════
//  STRIPE
// ═══════════════════════════════════════════════════

// POST /create-checkout-session
app.post('/create-checkout-session', async (req, res) => {
  if (!STRIPE_SECRET) return res.status(500).json({ error: 'Stripe non configuré' });

  try {
    const stripe = require('stripe')(STRIPE_SECRET);
    const { priceId, email, userId } = req.body;

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: email,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: 'https://app.r3sto.ch/dashboard?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'https://app.r3sto.ch/pricing',
      metadata: { userId: String(userId) },
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('[R3STO] Stripe checkout error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /create-portal-session
app.post('/create-portal-session', async (req, res) => {
  if (!STRIPE_SECRET) return res.status(500).json({ error: 'Stripe non configuré' });

  try {
    const stripe = require('stripe')(STRIPE_SECRET);
    const { customerId } = req.body;

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: 'https://app.r3sto.ch/profil',
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('[R3STO] Stripe portal error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /webhook (Stripe)
app.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  if (!STRIPE_SECRET || !STRIPE_WEBHOOK_SECRET) return res.status(200).send('ok');

  try {
    const stripe = require('stripe')(STRIPE_SECRET);
    const sig = req.headers['stripe-signature'];
    const event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.metadata?.userId;
        if (userId) {
          // Determine plan from amount
          const plan = session.amount_total >= 7900 ? 'gastro' : session.amount_total >= 5900 ? 'resto' : 'bistro';
          await pool.query(
            'UPDATE users SET plan = ?, stripe_customer_id = ?, stripe_subscription_id = ? WHERE id = ?',
            [plan, session.customer, session.subscription, userId]
          );
          console.log(`[R3STO] User ${userId} upgraded to ${plan}`);
        }
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        await pool.query(
          'UPDATE users SET plan = "free", stripe_subscription_id = NULL WHERE stripe_subscription_id = ?',
          [sub.id]
        );
        console.log(`[R3STO] Subscription cancelled: ${sub.id}`);
        break;
      }
    }

    res.json({ received: true });
  } catch (err) {
    console.error('[R3STO] Webhook error:', err.message);
    res.status(400).json({ error: err.message });
  }
});

// ── Public: booking widget ────────────────────────
app.get('/public/restaurant/:slug', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, slug, type, address, city, phone, capacity, description, logo_url, cover_url FROM restaurants WHERE slug = ? AND status = "active"',
      [req.params.slug]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Restaurant non trouvé' });
    res.json({ restaurant: rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /public/reservation (widget booking)
app.post('/public/reservation', async (req, res) => {
  try {
    const { restaurant_id, guest_name, guest_email, guest_phone, party_size, date, time, notes } = req.body;
    if (!restaurant_id || !guest_name || !date || !time) {
      return res.status(400).json({ error: 'Données incomplètes' });
    }

    // Verify restaurant exists and is active
    const [rests] = await pool.query('SELECT id FROM restaurants WHERE id = ? AND status = "active"', [restaurant_id]);
    if (rests.length === 0) return res.status(404).json({ error: 'Restaurant non trouvé' });

    const [result] = await pool.query(
      `INSERT INTO reservations (restaurant_id, guest_name, guest_email, guest_phone, party_size, date, time, notes, source)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'widget')`,
      [restaurant_id, guest_name, guest_email || '', guest_phone || '', party_size || 2, date, time, notes || '']
    );

    res.status(201).json({ id: result.insertId, message: 'Réservation confirmée' });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ═══════════════════════════════════════════════════
//  SYNC — Full state pull/push (Zustand ↔ API)
// ═══════════════════════════════════════════════════

// GET /sync/state — Retourne l'état complet du restaurant pour le frontend
app.get('/sync/state', authMiddleware, async (req, res) => {
  try {
    // Récupérer le premier restaurant de l'utilisateur
    const [restaurants] = await pool.query(
      'SELECT * FROM restaurants WHERE user_id = ? ORDER BY id ASC LIMIT 1',
      [req.user.id]
    );

    if (restaurants.length === 0) {
      return res.json({ ok: true, empty: true });
    }

    const resto = restaurants[0];
    let settings = {};
    try {
      settings = typeof resto.settings === 'string'
        ? JSON.parse(resto.settings)
        : (resto.settings || {});
    } catch (_) { settings = {}; }

    // Récupérer le plan depuis la table users
    const [userRows] = await pool.query('SELECT plan FROM users WHERE id = ?', [req.user.id]);
    const userPlan = userRows.length > 0 ? userRows[0].plan : 'free';

    // Récupérer les réservations des 90 derniers jours + futures
    const [resas] = await pool.query(
      `SELECT * FROM reservations WHERE restaurant_id = ?
       AND date >= DATE_SUB(CURDATE(), INTERVAL 90 DAY)
       ORDER BY date DESC, time ASC`,
      [resto.id]
    );

    // Mapper les réservations DB → format frontend Zustand
    const mappedResas = resas.map(r => ({
      id: String(r.id),
      nom: r.guest_name,
      tel: r.guest_phone || '',
      email: r.guest_email || '',
      cvt: r.party_size || 2,
      date: r.date instanceof Date ? r.date.toISOString().slice(0, 10) : String(r.date).slice(0, 10),
      heure: r.time ? String(r.time).slice(0, 5) : '12:00',
      svc: r.service || '',
      tbl: r.table_id || '',
      salle: r.salle || '',
      s: r.status || 'reserved',
      note: r.notes || '',
      source: r.source || 'app',
      createdAt: r.created_at ? new Date(r.created_at).getTime() : Date.now(),
    }));

    res.json({
      ok: true,
      restaurantId: resto.id,
      restaurant: {
        name: resto.name || '',
        ville: resto.city || '',
        pays: resto.country || 'CH',
        plan: userPlan,
        maxCvt: resto.capacity || 30,
        tel: resto.phone || '',
        email: resto.email || '',
        web: resto.website || '',
        logo: resto.logo_url || '',
        slug: resto.slug || '',
      },
      resas: mappedResas,
      // Spread all settings (tables, services, salles, combos, options, clients, etc.)
      ...settings,
    });

    console.log(`[R3STO] Sync state pour user ${req.user.id}, restaurant ${resto.id} — ${Object.keys(settings).length} settings keys, ${mappedResas.length} resas`);
  } catch (err) {
    console.error('[R3STO] Sync state error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /sync/push — Sauvegarde l'état complet dans restaurant.settings
app.post('/sync/push', authMiddleware, async (req, res) => {
  try {
    const { restaurantId, ...data } = req.body;

    if (!restaurantId) {
      return res.status(400).json({ error: 'restaurantId requis' });
    }

    // Vérifier que le restaurant appartient à l'utilisateur
    const [check] = await pool.query(
      'SELECT id FROM restaurants WHERE id = ? AND user_id = ?',
      [restaurantId, req.user.id]
    );
    if (check.length === 0) {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    // Séparer les réservations (table propre) du reste (settings JSON)
    const { resas, resto, ...settings } = data;

    // Sauvegarder settings dans la colonne JSON
    const updates = ['settings = ?'];
    const values = [JSON.stringify(settings)];

    // Si le resto est mis à jour, mettre à jour aussi les colonnes directes
    if (resto) {
      if (resto.name) { updates.push('name = ?'); values.push(resto.name); }
      if (resto.tel) { updates.push('phone = ?'); values.push(resto.tel); }
      if (resto.email) { updates.push('email = ?'); values.push(resto.email); }
      if (resto.web) { updates.push('website = ?'); values.push(resto.web); }
      if (resto.ville) { updates.push('city = ?'); values.push(resto.ville); }
      if (resto.maxCvt) { updates.push('capacity = ?'); values.push(resto.maxCvt); }
    }

    values.push(restaurantId, req.user.id);
    await pool.query(
      `UPDATE restaurants SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`,
      values
    );

    res.json({ ok: true });
  } catch (err) {
    console.error('[R3STO] Sync push error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ── 404 fallback ──────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Route non trouvée', path: req.path, method: req.method });
});

// ── Error handler ─────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[R3STO] Error:', err);
  res.status(500).json({ error: 'Erreur serveur interne' });
});

// ═══════════════════════════════════════════════════
//  START
// ═══════════════════════════════════════════════════
app.listen(PORT, () => {
  console.log(`[R3STO] API v1.1.0 running on port ${PORT}`);
  console.log(`[R3STO] Health: http://localhost:${PORT}/health`);
});
