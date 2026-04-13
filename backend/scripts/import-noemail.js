#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════
//  Import CRM contacts SANS email (company-based)
//  Usage: node scripts/import-noemail.js <email> <password>
// ═══════════════════════════════════════════════════════════════

const fs = require('fs');
const path = require('path');
const https = require('https');

const API = 'https://api.r3sto.ch/api';
const email = process.argv[2];
const password = process.argv[3];

if (!email || !password) {
  console.log('Usage: node scripts/import-noemail.js <email> <password>');
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
  console.log('Login...');
  const login = await post(`${API}/auth/login`, { email, password });
  if (!login.token) { console.error('Login echoue:', login); process.exit(1); }
  const token = login.token;
  console.log('Token OK');

  const jsonPath = path.resolve(__dirname, 'CRM_R3STO_Unifie.json');
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

  // Filtrer: seulement les contacts SANS email mais AVEC company
  const noEmail = data.filter(r => !r.email && (r.company || r.etablissement || r.societe));
  console.log(`${noEmail.length} contacts sans email a importer (sur ${data.length} total)`);

  // Insérer un par un via POST /crm/contacts (pas /crm/import)
  let ok = 0, skip = 0;
  for (let i = 0; i < noEmail.length; i++) {
    const r = noEmail[i];
    const contact = {
      company: r.company || r.etablissement || r.societe,
      raison_sociale: r.raison_sociale || null,
      first_name: r.first_name || r.contact || r.prenom || null,
      last_name: r.last_name || r.nom || null,
      phone: r.phone || r.telephone || r.tel || null,
      address: r.address || r.adresse || null,
      postal_code: r.postal_code || r.npa || null,
      city: r.city || r.ville || null,
      canton: r.canton || null,
      country: r.country || 'CH',
      website: r.website || r.site_web || null,
      couverts: r.couverts || null,
      type_cuisine: r.type_cuisine || null,
      concurrence: r.concurrence || null,
      source: r.source || 'import',
      status: r.status || 'Prospect',
      notes: r.notes || null,
    };

    const result = await post(`${API}/crm/contacts`, contact, token);
    if (result.ok) ok++;
    else {
      skip++;
      if (skip <= 3) console.log('ERREUR sample:', JSON.stringify(result), '| contact:', JSON.stringify(contact).substring(0, 200));
    }

    if ((i + 1) % 500 === 0) console.log(`${i + 1}/${noEmail.length} — ${ok} ok, ${skip} skip`);
  }

  console.log(`\nTERMINE: ${ok} inseres, ${skip} ignores sur ${noEmail.length}`);
}

main().catch((e) => { console.error('Erreur:', e.message); process.exit(1); });
