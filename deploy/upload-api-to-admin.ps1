$ftpHost = "ftp://pl7wy9.ftp.infomaniak.com"
$user = "pl7wy9_r3sto"
$pass = "RueNeuve20#1081"
$localDir = "$PSScriptRoot\api.r3sto.ch-node"
$remoteDir = "/sites/admin.r3sto.ch"

Write-Host "=== Upload API files to admin.r3sto.ch ===" -ForegroundColor Cyan

$webclient = New-Object System.Net.WebClient
$webclient.Credentials = New-Object System.Net.NetworkCredential($user, $pass)

try {
    $webclient.UploadFile("$ftpHost$remoteDir/api-server.js", "$localDir\server.js")
    Write-Host "  OK api-server.js" -ForegroundColor Green
} catch {
    Write-Host "  FAIL: $_" -ForegroundColor Red
}

try {
    $webclient.UploadFile("$ftpHost$remoteDir/api-package.json", "$localDir\package.json")
    Write-Host "  OK api-package.json" -ForegroundColor Green
} catch {
    Write-Host "  FAIL: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== DONE ===" -ForegroundColor Green
Write-Host "Fichiers accessibles sur:" -ForegroundColor Yellow
Write-Host "  https://admin.r3sto.ch/api-server.js" -ForegroundColor Cyan
Write-Host "  https://admin.r3sto.ch/api-package.json" -ForegroundColor Cyan
