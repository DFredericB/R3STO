#!/usr/bin/env node
// ═══════════════════════════════════════════════════
//  R3STO — API Express v1.2.0
//  Backend Node.js : Auth + Restaurants + Admin + Stripe + Booking
//  Base de données : MariaDB (Infomaniak)
//  ⚠ Tous les secrets viennent de .env (jamais hardcodés)
// ═══════════════════════════════════════════════════

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 8080;

// ── Validation des env vars critiques au démarrage ────
const REQUIRED_ENV = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME', 'JWT_SECRET'];
const missing = REQUIRED_ENV.filter(k => !process.env[k]);
if (missing.length) {
  console.error('❌ Missing required env vars:', missing.join(', '));
  console.error('   Crée un fichier .env (voir .env.example)');
  process.exit(1);
}

// ── Config DB ────────────────────────────────────
const DB_CONFIG = {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: parseInt(process.env.DB_POOL_SIZE || '10', 10),
  charset: 'utf8mb4',
};

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES = process.env.JWT_EXPIRES || '30d';
const SETUP_KEY = process.env.SETUP_KEY || '';

// Stripe
const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY || '';
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';

// CORS allowed origins
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'https://r3sto.com,https://www.r3sto.com,https://app.r3sto.com,https://admin.r3sto.com,https://demo.r3sto.com,https://mini.r3sto.com')
  .split(',').map(s => s.trim()).filter(Boolean);

// ── SMTP (Infomaniak) ────────────────────────────
const smtpTransport = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'mail.infomaniak.com',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

const FROM_EMAIL = process.env.FROM_EMAIL || process.env.SMTP_USER || 'noreply@r3sto.ch';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'contact@r3sto.com';

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
  origin: (origin, cb) => {
    // Autorise les requêtes sans Origin (curl, server-to-server)
    if (!origin) return cb(null, true);
    // Whitelist via ALLOWED_ORIGINS (.env)
    if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    // Permettre les sous-domaines .r3sto.com et .r3sto.ch
    if (/^https:\/\/[a-z0-9-]+\.r3sto\.(com|ch)$/.test(origin)) return cb(null, true);
    return cb(new Error('CORS: origin not allowed'));
  },
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
//  PUBLIC DIRECTORY (Annuaire r3sto.ch)
// ═══════════════════════════════════════════════════

// GET /public/directory — liste paginée des restaurants
// Query: region, canton, cuisine, carat, q, page, limit
app.get('/public/directory', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '24', 10)));
    const offset = (page - 1) * limit;

    const where = ["status='live'"];
    const args = [];
    if (req.query.canton) { where.push('canton_iso = ?'); args.push(req.query.canton); }
    if (req.query.city) { where.push('city = ?'); args.push(req.query.city); }
    if (req.query.cuisine) { where.push('cuisine_tag = ?'); args.push(req.query.cuisine); }
    if (req.query.carat) { where.push('carat_level = ?'); args.push(req.query.carat); }
    if (req.query.claimed === 'true') where.push("claim_status='claimed'");
    if (req.query.q) {
      where.push('(name LIKE ? OR city LIKE ? OR cuisine LIKE ?)');
      const like = '%' + req.query.q.replace(/[%_]/g, '') + '%';
      args.push(like, like, like);
    }
    const whereSql = where.join(' AND ');

    // Count
    const [cntRows] = await pool.query(
      `SELECT COUNT(*) as total FROM directory_restaurants WHERE ${whereSql}`, args
    );
    const total = cntRows[0].total;

    // Sort: CARAT gold→silver→bronze→null, then plan, then rating desc
    const orderBy = `
      CASE carat_level WHEN 'gold' THEN 3 WHEN 'silver' THEN 2 WHEN 'bronze' THEN 1 ELSE 0 END DESC,
      CASE plan WHEN 'gastro' THEN 3 WHEN 'resto' THEN 2 WHEN 'bistro' THEN 1 ELSE 0 END DESC,
      COALESCE(rating, 0) DESC,
      id ASC
    `;

    const [rows] = await pool.query(
      `SELECT id, osm_id, slug, name, cuisine, cuisine_tag, amenity,
              address, postcode, city, canton, canton_iso, lat, lon,
              phone, website, opening_hours, price_range, avg_price,
              outdoor_seating, takeaway, delivery, photo_url, image,
              rating, reviews_count, claim_status, plan,
              boost_score, client_score, carat_level
       FROM directory_restaurants
       WHERE ${whereSql}
       ORDER BY ${orderBy}
       LIMIT ? OFFSET ?`,
      [...args, limit, offset]
    );

    res.json({
      total,
      page,
      pages: Math.ceil(total / limit),
      limit,
      restaurants: rows.map(r => ({
        id: r.slug,           // front uses slug as id
        osm_id: r.osm_id,
        slug: r.slug,
        name: r.name,
        cuisine: r.cuisine || '',
        cuisineTag: r.cuisine_tag || '',
        amenity: r.amenity,
        address: r.address,
        city: r.city,
        postcode: r.postcode,
        ville: r.city,
        canton: r.canton,
        region: (r.canton_iso || '').toLowerCase().replace('ch-', ''),
        lat: r.lat ? parseFloat(r.lat) : null,
        lon: r.lon ? parseFloat(r.lon) : null,
        phone: r.phone,
        website: r.website,
        bookingUrl: r.claim_status === 'claimed'
          ? `https://booking.r3sto.ch/?r=${encodeURIComponent(r.name)}`
          : null,
        vitrineUrl: r.website || null,
        openingHours: r.opening_hours,
        priceRange: r.price_range || '$$',
        avgPrice: r.avg_price || 40,
        outdoor_seating: !!r.outdoor_seating,
        takeaway: !!r.takeaway,
        delivery: !!r.delivery,
        photo: r.photo_url || r.image || null,
        rating: r.rating ? parseFloat(r.rating) : null,
        reviews: r.reviews_count || 0,
        claimed: r.claim_status === 'claimed',
        claim_status: r.claim_status,
        plan: r.plan || 'free',
        boostScore: r.boost_score || 0,
        clientScore: r.client_score || 0,
        carat: r.carat_level,
        features: [
          r.outdoor_seating ? 'Terrasse' : null,
          r.takeaway ? 'À emporter' : null,
          r.delivery ? 'Livraison' : null,
          r.wheelchair === 'yes' ? 'Accessible PMR' : null,
        ].filter(Boolean).slice(0, 3),
        promos: [],
        open: true,  // TODO: compute from opening_hours
      })),
    });
  } catch (err) {
    console.error('[R3STO] /public/directory error:', err.message);
    res.status(500).json({ error: 'Erreur serveur', detail: err.message });
  }
});

