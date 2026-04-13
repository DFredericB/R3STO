param(
    [switch]$ApiOnly,
    [switch]$AppOnly,
    [switch]$SitesOnly,
    [switch]$SkipApi,
    [switch]$DryRun
)

$ftpHost  = "ftp://pl7wy9.ftp.infomaniak.com"
$ftpUser  = "pl7wy9_r3sto"
$ftpPass  = "RueNeuve20#1081"
$cred     = New-Object System.Net.NetworkCredential($ftpUser, $ftpPass)

$projectRoot = Split-Path $PSScriptRoot -Parent
$deployDir   = $PSScriptRoot

function New-FtpDir($path) {
    if ($DryRun) { return }
    try {
        $req = [System.Net.FtpWebRequest]::Create("$ftpHost/$path/")
        $req.Method = [System.Net.WebRequestMethods+Ftp]::MakeDirectory
        $req.Credentials = $cred
        $resp = $req.GetResponse()
        $resp.Close()
    } catch {}
}

function Upload-File($localPath, $remotePath) {
    $name = Split-Path $localPath -Leaf
    $size = (Get-Item $localPath).Length
    $sizeKB = [math]::Round($size / 1024, 1)
    if ($DryRun) {
        Write-Host "  [DRY] $name -> $remotePath"
        return
    }
    try {
        $wc = New-Object System.Net.WebClient
        $wc.Credentials = $cred
        $wc.UploadFile("$ftpHost/$remotePath", $localPath)
        Write-Host "  OK  $name ($sizeKB KB)" -ForegroundColor Green
    } catch {
        Write-Host "  ERREUR $name : $_" -ForegroundColor Red
        $script:errors += "$remotePath"
    }
}

function Upload-Directory($localDir, $remoteSitePath, $filter) {
    if (-not $filter) { $filter = "*" }
    Get-ChildItem $localDir -File -Filter $filter | ForEach-Object {
        Upload-File $_.FullName "$remoteSitePath/$($_.Name)"
    }
}

$errors = @()
$startTime = Get-Date

Write-Host ""
Write-Host "=== R3STO - DEPLOIEMENT COMPLET ===" -ForegroundColor Magenta
Write-Host "    $(Get-Date -Format 'yyyy-MM-dd HH:mm')" -ForegroundColor Gray
Write-Host ""

# 1. BACKEND API
if (-not $AppOnly -and -not $SitesOnly -and -not $SkipApi) {
    Write-Host "[1/5] BACKEND API -> api.r3sto.ch" -ForegroundColor Cyan
    $backendDir = Join-Path $projectRoot "backend"
    if (-not (Test-Path $backendDir)) {
        Write-Host "  ERREUR: Dossier backend introuvable" -ForegroundColor Red
    } else {
        $sp = "sites/api.r3sto.ch"
        New-FtpDir $sp
        New-FtpDir "$sp/routes"
        New-FtpDir "$sp/middleware"
        New-FtpDir "$sp/utils"
        New-FtpDir "$sp/data"
        foreach ($file in @("server.js", "db.js", "package.json", ".env")) {
            $lp = Join-Path $backendDir $file
            if (Test-Path $lp) { Upload-File $lp "$sp/$file" }
        }
        $routesDir = Join-Path $backendDir "routes"
        if (Test-Path $routesDir) { Upload-Directory $routesDir "$sp/routes" "*.js" }
        $mwDir = Join-Path $backendDir "middleware"
        if (Test-Path $mwDir) { Upload-Directory $mwDir "$sp/middleware" "*.js" }
        $utilsDir = Join-Path $backendDir "utils"
        if (Test-Path $utilsDir) { Upload-Directory $utilsDir "$sp/utils" "*.js" }
        Write-Host "  api.r3sto.ch OK" -ForegroundColor Green
    }
}

# 2. FRONTEND APP
if (-not $ApiOnly -and -not $SitesOnly) {
    Write-Host "[2/5] FRONTEND APP -> app.r3sto.ch" -ForegroundColor Cyan
    $distDir = Join-Path $projectRoot "dist"
    if (-not (Test-Path $distDir)) {
        Write-Host "  ERREUR: dist/ introuvable" -ForegroundColor Red
    } else {
        $sp = "sites/app.r3sto.ch"
        New-FtpDir $sp
        New-FtpDir "$sp/assets"
        New-FtpDir "$sp/public"
        Upload-File (Join-Path $distDir "index.html") "$sp/index.html"
        $assetsDir = Join-Path $distDir "assets"
        if (Test-Path $assetsDir) { Upload-Directory $assetsDir "$sp/assets" }
        Get-ChildItem $distDir -File | Where-Object { $_.Name -ne "index.html" -and $_.Name -ne "backend.zip" } | ForEach-Object {
            Upload-File $_.FullName "$sp/$($_.Name)"
        }
        $publicDir = Join-Path $distDir "public"
        if (Test-Path $publicDir) {
            Get-ChildItem $publicDir -File | ForEach-Object {
                Upload-File $_.FullName "$sp/public/$($_.Name)"
            }
        }
        Write-Host "  app.r3sto.ch OK" -ForegroundColor Green
    }
}

