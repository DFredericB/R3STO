$ftpHost = "ftp://pl7wy9.ftp.infomaniak.com"
$ftpUser = "pl7wy9_r3sto"
$ftpPass = "RueNeuve20#1081"

function FTP-Upload($localFile, $remotePath) {
    $name = Split-Path $localFile -Leaf
    $uri = "$ftpHost/$remotePath"
    Write-Host "  Upload $name -> $remotePath ..." -NoNewline
    try {
        $fileBytes = [System.IO.File]::ReadAllBytes($localFile)
        $req = [System.Net.FtpWebRequest]::Create($uri)
        $req.Method = [System.Net.WebRequestMethods+Ftp]::UploadFile
        $req.Credentials = New-Object System.Net.NetworkCredential($ftpUser, $ftpPass)
        $req.UseBinary = $true
        $req.UsePassive = $true
        $req.KeepAlive = $false
        $req.ContentLength = $fileBytes.Length
        $stream = $req.GetRequestStream()
        $stream.Write($fileBytes, 0, $fileBytes.Length)
        $stream.Close()
        $resp = $req.GetResponse()
        Write-Host " OK ($([math]::Round($fileBytes.Length/1024,1)) KB)" -ForegroundColor Green
        $resp.Close()
    } catch {
        Write-Host " ERREUR: $_" -ForegroundColor Red
    }
}

Write-Host "=== UPLOAD CORRECTIF ===" -ForegroundColor Cyan
Write-Host ""

$deployDir = Split-Path $MyInvocation.MyCommand.Path -Parent

# Bill
$billFile = Join-Path $deployDir "bill.r3sto.ch\index.html"
FTP-Upload $billFile "sites/bill.r3sto.ch/index.html"

$billClient = Join-Path $deployDir "bill.r3sto.ch\bill-client.html"
if (Test-Path $billClient) { FTP-Upload $billClient "sites/bill.r3sto.ch/bill-client.html" }

$billHt = Join-Path $deployDir "bill.r3sto.ch\.htaccess"
if (Test-Path $billHt) { FTP-Upload $billHt "sites/bill.r3sto.ch/.htaccess" }

# Auth
$authFile = Join-Path $deployDir "auth.r3sto.ch\index.html"
FTP-Upload $authFile "sites/auth.r3sto.ch/index.html"

# Booking
$bookFile = Join-Path $deployDir "booking.r3sto.ch\index.html"
if (Test-Path $bookFile) { FTP-Upload $bookFile "sites/booking.r3sto.ch/index.html" }

# Menu
$menuFile = Join-Path $deployDir "menu.r3sto.ch\index.html"
if (Test-Path $menuFile) { FTP-Upload $menuFile "sites/menu.r3sto.ch/index.html" }

# Landing
$landFile = Join-Path $deployDir "r3sto.ch\index.html"
if (Test-Path $landFile) { FTP-Upload $landFile "sites/r3sto.ch/index.html" }

Write-Host ""
Write-Host "=== TERMINE ===" -ForegroundColor Green
