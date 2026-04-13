// Tables — module CRUD généré via factory
const factory = require('../_crudFactory');

const mod = factory({
  table: 'tables',
  resourceKey: 'tables',
  fields: [
    'restaurant_id', 'salle_id', 'numero', 'nom',
    'couverts_min', 'couverts_max', 'forme',
    'pos_x', 'pos_y', 'pos_w', 'pos_h',
    'actif', 'blocked', 'blocked_reason', 'held',
    'priority', 'zone', 'layer_pos',
  ],
  requiredOnCreate: ['restaurant_id', 'numero'],
  orderBy: 'salle_id ASC, numero ASC',
});

module.exports = mod;
module.exports.routes = mod.router;
