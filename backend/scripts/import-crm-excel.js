#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════
//  R3STO — Import CRM Excel → API
//  Lit le fichier CRM_R3STO_Unifie.xlsx et envoie les contacts
//  par batch vers POST /crm/import
//
//  Usage : node scripts/import-crm-excel.js [--dry-run]
//  Nécessite : npm install xlsx (ou exceljs)
// ═══════════════════════════════════════════════════════════════

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Config
const API_BASE = process.env.API_BASE || 'https://api.r3sto.ch';
const TOKEN = process.env.API_TOKEN || ''; // JWT token superadmin
const BATCH_SIZE = 100;
const DRY_RUN = process.argv.includes('--dry-run');

// Lire le fichier Excel via le module xlsx (fallback: JSON pré-exporté)
async function readExcel(filePath) {
  try {
    const XLSX = require('xlsx');
    const wb = XLSX.readFile(filePath);
    const ws = wb.Sheets[wb.SheetNames[0]]; // CRM Complet
    return XLSX.utils.sheet_to_json(ws);
  } catch {
    // Fallback: lire le JSON pré-exporté
    const jsonPath = filePath.replace('.xlsx', '.json');
    if (fs.existsSync(jsonPath)) {
      return JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
    }
    throw new Error('xlsx module non installé et pas de fichier JSON de fallback');
  }
}

// Mapper les colonnes Excel → champs API
function mapRow(row) {
  return {
    company: row['Établissement'] || row['etablissement'] || null,
    raison_sociale: row['Raison sociale'] || row['raison_sociale'] || null,
    first_name: (row['Contact'] || row['contact'] || '').split(' ')[0] || null,
    last_name: (row['Contact'] || row['contact'] || '').split(' ').slice(1).join(' ') || null,
    email: row['Email'] || row['email'] || null,
    phone: row['Téléphone'] || row['telephone'] || null,
    address: row['Adresse'] || row['adresse'] || null,
    postal_code: row['NPA'] || row['npa'] || null,
    city: row['Ville'] || row['ville'] || null,
    canton: row['Canton'] || row['canton'] || null,
    country: row['Pays'] || row['pays'] || 'CH',
    website: row['Site web'] || row['site_web'] || null,
    couverts: row['Couverts'] || row['couverts'] || null,
    type_cuisine: row['Type cuisine'] || row['type_cuisine'] || null,
    concurrence: row['Concurrence'] || row['concurrence'] || null,
    status: row['Statut'] || row['statut'] || 'Prospect',
    source: row['Source'] || row['source'] || 'import',
    notes: row['Notes'] || row['notes'] || null,
    date_contact: row['Date contact'] || row['date_contact'] || null,
  };
}

// Envoyer un batch vers l'API
function postBatch(rows) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ rows });
    const url = new URL(`${API_BASE}/crm/import`);
    const mod = url.protocol === 'https:' ? https : http;
    const req = mod.request({
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        'Authorization': `Bearer ${TOKEN}`,
      },
    }, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); } catch { resolve({ error: body }); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function main() {
  const xlsxPath = process.argv[2] || path.resolve(__dirname, 'CRM_R3STO_Unifie.xlsx');
  console.log(`📄 Lecture: ${xlsxPath}`);

  const rows = await readExcel(xlsxPath);
  console.log(`📊 ${rows.length} lignes lues`);

  const mapped = rows.map(mapRow).filter(r => r.email || r.company);
  console.log(`🔧 ${mapped.length} contacts valides`);

  if (DRY_RUN) {
    console.log('\n🏁 DRY RUN — pas d\'envoi');
    console.log(`  Exemples:`);
    mapped.slice(0, 3).forEach(r => console.log(`  ${r.company || '?'} | ${r.email || 'no-email'} | ${r.city || '?'} | ${r.status}`));
    return;
  }

  if (!TOKEN) {
    console.error('❌ API_TOKEN requis. Lancez avec: API_TOKEN=xxx node scripts/import-crm-excel.js');
    process.exit(1);
  }

  let totalInserted = 0, totalUpdated = 0, totalSkipped = 0;
  for (let i = 0; i < mapped.length; i += BATCH_SIZE) {
    const batch = mapped.slice(i, i + BATCH_SIZE);
    const result = await postBatch(batch);
    if (result.ok) {
      totalInserted += result.inserted || 0;
      totalUpdated += result.updated || 0;
      totalSkipped += result.skipped || 0;
    } else {
      console.error(`❌ Batch ${i}-${i + batch.length}: ${result.error || JSON.stringify(result)}`);
      totalSkipped += batch.length;
    }
    process.stdout.write(`\r  ${Math.min(i + BATCH_SIZE, mapped.length)}/${mapped.length}`);
  }

  console.log(`\n\n✅ Import terminé:`);
  console.log(`  Insérés: ${totalInserted}`);
  console.log(`  Mis à jour: ${totalUpdated}`);
  console.log(`  Ignorés: ${totalSkipped}`);
  console.log(`  Total: ${mapped.length}`);
}

main().catch(e => { console.error('💥', e); process.exit(1); });
