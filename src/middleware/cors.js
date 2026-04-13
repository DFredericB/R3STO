// ═══════════════════════════════════════════════════════════════
//  CORS — whitelist stricte basée sur config.cors.origins
//  Les requêtes sans origin (curl, server-to-server) sont autorisées.
// ═══════════════════════════════════════════════════════════════

const cors = require('cors');
const { config } = require('../config');

const allowedOrigins = new Set(config.cors.origins);

const corsOptions = {
  origin(origin, cb) {
    // Pas d'origin (curl, postman, healthcheck) → autorisé
    if (!origin) return cb(null, true);
    if (allowedOrigins.has(origin)) return cb(null, true);
    // En dev on log et on bloque (tolérant)
    console.warn(`[cors] Origin refusée : ${origin}`);
    return cb(new Error('Origin non autorisée'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Length'],
  maxAge: 86400,
};

module.exports = cors(corsOptions);
