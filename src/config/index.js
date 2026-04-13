// ═══════════════════════════════════════════════════════════════
//  Configuration globale — lit process.env et expose un objet figé
//  Toute lecture de variable d'environnement DOIT passer par ici.
// ═══════════════════════════════════════════════════════════════

const pkg = require('../../package.json');

function required(name, fallback) {
  const v = process.env[name];
  if (v === undefined || v === '') {
    if (fallback !== undefined) return fallback;
    console.warn(`[config] Variable d'environnement manquante: ${name}`);
    return '';
  }
  return v;
}

function list(name, fallback = []) {
  const v = process.env[name];
  if (!v) return fallback;
  return v.split(',').map((s) => s.trim()).filter(Boolean);
}

const config = Object.freeze({
  env: required('NODE_ENV', 'development'),
  port: parseInt(required('PORT', '8080'), 10),
  version: pkg.version,

  db: {
    host: required('DB_HOST', 'pl7wy9.myd.infomaniak.com'),
    port: parseInt(required('DB_PORT', '3306'), 10),
    user: required('DB_USER', 'pl7wy9_R3STO'),
    password: required('DB_PASSWORD', ''),
    database: required('DB_NAME', 'pl7wy9_R3STO'),
  },

  jwt: {
    secret: required('JWT_SECRET', 'change-me-in-production'),
    expiresIn: required('JWT_EXPIRES', '30d'),
  },

  setupKey: required('SETUP_KEY', ''),

  cors: {
    origins: list('CORS_ORIGINS', [
      'https://r3sto.ch',
      'https://www.r3sto.ch',
      'https://app.r3sto.ch',
      'https://admin.r3sto.ch',
      'https://demo.r3sto.ch',
      'https://booking.r3sto.ch',
      'https://auth.r3sto.ch',
    ]),
  },

  smtp: {
    host: required('SMTP_HOST', 'mail.infomaniak.com'),
    port: parseInt(required('SMTP_PORT', '587'), 10),
    user: required('SMTP_USER', 'noreply@r3sto.ch'),
    password: required('SMTP_PASSWORD', ''),
    from: required('SMTP_FROM', '"R3STO" <noreply@r3sto.ch>'),
  },

  stripe: {
    secretKey: required('STRIPE_SECRET_KEY', ''),
    webhookSecret: required('STRIPE_WEBHOOK_SECRET', ''),
  },

  superadmin: {
    email: required('SUPERADMIN_EMAIL', 'didier@r3sto.com'),
    password: required('SUPERADMIN_PASSWORD', ''),
    name: required('SUPERADMIN_NAME', 'Didier'),
  },
});

module.exports = { config };
