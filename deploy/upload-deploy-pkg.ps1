# R3STO - Upload package-deploy.json (contains all backend code)

$ftpHost = "ftp://pl7wy9.ftp.infomaniak.com"
$ftpUser = "pl7wy9_r3sto"
$ftpPass = "RueNeuve20#1081"
$basePath = "sites/api.r3sto.ch"
$backendDir = "$PSScriptRoot\..\backend"

Write-Host "=== R3STO Deploy Package Upload ===" -ForegroundColor Cyan

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

# Upload package-deploy.json AS package.json (contains embedded backend code)
Upload-File "$backendDir\package-deploy.json" "$basePath/package.json"
Upload-File "$backendDir\.env" "$basePath/.env"

Write-Host ""
Write-Host "=== Upload Complete ===" -ForegroundColor Green
Write-Host ""
Write-Host "NEXT: Change Construction command in Infomaniak to:" -ForegroundColor Yellow
Write-Host 'npm install && node -e "const f=require(''fs''),p=JSON.parse(f.readFileSync(''package.json''));f.writeFileSync(''/tmp/x'',p._bundle);require(''child_process'').execSync(''base64 -d /tmp/x|tar xz'')"' -ForegroundColor Cyan
Write-Host ""
