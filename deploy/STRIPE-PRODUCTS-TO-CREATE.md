# Produits Stripe à créer dans le dashboard

Date : 2026-05-20 · Locked pricing

## Dashboard URL
https://dashboard.stripe.com/products → "Add product"

---

## 1️⃣ R3STO Mini (offre spéciale lancement)

**Product** :
- Name : `R3STO Mini`
- Description : `Le calepin numérique du restaurateur indépendant. Offre spéciale lancement.`
- Image : logo R3STO Mini cuivre
- Statement descriptor : `R3STO MINI`
- Tax behavior : `Inclusive` (TVA suisse 8.1% incluse) ou `Exclusive` selon ton choix
- Metadata :
  - `plan: mini`
  - `tier: 1`
  - `commitment: 3y`

**Price** (1 seul prix) :
- Pricing model : `Recurring`
- Amount : **19.00 CHF**
- Billing period : `Monthly`
- ⚠️ **Subscription minimum duration : 36 months** (à configurer dans subscription settings ou via API)
- Lookup key : `mini_3y`
- Metadata : `billing: triennial`

→ Note Price ID : `STRIPE_PRICE_MINI_3Y=price_xxx`

---

## 2️⃣ R3STO Essentiel

**Product** :
- Name : `R3STO Essentiel`
- Description : `L'entrée Pro : vraie plateforme avec équipe (3 users, plan 2D, anti no-show, SMS, CRM avancé).`
- Statement descriptor : `R3STO ESSENTIEL`
- Metadata : `plan: essentiel`, `tier: 2`

**Prices (2)** :

| Price | Amount | Period | Lookup key | Metadata |
|---|---|---|---|---|
| Mensuel | 39.00 CHF | Monthly | `essentiel_m` | `billing: monthly` |
| Annuel | 420.00 CHF | Yearly | `essentiel_y` | `billing: yearly` |

→ Note : `STRIPE_PRICE_ESSENTIEL_M=price_xxx` et `STRIPE_PRICE_ESSENTIEL_Y=price_xxx`

---

## 3️⃣ R3STO Premium

**Product** :
- Name : `R3STO Premium`
- Description : `L'intelligence : auto-pilot IA, marketing campagnes, 2 établissements, users illimités.`
- Statement descriptor : `R3STO PREMIUM`
- Metadata : `plan: premium`, `tier: 3`

**Prices (2)** :

| Price | Amount | Period | Lookup key |
|---|---|---|---|
| Mensuel | 59.00 CHF | Monthly | `premium_m` |
| Annuel | 636.00 CHF | Yearly | `premium_y` |

→ `STRIPE_PRICE_PREMIUM_M=price_xxx` · `STRIPE_PRICE_PREMIUM_Y=price_xxx`

---

## 4️⃣ R3STO Signature

**Product** :
- Name : `R3STO Signature`
- Description : `Le top : multi-sites illimité, yield management, site vitrine, white-label, API, account manager.`
- Statement descriptor : `R3STO SIGNATURE`
- Metadata : `plan: signature`, `tier: 4`

**Prices (2)** :

| Price | Amount | Period | Lookup key |
|---|---|---|---|
| Mensuel | 79.00 CHF | Monthly | `signature_m` |
| Annuel | 852.00 CHF | Yearly | `signature_y` |

→ `STRIPE_PRICE_SIGNATURE_M=price_xxx` · `STRIPE_PRICE_SIGNATURE_Y=price_xxx`

---

## Total : 4 produits · 7 prix

Une fois les 7 Price IDs collectés, les ajouter dans :

### `.env` côté backend (`deploy/api.r3sto.ch-node/.env`)
```bash
STRIPE_SECRET=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_PRICE_MINI_3Y=price_xxx
STRIPE_PRICE_ESSENTIEL_M=price_xxx
STRIPE_PRICE_ESSENTIEL_Y=price_xxx
STRIPE_PRICE_PREMIUM_M=price_xxx
STRIPE_PRICE_PREMIUM_Y=price_xxx
STRIPE_PRICE_SIGNATURE_M=price_xxx
STRIPE_PRICE_SIGNATURE_Y=price_xxx
```

### `.env` côté frontend Vite (`.env`)
```bash
VITE_STRIPE_PUBLIC_KEY=pk_live_xxx
VITE_API_BASE=https://api.r3sto.com
VITE_STRIPE_PRICE_MINI_3Y=price_xxx
VITE_STRIPE_PRICE_ESSENTIEL_M=price_xxx
VITE_STRIPE_PRICE_PREMIUM_M=price_xxx
VITE_STRIPE_PRICE_SIGNATURE_M=price_xxx
```

---

## ⚠️ Configuration critique pour Mini 3-ans

Stripe ne propose pas nativement un "engagement minimum 36 mois" via product config.
**3 approches possibles** :

1. **Pénalité d'annulation anticipée** (recommandé)
   - Dans `subscription.cancel_at_period_end = false` côté API
   - Refuser la cancellation avant 36 cycles via webhook ou métier
   - CGU explicites : "engagement 3 ans, frais d'annulation anticipée 50% du restant dû"

2. **Pre-paid 36 mois** (plus radical)
   - Vendre une subscription unique de 36 × 19 = **684 CHF** payée à la signature
   - Pas de "mensuel" Stripe — c'est un one-shot lien Stripe
   - Sécurité max mais barrière à l'entrée élevée

3. **Subscription Schedule** (Stripe natif)
   - Créer une `SubscriptionSchedule` avec phases définies 36 mois
   - End_behavior = `release` ou `cancel`
   - Plus complexe mais conforme Stripe

→ **Reco** : option 1 (CGU + soft enforcement). Si quelqu'un cancel avant 36 mois, on facture les mois restants comme penalty.

---

## Modules add-on (à créer plus tard)

| Module | Prix | Récurrence |
|---|---|---|
| Site vitrine | 15 CHF/mois | Monthly |
| Order (click&collect) | 19 CHF/mois | Monthly |
| Delivery | 29 CHF/mois | Monthly |
| Gift cards | 9 CHF/mois | Monthly |
| SMS Pack 1000 | 15 CHF/mois | Monthly |
| API ouverte | 29 CHF/mois | Monthly |

→ À créer après que les 4 plans principaux soient en prod et validés.
