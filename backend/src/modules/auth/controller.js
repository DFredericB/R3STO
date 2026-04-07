// ═══════════════════════════════════════════════════════════════
//  Auth — controllers HTTP (req → service → res)
// ═══════════════════════════════════════════════════════════════

const service = require('./service');
const { ok, created } = require('../../utils/responses');

async function register(req, res, next) {
  try {
    const result = await service.register(req.validated);
    // Compatibilité auth.r3sto.ch : on renvoie aussi access_token
    return created(res, {
      access_token: result.token,
      token: result.token,
      user: result.user,
      restaurantId: result.restaurantId,
    });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.validated;
    const result = await service.login(email, password, {
      ip: req.ip,
      userAgent: req.headers['user-agent'] || '',
    });
    return ok(res, {
      access_token: result.token,
      token: result.token,
      user: result.user,
    });
  } catch (err) {
    next(err);
  }
}

async function sendOtp(req, res, next) {
  try {
    const { email } = req.validated;
    const result = await service.sendOtp(email);
    return ok(res, result);
  } catch (err) {
    next(err);
  }
}

async function verifyOtp(req, res, next) {
  try {
    const { email, code } = req.validated;
    const result = await service.verifyOtp(email, code);
    return ok(res, result);
  } catch (err) {
    next(err);
  }
}

async function me(req, res, next) {
  try {
    const user = await service.getMe(req.user.id);
    return ok(res, { user });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, sendOtp, verifyOtp, me };
