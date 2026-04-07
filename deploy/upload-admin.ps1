$ftpHost = "ftp://pl7wy9.ftp.infomaniak.com"
$ftpUser = "pl7wy9_r3sto"
$ftpPass = "RueNeuve20#1081"
$localFile = "$PSScriptRoot\admin.r3sto.ch\index.html"
$remotePath = "/sites/admin.r3sto.ch/index.html"

$webclient = New-Object System.Net.WebClient
$webclient.Credentials = New-Object System.Net.NetworkCredential($ftpUser, $ftpPass)
$uri = "$ftpHost$remotePath"
Write-Host "Upload admin.r3sto.ch/index.html..."
$webclient.UploadFile($uri, $localFile)
Write-Host "OK! -> https://admin.r3sto.ch"
