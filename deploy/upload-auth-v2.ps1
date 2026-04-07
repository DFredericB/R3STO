# Upload auth.r3sto.ch via FTP - with verification
$ftpHost = "ftp://pl7wy9.ftp.infomaniak.com"
$ftpUser = "pl7wy9_r3sto"
$ftpPass = "RueNeuve20#1081"

$localFile = Join-Path $PSScriptRoot "auth.r3sto.ch\index.html"

if (-not (Test-Path $localFile)) {
    Write-Host "ERREUR: Fichier introuvable: $localFile" -ForegroundColor Red
    exit 1
}

$fileSize = (Get-Item $localFile).Length
Write-Host "Fichier local: $localFile ($fileSize bytes)" -ForegroundColor Cyan

$cred = New-Object System.Net.NetworkCredential($ftpUser, $ftpPass)
$webclient = New-Object System.Net.WebClient
$webclient.Credentials = $cred

# Upload
$uri = "$ftpHost/sites/auth.r3sto.ch/index.html"
Write-Host "Upload vers: $uri ..." -ForegroundColor Yellow
try {
    $webclient.UploadFile($uri, $localFile)
    Write-Host "OK! Upload reussi." -ForegroundColor Green
    Write-Host "Ouvre: https://auth.r3sto.ch/?v=$(Get-Date -Format 'HHmmss')" -ForegroundColor Cyan
} catch {
    Write-Host "ERREUR FTP: $_" -ForegroundColor Red
}
