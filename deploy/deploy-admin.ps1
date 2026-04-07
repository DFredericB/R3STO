# Deploy admin.r3sto.ch only
$ftpHost = "ftp://pl7wy9.ftp.infomaniak.com"
$user = "pl7wy9_r3sto"
$pass = "RueNeuve20#1081"

$webclient = New-Object System.Net.WebClient
$webclient.Credentials = New-Object System.Net.NetworkCredential($user, $pass)

$files = @(
    @{ local = "$PSScriptRoot\admin.r3sto.ch\index.html"; remote = "/sites/admin.r3sto.ch/index.html" },
    @{ local = "$PSScriptRoot\admin.r3sto.ch\.htaccess"; remote = "/sites/admin.r3sto.ch/.htaccess" }
)

foreach ($f in $files) {
    try {
        $webclient.UploadFile("$ftpHost$($f.remote)", $f.local)
        Write-Host "  OK $($f.remote)" -ForegroundColor Green
    } catch {
        Write-Host "  FAIL $($f.remote) : $_" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "=== ADMIN DEPLOYE ===" -ForegroundColor Green
Write-Host "  https://admin.r3sto.ch" -ForegroundColor Cyan
