// ═══════════════════════════════════════════════════════════════
//  Admin — migrations, diagnostics, import CRM
//  Toutes les routes nécessitent auth + rôle superadmin/admin
// ═══════════════════════════════════════════════════════════════

const express = require('express');
const fs = require('fs');
const path = require('path');
const { authMiddleware, adminMiddleware } = require('../../middleware/auth');
const db = require('../../config/db');

const router = express.Router();

// ─── Protéger toutes les routes admin ──────────────────
router.use(authMiddleware, adminMiddleware);

// ═══════════════════════════════════════════════════════════════
//  MIGRATIONS
// ═══════════════════════════════════════════════════════════════

const MIGRATIONS_DIR = path.join(__dirname, '../../db/migrations');

// Statut des migrations
router.get('/migrations', async (req, res, next) => {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    const [applied] = await db.query('SELECT name, applied_at FROM _migrations ORDER BY name');
    const appliedSet = new Set(applied.map(r => r.name));

    const files = fs.existsSync(MIGRATIONS_DIR)
      ? fs.readdirSync(MIGRATIONS_DIR).filter(f => f.endsWith('.sql')).sort()
      : [];

    const migrations = files.map(f => ({
      name: f,
      applied: appliedSet.has(f),
      applied_at: applied.find(r => r.name === f)?.applied_at || null,
    }));

    const pending = migrations.filter(m => !m.applied).length;
    res.json({ ok: true, migrations, applied: applied.length, pending });
  } catch (e) { next(e); }
});

// Appliquer les migrations en attente
router.post('/migrations/run', async (req, res, next) => {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    const [appliedRows] = await db.query('SELECT name FROM _migrations ORDER BY name');
    const appliedSet = new Set(appliedRows.map(r => r.name));

    const files = fs.existsSync(MIGRATIONS_DIR)
      ? fs.readdirSync(MIGRATIONS_DIR).filter(f => f.endsWith('.sql')).sort()
      : [];

    const pending = files.filter(f => !appliedSet.has(f));
    if (pending.length === 0) {
      return res.json({ ok: true, message: 'Rien à appliquer', applied: [] });
    }

    const results = [];
    const pool = db.getPool();

    for (const file of pending) {
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
      const statements = sql.split(/-- @migration:split/g).map(s => s.trim()).filter(Boolean);

      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        for (const stmt of statements) {
          await conn.query(stmt);
        }
        await conn.query('INSERT INTO _migrations (name) VALUES (?)', [file]);
        await conn.commit();
        results.push({ name: file, status: 'ok' });
      } catch (err) {
        await conn.rollback();
        results.push({ name: file, status: 'error', error: err.message });
        break; // Stop on first error
      } finally {
        conn.release();
      }
    }

    res.json({ ok: true, applied: results });
  } catch (e) { next(e); }
});

// ═══════════════════════════════════════════════════════════════
//  CLIENTS — tous les users owner avec leurs restaurants
// ═══════════════════════════════════════════════════════════════

router.get('/clients', async (req, res, next) => {
  try {
    const [users] = await db.query(
      `SELECT u.id, u.email, u.name, u.phone, u.role, u.plan, u.status,
              u.stripe_customer_id, u.stripe_subscription_id,
              u.email_verified, u.last_login, u.created_at,
              COUNT(r.id) AS restaurant_count
       FROM users u
       LEFT JOIN restaurants r ON r.user_id = u.id
       WHERE u.role IN ('owner','manager','user') AND u.status != 'deleted'
       GROUP BY u.id
       ORDER BY u.created_at DESC`
    );
    res.json({ ok: true, clients: users });
  } catch (e) { next(e); }
});

// ═══════════════════════════════════════════════════════════════
//  RESTAURANTS — tous les restaurants avec user_id
// ═══════════════════════════════════════════════════════════════

router.get('/restaurants', async (req, res, next) => {
  try {
    const [rows] = await db.query(
      `SELECT r.*, u.email AS owner_email, u.name AS owner_name
       FROM restaurants r
       LEFT JOIN users u ON r.user_id = u.id
       ORDER BY r.created_at DESC`
    );
    res.json({ ok: true, restaurants: rows });
  } catch (e) { next(e); }
});

