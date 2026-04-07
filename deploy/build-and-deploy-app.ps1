# ═══════════════════════════════════════════════════
# R3STO — Build + Deploy app.r3sto.ch
# Usage: clic droit > "Executer avec PowerShell"
#   ou:  .\deploy\build-and-deploy-app.ps1
# ═══════════════════════════════════════════════════

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path $PSScriptRoot -Parent

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  R3STO - Build + Deploy app.r3sto.ch" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# ── 1. Build ──────────────────────────────────────
Write-Host "[1/3] Build en cours..." -ForegroundColor Yellow
Set-Location $projectRoot

# Verifier node_modules
if (-not (Test-Path "node_modules")) {
    Write-Host "  npm install..." -ForegroundColor Gray
    npm install
}

# Build Vite (tsc + vite build)
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERREUR: Build echoue!" -ForegroundColor Red
    Read-Host "Appuie sur Entree pour fermer"
    exit 1
}

$distDir = Join-Path $projectRoot "dist"
if (-not (Test-Path $distDir)) {
    Write-Host "ERREUR: Dossier dist introuvable apres build" -ForegroundColor Red
    Read-Host "Appuie sur Entree pour fermer"
    exit 1
}

$fileCount = (Get-ChildItem $distDir -Recurse -File).Count
Write-Host "  OK! $fileCount fichiers generes" -ForegroundColor Green

# ── 2. Upload FTP ─────────────────────────────────
Write-Host ""
Write-Host "[2/3] Upload vers app.r3sto.ch..." -ForegroundColor Yellow

$ftpHost = "ftp://pl7wy9.ftp.infomaniak.com"
$ftpUser = "pl7wy9_r3sto"
$ftpPass = "RueNeuve20#1081"
$remoteSite = "/sites/app.r3sto.ch"

$cred = New-Object System.Net.NetworkCredential($ftpUser, $ftpPass)
$webclient = New-Object System.Net.WebClient
$webclient.Credentials = $cred

$uploaded = 0
$errors = 0

# Upload index.html
$indexFile = Join-Path $distDir "index.html"
if (Test-Path $indexFile) {
    try {
        $webclient.UploadFile("$ftpHost$remoteSite/index.html", $indexFile)
        Write-Host "  OK index.html" -ForegroundColor Green
        $uploaded++
    } catch {
        Write-Host "  FAIL index.html: $_" -ForegroundColor Red
        $errors++
    }
}

# Upload assets/
$assetsDir = Join-Path $distDir "assets"
if (Test-Path $assetsDir) {
    Get-ChildItem $assetsDir -File | ForEach-Object {
        try {
            $webclient.UploadFile("$ftpHost$remoteSite/assets/$($_.Name)", $_.FullName)
            Write-Host "  OK assets/$($_.Name)" -ForegroundColor Green
            $uploaded++
        } catch {
            Write-Host "  FAIL assets/$($_.Name): $_" -ForegroundColor Red
            $errors++
        }
    }
}

# Upload other root files (favicon, logo, etc.)
Get-ChildItem $distDir -File | Where-Object { $_.Name -ne "index.html" } | ForEach-Object {
    try {
        $webclient.UploadFile("$ftpHost$remoteSite/$($_.Name)", $_.FullName)
        Write-Host "  OK $($_.Name)" -ForegroundColor Green
        $uploaded++
    } catch {
        Write-Host "  FAIL $($_.Name): $_" -ForegroundColor Red
        $errors++
    }
}

# ── 3. Resultat ───────────────────────────────────
Write-Host ""
Write-Host "[3/3] Resultat:" -ForegroundColor Yellow
Write-Host "  Uploades: $uploaded fichiers" -ForegroundColor Green
if ($errors -gt 0) {
    Write-Host "  Erreurs:  $errors fichiers" -ForegroundColor Red
}

$cacheBust = Get-Date -Format "HHmmss"
$url = "https://app.r3sto.ch/?v=$cacheBust"
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  DEPLOY OK!" -ForegroundColor Green
Write-Host "  $url" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Ouvrir dans le navigateur
Start-Process $url

Read-Host "Appuie sur Entree pour fermer"
