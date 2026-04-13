@echo off
echo === DEPLOY BACKEND R3STO via PSCP ===
echo.

set PSCP="C:\Program Files\PuTTY\pscp.exe"
set HOST=pl7wy9_r3sto@pl7wy9.ftp.infomaniak.com
set PW=-pw RueNeuve20#1081
set BD=C:\Users\db\Desktop\R3STO\backend
set REMOTE=sites/api.r3sto.ch

echo --- 1/3 Upload server.js + package.json ---
%PSCP% %PW% %BD%\server.js %HOST%:%REMOTE%/server.js
%PSCP% %PW% %BD%\package.json %HOST%:%REMOTE%/package.json

echo.
echo --- 2/4 Upload src/ (recursif) ---
%PSCP% -r %PW% %BD%\src %HOST%:%REMOTE%/

echo.
echo --- 3/4 Upload scripts/ (import CRM) ---
%PSCP% -r %PW% %BD%\scripts %HOST%:%REMOTE%/

echo.
echo --- 4/4 Termine ---
echo.
echo ========================================
echo   Backend uploade avec succes!
echo ========================================
echo.
echo IMPORTANT: Aller sur le Manager Infomaniak pour:
echo   1. Redemarrer Node.js via le dashboard
echo   2. Tester: https://api.r3sto.ch/health
echo   3. Lancer la migration: https://api.r3sto.ch/health
echo.
echo MIGRATION CRM (apres redemarrage):
echo   SSH: cd sites/api.r3sto.ch ^&^& node src/db/migrate.js
echo   ou: node src/db/migrate.js --status (pour verifier)
echo.
echo IMPORT CRM (apres migration):
echo   API_TOKEN=xxx node scripts/import-crm-excel.js --dry-run
echo   API_TOKEN=xxx node scripts/import-crm-excel.js
echo.
pause
