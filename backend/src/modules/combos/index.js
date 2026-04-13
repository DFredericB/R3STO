// Combos — module CRUD généré via factory
const factory = require('../_crudFactory');

const mod = factory({
  table: 'combos',
  resourceKey: 'combos',
  fields: [
    'restaurant_id', 'label', 'table_ids',
    'couverts_min', 'couverts_max', 'cap_override', 'align',
  ],
  requiredOnCreate: ['restaurant_id', 'label', 'table_ids', 'couverts_max'],
  orderBy: 'id DESC',
});

module.exports = mod;
module.exports.routes = mod.router;
