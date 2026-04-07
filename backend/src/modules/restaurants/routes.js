// ═══════════════════════════════════════════════════════════════
//  Restaurants — routes
//  Monté dans app.js sur /restaurants ET /resto (alias compat front)
// ═══════════════════════════════════════════════════════════════

const express = require('express');
const controller = require('./controller');
const schema = require('./schema');
const { validate } = require('../../middleware/validate');
const { authMiddleware } = require('../../middleware/auth');

const router = express.Router();

router.use(authMiddleware);

router.post('/', validate(schema.createSchema), controller.create);
router.get('/', controller.list);
router.get('/:id', controller.getOne);
router.put('/:id', validate(schema.updateSchema), controller.update);
router.patch('/:id', validate(schema.updateSchema), controller.update);

module.exports = router;
