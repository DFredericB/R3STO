/**
 * R3STO Booking Worker — Cloudflare Worker
 *
 * Reçoit un POST /booking depuis le modal de résa sur r3sto.com,
 * envoie 2 emails via Postmark :
 *   1. Au client (confirmation)
 *   2. Au restaurant (notification nouvelle résa)
 *
 * Variables d'environnement (Cloudflare → Settings → Variables) :
 *   POSTMARK_TOKEN       — Server API token Postmark
 *   FROM_EMAIL           — Adresse expéditeur (ex: noreply@r3sto.com — doit être vérifiée)
 *   ADMIN_EMAIL          — Fallback si le resto n'a pas d'email connu (ex: contact@r3sto.com)
 *   ALLOWED_ORIGINS      — Liste CSV des origines autorisées (ex: https://r3sto.com,https://www.r3sto.com)
 *
 * Déploiement :
 *   npm install
 *   wrangler login
 *   wrangler secret put POSTMARK_TOKEN
 *   wrangler secret put FROM_EMAIL
 *   wrangler secret put ADMIN_EMAIL
 *   wrangler deploy
 *
 * Endpoint final : https://r3sto-booking.<your-account>.workers.dev
 * (ou bind un sous-domaine custom comme https://api.r3sto.com/booking)
 */

// ============================================================
// Base de données minimale des restos (à terme remplacée par Supabase)
// On stocke email + nom + adresse — sert à router le mail au bon resto
// ============================================================
const RESTOS = {
  'chez-bunnys':              { name: "Chez Bunny's",                      email: 'contact@chez-bunnys.ch',         city: 'Le Mont-sur-Lausanne' },
  'le-populaire':             { name: 'Le Populaire',                       email: null,                              city: 'Lausanne' },
  'la-pinte-crissier':        { name: 'La Pinte',                           email: null,                              city: 'Crissier' },
  'hotel-de-ville-crissier':  { name: "Restaurant de l'Hôtel de Ville",     email: null,                              city: 'Crissier' },
  'denis-martin':             { name: 'Denis Martin',                       email: null,                              city: 'Vevey' },
  'anne-sophie-pic-beau-rivage': { name: 'Anne-Sophie Pic au Beau-Rivage',  email: null,                              city: 'Lausanne' },
  'ecco-ascona':              { name: 'Ecco Ascona',                        email: null,                              city: 'Ascona' },
  'le-pont-de-brent':         { name: 'Le Pont de Brent',                   email: null,                              city: 'Brent' },
  'le-petit-boeuf':           { name: 'Le Petit Bœuf',                      email: null,                              city: 'Lausanne' },
  'sakura':                   { name: 'Sakura',                             email: null,                              city: 'Zürich' },
  'pizza-napoli':             { name: 'Pizza Napoli',                       email: null,                              city: 'Berne' }
  // … à enrichir au fur et à mesure qu'on récupère les vrais emails restos
};

// ============================================================
// HTTP handler
// ============================================================
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === 'OPTIONS') return corsResponse(request, env);

    // Health
    if (url.pathname === '/' || url.pathname === '/health') {
      return jsonResponse({ ok: true, service: 'r3sto-booking', version: '1.0.0' }, request, env);
    }

    // Endpoint principal
    if (url.pathname === '/booking' && request.method === 'POST') {
      return await handleBooking(request, env);
    }

    return jsonResponse({ error: 'Not found' }, request, env, 404);
  }
};

