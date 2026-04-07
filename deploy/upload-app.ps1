# Upload app.r3sto.ch dist/ via FTP
$ftpHost = "ftp://pl7wy9.ftp.infomaniak.com"
$ftpUser = "pl7wy9_r3sto"
$ftpPass = "RueNeuve20#1081"

$distDir = Join-Path $PSScriptRoot "..\dist"

if (-not (Test-Path $distDir)) {
    Write-Host "ERREUR: Dossier dist introuvable: $distDir" -ForegroundColor Red
    exit 1
}

$cred = New-Object System.Net.NetworkCredential($ftpUser, $ftpPass)
$webclient = New-Object System.Net.WebClient
$webclient.Credentials = $cred

# Upload index.html
$indexFile = Join-Path $distDir "index.html"
if (Test-Path $indexFile) {
    $uri = "$ftpHost/sites/app.r3sto.ch/index.html"
    Write-Host "Upload index.html ..." -ForegroundColor Yellow
    try {
        $webclient.UploadFile($uri, $indexFile)
        Write-Host "OK! index.html uploade." -ForegroundColor Green
    } catch {
        Write-Host "ERREUR: $_" -ForegroundColor Red
    }
}

# Upload assets/
$assetsDir = Join-Path $distDir "assets"
if (Test-Path $assetsDir) {
    Get-ChildItem $assetsDir -File | ForEach-Object {
        $uri = "$ftpHost/sites/app.r3sto.ch/assets/$($_.Name)"
        Write-Host "Upload assets/$($_.Name) ..." -ForegroundColor Yellow
        try {
            $webclient.UploadFile($uri, $_.FullName)
            Write-Host "  OK" -ForegroundColor Green
        } catch {
            Write-Host "  ERREUR: $_" -ForegroundColor Red
        }
    }
}

# Upload other root files (favicon, logo, etc.)
Get-ChildItem $distDir -File | Where-Object { $_.Name -ne "index.html" } | ForEach-Object {
    $uri = "$ftpHost/sites/app.r3sto.ch/$($_.Name)"
    Write-Host "Upload $($_.Name) ..." -ForegroundColor Yellow
    try {
        $webclient.UploadFile($uri, $_.FullName)
        Write-Host "  OK" -ForegroundColor Green
    } catch {
        Write-Host "  ERREUR: $_" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Deploiement termine! Ouvre: https://app.r3sto.ch/?v=$(Get-Date -Format 'HHmmss')" -ForegroundColor Cyan
