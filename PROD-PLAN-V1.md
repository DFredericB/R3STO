# R3STO — PROD-PLAN-V1

**Date :** 2026-05-15
**Périmètre :** mise en prod J+3 = r3sto.com (B2C) + r3sto.com/pro (B2B) finalisés
**Méthode :** une seule source de vérité, décisions verrouillées, exécution sans retour en arrière.

---

## 1. Identité visuelle — DOUBLE palette

| Site | Palette | Ton |
|---|---|---|
| **r3sto.com** (B2C grand public) | **Crème/beige + cuivre + brun profond** | Guide gourmand, édito, chaleureux |
| **r3sto.com/pro** (B2B restaurateur) | **Dark navy + or chaud `#c89752`** | Plateforme premium, technique |
| **r3sto.ch** (legacy) | 301 → r3sto.com (post-migration) | — |

**Action :** migrer le design beige/cuivre de r3sto.ch sur r3sto.com (déjà conçu, fonctionne, beau). /pro reste tel quel.

### Couleurs r3sto.com (B2C) — extraites du live r3sto.ch (15/05/2026)

**Crème / Papier (fonds)**
- `--pap : #fdf6ec` (crème principale)
- `--pap2 : #f4e6cf` (crème teintée)
- `--pap3 : #e8d2a8` (crème plus sombre)
- `--line : #e8d4b8` (séparateur clair)
- `--line2 : #d4b890` (séparateur foncé)

**Cuivre / Or (accents — signature B2C)**
- `--or : #b8632b` ★ **cuivre principal**
- `--or2 : #d97548` (cuivre clair)
- `--or3 : #e8a070` (cuivre pastel)
- `--or-soft : #f5e0c8` (cuivre très clair, surfaces)

**Encre / Brun (textes)**
- `--ink : #2a1a0d` (texte primaire, brun très foncé)
- `--ink2 : #4a3422` (texte secondaire)
- `--t2 : #7a5a3e` · `--t3 : #a08560` (muted)

**Couleurs sémantiques**
- `--rd : #a8362e` (rouge brique, erreur)
- `--gn : #5a8c50` (vert sauge, succès)
- `--pass : #1B5E42` (vert PASS foncé) · `--pass2 : #2c7a5b` (vert PASS clair)

### Couleurs r3sto.com/pro (B2B, déjà live)
- Fond : `#0f1620` (dark navy)
- Surfaces : `#141d2c` / `#1a2435` / `#25304a`
- Texte : `#e8eef5`
- Accent or : `#c89752`
- Module colors : Résa `#3b82f6` · Order `#f97316` · Delivery `#10b981` · etc. (cf. Strategie-Modules)

---

## 2. Tarification — VERROUILLÉE

**Source faisant foi :** `REMARQUES-EN-COURS.md` du 14 avril 2026, matrice validée par Didier.

### Plans (R3STO Résa inclus)

| | **Bistro** | **Resto** | **Gastro** |
|---|:-:|:-:|:-:|
| **Prix** | **39 CHF/mois** | **59 CHF/mois** | **79 CHF/mois** |
| Grille / Agenda / Journal | ✅ | ✅ | ✅ |
| Widget réservation | ✅ | ✅ | ✅ |
| Tables & Combos | ✅ | ✅ | ✅ |
| Plan 2D (éditeur) | ❌ | ✅ | ✅ |
| CRM clients | ❌ | ✅ | ✅ |
| Menu QR | ❌ | ✅ | ✅ |
| Waitlist | ❌ | ✅ | ✅ |
| Groupes / Blacklist | ❌ | ✅ | ✅ |
| Prépaiement Stripe | ❌ | ❌ | ✅ |
| Multi-sites | ❌ | ❌ | ✅ |
| IA prédictions | ❌ | ❌ | ✅ |

**SMS retiré partout. API REST retirée tant qu'aucune demande concrète.**

### Add-ons modulaires

| Module | Prix/mois |
|---|---|
| R3STO Order | +29 CHF |
| R3STO Delivery | +29 CHF |
| R3STO Cash | +39 CHF |
| R3STO Stock | +19 CHF |
| R3STO Team | +29 CHF |
| R3STO Finance | +19 CHF |
| R3STO Engage | +19 CHF |
| R3STO Menu | +9 CHF |
| R3STO Insights | +19 CHF |

### Pack R3STO Total

**199 CHF/mois** — tous modules inclus (équivalent ~280 CHF à la carte).

### Essai gratuit

**14 jours**, sans carte bancaire requise. C'est l'expérience "R3STO Light" (rebranding du produit Light en mode trial). **Aucun palier gratuit permanent.**

---

## 3. Positionnement vs Piktable.ch

