$ftpHost = "ftp://pl7wy9.ftp.infomaniak.com"
$ftpUser = "pl7wy9_r3sto"
$ftpPass = "RueNeuve20#1081"

$localFile = Join-Path (Split-Path $MyInvocation.MyCommand.Path -Parent) "bill.r3sto.ch\index-v2.html"
$remotePath = "sites/bill.r3sto.ch/index-v2.html"

Write-Host "Upload index-v2.html..." -NoNewline
$fileBytes = [System.IO.File]::ReadAllBytes($localFile)
$req = [System.Net.FtpWebRequest]::Create("$ftpHost/$remotePath")
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
