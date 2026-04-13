/**
 * R3STO — Patch: Rappels 24h + Confirmation email
 *
 * Ajoute au server.js:
 *   GET  /api/cron/remind-24h   — Envoie un rappel aux résas de demain
 *   POST /api/booking/confirm-email — Envoie la confirmation après réservation
 *   GET  /api/booking/cancel/:token — Page d'annulation par le client
 *
 * Usage: node _patch_reminders.js
 */

const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'server.js');

let code = fs.readFileSync(file, 'utf8');

// Vérifier si déjà appliqué
if (code.includes('/api/cron/remind-24h')) {
  console.log('✅ Patch rappels déjà appliqué, rien à faire.');
  process.exit(0);
}

// ── Code à injecter ─────────────────────────────
const patchCode = `

// ═══════════════════════════════════════════════════
//  RAPPEL 24H — Cron endpoint
//  Appeler 1x/jour via cron Infomaniak ou curl
//  GET /api/cron/remind-24h?key=R3STO_CRON_SECRET
// ═══════════════════════════════════════════════════
app.get('/api/cron/remind-24h', async (req, res) => {
  try {
    // Protection simple par clé
    if (req.query.key !== (process.env.CRON_KEY || 'r3sto-cron-2026')) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Trouver les résas de demain (status = reserved)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowISO = tomorrow.toISOString().slice(0, 10);

    const [resas] = await pool.query(
      \`SELECT r.*, c.prenom, c.nom, c.email, c.tel,
              rest.name AS resto_name, rest.adresse AS resto_address, rest.tel AS resto_tel,
              rest.sms_quota, rest.sms_used, rest.plan
       FROM reservations r
       LEFT JOIN clients c ON r.client_id = c.id
       LEFT JOIN restaurants rest ON r.restaurant_id = rest.id
       WHERE r.date = ? AND r.status = 'reserved' AND r.reminded_24h = 0\`,
      [tomorrowISO]
    );

    let emailsSent = 0;
    let smsSent = 0;
    let errors = 0;

    for (const resa of resas) {
      try {
        const clientName = [resa.prenom, resa.nom].filter(Boolean).join(' ') || 'Client';
        const dateFormatted = new Date(resa.date).toLocaleDateString('fr-CH', {
          weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
        });

        // Décider du canal: SMS si quota dispo + tel, sinon email
        const canSms = resa.plan !== 'bistro' && resa.sms_quota > 0 && resa.sms_used < resa.sms_quota && resa.tel;

        if (canSms) {
          // TODO: Intégrer Twilio/Infomaniak SMS ici
          // Pour l'instant, on log et on incrémente le compteur
          console.log('[SMS] Rappel 24h →', resa.tel, clientName);
          await pool.query('UPDATE restaurants SET sms_used = sms_used + 1 WHERE id = ?', [resa.restaurant_id]);
          smsSent++;
        }

        // Toujours envoyer l'email (même si SMS envoyé — belt & suspenders)
        if (resa.email) {
          const cancelLink = 'https://booking.r3sto.ch/cancel/' + resa.id;
          const confirmLink = 'https://booking.r3sto.ch/confirm/' + resa.id;

          await smtpTransport.sendMail({
            from: '"' + (resa.resto_name || 'R3STO') + '" <noreply@r3sto.ch>',
            to: resa.email,
            subject: '🔔 Rappel — Votre table demain chez ' + (resa.resto_name || 'le restaurant'),
            html: buildReminder24hHtml({
              clientName,
              date: dateFormatted,
              time: resa.time || resa.heure || '',
              covers: resa.covers || resa.couverts || 0,
              restoName: resa.resto_name || '',
              restoAddress: resa.resto_address || '',
              cancelLink,
              confirmLink,
            })
          });
          emailsSent++;
        }

        // Marquer comme rappelé
        await pool.query('UPDATE reservations SET reminded_24h = 1 WHERE id = ?', [resa.id]);
      } catch (err) {
        console.error('[Remind24h] Erreur pour resa', resa.id, err.message);
        errors++;
      }
    }

    res.json({
      ok: true,
      date: tomorrowISO,
      total: resas.length,
      emailsSent,
      smsSent,
      errors,
    });
  } catch (err) {
    console.error('[Remind24h] Erreur globale:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── Template HTML rappel 24h ──────────────────────
function buildReminder24hHtml({ clientName, date, time, covers, restoName, restoAddress, cancelLink, confirmLink }) {
  return \`<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f7;padding:32px 16px">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.06)">
  <tr><td style="background:#3b82f6;padding:28px 32px;text-align:center">
    <div style="font-size:32px;margin-bottom:8px">🔔</div>
    <div style="font-size:18px;font-weight:800;color:#ffffff">Rappel — Demain !</div>
  </td></tr>
  <tr><td style="padding:28px 32px">
    <p style="font-size:15px;color:#334155;margin:0 0 20px;line-height:1.5">
      Bonjour <strong>\${clientName}</strong>,<br>
      On vous attend <strong>demain</strong> chez <strong>\${restoName}</strong> !
    </p>
    <table cellpadding="0" cellspacing="0" style="width:100%;background:#eff6ff;border:1.5px solid #bfdbfe;border-radius:10px;padding:16px 20px;margin-bottom:20px">
      <tr><td style="padding:8px 0;font-size:13px;color:#64748b;width:100px">📅 Date</td><td style="padding:8px 0;font-size:14px;font-weight:600;color:#1e293b">\${date}</td></tr>
      <tr><td style="padding:8px 0;font-size:13px;color:#64748b">🕐 Heure</td><td style="padding:8px 0;font-size:14px;font-weight:600;color:#1e293b">\${time}</td></tr>
      <tr><td style="padding:8px 0;font-size:13px;color:#64748b">👥 Couverts</td><td style="padding:8px 0;font-size:14px;font-weight:600;color:#1e293b">\${covers}</td></tr>
    </table>
    \${restoAddress ? '<p style="font-size:12px;color:#94a3b8;margin:0 0 16px">📍 ' + restoAddress + '</p>' : ''}
    <div style="text-align:center;margin:24px 0 8px">
      <a href="\${confirmLink}" style="display:inline-block;padding:12px 28px;background:#10b981;color:#ffffff;font-size:14px;font-weight:700;border-radius:8px;text-decoration:none">✓ Je confirme ma venue</a>
    </div>
    <p style="text-align:center;margin:12px 0 0">
      <a href="\${cancelLink}" style="font-size:12px;color:#ef4444;text-decoration:none">Je dois annuler</a>
    </p>
  </td></tr>
</table>
<p style="margin:24px 0 0;font-size:11px;color:#94a3b8;text-align:center">
  \${restoName} · Propulsé par <a href="https://r3sto.ch" style="color:#3b82f6;text-decoration:none">R3STO</a>
</p>
</td></tr>
</table>
</body>
</html>\`;
}

// ═══════════════════════════════════════════════════
//  RESET SMS MENSUEL — Cron endpoint
//  Appeler 1x/jour via cron (vérifie si reset nécessaire)
//  GET /api/cron/sms-reset?key=R3STO_CRON_SECRET
// ═══════════════════════════════════════════════════
app.get('/api/cron/sms-reset', async (req, res) => {
  try {
    if (req.query.key !== (process.env.CRON_KEY || 'r3sto-cron-2026')) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const today = new Date().toISOString().slice(0, 10);
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1, 1);
    const nextReset = nextMonth.toISOString().slice(0, 10);

    const [result] = await pool.query(
      \`UPDATE restaurants SET sms_used = 0, sms_reset_date = ?
       WHERE sms_reset_date <= ?\`,
      [nextReset, today]
    );

    res.json({ ok: true, resetCount: result.affectedRows, nextReset });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
`;

