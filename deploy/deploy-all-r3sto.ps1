Write-Host ""
Write-Host "=== R3STO - Deploiement complet ===" -ForegroundColor Cyan
Write-Host ""

Write-Host "--- BACKEND (api.r3sto.ch) ---" -ForegroundColor Magenta
& "$PSScriptRoot\deploy-backend-api.ps1"

Write-Host ""
Write-Host "--- FRONTEND (app.r3sto.ch) ---" -ForegroundColor Magenta
& "$PSScriptRoot\upload-app.ps1"

Write-Host ""
Write-Host "=== TOUT EST DEPLOYE! ===" -ForegroundColor Green
Write-Host "Frontend: https://app.r3sto.ch" -ForegroundColor White
Write-Host "Backend:  https://api.r3sto.ch/api" -ForegroundColor White
Write-Host ""