**Ce que Piktable joue (15/05/2026) :**
- 49 CHF/mois standard (essai 30j)
- 29 CHF/mois "lifetime" Spring 2026, essai 60j, 50 premiers restos avant 30/09/2026
- 0% commission à vie
- Tagline : *« L'outil de réservation conçu à Lausanne »*
- **1 seul produit** : juste la réservation

**Leur faille :** ils n'ont qu'un produit. R3STO a 10 modules.

**Trois angles de contre-positionnement :**

1. **Plateforme complète** vs outil unique.
   Headline /pro : *« Votre restaurant. En entier. En digital. En Suisse. »*

2. **Premium gastronomique** vs friendly low-end.
   Dark+or sur /pro. Crème+cuivre sur B2C édito. Cible : restos qui visent du chiffre, pas du low-cost.

3. **0% commission affichée fort sur les deux sites.**
   Piktable utilise ça comme arme principale. Ne pas leur laisser le monopole de la promesse.

**Offre de lancement (à confirmer Didier) :**
*« 50 premiers restos : 30 jours d'essai (au lieu de 14) + audit gratuit de leur exploitation digitale »*. On garde la marge prix, on offre du service. Piktable casse son prix, R3STO offre de la valeur.

---

## 4. Périmètre prod J+3 — gel des extras

**INCLUS dans la prod J+3 :**
- r3sto.com (refonte palette + contenu B2C aligné)
- r3sto.com/pro (déjà live, ajustements contenu/tarifs)
- Réservation Chez Bunny's bout en bout (test E2E avec email)
- Redirection r3sto.ch → r3sto.com (post-déploiement)

**HORS périmètre J+3 (à traiter ensuite) :**
- app.r3sto.ch (intégration Light) → S+1
- admin.r3sto.ch (refonte spec P0)
- demo.r3sto.ch (génération données cohérentes)
- Modules en bêta (Order, Delivery)
- carat.r3sto.ch, pass.r3sto.ch (projets parallèles)

---

## 5. Tagline officielle r3sto.com/pro

> **« Gérer. Remplir. Fidéliser. »** *(déjà sur le live)*
>
> Sous-titre : *« 0% commission, hébergement inclus, fait en Suisse. À partir de 39 CHF/mois. »*

## 6. Tagline officielle r3sto.com (B2C)

> **« Trouvez votre table. Sans intermédiaire. »** *(déjà sur le live)*
>
> Sous-titre : *« L'annuaire des restaurateurs indépendants suisses. 0% de commission. Réservation directe. »*

---

## 7. Décisions ouvertes restantes (≤ 3, à trancher en 5 min)

1. **Hex exacts du cuivre/crème r3sto.com** — j'extraie les hex actuels de r3sto.ch et propose 3 variations (1 dominante). Validation visuelle.
2. **Offre lancement 50 premiers restos** — go ou pas ? Variante : 30j d'essai + audit gratuit, OU autre.
3. **CARAT et PASS sur r3sto.com** — visibles dès J+3 (sections sur la home) ou cachés (pas prêts) ?

---

## 8. Tâches J+1 à J+3

### J+1 — Refonte r3sto.com (palette B2C)
- [ ] Extraire les hex exacts du r3sto.ch live (crème, cuivre, brun)
- [ ] Migrer le HTML/CSS de r3sto.ch vers le dossier deploy de r3sto.com
- [ ] Adapter le contenu (search Suisse, filtres CARAT, cards Chez Bunny's)
- [ ] Tester E2E : home → fiche → réservation → email reçu

### J+2 — Ajustements /pro + intégration assets
- [ ] Reprendre /pro pour cohérence textuelle (tarifs Bistro/Resto/Gastro/Total)
- [ ] Intégrer le branding/ folder dans le repo (favicons, logos)
- [ ] Lire `veille-marche-2026-05-04.md` une dernière fois pour ne rien rater
- [ ] Préparer redirections 301 r3sto.ch → r3sto.com

### J+3 — Déploiement
- [ ] Smoke tests live
- [ ] Déploiement r3sto.com + /pro
- [ ] Activation redirections r3sto.ch
- [ ] Monitoring 24h post-deploy

---

## 9. Décisions explicitement enterrées (à ne plus rediscuter)

- ❌ Module gratuit permanent (Lite/Starter)
- ❌ Palette unique pour B2C et B2B
- ❌ Plan de salle 2D en v1 (déjà dans Resto/Gastro, pas un sujet bloquant)
- ❌ Migration totale .ch → .com en J+3 (trop risqué, reporté post-lancement)
- ❌ Suppression de r3sto.ch (gardé en 301)

---

*Document de référence — toute décision contradictoire ultérieure doit explicitement référencer et mettre à jour ce fichier, pas le contourner.*
