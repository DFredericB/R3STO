@echo off
:: ============================================
:: R3STO - Sauvegarde automatique toutes les heures
:: Lance ce script le matin, il tourne en fond
:: Les backups vont dans C:\Users\db\Desktop\R3STO-BACKUPS\
:: ============================================

set SOURCE=C:\Users\db\Desktop\R3STO
set BACKUP_ROOT=C:\Users\db\Desktop\R3STO-BACKUPS

:LOOP
:: Creer le nom du dossier avec date et heure
for /f "tokens=1-3 delims=/" %%a in ("%date%") do set D=%%c-%%b-%%a
for /f "tokens=1-2 delims=:." %%a in ("%time: =0%") do set T=%%a-%%b
set BACKUP_DIR=%BACKUP_ROOT%\%D%_%T%

echo.
echo ========================================
echo  R3STO BACKUP - %date% %time%
echo  Destination: %BACKUP_DIR%
echo ========================================

:: Creer le dossier backup
if not exist "%BACKUP_ROOT%" mkdir "%BACKUP_ROOT%"
mkdir "%BACKUP_DIR%"

:: Copier src, deploy, backend, api, public, scripts + fichiers config racine
:: On exclut node_modules, dist, .git (trop gros)
robocopy "%SOURCE%\src" "%BACKUP_DIR%\src" /E /NFL /NDL /NJH /NJS /XD node_modules
robocopy "%SOURCE%\deploy" "%BACKUP_DIR%\deploy" /E /NFL /NDL /NJH /NJS /XD node_modules
robocopy "%SOURCE%\backend" "%BACKUP_DIR%\backend" /E /NFL /NDL /NJH /NJS /XD node_modules
robocopy "%SOURCE%\api" "%BACKUP_DIR%\api" /E /NFL /NDL /NJH /NJS /XD node_modules dist
robocopy "%SOURCE%\public" "%BACKUP_DIR%\public" /E /NFL /NDL /NJH /NJS
robocopy "%SOURCE%\scripts" "%BACKUP_DIR%\scripts" /E /NFL /NDL /NJH /NJS
robocopy "%SOURCE%\landing" "%BACKUP_DIR%\landing" /E /NFL /NDL /NJH /NJS

:: Copier les fichiers racine importants
copy "%SOURCE%\package.json" "%BACKUP_DIR%\" >nul 2>&1
copy "%SOURCE%\vite.config.ts" "%BACKUP_DIR%\" >nul 2>&1
copy "%SOURCE%\tsconfig.app.json" "%BACKUP_DIR%\" >nul 2>&1
copy "%SOURCE%\tsconfig.json" "%BACKUP_DIR%\" >nul 2>&1
copy "%SOURCE%\index.html" "%BACKUP_DIR%\" >nul 2>&1
copy "%SOURCE%\.env" "%BACKUP_DIR%\" >nul 2>&1
copy "%SOURCE%\.gitignore" "%BACKUP_DIR%\" >nul 2>&1

:: Git auto-commit aussi
cd /d "%SOURCE%"
git add -A >nul 2>&1
git commit -m "auto-save %date% %time%" >nul 2>&1

echo  OK - Backup termine.
echo  Prochaine sauvegarde dans 1 heure.
echo ========================================

:: Nettoyer les backups de plus de 7 jours
forfiles /P "%BACKUP_ROOT%" /D -7 /C "cmd /c if @isdir==TRUE rmdir /S /Q @path" >nul 2>&1

:: Attendre 1 heure (3600 secondes)
timeout /t 3600 /nobreak >nul
goto LOOP
