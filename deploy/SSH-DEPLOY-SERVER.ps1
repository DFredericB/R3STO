# ╔══════════════════════════════════════════════════════════════════════╗
# ║  R3STO - Deployer le serveur complet via SSH                       ║
# ║  Compresse + encode server.js, copie la commande dans le clipboard ║
# ║  -> Colle dans le SSH Infomaniak                                   ║
# ╚══════════════════════════════════════════════════════════════════════╝

$serverFile = Join-Path $PSScriptRoot "api.r3sto.ch-node\server.js"

if (-not (Test-Path $serverFile)) {
    Write-Host "ERREUR: server.js introuvable: $serverFile" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "=== R3STO - Deploy serveur complet via SSH ===" -ForegroundColor Cyan

# Read, compress, encode
$bytes = [System.IO.File]::ReadAllBytes($serverFile)
$ms = New-Object System.IO.MemoryStream
$gz = New-Object System.IO.Compression.GZipStream($ms, [System.IO.Compression.CompressionMode]::Compress)
$gz.Write($bytes, 0, $bytes.Length)
$gz.Close()
$b64 = [Convert]::ToBase64String($ms.ToArray())
$ms.Close()

Write-Host "  Original: $($bytes.Length) bytes ($([math]::Round($bytes.Length/1024, 1)) KB)" -ForegroundColor Gray
Write-Host "  Compresse+encode: $($b64.Length) chars" -ForegroundColor Gray

# Build SSH command
$cmd = "echo `"$b64`" | base64 -d | gunzip > ~/sites/api.r3sto.ch/server.js && echo `"DONE - `$(wc -l < ~/sites/api.r3sto.ch/server.js) lines`""

# Copy to clipboard
$cmd | Set-Clipboard

Write-Host ""
Write-Host "=== COMMANDE COPIEE DANS LE PRESSE-PAPIER ===" -ForegroundColor Green
Write-Host ""
Write-Host "  1. Va dans Infomaniak > SSH" -ForegroundColor White
Write-Host "  2. Clique dans le terminal" -ForegroundColor White
Write-Host "  3. Ctrl+V pour coller" -ForegroundColor White
Write-Host "  4. Appuie Entree" -ForegroundColor White
Write-Host "  5. Attends 'DONE - 874 lines'" -ForegroundColor White
Write-Host "  6. Va dans Consoles > Application > Redemarrer" -ForegroundColor White
Write-Host ""
