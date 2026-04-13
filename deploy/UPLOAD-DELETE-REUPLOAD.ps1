$ftpHost = "ftp://pl7wy9.ftp.infomaniak.com"
$ftpUser = "pl7wy9_r3sto"
$ftpPass = "RueNeuve20#1081"
$cred = New-Object System.Net.NetworkCredential($ftpUser, $ftpPass)

function FTP-Delete($remotePath) {
    try {
        $req = [System.Net.FtpWebRequest]::Create("$ftpHost/$remotePath")
        $req.Method = [System.Net.WebRequestMethods+Ftp]::DeleteFile
        $req.Credentials = $cred
        $resp = $req.GetResponse()
        $resp.Close()
        Write-Host "  DELETE $remotePath OK" -ForegroundColor Yellow
    } catch {
        Write-Host "  DELETE $remotePath SKIP (n'existe pas ou erreur)" -ForegroundColor DarkYellow
    }
}

function FTP-MkDir($remotePath) {
    try {
        $req = [System.Net.FtpWebRequest]::Create("$ftpHost/$remotePath")
        $req.Method = [System.Net.WebRequestMethods+Ftp]::MakeDirectory
        $req.Credentials = $cred
        $resp = $req.GetResponse()
        $resp.Close()
        Write-Host "  MKDIR $remotePath OK" -ForegroundColor Magenta
    } catch {
        # Dossier existe deja — OK
    }
}

function FTP-Upload($localFile, $remotePath) {
    $name = Split-Path $localFile -Leaf
    try {
        $fileBytes = [System.IO.File]::ReadAllBytes($localFile)
        $req = [System.Net.FtpWebRequest]::Create("$ftpHost/$remotePath")
        $req.Method = [System.Net.WebRequestMethods+Ftp]::UploadFile
        $req.Credentials = $cred
        $req.UseBinary = $true
        $req.UsePassive = $true
        $req.KeepAlive = $false
        $req.ContentLength = $fileBytes.Length
        $stream = $req.GetRequestStream()
        $stream.Write($fileBytes, 0, $fileBytes.Length)
        $stream.Close()
        $resp = $req.GetResponse()
        Write-Host "  UPLOAD $name -> $remotePath OK ($([math]::Round($fileBytes.Length/1024,1)) KB)" -ForegroundColor Green
        $resp.Close()
    } catch {
        Write-Host "  UPLOAD ERREUR $name : $_" -ForegroundColor Red
    }
}

$deployDir = Split-Path $MyInvocation.MyCommand.Path -Parent

$sites = @(
    @{ local = "bill.r3sto.ch\index.html";   remote = "sites/bill.r3sto.ch/index.html" },
    @{ local = "bill.r3sto.ch\bill-client.html"; remote = "sites/bill.r3sto.ch/bill-client.html" },
    @{ local = "bill.r3sto.ch\.htaccess";     remote = "sites/bill.r3sto.ch/.htaccess" },
    @{ local = "auth.r3sto.ch\index.html";    remote = "sites/auth.r3sto.ch/index.html" },
    @{ local = "auth.r3sto.ch\r3sto-phone.js"; remote = "sites/auth.r3sto.ch/r3sto-phone.js" },
    @{ local = "booking.r3sto.ch\index.html";  remote = "sites/booking.r3sto.ch/index.html" },
    @{ local = "booking.r3sto.ch\r3sto-phone.js"; remote = "sites/booking.r3sto.ch/r3sto-phone.js" },
    @{ local = "delivery.r3sto.ch\index.html"; remote = "sites/delivery.r3sto.ch/index.html" },
    @{ local = "menu.r3sto.ch\index.html";    remote = "sites/menu.r3sto.ch/index.html" },
    @{ local = "r3sto.ch\index.html";         remote = "sites/r3sto.ch/index.html" },
    @{ local = "r3sto.ch\.htaccess";          remote = "sites/r3sto.ch/.htaccess" },
    @{ local = "demo.r3sto.ch\legourmet\index.html";      remote = "sites/demo.r3sto.ch/legourmet/index.html" },
    @{ local = "demo.r3sto.ch\lepetitboeuf\index.html";   remote = "sites/demo.r3sto.ch/lepetitboeuf/index.html" },
    @{ local = "demo.r3sto.ch\lecomptoirdulac\index.html"; remote = "sites/demo.r3sto.ch/lecomptoirdulac/index.html" },
    @{ local = "admin.r3sto.ch\index.html";    remote = "sites/admin.r3sto.ch/index.html" },
    @{ local = "demo.r3sto.ch\index.html";     remote = "sites/demo.r3sto.ch/index.html" },
    @{ local = "demo.r3sto.ch\login.html";     remote = "sites/demo.r3sto.ch/login.html" },
    @{ local = "demo.r3sto.ch\app.html";       remote = "sites/demo.r3sto.ch/app.html" },
    @{ local = "app.r3sto.ch\index.html";    remote = "sites/app.r3sto.ch/index.html" },
    @{ local = "app.r3sto.ch\assets\index-0J_IZLME.js"; remote = "sites/app.r3sto.ch/assets/index-0J_IZLME.js" },
    @{ local = "demo.r3sto.ch\assets\index-0J_IZLME.js"; remote = "sites/demo.r3sto.ch/assets/index-0J_IZLME.js" },
    @{ local = "api.r3sto.ch\index.php";      remote = "sites/api.r3sto.ch/index.php" },
    @{ local = "api.r3sto.ch\auth.php";       remote = "sites/api.r3sto.ch/auth.php" },
    @{ local = "api.r3sto.ch\config.php";     remote = "sites/api.r3sto.ch/config.php" },
    @{ local = "api.r3sto.ch\db.php";         remote = "sites/api.r3sto.ch/db.php" },
    @{ local = "api.r3sto.ch\restaurants.php"; remote = "sites/api.r3sto.ch/restaurants.php" },
    @{ local = "api.r3sto.ch\admin.php";      remote = "sites/api.r3sto.ch/admin.php" },
    @{ local = "api.r3sto.ch\setup.php";      remote = "sites/api.r3sto.ch/setup.php" },
    @{ local = "api.r3sto.ch\site.php";       remote = "sites/api.r3sto.ch/site.php" },
    @{ local = "api.r3sto.ch\multisite.php";  remote = "sites/api.r3sto.ch/multisite.php" }
)

Write-Host "=== ETAPE 1: SUPPRESSION DES ANCIENS FICHIERS ===" -ForegroundColor Cyan
foreach ($s in $sites) {
    FTP-Delete $s.remote
}

Write-Host ""
Write-Host "=== ETAPE 1b: CREATION DES DOSSIERS ===" -ForegroundColor Cyan
$dirs = @(
    "sites/demo.r3sto.ch/legourmet",
    "sites/demo.r3sto.ch/lepetitboeuf",
    "sites/demo.r3sto.ch/lecomptoirdulac",
    "sites/demo.r3sto.ch/assets",
    "sites/app.r3sto.ch/assets"
)
foreach ($d in $dirs) {
    FTP-MkDir $d
}

Write-Host ""
Write-Host "=== ETAPE 2: UPLOAD DES NOUVEAUX FICHIERS ===" -ForegroundColor Cyan
foreach ($s in $sites) {
    $localPath = Join-Path $deployDir $s.local
    if (Test-Path $localPath) {
        FTP-Upload $localPath $s.remote
    } else {
        Write-Host "  SKIP $($s.local) (fichier introuvable)" -ForegroundColor DarkYellow
    }
}

Write-Host ""
Write-Host "=== TERMINE ===" -ForegroundColor Green
