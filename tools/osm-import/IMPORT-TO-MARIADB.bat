@echo off
REM R3STO Annuaire - Import SQL vers MariaDB Infomaniak
REM Prerequis : restaurants_import.sql genere par FETCH-RESTAURANTS.bat

setlocal
cd /d "%~dp0"

echo ========================================================
echo  R3STO Annuaire - Import MariaDB Infomaniak
echo ========================================================
echo.

if not exist "restaurants_import.sql" goto :no_sql
if not exist "schema.sql" goto :no_schema

REM Parametres SSH + MariaDB Infomaniak
set "SSH_HOST=57-109235.ssh.hosting-ik.com"
set "SSH_USER=pl7wy9_db"
set "SSH_PORT=22"

set "DB_HOST=pl7wy9.myd.infomaniak.com"
set "DB_USER=pl7wy9_R3STO"
set "DB_NAME=pl7wy9_R3STO"

set "PSCP=C:\Program Files\PuTTY\pscp.exe"
set "PLINK=C:\Program Files\PuTTY\plink.exe"

if not exist "%PSCP%" goto :no_pscp
if not exist "%PLINK%" goto :no_plink

echo ETAPE 1/4 : Upload schema.sql
"%PSCP%" -P %SSH_PORT% schema.sql %SSH_USER%@%SSH_HOST%:/home/clients/%SSH_USER%/schema_directory.sql
if errorlevel 1 goto :err_upload_schema

echo.
echo ETAPE 2/4 : Upload restaurants_import.sql - 1 a 2 min
"%PSCP%" -P %SSH_PORT% restaurants_import.sql %SSH_USER%@%SSH_HOST%:/home/clients/%SSH_USER%/restaurants_import.sql
if errorlevel 1 goto :err_upload_data

echo.
echo ETAPE 3/4 : Creation tables
echo.
echo Session SSH ouverte. Execute a la main :
echo.
echo    mysql -h %DB_HOST% -u %DB_USER% -p %DB_NAME% ^< schema_directory.sql
echo.
echo Mot de passe DB demande. Puis tape exit pour revenir.
echo.
"%PLINK%" -ssh -P %SSH_PORT% %SSH_USER%@%SSH_HOST%

echo.
echo ETAPE 4/4 : Import des donnees
echo.
echo Reconnexion SSH. Execute a la main :
echo.
echo    mysql -h %DB_HOST% -u %DB_USER% -p %DB_NAME% ^< restaurants_import.sql
echo.
echo Puis verifie avec :
echo.
echo    mysql -h %DB_HOST% -u %DB_USER% -p %DB_NAME% -e "SELECT COUNT(*) FROM directory_restaurants"
echo.
"%PLINK%" -ssh -P %SSH_PORT% %SSH_USER%@%SSH_HOST%

echo.
echo ========================================================
echo  Import termine. Verifie api.r3sto.ch/public/directory
echo ========================================================
pause
exit /b 0

:no_sql
echo ERREUR : restaurants_import.sql introuvable.
echo         Lance d'abord FETCH-RESTAURANTS.bat
pause
exit /b 1

:no_schema
echo ERREUR : schema.sql introuvable dans %CD%
pause
exit /b 1

:no_pscp
echo ERREUR : pscp.exe introuvable.
echo         Chemin attendu : C:\Program Files\PuTTY\pscp.exe
echo         Installe PuTTY depuis https://www.putty.org/
pause
exit /b 1

:no_plink
echo ERREUR : plink.exe introuvable.
echo         Chemin attendu : C:\Program Files\PuTTY\plink.exe
pause
exit /b 1

:err_upload_schema
echo ERREUR : upload de schema.sql a echoue.
pause
exit /b 1

:err_upload_data
echo ERREUR : upload de restaurants_import.sql a echoue.
pause
exit /b 1
