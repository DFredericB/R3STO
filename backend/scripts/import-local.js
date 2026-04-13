#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════
//  Import CRM local → API R3STO
//  Usage: node scripts/import-local.js <email> <password>
// ═══════════════════════════════════════════════════════════════

const fs = require('fs');
const path = require('path');
const https = require('https');

const API = 'https://api.r3sto.ch/api';
const email = process.argv[2];
const password = process.argv[3];

if (!email || !password) {
  console.log('Usage: node scripts/import-local.js <email> <password>');
  process.exit(1);
}

function post(url, data, token) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(data);
    const u = new URL(url);
    const opts = {
      hostname: u.hostname,
      path: u.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    };
    const req = https.request(opts, (res) => {
      let d = '';
      res.on('data', (c) => (d += c));
      res.on('end', () => {
        try { resolve(JSON.parse(d)); } catch { resolve({ raw: d }); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  // 1. Login
  console.log('Login...');
  const login = await post(`${API}/auth/login`, { email, password });
  if (!login.token) {
    console.error('Login echoue:', login);
    process.exit(1);
  }
  const token = login.token;
  console.log('Token OK');

  // 2. Load JSON
  const jsonPath = path.resolve(__dirname, 'CRM_R3STO_Unifie.json');
  if (!fs.existsSync(jsonPath)) {
    // Fallback: check parent directories
    const alt = path.resolve(__dirname, '..', '..', 'CRM_R3STO_Unifie.json');
    if (!fs.existsSync(alt)) {
      console.error('Fichier CRM_R3STO_Unifie.json introuvable');
      process.exit(1);
    }
  }
  const data = JSON.parse(fs.readFileSync(
    fs.existsSync(jsonPath) ? jsonPath : path.resolve(__dirname, '..', '..', 'CRM_R3STO_Unifie.json'),
    'utf8'
  ));
  console.log(`${data.length} contacts a importer`);

  // 3. Import par batches de 100
  const BATCH = 100;
  let totalInserted = 0, totalUpdated = 0, totalSkipped = 0;

  for (let i = 0; i < data.length; i += BATCH) {
    const batch = data.slice(i, i + BATCH);
    const result = await post(`${API}/crm/import`, { rows: batch }, token);

    if (result.ok) {
      totalInserted += result.inserted || 0;
      totalUpdated += result.updated || 0;
      totalSkipped += result.skipped || 0;
      console.log(`Batch ${Math.floor(i / BATCH) + 1}/${Math.ceil(data.length / BATCH)} — +${result.inserted} inseres, ~${result.updated} maj, -${result.skipped} ignores`);
    } else {
      console.error(`Batch erreur:`, result);
    }
  }

  console.log('\n════════════════════════════════════');
  console.log(`TERMINE: ${totalInserted} inseres, ${totalUpdated} mis a jour, ${totalSkipped} ignores`);
  console.log(`Total traites: ${data.length}`);
  console.log('════════════════════════════════════');
}

main().catch((e) => {
  console.error('Erreur:', e.message);
  process.exit(1);
});
