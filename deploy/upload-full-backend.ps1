# R3STO - Upload Full Backend to Infomaniak via FTP
# Run from: C:\Users\db\Desktop\R3STO

$ftpHost = "ftp://pl7wy9.ftp.infomaniak.com"
$ftpUser = "pl7wy9_r3sto"
$ftpPass = "RueNeuve20#1081"
$basePath = "sites/api.r3sto.ch"
$backendDir = "$PSScriptRoot\..\backend"

Write-Host "=== R3STO Full Backend Upload ===" -ForegroundColor Cyan
Write-Host ""

function Upload-File($localPath, $remotePath) {
    $fileName = Split-Path $localPath -Leaf
    Write-Host "  Uploading $remotePath..." -NoNewline
    try {
        $ftpUri = "$ftpHost/$remotePath"
        $request = [System.Net.FtpWebRequest]::Create($ftpUri)
        $request.Method = [System.Net.WebRequestMethods+Ftp]::UploadFile
        $request.Credentials = New-Object System.Net.NetworkCredential($ftpUser, $ftpPass)
        $request.UseBinary = $true
        $request.UsePassive = $true
        $content = [System.IO.File]::ReadAllBytes($localPath)
        $request.ContentLength = $content.Length
        $stream = $request.GetRequestStream()
        $stream.Write($content, 0, $content.Length)
        $stream.Close()
        $response = $request.GetResponse()
        $response.Close()
        Write-Host " OK" -ForegroundColor Green
    } catch {
        Write-Host " FAILED: $($_.Exception.Message)" -ForegroundColor Red
    }
}

function Create-FtpDir($dirPath) {
    try {
        $ftpUri = "$ftpHost/$dirPath"
        $request = [System.Net.FtpWebRequest]::Create($ftpUri)
        $request.Method = [System.Net.WebRequestMethods+Ftp]::MakeDirectory
        $request.Credentials = New-Object System.Net.NetworkCredential($ftpUser, $ftpPass)
        $response = $request.GetResponse()
        $response.Close()
        Write-Host "  Created directory: $dirPath" -ForegroundColor Green
    } catch {
        # Directory probably already exists
    }
}

# Create directories
Write-Host "[1/4] Creating directories..." -ForegroundColor Yellow
Create-FtpDir "$basePath/middleware"
Create-FtpDir "$basePath/routes"
Create-FtpDir "$basePath/data"

# Upload root files
Write-Host "[2/4] Uploading root files..." -ForegroundColor Yellow
Upload-File "$backendDir\server.js" "$basePath/server.js"
Upload-File "$backendDir\db.js" "$basePath/db.js"
Upload-File "$backendDir\.env" "$basePath/.env"

# Upload middleware
Write-Host "[3/4] Uploading middleware..." -ForegroundColor Yellow
Upload-File "$backendDir\middleware\auth.js" "$basePath/middleware/auth.js"
Upload-File "$backendDir\middleware\logging.js" "$basePath/middleware/logging.js"
Upload-File "$backendDir\middleware\errorHandler.js" "$basePath/middleware/errorHandler.js"

# Upload routes
Write-Host "[4/4] Uploading routes..." -ForegroundColor Yellow
$routeFiles = @("auth", "resas", "tables", "clients", "config", "widget", "payments", "orders", "sync", "health")
foreach ($route in $routeFiles) {
    Upload-File "$backendDir\routes\$route.js" "$basePath/routes/$route.js"
}

Write-Host ""
Write-Host "=== Upload Complete ===" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Go to Infomaniak dashboard for api.r3sto.ch"
Write-Host "  2. Click 'Redemarrer' on the Application tab"
Write-Host "  3. Check https://api.r3sto.ch/health"
Write-Host ""
