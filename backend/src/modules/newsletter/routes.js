// ═══════════════════════════════════════════════════════════════
//  Newsletter + CRM Contacts — routes
//  Monté dans app.js sur /newsletter et /crm/contacts
// ═══════════════════════════════════════════════════════════════

const express = require('express');
const crypto = require('crypto');
const { authMiddleware } = require('../../middleware/auth');
const db = require('../../config/db');
const { sendMail } = require('../../utils/mailer');

const router = express.Router();

// ─── Helpers ──────────────────────────────────────────────
function newToken() {
  return crypto.randomBytes(24).toString('hex');
}
function injectUnsubFooter(html, token, baseUrl) {
  const url = `${baseUrl}/newsletter/unsubscribe/${token}`;
  const footer = `
    <hr style="margin:32px 0;border:none;border-top:1px solid #e5e7eb">
    <p style="font-size:11px;color:#94a3b8;text-align:center;font-family:-apple-system,system-ui,sans-serif">
      Vous recevez ce mail car vous êtes en contact avec R3STO.
      <br><a href="${url}" style="color:#94a3b8">Se désinscrire</a>
    </p>`;
  return html.replace(/<\/body>/i, footer + '</body>') || (html + footer);
}

// ─── CONTACTS CRUD ────────────────────────────────────────