# 2b. DEMO
if (-not $ApiOnly -and -not $SitesOnly) {
    Write-Host "[2b/5] DEMO -> demo.r3sto.ch" -ForegroundColor Cyan
    $distDir = Join-Path $projectRoot "dist"
    $demoDeployDir = Join-Path $deployDir "demo.r3sto.ch"
    if (-not (Test-Path $demoDeployDir)) {
        Write-Host "  ERREUR: deploy/demo.r3sto.ch/ introuvable" -ForegroundColor Red
    } else {
        $sp = "sites/demo.r3sto.ch"
        New-FtpDir $sp
        New-FtpDir "$sp/assets"
        Upload-File (Join-Path $demoDeployDir "index.html") "$sp/index.html"
        $appHtml = Join-Path $demoDeployDir "app.html"
        if (Test-Path $appHtml) { Upload-File $appHtml "$sp/app.html" }
        $htFile = Join-Path $demoDeployDir ".htaccess"
        if (Test-Path $htFile) { Upload-File $htFile "$sp/.htaccess" }
        if (Test-Path $distDir) {
            $assetsDir = Join-Path $distDir "assets"
            if (Test-Path $assetsDir) { Upload-Directory $assetsDir "$sp/assets" }
        }
        Get-ChildItem $demoDeployDir -File | Where-Object {
            $_.Name -ne "index.html" -and $_.Name -ne "app.html" -and $_.Name -ne ".htaccess"
        } | ForEach-Object {
            Upload-File $_.FullName "$sp/$($_.Name)"
        }
        Get-ChildItem $demoDeployDir -Directory | Where-Object { $_.Name -ne "assets" } | ForEach-Object {
            $subFolderName = $_.Name
            New-FtpDir "$sp/$subFolderName"
            Get-ChildItem $_.FullName -File | ForEach-Object {
                Upload-File $_.FullName "$sp/$subFolderName/$($_.Name)"
            }
        }
        Write-Host "  demo.r3sto.ch OK" -ForegroundColor Green
    }
}

# 3. SOUS-DOMAINES
if (-not $ApiOnly -and -not $AppOnly) {
    Write-Host "[3/5] SOUS-DOMAINES -> 6 sites" -ForegroundColor Cyan
    $subdomains = @("admin", "auth", "bill", "booking", "delivery", "menu")
    foreach ($sub in $subdomains) {
        $subDir = Join-Path $deployDir "$sub.r3sto.ch"
        $sp = "sites/$sub.r3sto.ch"
        if (-not (Test-Path $subDir)) {
            Write-Host "  SKIP $sub.r3sto.ch (introuvable)" -ForegroundColor DarkYellow
            continue
        }
        Write-Host "  $sub.r3sto.ch..." -ForegroundColor Gray
        New-FtpDir $sp
        Get-ChildItem $subDir -File | ForEach-Object {
            Upload-File $_.FullName "$sp/$($_.Name)"
        }
        Get-ChildItem $subDir -Directory | ForEach-Object {
            $subFolderName = $_.Name
            New-FtpDir "$sp/$subFolderName"
            Get-ChildItem $_.FullName -File | ForEach-Object {
                Upload-File $_.FullName "$sp/$subFolderName/$($_.Name)"
            }
        }
        Write-Host "  OK $sub.r3sto.ch" -ForegroundColor Green
    }
}

# 4. SITE VITRINE
if (-not $ApiOnly -and -not $AppOnly) {
    Write-Host "[4/5] SITE VITRINE -> r3sto.ch" -ForegroundColor Cyan
    $landingDir = Join-Path $deployDir "r3sto.ch"
    $sp = "sites/r3sto.ch"
    if (-not (Test-Path $landingDir)) {
        Write-Host "  SKIP r3sto.ch (introuvable)" -ForegroundColor DarkYellow
    } else {
        New-FtpDir $sp
        Get-ChildItem $landingDir -File | ForEach-Object {
            Upload-File $_.FullName "$sp/$($_.Name)"
        }
        Get-ChildItem $landingDir -Directory | ForEach-Object {
            $subFolderName = $_.Name
            New-FtpDir "$sp/$subFolderName"
            Get-ChildItem $_.FullName -File | ForEach-Object {
                Upload-File $_.FullName "$sp/$subFolderName/$($_.Name)"
            }
            Get-ChildItem (Join-Path $landingDir $subFolderName) -Directory -ErrorAction SilentlyContinue | ForEach-Object {
                $subSubName = $_.Name
                New-FtpDir "$sp/$subFolderName/$subSubName"
                Get-ChildItem $_.FullName -File | ForEach-Object {
                    Upload-File $_.FullName "$sp/$subFolderName/$subSubName/$($_.Name)"
                }
            }
        }
        Write-Host "  r3sto.ch OK" -ForegroundColor Green
    }
}

# 5. PAGES LEGALES
if (-not $ApiOnly -and -not $AppOnly) {
    Write-Host "[5/5] PAGES LEGALES -> r3sto.ch/legal/" -ForegroundColor Cyan
    $legalDir = Join-Path $deployDir "legal"
    $sp = "sites/r3sto.ch/legal"
    if (-not (Test-Path $legalDir)) {
        Write-Host "  SKIP legal/ (introuvable)" -ForegroundColor DarkYellow
    } else {
        New-FtpDir $sp
        Get-ChildItem $legalDir -File -Filter "*.html" | ForEach-Object {
            Upload-File $_.FullName "$sp/$($_.Name)"
        }
        Write-Host "  Pages legales OK" -ForegroundColor Green
    }
}

# RESUME
$elapsed = (Get-Date) - $startTime
Write-Host ""
Write-Host "=== DEPLOIEMENT TERMINE ===" -ForegroundColor Magenta
Write-Host "  Duree: $([math]::Round($elapsed.TotalSeconds))s" -ForegroundColor Gray
if ($errors.Count -gt 0) {
    Write-Host "  ERREURS ($($errors.Count)):" -ForegroundColor Red
    $errors | ForEach-Object { Write-Host "    - $_" -ForegroundColor Red }
} else {
    Write-Host "  Aucune erreur!" -ForegroundColor Green
}
Write-Host ""
