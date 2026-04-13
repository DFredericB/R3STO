// Services — module CRUD généré via factory
const factory = require('../_crudFactory');

const mod = factory({
  table: 'services',
  resourceKey: 'services',
  fields: [
    'restaurant_id', 'salle_id', 'nom', 'type',
    'heure_debut', 'heure_fin', 'jours', 'actif',
    'last_order', 'buffer_mins', 'booking_cutoff_mins',
    'slot_interval', 'max_per_slot', 'max_cvt_per_slot',
    'max_resas', 'icon',
  ],
  requiredOnCreate: ['restaurant_id', 'nom', 'heure_debut', 'heure_fin'],
  orderBy: 'heure_debut ASC',
});

module.exports = mod;
module.exports.routes = mod.router;
