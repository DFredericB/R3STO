// ═══════════════════════════════════════════════════════════════
//  JWT — sign / verify
// ═══════════════════════════════════════════════════════════════

const jwt = require('jsonwebtoken');
const { config } = require('../config');

function sign(payload, options = {}) {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
    ...options,
  });
}

function verify(token) {
  return jwt.verify(token, config.jwt.secret);
}

function decode(token) {
  return jwt.decode(token);
}

module.exports = { sign, verify, decode };
