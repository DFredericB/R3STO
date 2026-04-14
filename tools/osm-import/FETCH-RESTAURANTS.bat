@echo off
REM R3STO Annuaire — Pipeline OSM fetch + SQL generation
REM Tourne sur la machine locale (pas de restriction réseau)

setlocal
cd /d "%~dp0"

echo ════════════════════════════════════════════════════════
echo  R3STO Annuaire — Fetch OSM Suisse
echo ════════════════════════════════════════════════════════
echo.
echo Cette étape :
echo   1. Interroge Overpass API (OpenStreetMap)
echo   2. Récupère tous les restaurants des 26 cantons
echo   3. Nettoie et structure les données
echo   4. Génère un fichier SQL prêt pour MariaDB
echo.
echo Durée estimée : 5-10 minutes
echo.
pause

python fetch_osm.py
if errorlevel 1 (
    echo.
    echo ERREUR : fetch_osm.py a échoué.
    pause
    exit /b 1
)

echo.
echo ────────────────────────────────────────────────────────
echo  Génération du SQL...
echo ────────────────────────────────────────────────────────
python to_sql.py
if errorlevel 1 (
    echo.
    echo ERREUR : to_sql.py a échoué.
    pause
    exit /b 1
)

echo.
echo ════════════════════════════════════════════════════════
echo  ✓ Terminé
echo ════════════════════════════════════════════════════════
echo.
echo Fichiers générés :
echo   restaurants_raw.json      (brut Overpass)
echo   restaurants_clean.json    (nettoyé)
echo   restaurants_import.sql    (prêt pour MariaDB)
echo.
echo ÉTAPE SUIVANTE : lance IMPORT-TO-MARIADB.bat pour pousser en DB.
echo.
pause
