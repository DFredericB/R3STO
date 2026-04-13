# R3STO - Final Deploy Upload
$ftpHost = "ftp://pl7wy9.ftp.infomaniak.com"
$ftpUser = "pl7wy9_r3sto"
$ftpPass = "RueNeuve20#1081"
$basePath = "sites/api.r3sto.ch"
$backendDir = "$PSScriptRoot\..\backend"

Write-Host "=== R3STO Final Deploy ===" -ForegroundColor Cyan

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
        Write-Host " OK" -ForegroundColor Green
    } catch {
        Write-Host " FAILED: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Upload-File "$backendDir\package-deploy.json" "$basePath/package.json"
Upload-File "$backendDir\.env" "$basePath/.env"

Write-Host ""
Write-Host "=== Upload OK ===" -ForegroundColor Green
Write-Host ""
Write-Host "Maintenant dans Infomaniak:" -ForegroundColor Yellow
Write-Host "  1. Avance > Construction command = npm install" -ForegroundColor White
Write-Host "  2. Lancer Construction" -ForegroundColor White
Write-Host "  3. Redemarrer Application" -ForegroundColor White
