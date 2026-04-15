@echo off
REM =============================================================
REM   DEPLOY BACKEND R3STO - Node.js Infomaniak
REM
REM   IMPORTANT : utilise le VRAI host SSH Node.js
REM   (57-109235.ssh.hosting-ik.com), PAS le FTP host.
REM
REM   Le FTP host (pl7wy9.ftp.infomaniak.com) ecrit sur
REM   /home/clients/... qui ne sync PAS avec /srv/customer/...
REM   d'ou Node.js lit reellement. Deploy via FTP = fichiers
REM   uploades mais route pas picked up. Tujours passer par SSH.
REM =============================================================
echo ========================================
echo   DEPLOY BACKEND R3STO (server.js + src/)
echo   via SSH Node.js host
echo ========================================
echo.

set PSCP="C:\Program Files\PuTTY\pscp.exe"
set PLINK="C:\Program Files\PuTTY\plink.exe"
set HOST=pl7wy9_r3sto@57-109235.ssh.hosting-ik.com
set PW=-pw a5NDkGSzZ8zU#
set BACKEND=C:\Users\db\Desktop\R3STO\backend
set REMOTE=sites/api.r3sto.ch

echo --- Sanity check local (node -c sweep) ---
for %%f in (%BACKEND%\server.js) do (
  node -c "%%f" 2>nul || ( echo ERREUR syntaxe: %%f & pause & exit /b 1 )
)
echo OK syntaxe server.js
echo.

echo --- Accept SSH host key si premier deploy ---
echo y | %PLINK% %PW% %HOST% "echo connexion OK" 2>nul
echo.

echo --- Upload server.js (bootstrap) ---
%PSCP% -batch %PW% %BACKEND%\server.js %HOST%:%REMOTE%/server.js
if errorlevel 1 ( echo ERREUR server.js & pause & exit /b 1 )

echo.
echo --- Upload package.json ---
%PSCP% -batch %PW% %BACKEND%\package.json %HOST%:%REMOTE%/package.json
if errorlevel 1 ( echo ERREUR package.json & pause & exit /b 1 )

echo.
echo --- Upload src/ (recursive) ---
%PSCP% -batch -r %PW% %BACKEND%\src %HOST%:%REMOTE%/
if errorlevel 1 ( echo ERREUR src & pause & exit /b 1 )

echo.
echo --- Verif post-upload (cote serveur) ---
%PLINK% -batch %PW% %HOST% "cd %REMOTE% && echo server.js: && ls -la server.js && echo --- routes public: && ls -la src/modules/public/routes.js && echo --- taille: && wc -l src/modules/public/routes.js"
if errorlevel 1 ( echo AVERTISSEMENT: verif SSH echouee, upload possiblement OK quand meme )

echo.
echo ========================================
echo   Backend uploade sur le BON chemin
echo ========================================
echo.
echo ETAPE SUIVANTE :
echo   1. https://manager.infomaniak.com
echo   2. Hebergement -^> Node.js -^> REDEMARRER
echo   3. Attendre 15-20 secondes
echo   4. Tester :
echo      curl -k https://api.r3sto.ch/public/demo/list
echo      curl -k https://api.r3sto.ch/public/directory/stats
echo.
pause
