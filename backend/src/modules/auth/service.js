// ═══════════════════════════════════════════════════════════════
//  Auth — logique métier (DB, hash, JWT)
//  Aucun objet HTTP ici (req/res). Les controllers s'en chargent.
// ═══════════════════════════════════════════════════════════════

const bcrypt = require('bcryptjs');
const { query } = require('../../config/db');
const { sign } = require('../../utils/jwt');
const { HttpError } = require('../../utils/responses');
const otp = require('../../utils/otp');

function slugify(str) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

async function findUserByEmail(email) {
  const [rows] = await query('SELECT * FROM users WHERE email = ?', [email.toLowerCase()]);
  return rows[0] || null;
}

async function register(payload) {
  const { email, password, name, firstName, lastName, phone, restaurantName, plan, address } = payload;

  const existing = await findUserByEmail(email);
  if (existing) {
    throw new HttpError(409, 'Cet email est déjà utilisé');
  }

  const fullName =
    firstName && lastName ? `${firstName} ${lastName}`.trim() : name || '';
  const userPlan = plan || 'free';
  const hash = await bcrypt.hash(password, 12);

  const [result] = await query(
    'INSERT INTO users (email, `password`, name, phone, role, plan, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [email.toLowerCase(), hash, fullName, phone || '', 'owner', userPlan, 'active']
  );

  const userId = result.insertId;
  const token = sign({ id: userId, email: email.toLowerCase(), role: 'owner', plan: userPlan });

  // Restaurant auto-créé si fourni
  let restaurantId = null;
  if (restaurantName) {
    const slug = slugify(restaurantName);
    const [r] = await query(
      'INSERT INTO restaurants (user_id, name, slug, address, status) VALUES (?, ?, ?, ?, ?)',
      [userId, restaurantName, slug, address || '', 'setup']
    );
    restaurantId = r.insertId;
  }

  return {
    token,
    user: { id: userId, email: email.toLowerCase(), name: fullName, role: 'owner', plan: userPlan },
    restaurantId,
  };
}

async function login(email, password, meta = {}) {
  const user = await findUserByEmail(email);
  if (!user || user.status !== 'active') {
    throw new HttpError(401, 'Email ou mot de passe incorrect');
  }
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    throw new HttpError(401, 'Email ou mot de passe incorrect');
  }

  const token = sign({ id: user.id, email: user.email, role: user.role, plan: user.plan });

  // Maj last_login + log session (best-effort)
  try {
    await query('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);
    const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await query(
      'INSERT INTO sessions (user_id, token, ip, user_agent, expires_at) VALUES (?, ?, ?, ?, ?)',
      [user.id, token, meta.ip || '', meta.userAgent || '', expires]
    );
  } catch (err) {
    console.warn('[auth] session log failed:', err.message);
  }

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      plan: user.plan,
      phone: user.phone,
    },
  };
}

async function sendOtp(email) {
  const code = otp.generate();
  otp.set(email, code);
  const result = await otp.sendOTPEmail(email, code);
  return { sent: result.ok, method: 'email' };
}

async function verifyOtp(email, code) {
  const result = otp.verify(email, code);
  if (!result.valid) {
    return { verified: false, message: result.reason };
  }
  await query('UPDATE users SET email_verified = 1 WHERE email = ?', [email.toLowerCase()]);

  const user = await findUserByEmail(email);
  if (!user) return { verified: true };

  const token = sign({ id: user.id, email: user.email, role: user.role, plan: user.plan });
  return { verified: true, token, user: { id: user.id, email: user.email, role: user.role, plan: user.plan } };
}

async function getMe(userId) {
  const [rows] = await query(
    'SELECT id, email, name, phone, role, plan, status, created_at, last_login FROM users WHERE id = ?',
    [userId]
  );
  if (!rows[0]) throw new HttpError(404, 'Utilisateur non trouvé');
  return rows[0];
}

module.exports = { register, login, sendOtp, verifyOtp, getMe };
