// ══════════════════════════════════════════════════
//  R3STO — Email HTML Templates
//  Templates prêts à l'envoi pour confirmation,
//  rappel 24h, et remerciement post-visite.
//  Utilisés côté backend (server.js) et préview client.
// ══════════════════════════════════════════════════

interface ResaEmailData {
  clientName: string
  date: string         // ex: "Samedi 5 avril 2026"
  time: string         // ex: "19:30"
  covers: number
  restoName: string
  restoAddress?: string
  restoPhone?: string
  restoWeb?: string
  table?: string
  menuDuJour?: string  // texte du menu sélectionné
  cancelLink?: string
  modifyLink?: string
  confirmLink?: string
  reviewLink?: string
  googleReviewUrl?: string  // lien Google Reviews (mode both/google)
  rebookLink?: string
}

// ── Base layout ───────────────────────────────────
function emailLayout(content: string, restoName: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f7;padding:32px 16px">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.06)">
${content}
</table>
<p style="margin:24px 0 0;font-size:11px;color:#94a3b8;text-align:center">
  ${restoName} · Propulsé par <a href="https://r3sto.ch" style="color:#3b82f6;text-decoration:none">R3STO</a>
</p>
</td></tr>
</table>
</body>
</html>`
}

// ── Header band ───────────────────────────────────
function headerBand(emoji: string, title: string, color: string): string {
  return `<tr><td style="background:${color};padding:28px 32px;text-align:center">
  <div style="font-size:32px;margin-bottom:8px">${emoji}</div>
  <div style="font-size:18px;font-weight:800;color:#ffffff;letter-spacing:-.3px">${title}</div>
</td></tr>`
}

// ── Detail row ────────────────────────────────────
function detailRow(label: string, value: string): string {
  return `<tr>
  <td style="padding:8px 0;font-size:13px;color:#64748b;width:100px">${label}</td>
  <td style="padding:8px 0;font-size:14px;font-weight:600;color:#1e293b">${value}</td>
</tr>`
}

// ── CTA button ────────────────────────────────────
function ctaButton(text: string, href: string, color = '#3b82f6'): string {
  return `<a href="${href}" style="display:inline-block;padding:12px 28px;background:${color};color:#ffffff;font-size:14px;font-weight:700;border-radius:8px;text-decoration:none">${text}</a>`
}

// ══════════════════════════════════════════════════
//  1. CONFIRMATION DE RÉSERVATION
// ══════════════════════════════════════════════════
export function confirmationEmail(data: ResaEmailData): string {
  return emailLayout(`
    ${headerBand('✅', 'Réservation confirmée', '#10b981')}
    <tr><td style="padding:28px 32px">
      <p style="font-size:15px;color:#334155;margin:0 0 20px;line-height:1.5">
        Bonjour <strong>${data.clientName}</strong>,<br>
        Votre réservation chez <strong>${data.restoName}</strong> est confirmée.
      </p>
      <table cellpadding="0" cellspacing="0" style="width:100%;background:#f8fafc;border-radius:10px;padding:16px 20px;margin-bottom:20px">
        ${detailRow('📅 Date', data.date)}
        ${detailRow('🕐 Heure', data.time)}
        ${detailRow('👥 Couverts', String(data.covers))}
        ${data.table ? detailRow('🪑 Table', data.table) : ''}
        ${data.menuDuJour ? detailRow('🍽️ Menu', data.menuDuJour) : ''}
      </table>
      ${data.restoAddress ? `<p style="font-size:12px;color:#94a3b8;margin:0 0 20px">📍 ${data.restoAddress}</p>` : ''}
      <div style="text-align:center;margin:24px 0 8px">
        ${data.modifyLink ? ctaButton('Modifier ma réservation', data.modifyLink, '#3b82f6') : ''}
      </div>
      ${data.cancelLink ? `<p style="text-align:center;margin:12px 0 0"><a href="${data.cancelLink}" style="font-size:12px;color:#94a3b8">Annuler ma réservation</a></p>` : ''}
    </td></tr>
  `, data.restoName)
}

// ══════════════════════════════════════════════════
//  2. RAPPEL 24H
// ══════════════════════════════════════════════════
export function reminder24hEmail(data: ResaEmailData): string {
  return emailLayout(`
    ${headerBand('🔔', 'Rappel — Demain !', '#3b82f6')}
    <tr><td style="padding:28px 32px">
      <p style="font-size:15px;color:#334155;margin:0 0 20px;line-height:1.5">
        Bonjour <strong>${data.clientName}</strong>,<br>
        On vous attend <strong>demain</strong> chez <strong>${data.restoName}</strong> !
      </p>
      <table cellpadding="0" cellspacing="0" style="width:100%;background:#eff6ff;border:1.5px solid #bfdbfe;border-radius:10px;padding:16px 20px;margin-bottom:20px">
        ${detailRow('📅 Date', data.date)}
        ${detailRow('🕐 Heure', data.time)}
        ${detailRow('👥 Couverts', String(data.covers))}
        ${data.menuDuJour ? detailRow('🍽️ Menu', data.menuDuJour) : ''}
      </table>
      ${data.restoAddress ? `<p style="font-size:12px;color:#94a3b8;margin:0 0 16px">📍 ${data.restoAddress}</p>` : ''}
      <div style="text-align:center;margin:24px 0 8px">
        ${data.confirmLink ? ctaButton('✓ Je confirme ma venue', data.confirmLink, '#10b981') : ''}
      </div>
      ${data.cancelLink ? `<p style="text-align:center;margin:12px 0 0"><a href="${data.cancelLink}" style="font-size:12px;color:#ef4444">Je dois annuler</a></p>` : ''}
    </td></tr>
  `, data.restoName)
}

// ══════════════════════════════════════════════════
//  3. SMS RAPPEL 24H (texte court)
// ══════════════════════════════════════════════════
export function reminder24hSms(data: ResaEmailData): string {
  return `${data.restoName} — Rappel: Votre table pour ${data.covers} pers. demain ${data.time}. ${data.confirmLink ? `Confirmez: ${data.confirmLink}` : 'À demain !'}`
}

// ══════════════════════════════════════════════════
//  4. REMERCIEMENT POST-VISITE
// ══════════════════════════════════════════════════
export function thanksEmail(data: ResaEmailData): string {
  const hasInternal = !!data.reviewLink
  const hasGoogle = !!data.googleReviewUrl
  return emailLayout(`
    ${headerBand('🙏', 'Merci pour votre visite !', '#8b5cf6')}
    <tr><td style="padding:28px 32px">
      <p style="font-size:15px;color:#334155;margin:0 0 20px;line-height:1.5">
        Bonjour <strong>${data.clientName}</strong>,<br>
        Merci d'être venu chez <strong>${data.restoName}</strong> le ${data.date}. Nous espérons que vous avez passé un excellent moment.
      </p>
      ${(hasInternal || hasGoogle) ? `
      <p style="font-size:14px;color:#334155;margin:0 0 24px;line-height:1.5">
        Votre avis compte beaucoup pour nous. Partagez votre expérience en un clic :
      </p>
      <div style="text-align:center;margin:0 0 24px">
        ${hasInternal ? ctaButton('⭐ Laisser un avis', data.reviewLink!, '#f59e0b') : ''}
        ${(hasInternal && hasGoogle) ? '&nbsp;&nbsp;' : ''}
        ${hasGoogle ? ctaButton('🔍 Avis Google', data.googleReviewUrl!, '#4285f4') : ''}
      </div>` : ''}
      ${data.rebookLink ? `
      <div style="text-align:center;margin:0 0 8px">
        ${ctaButton('Réserver à nouveau', data.rebookLink, '#3b82f6')}
      </div>` : ''}
    </td></tr>
  `, data.restoName)
}

// ══════════════════════════════════════════════════
//  6. RAPPEL AVIS 48H
// ══════════════════════════════════════════════════
export function reviewReminderEmail(data: ResaEmailData): string {
  const hasInternal = !!data.reviewLink
  const hasGoogle = !!data.googleReviewUrl
  return emailLayout(`
    ${headerBand('⭐', 'Votre avis compte !', '#f59e0b')}
    <tr><td style="padding:28px 32px">
      <p style="font-size:15px;color:#334155;margin:0 0 20px;line-height:1.5">
        Bonjour <strong>${data.clientName}</strong>,<br>
        Nous espérons que votre visite chez <strong>${data.restoName}</strong> vous a plu.
        Nous n'avons pas encore reçu votre avis — il nous aide à nous améliorer et prend moins de 30 secondes.
      </p>
      <div style="text-align:center;margin:0 0 24px">
        ${hasInternal ? ctaButton('⭐ Donner mon avis', data.reviewLink!, '#f59e0b') : ''}
        ${(hasInternal && hasGoogle) ? '&nbsp;&nbsp;' : ''}
        ${hasGoogle ? ctaButton('🔍 Avis Google', data.googleReviewUrl!, '#4285f4') : ''}
      </div>
      <p style="font-size:12px;color:#94a3b8;text-align:center;margin:0">
        Vous avez déjà laissé un avis ? Ignorez ce message. Merci !
      </p>
    </td></tr>
  `, data.restoName)
}

// ══════════════════════════════════════════════════
//  7. RAPPEL AVIS SMS (7 jours)
// ══════════════════════════════════════════════════
export function reviewReminderSms(data: ResaEmailData): string {
  const link = data.googleReviewUrl || data.reviewLink || ''
  return `${data.restoName} — Votre avis compte ! 30 sec pour nous aider à nous améliorer. ${link ? link : 'Merci !'}`
}

// ══════════════════════════════════════════════════
//  5. CONFIRMATION SMS (texte court)
// ══════════════════════════════════════════════════
export function confirmationSms(data: ResaEmailData): string {
  return `${data.restoName} — Réservation confirmée: ${data.date} à ${data.time}, ${data.covers} pers. ${data.cancelLink ? `Annuler: ${data.cancelLink}` : 'À bientôt !'}`
}
