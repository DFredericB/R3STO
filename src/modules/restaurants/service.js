// ═══════════════════════════════════════════════════════════════
//  Restaurants — logique métier
// ═══════════════════════════════════════════════════════════════

const { query } = require('../../config/db');
const { HttpError } = require('../../utils/responses');

function slugify(str) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

const UPDATABLE_FIELDS = [
  'name', 'type', 'address', 'city', 'postal_code', 'canton', 'country',
  'phone', 'email', 'website', 'capacity', 'logo_url', 'cover_url',
  'description', 'currency', 'timezone', 'status', 'settings',
];

async function create(userId, data) {
  const slug = slugify(data.name);
  const [result] = await query(
    `INSERT INTO restaurants
      (user_id, name, slug, type, address, city, postal_code, canton, phone, email, website, capacity, description, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'setup')`,
    [
      userId,
      data.name,
      slug,
      data.type || 'restaurant',
      data.address || '',
      data.city || '',
      data.postal_code || '',
      data.canton || '',
      data.phone || '',
      data.email || '',
      data.website || '',
      data.capacity || 0,
      data.description || '',
    ]
  );
  return { id: result.insertId, name: data.name, slug, status: 'setup' };
}

async function listForUser(userId) {
  const [rows] = await query(
    'SELECT * FROM restaurants WHERE user_id = ? ORDER BY created_at DESC',
    [userId]
  );
  return rows;
}

async function getOne(userId, id) {
  const [rows] = await query(
    'SELECT * FROM restaurants WHERE id = ? AND user_id = ?',
    [id, userId]
  );
  if (!rows[0]) throw new HttpError(404, 'Restaurant non trouvé');
  return rows[0];
}

async function update(userId, id, patch) {
  const sets = [];
  const values = [];
  for (const f of UPDATABLE_FIELDS) {
    if (patch[f] !== undefined) {
      sets.push(`\`${f}\` = ?`);
      values.push(f === 'settings' ? JSON.stringify(patch[f]) : patch[f]);
    }
  }
  if (sets.length === 0) {
    throw new HttpError(400, 'Aucune donnée à mettre à jour');
  }
  values.push(id, userId);
  await query(
    `UPDATE restaurants SET ${sets.join(', ')} WHERE id = ? AND user_id = ?`,
    values
  );
  return getOne(userId, id);
}

module.exports = { create, listForUser, getOne, update };
