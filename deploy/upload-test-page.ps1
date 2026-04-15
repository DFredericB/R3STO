$ftpHost = "ftp://pl7wy9.ftp.infomaniak.com"
$ftpUser = "pl7wy9_r3sto"
$ftpPass = "RueNeuve20#1081"
$localFile = "$PSScriptRoot\api.r3sto.ch-node\test-api.html"
$remotePath = "/sites/admin.r3sto.ch/test-api.html"

$webclient = New-Object System.Net.WebClient
$webclient.Credentials = New-Object System.Net.NetworkCredential($ftpUser, $ftpPass)
$uri = "$ftpHost$remotePath"
Write-Host "Upload $localFile -> $uri"
$webclient.UploadFile($uri, $localFile)
Write-Host "OK! Ouvre: https://admin.r3sto.ch/test-api.html"
