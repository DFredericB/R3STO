#!/bin/bash
# ═══════════════════════════════════════════════════════════════
#  R3STO — Test E2E complet de l'API
#  À lancer dans le SSH Infomaniak.
#
#  Usage : bash e2e_test.sh   OU   coller directement dans le shell
# ═══════════════════════════════════════════════════════════════

API="https://api.r3sto.ch/api"
EMAIL="didier@r3sto.ch"
PASSWORD='R3sto2026!'

PASS=0
FAIL=0
declare -a FAILS

# Couleurs (fallback si non-TTY)
if [ -t 1 ]; then
  G="\033[0;32m"; R="\033[0;31m"; Y="\033[1;33m"; B="\033[0;36m"; N="\033[0m"
else
  G=""; R=""; Y=""; B=""; N=""
fi

check() {
  local label="$1"
  local body="$2"
  if echo "$body" | grep -q '"ok":true'; then
    echo -e "  ${G}✓${N} $label"
    PASS=$((PASS+1))
  else
    echo -e "  ${R}✗${N} $label"
    echo -e "    ${R}response:${N} $body"
    FAIL=$((FAIL+1))
    FAILS+=("$label")
  fi
}

# Helper : extract field
jget() { python3 -c "import sys,json; d=json.loads(sys.stdin.read()); print($1)" 2>/dev/null; }

echo -e "${B}═══════════════════════════════════════════${N}"
echo -e "${B}  R3STO API — End-to-End Test Suite${N}"
echo -e "${B}═══════════════════════════════════════════${N}"

# ─── 0. Health check ───────────────────────────────────────
echo -e "\n${Y}▶ Health & Auth${N}"
H=$(curl -s "$API/health")
check "GET /health renvoie status:ok et db:connected" "$(echo "$H" | sed 's/"status":"ok"/"ok":true/')"

# ─── 1. Login ──────────────────────────────────────────────
LOGIN=$(curl -s -X POST "$API/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")
check "POST /auth/login renvoie un token" "$LOGIN"
TOKEN=$(echo "$LOGIN" | jget "d.get('access_token','')")
if [ -z "$TOKEN" ]; then
  echo -e "${R}✗ ABORT — pas de token, suite annulée${N}"
  exit 1
fi
AUTH="Authorization: Bearer $TOKEN"
echo -e "  ${B}token:${N} ${TOKEN:0:30}..."

# ─── 2. Récup restaurant_id existant ───────────────────────
RESTOS=$(curl -s "$API/restaurants" -H "$AUTH")
RID=$(echo "$RESTOS" | jget "(d.get('restaurants') or d.get('items') or [{}])[0].get('id','')")
if [ -z "$RID" ]; then
  echo -e "${Y}⚠ Pas de restaurant existant, création d'un test...${N}"
  CR=$(curl -s -X POST "$API/restaurants" -H "$AUTH" -H "Content-Type: application/json" \
    -d '{"name":"E2E Test Resto","type":"restaurant","city":"Geneve"}')
  RID=$(echo "$CR" | jget "d.get('restaurant',{}).get('id','')")
fi
echo -e "  ${B}restaurant_id:${N} $RID"

# ─── 3. SALLES ─────────────────────────────────────────────
echo -e "\n${Y}▶ Salles (CRUD)${N}"
S=$(curl -s -X POST "$API/salles" -H "$AUTH" -H "Content-Type: application/json" \
  -d "{\"restaurant_id\":$RID,\"nom\":\"Salle E2E\",\"capacite\":40,\"position\":99}")
check "POST /salles" "$S"
SID=$(echo "$S" | jget "(d.get('salles') or d.get('item') or {}).get('id','')")
echo -e "  ${B}salle_id:${N} $SID"

S=$(curl -s "$API/salles?restaurant_id=$RID" -H "$AUTH")
check "GET /salles?restaurant_id=$RID" "$S"

S=$(curl -s -X PATCH "$API/salles/$SID" -H "$AUTH" -H "Content-Type: application/json" \
  -d '{"capacite":50}')
check "PATCH /salles/$SID (capacite=50)" "$S"

# ─── 4. TABLES ─────────────────────────────────────────────
echo -e "\n${Y}▶ Tables${N}"
T=$(curl -s -X POST "$API/tables" -H "$AUTH" -H "Content-Type: application/json" \
  -d "{\"restaurant_id\":$RID,\"salle_id\":$SID,\"numero\":\"E2E-1\",\"couverts_min\":2,\"couverts_max\":4,\"forme\":\"round\",\"zone\":\"centre\"}")
