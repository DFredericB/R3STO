// Action logs (audit trail) — lecture seule + insert (pas d'update/delete)
const express = require('express');
const { z } = require('zod');
const { query } = require('../../config/db');
const { authMiddleware } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');
const { ok, created, HttpError } = require('../../utils/responses');

const FIELDS = [
  'restaurant_id', 'reservation_id', 'action', 'detail',
  'type', 'icon', 'user_name', 'user_role',
];

async function ensureRestoOwnership(userId, restaurantId) {
  const [r] = await query(
    'SELECT id FROM restaurants WHERE id = ? AND user_id = ?',
    [restaurantId, userId]
  );
  if (!r[0]) throw new HttpError(403, 'Restaurant non autorisé');
}

async function list(userId, filters = {}) {
  let sql = `SELECT a.* FROM action_logs a
             JOIN restaurants rest ON a.restaurant_id = rest.id
             WHERE rest.user_id = ?`;
  const params = [userId];
  if (filters.restaurant_id) { sql += ' AND a.restaurant_id = ?'; params.push(filters.restaurant_id); }
  if (filters.reservation_id) { sql += ' AND a.reservation_id = ?'; params.push(filters.reservation_id); }
  if (filters.type) { sql += ' AND a.type = ?'; params.push(filters.type); }
  if (filters.from) { sql += ' AND a.ts >= ?'; params.push(filters.from); }
  if (filters.to) { sql += ' AND a.ts <= ?'; params.push(filters.to); }
  sql += ' ORDER BY a.ts DESC LIMIT ' + Math.min(parseInt(filters.limit, 10) || 200, 1000);
  const [rows] = await query(sql, params);
  return rows;
}

async function logAction(userId, data) {
  if (!data.restaurant_id || !data.action || !data.type) {
    throw new HttpError(400, 'restaurant_id, action et type sont requis');
  }
  await ensureRestoOwnership(userId, data.restaurant_id);
  const cols = [];
  const placeholders = [];
  const values = [];
  for (const f of FIELDS) {
    if (data[f] !== undefined) {
      cols.push(`\`${f}\``);
      placeholders.push('?');
      values.push(data[f]);
    }
  }
  const [result] = await query(
    `INSERT INTO action_logs (${cols.join(',')}) VALUES (${placeholders.join(',')})`,
    values
  );
  const [rows] = await query('SELECT * FROM action_logs WHERE id = ?', [result.insertId]);
  return rows[0];
}

const router = express.Router();
router.use(authMiddleware);

router.get('/', async (req, res, next) => {
  try {
    const items = await list(req.user.id, req.query);
    return ok(res, { logs: items, items });
  } catch (e) { next(e); }
});

router.post('/', validate(z.object({}).passthrough()), async (req, res, next) => {
  try {
    const r = await logAction(req.user.id, req.validated);
    return created(res, { log: r, item: r });
  } catch (e) { next(e); }
});

module.exports = {
  service: { list, logAction },
  router,
  routes: router,
};
