// Waitlist — module CRUD généré via factory
const factory = require('../_crudFactory');

const mod = factory({
  table: 'waitlist',
  resourceKey: 'waitlist',
  fields: [
    'restaurant_id', 'client_nom', 'client_email', 'client_tel',
    'couverts', 'date_souhaitee', 'service_id', 'statut',
  ],
  requiredOnCreate: ['restaurant_id', 'client_nom'],
  orderBy: 'created_at DESC',
});

module.exports = mod;
module.exports.routes = mod.router;
