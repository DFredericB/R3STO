@echo off
echo ========================================
echo   DEPLOY BACKEND R3STO via PSCP
echo ========================================
echo.

set PSCP="C:\Program Files\PuTTY\pscp.exe"
set HOST=pl7wy9_r3sto@pl7wy9.ftp.infomaniak.com
set PW=-pw a5NDkGSzZ8zU#
set API=C:\Users\db\Desktop\R3STO\deploy\api.r3sto.ch-node
set REMOTE=sites/api.r3sto.ch

echo --- Upload server.js ---
%PSCP% %PW% %API%\server.js %HOST%:%REMOTE%/server.js
if errorlevel 1 (
  echo.
  echo ERREUR: Upload echoue\!
  pause
  exit /b 1
)

echo.
echo ========================================
echo   server.js uploade avec succes\!
echo ========================================
echo.
echo IMPORTANT: Redemarrer Node.js via le dashboard Infomaniak
echo   Tester: https://api.r3sto.ch/health
echo.
pause
