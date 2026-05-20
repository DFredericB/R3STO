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
      from: `"R3STO" <${FROM_EMAIL}>`,
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
// POST /reservations — création avec mode AUTO ou MANU
// Body: { restaurant_id, guest_name, guest_email?, guest_phone?, party_size, date, time, notes?, source?,
//         mode: 'auto'|'manu', table_ids?: [id,...] (si manu), customer_id?: int, override?: bool }
app.post('/reservations', authMiddleware, async (req, res) => {
  try {
    const {
      restaurant_id, guest_name, guest_email, guest_phone, party_size, date, time, notes, source,
      mode, table_ids, customer_id, override
    } = req.body;
    if (!restaurant_id || !guest_name || !date || !time) {
      return res.status(400).json({ error: 'restaurant_id, guest_name, date et time requis' });
    }
    // Ownership check (le plan vient du JWT — req.user.plan)
    if (!(await userOwnsResto(req.user.id, restaurant_id))) return res.status(403).json({ error: 'Restaurant non autorisé' });
    const restoPlan = req.user.plan || 'essentiel';
    const pax = party_size || 2;
    const resaMode = mode === 'auto' ? 'auto' : 'manu';

    // Recherche customer existant si email/phone et pas customer_id donné
    let cid = customer_id || null;
    if (!cid && (guest_email || guest_phone)) {
      const [crows] = await pool.query(
        `SELECT id FROM crm_customers WHERE restaurant_id = ? AND (
           (? <> '' AND email = ?) OR (? <> '' AND phone = ?)
         ) LIMIT 1`,
        [restaurant_id, guest_email || '', guest_email || '', guest_phone || '', guest_phone || '']
      );
      if (crows.length > 0) cid = crows[0].id;
    }

    let assignedTables = [];
    let preferencesUsed = null;

    if (resaMode === 'auto') {
      // Mode AUTO : pickBestTable décide selon package + CRM
      const pick = await pickBestTable(restaurant_id, date, time, pax, cid, restoPlan);
      if (!pick.table) {
        if (!override) {
          return res.status(409).json({
            error: 'Mode AUTO : aucune table optimale trouvée',
            reasons: pick.reasons,
            suggestion: 'Passer en mode manu ou override:true'
          });
        }
      } else {
        assignedTables = [pick.table.id];
        preferencesUsed = { score: pick.score, reasons: pick.reasons, mode: 'auto', plan: restoPlan };
      }
    } else {
      // Mode MANU : staff a fourni table_ids (ou laisse vide = sans table = walk-in non assigné)
      if (Array.isArray(table_ids) && table_ids.length > 0) {
        // Validation : tables appartiennent au resto + capacity check
        const [validTables] = await pool.query(
          'SELECT id, couverts_max FROM tables WHERE id IN (?) AND restaurant_id = ? AND actif = 1',
          [table_ids, restaurant_id]
        );
        if (validTables.length !== table_ids.length) {
          return res.status(400).json({ error: 'Une ou plusieurs tables invalides' });
        }
        const capTotal = validTables.reduce((s, t) => s + (t.couverts_max || 0), 0);
        if (capTotal < pax && !override) {
          return res.status(409).json({
            error: `Capacity insuffisante (${capTotal} max, ${pax} pax)`,
            suggestion: 'override:true pour forcer'
          });
        }
        assignedTables = table_ids;
        preferencesUsed = { mode: 'manu', forced: override === true };
      }
    }

    // INSERT
    const primaryTableId = assignedTables[0] || null;
    const [result] = await pool.query(
      `INSERT INTO reservations (restaurant_id, guest_name, guest_email, guest_phone, party_size, date, time,
                                  notes, source, table_id, customer_id, mode, preferences_used)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [restaurant_id, guest_name, guest_email || '', guest_phone || '', pax, date, time,
       notes || '', source || 'app', primaryTableId, cid, resaMode,
       preferencesUsed ? JSON.stringify(preferencesUsed) : null]
    );
    const resaId = result.insertId;
    // Liens multi-tables (combos)
    for (let i = 0; i < assignedTables.length; i++) {
      await pool.query(
        'INSERT INTO reservation_tables (reservation_id, table_id, is_primary) VALUES (?, ?, ?)',
        [resaId, assignedTables[i], i === 0 ? 1 : 0]
      );
    }
    // Auto-create customer si pas trouvé
    if (!cid && (guest_email || guest_phone) && guest_name) {
      const [cInsert] = await pool.query(
        `INSERT INTO crm_customers (restaurant_id, full_name, email, phone, total_visits, last_visit)
         VALUES (?, ?, ?, ?, 1, ?)`,
        [restaurant_id, guest_name, guest_email || '', guest_phone || '', date]
      );
      await pool.query('UPDATE reservations SET customer_id = ? WHERE id = ?', [cInsert.insertId, resaId]);
      cid = cInsert.insertId;
    } else if (cid) {
      // Update visit count + last_visit
      await pool.query('UPDATE crm_customers SET total_visits = total_visits + 1, last_visit = ? WHERE id = ?', [date, cid]);
    }

    res.status(201).json({
      id: resaId,
      message: 'Réservation créée',
      mode: resaMode,
      assigned_tables: assignedTables,
      customer_id: cid,
      preferences_used: preferencesUsed
    });
  } catch (err) {
    console.error('[R3STO] create resa error:', err.message);
    res.status(500).json({ error: 'Erreur serveur', detail: err.message });
  }
});

// POST /reservations/walk-in — résa minute (mode auto)
app.post('/reservations/walk-in', authMiddleware, async (req, res) => {
  // Walk-in = résa "maintenant" pour quelques minutes plus tard
  const now = new Date();
  const inMin = parseInt(req.body.in_minutes, 10) || 5;
  now.setMinutes(now.getMinutes() + inMin);
  const date = now.toISOString().slice(0,10);
  const time = now.toTimeString().slice(0,5);
  req.body.date = date; req.body.time = time;
  req.body.source = 'walkin';
  req.body.mode = req.body.mode || 'auto';
  req.body.guest_name = req.body.guest_name || `Walk-in ${time}`;
  return app._router.handle({ ...req, url: '/reservations', method: 'POST' }, res);
});

// PATCH /reservations/:id — modification résa (date/heure/pax/notes)
app.patch('/reservations/:id', authMiddleware, async (req, res) => {
  try {
    const resaId = parseInt(req.params.id, 10);
    const [rows] = await pool.query(
      `SELECT r.*, rest.user_id FROM reservations r
       JOIN restaurants rest ON r.restaurant_id = rest.id WHERE r.id = ?`, [resaId]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Réservation non trouvée' });
    if (rows[0].user_id !== req.user.id) return res.status(403).json({ error: 'Non autorisé' });
    const r = rows[0];
    if (['done','cancelled'].includes(r.status)) return res.status(409).json({ error: `Modification bloquée (${r.status})` });

    const updates = [];
    const values = [];
    // Normalise (DB renvoie Date object pour DATE, string pour TIME)
    const normD = d => d instanceof Date ? d.toISOString().slice(0,10) : String(d).slice(0,10);
    const normT = t => String(t).slice(0,5);
    const newDate = req.body.date || normD(r.date);
    const newTime = req.body.time || normT(r.time);
    const newPax = parseInt(req.body.party_size, 10) || r.party_size;
    const override = !!req.body.override;
    const mode = req.body.mode === 'auto' ? 'auto' : (r.mode || 'manu');

    // Si modif date/heure/pax → recheck dispo
    if (req.body.date || req.body.time || req.body.party_size) {
      const av = await checkAvailability(r.restaurant_id, newDate, newTime, newPax);
      if (!av.available && !override) {
        return res.status(409).json({
          error: 'Modification refusée : pas de dispo',
          reason: av.reason,
          suggestion: 'override:true pour forcer'
        });
      }
    }

    if (req.body.date) { updates.push('date = ?'); values.push(req.body.date); }
    if (req.body.time) { updates.push('time = ?'); values.push(req.body.time); }
    if (req.body.party_size) { updates.push('party_size = ?'); values.push(req.body.party_size); }
    if (req.body.notes !== undefined) { updates.push('notes = ?'); values.push(req.body.notes); }
    if (req.body.status) { updates.push('status = ?'); values.push(req.body.status); }
    if (updates.length === 0) return res.json({ ok: true, message: 'Aucun changement' });

    values.push(resaId);
    await pool.query(`UPDATE reservations SET ${updates.join(', ')} WHERE id = ?`, values);
    res.json({ ok: true, mode, override_applied: override });
  } catch (err) {
    console.error('[R3STO] patch resa error:', err.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /reservations/:id/cancel — annulation avec policy
app.post('/reservations/:id/cancel', authMiddleware, async (req, res) => {
  try {
    const resaId = parseInt(req.params.id, 10);
    const reason = (req.body.reason || '').slice(0, 200);
    const fee = !!req.body.apply_fee; // si true, applique cancellation fee
    const [rows] = await pool.query(
      `SELECT r.*, rest.user_id FROM reservations r
       JOIN restaurants rest ON r.restaurant_id = rest.id WHERE r.id = ?`, [resaId]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Réservation non trouvée' });
    if (rows[0].user_id !== req.user.id) return res.status(403).json({ error: 'Non autorisé' });
    await pool.query(
      `UPDATE reservations SET status='cancelled', notes=CONCAT(COALESCE(notes,''),'\n[CANCEL] ',?) WHERE id = ?`,
      [reason, resaId]
    );
    // Si fee → on logge le motif (Stripe charge à venir quand activé)
    res.json({ ok: true, fee_applied: fee, note: fee ? 'Frais d\'annulation à percevoir' : null });
  } catch (err) {
    console.error('[R3STO] cancel error:', err.message);
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

// ═══════════════════════════════════════════════════════════════
//  DÉPLACEMENT DE RÉSERVATION — matrice complète T↔Combo
// ═══════════════════════════════════════════════════════════════
//
// 4 cas couverts :
//   T → T          : 1 table actuelle → 1 nouvelle table
//   T → Combo      : 1 table actuelle → N tables combinées
//   Combo → T      : N tables actuelles → 1 nouvelle table
//   Combo → Combo  : N tables actuelles → M nouvelles tables
//
// Mode : 'auto' (système choisit) ou 'manu' (staff drag&drop, peut override)
// Audit : chaque déplacement loggé dans move_logs avec from/to + reason
//
async function getCurrentTables(reservationId) {
  // Lit reservation_tables, sinon fallback sur reservations.table_id
  const [rows] = await pool.query(
    'SELECT table_id FROM reservation_tables WHERE reservation_id = ?',
    [reservationId]
  );
  if (rows.length > 0) return rows.map(r => r.table_id);
  const [resa] = await pool.query('SELECT table_id FROM reservations WHERE id = ?', [reservationId]);
  return resa[0]?.table_id ? [resa[0].table_id] : [];
}

// POST /reservations/:id/move
// Body: { to_tables: [id, ...], mode: 'auto'|'manu', reason?, override?: bool }
app.post('/reservations/:id/move', authMiddleware, async (req, res) => {
  try {
    const resaId = parseInt(req.params.id, 10);
    const toTables = (req.body.to_tables || []).map(Number).filter(Boolean);
    const mode = req.body.mode === 'auto' ? 'auto' : 'manu';
    const reason = (req.body.reason || '').slice(0, 200);
    const override = !!req.body.override;

    if (toTables.length === 0) return res.status(400).json({ error: 'to_tables requis' });

    // 1. Verifie résa appartient au user + statut autorisé
    const [resa] = await pool.query(
      `SELECT r.*, rest.user_id FROM reservations r
       JOIN restaurants rest ON r.restaurant_id = rest.id
       WHERE r.id = ?`, [resaId]
    );
    if (resa.length === 0) return res.status(404).json({ error: 'Réservation non trouvée' });
    if (resa[0].user_id !== req.user.id) return res.status(403).json({ error: 'Non autorisé' });
    const r = resa[0];
    if (['done','cancelled'].includes(r.status)) {
      return res.status(409).json({ error: `Déplacement bloqué (statut ${r.status})` });
    }
    const isClientPresent = ['arrived','seated'].includes(r.status);

    // 2. État courant (tables actuelles)
    const fromTables = await getCurrentTables(resaId);
    // Détecte le cas
    const fromType = fromTables.length > 1 ? 'Combo' : 'T';
    const toType = toTables.length > 1 ? 'Combo' : 'T';
    const moveCase = `${fromType} → ${toType}`;

    // 3. Charge tables cibles + vérifie qu'elles appartiennent au resto
    const [tablesCible] = await pool.query(
      `SELECT * FROM tables WHERE id IN (?) AND restaurant_id = ? AND actif = 1`,
      [toTables, r.restaurant_id]
    );
    if (tablesCible.length !== toTables.length) {
      return res.status(400).json({ error: 'Une ou plusieurs tables cible invalides' });
    }

    // 4. Capacity check : Σ capacity_max >= pax
    const capTotal = tablesCible.reduce((s, t) => s + (t.couverts_max || 0), 0);
    if (capTotal < r.party_size && !override) {
      return res.status(409).json({
        error: `Capacity insuffisante (${capTotal} max, ${r.party_size} pax). Override possible.`,
        suggestion: 'override:true pour forcer'
      });
    }

    // 5. Combo physique check : pour combo cible, tables doivent être combinables entre elles
    if (toTables.length > 1) {
      // Au moins 1 table doit lister les autres dans son combine_with (relation symétrique attendue)
      const combinable = tablesCible.every(t => {
        if (!t.combine_with) return false;
        const allowed = t.combine_with.split(',').map(s => parseInt(s.trim(), 10));
        return toTables.filter(id => id !== t.id).every(id => allowed.includes(id));
      });
      if (!combinable && !override) {
        return res.status(409).json({
          error: 'Tables non physiquement combinables (champ combine_with manquant)',
          suggestion: 'override:true pour forcer (si configuration combine_with incomplète)'
        });
      }
    }

    // 6. Conflit check : tables cibles libres dans la fenêtre [time-90, time+90]
    const dt = new Date(`${r.date}T${r.time}`);
    const before = new Date(dt.getTime() - DEFAULT_SEATING_MINUTES * 60000).toTimeString().slice(0,8);
    const after = new Date(dt.getTime() + DEFAULT_SEATING_MINUTES * 60000).toTimeString().slice(0,8);
    const [conflictRows] = await pool.query(
      `SELECT DISTINCT COALESCE(rt.table_id, r2.table_id) AS t_id
       FROM reservations r2
       LEFT JOIN reservation_tables rt ON rt.reservation_id = r2.id
       WHERE r2.id != ? AND r2.restaurant_id = ?
         AND r2.date = ? AND r2.time >= ? AND r2.time <= ?
         AND r2.status IN (?)`,
      [resaId, r.restaurant_id, r.date, before, after, ACTIVE_RESA_STATUSES]
    );
    const busyIds = new Set(conflictRows.map(x => x.t_id).filter(Boolean));
    const conflicts = toTables.filter(id => busyIds.has(id));
    if (conflicts.length > 0 && !override) {
      return res.status(409).json({
        error: `Tables occupées : ${conflicts.join(',')}`,
        conflicts,
        suggestion: 'override:true pour forcer (cas urgence)'
      });
    }

    // 7. APPLY — atomique : update reservations.table_id (primary) + replace reservation_tables
    const primaryId = toTables[0];
    await pool.query('UPDATE reservations SET table_id = ? WHERE id = ?', [primaryId, resaId]);
    await pool.query('DELETE FROM reservation_tables WHERE reservation_id = ?', [resaId]);
    for (let i = 0; i < toTables.length; i++) {
      await pool.query(
        'INSERT INTO reservation_tables (reservation_id, table_id, is_primary) VALUES (?, ?, ?)',
        [resaId, toTables[i], i === 0 ? 1 : 0]
      );
    }

    // 8. Audit log
    await pool.query(
      `INSERT INTO move_logs (reservation_id, from_tables, to_tables, mode, user_id, reason, override)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [resaId, JSON.stringify(fromTables), JSON.stringify(toTables), mode, req.user.id, reason, override ? 1 : 0]
    );

    res.json({
      ok: true,
      case: moveCase,
      from_tables: fromTables,
      to_tables: toTables,
      capacity_used: capTotal,
      party_size: r.party_size,
      override_applied: override,
      client_present_warning: isClientPresent ? 'Client déjà arrivé/installé - coordonner avec le service' : null
    });

  } catch (err) {
    console.error('[R3STO] move error:', err.message);
    res.status(500).json({ error: 'Erreur serveur', detail: err.message });
  }
});

