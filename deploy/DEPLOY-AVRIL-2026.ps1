# R3STO - DEPLOIEMENT 5 AVRIL 2026
# Sites: auth, booking, app, demo, r3sto.ch + backend
# Usage: cd deploy puis .\DEPLOY-AVRIL-2026.ps1

param(
    [switch]$DryRun,
    [switch]$BackendOnly,
    [switch]$FrontendOnly
)

$ftpHost  = "ftp://pl7wy9.ftp.infomaniak.com"
$ftpUser  = "pl7wy9_r3sto"
$ftpPass  = "RueNeuve20#1081"
$cred     = New-Object System.Net.NetworkCredential($ftpUser, $ftpPass)
$deployDir = $PSScriptRoot
$errors = @()
$startTime = Get-Date

function WStep {
    param([string]$step, [string]$msg)
    Write-Host ""
    Write-Host "[$step] $msg" -ForegroundColor Cyan
    Write-Host "------------------------------------------------------------" -ForegroundColor DarkGray
}

function MkFtpDir {
    param([string]$path)
    if ($DryRun) { Write-Host "  [DRY] mkdir $path" -ForegroundColor DarkYellow; return }
    try {
        $r = [System.Net.FtpWebRequest]::Create("$ftpHost/$path/")
        $r.Method = [System.Net.WebRequestMethods+Ftp]::MakeDirectory
        $r.Credentials = $cred
        $resp = $r.GetResponse()
        $resp.Close()
    } catch {}
}

function Up {
    param([string]$localPath, [string]$remotePath)
    $nm = Split-Path $localPath -Leaf
    $sz = [math]::Round((Get-Item $localPath).Length / 1024, 1)
    if ($DryRun) {
        Write-Host "  [DRY] $nm -> $remotePath" -ForegroundColor DarkYellow
        return
    }
    try {
        $wc = New-Object System.Net.WebClient
        $wc.Credentials = $cred
        $wc.UploadFile("$ftpHost/$remotePath", $localPath)
        Write-Host "  OK  $nm ($sz KB)" -ForegroundColor Green
    } catch {
        Write-Host "  ERREUR $nm : $_" -ForegroundColor Red
        $script:errors += $remotePath
    }
}

Write-Host ""
Write-Host "========================================================" -ForegroundColor Magenta
Write-Host "  R3STO - DEPLOIEMENT 5 AVRIL 2026" -ForegroundColor Magenta
Write-Host "========================================================" -ForegroundColor Magenta

if ($DryRun) { Write-Host "  MODE DRY RUN" -ForegroundColor Yellow }

if (-not $BackendOnly) {

# 1. AUTH
WStep "1/6" "AUTH -> auth.r3sto.ch"
$sp = "sites/auth.r3sto.ch"
Up (Join-Path $deployDir "auth.r3sto.ch\index.html") "$sp/index.html"
Write-Host "  auth.r3sto.ch DEPLOYE!" -ForegroundColor Green

# 2. BOOKING
WStep "2/6" "BOOKING -> booking.r3sto.ch"
$sp = "sites/booking.r3sto.ch"
Up (Join-Path $deployDir "booking.r3sto.ch\index.html") "$sp/index.html"
Write-Host "  booking.r3sto.ch DEPLOYE!" -ForegroundColor Green

# 3. APP
WStep "3/6" "APP -> app.r3sto.ch"
$sp = "sites/app.r3sto.ch"
MkFtpDir "$sp/assets"
Up (Join-Path $deployDir "app.r3sto.ch\index.html") "$sp/index.html"
Up (Join-Path $deployDir "app.r3sto.ch\assets\index-D8tMj2eY.js") "$sp/assets/index-D8tMj2eY.js"
Up (Join-Path $deployDir "app.r3sto.ch\assets\index-D-m210Na.css") "$sp/assets/index-D-m210Na.css"
$logo = Join-Path $deployDir "app.r3sto.ch\logo-r3sto.jpg"
if (Test-Path $logo) { Up $logo "$sp/logo-r3sto.jpg" }
Write-Host "  app.r3sto.ch DEPLOYE!" -ForegroundColor Green

# 4. DEMO
WStep "4/6" "DEMO -> demo.r3sto.ch"
$sp = "sites/demo.r3sto.ch"
MkFtpDir "$sp/assets"
Up (Join-Path $deployDir "demo.r3sto.ch\.htaccess") "$sp/.htaccess"
Up (Join-Path $deployDir "demo.r3sto.ch\app.html") "$sp/app.html"
Up (Join-Path $deployDir "demo.r3sto.ch\assets\index-D8tMj2eY.js") "$sp/assets/index-D8tMj2eY.js"
Up (Join-Path $deployDir "demo.r3sto.ch\assets\index-D-m210Na.css") "$sp/assets/index-D-m210Na.css"
Get-ChildItem (Join-Path $deployDir "demo.r3sto.ch") -File | Where-Object { $_.Name -notin @('.htaccess','app.html') } | ForEach-Object {
    Up $_.FullName "$sp/$($_.Name)"
}
Write-Host "  demo.r3sto.ch DEPLOYE!" -ForegroundColor Green

# 5. R3STO.CH
WStep "5/6" "LANDING -> r3sto.ch"
$sp = "sites/r3sto.ch"
$ld = Join-Path $deployDir "r3sto.ch"
Up (Join-Path $ld "index.html") "$sp/index.html"

MkFtpDir "$sp/restaurants"
Up (Join-Path $ld "restaurants\index.html") "$sp/restaurants/index.html"

MkFtpDir "$sp/comparatif"
Up (Join-Path $ld "comparatif\index.html") "$sp/comparatif/index.html"

MkFtpDir "$sp/assistant"
Up (Join-Path $ld "assistant\index.html") "$sp/assistant/index.html"

MkFtpDir "$sp/video"
$vd = Join-Path $ld "video"
if (Test-Path $vd) {
    Get-ChildItem $vd -File | ForEach-Object { Up $_.FullName "$sp/video/$($_.Name)" }
}
Write-Host "  r3sto.ch DEPLOYE!" -ForegroundColor Green

}

