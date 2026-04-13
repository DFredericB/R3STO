import { createTransport } from 'nodemailer'

// ════════════════════════════════════════════════════════════════════════════
//  R3STO Mailer — Infomaniak SMTP (noreply@r3sto.ch)
// ════════════════════════════════════════════════════════════════════════════

const transporter = createTransport({
  host: process.env.SMTP_HOST || 'mail.infomaniak.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER || 'noreply@r3sto.ch',
    pass: process.env.SMTP_PASS || ''
  }
})

/**
 * Send an email
 * @param {string} to - Recipient email
 * @param {string} subject - Subject line
 * @param {string} html - HTML body
 */
export async function sendMail(to, subject, html) {
  try {
    await transporter.sendMail({
      from: '"R3STO" <noreply@r3sto.ch>',
      to,
      subject,
      html
    })
    console.log(`[MAIL] Sent to ${to}: ${subject}`)
    return true
  } catch (error) {
    console.error(`[MAIL] Error sending to ${to}:`, error.message)
    return false
  }
}

/**
 * Send password reset email
 * @param {string} email - User email
 * @param {string} token - Reset token
 */
/**
 * Send team invitation email
 * @param {string} email - Recipient email
 * @param {string} name - User's name
 * @param {string} role - User's role
 * @param {string} code - Access code (R3-XXXX)
 */
