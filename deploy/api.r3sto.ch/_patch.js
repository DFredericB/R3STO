#!/usr/bin/env node
// R3STO API Patch — Ajoute les routes invite + marketing menu du jour
// Usage: node _patch.js (depuis ~/sites/api.r3sto.ch)

const fs = require('fs');

let code = fs.readFileSync('server.js', 'utf8');

// Vérifier que le patch n'a pas déjà été appliqué
if (code.includes('/api/auth/invite')) {
  console.log('⚠️  Patch déjà appliqué (route /api/auth/invite existe déjà)');
  process.exit(0);
}

const PATCH = `
// ════════════════════════════════════════════════════════════════════════════
//  INVITE EMAIL HELPER
// ════════════════════════════════════════════════════════════════════════════

async function sendInviteEmail(email, name, role, code) {
  const roleLabels = { 'proprietaire':'Propriétaire','manager':'Gérant','serveur':'Serveur','cuisinier':'Cuisinier','barman':'Barman','hote':'Hôte / Hôtesse' };
  const roleLabel = roleLabels[role] || role;
  const appUrl = 'https://app.r3sto.ch';
  try {
    await smtpTransport.sendMail({
      from: '"R3STO" <noreply@r3sto.ch>',
      to: email,
      subject: 'R3STO — Vous êtes invité(e) en tant que ' + roleLabel,
      html: '<div style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#0b1120;color:#e2e8f0;border-radius:12px">'
        + '<div style="text-align:center;margin-bottom:24px"><img src="https://r3sto.ch/logo-r3sto.jpg" alt="R3STO" width="48" height="48" style="border-radius:0"></div>'
        + '<h2 style="color:#fff;text-align:center;margin-bottom:8px">Bienvenue dans l\\'équipe !</h2>'
        + '<p style="color:#94a3b8;text-align:center;font-size:14px">Bonjour ' + name + ', vous avez été ajouté(e) en tant que <strong style="color:#22c55e">' + roleLabel + '</strong>.</p>'
        + '<div style="background:#1e293b;border-radius:10px;padding:20px;margin:24px 0;text-align:center">'
        + '<div style="color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:.1em;margin-bottom:8px">Votre code d\\'accès</div>'
        + '<div style="font-size:28px;font-weight:900;color:#22c55e;letter-spacing:.15em">' + code + '</div>'
        + '</div>'
        + '<div style="color:#94a3b8;font-size:13px;line-height:1.6;margin-bottom:20px">'
        + '<strong style="color:#e2e8f0">Pour vous connecter :</strong><br>'
        + '1. Ouvrez l\\'app sur votre téléphone<br>'
        + '2. Entrez votre code d\\'accès ci-dessus<br>'
        + '3. Saisissez votre PIN personnel (communiqué par votre responsable)</div>'
        + '<div style="text-align:center;margin:24px 0"><a href="' + appUrl + '" style="display:inline-block;background:#22c55e;color:#fff;text-decoration:none;padding:12px 32px;border-radius:8px;font-weight:600;font-size:15px">Ouvrir R3STO</a></div>'
        + '<hr style="border:none;border-top:1px solid #1e293b;margin:24px 0">'
        + '<p style="color:#475569;font-size:11px;text-align:center">R3STO — Gestion de restaurant intelligente</p></div>'
    });
    console.log('[MAIL] Invite sent to ' + email);
    return true;
  } catch(e) { console.error('[MAIL] Invite error:', e.message); return false; }
}

// ════════════════════════════════════════════════════════════════════════════
//  MENU DU JOUR EMAIL HELPER
// ════════════════════════════════════════════════════════════════════════════

async function sendMenuDuJourEmail(email, name, menu, restoName) {
  var bookUrl = 'https://booking.r3sto.ch?menu=jour';
  var unsubUrl = 'https://api.r3sto.ch/api/marketing/unsub-menu?email=' + encodeURIComponent(email);
  function courseBlock(label, text) {
    if (!text) return '';
    return '<div style="margin-bottom:12px"><div style="font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:.1em;margin-bottom:2px">' + label + '</div>'
      + '<div style="font-size:14px;color:#e2e8f0;' + (label === 'Plat' ? 'font-weight:600' : 'font-style:italic') + '">' + text + '</div></div>';
  }
  try {
    await smtpTransport.sendMail({
      from: '"R3STO" <noreply@r3sto.ch>',
      to: email,
      subject: (restoName || 'R3STO') + ' — ' + (menu.titre || 'Menu du jour'),
      html: '<div style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#0b1120;color:#e2e8f0;border-radius:12px">'
        + '<div style="text-align:center;margin-bottom:20px"><img src="https://r3sto.ch/logo-r3sto.jpg" alt="R3STO" width="40" height="40" style="border-radius:0"></div>'
        + '<div style="text-align:center;margin-bottom:4px;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.12em">' + (restoName || 'Votre restaurant') + '</div>'
        + '<h2 style="color:#fff;text-align:center;margin:0 0 20px;font-size:18px">' + (menu.titre || 'Menu du jour') + '</h2>'
        + '<div style="background:#1e293b;border-radius:10px;padding:18px;margin-bottom:16px">'
        + courseBlock('Entrée', menu.entree) + courseBlock('Plat', menu.plat) + courseBlock('Dessert', menu.dessert)
        + '</div>'
        + (menu.prix ? '<div style="text-align:center;font-size:22px;font-weight:900;color:#22c55e;margin-bottom:16px">' + menu.prix + ' CHF</div>' : '')
        + (menu.note ? '<div style="text-align:center;font-size:12px;color:#94a3b8;margin-bottom:16px;font-style:italic">' + menu.note + '</div>' : '')
        + '<div style="text-align:center;margin-bottom:20px"><a href="' + bookUrl + '" style="display:inline-block;background:#22c55e;color:#fff;text-decoration:none;padding:12px 32px;border-radius:8px;font-weight:600;font-size:14px">Réserver pour le menu du jour</a></div>'
        + '<hr style="border:none;border-top:1px solid #1e293b;margin:20px 0">'
        + '<div style="text-align:center"><a href="' + unsubUrl + '" style="font-size:10px;color:#475569;text-decoration:underline">Se désabonner du menu du jour</a></div></div>'
    });
    console.log('[MAIL] Menu du jour sent to ' + email);
    return true;
  } catch(e) { console.error('[MAIL] Menu error:', e.message); return false; }
}

// ════════════════════════════════════════════════════════════════════════════
//  POST /api/auth/invite — Send team invitation email
// ════════════════════════════════════════════════════════════════════════════

app.post('/api/auth/invite', async (req, res) => {
  try {
    const { name, email, role, code } = req.body;
    if (!email || !name || !code) {
      return res.status(400).json({ message: 'Name, email and code required' });
    }
    const sent = await sendInviteEmail(email, name, role || 'serveur', code);
    if (sent) {
      res.json({ sent: true });
    } else {
      res.status(500).json({ message: 'Email send failed' });
    }
  } catch (error) {
    console.error('[INVITE]', error);
    res.status(500).json({ message: 'Invite failed' });
  }
});

// ════════════════════════════════════════════════════════════════════════════
//  POST /api/marketing/menu-du-jour — Send daily menu to subscribers
// ════════════════════════════════════════════════════════════════════════════

app.post('/api/marketing/menu-du-jour', async (req, res) => {
  try {
    const { titre, entree, plat, dessert, prix, note, restoName } = req.body;
    if (!plat) {
      return res.status(400).json({ message: 'Le plat est requis' });
    }
    const [subscribers] = await pool.query(
      "SELECT id, nom, prenom, email FROM clients WHERE menuDuJourOptin = 1 AND email IS NOT NULL AND email != ''"
    );
    if (!subscribers || subscribers.length === 0) {
      return res.json({ sent: 0, message: 'Aucun abonné' });
    }
    const menu = { titre, entree, plat, dessert, prix, note };
    let sent = 0;
    for (const client of subscribers) {
      const cname = ((client.prenom || '') + ' ' + (client.nom || '')).trim() || 'Client';
      const ok = await sendMenuDuJourEmail(client.email, cname, menu, restoName);
      if (ok) sent++;
    }
    console.log('[MENU DU JOUR] Sent to ' + sent + '/' + subscribers.length + ' subscribers');
    res.json({ sent: sent, total: subscribers.length });
  } catch (error) {
    console.error('[MENU_DU_JOUR]', error);
    res.status(500).json({ message: 'Send failed' });
  }
});

// ════════════════════════════════════════════════════════════════════════════
//  GET /api/marketing/unsub-menu — Unsubscribe from daily menu
// ════════════════════════════════════════════════════════════════════════════

app.get('/api/marketing/unsub-menu', async (req, res) => {
  try {
    const email = req.query.email;
    if (!email) return res.status(400).send('Email requis');
    await pool.query('UPDATE clients SET menuDuJourOptin = 0 WHERE email = ?', [email]);
    res.send('<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Désabonnement</title>'
      + '<style>body{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#0b1120;color:#e2e8f0}'
      + '.card{text-align:center;padding:40px;max-width:400px}</style></head><body><div class="card">'
      + '<div style="font-size:48px;margin-bottom:16px">✅</div>'
      + '<h2 style="margin:0 0 8px">Désabonnement confirmé</h2>'
      + '<p style="color:#94a3b8;font-size:14px">Vous ne recevrez plus le menu du jour par email.</p>'
      + '<p style="color:#64748b;font-size:12px;margin-top:20px">Vous pouvez vous réabonner à tout moment lors de votre prochaine réservation.</p>'
      + '</div></body></html>');
  } catch (error) {
    console.error('[UNSUB_MENU]', error);
    res.status(500).send('Erreur');
  }
});

`;

