# R3STO Backend

API Express + MariaDB modulaire pour l'écosystème R3STO.

## Structure

```
backend/
├── server.js               # Entry point (dotenv + createApp + listen)
├── package.json
├── .env.example            # Template — copier en .env (jamais commité)
└── src/
    ├── app.js              # Express factory (middlewares + routes)
    ├── config/
    │   ├── index.js        # Config gelée depuis process.env
    │   └── db.js           # Pool MariaDB + query/execute/withTransaction
    ├── middleware/
    │   ├── cors.js         # Whitelist *.r3sto.ch
    │   ├── auth.js         # JWT Bearer + rôles
    │   ├── validate.js     # Wrapper Zod
    │   └── error.js        # 404 + handler global
    ├── utils/
    │   ├── responses.js    # ok/created/fail + HttpError
    │   ├── jwt.js          # sign/verify
    │   ├── mailer.js       # Nodemailer Infomaniak
    │   └── otp.js          # OTP store + email branded
    ├── db/
    │   ├── migrate.js      # Runner versioned (--status, --reset)
    │   └── migrations/
    │       └── 001_initial.sql
    └── modules/
        ├── health/         # GET /health
        ├── auth/           # /auth/{register,login,send-otp,verify-otp,me}
        ├── restaurants/    # CRUD complet — alias /resto
        └── reservations/   # CRUD + search/stats/bulk — alias /resas
```

Chaque module métier suit le pattern : `routes → controller → service → schema (Zod)`.

## Routes exposées (Round 1)

Le shim `/api/*` strip le préfixe pour le front. Toutes les routes ci-dessous
sont donc atteignables sous `/api/...` ou directement.

- `GET  /health`
- `POST /auth/register`, `/auth/login`, `/auth/send-otp`, `/auth/verify-otp`
- `GET  /auth/me`
- `GET|POST|PATCH|DELETE /restaurants` (+ alias `/resto`)
- `GET|POST|PATCH|DELETE /resas` (+ alias `/reservations`)
  - `GET /resas/search?q=`, `/resas/stats`, `POST|DELETE /resas/bulk`
  - `PATCH|POST /resas/:id/status`

## Variables d'environnement

Voir `.env.example`. À minima :

```
NODE_ENV=production
PORT=3000
DB_HOST=...
DB_USER=...
DB_PASS=...
DB_NAME=...
JWT_SECRET=...
SETUP_KEY=...
CORS_ORIGINS=https://r3sto.ch,https://app.r3sto.ch,https://admin.r3sto.ch,...
SMTP_HOST=mail.infomaniak.com
SMTP_PORT=587
SMTP_USER=noreply@r3sto.ch
SMTP_PASS=...
SUPERADMIN_EMAIL=didier@r3sto.com
SUPERADMIN_PASSWORD=...
```

## Commandes locales

```bash
npm install
cp .env.example .env  # puis remplir
npm run migrate       # applique les migrations en attente
npm run migrate:status
npm start
```

## Déploiement Infomaniak

Depuis la racine du repo, sur Windows :

```powershell
.\deploy\DEPLOY-BACKEND.ps1
```

Le script pousse `src/`, `server.js`, `package.json`, lance `npm install --omit=dev`,
applique les migrations, redémarre Node et teste `/api/health`.

Le `.env` n'est jamais poussé : il doit être créé une fois pour toutes côté serveur
(`~/sites/api.r3sto.ch/.env`).

## À venir (rounds suivants)

Salles, tables, combos, services, fermetures, options, clients CRM, staff/PIN,
widget public, notifications, menu, gift cards, reviews, loyalty, multi-site,
bill/orders/KDS, Stripe webhooks, QA bout en bout.
