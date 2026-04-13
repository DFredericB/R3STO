# ╔══════════════════════════════════════════════════════════════════╗
# ║  FIX RAPIDE - Deployer demo.r3sto.ch depuis dist/              ║
# ║  Usage: .\DEPLOY-DEMO-FIX.ps1                                  ║
# ╚══════════════════════════════════════════════════════════════════╝

$ftpHost  = "ftp://pl7wy9.ftp.infomaniak.com"
$ftpUser  = "pl7wy9_r3sto"
$ftpPass  = "RueNeuve20#1081"
$cred     = New-Object System.Net.NetworkCredential($ftpUser, $ftpPass)

$projectRoot = Split-Path $PSScriptRoot -Parent
$distDir     = Join-Path $projectRoot "dist"
$demoDir     = Join-Path $PSScriptRoot "demo.r3sto.ch"
$sitePath    = "sites/demo.r3sto.ch"

function Upload-File($localPath, $remotePath) {
    $name = Split-Path $localPath -Leaf
    $size = [math]::Round((Get-Item $localPath).Length / 1024, 1)
    try {
        $wc = New-Object System.Net.WebClient
        $wc.Credentials = $cred
        $wc.UploadFile("$ftpHost/$remotePath", $localPath)
        Write-Host "  OK  $name ($size KB)" -ForegroundColor Green
    } catch {
        Write-Host "  ERREUR $name : $_" -ForegroundColor Red
    }
}

function New-FtpDir($path) {
    try {
        $req = [System.Net.FtpWebRequest]::Create("$ftpHost/$path/")
        $req.Method = [System.Net.WebRequestMethods+Ftp]::MakeDirectory
        $req.Credentials = $cred
        $resp = $req.GetResponse(); $resp.Close()
    } catch {}
}

Write-Host ""
Write-Host "=== DEPLOIEMENT demo.r3sto.ch ===" -ForegroundColor Cyan
Write-Host ""

# 1. Creer les dossiers
New-FtpDir $sitePath
New-FtpDir "$sitePath/assets"

# 2. index.html depuis DIST (meme que app.r3sto.ch)
Write-Host "  Upload index.html (depuis dist/)..." -ForegroundColor Gray
Upload-File (Join-Path $distDir "index.html") "$sitePath/index.html"

# 3. .htaccess SPA routing
Write-Host "  Upload .htaccess..." -ForegroundColor Gray
Upload-File (Join-Path $demoDir ".htaccess") "$sitePath/.htaccess"

# 4. Assets JS/CSS depuis DIST
Write-Host "  Upload assets JS/CSS (depuis dist/)..." -ForegroundColor Gray
Get-ChildItem (Join-Path $distDir "assets") -File | ForEach-Object {
    Upload-File $_.FullName "$sitePath/assets/$($_.Name)"
}

# 5. Fichiers statiques depuis dist/ (favicon, icons, logo)
Write-Host "  Upload fichiers statiques (dist/)..." -ForegroundColor Gray
Get-ChildItem $distDir -File | Where-Object { $_.Name -ne "index.html" } | ForEach-Object {
    Upload-File $_.FullName "$sitePath/$($_.Name)"
}

# 6. Fichiers specifiques demo (presentation.html, r3sto-phone.js, logo)
Write-Host "  Upload fichiers demo specifiques..." -ForegroundColor Gray
Get-ChildItem $demoDir -File | Where-Object {
    $_.Name -ne "index.html" -and $_.Name -ne ".htaccess"
} | ForEach-Object {
    Upload-File $_.FullName "$sitePath/$($_.Name)"
}

# 7. Sous-dossier legourmet/
$legourmet = Join-Path $demoDir "legourmet"
if (Test-Path $legourmet) {
    New-FtpDir "$sitePath/legourmet"
    Get-ChildItem $legourmet -File | ForEach-Object {
        Upload-File $_.FullName "$sitePath/legourmet/$($_.Name)"
    }
}

Write-Host ""
Write-Host "demo.r3sto.ch DEPLOYE!" -ForegroundColor Green
Write-Host "Verifie: https://demo.r3sto.ch" -ForegroundColor Yellow
