@echo off
REM =============================================================
REM   DEPLOY BACKEND R3STO via TUNNEL HTTPS app.r3sto.ch
REM
REM   Pourquoi : SSH Node host refuse le password FTP sur
REM   Infomaniak. Methode validee 14 avril 2026 = upload FTP
REM   du tarball sur app.r3sto.ch puis wget+tar dans SSH Web.
REM =============================================================
echo ========================================
echo   DEPLOY BACKEND R3STO (tunnel HTTPS)
echo ========================================
echo.

set BACKEND=C:\Users\db\Desktop\R3STO\backend
set TAR=C:\Users\db\Desktop\R3STO\deploy\backend-deploy.tar.gz
REM Creds alignes sur DEPLOY-FTP.bat (qui marche, contrairement aux notes memory)
set FTP_HOST=pl7wy9.ftp.infomaniak.com
set FTP_USER=pl7wy9_r3sto
set FTP_PW=a5NDkGSzZ8zU#
set FTP_PATH=sites/app.r3sto.ch/

echo --- 1. Sanity check syntaxe local ---
pushd %BACKEND%
node -c server.js || ( echo ERREUR syntaxe server.js & popd & pause & exit /b 1 )
node -c src\modules\public\routes.js || ( echo ERREUR syntaxe routes.js & popd & pause & exit /b 1 )
echo OK syntaxe local
echo.

echo --- 2. Creation tarball (exclude node_modules .env .bak .log) ---
if exist "%TAR%" del "%TAR%"
tar -czf "%TAR%" --exclude=node_modules --exclude=.env --exclude=*.bak --exclude=*.log --exclude=*.new server.js package.json src
if errorlevel 1 ( echo ERREUR tar & popd & pause & exit /b 1 )
popd
for %%A in ("%TAR%") do echo   Tarball: %%~zA octets
echo.

echo --- 3. Upload FTP vers app.r3sto.ch ---
curl.exe -T "%TAR%" "ftp://%FTP_HOST%/%FTP_PATH%" --user "%FTP_USER%:%FTP_PW%"
if errorlevel 1 ( echo ERREUR FTP upload & pause & exit /b 1 )
echo OK upload
echo.

echo --- 4. Verif HTTP (le tarball doit etre accessible) ---
curl.exe -I -k "https://app.r3sto.ch/backend-deploy.tar.gz" 2>nul | findstr /R "200 OK"
if errorlevel 1 ( echo AVERTISSEMENT: tarball pas encore visible en HTTP, attendre 10s )
echo.

echo ========================================
echo   ETAPES MANUELLES (a faire maintenant)
echo ========================================
echo.
echo 1. Ouvrir SSH Web Terminal Infomaniak :
echo    https://manager.infomaniak.com (Hebergement r3sto.ch ^> SSH/Terminal)
echo.
echo 2. Coller cette ligne et appuyer Entree :
echo.
echo    cd /srv/customer/sites/api.r3sto.ch ^&^& wget -q https://app.r3sto.ch/backend-deploy.tar.gz -O /tmp/d.tar.gz ^&^& tar xzf /tmp/d.tar.gz ^&^& node -c server.js ^&^& node -c src/modules/public/routes.js ^&^& wc -l src/modules/public/routes.js ^&^& echo OK DEPLOY
echo.
echo 3. Si OK DEPLOY affiche : Manager Infomaniak ^> Node.js ^> REDEMARRER
echo    Attendre 20 secondes apres le restart.
echo.
echo 4. Cleanup tunnel (a coller ensuite dans SSH Web) :
echo.
echo    rm /tmp/d.tar.gz
echo.
echo 5. Cleanup FTP : supprimer manuellement sites/app.r3sto.ch/backend-deploy.tar.gz
echo    via Web File Manager Infomaniak.
echo.
echo 6. Reseed demo : RESEED-DEMO.bat
echo.
pause
