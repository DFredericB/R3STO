@echo off
chcp 65001 >nul
echo ============================================
echo   R3STO - Deploy via PSCP (PuTTY)
echo ============================================
echo.

set PSCP="C:\Program Files\PuTTY\pscp.exe"
set USER=pl7wy9_R3sto
set HOST=pl7wy9.ftp.infomaniak.com
set PASS=a5NDkGSzZ8zU
set BASE=C:\Users\db\Desktop\R3STO\deploy

echo [1/4] Deploying app.r3sto.ch ...
%PSCP% -r -pw %PASS% "%BASE%\app.r3sto.ch" %USER%@%HOST%:sites/
if %ERRORLEVEL% NEQ 0 (echo ERREUR app.r3sto.ch & pause & exit /b 1)
echo      OK

echo [2/4] Deploying demo.r3sto.ch ...
%PSCP% -r -pw %PASS% "%BASE%\demo.r3sto.ch" %USER%@%HOST%:sites/
if %ERRORLEVEL% NEQ 0 (echo ERREUR demo.r3sto.ch & pause & exit /b 1)
echo      OK

echo [3/4] Deploying admin.r3sto.ch ...
%PSCP% -r -pw %PASS% "%BASE%\admin.r3sto.ch" %USER%@%HOST%:sites/
if %ERRORLEVEL% NEQ 0 (echo ERREUR admin.r3sto.ch & pause & exit /b 1)
echo      OK

echo [4/5] Deploying booking.r3sto.ch ...
%PSCP% -r -pw %PASS% "%BASE%\booking.r3sto.ch" %USER%@%HOST%:sites/
if %ERRORLEVEL% NEQ 0 (echo ERREUR booking.r3sto.ch & pause & exit /b 1)
echo      OK

echo [5/7] Deploying menu.r3sto.ch ...
%PSCP% -r -pw %PASS% "%BASE%\menu.r3sto.ch" %USER%@%HOST%:sites/
if %ERRORLEVEL% NEQ 0 (echo ERREUR menu.r3sto.ch & pause & exit /b 1)
echo      OK

echo [6/7] Deploying delivery.r3sto.ch ...
%PSCP% -r -pw %PASS% "%BASE%\delivery.r3sto.ch" %USER%@%HOST%:sites/
if %ERRORLEVEL% NEQ 0 (echo ERREUR delivery.r3sto.ch & pause & exit /b 1)
echo      OK

echo [7/7] Deploying bill.r3sto.ch ...
%PSCP% -r -pw %PASS% "%BASE%\bill.r3sto.ch" %USER%@%HOST%:sites/
if %ERRORLEVEL% NEQ 0 (echo ERREUR bill.r3sto.ch & pause & exit /b 1)
echo      OK

echo.
echo ============================================
echo   Deploy OK - ALL 7 SITES
echo ============================================
pause