// Trouver le point d'insertion (avant le 404 fallback)
const marker = '// \u2014 404 fallback';
const marker2 = '// — 404 fallback';  // en-dash variant
const marker3 = '// -- 404 fallback';

let insertPoint = code.indexOf(marker);
if (insertPoint === -1) insertPoint = code.indexOf(marker2);
if (insertPoint === -1) insertPoint = code.indexOf(marker3);

if (insertPoint === -1) {
  // Fallback: chercher app.use((req, res) => { res.status(404)
  insertPoint = code.indexOf('res.status(404)');
  if (insertPoint !== -1) {
    // Remonter au début de la ligne app.use
    insertPoint = code.lastIndexOf('app.use', insertPoint);
  }
}

if (insertPoint === -1) {
  console.error('❌ Impossible de trouver le point d\'insertion (404 handler)');
  console.log('   Ajoutez manuellement le contenu de _patch_content.js avant le 404 handler');
  fs.writeFileSync('_patch_content.js', PATCH);
  process.exit(1);
}

// Insérer le patch
const patched = code.slice(0, insertPoint) + PATCH + '\n' + code.slice(insertPoint);
fs.writeFileSync('server.js', patched);
console.log('✅ Patch appliqué avec succès !');
console.log('   - sendInviteEmail()');
console.log('   - sendMenuDuJourEmail()');
console.log('   - POST /api/auth/invite');
console.log('   - POST /api/marketing/menu-du-jour');
console.log('   - GET /api/marketing/unsub-menu');
console.log('');
console.log('⚠️  N\'oublie pas d\'ajouter les colonnes à la table clients :');
console.log('   ALTER TABLE clients ADD COLUMN dateNaissance VARCHAR(10) DEFAULT NULL;');
console.log('   ALTER TABLE clients ADD COLUMN menuDuJourOptin TINYINT(1) DEFAULT 0;');
console.log('');
console.log('🔄 Redémarre le serveur via le Node.js Builder d\'Infomaniak');