router.get('/crm/contacts', authMiddleware, async (req, res, next) => {
  try {
    const { status, source, canton, search, offset = 0, limit = 200 } = req.query;
    const where = ['1=1'];
    const params = [];
    if (status) { where.push('status = ?'); params.push(status); }
    if (source) { where.push('source LIKE ?'); params.push(`%${source}%`); }
    if (canton) { where.push('canton = ?'); params.push(canton); }
    if (search) {
      where.push('(email LIKE ? OR first_name LIKE ? OR last_name LIKE ? OR company LIKE ? OR city LIKE ? OR phone LIKE ?)');
      const s = `%${search}%`; params.push(s, s, s, s, s, s);
    }
    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) as total FROM crm_contacts WHERE ${where.join(' AND ')}`, params
    );
    const [rows] = await db.query(
      `SELECT * FROM crm_contacts WHERE ${where.join(' AND ')} ORDER BY company ASC, last_name ASC LIMIT ? OFFSET ?`,
      [...params, Number(limit), Number(offset)]
    );
    res.json({ ok: true, contacts: rows, count: rows.length, total });
  } catch (e) { next(e); }
});

// Stats agrégées pour le dashboard CRM
router.get('/crm/stats', authMiddleware, async (req, res, next) => {
  try {
    const [[{ total }]] = await db.query('SELECT COUNT(*) as total FROM crm_contacts');
    const [[{ withEmail }]] = await db.query("SELECT COUNT(*) as withEmail FROM crm_contacts WHERE email IS NOT NULL AND email != ''");
    const [[{ withPhone }]] = await db.query("SELECT COUNT(*) as withPhone FROM crm_contacts WHERE phone IS NOT NULL AND phone != ''");
    const [[{ unsubscribed }]] = await db.query('SELECT COUNT(*) as unsubscribed FROM crm_contacts WHERE unsubscribed = 1');
    const [byStatus] = await db.query('SELECT status, COUNT(*) as count FROM crm_contacts GROUP BY status ORDER BY count DESC');
    const [bySource] = await db.query("SELECT SUBSTRING_INDEX(source, ',', 1) as src, COUNT(*) as count FROM crm_contacts GROUP BY src ORDER BY count DESC");
    const [byCanton] = await db.query("SELECT canton, COUNT(*) as count FROM crm_contacts WHERE canton IS NOT NULL AND canton != '' GROUP BY canton ORDER BY count DESC");
    res.json({ ok: true, total, withEmail, withPhone, unsubscribed, byStatus, bySource, byCanton });
  } catch (e) { next(e); }
});

router.post('/crm/contacts', authMiddleware, async (req, res, next) => {
  try {
    const b = req.body || {};
    if (!b.email && !b.company) return res.status(400).json({ ok: false, error: 'email ou company requis' });
    const [r] = await db.query(
      `INSERT INTO crm_contacts (email, first_name, last_name, company, raison_sociale, phone, address, postal_code, city, canton, country, website, couverts, type_cuisine, concurrence, source, status, tags, notes, date_contact, interest, consent, unsub_token)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         first_name     = COALESCE(VALUES(first_name), first_name),
         last_name      = COALESCE(VALUES(last_name),  last_name),
         company        = COALESCE(VALUES(company),    company),
         raison_sociale = COALESCE(VALUES(raison_sociale), raison_sociale),
         phone          = COALESCE(VALUES(phone),      phone),
         address        = COALESCE(VALUES(address),    address),
         postal_code    = COALESCE(VALUES(postal_code), postal_code),
         city           = COALESCE(VALUES(city),       city),
         canton         = COALESCE(VALUES(canton),     canton),
         website        = COALESCE(VALUES(website),    website),
         couverts       = COALESCE(VALUES(couverts),   couverts),
         type_cuisine   = COALESCE(VALUES(type_cuisine), type_cuisine),
         concurrence    = COALESCE(VALUES(concurrence), concurrence),
         updated_at     = NOW()`,
      [
        b.email ? b.email.toLowerCase().trim() : null,
        b.first_name || null, b.last_name || null,
        b.company || null, b.raison_sociale || null,
        b.phone || null, b.address || null, b.postal_code || null,
        b.city || null, b.canton || null, b.country || 'CH',
        b.website || null, b.couverts || null,
        b.type_cuisine || null, b.concurrence || null,
        b.source || 'manual', b.status || 'lead',
        b.tags ? JSON.stringify(b.tags) : null,
        b.notes || null,
        b.date_contact || null, b.interest || null,
        b.consent ? 1 : 0, newToken(),
      ]
    );
    res.json({ ok: true, id: r.insertId });
  } catch (e) { next(e); }
});

router.patch('/crm/contacts/:id', authMiddleware, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const b = req.body || {};
    const fields = [];
    const params = [];
    for (const k of ['first_name', 'last_name', 'company', 'raison_sociale', 'phone', 'address', 'postal_code', 'city', 'canton', 'country', 'website', 'couverts', 'type_cuisine', 'concurrence', 'source', 'status', 'notes', 'date_contact', 'interest']) {
      if (b[k] !== undefined) { fields.push(`${k} = ?`); params.push(b[k]); }
    }
    if (b.tags !== undefined) { fields.push('tags = ?'); params.push(JSON.stringify(b.tags)); }
    if (b.consent !== undefined) { fields.push('consent = ?'); params.push(b.consent ? 1 : 0); }
    if (!fields.length) return res.json({ ok: true, updated: 0 });
    params.push(id);
    await db.query(`UPDATE crm_contacts SET ${fields.join(', ')}, updated_at = NOW() WHERE id = ?`, params);
    res.json({ ok: true, updated: 1 });
  } catch (e) { next(e); }
});

router.delete('/crm/contacts/:id', authMiddleware, async (req, res, next) => {
  try {
    await db.query('DELETE FROM crm_contacts WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// ─── IMPORT BULK (JSON array) — supporte contacts avec ou sans email ──
router.post('/crm/import', authMiddleware, async (req, res, next) => {
  try {
    const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];
    let inserted = 0, updated = 0, skipped = 0;
    for (const r of rows) {
      const email = r.email ? String(r.email).toLowerCase().trim() : null;
      const company = r.company || r.etablissement || r.societe || null;
      if (!email && !company) { skipped++; continue; }
      try {
        const sql = email
          ? `INSERT INTO crm_contacts (email, first_name, last_name, company, raison_sociale, phone, address, postal_code, city, canton, country, website, couverts, type_cuisine, concurrence, source, status, notes, date_contact, interest, unsub_token)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
               first_name=COALESCE(VALUES(first_name),first_name), last_name=COALESCE(VALUES(last_name),last_name),
               company=COALESCE(VALUES(company),company), raison_sociale=COALESCE(VALUES(raison_sociale),raison_sociale),
               phone=COALESCE(VALUES(phone),phone), address=COALESCE(VALUES(address),address),
               postal_code=COALESCE(VALUES(postal_code),postal_code), city=COALESCE(VALUES(city),city),
               canton=COALESCE(VALUES(canton),canton), website=COALESCE(VALUES(website),website),
               couverts=COALESCE(VALUES(couverts),couverts), type_cuisine=COALESCE(VALUES(type_cuisine),type_cuisine),
               concurrence=COALESCE(VALUES(concurrence),concurrence), updated_at=NOW()`
          : `INSERT INTO crm_contacts (email, first_name, last_name, company, raison_sociale, phone, address, postal_code, city, canton, country, website, couverts, type_cuisine, concurrence, source, status, notes, date_contact, interest, unsub_token)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        const [result] = await db.query(sql, [
          email,
          r.first_name || r.contact || r.prenom || null,
          r.last_name || r.nom || null,
          company, r.raison_sociale || null,
          r.phone || r.telephone || r.tel || null,
          r.address || r.adresse || null,
          r.postal_code || r.npa || null,
          r.city || r.ville || null,
          r.canton || null, r.country || 'CH',
          r.website || r.site_web || null,
          r.couverts || null, r.type_cuisine || null, r.concurrence || null,
          r.source || 'import', r.status || 'Prospect',
          r.notes || null, r.date_contact || null, r.interest || null,
          newToken(),
        ]);
        if (result.affectedRows === 1) inserted++;
        else if (result.affectedRows === 2) updated++; // ON DUPLICATE KEY UPDATE = 2
        else skipped++;
      } catch { skipped++; }
    }
    res.json({ ok: true, inserted, updated, skipped, total: rows.length });
  } catch (e) { next(e); }
});

