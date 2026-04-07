$ftpHost = "ftp://pl7wy9.ftp.infomaniak.com"
$user = "pl7wy9_r3sto"
$pass = "RueNeuve20#1081"

Write-Host "=== Listing /sites/ ===" -ForegroundColor Cyan

try {
    $req = [System.Net.FtpWebRequest]::Create("$ftpHost/sites/")
    $req.Method = [System.Net.WebRequestMethods+Ftp]::ListDirectoryDetails
    $req.Credentials = New-Object System.Net.NetworkCredential($user, $pass)
    $resp = $req.GetResponse()
    $reader = New-Object System.IO.StreamReader($resp.GetResponseStream())
    Write-Host $reader.ReadToEnd()
    $reader.Close()
    $resp.Close()
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}
