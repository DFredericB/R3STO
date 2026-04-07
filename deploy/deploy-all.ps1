# ═══════════════════════════════════════════════════
# R3STO — Deploy all sites to Infomaniak FTP
# ═══════════════════════════════════════════════════

$ftpHost = "ftp://pl7wy9.ftp.infomaniak.com"
$user = "pl7wy9_r3sto"
$pass = "RueNeuve20#1081"
$deployDir = "$PSScriptRoot"

function Upload-File($localPath, $remotePath) {
    $uri = "$ftpHost$remotePath"
    $webclient = New-Object System.Net.WebClient
    $webclient.Credentials = New-Object System.Net.NetworkCredential($user, $pass)
    try {
        $webclient.UploadFile($uri, $localPath)
        Write-Host "  OK $remotePath" -ForegroundColor Green
    } catch {
        Write-Host "  FAIL $remotePath : $_" -ForegroundColor Red
    }
}

$sites = @(
    "admin.r3sto.ch",
    "auth.r3sto.ch",
    "booking.r3sto.ch",
    "bill.r3sto.ch",
    "menu.r3sto.ch",
    "demo.r3sto.ch"
)

foreach ($site in $sites) {
    $localDir = Join-Path $deployDir $site
    if (!(Test-Path $localDir)) {
        Write-Host "SKIP $site (dossier introuvable)" -ForegroundColor Yellow
        continue
    }
    Write-Host ""
    Write-Host "=== Deploying $site ===" -ForegroundColor Cyan
    $remoteSiteDir = "/sites/$site"

    # Upload all files in the site directory
    Get-ChildItem $localDir -File | ForEach-Object {
        $remotePath = "$remoteSiteDir/$($_.Name)"
        Upload-File $_.FullName $remotePath
    }
}

Write-Host ""
Write-Host "=== DEPLOY TERMINE ===" -ForegroundColor Green
Write-Host "Testez vos sites :" -ForegroundColor White
foreach ($site in $sites) {
    Write-Host "  https://$site" -ForegroundColor Cyan
}