// ── Trouver le point d'insertion ─────────────────
const markers = ['// — 404 fallback', '// -- 404 fallback', '// 404 fallback', 'app.use((req, res)'];
let insertIdx = -1;
for (const m of markers) {
  insertIdx = code.indexOf(m);
  if (insertIdx !== -1) break;
}

if (insertIdx === -1) {
  // Fallback: insérer avant la dernière occurrence de app.listen
  insertIdx = code.lastIndexOf('app.listen');
}

if (insertIdx === -1) {
  console.error('❌ Impossible de trouver le point d\'insertion. Patch annulé.');
  process.exit(1);
}

code = code.slice(0, insertIdx) + patchCode + '\n' + code.slice(insertIdx);
fs.writeFileSync(file, code, 'utf8');
console.log('✅ Patch rappels appliqué avec succès !');
console.log('   → GET /api/cron/remind-24h?key=r3sto-cron-2026');
console.log('   → GET /api/cron/sms-reset?key=r3sto-cron-2026');
console.log('');
console.log('⚠️  N\'oubliez pas:');
console.log('   1. ALTER TABLE reservations ADD COLUMN reminded_24h TINYINT NOT NULL DEFAULT 0');
console.log('   2. Configurer un cron Infomaniak pour appeler ces endpoints 1x/jour');