// ═══════════════════════════════════════════════════════════════
//  USERS — tous les utilisateurs plateforme
// ═══════════════════════════════════════════════════════════════

router.get('/users', async (req, res, next) => {
  try {
    const [rows] = await db.query(
      `SELECT id, email, name, phone, role, plan, status, email_verified,
              last_login, created_at
       FROM users WHERE status != 'deleted'
       ORDER BY created_at DESC`
    );
    res.json({ ok: true, users: rows });
  } catch (e) { next(e); }
});

// ═══════════════════════════════════════════════════════════════
//  STATS — métriques globales plateforme
// ═══════════════════════════════════════════════════════════════

router.get('/stats', async (req, res, next) => {
  try {
    const [[{ totalUsers }]] = await db.query('SELECT COUNT(*) AS totalUsers FROM users WHERE status != ?', ['deleted']);
    const [[{ totalRestos }]] = await db.query('SELECT COUNT(*) AS totalRestos FROM restaurants');
    const [[{ signups7d }]] = await db.query('SELECT COUNT(*) AS signups7d FROM users WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)');
    const [[{ signups30d }]] = await db.query('SELECT COUNT(*) AS signups30d FROM users WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)');
    const [[{ totalResas }]] = await db.query('SELECT COUNT(*) AS totalResas FROM reservations').catch(() => [[ { totalResas: 0 } ]]);
    res.json({ ok: true, totalUsers, totalRestos, signups7d, signups30d, totalResas });
  } catch (e) { next(e); }
});

// ═══════════════════════════════════════════════════════════════
//  FINANCIALS — MRR, ARR, répartition par plan
// ═══════════════════════════════════════════════════════════════

router.get('/financials', async (req, res, next) => {
  try {
    const planPrices = { free: 0, bistro: 39, resto: 59, gastro: 79 };
    const [plans] = await db.query(
      `SELECT plan, COUNT(*) AS cnt FROM users
       WHERE status = 'active' AND role = 'owner'
       GROUP BY plan`
    );
    let mrr = 0;
    const mrrBreakdown = [];
    const byStatus = {};
    plans.forEach(p => {
      const price = planPrices[p.plan] || 0;
      mrr += price * p.cnt;
      mrrBreakdown.push({ plan: p.plan, count: p.cnt, mrr: price * p.cnt });
      byStatus[p.plan] = p.cnt;
    });
    const [[{ total_users }]] = await db.query('SELECT COUNT(*) AS total_users FROM users WHERE status != ?', ['deleted']);
    const [[{ total_restaurants }]] = await db.query('SELECT COUNT(*) AS total_restaurants FROM restaurants');
    const [[{ signups_30d }]] = await db.query('SELECT COUNT(*) AS signups_30d FROM users WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)');
    res.json({
      ok: true, mrr, arr: mrr * 12, mrr_breakdown: mrrBreakdown,
      by_status: byStatus, total_users, total_restaurants, signups_30d,
      plan_prices: planPrices, currency: 'CHF'
    });
  } catch (e) { next(e); }
});

// ═══════════════════════════════════════════════════════════════
//  ACTIVITIES — dernières activités plateforme
// ═══════════════════════════════════════════════════════════════

router.get('/activities', async (req, res, next) => {
  try {
    // Derniers logins + inscriptions comme activités
    const [logins] = await db.query(
      `SELECT 'login' AS type, u.name, u.email, s.created_at AS ts
       FROM sessions s JOIN users u ON s.user_id = u.id
       ORDER BY s.created_at DESC LIMIT 30`
    );
    const [signups] = await db.query(
      `SELECT 'signup' AS type, name, email, created_at AS ts
       FROM users ORDER BY created_at DESC LIMIT 20`
    );
    const activities = [...logins, ...signups]
      .sort((a, b) => new Date(b.ts) - new Date(a.ts))
      .slice(0, 50);
    res.json({ ok: true, activities });
  } catch (e) { next(e); }
});

