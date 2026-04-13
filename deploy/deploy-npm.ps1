# R3STO - Deploy via npm tarball dependency
# Uploads the bundle as a .tgz package so Construction installs it to node_modules

$ftpHost = "ftp://pl7wy9.ftp.infomaniak.com"
$ftpUser = "pl7wy9_r3sto"
$ftpPass = "RueNeuve20#1081"
$basePath = "sites/api.r3sto.ch"
$backendDir = "$PSScriptRoot\..\backend"

Write-Host "=== R3STO Deploy (npm tarball) ===" -ForegroundColor Cyan
Write-Host ""

function Upload-File($localPath, $remotePath) {
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
        Write-Host " OK ($($content.Length) bytes)" -ForegroundColor Green
    } catch {
        Write-Host " FAILED: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Step 1: Upload r3sto-bundle.tgz
Write-Host "1. Uploading r3sto-bundle.tgz..." -ForegroundColor Yellow
Upload-File "$backendDir\r3sto-bundle.tgz" "$basePath/r3sto-bundle.tgz"

# Step 2: Upload package.json with tarball dependency
Write-Host "2. Uploading package.json..." -ForegroundColor Yellow
Upload-File "$backendDir\package-deploy.json" "$basePath/package.json"

Write-Host ""
Write-Host "=== Upload OK ===" -ForegroundColor Green
Write-Host ""
Write-Host "Maintenant:" -ForegroundColor Yellow
Write-Host "  1. Infomaniak > api.r3sto.ch > Lancer CONSTRUCTION" -ForegroundColor White
Write-Host "  2. Attends le check vert" -ForegroundColor White
Write-Host "  3. Lancer APPLICATION" -ForegroundColor White
Write-Host ""
