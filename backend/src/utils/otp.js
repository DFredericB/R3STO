// ═══════════════════════════════════════════════════════════════
//  OTP (One-Time Password) — génération + store en mémoire
//  À migrer vers une table DB (otp_codes) en Round 5+ pour
//  supporter le multi-instance.
// ═══════════════════════════════════════════════════════════════

const { sendMail } = require('./mailer');

const TTL_MS = 5 * 60 * 1000; // 5 minutes
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
  const digits = code.split('').map(d =>
    `<td style="width:44px;height:52px;background:#111e35;border:2px solid #2b5ba0;border-radius:8px;text-align:center;font-family:'DM Mono',Consolas,monospace;font-size:28px;font-weight:700;color:#fff;letter-spacing:0;">${d}</td>`
  ).join('<td style="width:8px;"></td>');

  return `
    <div style="font-family:'DM Sans',Helvetica,Arial,sans-serif;max-width:500px;margin:0 auto;background:#0b1525;border-radius:16px;overflow:hidden;">
      <!-- Header avec logo -->
      <div style="background:linear-gradient(135deg,#0d1d38 0%,#1a3a6e 100%);padding:28px 32px;text-align:center;">
        <img src="https://r3sto.ch/logo-r3sto.jpg" alt="R3STO" width="140" style="display:inline-block;max-width:140px;height:auto;" />
      </div>

      <!-- Corps -->
      <div style="padding:32px 32px 24px;">
        <h2 style="text-align:center;color:#4a8fe7;font-size:20px;font-weight:700;margin:0 0 8px;">Vérification de votre compte</h2>
        <p style="text-align:center;color:#7b94b8;font-size:14px;line-height:1.5;margin:0 0 28px;">Entrez ce code dans l'application pour confirmer votre identité.</p>

        <!-- Code OTP en 6 cases -->
        <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 28px;" role="presentation">
          <tr>${digits}</tr>
        </table>

        <p style="text-align:center;color:#7b94b8;font-size:12px;line-height:1.6;margin:0;">
          Ce code expire dans <strong style="color:#4a8fe7;">5 minutes</strong>.<br>
          Si vous n'avez pas demandé ce code, ignorez cet email.
        </p>
      </div>

      <!-- Footer -->
      <div style="border-top:1px solid #1a2a45;padding:16px 32px;text-align:center;">
        <p style="color:#4a5f80;font-size:11px;margin:0;">© ${new Date().getFullYear()} R3STO — La plateforme de gestion pour restaurateurs</p>
      </div>
    </div>
  `;
}

module.exports = { generate, set, verify, sendOTPEmail };
