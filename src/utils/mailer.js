// ═══════════════════════════════════════════════════════════════
//  Mailer SMTP Infomaniak — singleton réutilisable
// ═══════════════════════════════════════════════════════════════

const nodemailer = require('nodemailer');
const { config } = require('../config');

let transport = null;

function getTransport() {
  if (transport) return transport;
  transport = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.port === 465,
    auth: {
      user: config.smtp.user,
      pass: config.smtp.password,
    },
  });
  return transport;
}

async function sendMail({ to, subject, html, text }) {
  try {
    const info = await getTransport().sendMail({
      from: config.smtp.from,
      to,
      subject,
      html,
      text,
    });
    console.log(`[mailer] Mail envoyé à ${to} (${info.messageId})`);
    return { ok: true, messageId: info.messageId };
  } catch (err) {
    console.error(`[mailer] Erreur envoi à ${to}:`, err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = { sendMail, getTransport };
