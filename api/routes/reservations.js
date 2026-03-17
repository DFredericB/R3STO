// ═══════════════════════════════════════════
//  R3STO — Reservations Routes
//  GET    /api/reservations?date=YYYY-MM-DD
//  POST   /api/reservations
//  PUT    /api/reservations/:id
//  DELETE /api/reservations/:id
// ═══════════════════════════════════════════

const express = require('express');
const router  = express.Router();
const db      = require('../config/db');
const { getSession } = require('./auth');

async function auth(req, res) {
  const s = await getSession(req);
  if (!s) { res.status(401).json({ error: 'Non authentifié' }); return null; }
  return s;
}

// ── GET /api/reservations ────────────────
router.get('/', async (req, res) => {
  try {
    const s = await auth(req, res); if (!s) return;
    const date = req.query.date || new Date().toISOString().slice(0,10);

    const [rows] = await db.execute(`
      SELECT r.*,
             t.numero  AS table_numero,
             t.couverts_max,
             sv.nom    AS service_nom,
             sv.type   AS service_type,
             sv.heure_debut, sv.heure_fin
      FROM reservations r
      LEFT JOIN \`tables\` t  ON t.id  = r.table_id
      LEFT JOIN services  sv ON sv.id = r.service_id
      WHERE r.restaurant_id = ? AND r.date_resa = ?
      ORDER BY r.heure ASC
    `, [s.restaurant_id, date]);

    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── POST /api/reservations ───────────────
router.post('/', async (req, res) => {
  try {
    const s = await auth(req, res); if (!s) return;
    const b = req.body;

    if (!b.client_nom || !b.date_resa || !b.heure)
      return res.status(400).json({ error: 'client_nom, date_resa et heure sont requis' });

    // Retrouver ou créer le client
    let clientId = null;
    if (b.client_email || b.client_tel) {
      const [existing] = await db.execute(
        `SELECT id FROM clients
         WHERE restaurant_id = ? AND (email = ? OR telephone = ?) LIMIT 1`,
        [s.restaurant_id, b.client_email || '', b.client_tel || '']
      );
      if (existing.length) {
        clientId = existing[0].id;
        // Mettre à jour les infos
        await db.execute(
          'UPDATE clients SET nb_visites = nb_visites + 1, derniere_visite = ? WHERE id = ?',
          [b.date_resa, clientId]
        );
      } else if (b.client_nom) {
        const [nc] = await db.execute(
          `INSERT INTO clients
           (restaurant_id, prenom, nom, email, telephone, nb_visites, derniere_visite)
           VALUES (?,?,?,?,?,1,?)`,
          [s.restaurant_id, b.client_prenom || '', b.client_nom,
           b.client_email || null, b.client_tel || null, b.date_resa]
        );
        clientId = nc.insertId;
      }
    }

    const [r] = await db.execute(`
      INSERT INTO reservations
      (restaurant_id, client_id, table_id, service_id,
       client_nom, client_prenom, client_email, client_tel,
       couverts, date_resa, heure, statut, source, note_client, note_interne)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `, [
      s.restaurant_id, clientId,
      b.table_id   || null,
      b.service_id || null,
      b.client_nom,
      b.client_prenom  || null,
      b.client_email   || null,
      b.client_tel     || null,
      b.couverts       || 2,
      b.date_resa,
      b.heure,
      b.statut         || 'reserved',
      b.source         || 'manuel',
      b.note_client    || null,
      b.note_interne   || null,
    ]);

    // Log
    await db.execute(
      `INSERT INTO reservation_logs
       (reservation_id, user_id, nouveau_statut, action)
       VALUES (?,?,?,'Création')`,
      [r.insertId, s.user_id, b.statut || 'reserved']
    );

    // Audit
    await db.execute(
      `INSERT INTO audit_log (restaurant_id, user_id, entite, entite_id, action, ip_address)
       VALUES (?,?,'reservation',?,'create',?)`,
      [s.restaurant_id, s.user_id, r.insertId, req.ip]
    );

    res.status(201).json({ id: r.insertId, ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── PUT /api/reservations/:id ────────────
router.put('/:id', async (req, res) => {
  try {
    const s = await auth(req, res); if (!s) return;
    const b = req.body;
    const id = req.params.id;

    // Récupérer ancien statut pour le log
    const [old] = await db.execute(
      'SELECT statut FROM reservations WHERE id = ? AND restaurant_id = ?',
      [id, s.restaurant_id]
    );
    if (!old.length) return res.status(404).json({ error: 'Réservation introuvable' });

    const allowed = ['statut','table_id','heure','couverts',
                     'note_client','note_interne','service_id','duree_minutes'];
    const sets = [], vals = [];
    allowed.forEach(f => {
      if (b[f] !== undefined) { sets.push(`${f} = ?`); vals.push(b[f]); }
    });
    if (!sets.length) return res.status(400).json({ error: 'Rien à mettre à jour' });

    vals.push(id, s.restaurant_id);
    await db.execute(
      `UPDATE reservations SET ${sets.join(', ')} WHERE id = ? AND restaurant_id = ?`,
      vals
    );

    // Log changement statut
    if (b.statut && b.statut !== old[0].statut) {
      await db.execute(
        `INSERT INTO reservation_logs
         (reservation_id, user_id, ancien_statut, nouveau_statut, action)
         VALUES (?,?,?,?,?)`,
        [id, s.user_id, old[0].statut, b.statut, `Statut → ${b.statut}`]
      );
      // Si no-show → incrémenter compteur client
      if (b.statut === 'noshow') {
        const [resa] = await db.execute(
          'SELECT client_id FROM reservations WHERE id = ?', [id]
        );
        if (resa[0]?.client_id) {
          await db.execute(
            'UPDATE clients SET nb_noshows = nb_noshows + 1 WHERE id = ?',
            [resa[0].client_id]
          );
        }
      }
    }

    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── DELETE /api/reservations/:id ─────────
router.delete('/:id', async (req, res) => {
  try {
    const s = await auth(req, res); if (!s) return;
    await db.execute(
      'DELETE FROM reservations WHERE id = ? AND restaurant_id = ?',
      [req.params.id, s.restaurant_id]
    );
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
