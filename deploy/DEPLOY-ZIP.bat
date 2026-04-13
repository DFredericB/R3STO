@echo off
chcp 65001 >nul
echo ============================================
echo   R3STO - Deploy via ZIP + FTP
echo ============================================
echo.

echo [1/3] Creation du ZIP des 7 sites...
powershell -Command "if (Test-Path '%~dp0sites-deploy.zip') { Remove-Item '%~dp0sites-deploy.zip' }; $dirs = @('app.r3sto.ch','demo.r3sto.ch','admin.r3sto.ch','booking.r3sto.ch','menu.r3sto.ch','delivery.r3sto.ch','bill.r3sto.ch'); $tempDir = '%TEMP%\r3sto-deploy'; if (Test-Path $tempDir) { Remove-Item $tempDir -Recurse -Force }; New-Item $tempDir -ItemType Directory | Out-Null; foreach ($d in $dirs) { $src = Join-Path '%~dp0' $d; if (Test-Path $src) { Copy-Item $src (Join-Path $tempDir $d) -Recurse } }; Compress-Archive -Path (Join-Path $tempDir '*') -DestinationPath '%~dp0sites-deploy.zip' -Force; Remove-Item $tempDir -Recurse -Force; Write-Host 'ZIP cree: sites-deploy.zip'"
echo.

echo [2/3] Upload ZIP via FTP...
powershell -Command "$wc = New-Object System.Net.WebClient; $wc.Credentials = New-Object System.Net.NetworkCredential('pl7wy9_R3sto', 'gDJbGDTax0nY'); $wc.UploadFile('ftp://pl7wy9.ftp.infomaniak.com/sites/sites-deploy.zip', '%~dp0sites-deploy.zip'); Write-Host 'ZIP uploade OK!'"
if errorlevel 1 (
  echo ERREUR upload ZIP
  pause
  exit /b 1
)
echo.

echo [3/3] IMPORTANT:
echo   Ouvrir le terminal SSH Infomaniak et taper:
echo.
echo   cd /sites ^&^& unzip -o sites-deploy.zip ^&^& rm sites-deploy.zip
echo.
echo ============================================
pause