export async function sendInviteEmail(email, name, role, code) {
  const roleLabels = {
    'proprietaire': 'Propriétaire', 'manager': 'Gérant', 'serveur': 'Serveur',
    'cuisinier': 'Cuisinier', 'barman': 'Barman', 'hote': 'Hôte / Hôtesse'
  }
  const roleLabel = roleLabels[role] || role
  const appUrl = 'https://app.r3sto.ch'

  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#0b1120;color:#e2e8f0;border-radius:12px">
      <div style="text-align:center;margin-bottom:24px">
        <img src="https://r3sto.ch/logo-r3sto.jpg" alt="R3STO" width="48" height="48" style="border-radius:0">
      </div>
      <h2 style="color:#fff;text-align:center;margin-bottom:8px">Bienvenue dans l'équipe !</h2>
      <p style="color:#94a3b8;text-align:center;font-size:14px">Bonjour ${name}, vous avez été ajouté(e) en tant que <strong style="color:#22c55e">${roleLabel}</strong>.</p>
      <div style="background:#1e293b;border-radius:10px;padding:20px;margin:24px 0;text-align:center">
        <div style="color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:.1em;margin-bottom:8px">Votre code d'accès</div>
        <div style="font-size:28px;font-weight:900;color:#22c55e;letter-spacing:.15em;font-family:'DM Mono',monospace">${code}</div>
      </div>
      <div style="color:#94a3b8;font-size:13px;line-height:1.6;margin-bottom:20px">
        <strong style="color:#e2e8f0">Pour vous connecter :</strong><br>
        1. Ouvrez l'app sur votre téléphone<br>
        2. Entrez votre code d'accès ci-dessus<br>
        3. Saisissez votre PIN personnel (communiqué par votre responsable)
      </div>
      <div style="text-align:center;margin:24px 0">
        <a href="${appUrl}" style="display:inline-block;background:#22c55e;color:#fff;text-decoration:none;padding:12px 32px;border-radius:8px;font-weight:600;font-size:15px">Ouvrir R3STO</a>
      </div>
      <hr style="border:none;border-top:1px solid #1e293b;margin:24px 0">
      <p style="color:#475569;font-size:11px;text-align:center">R3STO — Gestion de restaurant intelligente</p>
    </div>
  `
  return sendMail(email, `R3STO — Vous êtes invité(e) en tant que ${roleLabel}`, html)
}

/**
 * Send daily menu email
 * @param {string} email - Recipient
 * @param {string} name - Client name
 * @param {object} menu - { titre, entree, plat, dessert, prix, note }
 * @param {string} restoName - Restaurant name
 */
export async function sendMenuDuJourEmail(email, name, menu, restoName) {
  const bookUrl = `https://booking.r3sto.ch?menu=jour`
  const unsubUrl = `https://api.r3sto.ch/api/marketing/unsub-menu?email=${encodeURIComponent(email)}`

  const courseBlock = (label, text) => text ? `
    <div style="margin-bottom:12px">
      <div style="font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:.1em;margin-bottom:2px">${label}</div>
      <div style="font-size:14px;color:#e2e8f0;${label === 'Plat' ? 'font-weight:600' : 'font-style:italic'}">${text}</div>
    </div>` : ''

  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#0b1120;color:#e2e8f0;border-radius:12px">
      <div style="text-align:center;margin-bottom:20px">
        <img src="https://r3sto.ch/logo-r3sto.jpg" alt="R3STO" width="40" height="40" style="border-radius:0">
      </div>
      <div style="text-align:center;margin-bottom:4px;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.12em">${restoName || 'Votre restaurant'}</div>
      <h2 style="color:#fff;text-align:center;margin:0 0 20px;font-size:18px">${menu.titre || 'Menu du jour'}</h2>
      <div style="background:#1e293b;border-radius:10px;padding:18px;margin-bottom:16px">
        ${courseBlock('Entrée', menu.entree)}
        ${courseBlock('Plat', menu.plat)}
        ${courseBlock('Dessert', menu.dessert)}
      </div>
      ${menu.prix ? `<div style="text-align:center;font-size:22px;font-weight:900;color:#22c55e;margin-bottom:16px">${menu.prix} CHF</div>` : ''}
      ${menu.note ? `<div style="text-align:center;font-size:12px;color:#94a3b8;margin-bottom:16px;font-style:italic">${menu.note}</div>` : ''}
      <div style="text-align:center;margin-bottom:20px">
        <a href="${bookUrl}" style="display:inline-block;background:#22c55e;color:#fff;text-decoration:none;padding:12px 32px;border-radius:8px;font-weight:600;font-size:14px">Réserver pour le menu du jour</a>
      </div>
      <hr style="border:none;border-top:1px solid #1e293b;margin:20px 0">
      <div style="text-align:center">
        <a href="${unsubUrl}" style="font-size:10px;color:#475569;text-decoration:underline">Se désabonner du menu du jour</a>
      </div>
    </div>
  `
  return sendMail(email, `${restoName || 'R3STO'} — ${menu.titre || 'Menu du jour'}`, html)
}

export async function sendResetEmail(email, token) {
  const resetUrl = `https://auth.r3sto.ch?reset=${encodeURIComponent(token)}`
  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#0b1120;color:#e2e8f0;border-radius:12px">
      <div style="text-align:center;margin-bottom:24px">
        <img src="https://r3sto.ch/logo-r3sto.jpg" alt="R3STO" width="48" height="48" style="border-radius:0">
      </div>
      <h2 style="color:#fff;text-align:center;margin-bottom:8px">Réinitialisation du mot de passe</h2>
      <p style="color:#94a3b8;text-align:center;font-size:14px">Vous avez demandé à réinitialiser votre mot de passe R3STO.</p>
      <div style="text-align:center;margin:24px 0">
        <a href="${resetUrl}" style="display:inline-block;background:#22c55e;color:#fff;text-decoration:none;padding:12px 32px;border-radius:8px;font-weight:600;font-size:15px">Réinitialiser mon mot de passe</a>
      </div>
      <p style="color:#64748b;font-size:12px;text-align:center">Ce lien expire dans 1 heure. Si vous n'avez pas fait cette demande, ignorez cet email.</p>
      <hr style="border:none;border-top:1px solid #1e293b;margin:24px 0">
      <p style="color:#475569;font-size:11px;text-align:center">R3STO — Gestion de restaurant intelligente</p>
    </div>
  `
  return sendMail(email, 'R3STO — Réinitialisation du mot de passe', html)
}