// ============================================================
// Booking handler
// ============================================================
async function handleBooking(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON' }, request, env, 400);
  }

  // Validation minimale
  const required = ['slug', 'name', 'email', 'date', 'time', 'pax'];
  for (const k of required) {
    if (!body[k] || String(body[k]).trim() === '') {
      return jsonResponse({ error: `Champ requis manquant: ${k}` }, request, env, 400);
    }
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(body.email)) {
    return jsonResponse({ error: 'Email invalide' }, request, env, 400);
  }
  // Date doit être >= aujourd'hui
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const resaDate = new Date(body.date);
  if (isNaN(resaDate) || resaDate < today) {
    return jsonResponse({ error: 'Date invalide ou dans le passé' }, request, env, 400);
  }
  // Pax 1-20
  const pax = parseInt(body.pax, 10);
  if (!pax || pax < 1 || pax > 20) {
    return jsonResponse({ error: 'Nombre de personnes invalide (1-20)' }, request, env, 400);
  }

  const resto = RESTOS[body.slug] || { name: body.slug, email: null, city: '' };
  const restoEmail = resto.email || env.ADMIN_EMAIL;
  const refId = generateRefId();
  const isoDate = body.date;
  const humanDate = formatDateFr(resaDate);

  // 1) Email au client
  const clientResult = await sendPostmark(env, {
    From: env.FROM_EMAIL,
    To: body.email,
    Subject: `📩 Demande de réservation envoyée à ${resto.name}`,
    HtmlBody: htmlClientConfirm({ resto, body, refId, humanDate, pax }),
    TextBody: textClientConfirm({ resto, body, refId, humanDate, pax }),
    MessageStream: 'outbound',
    Metadata: { ref: refId, slug: body.slug, type: 'client_confirm' }
  });

  // 2) Email au resto
  const restoResult = await sendPostmark(env, {
    From: env.FROM_EMAIL,
    To: restoEmail,
    ReplyTo: body.email,
    Subject: `🔔 Nouvelle demande de réservation R3STO — ${humanDate} · ${pax} pers.`,
    HtmlBody: htmlRestoNotify({ resto, body, refId, humanDate, pax }),
    TextBody: textRestoNotify({ resto, body, refId, humanDate, pax }),
    MessageStream: 'outbound',
    Metadata: { ref: refId, slug: body.slug, type: 'resto_notify' }
  });

  return jsonResponse({
    ok: true,
    ref: refId,
    clientSent: clientResult.ok,
    restoSent: restoResult.ok,
    resto: resto.name,
    date: humanDate
  }, request, env);
}

// ============================================================
// Postmark API call
// ============================================================
async function sendPostmark(env, payload) {
  if (!env.POSTMARK_TOKEN) {
    console.error('POSTMARK_TOKEN missing');
    return { ok: false, error: 'POSTMARK_TOKEN not configured' };
  }
  try {
    const res = await fetch('https://api.postmarkapp.com/email', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-Postmark-Server-Token': env.POSTMARK_TOKEN
      },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) {
      console.error('Postmark error', data);
      return { ok: false, error: data.Message || 'Postmark send failed' };
    }
    return { ok: true, messageId: data.MessageID };
  } catch (e) {
    console.error('Postmark fetch error', e);
    return { ok: false, error: String(e) };
  }
}

// ============================================================
// CORS / JSON helpers
// ============================================================
function corsHeaders(request, env) {
  const origin = request.headers.get('Origin') || '';
  const allowed = (env.ALLOWED_ORIGINS || 'https://r3sto.com,https://www.r3sto.com,http://localhost:3000').split(',');
  const allowOrigin = allowed.includes(origin) ? origin : allowed[0];
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400'
  };
}
function corsResponse(request, env) {
  return new Response(null, { status: 204, headers: corsHeaders(request, env) });
}
function jsonResponse(data, request, env, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(request, env) }
  });
}

