# R3STO - Upload server bundle to FTP
# Then paste the SSH command shown at the end

$ftpHost = "ftp://pl7wy9.ftp.infomaniak.com"
$ftpUser = "pl7wy9_r3sto"
$ftpPass = "RueNeuve20#1081"
$basePath = "sites/api.r3sto.ch"
$backendDir = "$PSScriptRoot\..\backend"

Write-Host "=== R3STO Deploy ===" -ForegroundColor Cyan
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

# Upload server-bundle.js as _app.mjs to FTP
Upload-File "$backendDir\server-bundle.js" "$basePath/_app.mjs"

Write-Host ""
Write-Host "=== Upload OK ===" -ForegroundColor Green
Write-Host ""
Write-Host "Maintenant colle cette commande dans le SSH Infomaniak:" -ForegroundColor Yellow
Write-Host ""
Write-Host "python3 -c ""from ftplib import FTP" -ForegroundColor White -NoNewline
Write-Host "" -ForegroundColor White
Write-Host @"
python3 -c "
from ftplib import FTP
import io
ftp = FTP('pl7wy9.ftp.infomaniak.com')
ftp.login('pl7wy9_r3sto', 'RueNeuve20#1081')
data = io.BytesIO()
ftp.retrbinary('RETR sites/api.r3sto.ch/_app.mjs', data.write)
ftp.quit()
open('sites/api.r3sto.ch/_app.mjs','wb').write(data.getvalue())
open('sites/api.r3sto.ch/server.js','w').write(\"await import('./_app.mjs')\n\")
print('OK:',len(data.getvalue()),'bytes')
"
"@ -ForegroundColor Cyan
Write-Host ""
Write-Host "Puis: Redemarrer Application dans Infomaniak" -ForegroundColor Yellow
Write-Host ""
