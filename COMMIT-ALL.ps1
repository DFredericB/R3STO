# COMMIT-ALL.ps1 v2 — Robuste + verbose + cleanup agressif
# IMPORTANT : ferme VSCode avant de lancer (ses extensions git vont re-verrouiller l'index)

$ErrorActionPreference = "Continue"
Set-Location "C:\Users\db\Desktop\R3STO"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  R3STO - Sauvegarde travail annuaire" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# --- STEP 0 : Kill git processes + cleanup agressif ---
Write-Host "[0] Nettoyage locks + tmp_obj_*..." -ForegroundColor Yellow

# Tue tout git.exe restant
Get-Process -Name git -ErrorAction SilentlyContinue | ForEach-Object {
    Write-Host "  killing git.exe PID=$($_.Id)" -ForegroundColor DarkYellow
    Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
}

# Supprime index.lock
if (Test-Path .git\index.lock) {
    Remove-Item -Force .git\index.lock
    Write-Host "  index.lock supprime" -ForegroundColor DarkYellow
}

# Supprime TOUS les tmp_obj_*
$tmps = Get-ChildItem -Path .git\objects -Recurse -Filter "tmp_obj_*" -ErrorAction SilentlyContinue
Write-Host "  $($tmps.Count) tmp_obj_* trouves -> suppression..." -ForegroundColor DarkYellow
$tmps | Remove-Item -Force -ErrorAction SilentlyContinue

# Supprime maintenance.lock
if (Test-Path .git\objects\maintenance.lock) {
    Remove-Item -Force .git\objects\maintenance.lock
}

# Supprime le tag v1.3.0 mal place
Write-Host "  Suppression tag v1.3.0 (mal place)..." -ForegroundColor DarkYellow
git tag -d v1.3.0 2>&1 | Out-Null

Write-Host "  Cleanup OK`n" -ForegroundColor Green

# --- STEP 1 : Config ---
git config user.email "dev@r3sto.app" | Out-Null
git config user.name "R3STO" | Out-Null
git config core.longpaths true | Out-Null

# --- STEP 2 : Helper ---
function Do-Commit {
    param([string]$num, [string]$msg, [string[]]$files)
    Write-Host "---[$num] $msg---" -ForegroundColor Green
    foreach ($f in $files) {
        if (Test-Path $f) {
            git add -- $f 2>&1 | ForEach-Object { Write-Host "  add: $_" -ForegroundColor DarkGray }
        } else {
            Write-Host "  SKIP (introuvable): $f" -ForegroundColor DarkRed
        }
    }
    $result = git commit -m $msg 2>&1
    $result | ForEach-Object { Write-Host "  $_" -ForegroundColor DarkCyan }
    $newHead = git log -1 --format="%h %s"
    Write-Host "  HEAD: $newHead" -ForegroundColor White
    Write-Host ""
}

Write-Host "`n[1-9] Sequence de commits...`n" -ForegroundColor Cyan

Do-Commit "1/9" "chore: gitignore backend deploy packages + artefacts temp" @(".gitignore")

Do-Commit "2/9" "docs: architecture complete app+admin+sites+audit" @("docs")

Do-Commit "3/9" "feat(backend): v2.0.2 Haversine /public/directory + auth tweaks" @(
    "backend/package.json",
    "backend/src/modules/auth/service.js",
    "backend/src/modules/public/routes.js"
)

Do-Commit "4/9" "feat(annuaire): r3sto.ch directory UI + geoloc + filtres + contacts cards" @(
    "deploy/r3sto.ch/index.html",
    "deploy/r3sto.ch/restaurants/index.html",
    "deploy/r3sto.ch/sitemap.xml",
    "deploy/api.r3sto.ch-node/server.js"
)

Do-Commit "5/9" "feat(sites): pass.r3sto.ch + pro.r3sto.ch + carat.r3sto.ch scaffolds" @(
    "deploy/pass.r3sto.ch",
    "deploy/pro.r3sto.ch",
    "deploy/carat.r3sto.ch",
    "deploy/r3sto.ch/CARAT_Concept_Resume.pptx"
)

Do-Commit "6/9" "chore(sites): menu/booking/bill/delivery updates" @(
    "deploy/bill.r3sto.ch/index.html",
    "deploy/booking.r3sto.ch/index.html",
    "deploy/delivery.r3sto.ch/index.html",
    "deploy/menu.r3sto.ch/index.html"
)

Do-Commit "7/9" "chore(deploy): scripts .bat par site + DEPLOY-TOUT maj" @(
    "deploy/DEPLOY-TOUT-R3STO.ps1",
    "deploy/DEPLOY-BACKEND-FULL.bat",
    "deploy/DEPLOY-CARAT.bat",
    "deploy/DEPLOY-PASS.bat",
    "deploy/DEPLOY-PRO.bat",
    "deploy/IMPORT-OSM-TO-MARIADB.bat",
    "deploy/UPLOAD-PACKAGE-TEST.bat",
    "deploy/UPLOAD-PUBLIC-ROUTES.bat"
)

Do-Commit "8/9" "feat(tools): pipeline OSM import MariaDB (fetch + to_sql)" @("tools")

Do-Commit "9/9" "refactor(admin): ajustements post-audit (Resas/Options/Profil/etc)" @("src")

# --- STEP 10 : Tag v1.3.0 sur le nouveau HEAD ---
Write-Host "`n[10] Tag v1.3.0 sur le nouveau HEAD..." -ForegroundColor Green
git tag -a v1.3.0 -m "v1.3.0 - Annuaire R3STO LIVE + pass/pro/carat + backend v2.0.2 Haversine" 2>&1
$tagSha = git rev-list -n 1 v1.3.0
Write-Host "  v1.3.0 -> $tagSha" -ForegroundColor White

# --- RESUME ---
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  RESUME FINAL" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "`nDerniers commits:" -ForegroundColor Yellow
git log --oneline -12
Write-Host "`nTags:" -ForegroundColor Yellow
git tag -l --sort=-creatordate | Select-Object -First 6
Write-Host "`nFichiers encore non commites:" -ForegroundColor Yellow
$remaining = git status --short
if ($remaining) {
    $remaining
} else {
    Write-Host "  (aucun - tout est propre)" -ForegroundColor Green
}
Write-Host "`nDONE. Appuie sur Entree pour fermer." -ForegroundColor Green
Read-Host