// GET /public/directory/:slug — fiche détaillée
app.get('/public/directory/:slug', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM directory_restaurants WHERE slug = ? AND status = 'live' LIMIT 1`,
      [req.params.slug]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Fiche non trouvée' });
    res.json({ restaurant: rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /public/directory/:slug/claim — demande de claim
app.post('/public/directory/:slug/claim', async (req, res) => {
  try {
    const { email, phone, ide_number, raison_sociale, notes } = req.body || {};
    if (!email) return res.status(400).json({ error: 'Email requis' });

    const [rests] = await pool.query(
      'SELECT id, claim_status FROM directory_restaurants WHERE slug = ?',
      [req.params.slug]
    );
    if (rests.length === 0) return res.status(404).json({ error: 'Fiche non trouvée' });
    const r = rests[0];
    if (r.claim_status === 'claimed') {
      return res.status(409).json({ error: 'Déjà réclamée' });
    }

    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    await pool.query(
      `INSERT INTO directory_claims (restaurant_id, email, phone, ide_number, raison_sociale, notes, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [r.id, email, phone || '', ide_number || '', raison_sociale || '', notes || '', ip, req.headers['user-agent'] || '']
    );
    await pool.query(
      `UPDATE directory_restaurants SET claim_status = 'pending' WHERE id = ? AND claim_status = 'unclaimed'`,
      [r.id]
    );
    res.status(201).json({ ok: true, message: 'Demande enregistrée. Nous allons vérifier et te contacter sous 48h.' });
  } catch (err) {
    console.error('[R3STO] claim error:', err.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /public/directory/submit — ajouter nouveau resto (modération)
app.post('/public/directory/submit', async (req, res) => {
  try {
    const { name, city, canton_iso, address, phone, website, email, ide_number, submitter_name, submitter_email, notes } = req.body || {};
    if (!name || !submitter_email) return res.status(400).json({ error: 'Champs requis manquants' });
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const [result] = await pool.query(
      `INSERT INTO directory_submissions (name, city, canton_iso, address, phone, website, email, ide_number, submitter_name, submitter_email, notes, ip_address)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, city || '', canton_iso || '', address || '', phone || '', website || '', email || '', ide_number || '', submitter_name || '', submitter_email, notes || '', ip]
    );
    res.status(201).json({ id: result.insertId, message: 'Soumission reçue, en modération.' });
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

// ═══════════════════════════════════════════════════
//  BOOKING — réservation publique depuis r3sto.com/fiche.html
//  POST /booking → envoie 2 emails (client + resto) via SMTP Infomaniak
// ═══════════════════════════════════════════════════
function genBookingRef() {
  const ts = Date.now().toString(36).toUpperCase();
  const rnd = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `R3-${ts}-${rnd}`;
}
function fmtDateFr(iso) {
  return new Date(iso).toLocaleDateString('fr-CH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}
function esc(s) {
  return String(s ?? '').replace(/[&<>"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]));
}

app.post('/booking', async (req, res) => {
  try {
    const { slug, name, email, phone, date, time, pax, notes } = req.body || {};
    if (!slug || !name || !email || !date || !time || !pax) {
      return res.status(400).json({ error: 'Champs requis manquants' });
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return res.status(400).json({ error: 'Email invalide' });
    }
    const today = new Date(); today.setHours(0,0,0,0);
    if (new Date(date) < today) {
      return res.status(400).json({ error: 'Date invalide ou passée' });
    }
    const paxN = parseInt(pax, 10);
    if (!paxN || paxN < 1 || paxN > 20) {
      return res.status(400).json({ error: 'Nombre de personnes invalide (1–20)' });
    }

    // Récupérer le resto en DB
    let restoName = slug, restoEmail = ADMIN_EMAIL, restoCity = '';
    try {
      const [rows] = await pool.query('SELECT name, email, ville FROM restaurants WHERE slug = ? LIMIT 1', [slug]);
      if (rows[0]) {
        restoName = rows[0].name || slug;
        restoEmail = rows[0].email || ADMIN_EMAIL;
        restoCity = rows[0].ville || '';
      }
    } catch {}

    const refId = genBookingRef();
    const humanDate = fmtDateFr(date);

    // Sauvegarder la résa en DB (table bookings — créer si pas existante)
    try {
      await pool.query(
        `INSERT INTO bookings (ref, resto_slug, client_name, client_email, client_phone, date, time, pax, notes, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW())`,
        [refId, slug, name, email, phone || null, date, time, paxN, notes || null]
      );
    } catch (e) {
      console.warn('[booking] DB insert failed (table missing?):', e.message);
      // On continue quand même pour envoyer les emails
    }

    // Email client
    await smtpTransport.sendMail({
      from: FROM_EMAIL,
      to: email,
      subject: `📩 Demande de réservation envoyée à ${restoName}`,
      html: `<!DOCTYPE html><html><body style="margin:0;background:#eef3fa;font-family:Arial,sans-serif;color:#0c1730">
<div style="max-width:560px;margin:30px auto;background:#fff;border:1px solid #d6dfee">
<div style="background:#1c2e58;color:#fff;padding:24px 28px">
<div style="font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#c89752;margin-bottom:8px">📩 Demande envoyée</div>
<div style="font-size:24px;font-weight:800">${esc(restoName)}</div>
<div style="font-size:13px;color:rgba(255,255,255,.7);margin-top:4px">${esc(restoCity)}</div>
</div>
<div style="padding:24px 28px">
<p>Bonjour ${esc(name.split(' ')[0])},</p>
<p>Votre demande de réservation a bien été transmise à <b>${esc(restoName)}</b>. Le restaurant va vous confirmer sous quelques heures.</p>
<div style="background:#fff8e8;border:1px solid #e6d090;padding:18px 20px;margin:20px 0">
<div style="font-size:10.5px;font-weight:700;color:#a07e2a;letter-spacing:.14em;text-transform:uppercase;margin-bottom:10px">Détails</div>
<table cellpadding="6" style="width:100%;font-size:14px">
<tr><td style="color:#7b88a8;width:120px">Date</td><td><b>${esc(humanDate)}</b></td></tr>
<tr><td style="color:#7b88a8">Heure</td><td><b>${esc(time)}</b></td></tr>
<tr><td style="color:#7b88a8">Personnes</td><td><b>${paxN}</b></td></tr>
${notes ? `<tr><td style="color:#7b88a8">Notes</td><td>${esc(notes)}</td></tr>` : ''}
<tr><td style="color:#7b88a8">Référence</td><td style="font-family:monospace">${refId}</td></tr>
</table></div>
<p style="font-size:13px;color:#4a5878">Pour modifier ou annuler : <a href="mailto:${ADMIN_EMAIL}?subject=Modifier%20résa%20${refId}" style="color:#a07e2a">${ADMIN_EMAIL}</a></p>
</div></div></body></html>`,
      text: `R3STO — Demande de réservation envoyée\n\nBonjour ${name.split(' ')[0]},\n\nVotre demande chez ${restoName} a été transmise.\n\nDate: ${humanDate}\nHeure: ${time}\nPersonnes: ${paxN}\nRéférence: ${refId}\n\nPour modifier : ${ADMIN_EMAIL} (objet: "Modifier ${refId}")\n\nR3STO — sans commission\nhttps://r3sto.com\n`
    });

    // Email resto
    await smtpTransport.sendMail({
      from: FROM_EMAIL,
      to: restoEmail,
      replyTo: email,
      subject: `🔔 Nouvelle demande de réservation R3STO — ${humanDate} · ${paxN} pers.`,
      html: `<!DOCTYPE html><html><body style="margin:0;background:#eef3fa;font-family:Arial,sans-serif;color:#0c1730">
<div style="max-width:560px;margin:30px auto;background:#fff;border:1px solid #d6dfee">
<div style="background:#1c2e58;color:#fff;padding:24px 28px">
<div style="font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#c89752;margin-bottom:8px">🔔 Nouvelle demande à confirmer</div>
<div style="font-size:22px;font-weight:800">${paxN} personne${paxN>1?'s':''} · ${esc(time)}</div>
<div style="font-size:14px;color:rgba(255,255,255,.85);margin-top:4px">${esc(humanDate)}</div>
</div>
<div style="padding:24px 28px">
<p>Nouvelle demande via <b>R3STO</b> pour <b>${esc(restoName)}</b>.</p>
<div style="background:#fff8e8;border:1px solid #e6d090;padding:18px 20px;margin:18px 0">
<div style="font-size:10.5px;font-weight:700;color:#a07e2a;letter-spacing:.14em;text-transform:uppercase;margin-bottom:10px">Client</div>
<table cellpadding="6" style="width:100%;font-size:14px">
<tr><td style="color:#7b88a8;width:120px">Nom</td><td><b>${esc(name)}</b></td></tr>
<tr><td style="color:#7b88a8">Email</td><td><a href="mailto:${esc(email)}" style="color:#a07e2a">${esc(email)}</a></td></tr>
${phone ? `<tr><td style="color:#7b88a8">Téléphone</td><td><a href="tel:${esc(phone)}" style="color:#a07e2a">${esc(phone)}</a></td></tr>` : ''}
${notes ? `<tr><td style="color:#7b88a8">Demande</td><td>${esc(notes)}</td></tr>` : ''}
<tr><td style="color:#7b88a8">Référence</td><td style="font-family:monospace">${refId}</td></tr>
</table></div>
<p><a href="mailto:${esc(email)}?subject=Re:%20Réservation%20${refId}" style="display:inline-block;background:#1c2e58;color:#fff;padding:13px 24px;text-decoration:none;font-weight:700;letter-spacing:.04em;text-transform:uppercase;font-size:13px">Répondre au client →</a></p>
<p style="font-size:12px;color:#7b88a8">Aucune commission R3STO. 100 % de l'addition reste chez vous.</p>
</div></div></body></html>`,
      text: `R3STO — Nouvelle demande\n\nÉtablissement: ${restoName}\nDate: ${humanDate}\nHeure: ${time}\nPersonnes: ${paxN}\n\nCLIENT\n------\nNom: ${name}\nEmail: ${email}\n${phone ? `Téléphone: ${phone}\n` : ''}${notes ? `Demande: ${notes}\n` : ''}Référence: ${refId}\n\n→ Répondez directement à ce mail pour contacter le client.\n\nR3STO Pro — 0 % commission, jamais\n`
    });

    res.json({ ok: true, ref: refId, resto: restoName, date: humanDate });
  } catch (err) {
    console.error('[booking] Error:', err);
    res.status(500).json({ error: 'Erreur serveur — ré-essayez ou contactez le restaurant' });
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
//  AUTO MIGRATION (idempotent — CREATE TABLE IF NOT EXISTS)
// ═══════════════════════════════════════════════════
async function autoMigrate() {
  if (!pool) return;
  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS bookings (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      ref VARCHAR(32) NOT NULL UNIQUE,
      resto_slug VARCHAR(128) NOT NULL,
      client_name VARCHAR(180) NOT NULL,
      client_email VARCHAR(180) NOT NULL,
      client_phone VARCHAR(40) NULL,
      date DATE NOT NULL,
      time TIME NOT NULL,
      pax TINYINT UNSIGNED NOT NULL,
      notes TEXT NULL,
      status ENUM('pending','confirmed','cancelled','no_show','honored') NOT NULL DEFAULT 'pending',
      confirm_token VARCHAR(64) NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_slug_date (resto_slug, date),
      KEY idx_email (client_email),
      KEY idx_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    console.log('[R3STO] Migration OK: table bookings ready');
  } catch (err) {
    console.error('[R3STO] Migration error:', err.message);
  }
}

// ═══════════════════════════════════════════════════
//  START
// ═══════════════════════════════════════════════════
app.listen(PORT, async () => {
  console.log(`[R3STO] API v1.2.0 running on port ${PORT}`);
  console.log(`[R3STO] Health: http://localhost:${PORT}/health`);
  await autoMigrate();
});
