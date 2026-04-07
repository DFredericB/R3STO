# ═══════════════════════════════════════════════════
# R3STO — Deploy API PHP to api.r3sto.ch
# Pure PHP backend — no Node.js required
# ═══════════════════════════════════════════════════

$ftpHost = "ftp://pl7wy9.ftp.infomaniak.com"
$user = "pl7wy9_r3sto"
$pass = "RueNeuve20#1081"

Write-Host ""
Write-Host "=== Deploying api.r3sto.ch (PHP API) ===" -ForegroundColor Cyan

$localDir = "$PSScriptRoot\api.r3sto.ch"
$remoteDir = "/sites/api.r3sto.ch"

# Upload all PHP files + .htaccess
Get-ChildItem $localDir -File | Where-Object { $_.Extension -in '.php', '.htaccess', '' -or $_.Name -eq '.htaccess' } | ForEach-Object {
    $remotePath = "$remoteDir/$($_.Name)"
    $webclient = New-Object System.Net.WebClient
    $webclient.Credentials = New-Object System.Net.NetworkCredential($user, $pass)
    try {
        $webclient.UploadFile("$ftpHost$remotePath", $_.FullName)
        Write-Host "  OK $remotePath" -ForegroundColor Green
    } catch {
        Write-Host "  FAIL $($_.Name): $_" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "=== API DEPLOYEE ===" -ForegroundColor Green
Write-Host "  Etape 1: Initialiser la DB:" -ForegroundColor White
Write-Host "    https://api.r3sto.ch/setup?key=r3sto_setup_2026" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Etape 2: Tester le health check:" -ForegroundColor White
Write-Host "    https://api.r3sto.ch/health" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Login admin: didier@r3sto.com / R3STO2026!" -ForegroundColor Gray
Write-Host ""
