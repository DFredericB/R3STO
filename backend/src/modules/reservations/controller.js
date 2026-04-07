// ═══════════════════════════════════════════════════════════════
//  Reservations — controllers
// ═══════════════════════════════════════════════════════════════

const service = require('./service');
const { ok, created, badRequest } = require('../../utils/responses');

async function create(req, res, next) {
  try {
    const r = await service.create(req.user.id, req.validated);
    return created(res, { reservation: r });
  } catch (err) {
    next(err);
  }
}

async function list(req, res, next) {
  try {
    const items = await service.list(req.user.id, req.validated || req.query);
    return ok(res, { reservations: items, items });
  } catch (err) {
    next(err);
  }
}

async function getOne(req, res, next) {
  try {
    const r = await service.getOne(req.user.id, req.params.id);
    return ok(res, { reservation: r });
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const r = await service.update(req.user.id, req.params.id, req.validated);
    return ok(res, { reservation: r });
  } catch (err) {
    next(err);
  }
}

async function setStatus(req, res, next) {
  try {
    const r = await service.setStatus(req.user.id, req.params.id, req.validated.status);
    return ok(res, { reservation: r });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    await service.remove(req.user.id, req.params.id);
    return ok(res, { deleted: true });
  } catch (err) {
    next(err);
  }
}

async function search(req, res, next) {
  try {
    const q = (req.query.q || '').toString().trim();
    if (!q) return badRequest(res, 'Paramètre q requis');
    const items = await service.search(req.user.id, q);
    return ok(res, { reservations: items });
  } catch (err) {
    next(err);
  }
}

async function stats(req, res, next) {
  try {
    const { from, to } = req.query;
    const data = await service.stats(req.user.id, from, to);
    return ok(res, { stats: data });
  } catch (err) {
    next(err);
  }
}

async function bulkUpdate(req, res, next) {
  try {
    const updates = Array.isArray(req.body.updates) ? req.body.updates : [];
    const items = await service.bulkUpdate(req.user.id, updates);
    return ok(res, { reservations: items });
  } catch (err) {
    next(err);
  }
}

async function bulkDelete(req, res, next) {
  try {
    const ids = Array.isArray(req.body.ids) ? req.body.ids : [];
    const result = await service.bulkDelete(req.user.id, ids);
    return ok(res, result);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  create, list, getOne, update, setStatus, remove,
  search, stats, bulkUpdate, bulkDelete,
};
