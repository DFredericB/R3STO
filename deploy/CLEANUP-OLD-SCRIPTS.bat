@echo off
chcp 65001 >nul
echo ============================================
echo   NETTOYAGE - Suppression vieux scripts
echo ============================================
echo.
echo On garde UNIQUEMENT :
echo   - DEPLOY.bat (lance le deploy)
echo   - DEPLOY-TOUT-R3STO.ps1 (script principal)
echo   - DEPLOY-FTP.bat (backup curl)
echo.
echo Tout le reste sera supprime.
echo.
pause

cd /d "%~dp0"

del /f "DEPLOY-PSCP.bat" 2>nul
del /f "DEPLOY-BACKEND-PSCP.bat" 2>nul
del /f "CLEAN-DEPLOY-API.ps1" 2>nul
del /f "DEPLOY-API-AUTO.ps1" 2>nul
del /f "DEPLOY-AVRIL-2026.ps1" 2>nul
del /f "DEPLOY-BACKEND.ps1" 2>nul
del /f "DEPLOY-DEMO-FIX.ps1" 2>nul
del /f "DEPLOY-FTP.ps1" 2>nul
del /f "DEPLOY-NOW.ps1" 2>nul
del /f "DEPLOY-SLOW.bat" 2>nul
del /f "DEPLOY-ZIP.bat" 2>nul
del /f "FIX-API-DEPLOY.ps1" 2>nul
del /f "SSH-DEPLOY-SERVER.ps1" 2>nul
del /f "UPLOAD-API.bat" 2>nul
del /f "UPLOAD-DELETE-REUPLOAD.ps1" 2>nul
del /f "UPLOAD-FIX.ps1" 2>nul
del /f "UPLOAD-TEST.ps1" 2>nul
del /f "build-and-deploy-app.ps1" 2>nul
del /f "deploy-admin-v5.ps1" 2>nul
del /f "deploy-admin-v6.ps1" 2>nul
del /f "deploy-admin.ps1" 2>nul
del /f "deploy-all-r3sto.ps1" 2>nul
del /f "deploy-all.ps1" 2>nul
del /f "deploy-api-node.ps1" 2>nul
del /f "deploy-api.ps1" 2>nul
del /f "deploy-backend-api.ps1" 2>nul
del /f "deploy-final.ps1" 2>nul
del /f "deploy-npm.ps1" 2>nul
del /f "upload-admin.ps1" 2>nul
del /f "upload-api-to-admin.ps1" 2>nul
del /f "upload-app.ps1" 2>nul
del /f "upload-auth-v2.ps1" 2>nul
del /f "upload-auth.ps1" 2>nul
del /f "upload-backend-zip.ps1" 2>nul
del /f "upload-bundle.ps1" 2>nul
del /f "upload-deploy-pkg.ps1" 2>nul
del /f "upload-final.ps1" 2>nul
del /f "upload-full-backend.ps1" 2>nul
del /f "upload-setup.ps1" 2>nul
del /f "upload-test-page.ps1" 2>nul

echo.
echo ============================================
echo   Nettoyage termine\!
echo ============================================
echo.
dir /b *.bat *.ps1
echo.
del /f "%~f0" 2>nul
pause
