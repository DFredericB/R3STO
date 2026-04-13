# R3STO - DEPLOY ALL SITES via FTPS
# Usage: powershell -ExecutionPolicy Bypass -File DEPLOY-NOW.ps1

$ftpHost  = "ftp://pl7wy9.ftp.infomaniak.com"
$ftpUser  = "pl7wy9_r3sto"
$ftpPass  = "a5NDkGSzZ8zU"
$deployDir = $PSScriptRoot

$sites = @(
    "app.r3sto.ch",
    "demo.r3sto.ch",
    "admin.r3sto.ch",
    "booking.r3sto.ch",
    "menu.r3sto.ch",
    "delivery.r3sto.ch",
    "bill.r3sto.ch"
)

$errors = @()
$total = 0
$ok = 0

function Upload-File {
    param([string]$localPath, [string]$remotePath)
    $script:total++
    $name = Split-Path $localPath -Leaf
    try {
        $uri = "$ftpHost/$remotePath"
        $req = [System.Net.FtpWebRequest]::Create($uri)
        $req.Method = [System.Net.WebRequestMethods+Ftp]::UploadFile
        $req.Credentials = New-Object System.Net.NetworkCredential($ftpUser, $ftpPass)
        $req.EnableSsl = $true
        $req.UseBinary = $true
        $req.UsePassive = $true
        $req.KeepAlive = $false
        # Accept any SSL cert (Infomaniak shared hosting)
        [System.Net.ServicePointManager]::ServerCertificateValidationCallback = { $true }
        $content = [System.IO.File]::ReadAllBytes($localPath)
        $req.ContentLength = $content.Length
        $stream = $req.GetRequestStream()
        $stream.Write($content, 0, $content.Length)
        $stream.Close()
        $resp = $req.GetResponse()
        $resp.Close()
        $sz = [math]::Round($content.Length / 1024, 1)
        Write-Host "  OK  $name ($sz KB)" -ForegroundColor Green
        $script:ok++
    } catch {
        Write-Host "  ERR $name : $($_.Exception.Message)" -ForegroundColor Red
        $script:errors += "$remotePath"
    }
}

function Ensure-FtpDir {
    param([string]$path)
    try {
        $req = [System.Net.FtpWebRequest]::Create("$ftpHost/$path/")
        $req.Method = [System.Net.WebRequestMethods+Ftp]::MakeDirectory
        $req.Credentials = New-Object System.Net.NetworkCredential($ftpUser, $ftpPass)
        $req.EnableSsl = $true
        [System.Net.ServicePointManager]::ServerCertificateValidationCallback = { $true }
        $resp = $req.GetResponse()
        $resp.Close()
    } catch {}
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  R3STO - DEPLOY FTPS" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

$i = 0
foreach ($site in $sites) {
    $i++
    $localDir = Join-Path $deployDir $site
    if (-not (Test-Path $localDir)) {
        Write-Host "[$i/$($sites.Count)] SKIP $site (dossier absent)" -ForegroundColor Yellow
        continue
    }

    Write-Host "[$i/$($sites.Count)] $site" -ForegroundColor Cyan
    Write-Host "  ----------------------------------------"

    $remoteSite = "sites/$site"

    # Upload root files
    Get-ChildItem $localDir -File | ForEach-Object {
        Upload-File $_.FullName "$remoteSite/$($_.Name)"
    }

    # Upload assets/ if exists
    $assetsDir = Join-Path $localDir "assets"
    if (Test-Path $assetsDir) {
        Ensure-FtpDir "$remoteSite/assets"
        Get-ChildItem $assetsDir -File | ForEach-Object {
            Upload-File $_.FullName "$remoteSite/assets/$($_.Name)"
        }
    }

    # Upload subdirectories (demo restaurants, etc.)
    Get-ChildItem $localDir -Directory | Where-Object { $_.Name -ne "assets" } | ForEach-Object {
        $subName = $_.Name
        Ensure-FtpDir "$remoteSite/$subName"
        Get-ChildItem $_.FullName -File | ForEach-Object {
            Upload-File $_.FullName "$remoteSite/$subName/$($_.Name)"
        }
    }

    Write-Host ""
}

Write-Host "============================================" -ForegroundColor Green
Write-Host "  RESULTAT: $ok/$total fichiers uploades" -ForegroundColor Green
if ($errors.Count -gt 0) {
    Write-Host "  ERREURS ($($errors.Count)):" -ForegroundColor Red
    $errors | ForEach-Object { Write-Host "    - $_" -ForegroundColor Red }
}
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Tester:" -ForegroundColor Yellow
Write-Host "    https://app.r3sto.ch" -ForegroundColor White
Write-Host "    https://demo.r3sto.ch" -ForegroundColor White
Write-Host ""
