// ═══════════════════════════════════════════════════════════════
//  Pool MariaDB — singleton partagé par toute l'application
// ═══════════════════════════════════════════════════════════════

const mysql = require('mysql2/promise');
const { config } = require('./index');

let pool = null;

function getPool() {
  if (pool) return pool;
  pool = mysql.createPool({
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    database: config.db.database,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    charset: 'utf8mb4',
    dateStrings: false,
  });
  console.log('[db] Pool MariaDB créé');
  return pool;
}

async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('[db] Pool MariaDB fermé');
  }
}

// Helpers de requête : raccourcis sur le pool
async function query(sql, params = []) {
  return getPool().query(sql, params);
}

async function execute(sql, params = []) {
  return getPool().execute(sql, params);
}

async function withTransaction(fn) {
  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

module.exports = { getPool, closePool, query, execute, withTransaction };
