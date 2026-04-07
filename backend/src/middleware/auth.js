// ═══════════════════════════════════════════════════════════════
//  Middleware d'authentification JWT + autorisation par rôle
// ═══════════════════════════════════════════════════════════════

const { verify } = require('../utils/jwt');
const { unauthorized, forbidden } = require('../utils/responses');

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return unauthorized(res, 'Token requis');
  }
  try {
    req.user = verify(header.slice(7));
    next();
  } catch {
    return unauthorized(res, 'Token invalide ou expiré');
  }
}

function adminMiddleware(req, res, next) {
  if (!req.user || !['superadmin', 'admin'].includes(req.user.role)) {
    return forbidden(res, 'Accès admin requis');
  }
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return forbidden(res, `Rôle requis : ${roles.join(' ou ')}`);
    }
    next();
  };
}

module.exports = { authMiddleware, adminMiddleware, requireRole };
