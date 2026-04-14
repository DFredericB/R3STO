@echo off
chcp 65001 >nul
echo ============================================
echo   R3STO - Deploy Marketplace (r3sto.ch/restaurants)
echo ============================================
echo.

set PSCP="C:\Program Files\PuTTY\pscp.exe"
set USER=pl7wy9_r3sto
set HOST=pl7wy9.ftp.infomaniak.com
set PASS=a5NDkGSzZ8zU#
set BASE=C:\Users\db\Desktop\R3STO\deploy

echo [1/1] Deploying r3sto.ch/restaurants/index.html ...
%PSCP% -pw %PASS% "%BASE%\r3sto.ch\restaurants\index.html" %USER%@%HOST%:sites/r3sto.ch/restaurants/index.html
if %ERRORLEVEL% NEQ 0 (echo ERREUR restaurants & pause & exit /b 1)
echo      OK

echo.
echo ============================================
echo   Marketplace deployed
echo   https://r3sto.ch/restaurants/
echo ============================================
pause
