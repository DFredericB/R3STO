# ╔══════════════════════════════════════════════════════════════════════╗
# ║  R3STO - Deploy API auto : push server.js + restart Node + test     ║
# ║  Plus besoin du terminal SSH web Infomaniak                         ║
# ╚══════════════════════════════════════════════════════════════════════╝

$ErrorActionPreference = 'Stop'

$user      = 'pl7wy9_r3sto'
$pass      = 'RueNeuve20#1081'
$sshHost   = 'pl7wy9.ftp.infomaniak.com'
$remote    = 'sites/api.r3sto.ch/server.js'
$local     = Join-Path $PSScriptRoot 'api.r3sto.ch-node\server.js'

if (-not (Test-Path $local)) { Write-Host "ERREUR: $local introuvable" -ForegroundColor Red; exit 1 }

Write-Host "=== 1/3 Push server.js via pscp ===" -ForegroundColor Cyan
& pscp -batch -pw $pass $local "${user}@${sshHost}:$remote"
if ($LASTEXITCODE -ne 0) { Write-Host "ERREUR pscp" -ForegroundColor Red; exit 1 }

Write-Host ""
Write-Host "=== 2/3 Restart Node via plink ===" -ForegroundColor Cyan
# Infomaniak Node.js : touch tmp/restart.txt OU kill -HUP du process node
$restartCmd = "cd ~/sites/api.r3sto.ch && (mkdir -p tmp && touch tmp/restart.txt) ; pkill -HUP -f 'node.*server.js' 2>/dev/null ; wc -l server.js"
& plink -batch -pw $pass "${user}@${sshHost}" $restartCmd
if ($LASTEXITCODE -ne 0) { Write-Host "Avertissement plink" -ForegroundColor Yellow }

Write-Host ""
Write-Host "=== 3/3 Test /api/health ===" -ForegroundColor Cyan
Start-Sleep -Seconds 3
try {
  $h = Invoke-RestMethod -Uri https://api.r3sto.ch/api/health -SkipCertificateCheck -TimeoutSec 10
  Write-Host "OK /api/health :" -ForegroundColor Green
  $h | ConvertTo-Json -Depth 5
} catch {
  Write-Host "FAIL /api/health : $_" -ForegroundColor Red
  Write-Host "Si Route non trouvee : redemarre manuellement Node dans Manager Infomaniak" -ForegroundColor Yellow
}
