# ╔══════════════════════════════════════════════════════════════════════╗
# ║  R3STO - FIX: Re-deployer le bon backend (MariaDB) sur api.r3sto.ch║
# ║  Lance depuis: Desktop\R3STO\deploy\                               ║
# ║    .\FIX-API-DEPLOY.ps1                                           ║
# ╚══════════════════════════════════════════════════════════════════════╝

$ftpHost  = "ftp://pl7wy9.ftp.infomaniak.com"
$ftpUser  = "pl7wy9_r3sto"
$ftpPass  = "RueNeuve20#1081"
$cred     = New-Object System.Net.NetworkCredential($ftpUser, $ftpPass)

$apiNodeDir = Join-Path $PSScriptRoot "api.r3sto.ch-node"
$sitePath   = "sites/api.r3sto.ch"

function Upload-File($localPath, $remotePath) {
    $name = Split-Path $localPath -Leaf
    $sizeKB = [math]::Round((Get-Item $localPath).Length / 1024, 1)
    try {
        $wc = New-Object System.Net.WebClient
        $wc.Credentials = $cred
        $wc.UploadFile("$ftpHost/$remotePath", $localPath)
        Write-Host "  OK  $name ($sizeKB KB)" -ForegroundColor Green
    } catch {
        Write-Host "  ERREUR $name : $_" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "=== FIX API: Deploiement backend MariaDB ===" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path $apiNodeDir)) {
    Write-Host "ERREUR: Dossier api.r3sto.ch-node introuvable!" -ForegroundColor Red
    exit 1
}

# Upload server.js (le vrai backend MariaDB/CommonJS)
Write-Host "[1/2] Upload server.js + package.json..." -ForegroundColor Yellow
Upload-File (Join-Path $apiNodeDir "server.js") "$sitePath/server.js"
Upload-File (Join-Path $apiNodeDir "package.json") "$sitePath/package.json"

# Supprimer les fichiers ESM qui ne servent plus
Write-Host ""
Write-Host "[2/2] Upload termine!" -ForegroundColor Green
Write-Host ""
Write-Host "=== PROCHAINES ETAPES ===" -ForegroundColor Yellow
Write-Host ""
Write-Host "  1. Va dans Infomaniak Manager > api.r3sto.ch" -ForegroundColor White
Write-Host "  2. Lance: npm install" -ForegroundColor White
Write-Host "  3. Configure le point d'entree: server.js" -ForegroundColor White
Write-Host "  4. Port: 8080 (ou celui assigne par Infomaniak)" -ForegroundColor White
Write-Host "  5. Redemarre l'application Node.js" -ForegroundColor White
Write-Host "  6. Teste: https://api.r3sto.ch/health" -ForegroundColor White
Write-Host ""
Write-Host "  Si tout est OK, lance ensuite:" -ForegroundColor Gray
Write-Host "  https://api.r3sto.ch/setup?key=r3sto_setup_2026" -ForegroundColor Cyan
Write-Host "  (initialise les tables dans MariaDB)" -ForegroundColor Gray
Write-Host ""
