# R3STO - Architecture complete

Derniere mise a jour : 13 avril 2026

## 10 Domaines

| Domaine | Role | Tech |
|---------|------|------|
| r3sto.ch | Landing page marketing, tarifs, comparatif, legal | HTML statique |
| app.r3sto.ch | Application principale restaurateur | React + Vite + TypeScript |
| demo.r3sto.ch | Meme app, mode demo (donnees fictives, reset a chaque refresh) | Meme codebase, flag `isDemo` |
| admin.r3sto.ch | Panel admin R3STO (ERP, CRM, finance, plateforme) | Meme codebase, flag `isAdmin` |
| api.r3sto.ch | Backend API REST (Node.js + Express + MariaDB) | server.js ~1000 lignes |
| auth.r3sto.ch | Page de login/inscription | HTML statique (toggle login/register) |
| bill.r3sto.ch | Module commandes & KDS (cuisine/bar) | Meme codebase, sous-routes |
| booking.r3sto.ch | Widget de reservation embeddable | HTML/JS widget |
| delivery.r3sto.ch | Module livraison | Meme codebase, sous-routes |
| menu.r3sto.ch | Menu digital QR-code | HTML/JS |

## Stack technique

- Frontend : React 19, TypeScript, Vite, Zustand (state management), react-router-dom
- Backend : Express.js, MariaDB (Infomaniak), JWT auth (30j), bcrypt
- Hebergement : Infomaniak (Geneve, Suisse), FTP pour sites statiques, SSH/Node pour API
- Paiements : Stripe (CHF)
- Sync : Zustand local-first -> debounce 2s -> POST /sync/push vers API

## Architecture de donnees

Toute la config restaurant est dans `restaurants.settings` (colonne JSON) :
tables, combos, services, salles, options, users, fermetures, roomItems, clients, giftCards, reviews, loyaltyConfig, loyaltyCards, sites

Les reservations sont dans la table SQL `reservations` (colonnes individuelles).

## Flux de sync

1. Login -> token JWT stocke dans localStorage
2. GET /sync/state -> pull complet (settings JSON + reservations SQL)
3. Hydratation du store Zustand
4. startAutoSync() : subscribe au store -> debounce 2s -> POST /sync/push
5. Toute modification dans l'app est d'abord locale (instantanee), puis synchro en background

## Plans tarifaires

| Plan | Prix/mois | Sites max | Features |
|------|-----------|-----------|----------|
| Bistro | 39 CHF | 1 | Reservations, plan de salle, CRM, widget |
| Resto | 59 CHF | 3 | + Marketing, fidelite, multi-site |
| Gastro | 79 CHF | 12 | + Tout, API, priority support |
