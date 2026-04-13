# ╔══════════════════════════════════════════════════════════════════════╗
# ║  R3STO - NETTOYAGE + DEPLOIEMENT API (MariaDB)                     ║
# ║  Supprime TOUT dans api.r3sto.ch puis uploade le bon backend       ║
# ╚══════════════════════════════════════════════════════════════════════╝

$ftpHost  = "ftp://pl7wy9.ftp.infomaniak.com"
$ftpUser  = "pl7wy9_r3sto"
$ftpPass  = "RueNeuve20#1081"
$cred     = New-Object System.Net.NetworkCredential($ftpUser, $ftpPass)
$sitePath = "sites/api.r3sto.ch"

$apiNodeDir = Join-Path $PSScriptRoot "api.r3sto.ch-node"

function Delete-FtpFile($remotePath) {
    try {
        $req = [System.Net.FtpWebRequest]::Create("$ftpHost/$remotePath")
        $req.Method = [System.Net.WebRequestMethods+Ftp]::DeleteFile
        $req.Credentials = $cred
        $resp = $req.GetResponse()
        $resp.Close()
        Write-Host "  DEL  $remotePath" -ForegroundColor DarkRed
    } catch {
        # File might not exist, ignore
    }
}

function Delete-FtpDir($remotePath) {
    try {
        $req = [System.Net.FtpWebRequest]::Create("$ftpHost/$remotePath/")
        $req.Method = [System.Net.WebRequestMethods+Ftp]::RemoveDirectory
        $req.Credentials = $cred
        $resp = $req.GetResponse()
        $resp.Close()
        Write-Host "  RMDIR  $remotePath" -ForegroundColor DarkRed
    } catch {}
}

function List-FtpDir($remotePath) {
    try {
        $req = [System.Net.FtpWebRequest]::Create("$ftpHost/$remotePath/")
        $req.Method = [System.Net.WebRequestMethods+Ftp]::ListDirectory
        $req.Credentials = $cred
        $resp = $req.GetResponse()
        $reader = New-Object System.IO.StreamReader($resp.GetResponseStream())
        $list = @()
        while (-not $reader.EndOfStream) {
            $line = $reader.ReadLine()
            if ($line -and $line -ne "." -and $line -ne "..") {
                $list += $line
            }
        }
        $reader.Close()
        $resp.Close()
        return $list
    } catch {
        return @()
    }
}

function Upload-File($localPath, $remotePath) {
    $name = Split-Path $localPath -Leaf
    $sizeKB = [math]::Round((Get-Item $localPath).Length / 1024, 1)
    try {
        $wc = New-Object System.Net.WebClient
        $wc.Credentials = $cred
        $wc.UploadFile("$ftpHost/$remotePath", $localPath)
        Write-Host "  OK  $name ($sizeKB KB)" -ForegroundColor Green
    } catch {
        Write-Host "  ERREUR $name : $_" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "=== ETAPE 1: Nettoyage api.r3sto.ch ===" -ForegroundColor Yellow

# Supprimer les fichiers connus de l'ancien deploiement
$filesToDelete = @(
    "server.js", "db.js", "package.json", "package-lock.json",
    ".env", "setup.js", "server-bundle.js", "bundle.b64",
    "r3sto-bundle.tgz", "_app.mjs"
)

foreach ($file in $filesToDelete) {
    Delete-FtpFile "$sitePath/$file"
}

# Supprimer les sous-dossiers connus
$dirsToClean = @("routes", "middleware", "data", "r3sto-bundle", "node_modules")
foreach ($dir in $dirsToClean) {
    # Lister et supprimer les fichiers dedans
    $items = List-FtpDir "$sitePath/$dir"
    foreach ($item in $items) {
        Delete-FtpFile "$sitePath/$dir/$item"
    }
    Delete-FtpDir "$sitePath/$dir"
}

Write-Host ""
Write-Host "=== ETAPE 2: Upload backend MariaDB ===" -ForegroundColor Yellow

# Upload les 2 fichiers du bon backend
Upload-File (Join-Path $apiNodeDir "server.js") "$sitePath/server.js"
Upload-File (Join-Path $apiNodeDir "package.json") "$sitePath/package.json"

Write-Host ""
Write-Host "=== DEPLOIEMENT API TERMINE ===" -ForegroundColor Green
Write-Host ""
Write-Host "  Maintenant dans Infomaniak:" -ForegroundColor White
Write-Host "  1. Consoles > Construction > Lancer (npm install)" -ForegroundColor White
Write-Host "  2. Consoles > Application > Lancer" -ForegroundColor White
Write-Host "  3. Tester: https://api.r3sto.ch/health" -ForegroundColor Cyan
Write-Host ""
