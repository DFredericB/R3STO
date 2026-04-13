// Clients (CRM) — module CRUD + recherche
const express = require('express');
const factory = require('../_crudFactory');
const { query } = require('../../config/db');
const { authMiddleware } = require('../../middleware/auth');
const { ok } = require('../../utils/responses');

const mod = factory({
  table: 'clients',
  resourceKey: 'clients',
  fields: [
    'restaurant_id', 'prenom', 'nom', 'email', 'telephone',
    'note', 'nb_visites', 'nb_noshows', 'blacklist', 'blacklist_raison',
    'dateNaissance', 'menuDuJourOptin',
  ],
  requiredOnCreate: ['restaurant_id', 'nom'],
  orderBy: 'nom ASC, prenom ASC',
});

// Recherche full-text basique sur nom/prenom/email/tel
mod.router.get('/search/:q', authMiddleware, async (req, res, next) => {
  try {
    const like = `%${req.params.q}%`;
    const [rows] = await query(
      `SELECT c.* FROM clients c
       JOIN restaurants rest ON c.restaurant_id = rest.id
       WHERE rest.user_id = ?
         AND (c.nom LIKE ? OR c.prenom LIKE ? OR c.email LIKE ? OR c.telephone LIKE ?)
       ORDER BY c.nom ASC LIMIT 50`,
      [req.user.id, like, like, like, like]
    );
    return ok(res, { clients: rows, items: rows });
  } catch (e) { next(e); }
});

module.exports = mod;
module.exports.routes = mod.router;
