// ═══════════════════════════════════════════════════════════════
//  Auth — déclaration des routes
//  Préfixe monté dans app.js : /auth
// ═══════════════════════════════════════════════════════════════

const express = require('express');
const controller = require('./controller');
const schema = require('./schema');
const { validate } = require('../../middleware/validate');
const { authMiddleware } = require('../../middleware/auth');

const router = express.Router();

router.post('/register', validate(schema.registerSchema), controller.register);
router.post('/login', validate(schema.loginSchema), controller.login);
router.post('/send-otp', validate(schema.sendOtpSchema), controller.sendOtp);
router.post('/verify-otp', validate(schema.verifyOtpSchema), controller.verifyOtp);
router.post('/forgot-password', controller.forgotPassword);
router.post('/reset-password', controller.resetPassword);
router.get('/me', authMiddleware, controller.me);

module.exports = router;
