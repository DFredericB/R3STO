#!/usr/bin/env python3
"""
R3STO — Script de déploiement FTP vers Infomaniak
Usage:
  python3 deploy.py all        # Tout déployer
  python3 deploy.py r3sto      # Juste r3sto.ch
  python3 deploy.py app        # Juste app.r3sto.ch
  python3 deploy.py api        # Affiche les instructions SSH pour l'API
"""

import ftplib
import os
import sys

# ── CONFIG ──
FTP_HOST = "pl7wy9.ftp.infomaniak.com"
FTP_USER = "pl7wy9_r3sto"
FTP_PASS = "RueNeuve20#1081"

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

# Mapping: nom → (dossier local, dossier FTP distant)
SITES = {
    "r3sto":   (os.path.join(SCRIPT_DIR, "deploy", "r3sto.ch"),       "/sites/r3sto.ch"),
    "auth":    (os.path.join(SCRIPT_DIR, "deploy", "auth.r3sto.ch"),   "/sites/auth.r3sto.ch"),
    "admin":   (os.path.join(SCRIPT_DIR, "deploy", "admin.r3sto.ch"),  "/sites/admin.r3sto.ch"),
    "bill":    (os.path.join(SCRIPT_DIR, "deploy", "bill.r3sto.ch"),   "/sites/bill.r3sto.ch"),
    "booking": (os.path.join(SCRIPT_DIR, "deploy", "booking.r3sto.ch"),"/sites/booking.r3sto.ch"),
    "menu":    (os.path.join(SCRIPT_DIR, "deploy", "menu.r3sto.ch"),   "/sites/menu.r3sto.ch"),
    "delivery":(os.path.join(SCRIPT_DIR, "deploy", "delivery.r3sto.ch"),"/sites/delivery.r3sto.ch"),
    "app":     (os.path.join(SCRIPT_DIR, "deploy", "app.r3sto.ch"),    "/sites/app.r3sto.ch"),
    "demo":    (os.path.join(SCRIPT_DIR, "deploy", "demo.r3sto.ch"),   "/sites/demo.r3sto.ch"),
}

def connect():
    print(f"  Connexion à {FTP_HOST}...")
    ftp = ftplib.FTP(FTP_HOST)
    ftp.login(FTP_USER, FTP_PASS)
    print(f"  ✓ Connecté ! ({ftp.getwelcome()[:60]})")
    return ftp

def ensure_remote_dir(ftp, path):
    """Create remote directory tree if it doesn't exist."""
    dirs = path.strip("/").split("/")
    current = ""
    for d in dirs:
        current += "/" + d
        try:
            ftp.cwd(current)
        except ftplib.error_perm:
            try:
                ftp.mkd(current)
                ftp.cwd(current)
            except ftplib.error_perm:
                pass

def upload_dir(ftp, local_dir, remote_dir):
    """Recursively upload a directory."""
    ensure_remote_dir(ftp, remote_dir)
    ftp.cwd(remote_dir)

    uploaded = 0
    for root, dirs, files in os.walk(local_dir):
        # Relative path from local_dir
        rel = os.path.relpath(root, local_dir)
        if rel == ".":
            remote_cwd = remote_dir
        else:
            remote_cwd = remote_dir + "/" + rel.replace("\\", "/")
            ensure_remote_dir(ftp, remote_cwd)

        ftp.cwd(remote_cwd)

        for f in files:
            local_path = os.path.join(root, f)
            size = os.path.getsize(local_path)
            size_str = f"{size/1024:.1f}KB" if size > 1024 else f"{size}B"
            print(f"    ↑ {rel}/{f} ({size_str})")
            with open(local_path, "rb") as fp:
                ftp.storbinary(f"STOR {f}", fp)
            uploaded += 1

    return uploaded

def deploy_site(name):
    if name == "api":
        print("\n  ⚡ Backend API — Déploiement SSH")
        print("  ─────────────────────────────────")
        print(f"  1. ssh pl7wy9_r3sto@57-109235.ssh.hosting-ik.com")
        print(f"  2. Mot de passe: RueNeuve20#1081")
        print(f"  3. cd sites/api.r3sto.ch")
        print(f"  4. Copier les fichiers backend/ puis: npm install && pm2 restart r3sto-api")
        print("  ─────────────────────────────────")
        return

    if name not in SITES:
        print(f"  ✗ Site inconnu: {name}")
        return

    local_dir, remote_dir = SITES[name]

    if not os.path.isdir(local_dir):
        print(f"  ✗ Dossier local introuvable: {local_dir}")
        if name in ("app", "demo"):
            print(f"  → Lance d'abord: npx vite build")
        return

    file_count = sum(len(files) for _, _, files in os.walk(local_dir))
    print(f"\n  ▸ {name} — {file_count} fichiers")
    print(f"    Local:  {local_dir}")
    print(f"    Remote: {remote_dir}")

    ftp = connect()
    try:
        n = upload_dir(ftp, local_dir, remote_dir)
        print(f"  ✓ {name} déployé ! ({n} fichiers)")
    finally:
        ftp.quit()

def main():
    target = sys.argv[1] if len(sys.argv) > 1 else "all"

    print("═══════════════════════════════════")
    print("  R3STO — Déploiement Infomaniak")
    print("═══════════════════════════════════")

    if target == "all":
        # Build first
        print("\n[1] Build de l'app React...")
        os.system(f"cd {SCRIPT_DIR} && npx vite build 2>&1 | tail -3")

        # Deploy all static sites
        print("\n[2] Déploiement des sites statiques...")
        for name in ["r3sto", "auth", "admin", "bill", "booking", "menu", "delivery"]:
            deploy_site(name)

        # Deploy app + demo
        print("\n[3] Déploiement app + demo...")
        for name in ["app", "demo"]:
            deploy_site(name)

        # API instructions
        print("\n[4] Backend API...")
        deploy_site("api")

        print("\n═══════════════════════════════════")
        print("  ✓ TOUT DÉPLOYÉ !")
        print("═══════════════════════════════════")
    else:
        deploy_site(target)

    print("\nTerminé.")

if __name__ == "__main__":
    main()
