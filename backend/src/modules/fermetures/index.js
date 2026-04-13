// Fermetures — module CRUD généré via factory
const factory = require('../_crudFactory');

const mod = factory({
  table: 'fermetures',
  resourceKey: 'fermetures',
  fields: [
    'restaurant_id', 'label', 'date_debut', 'date_fin',
    'type', 'salle_id', 'service_id', 'note', 'actif',
  ],
  requiredOnCreate: ['restaurant_id', 'label', 'date_debut'],
  orderBy: 'date_debut DESC',
});

module.exports = mod;
module.exports.routes = mod.router;
