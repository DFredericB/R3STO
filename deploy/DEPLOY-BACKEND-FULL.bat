@echo off
echo ========================================
echo   DEPLOY BACKEND R3STO (server.js + src/)
echo ========================================
echo.

set PSCP="C:\Program Files\PuTTY\pscp.exe"
set HOST=pl7wy9_r3sto@pl7wy9.ftp.infomaniak.com
set PW=-pw a5NDkGSzZ8zU#
set BACKEND=C:\Users\db\Desktop\R3STO\backend
set REMOTE=sites/api.r3sto.ch

echo --- Upload server.js (bootstrap) ---
%PSCP% %PW% %BACKEND%\server.js %HOST%:%REMOTE%/server.js
if errorlevel 1 ( echo ERREUR server.js & pause & exit /b 1 )

echo.
echo --- Upload package.json ---
%PSCP% %PW% %BACKEND%\package.json %HOST%:%REMOTE%/package.json
if errorlevel 1 ( echo ERREUR package.json & pause & exit /b 1 )

echo.
echo --- Upload src/ (recursive) ---
%PSCP% -r %PW% %BACKEND%\src %HOST%:%REMOTE%/
if errorlevel 1 ( echo ERREUR src & pause & exit /b 1 )

echo.
echo ========================================
echo   Backend complet uploade avec succes
echo ========================================
echo.
echo ETAPE SUIVANTE :
echo   1. https://manager.infomaniak.com
echo   2. Hebergement - Node.js - REDEMARRER
echo   3. Tester: https://api.r3sto.ch/public/directory/stats
echo.
pause
