// ═══════════════════════════════════════════════════════════════
//  R3STO — Express app factory
//
//  - Charge tous les middlewares globaux
//  - Monte les modules métier
//  - Le shim /api/* permet au frontend (qui appelle /api/auth/login)
//    de continuer à fonctionner sans modification.
// ═══════════════════════════════════════════════════════════════

const express = require('express');
const corsMiddleware = require('./middleware/cors');
const { errorHandler, notFoundHandler } = require('./middleware/error');

// Modules
const healthRoutes = require('./modules/health/routes');
const authRoutes = require('./modules/auth/routes');
const restaurantRoutes = require('./modules/restaurants/routes');
const reservationRoutes = require('./modules/reservations/routes');

async function createApp() {
  const app = express();

  app.set('trust proxy', 1); // pour req.ip derrière le reverse-proxy Infomaniak
  app.disable('x-powered-by');

  // ─── Middlewares globaux ───
  app.use(corsMiddleware);
  app.use(express.json({ limit: '5mb' }));
  app.use(express.urlencoded({ extended: true }));

  // ─── Shim /api/* — strip le préfixe pour compat front ───
  // Le frontend appelle /api/auth/login → on réécrit en /auth/login
  // Exception : /api/cron/* gardé tel quel (les CRON Infomaniak hit directement /api/cron/*)
  app.use((req, res, next) => {
    if (req.url === '/api') {
      req.url = '/';
    } else if (req.url.startsWith('/api/') && !req.url.startsWith('/api/cron/')) {
      req.url = req.url.slice(4);
    }
    next();
  });

  // ─── Routes ───
  app.use('/health', healthRoutes);
  app.use('/auth', authRoutes);

  // Restaurants : disponibles sous /restaurants ET /resto (alias compat front)
  app.use('/restaurants', restaurantRoutes);
  app.use('/resto', restaurantRoutes);

  // Réservations : disponibles sous /resas (front) ET /reservations (compat)
  app.use('/resas', reservationRoutes);
  app.use('/reservations', reservationRoutes);

  // ─── Root ───
  app.get('/', (req, res) => {
    res.json({
      service: 'R3STO API',
      version: require('../package.json').version,
      status: 'ok',
      docs: 'https://r3sto.ch',
    });
  });

  // ─── 404 + Error handler (toujours en dernier) ───
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