# 6. BACKEND
if (-not $FrontendOnly) {

WStep "6/6" "BACKEND -> api.r3sto.ch"
$sp = "sites/api.r3sto.ch"
$bd = Join-Path (Split-Path $deployDir -Parent) "backend"

if (-not (Test-Path $bd)) {
    Write-Host "  ERREUR: Dossier backend introuvable" -ForegroundColor Red
} else {
    MkFtpDir $sp
    MkFtpDir "$sp/routes"
    MkFtpDir "$sp/middleware"
    MkFtpDir "$sp/utils"
    MkFtpDir "$sp/data"

    foreach ($f in @("server.js", "db.js", "package.json", ".env")) {
        $lp = Join-Path $bd $f
        if (Test-Path $lp) { Up $lp "$sp/$f" }
    }

    Get-ChildItem (Join-Path $bd "routes") -File -Filter "*.js" | ForEach-Object {
        Up $_.FullName "$sp/routes/$($_.Name)"
    }
    Get-ChildItem (Join-Path $bd "middleware") -File -Filter "*.js" | ForEach-Object {
        Up $_.FullName "$sp/middleware/$($_.Name)"
    }
    $ud = Join-Path $bd "utils"
    if (Test-Path $ud) {
        Get-ChildItem $ud -File -Filter "*.js" | ForEach-Object {
            Up $_.FullName "$sp/utils/$($_.Name)"
        }
    }

    Write-Host "  api.r3sto.ch UPLOADE!" -ForegroundColor Green
    Write-Host ""
    Write-Host "  >> npm install dans Manager Infomaniak puis redemarrer Node" -ForegroundColor Yellow
}

}

# RESUME
$elapsed = (Get-Date) - $startTime
Write-Host ""
Write-Host "========================================================" -ForegroundColor Green
Write-Host "  DEPLOIEMENT TERMINE en $([math]::Round($elapsed.TotalSeconds))s" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Green

if ($errors.Count -gt 0) {
    Write-Host "  Erreurs:" -ForegroundColor Red
    $errors | ForEach-Object { Write-Host "    - $_" -ForegroundColor Red }
} else {
    Write-Host "  Tous les fichiers uploades sans erreur!" -ForegroundColor Green
}

Write-Host ""
Write-Host "  Actions manuelles:" -ForegroundColor Yellow
Write-Host "  1. htpasswd -c ~/.htpasswd-demo admin (via SSH)" -ForegroundColor White
Write-Host "  2. SMTP dans .env: SMTP_USER=noreply@r3sto.ch" -ForegroundColor White
Write-Host "  3. npm install dans Manager Infomaniak" -ForegroundColor White
Write-Host "  4. Redemarrer Node api.r3sto.ch" -ForegroundColor White
Write-Host ""
