// ═══════════════════════════════════════════
//  R3STO — Dashboard Route
// ═══════════════════════════════════════════
const express = require('express');
const router  = express.Router();
const db      = require('../config/db');
const { getSession } = require('./auth');

async function auth(req, res) {
  const s = await getSession(req);
  if (!s) { res.status(401).json({ error: 'Non authentifié' }); return null; }
  return s;
}

router.get('/', async (req, res) => {
  try {
    const s = await auth(req, res); if (!s) return;
    const rid = s.restaurant_id;
    const today = new Date().toISOString().slice(0,10);

    const [[rt]] = await db.execute(`
      SELECT COUNT(*) AS nb, COALESCE(SUM(couverts),0) AS covers
      FROM reservations
      WHERE restaurant_id = ? AND date_resa = ?
      AND statut NOT IN ('cancelled','noshow')
    `, [rid, today]);

    const [[ns]] = await db.execute(`
      SELECT COUNT(*) AS nb FROM reservations
      WHERE restaurant_id = ? AND statut = 'noshow'
      AND date_resa >= DATE_FORMAT(NOW(),'%Y-%m-01')
    `, [rid]);

    const [upcoming] = await db.execute(`
      SELECT r.id, r.client_nom, r.couverts, r.heure, r.statut,
             t.numero AS table_numero
      FROM reservations r
      LEFT JOIN \`tables\` t ON t.id = r.table_id
      WHERE r.restaurant_id = ? AND r.date_resa = ?
      AND r.statut = 'reserved'
      ORDER BY r.heure ASC LIMIT 8
    `, [rid, today]);

    const [[clients_total]] = await db.execute(
      'SELECT COUNT(*) AS nb FROM clients WHERE restaurant_id = ?', [rid]
    );
    const [[resas_month]] = await db.execute(`
      SELECT COUNT(*) AS nb FROM reservations
      WHERE restaurant_id = ? AND date_resa >= DATE_FORMAT(NOW(),'%Y-%m-01')
    `, [rid]);

    res.json({
      reservations_today: parseInt(rt.nb),
      covers_today:       parseInt(rt.covers),
      noshows_month:      parseInt(ns.nb),
      clients_total:      parseInt(clients_total.nb),
      resas_month:        parseInt(resas_month.nb),
      upcoming,
      date:               today,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
