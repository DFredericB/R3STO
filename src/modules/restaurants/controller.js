// ═══════════════════════════════════════════════════════════════
//  Restaurants — controllers HTTP
// ═══════════════════════════════════════════════════════════════

const service = require('./service');
const { ok, created } = require('../../utils/responses');

async function create(req, res, next) {
  try {
    const r = await service.create(req.user.id, req.validated);
    return created(res, { restaurant: r, message: 'Restaurant créé' });
  } catch (err) {
    next(err);
  }
}

async function list(req, res, next) {
  try {
    const restaurants = await service.listForUser(req.user.id);
    return ok(res, { restaurants });
  } catch (err) {
    next(err);
  }
}

async function getOne(req, res, next) {
  try {
    const restaurant = await service.getOne(req.user.id, req.params.id);
    return ok(res, { restaurant });
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const restaurant = await service.update(req.user.id, req.params.id, req.validated);
    return ok(res, { restaurant, message: 'Restaurant mis à jour' });
  } catch (err) {
    next(err);
  }
}

module.exports = { create, list, getOne, update };
