@echo off
REM ═══════════════════════════════════════════════════════════════
REM  Upload rapide package.json pour test version bump
REM  → Si /health renvoie 2.0.1 : Node recharge les fichiers
REM  → Si /health renvoie 2.0.0 : Node tourne un cache/vieux code
REM ═══════════════════════════════════════════════════════════════

echo [UPLOAD] package.json (v2.0.1) vers sites/api.r3sto.ch/
pscp -pw a5NDkGSzZ8zU# "C:\Users\db\Desktop\R3STO\backend\package.json" pl7wy9_r3sto@pl7wy9.ftp.infomaniak.com:sites/api.r3sto.ch/package.json

echo.
echo [OK] Upload termine.
echo.
echo ETAPES SUIVANTES :
echo  1. Dashboard Infomaniak ^> api.r3sto.ch ^> Node.js
echo  2. Clique sur ARRETER (pas Redemarrer)
echo  3. Attends 10 secondes
echo  4. Clique sur DEMARRER
echo  5. Test : https://api.r3sto.ch/health
echo     - Si version=2.0.1 : Node recharge, pb ailleurs
echo     - Si version=2.0.0 : Node ne recharge PAS, cache a purger
echo.
pause
