# R3STO — AUDIT GÉNÉRAL CONSOLIDÉ
**Date :** 7 avril 2026
**Périmètre :** structure du code, base de données, flux métier (billing/menu/delivery), readiness mise en production
**Statut global :** ⚠️ NON prêt pour la production — 4 à 6 semaines de travail estimées

---

## 1. SYNTHÈSE EXÉCUTIVE

R3STO est un SaaS de gestion de restaurant ambitieux : **front React 19 + Vite + TypeScript** très avancé (≈85 % fonctionnel), couplé à un **backend Express + sql.js** encore largement incomplet. Le schéma DB est bien pensé (20 tables, 4 migrations) mais repose sur sql.js (SQLite en mémoire), inadapté à la production. Les flux billing/menu/delivery sont partiellement maquettés, et plusieurs problèmes de sécurité critiques sont présents (clés Stripe live commitées, credentials FTP en clair).

**Maturité :** 5,2 / 10 — démo solide, produit non commercialisable en l'état.

---

## 2. STRUCTURE & ARCHITECTURE

### 2.1 Applications principales

| Dossier | Rôle | Stack | État |
|---|---|---|---|
| `/src` | App admin/SPA principale | React 19 + Vite + TS | ✓ ~85 % |
| `/backend` | API Express | Express + sql.js | ⚠ Partiel |
| `/api` | Module Stripe / serverless | Node | ⚠ Minimal |
| `/landing` | Site vitrine landing | ? | ❓ À clarifier |
| `/marketplace` | Annuaire restaurants | ? | ❓ Stub |
| `/site-vitrine` | Site par restaurant | ? | ❓ Stub |
| `/voice-widget` | Widget réservation vocal | React | ⚠ Beta |
| `/deploy` | Scripts FTP/SSH Infomaniak | PowerShell | ⚠ 50+ scripts désordonnés |
| `/backend-deploy` | Doublon de `/backend` | — | ❌ DEAD CODE |
| `/node_modules_old` | Sauvegarde deps | — | ❌ DEAD CODE |

### 2.2 Sous-domaines déployés (Infomaniak)
`r3sto.ch` (landing), `app.r3sto.ch`, `admin.r3sto.ch`, `demo.r3sto.ch`, `auth.r3sto.ch`, `booking.r3sto.ch`, `api.r3sto.ch`, `menu.r3sto.ch`, `bill.r3sto.ch`, `delivery.r3sto.ch`.

### 2.3 Problèmes structurels
- Duplication `/backend` ↔ `/backend-deploy` à éliminer.
- `/node_modules_old` à supprimer.
- 50+ scripts de déploiement, à archiver ou consolider en 2-3 scripts canoniques.
- Statut de `/landing`, `/marketplace`, `/site-vitrine` à clarifier (utilisés ou abandonnés ?).

---

## 3. BASE DE DONNÉES

### 3.1 Schéma actuel (`/backend/db.js`, ~500 lignes)
20 tables, 4 migrations :
- **Cœur métier :** restaurants, users, salles, tables, combos, services, resas, clients, options
- **Modules :** fermetures, gift_cards, reviews, loyalty_config / loyalty_cards / loyalty_events, room_items, sites (multi-site), orders, notifications, audit_logs
- **Migrations :** 001 initial, 002 Stripe, 003 password_resets, 004 addons

### 3.2 Problèmes critiques
**DB-1 — sql.js inadapté à la production (P1)**
- SQLite en mémoire, sauvegarde fichier toutes les 3 s.
- Pas de connexions concurrentes, pas de scaling horizontal, perte de données possible au crash.
- ➜ **Migration vers MySQL/MariaDB (Infomaniak) ou PostgreSQL** avec un vrai ORM (Prisma recommandé).

**DB-2 — Index manquants (P2)**
```sql
CREATE INDEX idx_resas_date_svc ON resas(date, svc);
CREATE INDEX idx_resas_status ON resas(s);
CREATE INDEX idx_clients_restaurant ON clients(restaurantId);
CREATE INDEX idx_orders_status ON orders(status);
```

**DB-3 — Champs morts (P3) :** `resas.src`, `_closedToday`, plusieurs champs de `restaurants` non utilisés.

---

## 4. FLUX MÉTIER

### 4.1 Réservations — ✓ ~95 %
CRUD complet, statuts (reserved/arrived/done/cancelled/noshow/waitlist), affectation tables, blacklist, données démo riches.
**À faire :** brancher l'IA placement (stub dans `RULES.ts`), tester le double-booking guard, ajouter sync temps réel (WebSocket).

### 4.2 Menu — ❌ ~20 % (STUB)
Pas d'éditeur, pas de table en DB, pas d'endpoint `/api/menus`. Annoncé Gastro mais non fonctionnel.
**À faire :** tables `menu_categories` + `menu_items`, CRUD complet, éditeur drag & drop, allergènes, prix, versions.

### 4.3 Commandes / Delivery / KDS — ❌ ~15 %
Vues `Commandes`, `KDS`, `Service` marquées beta/locked, données hardcodées. Routes `/api/orders` existent mais sans logique réelle.
**À faire :** générer les commandes depuis les résas + menu, brancher le KDS, statuts pending → preparing → ready → served, alertes son.

### 4.4 Billing & Paiement — ⚠ ~40 %
- ✓ Checkout Stripe abonnements Bistro/Resto/Gastro.
- ❌ Prépaiement / acompte no-show : UI maquette uniquement.
- ❌ QR Code Payment annoncé mais inexistant.
- ❌ Webhooks Stripe : handlers vides (`/backend/routes/stripe-webhook.js`).
- ⚠ `@ts-ignore` dans `/src/utils/stripe.ts:12`.

