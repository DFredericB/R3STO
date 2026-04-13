#!/bin/bash
# ═══════════════════════════════════════════════════════════════
#  R3STO — Script de déploiement Infomaniak
#  Usage: bash deploy.sh [site|all]
#  Exemples:
#    bash deploy.sh all          # Déploie tout
#    bash deploy.sh r3sto        # Déploie r3sto.ch uniquement
#    bash deploy.sh app          # Déploie app.r3sto.ch uniquement
#    bash deploy.sh api          # Déploie le backend API via SSH
# ═══════════════════════════════════════════════════════════════

set -e

# ── CONFIG ──
FTP_HOST="pl7wy9.ftp.infomaniak.com"
FTP_USER="pl7wy9_r3sto"
FTP_PASS="RueNeuve20#1081"
SSH_HOST="57-109235.ssh.hosting-ik.com"
SSH_USER="pl7wy9_r3sto"
SSH_PASS="RueNeuve20#1081"

# Couleurs
G='\033[0;32m'; B='\033[0;34m'; Y='\033[1;33m'; R='\033[0;31m'; N='\033[0m'

echo -e "${B}═══════════════════════════════════════${N}"
echo -e "${B}  R3STO — Déploiement Infomaniak${N}"
echo -e "${B}═══════════════════════════════════════${N}"

TARGET=${1:-all}

# ── Helper: upload via FTP ──
ftp_upload() {
  local LOCAL_DIR=$1
  local REMOTE_DIR=$2
  local SITE_NAME=$3

  echo -e "\n${Y}▸ Déploiement ${SITE_NAME}${N}"
  echo -e "  Local:  ${LOCAL_DIR}"
  echo -e "  Remote: ${REMOTE_DIR}"

  if ! command -v lftp &> /dev/null; then
    echo -e "${R}  lftp non trouvé. Installation...${N}"
    if command -v brew &> /dev/null; then
      brew install lftp
    elif command -v apt-get &> /dev/null; then
      sudo apt-get install -y lftp
    elif command -v choco &> /dev/null; then
      choco install lftp
    else
      echo -e "${R}  Impossible d'installer lftp. Installe-le manuellement.${N}"
      echo -e "  Alternative: utilise le Web FTP d'Infomaniak"
      return 1
    fi
  fi

  lftp -c "
    set ftp:ssl-allow yes
    set ssl:verify-certificate no
    set mirror:use-pget-n 5
    open ftp://${FTP_USER}:${FTP_PASS}@${FTP_HOST}
    cd ${REMOTE_DIR} || mkdir -p ${REMOTE_DIR}
    cd ${REMOTE_DIR}
    mirror --reverse --delete --verbose --only-newer ${LOCAL_DIR} .
    bye
  "

  echo -e "${G}  ✓ ${SITE_NAME} déployé !${N}"
}

# ── Helper: deploy backend via SSH ──
ssh_deploy() {
  echo -e "\n${Y}▸ Déploiement API backend via SSH${N}"
  echo -e "  Host: ${SSH_HOST}"

  if ! command -v sshpass &> /dev/null; then
    echo -e "${Y}  sshpass non trouvé. Utilisation de ssh avec mot de passe interactif.${N}"
    echo -e "  Mot de passe: ${SSH_PASS}"
    echo ""
    echo -e "  Connecte-toi manuellement :"
    echo -e "  ${B}ssh ${SSH_USER}@${SSH_HOST}${N}"
    echo -e "  Puis exécute :"
    echo -e "  ${B}cd sites/api.r3sto.ch && git pull && npm install && pm2 restart r3sto-api${N}"
    return 0
  fi

  sshpass -p "${SSH_PASS}" ssh -o StrictHostKeyChecking=no ${SSH_USER}@${SSH_HOST} << 'REMOTE'
    cd sites/api.r3sto.ch 2>/dev/null || cd api.r3sto.ch
    echo "📂 Current dir: $(pwd)"

    # Si c'est un repo git
    if [ -d .git ]; then
      git pull
      npm install --production
    fi

    # Restart PM2 si disponible
    if command -v pm2 &> /dev/null; then
      pm2 restart r3sto-api 2>/dev/null || pm2 restart all
      echo "✓ PM2 restarted"
    fi
REMOTE

  echo -e "${G}  ✓ API backend déployé !${N}"
}

# ── SITES À DÉPLOYER ──
# Structure Infomaniak: chaque site a son propre répertoire

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

