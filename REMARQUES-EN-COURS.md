# REMARQUES EN COURS — R3STO
**Date:** 2026-04-14  
**Dernier update:** Session "Test and demo r3sto.ch production" (13-14 avril)  
**Statut:** 7 remarques ouvertes, 2 bloquées (frais de token), 3 P0 identifiées

---

## ADMIN PANEL

### Design & Navigation
| Remarque | Contexte | Statut | Priorité |
|----------|----------|--------|----------|
| "Redondances! A corriger" | Détecter et corriger les redondances dans la partie site web de la landing | À faire | P0 |
| "Admin et auth connexion sont exactement les memes, style, taille position, pas demo, legeres differences, a corriger" | Login admin avait couleur #5b9cf6, auth #4480d8, spacings différents | Traité (UI alignée) | P1 |
| "URLs admin panel ne changent pas selon le menu" | Sidebar click ne naviguait pas (pas de history.pushState) | Traité (hash routes implémentées) | P1 |
| "Client dbo@futuraurant.com pas visible dans Admin → Clients" | Filtre requête trop strict (role IN 'owner','manager' — account créé avec role 'user') | Traité (filtre élargi) | P1 |

### Backend & Routes
| Remarque | Contexte | Statut | Priorité |
|----------|----------|--------|----------|
| "Route /admin/migrations retourne 'Route inconnue'" | Route n'existe pas ou version Node.js ancienne sur serveur (route.js tronqué avant) | À clarifier | P0 |
| Node.js crash après redémarrage Infomaniak | Après DEPLOY-BACKEND-PSCP.bat, migrations route 404 — node.js version côté serveur pas à jour | À confirmer | P0 |

### Frontend
| Remarque | Contexte | Statut | Priorité |
|----------|----------|--------|----------|
| "Mon restaurant" vs "Admin Console" labeling | Sidebar affichait "Propriétaire" au lieu de "Admin Console" | Partiellement traité (CSS OK, localStorage ghost possible) | P1 |

---

## DEPLOY & INFRASTRUCTURE

| Remarque | Contexte | Statut | Priorité |
|----------|----------|--------|----------|
| "Je ne veux pas des commandes putty, on a vu dans d'autres chats que cela ne fonctionnait PAS!" | Refus catégorique des commandes SSH/PuTTY — utiliser DEPLOY.bat seulement | À respecter | P0 |
| "page blanche" sur app.r3sto.ch après Web FTP upload | Assets uploadés via Web FTP, mais .htaccess peut bloquer ou dossier assets/ mal structuré | Partiellement résolu (réseau revenu, vérif DNS manquée) | P1 |
| "ERR_CONNECTION_TIMED_OUT" on app.r3sto.ch | Problème réseau hotspot vs WiFi, pas déploiement. Didier est revenu sur WiFi et voit sites maintenant | Résolu par changement réseau | P2 |

---

## LANDING PAGE & WEB

| Remarque | Contexte | Statut | Priorité |
|----------|----------|--------|----------|
| Landing page redondances | "merci de regler les redondances de la partie site web de la landing" — sections qui se répètent ou contenus dupliqués | À faire | P0 |

---

## ANNUAIRE / PASS / PRO / CARAT

**Statut global:** Déployés 14 avril 2026. Aucune remarque bug majeur détectée dans les transcripts récents.

| Remarque | Contexte | Statut | Priorité |
|----------|----------|--------|----------|
| Annuaire r3sto.ch 23624 restos OSM | Live 14 avril, 4 endpoints /public/directory, Haversine geoloc | Déjà fait | — |
| pass.r3sto.ch vert forêt + or | Branding OK, ex-"Passeport Gourmand" renommé (conflit marque) | Déjà fait | — |
| pro.r3sto.ch logo bleu officiel | NE JAMAIS modifier le logo | Règle appliquée | — |
| CARAT label 4 piliers × 3 niveaux | Bronze/Silver/Gold, anti-fraude, intégré annuaire | Déjà fait | — |

---

## QUESTIONS OUVERTES (Attente Didier)

1. **Route /admin/migrations** — Faut-il redéployer backend + restart Node une 2e fois?
2. **Landing page redondances** — Quelles sections/contenus en double exactement?
3. **app.r3sto.ch page blanche** — Est-ce qu'il faut vérifier les DNS ou re-uploader assets via Web FTP?
4. **Frais de token** — Didier a dit "je suis en forfait max, merci de continuer a bosser!" → sessionsbloquées à 5pm (Europe/Zurich)

---

## SESSIONS FOUILLÉES

- **local_215459ea-7403-4e9e-b97c-2f2bed583150** "Refonte Admin Panel" (5 erreurs TS corrigées)
- **local_df30a2b4-5b01-4074-a8c4-f7e474a6ccf2** "Finalisation App & Demo" (Web FTP deploy app.r3sto.ch)
- **local_b9fd1485-1d43-46f7-ac72-a90795d32654** "Veille marche romandie" (scheduled task, hors scope)
- **local_f448417c-cfa9-4a25-8c19-c17aaa2fa3c9** "Test and demo r3sto.ch production" (design login, navigation, migrations route)

**Total: 4 sessions analysées, 7 remarques uniques identifiées**

---

## TOP 3 PRIORITÉS P0 À TRAITER

1. **Route /admin/migrations injoignable** — /admin/migrations retourne 404, version Node.js obsolète. Redéployer + restart.
2. **Landing page redondances** — Sections dupliquées à corriger immédiatement (demande explicite).
3. **Refus PuTTY SSH** — Didier refuse catégorique les commandes SSH — utiliser DEPLOY.bat/DEPLOY-PSCP.bat seulement.

---

## NOTES POUR SESSIONS FUTURES

- **Ne JAMAIS proposer de commandes SSH ou PuTTY** — Didier a rejeté explicitement
- **Logo R3STO pro.r3sto.ch** — jamais de modifications, jamais de CSS effects
- **Landing design** — sections variées, pas de "Demander une démo"
- **Deploy method** — DEPLOY.bat uniquement, pas de .ps1 manuel via Cowork
- **Token budget** — Didier a limites de forfait (reset 5pm Zurich)

