# R3STO Booking Worker

Backend minimal — reçoit les réservations depuis `r3sto.com` et envoie 2 emails via Postmark :
1. Au client (confirmation avec référence)
2. Au restaurant (notification nouvelle résa, reply-to = email client)

**Stack** : Cloudflare Worker (gratuit, 100K req/jour) + Postmark (gratuit 100 mails/mois).

## ⚡ Setup en 15 minutes

### 1. Postmark (5 min)

1. Crée un compte → https://postmarkapp.com (gratuit, 100 mails/mois)
2. **Sender Signatures** → ajoute `noreply@r3sto.com` → vérifie l'email
3. **Servers** → crée un Server "R3STO Prod" → onglet **API Tokens** → copie le **Server API Token**

### 2. Cloudflare Worker (10 min)

```bash
cd /Users/DBo_3/Dev/R3STO/api/booking-worker
npm install
npx wrangler login         # se connecte à ton compte Cloudflare
```

Configure les variables secrètes :
```bash
npx wrangler secret put POSTMARK_TOKEN
# colle le Server API Token Postmark

npx wrangler secret put FROM_EMAIL
# tape : noreply@r3sto.com

npx wrangler secret put ADMIN_EMAIL
# tape : contact@r3sto.com   (fallback si un resto n'a pas d'email connu)
```

Déploie :
```bash
npm run deploy
```

Tu obtiens une URL du type `https://r3sto-booking.<ton-compte>.workers.dev`.

### 3. (Optionnel) Brancher sur un sous-domaine

Si tu veux `https://api.r3sto.com/booking` au lieu de `*.workers.dev` :

1. Cloudflare Dashboard → ton domaine → **DNS** → ajoute un enregistrement CNAME `api` → `r3sto-booking.<compte>.workers.dev` (proxy ☁ activé)
2. Décommente la section `[[routes]]` dans `wrangler.toml` puis `npm run deploy`

### 4. Test rapide

```bash
curl -X POST https://r3sto-booking.<ton-compte>.workers.dev/booking \
  -H "Content-Type: application/json" \
  -H "Origin: https://r3sto.com" \
  -d '{
    "slug": "chez-bunnys",
    "name": "Jean Dupont",
    "email": "TON-EMAIL@gmail.com",
    "phone": "+41 79 123 45 67",
    "date": "2026-05-30",
    "time": "19:30",
    "pax": 2,
    "notes": "Test depuis curl"
  }'
```

Tu devrais recevoir 2 emails (1 sur ton mail, 1 sur le `ADMIN_EMAIL`).

### 5. Brancher le front R3STO

Édite la constante `API_URL` dans les pages qui contiennent le modal de résa (`landing/index.html`, `landing/fiche.html`) :

```js
const API_URL = 'https://r3sto-booking.<ton-compte>.workers.dev';
// ou si tu as configuré le sous-domaine :
// const API_URL = 'https://api.r3sto.com';
```

## 📐 Endpoint

### `POST /booking`

**Headers** :
- `Content-Type: application/json`
- `Origin: https://r3sto.com` (CORS — domaine doit être dans `ALLOWED_ORIGINS`)

**Body** :
```json
{
  "slug":  "chez-bunnys",
  "name":  "Jean Dupont",
  "email": "jean@example.com",
  "phone": "+41 79 ... (optionnel)",
  "date":  "2026-05-30",
  "time":  "19:30",
  "pax":   2,
  "notes": "Allergie noix (optionnel)"
}
```

**Réponse OK 200** :
```json
{
  "ok": true,
  "ref": "R3-MX9F7-A2B3",
  "clientSent": true,
  "restoSent": true,
  "resto": "Chez Bunny's",
  "date": "samedi 30 mai 2026"
}
```

**Réponse erreur 400** :
```json
{ "error": "Champ requis manquant: email" }
```

## 🧪 Dev local

```bash
npm run dev
# Worker écoute sur http://localhost:8787
```

Pour tester le envoi de mail en dev, mets aussi tes secrets en local :
```bash
npx wrangler secret put POSTMARK_TOKEN --local
# etc.
```

## 🔭 Roadmap

- [ ] Sprint B : brancher Supabase pour stocker la résa dans `bookings`
- [ ] Sprint C : enrichir `RESTOS` via Google Places API
- [ ] Sprint D : token JWT pour les liens magiques de modification / annulation
- [ ] Sprint E : cron rappel J-1 (Cloudflare Cron Trigger)
- [ ] Sprint F : webhook Postmark pour tracker les bounces/spam
- [ ] Sprint G : signature HMAC sur les POST pour éviter les bots

## 📞 Support

Email : tech@r3sto.com
Repo  : (TODO — push sur GitHub)