// ─── CAMPAIGNS ────────────────────────────────────────────

router.get('/newsletter/campaigns', authMiddleware, async (req, res, next) => {
  try {
    const [rows] = await db.query('SELECT * FROM crm_campaigns ORDER BY created_at DESC LIMIT 100');
    res.json({ ok: true, campaigns: rows });
  } catch (e) { next(e); }
});

router.post('/newsletter/campaigns', authMiddleware, async (req, res, next) => {
  try {
    const b = req.body || {};
    if (!b.name || !b.subject || !b.html_body) {
      return res.status(400).json({ ok: false, error: 'name, subject, html_body requis' });
    }
    const [r] = await db.query(
      `INSERT INTO crm_campaigns (name, subject, from_name, from_email, html_body, text_body, segment_json, status, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'draft', ?)`,
      [
        b.name,
        b.subject,
        b.from_name || 'R3STO',
        b.from_email || 'contact@r3sto.ch',
        b.html_body,
        b.text_body || null,
        b.segment ? JSON.stringify(b.segment) : null,
        req.user?.id || null,
      ]
    );
    res.json({ ok: true, id: r.insertId });
  } catch (e) { next(e); }
});

router.patch('/newsletter/campaigns/:id', authMiddleware, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const b = req.body || {};
    const fields = [];
    const params = [];
    for (const k of ['name', 'subject', 'from_name', 'from_email', 'html_body', 'text_body', 'status']) {
      if (b[k] !== undefined) { fields.push(`${k} = ?`); params.push(b[k]); }
    }
    if (b.segment !== undefined) { fields.push('segment_json = ?'); params.push(JSON.stringify(b.segment)); }
    if (!fields.length) return res.json({ ok: true });
    params.push(id);
    await db.query(`UPDATE crm_campaigns SET ${fields.join(', ')}, updated_at = NOW() WHERE id = ?`, params);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// ─── SEND CAMPAIGN ───────────────────────────────────────
router.post('/newsletter/campaigns/:id/send', authMiddleware, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const [[camp]] = await db.query('SELECT * FROM crm_campaigns WHERE id = ?', [id]);
    if (!camp) return res.status(404).json({ ok: false, error: 'campagne introuvable' });
    if (camp.status === 'sent') return res.status(400).json({ ok: false, error: 'déjà envoyée' });

    // Build recipient list from segment
    const seg = camp.segment_json ? JSON.parse(camp.segment_json) : null;
    const where = ['unsubscribed = 0'];
    const params = [];
    if (seg?.status) { where.push('status = ?'); params.push(seg.status); }
    if (seg?.source) { where.push('source = ?'); params.push(seg.source); }
    if (seg?.ids?.length) { where.push(`id IN (${seg.ids.map(() => '?').join(',')})`); params.push(...seg.ids); }
    const [contacts] = await db.query(
      `SELECT id, email, first_name, unsub_token FROM crm_contacts WHERE ${where.join(' AND ')}`,
      params
    );

    if (!contacts.length) return res.status(400).json({ ok: false, error: 'aucun destinataire' });

    await db.query('UPDATE crm_campaigns SET status = ?, recipients_ct = ? WHERE id = ?', ['sending', contacts.length, id]);

    // Envoi séquentiel (Infomaniak rate-limit ~30/min sur shared)
    const baseUrl = `https://api.r3sto.ch/api`;
    let sentCt = 0, failedCt = 0;
    for (const c of contacts) {
      const personalizedHtml = injectUnsubFooter(
        camp.html_body.replaceAll('{{first_name}}', c.first_name || ''),
        c.unsub_token,
        baseUrl
      );
      const result = await sendMail({
        to: c.email,
        subject: camp.subject.replaceAll('{{first_name}}', c.first_name || ''),
        html: personalizedHtml,
        text: camp.text_body || '',
      });
      await db.query(
        `INSERT INTO crm_sends (campaign_id, contact_id, email, status, error, message_id, sent_at)
         VALUES (?, ?, ?, ?, ?, ?, NOW())`,
        [id, c.id, c.email, result.ok ? 'sent' : 'failed', result.error || null, result.messageId || null]
      );
      if (result.ok) sentCt++; else failedCt++;
      // Rate limit : 2s entre chaque envoi (30/min safe)
      await new Promise(r => setTimeout(r, 2000));
    }

    await db.query(
      'UPDATE crm_campaigns SET status = ?, sent_at = NOW(), sent_ct = ?, failed_ct = ? WHERE id = ?',
      ['sent', sentCt, failedCt, id]
    );
    res.json({ ok: true, sent: sentCt, failed: failedCt, total: contacts.length });
  } catch (e) { next(e); }
});