// GET /reservations/:id/move-logs — historique déplacements
app.get('/reservations/:id/move-logs', authMiddleware, async (req, res) => {
  try {
    const [logs] = await pool.query(
      `SELECT m.* FROM move_logs m
       JOIN reservations r ON m.reservation_id = r.id
       JOIN restaurants rest ON r.restaurant_id = rest.id
       WHERE m.reservation_id = ? AND rest.user_id = ?
       ORDER BY m.created_at DESC`,
      [req.params.id, req.user.id]
    );
    res.json({ logs });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ═══════════════════════════════════════════════════════════════
//  CRUD config restaurant — salles / tables / services / fermetures
//  + CRM customers
// ═══════════════════════════════════════════════════════════════
//
// Helper : verifie qu'un restaurant_id appartient bien au user authentifié
async function userOwnsResto(userId, restoId) {
  const [rows] = await pool.query('SELECT id FROM restaurants WHERE id = ? AND user_id = ?', [restoId, userId]);
  return rows.length > 0;
}

// ── SALLES ──────────────────────────────────────────────────────
app.get('/salles', authMiddleware, async (req, res) => {
  try {
    const restoId = parseInt(req.query.restaurant_id, 10);
    if (!restoId || !(await userOwnsResto(req.user.id, restoId))) return res.status(403).json({ error: 'Restaurant non autorisé' });
    const [rows] = await pool.query('SELECT * FROM salles WHERE restaurant_id = ? ORDER BY position, id', [restoId]);
    res.json({ salles: rows });
  } catch (err) { res.status(500).json({ error: 'Erreur serveur' }); }
});
app.post('/salles', authMiddleware, async (req, res) => {
  try {
    const { restaurant_id, nom, capacite, position, actif } = req.body || {};
    if (!restaurant_id || !nom) return res.status(400).json({ error: 'restaurant_id et nom requis' });
    if (!(await userOwnsResto(req.user.id, restaurant_id))) return res.status(403).json({ error: 'Non autorisé' });
    const [r] = await pool.query(
      'INSERT INTO salles (restaurant_id, nom, capacite, position, actif) VALUES (?, ?, ?, ?, ?)',
      [restaurant_id, nom, capacite || 0, position || 0, actif === 0 ? 0 : 1]
    );
    res.status(201).json({ id: r.insertId, ok: true });
  } catch (err) { res.status(500).json({ error: 'Erreur serveur' }); }
});
app.patch('/salles/:id', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT s.* FROM salles s JOIN restaurants r ON s.restaurant_id = r.id WHERE s.id = ? AND r.user_id = ?`,
      [req.params.id, req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Salle non trouvée' });
    const updates = []; const values = [];
    ['nom','capacite','position','actif'].forEach(k => {
      if (req.body[k] !== undefined) { updates.push(`${k} = ?`); values.push(req.body[k]); }
    });
    if (updates.length === 0) return res.json({ ok: true });
    values.push(req.params.id);
    await pool.query(`UPDATE salles SET ${updates.join(', ')} WHERE id = ?`, values);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: 'Erreur serveur' }); }
});
app.delete('/salles/:id', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT s.id FROM salles s JOIN restaurants r ON s.restaurant_id = r.id WHERE s.id = ? AND r.user_id = ?`,
      [req.params.id, req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Salle non trouvée' });
    // Vérif : tables liées ?
    const [tbls] = await pool.query('SELECT COUNT(*) as n FROM tables WHERE salle_id = ?', [req.params.id]);
    if (tbls[0].n > 0) return res.status(409).json({ error: `Salle contient ${tbls[0].n} table(s) — les supprimer d'abord` });
    await pool.query('DELETE FROM salles WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: 'Erreur serveur' }); }
});

// ── TABLES ──────────────────────────────────────────────────────
app.get('/tables', authMiddleware, async (req, res) => {
  try {
    const restoId = parseInt(req.query.restaurant_id, 10);
    if (!restoId || !(await userOwnsResto(req.user.id, restoId))) return res.status(403).json({ error: 'Non autorisé' });
    const salleId = req.query.salle_id ? parseInt(req.query.salle_id, 10) : null;
    let sql = 'SELECT * FROM tables WHERE restaurant_id = ?'; const params = [restoId];
    if (salleId) { sql += ' AND salle_id = ?'; params.push(salleId); }
    sql += ' ORDER BY salle_id, numero';
    const [rows] = await pool.query(sql, params);
    res.json({ tables: rows });
  } catch (err) { res.status(500).json({ error: 'Erreur serveur' }); }
});
app.post('/tables', authMiddleware, async (req, res) => {
  try {
    const { restaurant_id, salle_id, numero, nom, couverts_min, couverts_max, forme, pos_x, pos_y, pos_w, actif, combine_with, score_default, features } = req.body || {};
    if (!restaurant_id || !salle_id || !numero) return res.status(400).json({ error: 'restaurant_id, salle_id, numero requis' });
    if (!(await userOwnsResto(req.user.id, restaurant_id))) return res.status(403).json({ error: 'Non autorisé' });
    const [r] = await pool.query(
      `INSERT INTO tables (restaurant_id, salle_id, numero, nom, couverts_min, couverts_max, forme, pos_x, pos_y, pos_w, actif, combine_with, score_default, features)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [restaurant_id, salle_id, numero, nom || '', couverts_min || 1, couverts_max || 4,
       forme || 'rect', pos_x || 0, pos_y || 0, pos_w || 1, actif === 0 ? 0 : 1,
       combine_with || null, score_default || 5, features ? JSON.stringify(features) : null]
    );
    res.status(201).json({ id: r.insertId, ok: true });
  } catch (err) { res.status(500).json({ error: 'Erreur serveur', detail: err.message }); }
});
app.patch('/tables/:id', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT t.* FROM tables t JOIN restaurants r ON t.restaurant_id = r.id WHERE t.id = ? AND r.user_id = ?`,
      [req.params.id, req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Table non trouvée' });
    const updates = []; const values = [];
    ['salle_id','numero','nom','couverts_min','couverts_max','forme','pos_x','pos_y','pos_w','actif','combine_with','score_default'].forEach(k => {
      if (req.body[k] !== undefined) { updates.push(`${k} = ?`); values.push(req.body[k]); }
    });
    if (req.body.features !== undefined) { updates.push('features = ?'); values.push(JSON.stringify(req.body.features)); }
    if (updates.length === 0) return res.json({ ok: true });
    values.push(req.params.id);
    await pool.query(`UPDATE tables SET ${updates.join(', ')} WHERE id = ?`, values);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: 'Erreur serveur' }); }
});
app.delete('/tables/:id', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT t.id FROM tables t JOIN restaurants r ON t.restaurant_id = r.id WHERE t.id = ? AND r.user_id = ?`,
      [req.params.id, req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Table non trouvée' });
    // Vérif : résa actives à venir sur cette table ?
    const [resas] = await pool.query(
      `SELECT COUNT(*) as n FROM reservations WHERE table_id = ? AND date >= CURDATE() AND status IN (?)`,
      [req.params.id, ACTIVE_RESA_STATUSES]
    );
    if (resas[0].n > 0) return res.status(409).json({ error: `Table a ${resas[0].n} résa(s) active(s) à venir — annuler/déplacer d'abord` });
    await pool.query('DELETE FROM tables WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: 'Erreur serveur' }); }
});

// ── SERVICES ────────────────────────────────────────────────────
app.get('/services', authMiddleware, async (req, res) => {
  try {
    const restoId = parseInt(req.query.restaurant_id, 10);
    if (!restoId || !(await userOwnsResto(req.user.id, restoId))) return res.status(403).json({ error: 'Non autorisé' });
    const [rows] = await pool.query('SELECT * FROM services WHERE restaurant_id = ? ORDER BY type, heure_debut', [restoId]);
    res.json({ services: rows });
  } catch (err) { res.status(500).json({ error: 'Erreur serveur' }); }
});
app.post('/services', authMiddleware, async (req, res) => {
  try {
    const { restaurant_id, salle_id, nom, type, heure_debut, heure_fin, jours, last_order, buffer_mins, booking_cutoff_mins, actif } = req.body || {};
    if (!restaurant_id || !nom || !heure_debut || !heure_fin) return res.status(400).json({ error: 'restaurant_id, nom, heure_debut, heure_fin requis' });
    if (!(await userOwnsResto(req.user.id, restaurant_id))) return res.status(403).json({ error: 'Non autorisé' });
    const [r] = await pool.query(
      `INSERT INTO services (restaurant_id, salle_id, nom, type, heure_debut, heure_fin, jours, last_order, buffer_mins, booking_cutoff_mins, actif)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [restaurant_id, salle_id || null, nom, type || 'autre', heure_debut, heure_fin,
       jours || '1,2,3,4,5,6,7', last_order || null, buffer_mins || 15, booking_cutoff_mins || 60, actif === 0 ? 0 : 1]
    );
    res.status(201).json({ id: r.insertId, ok: true });
  } catch (err) { res.status(500).json({ error: 'Erreur serveur', detail: err.message }); }
});
app.patch('/services/:id', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT s.* FROM services s JOIN restaurants r ON s.restaurant_id = r.id WHERE s.id = ? AND r.user_id = ?`,
      [req.params.id, req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Service non trouvé' });
    const updates = []; const values = [];
    ['salle_id','nom','type','heure_debut','heure_fin','jours','last_order','buffer_mins','booking_cutoff_mins','actif'].forEach(k => {
      if (req.body[k] !== undefined) { updates.push(`${k} = ?`); values.push(req.body[k]); }
    });
    if (updates.length === 0) return res.json({ ok: true });
    values.push(req.params.id);
    await pool.query(`UPDATE services SET ${updates.join(', ')} WHERE id = ?`, values);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: 'Erreur serveur' }); }
});
app.delete('/services/:id', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT s.id FROM services s JOIN restaurants r ON s.restaurant_id = r.id WHERE s.id = ? AND r.user_id = ?`,
      [req.params.id, req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Service non trouvé' });
    await pool.query('DELETE FROM services WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: 'Erreur serveur' }); }
});

// ── FERMETURES ──────────────────────────────────────────────────
app.get('/fermetures', authMiddleware, async (req, res) => {
  try {
    const restoId = parseInt(req.query.restaurant_id, 10);
    if (!restoId || !(await userOwnsResto(req.user.id, restoId))) return res.status(403).json({ error: 'Non autorisé' });
    const [rows] = await pool.query('SELECT * FROM fermetures WHERE restaurant_id = ? ORDER BY date_debut DESC', [restoId]);
    res.json({ fermetures: rows });
  } catch (err) { res.status(500).json({ error: 'Erreur serveur' }); }
});
app.post('/fermetures', authMiddleware, async (req, res) => {
  try {
    const { restaurant_id, label, date_debut, date_fin, type, salle_id, service_id, note } = req.body || {};
    if (!restaurant_id || !date_debut || !date_fin || !type) return res.status(400).json({ error: 'restaurant_id, date_debut, date_fin, type requis' });
    if (!(await userOwnsResto(req.user.id, restaurant_id))) return res.status(403).json({ error: 'Non autorisé' });
    const [r] = await pool.query(
      `INSERT INTO fermetures (restaurant_id, label, date_debut, date_fin, type, salle_id, service_id, note, actif)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [restaurant_id, label || '', date_debut, date_fin, type, salle_id || null, service_id || null, note || '']
    );
    res.status(201).json({ id: r.insertId, ok: true });
  } catch (err) { res.status(500).json({ error: 'Erreur serveur', detail: err.message }); }
});
app.delete('/fermetures/:id', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT f.id FROM fermetures f JOIN restaurants r ON f.restaurant_id = r.id WHERE f.id = ? AND r.user_id = ?`,
      [req.params.id, req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Fermeture non trouvée' });
    await pool.query('DELETE FROM fermetures WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: 'Erreur serveur' }); }
});

// ── CUSTOMERS (CRM) ─────────────────────────────────────────────
app.get('/customers', authMiddleware, async (req, res) => {
  try {
    const restoId = parseInt(req.query.restaurant_id, 10);
    if (!restoId || !(await userOwnsResto(req.user.id, restoId))) return res.status(403).json({ error: 'Non autorisé' });
    const q = req.query.q ? `%${req.query.q}%` : null;
    const vip = req.query.vip === '1';
    let sql = 'SELECT * FROM crm_customers WHERE restaurant_id = ?'; const params = [restoId];
    if (q) { sql += ' AND (full_name LIKE ? OR email LIKE ? OR phone LIKE ?)'; params.push(q, q, q); }
    if (vip) sql += ' AND vip = 1';
    sql += ' ORDER BY last_visit DESC, total_visits DESC LIMIT 200';
    const [rows] = await pool.query(sql, params);
    res.json({ customers: rows });
  } catch (err) { res.status(500).json({ error: 'Erreur serveur' }); }
});
app.post('/customers', authMiddleware, async (req, res) => {
  try {
    const { restaurant_id, full_name, email, phone, preferences, allergies, tags, vip, blacklist, birthday, notes } = req.body || {};
    if (!restaurant_id || !full_name) return res.status(400).json({ error: 'restaurant_id et full_name requis' });
    if (!(await userOwnsResto(req.user.id, restaurant_id))) return res.status(403).json({ error: 'Non autorisé' });
    const [r] = await pool.query(
      `INSERT INTO crm_customers (restaurant_id, full_name, email, phone, preferences, allergies, tags, vip, blacklist, birthday, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [restaurant_id, full_name, email || '', phone || '',
       preferences ? JSON.stringify(preferences) : null,
       allergies ? JSON.stringify(allergies) : null,
       tags ? JSON.stringify(tags) : null,
       vip ? 1 : 0, blacklist ? 1 : 0, birthday || null, notes || '']
    );
    res.status(201).json({ id: r.insertId, ok: true });
  } catch (err) { res.status(500).json({ error: 'Erreur serveur', detail: err.message }); }
});
app.patch('/customers/:id', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT c.* FROM crm_customers c JOIN restaurants r ON c.restaurant_id = r.id WHERE c.id = ? AND r.user_id = ?`,
      [req.params.id, req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Client non trouvé' });
    const updates = []; const values = [];
    ['full_name','email','phone','vip','blacklist','birthday','notes'].forEach(k => {
      if (req.body[k] !== undefined) { updates.push(`${k} = ?`); values.push(req.body[k]); }
    });
    ['preferences','allergies','tags'].forEach(k => {
      if (req.body[k] !== undefined) { updates.push(`${k} = ?`); values.push(JSON.stringify(req.body[k])); }
    });
    if (updates.length === 0) return res.json({ ok: true });
    values.push(req.params.id);
    await pool.query(`UPDATE crm_customers SET ${updates.join(', ')} WHERE id = ?`, values);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: 'Erreur serveur' }); }
});

// ═══════════════════════════════════════════════════════════════
//  MOTEUR DE DISPONIBILITÉ — coeur du système de résa
// ═══════════════════════════════════════════════════════════════
const ACTIVE_RESA_STATUSES = ['reserved','confirmed','arrived','seated'];
const DEFAULT_SEATING_MINUTES = 90; // durée standard occupation table

/**
 * Vérifie la dispo de tables pour resto/date/time/pax
 * Logique :
 *   1. Trouve services ouverts ce jour/heure
 *   2. Check fermetures actives
 *   3. Check booking_cutoff_mins (délai min)
 *   4. Trouve tables qualifiantes (couverts_min ≤ pax ≤ couverts_max)
 *   5. Filtre les tables non-réservées dans la fenêtre [time, time+seating]
 *   6. Retourne candidates ou raison du refus
 */
async function checkAvailability(restoId, date, time, pax) {
  if (!restoId || !date || !time || !pax) {
    return { available: false, reason: 'Paramètres manquants', candidates: [] };
  }

  const dt = new Date(`${date}T${time}:00`);
  if (isNaN(dt.getTime())) return { available: false, reason: 'Date/heure invalide', candidates: [] };
  const dow = dt.getDay() === 0 ? 7 : dt.getDay(); // 1=lun ... 7=dim

  // 1. Services ouverts à cet horaire et ce jour
  const [services] = await pool.query(
    `SELECT * FROM services
     WHERE restaurant_id = ? AND actif = 1
       AND heure_debut <= ? AND heure_fin >= ?
       AND (jours = '' OR jours IS NULL OR FIND_IN_SET(?, REPLACE(jours, ' ', '')))`,
    [restoId, time, time, String(dow)]
  );
  if (services.length === 0) {
    return { available: false, reason: 'Service fermé à cet horaire', candidates: [] };
  }

  // 2. Fermetures actives pour cette date
  const [closures] = await pool.query(
    `SELECT * FROM fermetures
     WHERE restaurant_id = ? AND actif = 1
       AND date_debut <= ? AND date_fin >= ?`,
    [restoId, date, date]
  );
  const closedAll = closures.some(c => c.type === 'restaurant' || c.type === 'vacances' || c.type === 'ferie');
  if (closedAll) {
    return { available: false, reason: 'Restaurant fermé ce jour', candidates: [] };
  }
  const closedSalles = new Set(closures.filter(c => c.type === 'salle' && c.salle_id).map(c => c.salle_id));
  const closedServices = new Set(closures.filter(c => c.type === 'service' && c.service_id).map(c => c.service_id));

  // 3. Cutoff (booking_cutoff_mins) — délai min avant résa
  const now = new Date();
  for (const s of services) {
    if (closedServices.has(s.id)) continue;
    if (s.booking_cutoff_mins && s.booking_cutoff_mins > 0) {
      const minutesUntil = (dt - now) / 60000;
      if (minutesUntil < s.booking_cutoff_mins) {
        return { available: false, reason: `Délai min de ${s.booking_cutoff_mins} min avant résa`, candidates: [] };
      }
    }
  }

  // 4. Tables qualifiantes (capacity + salle ouverte + service applicable)
  const serviceSalleIds = new Set(services.filter(s => !closedServices.has(s.id)).map(s => s.salle_id).filter(Boolean));
  const filterSalleClause = serviceSalleIds.size > 0 ? ' AND salle_id IN (?)' : '';
  let tablesQuery = `SELECT * FROM tables
                     WHERE restaurant_id = ? AND actif = 1
                       AND couverts_min <= ? AND couverts_max >= ?` + filterSalleClause;
  const queryParams = serviceSalleIds.size > 0
    ? [restoId, pax, pax, Array.from(serviceSalleIds)]
    : [restoId, pax, pax];
  const [candidateTables] = await pool.query(tablesQuery, queryParams);
  const filteredTables = candidateTables.filter(t => !closedSalles.has(t.salle_id));
  if (filteredTables.length === 0) {
    return { available: false, reason: `Aucune table pour ${pax} personnes`, candidates: [] };
  }

  // 5. Réservations conflictuelles dans la fenêtre [time - 90min, time + 90min]
  //    Lit aussi reservation_tables pour gérer les combos
  const before = new Date(dt.getTime() - DEFAULT_SEATING_MINUTES * 60000);
  const after = new Date(dt.getTime() + DEFAULT_SEATING_MINUTES * 60000);
  const beforeTime = before.toTimeString().slice(0, 8);
  const afterTime = after.toTimeString().slice(0, 8);
  const [busyResas] = await pool.query(
    `SELECT r.id, r.table_id, GROUP_CONCAT(rt.table_id) AS combo_tables
     FROM reservations r
     LEFT JOIN reservation_tables rt ON rt.reservation_id = r.id
     WHERE r.restaurant_id = ? AND r.date = ?
       AND r.time >= ? AND r.time <= ?
       AND r.status IN (?)
     GROUP BY r.id`,
    [restoId, date, beforeTime, afterTime, ACTIVE_RESA_STATUSES]
  );
  const busyTableIds = new Set();
  for (const r of busyResas) {
    if (r.table_id) busyTableIds.add(r.table_id);
    if (r.combo_tables) r.combo_tables.split(',').map(Number).forEach(id => busyTableIds.add(id));
  }

  // 6. Filtrage final
  const freeTables = filteredTables.filter(t => !busyTableIds.has(t.id));
  if (freeTables.length === 0) {
    return { available: false, reason: 'Complet à cet horaire', candidates: [] };
  }

  // Trie par capacity (pour proposer la plus petite table adaptée d'abord)
  freeTables.sort((a, b) => (a.couverts_max - a.couverts_min) - (b.couverts_max - b.couverts_min));

  return {
    available: true,
    candidates: freeTables.slice(0, 5).map(t => ({
      id: t.id, salle_id: t.salle_id, numero: t.numero, nom: t.nom,
      couverts_min: t.couverts_min, couverts_max: t.couverts_max, forme: t.forme
    })),
    service: { id: services[0].id, nom: services[0].nom, type: services[0].type },
    seating_minutes: DEFAULT_SEATING_MINUTES
  };
}

// GET /availability?restaurant_id=X&date=YYYY-MM-DD&time=HH:MM&pax=N
// (accessible aussi via /api/availability grâce au middleware de réécriture)
app.get('/availability', authMiddleware, async (req, res) => {
  try {
    const restoId = parseInt(req.query.restaurant_id, 10);
    const date = req.query.date;
    const time = req.query.time;
    const pax = parseInt(req.query.pax, 10) || 2;

    // Sécurité : restaurant_id doit appartenir au user
    if (restoId) {
      const [owned] = await pool.query('SELECT id FROM restaurants WHERE id = ? AND user_id = ?', [restoId, req.user.id]);
      if (owned.length === 0) return res.status(403).json({ error: 'Restaurant non autorisé' });
    }

    const result = await checkAvailability(restoId, date, time, pax);
    res.json(result);
  } catch (err) {
    console.error('[R3STO] availability error:', err.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ═══════════════════════════════════════════════════════════════
//  pickBestTable — moteur AUTO selon package + CRM
// ═══════════════════════════════════════════════════════════════
//
// Critères par package :
//   free       : pas d'auto (return null → mode manu obligatoire)
//   essentiel  : 1ère table libre matching capacity (basique)
//   premium    : + préférences client, score_default, VIP boost
//   signature  : + capacity-fit (penalty si table trop grande), revenue optim
//
async function pickBestTable(restoId, date, time, pax, customerId, plan) {
  const avail = await checkAvailability(restoId, date, time, pax);
  if (!avail.available || avail.candidates.length === 0) return { table: null, score: 0, reasons: [avail.reason] };

  // Charger les vraies tables avec toutes leurs colonnes (avail.candidates est light)
  const ids = avail.candidates.map(c => c.id);
  const [tables] = await pool.query(`SELECT * FROM tables WHERE id IN (?)`, [ids]);

  // Lookup customer (si fourni et plan >= premium)
  let customer = null;
  const planRank = { free:0, mini:0, mini_plus:1, bistro:2, essentiel:2, resto:3, premium:3, gastro:4, signature:4 };
  const rank = planRank[plan] ?? 2;
  if (customerId && rank >= 3) {
    const [crows] = await pool.query('SELECT * FROM crm_customers WHERE id = ? AND restaurant_id = ?', [customerId, restoId]);
    if (crows.length > 0) customer = crows[0];
  }
  const isVip = customer?.vip === 1;
  const prefs = (() => { try { return customer?.preferences ? JSON.parse(customer.preferences) : []; } catch { return []; } })();

  // Plan Mini/free : 1ère table libre (AUTO basique, sans intelligence)
  if (plan === 'free' || plan === 'mini' || rank <= 2) {
    const planLabel = (plan === 'free' || plan === 'mini') ? 'Mini' : 'Essentiel';
    return { table: tables[0], score: 1, reasons: [`Plan ${planLabel} : 1ère table libre adaptée`] };
  }

  // Plan premium+ : scoring complet
  const scored = tables.map(t => {
    const reasons = [];
    let score = 0;
    // score_default de la table (1-10)
    const def = t.score_default || 5;
    score += def;
    reasons.push(`score table ${def}/10`);
    // Préférences client matchées
    const features = (() => { try { return t.features ? JSON.parse(t.features) : []; } catch { return []; } })();
    const matched = prefs.filter(p => features.includes(p));
    if (matched.length > 0) {
      score += matched.length * 10;
      reasons.push(`préférences match: ${matched.join(',')}`);
    }
    // VIP boost : +20 si table top score
    if (isVip && def >= 8) {
      score += 20;
      reasons.push('VIP boost (table top)');
    } else if (isVip) {
      score += 5; reasons.push('VIP regular');
    }
    // Signature : capacity-fit (penalty si table trop grande, optimisation revenu)
    if (rank >= 4) {
      const gap = (t.couverts_max || 0) - pax;
      if (gap >= 4) {
        score -= gap * 2;
        reasons.push(`capacity gap -${gap*2} (Signature optim revenu)`);
      } else if (gap <= 1) {
        score += 5;
        reasons.push('capacity-fit parfait');
      }
    }
    return { table: t, score, reasons };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0];
}

// GET /availability/slots?restaurant_id=X&date=YYYY-MM-DD&pax=N
app.get('/availability/slots', authMiddleware, async (req, res) => {
  try {
    const restoId = parseInt(req.query.restaurant_id, 10);
    const date = req.query.date;
    const pax = parseInt(req.query.pax, 10) || 2;
    if (!restoId || !date) return res.status(400).json({ error: 'restaurant_id et date requis' });

    const [owned] = await pool.query('SELECT id FROM restaurants WHERE id = ? AND user_id = ?', [restoId, req.user.id]);
    if (owned.length === 0) return res.status(403).json({ error: 'Restaurant non autorisé' });

    // Génère slots 18:00 → 22:30 par 30 min (à raffiner selon services)
    const slots = [];
    for (let h = 12; h <= 22; h++) {
      for (const m of [0, 30]) {
        if (h === 22 && m === 30) continue;
        const time = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
        const av = await checkAvailability(restoId, date, time, pax);
        slots.push({ time, available: av.available, reason: av.available ? null : av.reason });
      }
    }
    res.json({ date, pax, slots });
  } catch (err) {
    console.error('[R3STO] slots error:', err.message);
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

// ── Plan matrix (locked pricing 2026-05) ──
// Mini 29 / Essentiel 39 / Premium 59 / Signature 79 (mensuel)
const PLAN_MATRIX = {
  mini:      { rank: 1, price: 29, label: 'Mini' },
  essentiel: { rank: 2, price: 39, label: 'Essentiel' },
  premium:   { rank: 3, price: 59, label: 'Premium' },
  signature: { rank: 4, price: 79, label: 'Signature' },
};

// Stripe price IDs (à remplir une fois les produits créés en dashboard Stripe)
const STRIPE_PRICE_IDS = {
  mini:      { monthly: process.env.STRIPE_PRICE_MINI_M,      yearly: process.env.STRIPE_PRICE_MINI_Y,      triennial: process.env.STRIPE_PRICE_MINI_3Y },
  essentiel: { monthly: process.env.STRIPE_PRICE_ESSENTIEL_M, yearly: process.env.STRIPE_PRICE_ESSENTIEL_Y, triennial: process.env.STRIPE_PRICE_ESSENTIEL_3Y },
  premium:   { monthly: process.env.STRIPE_PRICE_PREMIUM_M,   yearly: process.env.STRIPE_PRICE_PREMIUM_Y,   triennial: process.env.STRIPE_PRICE_PREMIUM_3Y },
  signature: { monthly: process.env.STRIPE_PRICE_SIGNATURE_M, yearly: process.env.STRIPE_PRICE_SIGNATURE_Y, triennial: process.env.STRIPE_PRICE_SIGNATURE_3Y },
};

// GET /plans — expose la grille (pour landing + signup + upgrade UI)
app.get('/plans', (req, res) => {
  res.json({
    plans: Object.entries(PLAN_MATRIX).map(([key, v]) => ({
      key, ...v,
      pricing: {
        monthly:   v.price,
        yearly:    Math.round(v.price * 0.90),  // -10%
        triennial: Math.round(v.price * 0.66),  // -34%
      },
    })),
  });
});

// POST /create-checkout-session  (signup direct OU upgrade)
app.post('/create-checkout-session', async (req, res) => {
  if (!STRIPE_SECRET) return res.status(500).json({ error: 'Stripe non configuré' });

  try {
    const stripe = require('stripe')(STRIPE_SECRET);
    const { plan, billing = 'monthly', email, userId, priceId: rawPriceId } = req.body;

    // priceId direct (legacy) OU calculé depuis plan+billing
    let priceId = rawPriceId;
    if (!priceId && plan && STRIPE_PRICE_IDS[plan]) {
      priceId = STRIPE_PRICE_IDS[plan][billing];
    }
    if (!priceId) return res.status(400).json({ error: 'Plan ou priceId invalide' });

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: email,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: 'https://app.r3sto.com/dashboard?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'https://r3sto.com/pricing',
      metadata: { userId: String(userId || ''), plan: plan || '', billing },
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('[R3STO] Stripe checkout error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /plan/upgrade — change le plan d'un user authentifié
// Body: { plan: 'essentiel'|'premium'|'signature', billing: 'monthly'|'yearly'|'triennial' }
app.post('/plan/upgrade', authMiddleware, async (req, res) => {
  try {
    const { plan, billing = 'monthly' } = req.body;
    if (!PLAN_MATRIX[plan]) return res.status(400).json({ error: 'Plan invalide' });

    const currentPlan = req.user.plan || 'mini';
    const currentRank = PLAN_MATRIX[currentPlan]?.rank || 0;
    const targetRank  = PLAN_MATRIX[plan].rank;

    // Empêche downgrade direct (passe par Stripe portal)
    if (targetRank < currentRank) {
      return res.status(400).json({
        error: 'Downgrade non supporté ici. Utilise le portail Stripe.',
        portalEndpoint: '/create-portal-session',
      });
    }
    if (targetRank === currentRank) {
      return res.status(400).json({ error: 'Tu es déjà sur ce plan' });
    }

    // Si Stripe configuré → checkout, sinon update direct (mode dev)
    if (STRIPE_SECRET && STRIPE_PRICE_IDS[plan]?.[billing]) {
      const stripe = require('stripe')(STRIPE_SECRET);
      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        payment_method_types: ['card'],
        customer_email: req.user.email,
        line_items: [{ price: STRIPE_PRICE_IDS[plan][billing], quantity: 1 }],
        success_url: 'https://app.r3sto.com/dashboard?upgraded=1',
        cancel_url: 'https://app.r3sto.com/plan',
        metadata: { userId: String(req.user.id), plan, billing, upgrade_from: currentPlan },
      });
      return res.json({ url: session.url, mode: 'stripe' });
    }

    // Mode dev / sans Stripe : update direct
    await pool.query('UPDATE users SET plan = ? WHERE id = ?', [plan, req.user.id]);
    console.log(`[R3STO] User ${req.user.id} ${currentPlan} → ${plan} (dev mode, no Stripe)`);
    res.json({ ok: true, mode: 'dev', plan, from: currentPlan });
  } catch (err) {
    console.error('[R3STO] Upgrade error:', err);
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
        const planFromMeta = session.metadata?.plan;
        if (userId) {
          // Plan from metadata si présent, sinon deduit du montant (CHF cents)
          let plan = planFromMeta;
          if (!plan || !PLAN_MATRIX[plan]) {
            const amt = session.amount_total || 0;
            plan = amt >= 7900 ? 'signature'
                 : amt >= 5900 ? 'premium'
                 : amt >= 3900 ? 'essentiel'
                 : 'mini';
          }
          await pool.query(
            'UPDATE users SET plan = ?, stripe_customer_id = ?, stripe_subscription_id = ? WHERE id = ?',
            [plan, session.customer, session.subscription, userId]
          );
          console.log(`[R3STO] User ${userId} → plan=${plan}`);
        }
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        // Cancel = retour à mini (jamais free permanent, car le trial 14j est terminé)
        await pool.query(
          'UPDATE users SET plan = "mini", stripe_subscription_id = NULL WHERE stripe_subscription_id = ?',
          [sub.id]
        );
        console.log(`[R3STO] Subscription cancelled: ${sub.id} → plan=mini`);
        break;
      }
      case 'customer.subscription.updated': {
        const sub = event.data.object;
        // Détecte changement de price → reflète le nouveau plan
        const priceId = sub.items?.data?.[0]?.price?.id;
        if (priceId) {
          let newPlan = null;
          for (const [planKey, bills] of Object.entries(STRIPE_PRICE_IDS)) {
            if (Object.values(bills).includes(priceId)) { newPlan = planKey; break; }
          }
          if (newPlan) {
            await pool.query(
              'UPDATE users SET plan = ? WHERE stripe_subscription_id = ?',
              [newPlan, sub.id]
            );
            console.log(`[R3STO] Subscription ${sub.id} → plan=${newPlan}`);
          }
        }
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

// ═══════════════════════════════════════════════════
// PHOTO FALLBACK — par catégorie cuisine + terrasse
// ═══════════════════════════════════════════════════
const CUISINE_PHOTO_KEYWORDS = {
  italian:'italian,pizza', italienne:'italian,pizza', pizza:'pizza',
  french:'french,bistro', française:'french,bistro', francaise:'french,bistro',
  japanese:'japanese,sushi', japonaise:'japanese,sushi', sushi:'sushi,japanese',
  chinese:'chinese,wok', chinoise:'chinese,wok',
  indian:'indian,curry', indienne:'indian,curry',
  thai:'thai,asian', thaïlandaise:'thai,asian',
  lebanese:'lebanese,mezze', libanaise:'lebanese,mezze',
  mediterranean:'mediterranean,greek', méditerranéenne:'mediterranean,greek',
  vegan:'vegan,vegetarian', vegetarian:'vegan,vegetarian',
  brasserie:'brasserie,beer',
  gastronomic:'gastronomy,gourmet', gastronomique:'gastronomy,gourmet',
  burger:'burger,american', american:'burger,american',
  mexican:'mexican,tacos', mexicaine:'mexican,tacos',
  spanish:'spanish,tapas', espagnole:'spanish,tapas',
  greek:'greek,mediterranean', grecque:'greek,mediterranean',
  korean:'korean,bibimbap', coréenne:'korean,bibimbap',
  vietnamese:'vietnamese,pho', vietnamienne:'vietnamese,pho',
  cafe:'cafe,coffee', café:'cafe,coffee',
  fastfood:'street-food', fast_food:'street-food',
  bar:'bar,cocktail',
};
const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY || '';

// ── Index des photos locales déjà téléchargées (4380 fichiers sur r3sto.ch/photos/) ──
const LOCAL_PHOTO_BASE = 'https://r3sto.ch/photos';
let LOCAL_PHOTOS_INDEX = new Set();
try {
  const fs = require('fs');
  const path = require('path');
  const photosFile = path.join(__dirname, 'photos.txt');
  if (fs.existsSync(photosFile)) {
    const content = fs.readFileSync(photosFile, 'utf8');
    LOCAL_PHOTOS_INDEX = new Set(content.split('\n').filter(Boolean));
    console.log(`[R3STO] Index photos chargé : ${LOCAL_PHOTOS_INDEX.size} fichiers`);
  }
} catch (err) {
  console.error('[R3STO] Index photos non chargé:', err.message);
}
function localPhotoUrl(slug) {
  if (!slug) return null;
  const fname = `${slug}.jpg`;
  if (LOCAL_PHOTOS_INDEX.has(fname)) return `${LOCAL_PHOTO_BASE}/${fname}`;
  // Variant sans accent éventuel
  const fname2 = `${slug}.png`;
  if (LOCAL_PHOTOS_INDEX.has(fname2)) return `${LOCAL_PHOTO_BASE}/${fname2}`;
  return null;
}

function transformGooglePlacesUrl(url) {
  // Format new Places API : https://places.googleapis.com/v1/places/{place_id}/photos/{photo_ref}
  // Resolvable URL : append /media?maxHeightPx=400&maxWidthPx=600&key=API_KEY
  if (!url || !url.includes('places.googleapis.com')) return null;
  if (!GOOGLE_PLACES_API_KEY) return null; // pas de clé -> on laisse fallback LoremFlickr prendre le relais
  // Évite double /media si déjà présent
  const base = url.endsWith('/media') ? url : `${url}/media`;
  const sep = base.includes('?') ? '&' : '?';
  return `${base}${sep}maxHeightPx=400&maxWidthPx=600&key=${GOOGLE_PLACES_API_KEY}`;
}

function isUsablePhotoUrl(url) {
  if (!url) return false;
  if (url.trim() === '' || url === 'null' || url === 'undefined') return false;
  // URLs Google Places API : utilisables seulement si on a la clé
  if (url.includes('places.googleapis.com')) return !!GOOGLE_PLACES_API_KEY;
  return true;
}

function absolutizePhotoUrl(u) {
  if (!u) return u;
  // URL relative /photos/... -> r3sto.ch absolu
  if (u.startsWith('/photos/')) return 'https://r3sto.ch' + u;
  if (u.startsWith('photos/')) return 'https://r3sto.ch/' + u;
  return u;
}
function genPhotoSource(r) {
  // Renvoie {url, credit} pour conformité légale (attribution photos)
  const local = localPhotoUrl(r.slug);
  if (local) return { url: local, credit: 'google' }; // photos locales = telechargees depuis Google
  if (isUsablePhotoUrl(r.photo_url) && !r.photo_url.includes('places.googleapis')) {
    const u = absolutizePhotoUrl(r.photo_url);
    return { url: u, credit: u.includes('r3sto.ch') ? 'google' : 'external' };
  }
  if (isUsablePhotoUrl(r.image) && !r.image.includes('places.googleapis')) {
    return { url: absolutizePhotoUrl(r.image), credit: 'external' };
  }
  // Fallback LoremFlickr (CC license via Flickr community)
  const tag = (r.cuisine_tag || r.cuisine || '').toLowerCase().trim();
  const kw = CUISINE_PHOTO_KEYWORDS[tag] || 'restaurant,food';
  const terrace = r.outdoor_seating ? ',terrace' : '';
  const lock = r.id || (r.slug ? Math.abs(r.slug.split('').reduce((a,c)=>a*31+c.charCodeAt(0),7)) % 99999 : 42);
  return { url: `https://loremflickr.com/600/400/${kw}${terrace}?lock=${lock}`, credit: 'flickr' };
}
function genPhotoFallback(r) {
  // 1. PRIORITÉ : photo locale déjà téléchargée (r3sto.ch/photos/<slug>.jpg)
  const local = localPhotoUrl(r.slug);
  if (local) return local;
  // 2. URL photo directe (non-Google — les refs Google Places expirent, on les skip)
  if (isUsablePhotoUrl(r.photo_url) && !r.photo_url.includes('places.googleapis')) return absolutizePhotoUrl(r.photo_url);
  if (isUsablePhotoUrl(r.image) && !r.image.includes('places.googleapis')) return absolutizePhotoUrl(r.image);
  // 3. Fallback LoremFlickr thématique (cuisine + terrasse)
  const tag = (r.cuisine_tag || r.cuisine || '').toLowerCase().trim();
  const kw = CUISINE_PHOTO_KEYWORDS[tag] || 'restaurant,food';
  const terrace = r.outdoor_seating ? ',terrace' : '';
  const lock = r.id || (r.slug ? Math.abs(r.slug.split('').reduce((a,c)=>a*31+c.charCodeAt(0),7)) % 99999 : 42);
  return `https://loremflickr.com/600/400/${kw}${terrace}?lock=${lock}`;
}

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
        photo: genPhotoSource(r).url,
        photoCredit: genPhotoSource(r).credit,
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
    const r = rows[0];
    const ps = genPhotoSource(r);
    r.photo = ps.url;
    r.photoCredit = ps.credit;
    res.json({ restaurant: r });
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

