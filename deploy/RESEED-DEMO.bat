@echo off
REM =============================================================
REM   RESEED 3 TENANTS DEMO R3STO
REM   Lausanne + Bern + Zurich
REM   A lancer APRES deploy backend + restart Node Infomaniak
REM =============================================================
echo ========================================
echo   RESEED DEMO (Lausanne+Bern+Zurich)
echo ========================================
echo.

set API=https://api.r3sto.ch/public/demo

echo --- 1. Reset Lausanne ---
curl.exe -k -X POST "%API%/reset?slug=chez-bunnys"
echo.
echo.

echo --- 2. Reset Bern ---
curl.exe -k -X POST "%API%/reset?slug=chez-bunnys-bern"
echo.
echo.

echo --- 3. Reset Zurich ---
curl.exe -k -X POST "%API%/reset?slug=chez-bunnys-zurich"
echo.
echo.

echo --- 4. Liste finale ---
curl.exe -k "%API%/list"
echo.
echo.

echo ========================================
echo   Si tu vois 3 tenants avec restaurantId
echo   distincts (20, 21, 22) et chacun ses
echo   propres clients/reservations : OK !
echo ========================================
echo.
echo Si Bern et Zurich retournent encore
echo restaurantId:20 / slug:chez-bunnys :
echo le backend prod est encore l'ancien,
echo refaire DEPLOY-BACKEND-TUNNEL.bat
echo + restart Node + relancer ce bat.
echo.
pause