// ═══════════════════════════════════════════════════════════════
//  MARKETPLACE — gestion admin des listings publics
// ═══════════════════════════════════════════════════════════════

// GET /admin/marketplace — tous les restaurants avec infos marketplace
router.get('/marketplace', async (req, res, next) => {
  try {
    const [rows] = await db.query(
      `SELECT r.id, r.name, r.slug, r.city, r.type, r.status,
              r.cuisine_tag, r.photo, r.avg_price, r.price_range,
              r.rating, r.reviews_count, r.features, r.promos,
              r.boost_score, r.client_score, r.marketplace,
              r.booking_url, r.vitrine_url,
              u.email AS owner_email, u.name AS owner_name, u.plan
       FROM restaurants r
       LEFT JOIN users u ON r.user_id = u.id
       ORDER BY r.marketplace DESC, r.boost_score DESC, r.name`
    );
    res.json({ ok: true, restaurants: rows });
  } catch (e) { next(e); }
});

// PATCH /admin/marketplace/:id — mettre à jour les champs marketplace d'un restaurant
router.patch('/marketplace/:id', async (req, res, next) => {
  try {
    const allowed = [
      'cuisine_tag', 'photo', 'avg_price', 'price_range',
      'features', 'promos', 'boost_score', 'client_score',
      'marketplace', 'booking_url', 'vitrine_url'
    ];
    const sets = [];
    const values = [];
    for (const f of allowed) {
      if (req.body[f] !== undefined) {
        sets.push(`\`${f}\` = ?`);
        const val = (f === 'features' || f === 'promos')
          ? JSON.stringify(req.body[f])
          : req.body[f];
        values.push(val);
      }
    }
    if (sets.length === 0) {
      return res.status(400).json({ ok: false, message: 'Aucune donnée' });
    }
    values.push(req.params.id);
    await db.query(`UPDATE restaurants SET ${sets.join(', ')} WHERE id = ?`, values);
    const [updated] = await db.query('SELECT * FROM restaurants WHERE id = ?', [req.params.id]);
    res.json({ ok: true, restaurant: updated[0] });
  } catch (e) { next(e); }
});

// ═══════════════════════════════════════════════════════════════
//  STUBS — endpoints attendus par le frontend (données vides)
// ═══════════════════════════════════════════════════════════════

router.get('/invoices', (req, res) => res.json({ ok: true, invoices: [] }));
router.get('/reservations/stats', (req, res) => res.json({ ok: true, total: 0, by_restaurant: [] }));
router.get('/onboarding', (req, res) => res.json({ ok: true, onboarding: [] }));
router.get('/audit-log', (req, res) => res.json({ ok: true, audit_log: [] }));
router.get('/monitoring', (req, res) => res.json({ ok: true, monitoring: [] }));
router.get('/crm', (req, res) => res.json({ ok: true, contacts: [] }));
router.get('/newsletters', (req, res) => res.json({ ok: true, newsletters: [] }));
router.get('/blacklist', (req, res) => res.json({ ok: true, blacklist: [] }));
router.get('/tickets', (req, res) => res.json({ ok: true, tickets: [] }));
router.get('/suggestions', (req, res) => res.json({ ok: true, suggestions: [] }));
router.get('/alerts', (req, res) => res.json({ ok: true, alerts: [] }));
router.get('/surveys', (req, res) => res.json({ ok: true, surveys: [] }));

// ═══════════════════════════════════════════════════════════════
//  DATABASE INFO
// ═══════════════════════════════════════════════════════════════

router.get('/db-info', async (req, res, next) => {
  try {
    const [tables] = await db.query(
      `SELECT table_name AS name, table_rows AS rows, ROUND(data_length/1024) AS data_kb
       FROM information_schema.tables WHERE table_schema = DATABASE() ORDER BY table_name`
    );
    const [[{ ver }]] = await db.query('SELECT VERSION() AS ver');
    res.json({ ok: true, version: ver, tables });
  } catch (e) { next(e); }
});

module.exports = router;
