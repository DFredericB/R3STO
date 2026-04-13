#!/bin/bash
# ═══════════════════════════════════════════════════════════════
#  R3STO — Test E2E v2 (extractions inline, debug verbeux)
# ═══════════════════════════════════════════════════════════════

API="https://api.r3sto.ch/api"
EMAIL="didier@r3sto.ch"
PASSWORD='R3sto2026!'

PASS=0
FAIL=0
declare -a FAILS

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

echo -e "${B}═══════════════════════════════════════════${N}"
echo -e "${B}  R3STO API — E2E v2${N}"
echo -e "${B}═══════════════════════════════════════════${N}"

# ─── Login ─────────────────────────────────────────────────
echo -e "\n${Y}▶ Login${N}"
LOGIN=$(curl -s -X POST "$API/auth/login" -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")
TOKEN=$(echo "$LOGIN" | python3 -c "
import sys, json
try:
    d = json.loads(sys.stdin.read())
    print(d.get('access_token') or d.get('token') or '')
except Exception as e:
    pass
")
if [ -z "$TOKEN" ]; then
  echo -e "${R}✗ ABORT — pas de token${N}"
  echo "  raw login response: $LOGIN"
  exit 1
fi
echo -e "  ${G}✓${N} Login OK, token: ${TOKEN:0:30}..."
PASS=$((PASS+1))
AUTH="Authorization: Bearer $TOKEN"

# ─── Récup restaurant_id ───────────────────────────────────
echo -e "\n${Y}▶ Bootstrap restaurant${N}"
RESTOS=$(curl -s "$API/restaurants" -H "$AUTH")
echo -e "  ${B}raw /restaurants response:${N} $RESTOS"
RID=$(echo "$RESTOS" | python3 -c "
import sys, json
try:
    d = json.loads(sys.stdin.read())
    candidates = d.get('restaurants') or d.get('items') or d.get('data') or []
    if isinstance(candidates, list) and candidates:
        first = candidates[0]
        if isinstance(first, dict):
            print(first.get('id') or '')
except Exception:
    pass
")
echo -e "  ${B}restaurant_id extracted:${N} '$RID'"

if [ -z "$RID" ]; then
  echo -e "${Y}⚠ Pas de restaurant trouvé, création d'un de test${N}"
  CR=$(curl -s -X POST "$API/restaurants" -H "$AUTH" -H "Content-Type: application/json" \
    -d '{"name":"E2E Test Resto","type":"restaurant","city":"Geneve"}')
  echo -e "  ${B}raw create response:${N} $CR"
  RID=$(echo "$CR" | python3 -c "
import sys, json
try:
    d = json.loads(sys.stdin.read())
    r = d.get('restaurant') or {}
    print(r.get('id') or '')
except Exception: pass
")
  echo -e "  ${B}new restaurant_id:${N} '$RID'"
fi

if [ -z "$RID" ]; then
  echo -e "${R}✗ ABORT — impossible d'obtenir un restaurant_id${N}"
  exit 1
fi
echo -e "  ${G}✓${N} restaurant_id = $RID"
PASS=$((PASS+1))

# Helper d'extraction d'id depuis une réponse JSON (clés multiples possibles)
extract_id() {
  python3 -c "
import sys, json
keys = sys.argv[1].split(',')
try:
    d = json.loads(sys.stdin.read())
    for k in keys:
        v = d.get(k)
        if isinstance(v, dict) and v.get('id'):
            print(v['id']); break
        if isinstance(v, list) and v and isinstance(v[0], dict) and v[0].get('id'):
            print(v[0]['id']); break
    else:
        # fallback: first nested dict with an id
        for v in d.values():
            if isinstance(v, dict) and v.get('id'):
                print(v['id']); break
except Exception: pass
" "$1"
}

# ─── SALLES ─────────────────────────────────────────────────
echo -e "\n${Y}▶ Salles${N}"
RESP=$(curl -s -X POST "$API/salles" -H "$AUTH" -H "Content-Type: application/json" \
  -d "{\"restaurant_id\":$RID,\"nom\":\"Salle E2E\",\"capacite\":40,\"position\":99}")
check "POST /salles" "$RESP"
SID=$(echo "$RESP" | extract_id "salle,salles,item")
echo -e "  ${B}salle_id:${N} '$SID'"

check "GET /salles?restaurant_id=$RID" "$(curl -s "$API/salles?restaurant_id=$RID" -H "$AUTH")"
[ -n "$SID" ] && check "PATCH /salles/$SID" "$(curl -s -X PATCH "$API/salles/$SID" -H "$AUTH" -H "Content-Type: application/json" -d '{"capacite":50}')"

# ─── TABLES ─────────────────────────────────────────────────
echo -e "\n${Y}▶ Tables${N}"
RESP=$(curl -s -X POST "$API/tables" -H "$AUTH" -H "Content-Type: application/json" \
  -d "{\"restaurant_id\":$RID,\"salle_id\":$SID,\"numero\":\"E2E-1\",\"couverts_min\":2,\"couverts_max\":4,\"forme\":\"round\",\"zone\":\"centre\"}")
check "POST /tables (1)" "$RESP"
TID=$(echo "$RESP" | extract_id "table,tables,item")
echo -e "  ${B}table_id:${N} '$TID'"

RESP=$(curl -s -X POST "$API/tables" -H "$AUTH" -H "Content-Type: application/json" \
  -d "{\"restaurant_id\":$RID,\"salle_id\":$SID,\"numero\":\"E2E-2\",\"couverts_min\":2,\"couverts_max\":4}")
check "POST /tables (2)" "$RESP"
TID2=$(echo "$RESP" | extract_id "table,tables,item")
echo -e "  ${B}table_id 2:${N} '$TID2'"

check "GET /tables?restaurant_id=$RID" "$(curl -s "$API/tables?restaurant_id=$RID" -H "$AUTH")"

# ─── COMBOS ─────────────────────────────────────────────────
echo -e "\n${Y}▶ Combos${N}"
if [ -n "$TID" ] && [ -n "$TID2" ]; then
  RESP=$(curl -s -X POST "$API/combos" -H "$AUTH" -H "Content-Type: application/json" \
    -d "{\"restaurant_id\":$RID,\"label\":\"Combo E2E\",\"table_ids\":[$TID,$TID2],\"couverts_min\":4,\"couverts_max\":8,\"align\":\"C\"}")
  check "POST /combos" "$RESP"
  CID=$(echo "$RESP" | extract_id "combo,combos,item")
fi

# ─── SERVICES ───────────────────────────────────────────────
echo -e "\n${Y}▶ Services${N}"
RESP=$(curl -s -X POST "$API/services" -H "$AUTH" -H "Content-Type: application/json" \
  -d "{\"restaurant_id\":$RID,\"salle_id\":$SID,\"nom\":\"Midi E2E\",\"type\":\"midi\",\"heure_debut\":\"12:00:00\",\"heure_fin\":\"14:30:00\",\"jours\":\"1,2,3,4,5\"}")
check "POST /services" "$RESP"
SVID=$(echo "$RESP" | extract_id "service,services,item")

# ─── FERMETURES ─────────────────────────────────────────────
echo -e "\n${Y}▶ Fermetures${N}"
RESP=$(curl -s -X POST "$API/fermetures" -H "$AUTH" -H "Content-Type: application/json" \
  -d "{\"restaurant_id\":$RID,\"label\":\"Vacances E2E\",\"date_debut\":\"2026-08-01\",\"date_fin\":\"2026-08-15\",\"type\":\"vacances\"}")
check "POST /fermetures" "$RESP"
FID=$(echo "$RESP" | extract_id "fermeture,fermetures,item")

# ─── OPTIONS ────────────────────────────────────────────────
echo -e "\n${Y}▶ Options restaurant${N}"
check "PUT /options-restaurant/$RID (créa)" "$(curl -s -X PUT "$API/options-restaurant/$RID" -H "$AUTH" -H "Content-Type: application/json" -d '{"wifi":1,"terrasse":1,"langues":"fr,en","annulation_h":12}')"
check "PUT /options-restaurant/$RID (maj)" "$(curl -s -X PUT "$API/options-restaurant/$RID" -H "$AUTH" -H "Content-Type: application/json" -d '{"parking":1}')"
check "GET /options-restaurant/$RID" "$(curl -s "$API/options-restaurant/$RID" -H "$AUTH")"

# ─── CLIENTS ────────────────────────────────────────────────
echo -e "\n${Y}▶ Clients${N}"
RESP=$(curl -s -X POST "$API/clients" -H "$AUTH" -H "Content-Type: application/json" \
  -d "{\"restaurant_id\":$RID,\"prenom\":\"Jean\",\"nom\":\"E2ETest\",\"email\":\"e2e@test.ch\",\"telephone\":\"+41791234567\"}")
check "POST /clients" "$RESP"
CLID=$(echo "$RESP" | extract_id "client,clients,item")
check "GET /clients/search/E2ETest" "$(curl -s "$API/clients/search/E2ETest" -H "$AUTH")"

# ─── WAITLIST ───────────────────────────────────────────────
echo -e "\n${Y}▶ Waitlist${N}"
RESP=$(curl -s -X POST "$API/waitlist" -H "$AUTH" -H "Content-Type: application/json" \
  -d "{\"restaurant_id\":$RID,\"client_nom\":\"Jean E2ETest\",\"client_tel\":\"+41791234567\",\"couverts\":2,\"date_souhaitee\":\"2026-05-01\",\"statut\":\"waiting\"}")
check "POST /waitlist" "$RESP"
WID=$(echo "$RESP" | extract_id "waitlist,item")
[ -n "$WID" ] && check "PATCH /waitlist/$WID" "$(curl -s -X PATCH "$API/waitlist/$WID" -H "$AUTH" -H "Content-Type: application/json" -d '{"statut":"notified"}')"

# ─── RESERVATION ────────────────────────────────────────────
echo -e "\n${Y}▶ Reservation${N}"
TIDPAYLOAD="null"
[ -n "$TID" ] && TIDPAYLOAD="$TID"
RESP=$(curl -s -X POST "$API/resas" -H "$AUTH" -H "Content-Type: application/json" \
  -d "{\"restaurant_id\":$RID,\"guest_name\":\"Jean E2ETest\",\"guest_phone\":\"+41791234567\",\"party_size\":2,\"date\":\"2026-05-01\",\"time\":\"19:30\",\"table_id\":$TIDPAYLOAD,\"source\":\"app\"}")
check "POST /resas" "$RESP"
RVID=$(echo "$RESP" | extract_id "reservation,reservations,item")

# ─── LOGS ───────────────────────────────────────────────────
echo -e "\n${Y}▶ Action logs${N}"
RVPAYLOAD="null"
[ -n "$RVID" ] && RVPAYLOAD="$RVID"
RESP=$(curl -s -X POST "$API/logs" -H "$AUTH" -H "Content-Type: application/json" \
  -d "{\"restaurant_id\":$RID,\"reservation_id\":$RVPAYLOAD,\"action\":\"e2e_test\",\"detail\":\"Test E2E\",\"type\":\"info\",\"user_name\":\"E2E Bot\"}")
check "POST /logs" "$RESP"
check "GET /logs?restaurant_id=$RID" "$(curl -s "$API/logs?restaurant_id=$RID&limit=10" -H "$AUTH")"

# ─── CLEANUP ────────────────────────────────────────────────
echo -e "\n${Y}▶ Cleanup${N}"
[ -n "$RVID" ] && check "DELETE /resas/$RVID" "$(curl -s -X DELETE "$API/resas/$RVID" -H "$AUTH")"
[ -n "$WID" ] && check "DELETE /waitlist/$WID" "$(curl -s -X DELETE "$API/waitlist/$WID" -H "$AUTH")"
[ -n "$CLID" ] && check "DELETE /clients/$CLID" "$(curl -s -X DELETE "$API/clients/$CLID" -H "$AUTH")"
[ -n "$FID" ] && check "DELETE /fermetures/$FID" "$(curl -s -X DELETE "$API/fermetures/$FID" -H "$AUTH")"
[ -n "$SVID" ] && check "DELETE /services/$SVID" "$(curl -s -X DELETE "$API/services/$SVID" -H "$AUTH")"
[ -n "$CID" ] && check "DELETE /combos/$CID" "$(curl -s -X DELETE "$API/combos/$CID" -H "$AUTH")"
[ -n "$TID" ] && check "DELETE /tables/$TID" "$(curl -s -X DELETE "$API/tables/$TID" -H "$AUTH")"
[ -n "$TID2" ] && check "DELETE /tables/$TID2" "$(curl -s -X DELETE "$API/tables/$TID2" -H "$AUTH")"
[ -n "$SID" ] && check "DELETE /salles/$SID" "$(curl -s -X DELETE "$API/salles/$SID" -H "$AUTH")"

# ─── SECURITY ───────────────────────────────────────────────
echo -e "\n${Y}▶ Sécurité${N}"
BAD=$(curl -s "$API/salles" -H "Authorization: Bearer xxx_invalid")
if echo "$BAD" | grep -qE '"ok":false|nauthorized|nvalid'; then
  echo -e "  ${G}✓${N} Token invalide refusé"; PASS=$((PASS+1))
else
  echo -e "  ${R}✗${N} Token invalide accepté: $BAD"; FAIL=$((FAIL+1)); FAILS+=("token invalide accepté")
fi

# ─── RECAP ──────────────────────────────────────────────────
echo -e "\n${B}═══════════════════════════════════════════${N}"
TOTAL=$((PASS+FAIL))
if [ $FAIL -eq 0 ]; then
  echo -e "${G}  ✓ TOUT PASSE — $PASS/$TOTAL${N}"
else
  echo -e "${R}  ✗ ÉCHECS : $FAIL/$TOTAL${N}"
  for f in "${FAILS[@]}"; do echo -e "    - $f"; done
fi
echo -e "${B}═══════════════════════════════════════════${N}"
