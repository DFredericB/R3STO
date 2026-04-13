// ═══════════════════════════════════════════════════════════════
//  Auth — logique métier (DB, hash, JWT)
//  Aucun objet HTTP ici (req/res). Les controllers s'en chargent.
// ═══════════════════════════════════════════════════════════════

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { query } = require('../../config/db');
const { sign } = require('../../utils/jwt');
const { HttpError } = require('../../utils/responses');
const otp = require('../../utils/otp');
const { sendMail } = require('../../utils/mailer');

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

// ═══════════════════════════════════════════════════════════════
//  FORGOT PASSWORD — envoie un email avec lien de réinitialisation
// ═══════════════════════════════════════════════════════════════

async function forgotPassword(email) {
  const user = await findUserByEmail(email);
  // Ne pas révéler si l'email existe ou non (sécurité)
  if (!user || user.status !== 'active') {
    return { sent: true };
  }

  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 heure

  await query(
    'UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?',
    [token, expires, user.id]
  );

  const resetUrl = `https://auth.r3sto.ch?mode=reset&token=${token}`;

  await sendMail({
    to: email,
    subject: 'Réinitialisation de votre mot de passe R3STO',
    html: buildResetHtml(resetUrl, user.name || email),
  });

  return { sent: true };
}

// ═══════════════════════════════════════════════════════════════
//  RESET PASSWORD — vérifie le token et change le mot de passe
// ═══════════════════════════════════════════════════════════════

async function resetPassword(token, newPassword) {
  if (!token || !newPassword || newPassword.length < 8) {
    throw new HttpError(400, 'Token manquant ou mot de passe trop court (min 8 caractères)');
  }

  const [rows] = await query(
    'SELECT * FROM users WHERE reset_token = ? AND reset_token_expires > NOW()',
    [token]
  );
  const user = rows[0];
  if (!user) {
    throw new HttpError(400, 'Lien expiré ou invalide. Faites une nouvelle demande.');
  }

  const hash = await bcrypt.hash(newPassword, 12);
  await query(
    'UPDATE users SET password = ?, reset_token = NULL, reset_token_expires = NULL, updated_at = NOW() WHERE id = ?',
    [hash, user.id]
  );

  return { ok: true, message: 'Mot de passe mis à jour avec succès' };
}

// ═══════════════════════════════════════════════════════════════
//  EMAIL TEMPLATE — réinitialisation mot de passe
// ═══════════════════════════════════════════════════════════════

function buildResetHtml(resetUrl, name) {
  return `
    <div style="font-family:'DM Sans',Helvetica,Arial,sans-serif;max-width:500px;margin:0 auto;background:#0b1525;border-radius:16px;overflow:hidden;">
      <div style="background:linear-gradient(135deg,#0d1d38 0%,#1a3a6e 100%);padding:28px 32px;text-align:center;">
        <img src="https://r3sto.ch/logo-r3sto.jpg" alt="R3STO" width="140" style="display:inline-block;max-width:140px;height:auto;" />
      </div>
      <div style="padding:32px 32px 24px;">
        <h2 style="text-align:center;color:#4a8fe7;font-size:20px;font-weight:700;margin:0 0 8px;">Réinitialisation du mot de passe</h2>
        <p style="text-align:center;color:#7b94b8;font-size:14px;line-height:1.5;margin:0 0 28px;">
          Bonjour ${name},<br>vous avez demandé la réinitialisation de votre mot de passe.
        </p>
        <div style="text-align:center;margin:0 0 28px;">
          <a href="${resetUrl}" style="display:inline-block;padding:14px 32px;background:#4480d8;color:#fff;text-decoration:none;border-radius:10px;font-size:14px;font-weight:700;">
            Réinitialiser mon mot de passe
          </a>
        </div>
        <p style="text-align:center;color:#7b94b8;font-size:12px;line-height:1.6;margin:0;">
          Ce lien expire dans <strong style="color:#4a8fe7;">1 heure</strong>.<br>
          Si vous n'avez pas fait cette demande, ignorez cet email.
        </p>
      </div>
      <div style="border-top:1px solid #1a2a45;padding:16px 32px;text-align:center;">
        <p style="color:#4a5f80;font-size:11px;margin:0;">© ${new Date().getFullYear()} R3STO — La plateforme de gestion pour restaurateurs</p>
      </div>
    </div>
  `;
}

module.exports = { register, login, sendOtp, verifyOtp, getMe, forgotPassword, resetPassword };
