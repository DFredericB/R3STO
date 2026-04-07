#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════
//  R3STO — Backend Entry Point
//  Démarre l'application Express et gère le cycle de vie du process.
//  Toute la logique est dans src/app.js et src/modules/*
// ═══════════════════════════════════════════════════════════════

require('dotenv').config();

const { createApp } = require('./src/app');
const { config } = require('./src/config');
const { closePool } = require('./src/config/db');

async function main() {
  const app = await createApp();

  const server = app.listen(config.port, () => {
    console.log(`[R3STO] API v${config.version} démarrée sur le port ${config.port}`);
    console.log(`[R3STO] Environnement : ${config.env}`);
  });

  // Graceful shutdown
  const shutdown = async (signal) => {
    console.log(`[R3STO] Signal ${signal} reçu, arrêt en cours...`);
    server.close(async () => {
      await closePool();
      console.log('[R3STO] Arrêt propre terminé');
      process.exit(0);
    });
    // Force kill après 10s
    setTimeout(() => {
      console.error('[R3STO] Arrêt forcé après timeout');
      process.exit(1);
    }, 10000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('unhandledRejection', (err) => {
    console.error('[R3STO] Unhandled rejection:', err);
  });
  process.on('uncaughtException', (err) => {
    console.error('[R3STO] Uncaught exception:', err);
    process.exit(1);
  });
}

main().catch((err) => {
  console.error('[R3STO] Erreur fatale au démarrage:', err);
  process.exit(1);
});
