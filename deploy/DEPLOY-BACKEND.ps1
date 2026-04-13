# ╔══════════════════════════════════════════════════════════════════════╗
# ║  R3STO - Deploy backend modulaire complet                            ║
# ║                                                                      ║
# ║  - Sync src/, package.json, server.js via pscp -r                    ║
# ║  - npm install --omit=dev sur le serveur                             ║
# ║  - Restart Node (touch tmp/restart.txt + SIGHUP)                     ║
# ║  - Test /api/health                                                  ║
# ║                                                                      ║
# ║  N.B. : .env n'est PAS poussé (déjà présent côté serveur).           ║
# ║  Pour le mettre à jour : scp manuel ou Manager Infomaniak.           ║
# ╚══════════════════════════════════════════════════════════════════════╝

$ErrorActionPreference = 'Stop'

$user    = 'pl7wy9_r3sto'
$pass    = 'RueNeuve20#1081'
$sshHost = 'pl7wy9.ftp.infomaniak.com'
$remote  = '/srv/customer/sites/api.r3sto.ch'
$localBackend = Join-Path $PSScriptRoot '..\backend'

if (-not (Test-Path $localBackend)) {
  Write-Host "ERREUR: $localBackend introuvable" -ForegroundColor Red; exit 1
}

# Fichiers / dossiers à pousser (jamais .env, jamais node_modules)
$itemsToPush = @(
  'server.js',
  'package.json',
  'src'
)

Write-Host "=== 1/5 Push backend (src/, server.js, package.json) ===" -ForegroundColor Cyan
foreach ($item in $itemsToPush) {
  $localPath = Join-Path $localBackend $item
  if (-not (Test-Path $localPath)) {
    Write-Host "  - SKIP $item (absent en local)" -ForegroundColor Yellow
    continue
  }
  Write-Host "  -> $item" -ForegroundColor Gray
  & pscp -batch -r -pw $pass $localPath "${user}@${sshHost}:${remote}/"
  if ($LASTEXITCODE -ne 0) { Write-Host "ERREUR pscp sur $item" -ForegroundColor Red; exit 1 }
}

# Bootstrap nvm pour SSH non-interactive (Infomaniak)
$nvmInit = 'export NVM_DIR="$HOME/.nvm" ; [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" >/dev/null 2>&1 ; nvm use default >/dev/null 2>&1 || true ; which node ; node -v'

Write-Host ""
Write-Host "=== 2/5 npm install --omit=dev ===" -ForegroundColor Cyan
$installCmd = "$nvmInit ; cd ~/sites/api.r3sto.ch && npm install --omit=dev --no-audit --no-fund 2>&1 | tail -25"
& plink -batch -pw $pass "${user}@${sshHost}" $installCmd
if ($LASTEXITCODE -ne 0) { Write-Host "Avertissement npm install" -ForegroundColor Yellow }

Write-Host ""
Write-Host "=== 3/5 Migrations DB ===" -ForegroundColor Cyan
$migrateCmd = "$nvmInit ; cd ~/sites/api.r3sto.ch && node src/db/migrate.js 2>&1 | tail -40"
& plink -batch -pw $pass "${user}@${sshHost}" $migrateCmd
if ($LASTEXITCODE -ne 0) { Write-Host "Avertissement migrate" -ForegroundColor Yellow }

Write-Host ""
Write-Host "=== 4/5 Restart Node ===" -ForegroundColor Cyan
$restartCmd = "cd ~/sites/api.r3sto.ch && (mkdir -p tmp && touch tmp/restart.txt) ; pkill -HUP -f 'node.*server' 2>/dev/null ; pkill -f 'node.*server' 2>/dev/null ; sleep 1 ; ls -la src/ 2>/dev/null | head -10 ; ls -la server.js package.json"
& plink -batch -pw $pass "${user}@${sshHost}" $restartCmd
if ($LASTEXITCODE -ne 0) { Write-Host "Avertissement plink" -ForegroundColor Yellow }

Write-Host ""
Write-Host "=== 5/5 Test /api/health ===" -ForegroundColor Cyan
Start-Sleep -Seconds 4
try {
  $h = Invoke-RestMethod -Uri https://api.r3sto.ch/api/health -SkipCertificateCheck -TimeoutSec 15
  Write-Host "OK /api/health :" -ForegroundColor Green
  $h | ConvertTo-Json -Depth 5
} catch {
  Write-Host "FAIL /api/health : $_" -ForegroundColor Red
  Write-Host "Verifie le Node Manager Infomaniak (logs + restart manuel si besoin)" -ForegroundColor Yellow
}
