# R3STO - Deploy final
# Ce script copie la commande de deploiement dans le presse-papier
# Il suffit ensuite de la coller dans le SSH Infomaniak

$backendDir = "$PSScriptRoot\..\backend"
$bundlePath = "$backendDir\server-bundle.js"

Write-Host "=== R3STO Deploy Final ===" -ForegroundColor Cyan

# Compress + encode
$bytes = [System.IO.File]::ReadAllBytes($bundlePath)
$ms = New-Object System.IO.MemoryStream
$gz = New-Object System.IO.Compression.GZipStream($ms, [System.IO.Compression.CompressionMode]::Compress)
$gz.Write($bytes, 0, $bytes.Length)
$gz.Close()
$b64 = [Convert]::ToBase64String($ms.ToArray())
$ms.Close()

Write-Host "  Bundle: $($bytes.Length) bytes" -ForegroundColor Gray
Write-Host "  Compressed+encoded: $($b64.Length) chars" -ForegroundColor Gray

# Build the SSH command
$cmd = "echo `"$b64`" | base64 -d | gunzip > ~/sites/api.r3sto.ch/_app.mjs && echo `"await import('./_app.mjs')`" > ~/sites/api.r3sto.ch/server.js && echo `"DONE`""

# Copy to clipboard
$cmd | Set-Clipboard

Write-Host ""
Write-Host "=== COMMANDE COPIEE DANS LE PRESSE-PAPIER ===" -ForegroundColor Green
Write-Host ""
Write-Host "Maintenant:" -ForegroundColor Yellow
Write-Host "  1. Va dans Infomaniak > SSH" -ForegroundColor White
Write-Host "  2. Clique dans le terminal et fais Ctrl+V" -ForegroundColor White
Write-Host "  3. Appuie Entree" -ForegroundColor White
Write-Host "  4. Attends 'DONE'" -ForegroundColor White
Write-Host "  5. Va dans Gestion application > Lancer" -ForegroundColor White
Write-Host ""
