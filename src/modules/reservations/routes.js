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
