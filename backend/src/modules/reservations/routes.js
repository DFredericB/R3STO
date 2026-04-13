// ═══════════════════════════════════════════════════════════════
//  Reservations — routes
//  Monté dans app.js sur /resas (front) ET /reservations (compat).
//
//  Ordre IMPORTANT : les routes statiques (/search, /stats, /bulk)
//  doivent être déclarées AVANT les routes dynamiques (/:id).
// ═══════════════════════════════════════════════════════════════

const express = require('express');
const controller = require('./controller');
const schema = require('./schema');
const { validate } = require('../../middleware/validate');
const { authMiddleware } = require('../../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// ═══ Middleware de compat : mappe champs FR (app legacy) → EN (schema Zod)
// Sans ça, app.r3sto.ch (bundle minifié) envoie {nom, tel, couverts, heure}
// et la validation Zod rejette. On traduit avant validate().
router.use((req, res, next) => {
  if (!req.body || typeof req.body !== 'object') return next();
  const b = req.body;
  if (b.nom && !b.guest_name) b.guest_name = b.nom;
  if (b.n && !b.guest_name) b.guest_name = b.n;
  if (b.tel && !b.guest_phone) b.guest_phone = b.tel;
  if (b.telephone && !b.guest_phone) b.guest_phone = b.telephone;
  if (b.email && !b.guest_email) b.guest_email = b.email;
  if (b.couverts != null && b.party_size == null) b.party_size = b.couverts;
  if (b.pax != null && b.party_size == null) b.party_size = b.pax;
  if (b.heure && !b.time) b.time = b.heure;
  if (b.h && !b.time) b.time = b.h;
  if (b.notes_client && !b.notes) b.notes = b.notes_client;
  next();
});

// Routes statiques d'abord
router.get('/search', controller.search);
router.get('/stats', controller.stats);
router.post('/bulk', controller.bulkUpdate);
router.delete('/bulk', controller.bulkDelete);

// CRUD
router.get('/', controller.list);
router.post('/', validate(schema.createSchema), controller.create);
router.get('/:id', controller.getOne);
router.patch('/:id', validate(schema.updateSchema), controller.update);
router.put('/:id', validate(schema.updateSchema), controller.update);
router.delete('/:id', controller.remove);

// Statut (les deux variantes que le front utilise)
router.patch('/:id/status', validate(schema.statusSchema), controller.setStatus);
router.post('/:id/status', validate(schema.statusSchema), controller.setStatus);

module.exports = router;
