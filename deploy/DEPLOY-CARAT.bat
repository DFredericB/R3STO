@echo off
chcp 65001 >nul
echo ============================================
echo   R3STO - Deploy carat.r3sto.ch
echo ============================================
echo.

set PSCP="C:\Program Files\PuTTY\pscp.exe"
set USER=pl7wy9_r3sto
set HOST=pl7wy9.ftp.infomaniak.com
set PASS=a5NDkGSzZ8zU#
set BASE=C:\Users\db\Desktop\R3STO\deploy

echo [1/1] Deploying carat.r3sto.ch ...
%PSCP% -r -pw %PASS% "%BASE%\carat.r3sto.ch" %USER%@%HOST%:sites/
if %ERRORLEVEL% NEQ 0 (echo ERREUR carat.r3sto.ch & pause & exit /b 1)
echo      OK

echo.
echo ============================================
echo   Deploy OK - carat.r3sto.ch
echo   https://carat.r3sto.ch
echo ============================================
pause
