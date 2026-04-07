// ═══════════════════════════════════════════════════════════════
//  Reservations — logique métier
//  Toutes les requêtes sont scopées par user_id (multi-tenant via
//  jointure restaurants).
// ═══════════════════════════════════════════════════════════════

const { query } = require('../../config/db');
const { HttpError } = require('../../utils/responses');

const UPDATABLE = [
  'guest_name', 'guest_email', 'guest_phone', 'party_size',
  'date', 'time', 'status', 'notes', 'source', 'table_id', 'restaurant_id',
];

async function ensureOwnership(userId, reservationId) {
  const [rows] = await query(
    `SELECT r.id FROM reservations r
     JOIN restaurants rest ON r.restaurant_id = rest.id
     WHERE r.id = ? AND rest.user_id = ?`,
    [reservationId, userId]
  );
  if (!rows[0]) throw new HttpError(404, 'Réservation non trouvée');
  return true;
}

async function create(userId, data) {
  // Vérifier que le restaurant appartient bien à l'utilisateur
  const [r] = await query(
    'SELECT id FROM restaurants WHERE id = ? AND user_id = ?',
    [data.restaurant_id, userId]
  );
  if (!r[0]) throw new HttpError(403, 'Restaurant non autorisé');

  const [result] = await query(
    `INSERT INTO reservations
      (restaurant_id, guest_name, guest_email, guest_phone, party_size, date, time, notes, source, table_id, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.restaurant_id,
      data.guest_name,
      data.guest_email || '',
      data.guest_phone || '',
      data.party_size || 2,
      data.date,
      data.time,
      data.notes || '',
      data.source || 'app',
      data.table_id || null,
      data.status || 'reserved',
    ]
  );
  return getOne(userId, result.insertId);
}

async function list(userId, filters = {}) {
  let sql = `SELECT r.* FROM reservations r
             JOIN restaurants rest ON r.restaurant_id = rest.id
             WHERE rest.user_id = ?`;
  const params = [userId];

  if (filters.restaurant_id) { sql += ' AND r.restaurant_id = ?'; params.push(filters.restaurant_id); }
  if (filters.date) { sql += ' AND r.date = ?'; params.push(filters.date); }
  if (filters.status) { sql += ' AND r.status = ?'; params.push(filters.status); }
  if (filters.from) { sql += ' AND r.date >= ?'; params.push(filters.from); }
  if (filters.to) { sql += ' AND r.date <= ?'; params.push(filters.to); }

  sql += ' ORDER BY r.date DESC, r.time ASC';

  const [rows] = await query(sql, params);
  return rows;
}

async function getOne(userId, id) {
  const [rows] = await query(
    `SELECT r.* FROM reservations r
     JOIN restaurants rest ON r.restaurant_id = rest.id
     WHERE r.id = ? AND rest.user_id = ?`,
    [id, userId]
  );
  if (!rows[0]) throw new HttpError(404, 'Réservation non trouvée');
  return rows[0];
}

async function update(userId, id, patch) {
  await ensureOwnership(userId, id);
  const sets = [];
  const values = [];
  for (const f of UPDATABLE) {
    if (patch[f] !== undefined) {
      sets.push(`\`${f}\` = ?`);
      values.push(patch[f]);
    }
  }
  if (sets.length === 0) {
    throw new HttpError(400, 'Aucune donnée à mettre à jour');
  }
  values.push(id);
  await query(`UPDATE reservations SET ${sets.join(', ')} WHERE id = ?`, values);
  return getOne(userId, id);
}

async function setStatus(userId, id, status) {
  await ensureOwnership(userId, id);
  await query('UPDATE reservations SET status = ? WHERE id = ?', [status, id]);
  return getOne(userId, id);
}

async function remove(userId, id) {
  await ensureOwnership(userId, id);
  await query('DELETE FROM reservations WHERE id = ?', [id]);
  return { id };
}

async function search(userId, q) {
  const like = `%${q}%`;
  const [rows] = await query(
    `SELECT r.* FROM reservations r
     JOIN restaurants rest ON r.restaurant_id = rest.id
     WHERE rest.user_id = ?
       AND (r.guest_name LIKE ? OR r.guest_email LIKE ? OR r.guest_phone LIKE ?)
     ORDER BY r.date DESC, r.time ASC LIMIT 100`,
    [userId, like, like, like]
  );
  return rows;
}

async function stats(userId, from, to) {
  const params = [userId];
  let dateFilter = '';
  if (from) { dateFilter += ' AND r.date >= ?'; params.push(from); }
  if (to) { dateFilter += ' AND r.date <= ?'; params.push(to); }

  const [[counts]] = await query(
    `SELECT
       COUNT(*) AS total,
       SUM(CASE WHEN r.status = 'done' THEN 1 ELSE 0 END) AS done,
       SUM(CASE WHEN r.status = 'noshow' THEN 1 ELSE 0 END) AS noshow,
       SUM(CASE WHEN r.status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled,
       SUM(r.party_size) AS total_guests
     FROM reservations r
     JOIN restaurants rest ON r.restaurant_id = rest.id
     WHERE rest.user_id = ?${dateFilter}`,
    params
  );
  return counts;
}

async function bulkUpdate(userId, updates) {
  const results = [];
  for (const u of updates) {
    results.push(await update(userId, u.id, u.patch));
  }
  return results;
}

async function bulkDelete(userId, ids) {
  for (const id of ids) {
    await remove(userId, id);
  }
  return { deleted: ids.length };
}

module.exports = {
  create, list, getOne, update, setStatus, remove,
  search, stats, bulkUpdate, bulkDelete,
};