case $TARGET in
  r3sto|landing)
    ftp_upload "${SCRIPT_DIR}/deploy/r3sto.ch" "/sites/r3sto.ch" "r3sto.ch (landing + marketplace + legal)"
    ;;
  app)
    # Build first
    echo -e "${Y}▸ Building app...${N}"
    cd "${SCRIPT_DIR}" && npm run build 2>/dev/null || npx vite build
    ftp_upload "${SCRIPT_DIR}/dist" "/sites/app.r3sto.ch" "app.r3sto.ch"
    ;;
  demo)
    echo -e "${Y}▸ Building app (demo)...${N}"
    cd "${SCRIPT_DIR}" && npm run build 2>/dev/null || npx vite build
    ftp_upload "${SCRIPT_DIR}/dist" "/sites/demo.r3sto.ch" "demo.r3sto.ch"
    ;;
  auth)
    ftp_upload "${SCRIPT_DIR}/deploy/auth.r3sto.ch" "/sites/auth.r3sto.ch" "auth.r3sto.ch"
    ;;
  admin)
    ftp_upload "${SCRIPT_DIR}/deploy/admin.r3sto.ch" "/sites/admin.r3sto.ch" "admin.r3sto.ch"
    ;;
  bill)
    ftp_upload "${SCRIPT_DIR}/deploy/bill.r3sto.ch" "/sites/bill.r3sto.ch" "bill.r3sto.ch"
    ;;
  booking)
    ftp_upload "${SCRIPT_DIR}/deploy/booking.r3sto.ch" "/sites/booking.r3sto.ch" "booking.r3sto.ch"
    ;;
  menu)
    ftp_upload "${SCRIPT_DIR}/deploy/menu.r3sto.ch" "/sites/menu.r3sto.ch" "menu.r3sto.ch"
    ;;
  api|backend)
    ssh_deploy
    ;;
  all)
    echo -e "${Y}▸ Déploiement de TOUS les sites${N}"

    # 1. Build l'app React
    echo -e "\n${B}[1/4] Build de l'app React...${N}"
    cd "${SCRIPT_DIR}" && npx vite build 2>&1 | tail -3

    # 2. Sites statiques
    echo -e "\n${B}[2/5] Sites statiques...${N}"
    ftp_upload "${SCRIPT_DIR}/deploy/r3sto.ch" "/sites/r3sto.ch" "r3sto.ch"
    ftp_upload "${SCRIPT_DIR}/deploy/auth.r3sto.ch" "/sites/auth.r3sto.ch" "auth.r3sto.ch"
    ftp_upload "${SCRIPT_DIR}/deploy/admin.r3sto.ch" "/sites/admin.r3sto.ch" "admin.r3sto.ch"
    ftp_upload "${SCRIPT_DIR}/deploy/bill.r3sto.ch" "/sites/bill.r3sto.ch" "bill.r3sto.ch"
    ftp_upload "${SCRIPT_DIR}/deploy/booking.r3sto.ch" "/sites/booking.r3sto.ch" "booking.r3sto.ch"
    ftp_upload "${SCRIPT_DIR}/deploy/menu.r3sto.ch" "/sites/menu.r3sto.ch" "menu.r3sto.ch"
    ftp_upload "${SCRIPT_DIR}/deploy/delivery.r3sto.ch" "/sites/delivery.r3sto.ch" "delivery.r3sto.ch"

    # 3. App React → app.r3sto.ch
    echo -e "\n${B}[3/5] App React...${N}"
    ftp_upload "${SCRIPT_DIR}/deploy/app.r3sto.ch" "/sites/app.r3sto.ch" "app.r3sto.ch"

    # 4. Demo (custom pages + app)
    echo -e "\n${B}[4/5] Demo...${N}"
    ftp_upload "${SCRIPT_DIR}/deploy/demo.r3sto.ch" "/sites/demo.r3sto.ch" "demo.r3sto.ch"

    # 5. Backend API
    echo -e "\n${B}[5/5] Backend API...${N}"
    ssh_deploy

    echo -e "\n${G}═══════════════════════════════════════${N}"
    echo -e "${G}  ✓ TOUT DÉPLOYÉ !${N}"
    echo -e "${G}═══════════════════════════════════════${N}"
    ;;
  *)
    echo -e "${R}Usage: bash deploy.sh [r3sto|app|demo|auth|admin|bill|booking|menu|api|all]${N}"
    exit 1
    ;;
esac

echo -e "\n${B}Terminé.${N}"
