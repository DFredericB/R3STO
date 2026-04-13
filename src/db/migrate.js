#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════
//  Migration runner — exécute en ordre les fichiers SQL versionnés
//  de src/db/migrations/, en suivant l'état dans la table _migrations.
//
//  Usage :
//    node src/db/migrate.js              → applique les migrations en attente
//    node src/db/migrate.js --status     → liste l'état sans rien appliquer
//    node src/db/migrate.js --reset      → DROP toutes les tables (DANGER)
// ═══════════════════════════════════════════════════════════════

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { getPool, closePool } = require('../config/db');

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

async function ensureTable() {
  const pool = getPool();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
}

async function listApplied() {
  const pool = getPool();
  const [rows] = await pool.query('SELECT name FROM _migrations ORDER BY name');
  return new Set(rows.map((r) => r.name));
}

function listFiles() {
  if (!fs.existsSync(MIGRATIONS_DIR)) return [];
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();
}

async function runMigration(file) {
  const pool = getPool();
  const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
  // Split sur les lignes "-- @migration:split" pour gérer plusieurs statements
  const statements = sql
    .split(/-- @migration:split/g)
    .map((s) => s.trim())
    .filter(Boolean);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    for (const stmt of statements) {
      await conn.query(stmt);
    }
    await conn.query('INSERT INTO _migrations (name) VALUES (?)', [file]);
    await conn.commit();
    console.log(`[migrate] ✓ ${file}`);
  } catch (err) {
    await conn.rollback();
    console.error(`[migrate] ✗ ${file} :`, err.message);
    throw err;
  } finally {
    conn.release();
  }
}

async function status() {
  const applied = await listApplied();
  const files = listFiles();
  console.log('\n[migrate] État des migrations :\n');
  for (const f of files) {
    const mark = applied.has(f) ? '✓' : '·';
    console.log(`  ${mark}  ${f}`);
  }
  console.log(`\n  ${applied.size}/${files.length} appliquées\n`);
}

async function migrate() {
  await ensureTable();
  const applied = await listApplied();
  const files = listFiles();
  const pending = files.filter((f) => !applied.has(f));

  if (pending.length === 0) {
    console.log('[migrate] Rien à appliquer (toutes les migrations sont à jour)');
    return;
  }

  console.log(`[migrate] ${pending.length} migration(s) en attente...`);
  for (const f of pending) {
    await runMigration(f);
  }
  console.log('[migrate] Terminé.');
}

async function reset() {
  console.log('[migrate] RESET — suppression de toutes les tables...');
  const pool = getPool();
  await pool.query('SET FOREIGN_KEY_CHECKS=0');
  const [tables] = await pool.query(
    `SELECT table_name AS name FROM information_schema.tables WHERE table_schema = DATABASE()`
  );
  for (const t of tables) {
    await pool.query(`DROP TABLE IF EXISTS \`${t.name}\``);
    console.log(`  drop ${t.name}`);
  }
  await pool.query('SET FOREIGN_KEY_CHECKS=1');
  console.log('[migrate] Reset terminé.');
}

async function main() {
  const args = process.argv.slice(2);
  try {
    if (args.includes('--status')) {
      await ensureTable();
      await status();
    } else if (args.includes('--reset')) {
      await reset();
    } else {
      await migrate();
    }
  } catch (err) {
    console.error('[migrate] Échec :', err.message);
    process.exitCode = 1;
  } finally {
    await closePool();
  }
}

if (require.main === module) main();

module.exports = { migrate, status, reset };
