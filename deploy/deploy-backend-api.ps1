$ftpHost = "ftp://pl7wy9.ftp.infomaniak.com"
$ftpUser = "pl7wy9_r3sto"
$ftpPass = "RueNeuve20#1081"
$sitePath = "sites/api.r3sto.ch"

$backendDir = Join-Path $PSScriptRoot "..\backend"

if (-not (Test-Path $backendDir)) {
    Write-Host "ERREUR: Dossier backend introuvable: $backendDir" -ForegroundColor Red
    exit 1
}

$cred = New-Object System.Net.NetworkCredential($ftpUser, $ftpPass)

function New-FtpDir($path) {
    try {
        $req = [System.Net.FtpWebRequest]::Create("$ftpHost/$path/")
        $req.Method = [System.Net.WebRequestMethods+Ftp]::MakeDirectory
        $req.Credentials = $cred
        $resp = $req.GetResponse()
        $resp.Close()
        Write-Host "  + Dossier cree: $path" -ForegroundColor DarkGray
    } catch {}
}

function Upload-File($localPath, $remotePath) {
    try {
        $wc = New-Object System.Net.WebClient
        $wc.Credentials = $cred
        $wc.UploadFile("$ftpHost/$remotePath", $localPath)
        $name = Split-Path $localPath -Leaf
        Write-Host "  OK  $name" -ForegroundColor Green
    } catch {
        Write-Host "  ERREUR $remotePath : $_" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "=== R3STO Backend -> api.r3sto.ch ===" -ForegroundColor Cyan
Write-Host ""

Write-Host "[1/4] Creation des dossiers..." -ForegroundColor Yellow
New-FtpDir $sitePath
New-FtpDir "$sitePath/routes"
New-FtpDir "$sitePath/middleware"
New-FtpDir "$sitePath/data"

Write-Host "[2/4] Upload fichiers racine..." -ForegroundColor Yellow
$rootFiles = @("server.js", "db.js", "package.json", ".env")
foreach ($file in $rootFiles) {
    $localPath = Join-Path $backendDir $file
    if (Test-Path $localPath) {
        Upload-File $localPath "$sitePath/$file"
    } else {
        Write-Host "  SKIP $file (introuvable)" -ForegroundColor DarkYellow
    }
}

Write-Host "[3/4] Upload routes..." -ForegroundColor Yellow
$routesDir = Join-Path $backendDir "routes"
if (Test-Path $routesDir) {
    Get-ChildItem $routesDir -File -Filter "*.js" | ForEach-Object {
        Upload-File $_.FullName "$sitePath/routes/$($_.Name)"
    }
}

Write-Host "[4/4] Upload middleware..." -ForegroundColor Yellow
$middlewareDir = Join-Path $backendDir "middleware"
if (Test-Path $middlewareDir) {
    Get-ChildItem $middlewareDir -File -Filter "*.js" | ForEach-Object {
        Upload-File $_.FullName "$sitePath/middleware/$($_.Name)"
    }
}

Write-Host ""
Write-Host "=== Backend uploade! ===" -ForegroundColor Green
Write-Host "Prochaine etape: npm install dans Manager Infomaniak" -ForegroundColor White
Write-Host "Test: https://api.r3sto.ch/api" -ForegroundColor Cyan
Write-Host ""
