@echo off
chcp 65001 >nul
echo ============================================
echo   R3STO - Deploy 7 sites via FTP (curl)
echo ============================================
echo.

set FTP_USER=pl7wy9_r3sto
set FTP_PASS=a5NDkGSzZ8zU#
set FTP_HOST=ftp://pl7wy9.ftp.infomaniak.com
set BASE=C:\Users\db\Desktop\R3STO\deploy

call :deploy_site app.r3sto.ch
call :deploy_site demo.r3sto.ch
call :deploy_site admin.r3sto.ch
call :deploy_site booking.r3sto.ch
call :deploy_site menu.r3sto.ch
call :deploy_site delivery.r3sto.ch
call :deploy_site bill.r3sto.ch

echo.
echo ============================================
echo   DEPLOY TERMINE
echo ============================================
echo Tester: https://app.r3sto.ch
echo         https://demo.r3sto.ch
echo         https://admin.r3sto.ch
pause
goto :eof

:deploy_site
echo.
echo --- %1 ---
if not exist "%BASE%\%1" (
  echo   SKIP - dossier introuvable
  goto :eof
)
for %%f in ("%BASE%\%1\*.*") do (
  echo   %%~nxf
  curl -s -T "%%f" --user %FTP_USER%:%FTP_PASS% "%FTP_HOST%/sites/%1/%%~nxf"
  if errorlevel 1 echo     ERREUR %%~nxf
)
if exist "%BASE%\%1\assets" (
  curl -s --user %FTP_USER%:%FTP_PASS% --ftp-create-dirs "%FTP_HOST%/sites/%1/assets/" -Q "MKD /sites/%1/assets" 2>nul
  for %%f in ("%BASE%\%1\assets\*.*") do (
    echo   assets/%%~nxf
    curl -s -T "%%f" --user %FTP_USER%:%FTP_PASS% "%FTP_HOST%/sites/%1/assets/%%~nxf"
    if errorlevel 1 echo     ERREUR assets/%%~nxf
  )
)
echo   OK %1
goto :eof
