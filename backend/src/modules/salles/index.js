// Salles — module CRUD généré via factory
const factory = require('../_crudFactory');

const mod = factory({
  table: 'salles',
  resourceKey: 'salles',
  fields: ['restaurant_id', 'nom', 'capacite', 'actif', 'position'],
  requiredOnCreate: ['restaurant_id', 'nom'],
  orderBy: 'position ASC, id ASC',
});

module.exports = mod;
module.exports.routes = mod.router;
