# ═══════════════════════════════════════════════════
# R3STO — Deploy admin.r3sto.ch v6
# Admin Console — Design system identique à app.r3sto.ch
# ═══════════════════════════════════════════════════

$ftpHost = "ftp://pl7wy9.ftp.infomaniak.com"
$user = "pl7wy9_r3sto"
$pass = "RueNeuve20#1081"
$webclient = New-Object System.Net.WebClient
$webclient.Credentials = New-Object System.Net.NetworkCredential($user, $pass)

Write-Host ""
Write-Host "=== Deploying admin.r3sto.ch v6 ===" -ForegroundColor Cyan

# Upload index.html
try {
    $webclient.UploadFile("$ftpHost/sites/admin.r3sto.ch/index.html", "$PSScriptRoot\admin.r3sto.ch\index.html")
    Write-Host "  OK /sites/admin.r3sto.ch/index.html" -ForegroundColor Green
} catch {
    Write-Host "  FAIL index.html: $_" -ForegroundColor Red
}

# Upload .htaccess
try {
    $webclient.UploadFile("$ftpHost/sites/admin.r3sto.ch/.htaccess", "$PSScriptRoot\admin.r3sto.ch\.htaccess")
    Write-Host "  OK /sites/admin.r3sto.ch/.htaccess" -ForegroundColor Green
} catch {
    Write-Host "  FAIL .htaccess: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== ADMIN v6 DEPLOYE ===" -ForegroundColor Green
Write-Host "  https://admin.r3sto.ch" -ForegroundColor Cyan
Write-Host "  Login: didier@r3sto.com / admin2026" -ForegroundColor Gray
Write-Host ""
