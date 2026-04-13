// ═══════════════════════════════════════════════════════════════
//  Helpers de réponses HTTP uniformes
// ═══════════════════════════════════════════════════════════════

function ok(res, data = {}, status = 200) {
  return res.status(status).json({ ok: true, ...data });
}

function created(res, data = {}) {
  return ok(res, data, 201);
}

function fail(res, status, message, extra = {}) {
  return res.status(status).json({ ok: false, error: message, ...extra });
}

function notFound(res, message = 'Ressource non trouvée') {
  return fail(res, 404, message);
}

function unauthorized(res, message = 'Non autorisé') {
  return fail(res, 401, message);
}

function forbidden(res, message = 'Accès refusé') {
  return fail(res, 403, message);
}

function badRequest(res, message = 'Requête invalide', extra = {}) {
  return fail(res, 400, message, extra);
}

class HttpError extends Error {
  constructor(status, message, extra = {}) {
    super(message);
    this.status = status;
    this.extra = extra;
  }
}

module.exports = { ok, created, fail, notFound, unauthorized, forbidden, badRequest, HttpError };
