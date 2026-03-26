@echo off
title R3STO - Serveur Tablette
color 0A

echo.
echo  ========================================
echo   R3STO - Demarrage serveur reseau
echo  ========================================
echo.

:: Ouvrir le port dans le pare-feu Windows
echo [1/3] Ouverture du port 5173 dans le pare-feu...
netsh advfirewall firewall delete rule name="R3STO Dev" >nul 2>&1
netsh advfirewall firewall add rule name="R3STO Dev" dir=in action=allow protocol=TCP localport=5173 >nul 2>&1
if %errorlevel% neq 0 (
    echo      /!\ Impossible d'ouvrir le pare-feu. Relancez en tant qu'administrateur.
    echo      Clic droit sur ce fichier ^> Executer en tant qu'administrateur
    echo.
) else (
    echo      OK - Port 5173 ouvert
)

:: Afficher l'IP locale
echo.
echo [2/3] Votre adresse reseau :
echo.
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (
    set IP=%%a
    echo      ======================================
    echo       http://%%a:5173
    echo      ======================================
)
echo.
echo      Tapez cette adresse dans le navigateur
echo      de votre tablette (meme Wi-Fi)
echo.

:: Lancer le serveur
echo [3/3] Lancement du serveur...
echo.
cd /d "%~dp0"
call npx vite --host

pause