// ============================================================
// Utils
// ============================================================
function generateRefId() {
  const ts = Date.now().toString(36).toUpperCase();
  const rnd = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `R3-${ts}-${rnd}`;
}
function formatDateFr(d) {
  return d.toLocaleDateString('fr-CH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}
function esc(s) {
  return String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

// ============================================================
// Email templates
// ============================================================
function htmlClientConfirm({ resto, body, refId, humanDate, pax }) {
  return `<!DOCTYPE html>
<html><body style="margin:0;background:#eef3fa;font-family:'DM Sans',Helvetica,Arial,sans-serif;color:#0c1730">
<div style="max-width:560px;margin:30px auto;background:#fff;padding:0;border:1px solid #d6dfee">
  <div style="background:#1c2e58;color:#fff;padding:24px 28px">
    <div style="font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#c89752;margin-bottom:8px">📩 Demande envoyée</div>
    <div style="font-size:24px;font-weight:800;letter-spacing:-.5px">${esc(resto.name)}</div>
    <div style="font-size:13px;color:rgba(255,255,255,.7);margin-top:4px">${esc(resto.city)}</div>
  </div>
  <div style="padding:24px 28px">
    <p style="margin:0 0 20px;font-size:15px;line-height:1.6">Bonjour ${esc(body.name.split(' ')[0])},</p>
    <p style="margin:0 0 18px;font-size:15px;line-height:1.6">Votre demande de réservation a bien été transmise à <b>${esc(resto.name)}</b>. Le restaurant va vous confirmer votre table sous quelques heures — vous recevrez alors un second email avec la <b>confirmation définitive</b>.</p>
    <div style="background:#fff8e8;border:1px solid #e6d090;padding:18px 20px;margin:20px 0">
      <div style="font-family:'JetBrains Mono',monospace;font-size:10.5px;font-weight:700;color:#a07e2a;letter-spacing:.14em;text-transform:uppercase;margin-bottom:10px">Détails</div>
      <table cellpadding="6" cellspacing="0" style="width:100%;font-size:14px">
        <tr><td style="color:#7b88a8;width:120px">Date</td><td><b>${esc(humanDate)}</b></td></tr>
        <tr><td style="color:#7b88a8">Heure</td><td><b>${esc(body.time)}</b></td></tr>
        <tr><td style="color:#7b88a8">Personnes</td><td><b>${pax}</b></td></tr>
        ${body.notes ? `<tr><td style="color:#7b88a8;vertical-align:top">Notes</td><td>${esc(body.notes)}</td></tr>` : ''}
        <tr><td style="color:#7b88a8">Référence</td><td style="font-family:'JetBrains Mono',monospace">${refId}</td></tr>
      </table>
    </div>
    <p style="margin:20px 0 6px;font-size:14px;color:#4a5878">Un imprévu ? Annulez ou modifiez :</p>
    <p style="margin:0 0 20px"><a href="mailto:contact@r3sto.com?subject=Modifier%20résa%20${refId}" style="color:#a07e2a;font-weight:600">contact@r3sto.com</a></p>
    <div style="border-top:1px solid #d6dfee;padding-top:18px;margin-top:24px;font-size:12px;color:#7b88a8;line-height:1.55">
      <b style="color:#1c2e58">R3STO</b> · L'annuaire gourmand international<br>
      Réservation directe sans commission — 100 % de votre paiement reste au restaurant.
    </div>
  </div>
</div>
<div style="text-align:center;padding:16px;font-family:'JetBrains Mono',monospace;font-size:11px;color:#7b88a8">
  © 2026 Innoptim SA · <a href="https://r3sto.com" style="color:#a07e2a;text-decoration:none">r3sto.com</a>
</div>
</body></html>`;
}

function textClientConfirm({ resto, body, refId, humanDate, pax }) {
  return `R3STO — Demande de réservation envoyée

Bonjour ${body.name.split(' ')[0]},

Votre demande de réservation chez ${resto.name} (${resto.city}) a bien été transmise.
Le restaurant va vous confirmer votre table sous quelques heures — vous recevrez alors un second email avec la confirmation définitive.

Date     : ${humanDate}
Heure    : ${body.time}
Personnes: ${pax}
${body.notes ? `Notes    : ${body.notes}\n` : ''}Référence: ${refId}

Pour modifier ou annuler : contact@r3sto.com (avec la référence ${refId} en objet)

R3STO — L'annuaire gourmand international
Réservation directe sans commission.
https://r3sto.com
`;
}

function htmlRestoNotify({ resto, body, refId, humanDate, pax }) {
  return `<!DOCTYPE html>
<html><body style="margin:0;background:#eef3fa;font-family:'DM Sans',Helvetica,Arial,sans-serif;color:#0c1730">
<div style="max-width:560px;margin:30px auto;background:#fff;padding:0;border:1px solid #d6dfee">
  <div style="background:#1c2e58;color:#fff;padding:24px 28px">
    <div style="font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#c89752;margin-bottom:8px">🔔 Nouvelle demande à confirmer</div>
    <div style="font-size:22px;font-weight:800;letter-spacing:-.3px">${pax} personne${pax > 1 ? 's' : ''} · ${esc(body.time)}</div>
    <div style="font-size:14px;color:rgba(255,255,255,.85);margin-top:4px">${esc(humanDate)}</div>
  </div>
  <div style="padding:24px 28px">
    <p style="margin:0 0 18px;font-size:15px">Une nouvelle réservation a été déposée via R3STO pour <b>${esc(resto.name)}</b>.</p>
    <div style="background:#fff8e8;border:1px solid #e6d090;padding:18px 20px;margin:18px 0">
      <div style="font-family:'JetBrains Mono',monospace;font-size:10.5px;font-weight:700;color:#a07e2a;letter-spacing:.14em;text-transform:uppercase;margin-bottom:10px">Client</div>
      <table cellpadding="6" cellspacing="0" style="width:100%;font-size:14px">
        <tr><td style="color:#7b88a8;width:120px">Nom</td><td><b>${esc(body.name)}</b></td></tr>
        <tr><td style="color:#7b88a8">Email</td><td><a href="mailto:${esc(body.email)}" style="color:#a07e2a">${esc(body.email)}</a></td></tr>
        ${body.phone ? `<tr><td style="color:#7b88a8">Téléphone</td><td><a href="tel:${esc(body.phone)}" style="color:#a07e2a">${esc(body.phone)}</a></td></tr>` : ''}
        ${body.notes ? `<tr><td style="color:#7b88a8;vertical-align:top">Demande</td><td>${esc(body.notes)}</td></tr>` : ''}
        <tr><td style="color:#7b88a8">Référence</td><td style="font-family:'JetBrains Mono',monospace">${refId}</td></tr>
      </table>
    </div>
    <div style="margin:24px 0 8px">
      <a href="mailto:${esc(body.email)}?subject=Re:%20Réservation%20${refId}%20chez%20${esc(resto.name).replace(/ /g, '%20')}" style="display:inline-block;background:#1c2e58;color:#fff;padding:13px 24px;text-decoration:none;font-weight:700;font-size:13px;letter-spacing:.04em;text-transform:uppercase">Répondre au client →</a>
    </div>
    <div style="border-top:1px solid #d6dfee;padding-top:18px;margin-top:24px;font-size:12px;color:#7b88a8;line-height:1.55">
      Cette réservation est arrivée via votre fiche <b style="color:#1c2e58">R3STO</b>.<br>
      Aucune commission. Le client paiera 100 % de son addition directement chez vous.
    </div>
  </div>
</div>
<div style="text-align:center;padding:16px;font-family:'JetBrains Mono',monospace;font-size:11px;color:#7b88a8">
  R3STO Pro · Gestion réservations · <a href="https://r3sto.com/pro.html" style="color:#a07e2a;text-decoration:none">r3sto.com/pro</a>
</div>
</body></html>`;
}

function textRestoNotify({ resto, body, refId, humanDate, pax }) {
  return `R3STO — Nouvelle réservation

Établissement : ${resto.name}
Date          : ${humanDate}
Heure         : ${body.time}
Personnes     : ${pax}

CLIENT
------
Nom      : ${body.name}
Email    : ${body.email}
${body.phone ? `Téléphone: ${body.phone}\n` : ''}${body.notes ? `Demande  : ${body.notes}\n` : ''}Référence: ${refId}

→ Pour répondre au client, utilisez son adresse email ci-dessus.

R3STO Pro — Gestion réservations sans commission
https://r3sto.com/pro.html
`;
}
