$ftpHost = "ftp://pl7wy9.ftp.infomaniak.com"
$ftpUser = "pl7wy9_r3sto"
$ftpPass = "RueNeuve20#1081"

$zipFile = Join-Path $PSScriptRoot "..\dist\backend.zip"

if (-not (Test-Path $zipFile)) {
    Write-Host "ERREUR: backend.zip introuvable: $zipFile" -ForegroundColor Red
    exit 1
}

$cred = New-Object System.Net.NetworkCredential($ftpUser, $ftpPass)
$wc = New-Object System.Net.WebClient
$wc.Credentials = $cred

Write-Host "Upload backend.zip vers app.r3sto.ch..." -ForegroundColor Yellow
try {
    $wc.UploadFile("$ftpHost/sites/app.r3sto.ch/backend.zip", $zipFile)
    Write-Host "OK! backend.zip uploade." -ForegroundColor Green
    Write-Host ""
    Write-Host "Maintenant dans la console SSH Infomaniak, tape:" -ForegroundColor Cyan
    Write-Host "  cd ~/sites/api.r3sto.ch/" -ForegroundColor White
    Write-Host "  wget https://app.r3sto.ch/backend.zip" -ForegroundColor White
    Write-Host "  unzip -o backend.zip" -ForegroundColor White
    Write-Host "  rm backend.zip" -ForegroundColor White
    Write-Host "  ls" -ForegroundColor White
} catch {
    Write-Host "ERREUR: $_" -ForegroundColor Red
}
