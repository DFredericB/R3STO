// ═══════════════════════════════════════════════════════════════
//  Gestion centralisée des erreurs et 404
// ═══════════════════════════════════════════════════════════════

const { ZodError } = require('zod');
const { HttpError, fail, notFound } = require('../utils/responses');

function notFoundHandler(req, res) {
  return notFound(res, `Route inconnue : ${req.method} ${req.originalUrl}`);
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // Erreurs Zod (validation)
  if (err instanceof ZodError) {
    return fail(res, 400, 'Données invalides', { issues: err.issues });
  }

  // Erreurs HTTP custom
  if (err instanceof HttpError) {
    return fail(res, err.status, err.message, err.extra);
  }

  // Erreurs MariaDB connues
  if (err && err.code === 'ER_DUP_ENTRY') {
    return fail(res, 409, 'Cette ressource existe déjà');
  }

  // Erreur générique
  console.error('[error]', err);
  const status = err.status || 500;
  const message = err.message || 'Erreur serveur';
  return fail(res, status, message);
}

module.exports = { notFoundHandler, errorHandler };