check "POST /tables (liée à la salle)" "$T"
TID=$(echo "$T" | jget "(d.get('tables') or d.get('item') or {}).get('id','')")
echo -e "  ${B}table_id:${N} $TID"

T2=$(curl -s -X POST "$API/tables" -H "$AUTH" -H "Content-Type: application/json" \
  -d "{\"restaurant_id\":$RID,\"salle_id\":$SID,\"numero\":\"E2E-2\",\"couverts_min\":2,\"couverts_max\":4}")
TID2=$(echo "$T2" | jget "(d.get('tables') or d.get('item') or {}).get('id','')")
check "POST /tables (2e table pour combo)" "$T2"

T=$(curl -s "$API/tables?restaurant_id=$RID" -H "$AUTH")
check "GET /tables?restaurant_id=$RID" "$T"

# ─── 5. COMBOS ─────────────────────────────────────────────
echo -e "\n${Y}▶ Combos${N}"
C=$(curl -s -X POST "$API/combos" -H "$AUTH" -H "Content-Type: application/json" \
  -d "{\"restaurant_id\":$RID,\"label\":\"Combo E2E\",\"table_ids\":[$TID,$TID2],\"couverts_min\":4,\"couverts_max\":8,\"align\":\"C\"}")
check "POST /combos (regroupe 2 tables)" "$C"
CID=$(echo "$C" | jget "(d.get('combos') or d.get('item') or {}).get('id','')")

# ─── 6. SERVICES ───────────────────────────────────────────
echo -e "\n${Y}▶ Services${N}"
SV=$(curl -s -X POST "$API/services" -H "$AUTH" -H "Content-Type: application/json" \
  -d "{\"restaurant_id\":$RID,\"salle_id\":$SID,\"nom\":\"Midi E2E\",\"type\":\"midi\",\"heure_debut\":\"12:00:00\",\"heure_fin\":\"14:30:00\",\"jours\":\"1,2,3,4,5\"}")
check "POST /services (midi semaine)" "$SV"
SVID=$(echo "$SV" | jget "(d.get('services') or d.get('item') or {}).get('id','')")

# ─── 7. FERMETURES ─────────────────────────────────────────
echo -e "\n${Y}▶ Fermetures${N}"
F=$(curl -s -X POST "$API/fermetures" -H "$AUTH" -H "Content-Type: application/json" \
  -d "{\"restaurant_id\":$RID,\"label\":\"Vacances E2E\",\"date_debut\":\"2026-08-01\",\"date_fin\":\"2026-08-15\",\"type\":\"vacances\"}")
check "POST /fermetures" "$F"
FID=$(echo "$F" | jget "(d.get('fermetures') or d.get('item') or {}).get('id','')")

# ─── 8. OPTIONS RESTAURANT (upsert 1:1) ────────────────────
echo -e "\n${Y}▶ Options restaurant (upsert)${N}"
O=$(curl -s -X PUT "$API/options-restaurant/$RID" -H "$AUTH" -H "Content-Type: application/json" \
  -d '{"wifi":1,"terrasse":1,"langues":"fr,en","annulation_h":12}')
check "PUT /options-restaurant/$RID (création)" "$O"

O=$(curl -s -X PUT "$API/options-restaurant/$RID" -H "$AUTH" -H "Content-Type: application/json" \
  -d '{"parking":1}')
check "PUT /options-restaurant/$RID (mise à jour)" "$O"

O=$(curl -s "$API/options-restaurant/$RID" -H "$AUTH")
check "GET /options-restaurant/$RID" "$O"

# ─── 9. CLIENTS ────────────────────────────────────────────
echo -e "\n${Y}▶ Clients (CRM)${N}"
CL=$(curl -s -X POST "$API/clients" -H "$AUTH" -H "Content-Type: application/json" \
  -d "{\"restaurant_id\":$RID,\"prenom\":\"Jean\",\"nom\":\"E2ETest\",\"email\":\"e2e@test.ch\",\"telephone\":\"+41791234567\"}")
check "POST /clients" "$CL"
CLID=$(echo "$CL" | jget "(d.get('clients') or d.get('item') or {}).get('id','')")

CL=$(curl -s "$API/clients/search/E2ETest" -H "$AUTH")
check "GET /clients/search/E2ETest (recherche)" "$CL"

# ─── 10. WAITLIST ──────────────────────────────────────────
echo -e "\n${Y}▶ Waitlist${N}"
W=$(curl -s -X POST "$API/waitlist" -H "$AUTH" -H "Content-Type: application/json" \
  -d "{\"restaurant_id\":$RID,\"client_nom\":\"Jean E2ETest\",\"client_tel\":\"+41791234567\",\"couverts\":2,\"date_souhaitee\":\"2026-05-01\",\"statut\":\"waiting\"}")