// ═══════════════════════════════════════════════════════════════
//  Translator : sync React state → tables SQL (UPSERT + soft-delete)
// ═══════════════════════════════════════════════════════════════
//
// Préserve l'auto-sync existant (settings JSON) ET aligne les vraies
// tables SQL pour que le moteur de résa voie la config restaurateur.
//
// Stratégie : UPSERT sur (restaurant_id, external_id) ; les éléments
// non-référencés dans le payload sont marqués actif=0 (soft-delete).
//
const SHAPE_MAP = { round:'round', round_sm:'round', round_lg:'round', rect:'rect', rect_lg:'rect', square:'square', square_sm:'square', oval:'oval', banquette:'banquette', bar:'bar' };
function safeNum(v, def=0) { const n = Number(v); return Number.isFinite(n) ? n : def; }

async function translateToSql(restoId, data) {
  const out = { salles:0, tables:0, services:0, fermetures:0, errors:[] };
  try {
    // ── SALLES ──
    const salles = Array.isArray(data.salles) ? data.salles : [];
    if (salles.length > 0) {
      await pool.query('UPDATE salles SET actif=0 WHERE restaurant_id=?', [restoId]);
      for (const s of salles) {
        const extId = String(s.id || '').slice(0,64);
        if (!extId) continue;
        await pool.query(
          `INSERT INTO salles (restaurant_id, external_id, nom, capacite, position, actif)
           VALUES (?, ?, ?, ?, ?, 1)
           ON DUPLICATE KEY UPDATE
             nom=VALUES(nom), capacite=VALUES(capacite), position=VALUES(position), actif=1`,
          [restoId, extId, s.name || extId, safeNum(s.maxCouverts || s.capacite), safeNum(s.priority)]
        );
        out.salles++;
      }
    }
    // Recharge mapping ext → SQL id
    const [salleRows] = await pool.query(
      'SELECT id, external_id FROM salles WHERE restaurant_id=?', [restoId]
    );
    const salleMap = {};
    for (const sr of salleRows) salleMap[sr.external_id] = sr.id;

    // ── TABLES ──
    const tables = Array.isArray(data.tables) ? data.tables : [];
    if (tables.length > 0) {
      await pool.query('UPDATE tables SET actif=0 WHERE restaurant_id=?', [restoId]);
      for (const t of tables) {
        const extId = String(t.id || '').slice(0,64);
        if (!extId) continue;
        // Le React met `salle` = nom de la salle (string), ou `salleId` = external_id
        let salleId = null;
        const salleKey = t.salleId || t.salle;
        if (salleKey && salleMap[salleKey]) salleId = salleMap[salleKey];
        if (!salleId) {
          // Fallback : lookup par nom dans salles SQL
          const [sr] = await pool.query(
            'SELECT id FROM salles WHERE restaurant_id=? AND nom=? LIMIT 1',
            [restoId, salleKey]
          );
          if (sr.length > 0) salleId = sr[0].id;
        }
        if (!salleId) continue; // skip si pas de salle parente trouvée
        await pool.query(
          `INSERT INTO tables (restaurant_id, external_id, salle_id, numero, nom, couverts_min, couverts_max, forme, pos_x, pos_y, pos_w, actif, score_default)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
           ON DUPLICATE KEY UPDATE
             salle_id=VALUES(salle_id), numero=VALUES(numero), nom=VALUES(nom),
             couverts_min=VALUES(couverts_min), couverts_max=VALUES(couverts_max),
             forme=VALUES(forme), pos_x=VALUES(pos_x), pos_y=VALUES(pos_y), pos_w=VALUES(pos_w),
             actif=1, score_default=VALUES(score_default)`,
          [restoId, extId, salleId, t.n || extId, t.label || '',
           safeNum(t.capMin, 1), safeNum(t.capMax, 4),
           SHAPE_MAP[t.shape] || 'rect',
           safeNum(t.x), safeNum(t.y), safeNum(t.w, 1),
           safeNum(t.priority, 5)]
        );
        out.tables++;
      }
    }

    // ── SERVICES ──
    const services = Array.isArray(data.services) ? data.services : [];
    if (services.length > 0) {
      await pool.query('UPDATE services SET actif=0 WHERE restaurant_id=?', [restoId]);
      for (const sv of services) {
        const extId = String(sv.id || '').slice(0,64);
        if (!extId) continue;
        // jours React = [0,1,2,3,4,5,6] (0=dim) → SQL = "7,1,2,3,4,5,6" (7=dim selon ISO)
        const jours = Array.isArray(sv.jours)
          ? sv.jours.map(d => d === 0 ? 7 : d).filter(d => d >= 1 && d <= 7).join(',')
          : '1,2,3,4,5,6,7';
        await pool.query(
          `INSERT INTO services (restaurant_id, external_id, nom, type, heure_debut, heure_fin, jours, last_order, buffer_mins, booking_cutoff_mins, actif)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
           ON DUPLICATE KEY UPDATE
             nom=VALUES(nom), type=VALUES(type), heure_debut=VALUES(heure_debut), heure_fin=VALUES(heure_fin),
             jours=VALUES(jours), last_order=VALUES(last_order), buffer_mins=VALUES(buffer_mins),
             booking_cutoff_mins=VALUES(booking_cutoff_mins), actif=1`,
          [restoId, extId, sv.name || extId,
           (sv.name||'').toLowerCase().includes('midi') ? 'midi'
             : (sv.name||'').toLowerCase().includes('soir') ? 'soir'
             : (sv.name||'').toLowerCase().includes('brunch') ? 'brunch' : 'autre',
           sv.open || '12:00', sv.close || '14:00', jours,
           sv.lastOrder || null,
           safeNum(sv.buffer, 15),
           safeNum(sv.bookingCutoffMins, 0)]
        );
        out.services++;
      }
    }

    // ── FERMETURES ──
    const fermetures = Array.isArray(data.fermetures) ? data.fermetures : [];
    if (fermetures.length > 0) {
      await pool.query('UPDATE fermetures SET actif=0 WHERE restaurant_id=?', [restoId]);
      for (const f of fermetures) {
        const extId = String(f.id || '').slice(0,64);
        if (!extId) continue;
        await pool.query(
          `INSERT INTO fermetures (restaurant_id, external_id, label, date_debut, date_fin, type, actif)
           VALUES (?, ?, ?, ?, ?, ?, 1)
           ON DUPLICATE KEY UPDATE
             label=VALUES(label), date_debut=VALUES(date_debut), date_fin=VALUES(date_fin),
             type=VALUES(type), actif=1`,
          [restoId, extId, f.label || '', f.from || f.date_debut, f.to || f.date_fin || f.from,
           f.type || 'restaurant']
        );
        out.fermetures++;
      }
    }
  } catch (err) {
    out.errors.push(err.message);
    console.error('[R3STO] translateToSql error:', err.message);
  }
  return out;
}