### 4.5 Marketing / Email / SMS — ❌ ~10 %
Templates définis (`emails.ts`, `sms.ts`), automations hardcodées. **Aucun envoi réel** : ni SendGrid/Mailgun, ni Twilio. Conséquence : aucun client ne reçoit confirmation, rappel, ni campagne. **Bloquant SaaS.**

### 4.6 Admin & Configuration — ✓ ~90 %
Profil resto, options (65+ toggles), rôles, fermetures, services, plan de salle drag & drop, multi-site (jusqu'à 12 sites Gastro). Quelques boutons "toast-only" à brancher (export CSV, historique connexions).

---

## 5. SÉCURITÉ — ALERTES P1

| # | Problème | Localisation | Action immédiate |
|---|---|---|---|
| 🔴 | **Clés Stripe LIVE commitées** | `/.env`, `/backend/.env` | **Révoquer immédiatement** sur dashboard Stripe, régénérer, retirer du repo |
| 🔴 | `.env` versionnés dans git | racine + backend | `git rm --cached`, ajouter au `.gitignore`, scrub historique |
| 🔴 | Credentials FTP/SSH en clair | `/deploy/*.ps1` | Migrer vers GitHub Secrets ou variables d'env |
| 🟠 | JWT en localStorage | `/src/api/apiService.ts` | Passer en cookies httpOnly |
| 🟠 | CORS trop permissif | `/backend/server.js:40-47` | Whitelist explicite des domaines r3sto.ch |
| 🟠 | Pas de rate-limit auth | `/backend/routes/auth.js` | Ajouter `express-rate-limit` |
| 🟠 | Pas de validation d'entrée | toutes les routes API | Zod ou Joi sur tous les endpoints |
| 🟠 | `DEMO_MODE=true` en prod | `/backend/.env` | Désactiver |
| 🟠 | Pas d'enforcement HTTPS | backend | Helmet + redirect HTTP→HTTPS |

---

## 6. READINESS PRODUCTION

**Build :** `npm run build` → `/dist` (OK).
**Déploiement :** manuel, FTP/SSH Infomaniak, 50+ scripts non maintenus.
**CI/CD :** ❌ aucun (à mettre en place : GitHub Actions lint → build → deploy).
**Logs :** `console.log`, pas de logger structuré (Winston/Pino recommandé).
**Erreurs :** middleware existant côté backend, mais SQL errors non sanitisées.
**Backups DB :** inexistants tant que sql.js est utilisé.
**Monitoring :** absent.

---

## 7. LISTE PRIORISÉE DES ACTIONS

### 🔴 P1 — Bloquants production (Semaine 1-3)
1. Révoquer + régénérer toutes les clés Stripe live.
2. Retirer `.env` du repo + nettoyer historique git.
3. Sortir credentials des scripts deploy (GitHub Secrets).
4. **Migrer sql.js → MySQL/MariaDB Infomaniak (Prisma).**
5. Finaliser auth multi-tenant (login/register/refresh/reset password).
6. Brancher envoi réel email (SendGrid/Mailgun) + SMS (Twilio).
7. Implémenter webhooks Stripe + paiements réels.
8. Ajouter validation d'entrée (Zod) sur toutes les routes.

### 🟠 P2 — Importants (Semaine 3-5)
9. Implémenter le module Menu (CRUD + UI).
10. Compléter Commandes / KDS / Delivery.
11. Ajouter index DB.
12. Cookies httpOnly pour JWT.
13. Rate-limit + helmet + CORS strict.
14. Flux mot de passe oublié.
15. SSL/HTTPS forcé sur tous les sous-domaines.
16. i18n sur les 7 vues manquantes (Fidelite, Widget, Menu, Commandes, KDS, Service, Caisse).

### 🟡 P3 — À planifier (Semaine 5-6+)
17. Supprimer dead code (`/backend-deploy`, `/node_modules_old`).
18. Consolider scripts deploy (3 scripts max + dossier `/archive`).
19. Export CSV réel.
20. Sync temps réel (WebSocket).
21. IA placement (RULES.ts).
22. Clarifier `/landing`, `/marketplace`, `/site-vitrine`.
23. Analytics + monitoring (Sentry, Plausible).
24. CI/CD GitHub Actions.

---

## 8. PROCHAINE ÉTAPE — VÉRIFICATION ÉLÉMENT PAR ÉLÉMENT

Comme convenu, après cet audit nous reprenons chaque élément un par un. Ordre proposé (du plus critique au moins critique) :

1. **Sécurité immédiate** — révocation Stripe + nettoyage git (1 h)
2. **Migration DB MySQL** — conception du schéma Prisma (1-2 jours)
3. **Auth backend complète** — login/register/reset (2-3 jours)
4. **Stripe : webhooks + paiements** (2 jours)
5. **Email/SMS opérationnels** (3-5 jours)
6. **Menu module** (3 jours)
7. **Commandes / KDS / Delivery** (1-2 semaines)
8. **Nettoyage deploy + CI/CD** (1-2 jours)
9. **i18n + finitions UI** (1-2 jours)
10. **QA finale + go-live** (2-3 jours)

Dites-moi par lequel vous souhaitez commencer — je recommande fortement de **traiter la sécurité Stripe en premier (1 h max)** avant tout le reste.
