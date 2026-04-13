@echo off
echo === Upload server.js vers api.r3sto.ch ===
echo.
powershell -Command "$wc = New-Object System.Net.WebClient; $wc.Credentials = New-Object System.Net.NetworkCredential('pl7wy9_R3sto', 'gDJbGDTax0nY'); $wc.UploadFile('ftp://pl7wy9.ftp.infomaniak.com/sites/api.r3sto.ch/server.js', 'C:\Users\db\Desktop\R3STO\deploy\api.r3sto.ch-node\server.js'); Write-Host 'OK - server.js uploade!'"
echo.
echo Maintenant: Infomaniak dashboard - Redemarrer Node.js
echo Puis tester: https://api.r3sto.ch/health
pause
