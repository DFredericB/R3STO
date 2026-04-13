@echo off
chcp 65001 >nul
echo ============================================
echo   R3STO - Deploy via FTP (1 fichier a la fois)
echo ============================================
echo.

set BASE=C:\Users\db\Desktop\R3STO\deploy

powershell -ExecutionPolicy Bypass -Command ^
 "$cred = New-Object System.Net.NetworkCredential('pl7wy9_R3sto', 'gDJbGDTax0nY');" ^
 "$ftp = 'ftp://pl7wy9.ftp.infomaniak.com';" ^
 "$sites = @('app.r3sto.ch','demo.r3sto.ch','admin.r3sto.ch','booking.r3sto.ch','menu.r3sto.ch','delivery.r3sto.ch','bill.r3sto.ch');" ^
 "$base = '%BASE%';" ^
 "$total = 0; $ok = 0; $fail = 0;" ^
 "foreach ($site in $sites) {" ^
 "  $dir = Join-Path $base $site;" ^
 "  if (-not (Test-Path $dir)) { Write-Host \"SKIP $site\" -F Yellow; continue };" ^
 "  Write-Host \"\";" ^
 "  Write-Host \"=== $site ===\" -F Cyan;" ^
 "  $files = Get-ChildItem $dir -Recurse -File;" ^
 "  foreach ($f in $files) {" ^
 "    $rel = $f.FullName.Substring($dir.Length + 1).Replace('\','/');" ^
 "    $remote = \"$ftp/sites/$site/$rel\";" ^
 "    $total++;" ^
 "    try {" ^
 "      $wc = New-Object System.Net.WebClient;" ^
 "      $wc.Credentials = $cred;" ^
 "      $wc.UploadFile($remote, $f.FullName);" ^
 "      Write-Host \"  OK $rel\" -F Green;" ^
 "      $ok++;" ^
 "      Start-Sleep -Seconds 1;" ^
 "    } catch {" ^
 "      Write-Host \"  FAIL $rel - $($_.Exception.InnerException.Message)\" -F Red;" ^
 "      $fail++;" ^
 "      Start-Sleep -Seconds 3;" ^
 "    }" ^
 "  }" ^
 "}" ^
 "Write-Host \"\";" ^
 "Write-Host \"=== RESULTAT: $ok OK / $fail FAIL / $total TOTAL ===\" -F $(if ($fail -eq 0) {'Green'} else {'Yellow'})"

echo.
pause