// POST /sync/push — Sauvegarde l'état complet dans restaurant.settings
//                 + UPSERT vers tables SQL pour le moteur de résa (translator)
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

    // ── TRANSLATOR : sync vers tables SQL (silencieux si erreur, settings reste OK) ──
    const translated = await translateToSql(restaurantId, settings);

    res.json({ ok: true, translated });
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

    // ── Liaison réservations ↔ tables (gère combos N tables pour 1 résa) ──
    await pool.query(`CREATE TABLE IF NOT EXISTS reservation_tables (
      reservation_id INT NOT NULL,
      table_id INT NOT NULL,
      is_primary TINYINT(1) NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (reservation_id, table_id),
      KEY idx_table (table_id, reservation_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    console.log('[R3STO] Migration OK: table reservation_tables ready');

    // ── Audit trail des déplacements (T→T, T→Combo, Combo→T, Combo→Combo) ──
    await pool.query(`CREATE TABLE IF NOT EXISTS move_logs (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      reservation_id INT NOT NULL,
      from_tables JSON NULL,
      to_tables JSON NOT NULL,
      mode ENUM('auto','manu') NOT NULL DEFAULT 'manu',
      user_id INT NULL,
      reason VARCHAR(200) NULL,
      override TINYINT(1) NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_resa (reservation_id, created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    console.log('[R3STO] Migration OK: table move_logs ready');

    // ── Helper pour ajouter colonne si manquante ──
    const addColIfMissing = async (tbl, col, def) => {
      const [c] = await pool.query(`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
                                    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`, [tbl, col]);
      if (c.length === 0) {
        await pool.query(`ALTER TABLE \`${tbl}\` ADD COLUMN ${col} ${def}`);
        console.log(`[R3STO] Migration OK: ${tbl}.${col} added`);
      }
    };

    // ── tables : combine_with + score_default + features ──
    await addColIfMissing('tables', 'combine_with', "TEXT NULL COMMENT 'IDs tables combinables, virgule'");
    await addColIfMissing('tables', 'score_default', "TINYINT UNSIGNED NOT NULL DEFAULT 5 COMMENT 'best-table score 1-10'");
    await addColIfMissing('tables', 'features',     "JSON NULL COMMENT '[terrasse,vue,banquette,angle...]'");

    // ── reservations : customer_id, mode, preferences_used ──
    await addColIfMissing('reservations', 'customer_id',       "INT NULL COMMENT 'CRM customer'");
    await addColIfMissing('reservations', 'mode',              "ENUM('auto','manu') NOT NULL DEFAULT 'manu'");
    await addColIfMissing('reservations', 'preferences_used',  "JSON NULL COMMENT 'audit critere selection auto'");

    // ── external_id sur salles/tables/services/fermetures pour sync React ──
    await addColIfMissing('salles',     'external_id', "VARCHAR(64) NULL COMMENT 'ID React frontend'");
    await addColIfMissing('tables',     'external_id', "VARCHAR(64) NULL COMMENT 'ID React frontend'");
    await addColIfMissing('services',   'external_id', "VARCHAR(64) NULL COMMENT 'ID React frontend'");
    await addColIfMissing('fermetures', 'external_id', "VARCHAR(64) NULL COMMENT 'ID React frontend'");
    // Index unique sur (restaurant_id, external_id) pour upsert
    for (const tbl of ['salles','tables','services','fermetures']) {
      try {
        const [idx] = await pool.query(`SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS
                                        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = 'idx_resto_extid'`, [tbl]);
        if (idx.length === 0) {
          await pool.query(`ALTER TABLE \`${tbl}\` ADD UNIQUE KEY idx_resto_extid (restaurant_id, external_id)`);
          console.log(`[R3STO] Migration OK: ${tbl} idx_resto_extid unique`);
        }
      } catch (e) { /* déjà existant ou conflit, on ignore */ }
    }

    // ── customers : CRM des clients du resto ──
    await pool.query(`CREATE TABLE IF NOT EXISTS crm_customers (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      restaurant_id INT NOT NULL,
      full_name VARCHAR(180) NOT NULL,
      email VARCHAR(180) NULL,
      phone VARCHAR(40) NULL,
      preferences JSON NULL COMMENT '[terrasse,banquette,...]',
      allergies JSON NULL COMMENT '[gluten,noix,...]',
      tags JSON NULL COMMENT '[VIP,regulier,famille,...]',
      vip TINYINT(1) NOT NULL DEFAULT 0,
      blacklist TINYINT(1) NOT NULL DEFAULT 0,
      total_visits INT NOT NULL DEFAULT 0,
      no_shows INT NOT NULL DEFAULT 0,
      last_visit DATE NULL,
      birthday DATE NULL,
      notes TEXT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_resto_email (restaurant_id, email),
      KEY idx_resto_phone (restaurant_id, phone),
      KEY idx_resto_vip   (restaurant_id, vip)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    console.log('[R3STO] Migration OK: table crm_customers ready');

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
