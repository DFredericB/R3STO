# Deploy admin.r3sto.ch v5
$ftpHost = "ftp://pl7wy9.ftp.infomaniak.com"
$user = "pl7wy9_r3sto"
$pass = "RueNeuve20#1081"
$webclient = New-Object System.Net.WebClient
$webclient.Credentials = New-Object System.Net.NetworkCredential($user, $pass)
try {
    $webclient.UploadFile("$ftpHost/sites/admin.r3sto.ch/index.html", "$PSScriptRoot\admin.r3sto.ch\index.html")
    Write-Host "OK admin.r3sto.ch/index.html" -ForegroundColor Green
} catch {
    Write-Host "FAIL: $_" -ForegroundColor Red
}
Write-Host "Testez: https://admin.r3sto.ch" -ForegroundColor Cyan
