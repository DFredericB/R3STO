#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
R3STO Annuaire - Import MariaDB tout-en-un, ZERO saisie utilisateur
--------------------------------------------------------------------
 1. SSH avec password hardcode (plusieurs candidats essayes)
 2. Lecture auto du .env prod pour recuperer DB_PASSWORD
 3. SFTP upload schema.sql + restaurants_import.sql
 4. SSH execute mysql < schema_directory.sql
 5. SSH execute mysql < restaurants_import.sql
 6. SSH execute SELECT COUNT(*) pour verification

Aucun prompt. Lance et attends.
"""

import os
import sys
import re
from pathlib import Path

try:
    import paramiko
except ImportError:
    print("Installation paramiko ...")
    os.system(f'"{sys.executable}" -m pip install --quiet paramiko')
    import paramiko

# ── SSH ────────────────────────────────────────────────────────
SSH_HOST = "57-109235.ssh.hosting-ik.com"
SSH_PORT = 22
SSH_USER = "pl7wy9_r3sto"
# Candidats trouves dans le repo (DEPLOY-PSCP.bat + ssh-command.txt)
SSH_PASS_CANDIDATES = ["a5NDkGSzZ8zU#", "RueNeuve20#1081"]

# ── DB ─────────────────────────────────────────────────────────
DB_HOST = "pl7wy9.myd.infomaniak.com"
DB_USER = "pl7wy9_R3STO"
DB_NAME = "pl7wy9_R3STO"

# ── Fichiers ───────────────────────────────────────────────────
HERE = Path(__file__).parent
SCHEMA_LOCAL = HERE / "schema.sql"
DATA_LOCAL = HERE / "restaurants_import.sql"

REMOTE_DIR = f"/home/clients/{SSH_USER}"
SCHEMA_REMOTE = f"{REMOTE_DIR}/schema_directory.sql"
DATA_REMOTE = f"{REMOTE_DIR}/restaurants_import.sql"

# Candidats de path pour trouver .env prod
ENV_CANDIDATES = [
    "~/sites/api.r3sto.ch/.env",
    "~/api.r3sto.ch/.env",
    "~/sites/api.r3sto.ch-node/.env",
    "/home/clients/pl7wy9_r3sto/sites/api.r3sto.ch/.env",
]


def banner(msg):
    print()
    print("=" * 60)
    print(f"  {msg}")
    print("=" * 60)


def progress(transferred, total):
    pct = transferred * 100 / total if total else 0
    sys.stdout.write(f"\r  {transferred / 1024:.0f} / {total / 1024:.0f} KB ({pct:.1f}%)")
    sys.stdout.flush()


def connect_ssh():
    """Essaie les candidats de password jusqu'a ce qu'un marche."""
    last_err = None
    for pwd in SSH_PASS_CANDIDATES:
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        try:
            ssh.connect(
                SSH_HOST, port=SSH_PORT, username=SSH_USER,
                password=pwd, timeout=30, allow_agent=False, look_for_keys=False,
            )
            print(f"  SSH OK (password candidat {SSH_PASS_CANDIDATES.index(pwd) + 1})")
            return ssh
        except Exception as e:
            last_err = e
            continue
    raise RuntimeError(f"Aucun password SSH ne marche. Dernier erreur : {last_err}")


def ssh_exec(ssh, cmd, quiet=False):
    stdin, stdout, stderr = ssh.exec_command(cmd)
    out = stdout.read().decode(errors="replace")
    err = stderr.read().decode(errors="replace")
    rc = stdout.channel.recv_exit_status()
    if not quiet and out.strip():
        print(out.rstrip())
    if rc != 0 and err.strip() and not quiet:
        print(f"[stderr] {err.rstrip()}")
    return rc, out, err


def find_db_password(ssh):
    """Cherche DB_PASSWORD dans les .env candidats sur le serveur."""
    for env_path in ENV_CANDIDATES:
        rc, out, _ = ssh_exec(
            ssh,
            f"test -f {env_path} && grep -E '^DB_PASSWORD=' {env_path} 2>/dev/null",
            quiet=True,
        )
        if rc == 0 and out.strip():
            for line in out.splitlines():
                m = re.match(r'^DB_PASSWORD\s*=\s*["\']?([^"\'\r\n]+)["\']?\s*$', line)
                if m:
                    pwd = m.group(1)
                    if pwd:
                        print(f"  DB_PASSWORD trouve dans {env_path}")
                        return pwd

    # Fallback : find toutes les .env sous home
    rc, out, _ = ssh_exec(
        ssh,
        f"find /home/clients/{SSH_USER} -name '.env' -not -path '*/node_modules/*' 2>/dev/null",
        quiet=True,
    )
    for path in out.splitlines():
        path = path.strip()
        if not path:
            continue
        rc2, out2, _ = ssh_exec(ssh, f"grep -E '^DB_PASSWORD=' {path} 2>/dev/null", quiet=True)
        if rc2 == 0 and out2.strip():
            for line in out2.splitlines():
                m = re.match(r'^DB_PASSWORD\s*=\s*["\']?([^"\'\r\n]+)["\']?\s*$', line)
                if m and m.group(1):
                    print(f"  DB_PASSWORD trouve dans {path}")
                    return m.group(1)

    raise RuntimeError("DB_PASSWORD introuvable sur le serveur")


def main():
    if not SCHEMA_LOCAL.exists():
        print(f"[X] schema.sql introuvable dans {HERE}")
        return 1
    if not DATA_LOCAL.exists():
        print(f"[X] restaurants_import.sql introuvable")
        print(f"    Lance FETCH-RESTAURANTS.bat d'abord")
        return 1

    banner("R3STO Annuaire - Import MariaDB (zero saisie)")
    print(f"  schema.sql              {SCHEMA_LOCAL.stat().st_size / 1024:.1f} KB")
    print(f"  restaurants_import.sql  {DATA_LOCAL.stat().st_size / 1024:.1f} KB")

    banner("Connexion SSH")
    ssh = connect_ssh()

    banner("Recuperation DB_PASSWORD depuis .env prod")
    try:
        db_pass = find_db_password(ssh)
    except Exception as e:
        print(f"[X] {e}")
        ssh.close()
        return 1

    sftp = ssh.open_sftp()

    banner("ETAPE 1/4 : Upload schema.sql")
    try:
        sftp.put(str(SCHEMA_LOCAL), SCHEMA_REMOTE, callback=progress)
        print("\n  OK")
    except Exception as e:
        print(f"\n[X] {e}")
        return 1

    banner("ETAPE 2/4 : Upload restaurants_import.sql")
    try:
        sftp.put(str(DATA_LOCAL), DATA_REMOTE, callback=progress)
        print("\n  OK")
    except Exception as e:
        print(f"\n[X] {e}")
        return 1

    sftp.close()

    # Echapper le password pour shell
    escaped_pass = db_pass.replace("'", "'\\''")
    env_prefix = f"MYSQL_PWD='{escaped_pass}'"

    banner("ETAPE 3/4 : Creation tables")
    rc, out, err = ssh_exec(
        ssh,
        f"{env_prefix} mysql -h {DB_HOST} -u {DB_USER} {DB_NAME} < {SCHEMA_REMOTE} 2>&1",
    )
    if rc != 0:
        print(f"[X] rc={rc}")
        return 1
    print("  OK")

    banner("ETAPE 4/4 : Import 23625 restaurants (1-2 min)")
    rc, out, err = ssh_exec(
        ssh,
        f"{env_prefix} mysql -h {DB_HOST} -u {DB_USER} {DB_NAME} < {DATA_REMOTE} 2>&1",
    )
    if rc != 0:
        print(f"[X] rc={rc}")
        return 1
    print("  OK")

    banner("Verification")
    rc, out, err = ssh_exec(
        ssh,
        f"{env_prefix} mysql -h {DB_HOST} -u {DB_USER} {DB_NAME} "
        f"-N -s -e 'SELECT COUNT(*) FROM directory_restaurants'",
        quiet=True,
    )
    count = out.strip()
    if count.isdigit():
        print(f"  directory_restaurants : {count} lignes")
    else:
        print(f"  [!] Reponse inattendue : {out} / {err}")

    # Nettoyage optionnel
    ssh_exec(ssh, f"rm -f {SCHEMA_REMOTE} {DATA_REMOTE}", quiet=True)

    ssh.close()

    banner("Import termine")
    print("  Next : redemarre Node via Manager Infomaniak")
    print("         puis teste https://api.r3sto.ch/public/directory/count")
    print()
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        print("\n[!] Annule")
        sys.exit(130)
