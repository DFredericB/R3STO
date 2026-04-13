# R3STO - Upload setup.js to Infomaniak
# This uploads the setup script that creates all backend files

$ftpHost = "ftp://pl7wy9.ftp.infomaniak.com"
$ftpUser = "pl7wy9_r3sto"
$ftpPass = "RueNeuve20#1081"
$basePath = "sites/api.r3sto.ch"
$backendDir = "$PSScriptRoot\..\backend"

Write-Host "=== R3STO Setup Upload ===" -ForegroundColor Cyan

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

# Upload setup.js, package.json, and .env
Upload-File "$backendDir\setup.js" "$basePath/setup.js"
Upload-File "$backendDir\package.json" "$basePath/package.json"
Upload-File "$backendDir\.env" "$basePath/.env"

Write-Host ""
Write-Host "=== Upload Complete ===" -ForegroundColor Green
Write-Host ""
Write-Host "NEXT STEPS:" -ForegroundColor Yellow
Write-Host "  1. Go to Infomaniak dashboard > api.r3sto.ch > Avance" -ForegroundColor White
Write-Host "  2. Change Construction command to:" -ForegroundColor White
Write-Host "     npm install && node setup.js" -ForegroundColor Cyan
Write-Host "  3. Click 'Lancer' on Construction" -ForegroundColor White
Write-Host "  4. Then click 'Redemarrer' on Application" -ForegroundColor White
Write-Host ""
