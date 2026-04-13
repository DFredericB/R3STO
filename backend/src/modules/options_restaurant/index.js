// Options restaurant — table 1:1 avec restaurants (uq_opts_restaurant)
// On expose une API "upsert by restaurant_id" en plus du CRUD standard.
const express = require('express');
const { z } = require('zod');
const { query } = require('../../config/db');
const { authMiddleware } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');
const { ok, HttpError } = require('../../utils/responses');

const FIELDS = [
  'restaurant_id', 'wifi', 'parking', 'terrasse', 'accessible', 'animaux',
  'langues', 'annulation_h', 'widget_couleur', 'widget_actif',
];

async function ensureRestoOwnership(userId, restaurantId) {
  const [r] = await query(
    'SELECT id FROM restaurants WHERE id = ? AND user_id = ?',
    [restaurantId, userId]
  );
  if (!r[0]) throw new HttpError(403, 'Restaurant non autorisé');
}

async function getByRestaurant(userId, restaurantId) {
  await ensureRestoOwnership(userId, restaurantId);
  const [rows] = await query(
    'SELECT * FROM options_restaurant WHERE restaurant_id = ?',
    [restaurantId]
  );
  return rows[0] || null;
}

async function upsert(userId, data) {
  await ensureRestoOwnership(userId, data.restaurant_id);
  const existing = await getByRestaurant(userId, data.restaurant_id);
  if (existing) {
    const sets = [];
    const values = [];
    for (const f of FIELDS) {
      if (f === 'restaurant_id') continue;
      if (data[f] !== undefined) {
        sets.push(`\`${f}\` = ?`);
        values.push(data[f]);
      }
    }
    if (sets.length) {
      values.push(data.restaurant_id);
      await query(
        `UPDATE options_restaurant SET ${sets.join(', ')} WHERE restaurant_id = ?`,
        values
      );
    }
  } else {
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
    await query(
      `INSERT INTO options_restaurant (${cols.join(',')}) VALUES (${placeholders.join(',')})`,
      values
    );
  }
  return getByRestaurant(userId, data.restaurant_id);
}

async function remove(userId, restaurantId) {
  await ensureRestoOwnership(userId, restaurantId);
  await query('DELETE FROM options_restaurant WHERE restaurant_id = ?', [restaurantId]);
  return { deleted: true };
}

const router = express.Router();
router.use(authMiddleware);

router.get('/:restaurant_id', async (req, res, next) => {
  try {
    const r = await getByRestaurant(req.user.id, req.params.restaurant_id);
    return ok(res, { options: r });
  } catch (e) { next(e); }
});

router.put('/:restaurant_id', validate(z.object({}).passthrough()), async (req, res, next) => {
  try {
    const data = { ...req.validated, restaurant_id: Number(req.params.restaurant_id) };
    const r = await upsert(req.user.id, data);
    return ok(res, { options: r });
  } catch (e) { next(e); }
});

router.post('/', validate(z.object({}).passthrough()), async (req, res, next) => {
  try {
    const r = await upsert(req.user.id, req.validated);
    return ok(res, { options: r });
  } catch (e) { next(e); }
});

router.delete('/:restaurant_id', async (req, res, next) => {
  try {
    const r = await remove(req.user.id, req.params.restaurant_id);
    return ok(res, r);
  } catch (e) { next(e); }
});

module.exports = {
  service: { getByRestaurant, upsert, remove },
  router,
  routes: router,
};
