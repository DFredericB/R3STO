// ═══════════════════════════════════════════════════════════════
//  Health — vérification du service et de la DB
// ═══════════════════════════════════════════════════════════════

const express = require('express');
const { query } = require('../../config/db');
const { config } = require('../../config');

const router = express.Router();

router.get('/', async (req, res) => {
  let dbStatus = 'unknown';
  try {
    const [rows] = await query('SELECT 1 AS ok');
    dbStatus = rows[0].ok === 1 ? 'connected' : 'error';
  } catch (err) {
    dbStatus = `error: ${err.message}`;
  }
  res.json({
    status: 'ok',
    version: config.version,
    env: config.env,
    db: dbStatus,
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
