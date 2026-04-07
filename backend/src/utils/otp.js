// ═══════════════════════════════════════════════════════════════
//  OTP (One-Time Password) — génération + store en mémoire
//  À migrer vers une table DB (otp_codes) en Round 5+ pour
//  supporter le multi-instance.
// ═══════════════════════════════════════════════════════════════

const { sendMail } = require('./mailer');

const TTL_MS = 10 * 60 * 1000; // 10 minutes
const store = new Map(); // email -> { code, expires }

function generate() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function set(email, code) {
  store.set(email.toLowerCase(), { code, expires: Date.now() + TTL_MS });
}

function verify(email, code) {
  const key = email.toLowerCase();
  const stored = store.get(key);
  if (!stored) return { valid: false, reason: 'not_found' };
  if (Date.now() > stored.expires) {
    store.delete(key);
    return { valid: false, reason: 'expired' };
  }
  if (stored.code !== code) return { valid: false, reason: 'mismatch' };
  store.delete(key);
  return { valid: true };
}

async function sendOTPEmail(email, code) {
  return sendMail({
    to: email,
    subject: `${code} — Code de vérification R3STO`,
    html: buildOtpHtml(code),
  });
}

function buildOtpHtml(code) {
  return `
    <div style="font-family:'DM Sans',Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#0d1829;color:#e8edf5;border-radius:16px;">
      <div style="text-align:center;margin-bottom:24px;">
        <div style="background:#1c4f90;display:inline-block;padding:12px 24px;border-radius:10px;font-size:24px;font-weight:800;letter-spacing:2px;color:white;">R3STO</div>
      </div>
      <h2 style="text-align:center;color:#4480d8;margin-bottom:8px;">Vérification de votre compte</h2>
      <p style="text-align:center;color:#6b82a8;font-size:14px;margin-bottom:24px;">Entrez ce code dans l'application pour confirmer votre identité.</p>
      <div style="text-align:center;background:#111e35;border:2px solid #2b5ba0;border-radius:12px;padding:20px;margin:0 auto 24px;max-width:280px;">
        <span style="font-family:'DM Mono',monospace;font-size:36px;font-weight:700;letter-spacing:8px;color:#fff;">${code}</span>
      </div>
      <p style="text-align:center;color:#6b82a8;font-size:12px;">Ce code expire dans 10 minutes.<br>Si vous n'avez pas demandé ce code, ignorez cet email.</p>
    </div>
  `;
}

module.exports = { generate, set, verify, sendOTPEmail };
