# ============================================
#   R3STO - Deploy 7 sites via FTP
# ============================================

$ftpHost = "ftp://pl7wy9.ftp.infomaniak.com"
$ftpUser = "pl7wy9_R3sto"
$ftpPass = "gDJbGDTax0nY"
$basePath = "C:\Users\db\Desktop\R3STO\deploy"

$cred = New-Object System.Net.NetworkCredential($ftpUser, $ftpPass)

function Upload-File($localPath, $remotePath) {
    try {
        $wc = New-Object System.Net.WebClient
        $wc.Credentials = $cred
        $wc.UploadFile("$ftpHost/$remotePath", $localPath)
        return $true
    } catch {
        Write-Host "    ERREUR: $_" -ForegroundColor Red
        return $false
    }
}

function Ensure-FtpDir($path) {
    try {
        $req = [System.Net.FtpWebRequest]::Create("$ftpHost/$path/")
        $req.Method = [System.Net.WebRequestMethods+Ftp]::MakeDirectory
        $req.Credentials = $cred
        $resp = $req.GetResponse()
        $resp.Close()
    } catch {}
}

function Deploy-Site($siteName) {
    $localDir = Join-Path $basePath $siteName
    if (-not (Test-Path $localDir)) {
        Write-Host "  SKIP $siteName (dossier introuvable)" -ForegroundColor Yellow
        return
    }

    $remoteBase = "sites/$siteName"
    Ensure-FtpDir $remoteBase
    Ensure-FtpDir "$remoteBase/assets"

    $files = Get-ChildItem $localDir -Recurse -File
    $total = $files.Count
    $done = 0

    foreach ($file in $files) {
        $rel = $file.FullName.Substring($localDir.Length + 1).Replace("\", "/")
        $remotePath = "$remoteBase/$rel"

        # Creer les sous-dossiers si necessaire
        $parts = $rel.Split("/")
        if ($parts.Length -gt 1) {
            $dir = $remoteBase
            for ($i = 0; $i -lt $parts.Length - 1; $i++) {
                $dir = "$dir/$($parts[$i])"
                Ensure-FtpDir $dir
            }
        }

        $ok = Upload-File $file.FullName $remotePath
        $done++
        if ($ok) {
            Write-Host "    [$done/$total] $rel" -ForegroundColor DarkGray
        }
    }
    Write-Host "  OK $siteName ($done fichiers)" -ForegroundColor Green
}

$sites = @(
    "app.r3sto.ch",
    "demo.r3sto.ch",
    "admin.r3sto.ch",
    "booking.r3sto.ch",
    "menu.r3sto.ch",
    "delivery.r3sto.ch",
    "bill.r3sto.ch"
)

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  R3STO - Deploy 7 sites via FTP" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

$i = 0
foreach ($site in $sites) {
    $i++
    Write-Host "[$i/7] $site ..." -ForegroundColor Yellow
    Deploy-Site $site
    Write-Host ""
}

Write-Host "============================================" -ForegroundColor Green
Write-Host "  DEPLOY OK - ALL 7 SITES" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "Tester: https://app.r3sto.ch" -ForegroundColor Cyan
Write-Host "        https://demo.r3sto.ch" -ForegroundColor Cyan
Write-Host "        https://admin.r3sto.ch" -ForegroundColor Cyan