// ─── TEST EMAIL ──────────────────────────────────────────
router.post('/newsletter/test', authMiddleware, async (req, res, next) => {
  try {
    const { to, subject, html } = req.body || {};
    if (!to) return res.status(400).json({ ok: false, error: 'to requis' });
    const result = await sendMail({
      to,
      subject: subject || '[TEST] R3STO Newsletter',
      html: html || '<p>Ceci est un test d\'envoi SMTP Infomaniak depuis R3STO.</p>',
      text: 'Test SMTP R3STO',
    });
    res.json(result);
  } catch (e) { next(e); }
});

// ─── UNSUBSCRIBE PUBLIC (no auth) ────────────────────────
router.get('/newsletter/unsubscribe/:token', async (req, res) => {
  try {
    const token = req.params.token;
    const [r] = await db.query(
      'UPDATE crm_contacts SET unsubscribed = 1 WHERE unsub_token = ?',
      [token]
    );
    if (r.affectedRows === 0) {
      return res.status(404).send('<h1>Lien invalide</h1>');
    }
    res.send(`<!doctype html><html><head><meta charset="utf-8"><title>Désinscription R3STO</title><style>body{font-family:-apple-system,system-ui,sans-serif;max-width:500px;margin:80px auto;padding:40px;text-align:center;background:#f8fafc;color:#0f172a}h1{color:#0f172a}p{color:#64748b;line-height:1.6}</style></head><body><h1>✅ Désinscription confirmée</h1><p>Vous ne recevrez plus de newsletters de R3STO.<br>Vous pouvez fermer cette fenêtre.</p></body></html>`);
  } catch {
    res.status(500).send('<h1>Erreur serveur</h1>');
  }
});

module.exports = router;
