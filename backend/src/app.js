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
const newsletterRoutes = require('./modules/newsletter/routes');
const usersRoutes = require('./modules/users/routes');
const adminRoutes = require('./modules/admin/routes');
const publicRoutes = require('./modules/public/routes');

// Round 2 modules (CRUD via factory)
const sallesModule = require('./modules/salles');
const tablesModule = require('./modules/tables');
const combosModule = require('./modules/combos');
const servicesModule = require('./modules/services');
const fermeturesModule = require('./modules/fermetures');
const optionsRestaurantModule = require('./modules/options_restaurant');
const clientsModule = require('./modules/clients');
const waitlistModule = require('./modules/waitlist');
const actionLogsModule = require('./modules/action_logs');

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

  // ─── Routes publiques (SANS auth) ───
  app.use('/public', publicRoutes);

  // ─── Routes ───
  app.use('/health', healthRoutes);
  app.use('/auth', authRoutes);

  // Restaurants : disponibles sous /restaurants ET /resto (alias compat front)
  app.use('/restaurants', restaurantRoutes);
  app.use('/resto', restaurantRoutes);

  // Réservations : disponibles sous /resas (front) ET /reservations (compat)
  app.use('/resas', reservationRoutes);
  app.use('/reservations', reservationRoutes);

  // ─── Round 2 modules ───
  app.use('/salles', sallesModule.router);
  app.use('/tables', tablesModule.router);
  app.use('/combos', combosModule.router);
  app.use('/services', servicesModule.router);
  app.use('/fermetures', fermeturesModule.router);
  app.use('/options-restaurant', optionsRestaurantModule.router);
  app.use('/options_restaurant', optionsRestaurantModule.router); // alias snake_case
  app.use('/clients', clientsModule.router);
  app.use('/waitlist', waitlistModule.router);
  app.use('/logs', actionLogsModule.router);
  app.use('/action-logs', actionLogsModule.router);

  // ─── CRM + Newsletter (routes préfixées /crm et /newsletter en interne) ───
  app.use('/', newsletterRoutes);

  // ─── Users (plateforme) — admin console ───
  app.use('/users', usersRoutes);

  // ─── Admin (migrations, diagnostics) — superadmin uniquement ───
  app.use('/admin', adminRoutes);

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
