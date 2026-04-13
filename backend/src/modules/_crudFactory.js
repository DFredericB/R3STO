// ═══════════════════════════════════════════════════════════════
//  CRUD Factory — génère un module CRUD générique scopé par user_id
//  via JOIN restaurants. Utilisé par les modules Round 2.
//
//  Usage :
//    const factory = require('../_crudFactory');
//    module.exports = factory({
//      table: 'salles',
//      fields: ['restaurant_id','nom','capacite','actif','position'],
//      requiredOnCreate: ['restaurant_id','nom'],
//    });
// ═══════════════════════════════════════════════════════════════

const express = require('express');
const { z } = require('zod');
const { query } = require('../config/db');
const { authMiddleware } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { ok, created, HttpError } = require('../utils/responses');

function makeService({ table, fields, requiredOnCreate = [], orderBy = 'id DESC' }) {
  async function ensureRestoOwnership(userId, restaurantId) {
    const [r] = await query(
      'SELECT id FROM restaurants WHERE id = ? AND user_id = ?',
      [restaurantId, userId]
    );
    if (!r[0]) throw new HttpError(403, 'Restaurant non autorisé');
  }

  async function ensureRowOwnership(userId, id) {
    const [rows] = await query(
      `SELECT t.id, t.restaurant_id FROM \`${table}\` t
       JOIN restaurants rest ON t.restaurant_id = rest.id
       WHERE t.id = ? AND rest.user_id = ?`,
      [id, userId]
    );
    if (!rows[0]) throw new HttpError(404, `${table} introuvable`);
    return rows[0];
  }

  async function list(userId, filters = {}) {
    let sql = `SELECT t.* FROM \`${table}\` t
               JOIN restaurants rest ON t.restaurant_id = rest.id
               WHERE rest.user_id = ?`;
    const params = [userId];
    if (filters.restaurant_id) {
      sql += ' AND t.restaurant_id = ?';
      params.push(filters.restaurant_id);
    }
    sql += ` ORDER BY t.${orderBy}`;
    const [rows] = await query(sql, params);
    return rows;
  }

  async function getOne(userId, id) {
    await ensureRowOwnership(userId, id);
    const [rows] = await query(`SELECT * FROM \`${table}\` WHERE id = ?`, [id]);
    return rows[0];
  }

  async function create(userId, data) {
    for (const f of requiredOnCreate) {
      if (data[f] === undefined || data[f] === null || data[f] === '') {
        throw new HttpError(400, `Champ requis : ${f}`);
      }
    }
    await ensureRestoOwnership(userId, data.restaurant_id);
    const cols = [];
    const placeholders = [];
    const values = [];
    for (const f of fields) {
      if (data[f] !== undefined) {
        cols.push(`\`${f}\``);
        placeholders.push('?');
        // JSON fields auto-stringify
        const v = (typeof data[f] === 'object' && data[f] !== null)
          ? JSON.stringify(data[f]) : data[f];
        values.push(v);
      }
    }
    const [result] = await query(
      `INSERT INTO \`${table}\` (${cols.join(',')}) VALUES (${placeholders.join(',')})`,
      values
    );
    return getOne(userId, result.insertId);
  }

  async function update(userId, id, patch) {
    await ensureRowOwnership(userId, id);
    const sets = [];
    const values = [];
    for (const f of fields) {
      if (patch[f] !== undefined) {
        sets.push(`\`${f}\` = ?`);
        const v = (typeof patch[f] === 'object' && patch[f] !== null)
          ? JSON.stringify(patch[f]) : patch[f];
        values.push(v);
      }
    }
    if (!sets.length) throw new HttpError(400, 'Rien à mettre à jour');
    values.push(id);
    await query(`UPDATE \`${table}\` SET ${sets.join(', ')} WHERE id = ?`, values);
    return getOne(userId, id);
  }

  async function remove(userId, id) {
    await ensureRowOwnership(userId, id);
    await query(`DELETE FROM \`${table}\` WHERE id = ?`, [id]);
    return { id };
  }

  return { list, getOne, create, update, remove };
}

function makeRouter(serviceObj, { resourceKey }) {
  const router = express.Router();
  router.use(authMiddleware);

  const anySchema = z.object({}).passthrough();

  router.get('/', async (req, res, next) => {
    try {
      const items = await serviceObj.list(req.user.id, req.query);
      return ok(res, { [resourceKey]: items, items });
    } catch (e) { next(e); }
  });

  router.get('/:id', async (req, res, next) => {
    try {
      const r = await serviceObj.getOne(req.user.id, req.params.id);
      return ok(res, { [resourceKey.replace(/s$/, '')]: r, item: r });
    } catch (e) { next(e); }
  });

  router.post('/', validate(anySchema), async (req, res, next) => {
    try {
      const r = await serviceObj.create(req.user.id, req.validated);
      return created(res, { [resourceKey.replace(/s$/, '')]: r, item: r });
    } catch (e) { next(e); }
  });

  router.patch('/:id', validate(anySchema), async (req, res, next) => {
    try {
      const r = await serviceObj.update(req.user.id, req.params.id, req.validated);
      return ok(res, { [resourceKey.replace(/s$/, '')]: r, item: r });
    } catch (e) { next(e); }
  });

  router.put('/:id', validate(anySchema), async (req, res, next) => {
    try {
      const r = await serviceObj.update(req.user.id, req.params.id, req.validated);
      return ok(res, { [resourceKey.replace(/s$/, '')]: r, item: r });
    } catch (e) { next(e); }
  });

  router.delete('/:id', async (req, res, next) => {
    try {
      await serviceObj.remove(req.user.id, req.params.id);
      return ok(res, { deleted: true });
    } catch (e) { next(e); }
  });

  return router;
}

function buildModule(config) {
  const service = makeService(config);
  const router = makeRouter(service, { resourceKey: config.resourceKey || config.table });
  return { service, router };
}

module.exports = buildModule;