check "POST /waitlist" "$W"
WID=$(echo "$W" | jget "(d.get('waitlist') or d.get('item') or {}).get('id','')")

W=$(curl -s -X PATCH "$API/waitlist/$WID" -H "$AUTH" -H "Content-Type: application/json" \
  -d '{"statut":"notified"}')
check "PATCH /waitlist/$WID (statut=notified)" "$W"

# ─── 11. RÉSERVATION ───────────────────────────────────────
echo -e "\n${Y}▶ Reservation (compat existante)${N}"
RV=$(curl -s -X POST "$API/resas" -H "$AUTH" -H "Content-Type: application/json" \
  -d "{\"restaurant_id\":$RID,\"guest_name\":\"Jean E2ETest\",\"guest_phone\":\"+41791234567\",\"party_size\":2,\"date\":\"2026-05-01\",\"time\":\"19:30\",\"table_id\":$TID,\"source\":\"app\"}")
check "POST /resas" "$RV"
RVID=$(echo "$RV" | jget "d.get('reservation',{}).get('id','')")

# ─── 12. ACTION LOGS ───────────────────────────────────────
echo -e "\n${Y}▶ Action logs (audit)${N}"
AL=$(curl -s -X POST "$API/logs" -H "$AUTH" -H "Content-Type: application/json" \
  -d "{\"restaurant_id\":$RID,\"reservation_id\":$RVID,\"action\":\"e2e_test\",\"detail\":\"Test E2E run\",\"type\":\"info\",\"user_name\":\"E2E Bot\"}")
check "POST /logs" "$AL"

AL=$(curl -s "$API/logs?restaurant_id=$RID&limit=10" -H "$AUTH")
check "GET /logs?restaurant_id=$RID" "$AL"

# ─── 13. CLEANUP ───────────────────────────────────────────
echo -e "\n${Y}▶ Cleanup (DELETE en cascade inverse)${N}"
[ -n "$RVID" ] && check "DELETE /resas/$RVID" "$(curl -s -X DELETE "$API/resas/$RVID" -H "$AUTH")"
[ -n "$WID" ] && check "DELETE /waitlist/$WID" "$(curl -s -X DELETE "$API/waitlist/$WID" -H "$AUTH")"
[ -n "$CLID" ] && check "DELETE /clients/$CLID" "$(curl -s -X DELETE "$API/clients/$CLID" -H "$AUTH")"
[ -n "$FID" ] && check "DELETE /fermetures/$FID" "$(curl -s -X DELETE "$API/fermetures/$FID" -H "$AUTH")"
[ -n "$SVID" ] && check "DELETE /services/$SVID" "$(curl -s -X DELETE "$API/services/$SVID" -H "$AUTH")"
[ -n "$CID" ] && check "DELETE /combos/$CID" "$(curl -s -X DELETE "$API/combos/$CID" -H "$AUTH")"
[ -n "$TID" ] && check "DELETE /tables/$TID" "$(curl -s -X DELETE "$API/tables/$TID" -H "$AUTH")"
[ -n "$TID2" ] && check "DELETE /tables/$TID2" "$(curl -s -X DELETE "$API/tables/$TID2" -H "$AUTH")"
[ -n "$SID" ] && check "DELETE /salles/$SID" "$(curl -s -X DELETE "$API/salles/$SID" -H "$AUTH")"

# ─── 14. SECURITY — token invalide doit échouer ───────────
echo -e "\n${Y}▶ Sécurité (token invalide doit être refusé)${N}"
BAD=$(curl -s "$API/salles" -H "Authorization: Bearer invalid_token_xxx")
if echo "$BAD" | grep -q '"ok":false\|nauthorized\|nvalid'; then
  echo -e "  ${G}✓${N} Token invalide correctement refusé"
  PASS=$((PASS+1))
else
  echo -e "  ${R}✗${N} Token invalide accepté ! response: $BAD"
  FAIL=$((FAIL+1))
  FAILS+=("token invalide accepté")
fi

# ─── RECAP ─────────────────────────────────────────────────
echo -e "\n${B}═══════════════════════════════════════════${N}"
TOTAL=$((PASS+FAIL))
if [ $FAIL -eq 0 ]; then
  echo -e "${G}  ✓ TOUS LES TESTS PASSENT — $PASS/$TOTAL${N}"
else
  echo -e "${R}  ✗ ÉCHECS : $FAIL/$TOTAL${N}"
  echo -e "${R}  Failed tests:${N}"
  for f in "${FAILS[@]}"; do echo -e "    - $f"; done
fi
echo -e "${B}═══════════════════════════════════════════${N}"
