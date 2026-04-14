@echo off
echo ========================================
echo   UPLOAD app.js + public/routes.js
echo   (vers le VRAI host SSH Node.js)
echo ========================================
echo.

set PSCP="C:\Program Files\PuTTY\pscp.exe"
set HOST=pl7wy9_r3sto@57-109235.ssh.hosting-ik.com
set PW=-pw a5NDkGSzZ8zU
set SRC=C:\Users\db\Desktop\R3STO\backend\src
set REMOTE=sites/api.r3sto.ch/src

echo --- 1. app.js ---
echo Local:
dir "%SRC%\app.js" | findstr app.js
echo.
%PSCP% %PW% "%SRC%\app.js" %HOST%:%REMOTE%/app.js
if errorlevel 1 ( echo ERREUR app.js & pause & exit /b 1 )

echo.
echo --- 2. modules/public/routes.js ---
echo Local:
dir "%SRC%\modules\public\routes.js" | findstr routes.js
echo.
%PSCP% %PW% "%SRC%\modules\public\routes.js" %HOST%:%REMOTE%/modules/public/routes.js
if errorlevel 1 ( echo ERREUR routes.js & pause & exit /b 1 )

echo.
echo ========================================
echo   Uploads OK vers Node host reel
echo   REDEMARRER Node via dashboard maintenant
echo ========================================
pause
