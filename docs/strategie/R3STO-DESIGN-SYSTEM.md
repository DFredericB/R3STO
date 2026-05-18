# R3STO — Design System

**Version :** 1.0 · **Verrouillé le :** 15 mai 2026
**Statut :** Source unique de vérité. Toute modification doit explicitement référencer et mettre à jour ce document.

---

## 0. Philosophie

> **Une marque mère R3STO + des expressions par contexte.**
> Le logo, la police et le bleu officiel sont **immuables** dans toute l'écosystème.
> La palette d'accompagnement et l'ambiance (clair/foncé) varient selon l'audience (B2C vs B2B vs sous-marques).
> Pas de surprise. Pas de débat. Le système est fixe.

---

## 1. Identité visuelle

### 1.1 Logo officiel R3STO

- **Forme** : carré 1:1 (jamais déformé)
- **Couleur officielle** : `#1d4f91` (bleu nuit) — **NE CHANGE PAS**
- **Texte intérieur** : « R3STO » en blanc `#ffffff`, police **Alethia Next Regular**
- **Position du texte** : préservée à l'identique des fichiers SVG officiels (positionné dans le tiers inférieur du carré, légèrement à gauche)
- **Sources officielles** :
  - `Sociétés/R3STO/Marketing/Logo R3STO/Official logos R3STO 6_2_2024/Blue/SVG/` (21 variantes : .svg, .png, .jpg, .pdf, .ai, .eps)
  - SVG de référence pour le web : `docs/strategie/logo-r3sto-blue.svg`

### 1.2 Lockup sous-marques

Le mark R3STO + un wordmark à droite en police Alethia, dans la couleur d'accent de la sous-marque :

| Lockup | Carré | Wordmark à droite |
|---|---|---|
| **R3STO** seul | bleu `#1d4f91` | — |
| **R3STO Pro** | bleu `#1d4f91` | « Pro » en Alethia, `#1d4f91` ou `#c89752` |
| **R3STO Pass** | bleu `#1d4f91` | « Pass » en Alethia, vert forêt `#1B5E42` |
| **R3STO Carat** | noir `#0a0a0a` + bordure or | « Carat » en Alethia, or `#d4af37` |

### 1.3 Règles strictes (NE JAMAIS DÉROGER)

- ❌ **NE PAS** modifier la position du texte « R3STO » dans le carré
- ❌ **NE PAS** changer la police (Alethia Next Regular obligatoire)
- ❌ **NE PAS** déformer le carré (1:1 strict)
- ❌ **NE PAS** ajouter d'effets (ombres, dégradés, glow) sur le mark
- ✅ **Couleur du carré peut varier** selon contexte (cf. application map ci-dessous)
- ✅ **Variantes officielles** disponibles (fond blanc, transparent, blanc inversé) — utiliser celles fournies, ne pas créer de nouvelles

---

## 2. Système typographique

| Police | Rôle | Usage |
|---|---|---|
| **Alethia Next Regular** | Brand · Logo · Wordmark sous-marque | Logo (texte R3STO), wordmark sous-marques (Pro/Pass/Carat), hero brand moments |
| **Playfair Display** (serif) | Édito · Gourmand | Titres B2C (annuaire, restos), noms de restaurants, KPI numériques |
| **Inter** (sans-serif) | UI · Corps de texte | Tout le reste : navigation, formulaires, dashboards, paragraphes, boutons |

**Fichier Alethia** : `Sociétés/R3STO/Marketing/Logo R3STO/MyFont Alethia Next Regular/myfonts_order_5739061641386.zip`
**Pour usage web** : `docs/strategie/fonts/AlethiaNext-Regular.otf` (chargée via `@font-face`)

**Échelle typographique de base** (à ajuster par contexte) :
- H1 hero brand : 48-64px Alethia OU Playfair selon contexte
- H2 / sections : 28-36px Playfair
- H3 / cards : 18-22px Playfair ou Inter Bold
- Body : 14-16px Inter
- UI labels : 11-12px Inter Bold uppercase letter-spacing
- Mono / data : SF Mono, monospace

---

## 3. Palette — Design tokens

### 3.1 Primary (R3STO Brand)

| Token | Hex | Usage |
|---|---|---|
| `bleu-officiel` | `#1d4f91` | Logo carré, CTA primaire, titres clés |
| `bleu-clair` | `#3b82f6` | Accent vif, liens hover, badges info, mots italiques h2 |
| `bleu-surface` | `#eff6ff` | Background pâle pour zones info (light mode) |

### 3.2 Accent — Cuivre / Or

| Token | Hex | Usage |
|---|---|---|
| `cuivre` | `#b8632b` | Accent gourmand chaud, CTA secondaire, pills, hover liens (theme dark) |
| `or-chaud` | `#c89752` | Accent luxe, étoiles CARAT mention, distinctions |
| `cuivre-surface` | `#fdf4ec` | Background pâle pour zones gourmand (light mode) |

### 3.3 Sémantique (constante light + dark)

| Token | Hex | Usage |
|---|---|---|
| `success` | `#10b981` | États OK, validation, taux excellent |
| `warning` | `#f59e0b` | Alertes douces, états en attente |
| `error` | `#ef4444` | Erreurs, suppression, états critiques |
| `info` | `#3b82f6` | Notes, conseils, surlignement informatif |

### 3.4 Neutrals — LIGHT theme

| Token | Hex | Usage |
|---|---|---|
| `surface` | `#ffffff` | Fond principal |
| `surface-2` | `#f6f6f8` | Cards, sidebar, zones secondaires |
| `surface-3` | `#fafafc` | Input backgrounds, hover states |
| `border` | `#e5e7eb` | Bordures discrètes, séparateurs |
| `text` | `#0f1620` | Texte principal (presque noir) |
| `text-muted` | `#6b7280` | Texte secondaire, labels |
| `text-disabled` | `#9ca3af` | Texte désactivé, placeholders |

### 3.5 Neutrals — DARK theme

| Token | Hex | Usage |
|---|---|---|
| `surface` | `#0f1620` | Fond principal (navy presque noir) |
| `surface-2` | `#141d2c` | Cards, sidebar |
| `surface-3` | `#1a2435` | Zones élevées, modal |
| `surface-4` | `#25304a` | Input backgrounds, hover |
| `border` | `#25304a` | Bordures, séparateurs |
| `text` | `#e8eef5` | Texte principal (off-white) |
| `text-muted` | `#aab5cc` | Texte secondaire |
| `text-disabled` | `#6b7280` | Texte désactivé |

### 3.6 Palette spécifique r3sto.com (B2C annuaire — CLAIR crème/cuivre)

Variables CSS extraites du live `r3sto.ch` (à migrer vers `r3sto.com`) :

| Token | Hex | Usage |
|---|---|---|
| `--pap` | `#fdf6ec` | Crème principale (fond) |
| `--pap2` | `#f4e6cf` | Crème teintée |
| `--or` | `#b8632b` | Cuivre signature B2C |
| `--or2` | `#d97548` | Cuivre clair |
| `--ink` | `#2a1a0d` | Brun très foncé (texte) |
| `--ink2` | `#4a3422` | Brun secondaire |

### 3.7 Sous-marques

**PASS** (`pass.r3sto.ch`) :
- `vert-foret` `#1B5E42` (primaire)
- `vert-foret-2` `#2c7a5b` (clair)
- `sauge` `#5a8c50` (accent doux)
- `or-pass` `#c89752`

**CARAT** (`carat.r3sto.ch`) :
- `noir` `#0a0a0a` (fond)
- `or` `#d4af37` (Gold niveau)
- `argent` `#c0c0c0` (Silver niveau)
- `bronze` `#cd7f32` (Bronze niveau)

---

## 4. Application par site

| Site | Audience | Thème | Notes |
|---|---|---|---|
| **r3sto.com** | 🧑 B2C grand public | CLAIR crème/cuivre | Annuaire gourmand, ton édito Playfair |
| **r3sto.com/pro** | 🏢 B2B prospect restaurateur | FONCÉ navy/cuivre | Sales page tarifs |
| **auth.r3sto.ch** | Mixte (login) | FONCÉ navy/cuivre | ✓ déjà en prod, référence visuelle |
| **app.r3sto.ch** | 🏢 Restaurateur connecté | FONCÉ navy/cuivre + toggle ☀/🌙 | App quotidienne, dark mode pour service soir |
| **admin.r3sto.ch** | 🏢 Vous (superadmin) | FONCÉ navy/cuivre | Back-office |
| **bill.r3sto.ch** | 🏢 Restaurateur (factures) | FONCÉ navy/cuivre | Facturation R3STO |
| **demo.r3sto.ch** | 🏢 Prospect démo | FONCÉ navy/cuivre | Miroir de l'app |
| **booking.r3sto.ch** | 🧑 Consommateur (résa widget) | FONCÉ navy/cuivre | Widget intégré chez restos partenaires |
| **menu.r3sto.ch** | 🧑 Consommateur (QR menu) | FONCÉ navy/cuivre | Affiché au resto, écrans sombres OK |
| **delivery.r3sto.ch** | 🧑 Consommateur (commande) | FONCÉ navy/cuivre | Take-away / livraison |
| **pass.r3sto.ch** | 🧑 Consommateur (fidélité) | Sous-marque vert + or | Programme R3STO Pass |
| **carat.r3sto.ch** | 🧑/🏢 (label gastronomique) | Sous-marque noir + métaux | Label gastronomie indépendant |

### 4.1 Mode clair/sombre dans l'app

`app.r3sto.ch` propose un **toggle clair / sombre** dans les réglages utilisateur :
- **Mode clair (par défaut)** : service journée, comptoir éclairé, vue rapide
- **Mode sombre** : service soir, restaurants tamisés, longues sessions tablette
- **Auto-switch optionnel** : par horaire (sombre après 18h) ou luminosité ambiante (capteur)

Les couleurs sémantiques (success/warning/error/info) restent constantes dans les deux modes pour la cohérence des alertes.

---

## 5. Logo system : règle de différenciation B2C / B2B / sous-marques

**Le mark R3STO reste identique partout.** La différenciation se fait par :

1. **Ajout d'un wordmark Alethia à droite** quand on est dans un contexte spécialisé
2. **Palette de la sous-marque** sur les pages de cette sous-marque (PASS = vert, CARAT = noir/or)
3. **Pas de variation du mark lui-même** (sauf exception CARAT noir+or, assumée)

Exemples :
- `r3sto.com` : `[mark R3STO bleu]` seul
- `r3sto.com/pro` : `[mark R3STO bleu] Pro` (Pro en Alethia bleu ou cuivre)
- `pass.r3sto.ch` : `[mark R3STO bleu] Pass` (Pass en Alethia vert forêt)
- `carat.r3sto.ch` : `[mark R3STO noir+or bord] Carat` (Carat en Alethia or)

---

## 6. Tarification — verrouillée

### 6.1 Plans (R3STO Résa inclus, essai gratuit 14 jours)

| | Essentiel | Premium | Signature | Pack Total |
|---|:-:|:-:|:-:|:-:|
| **Mensuel** | **39 CHF/mois** | 59 CHF/mois | 79 CHF/mois | 199 CHF/mois |
| **Annuel (-10%)** | 35 CHF/mois | 53 CHF/mois | 71 CHF/mois | 179 CHF/mois |
| **3 ans (-25%)** ⭐ | **29 CHF/mois** | 45 CHF/mois | 59 CHF/mois | 149 CHF/mois |

**Headline marketing /pro** : « Dès 29 CHF/mois » (Essentiel 3 ans).

### 6.2 Features par tier

| Feature | Essentiel | Premium | Signature |
|---|:-:|:-:|:-:|
| Grille / Agenda / Journal | ✅ | ✅ | ✅ |
| Widget réservation | ✅ | ✅ | ✅ |
| Tables & Combos | ✅ | ✅ | ✅ |
| Plan 2D éditeur | ❌ | ✅ | ✅ |
| CRM clients | ❌ | ✅ | ✅ |
| Menu QR | ❌ | ✅ | ✅ |
| Waitlist | ❌ | ✅ | ✅ |
| Groupes / Blacklist | ❌ | ✅ | ✅ |
| Prépaiement Stripe | ❌ | ❌ | ✅ |
| Multi-sites | ❌ | ❌ | ✅ |
| IA prédictions | ❌ | ❌ | ✅ |
| SMS | ❌ | ❌ | ❌ (retiré partout) |
| API REST | ❌ | ❌ | ❌ (retiré tant qu'aucune demande) |

### 6.3 Add-ons (à activer à la carte)

| Module | +CHF/mois |
|---|---|
| R3STO Order | +29 |
| R3STO Delivery | +29 |
| R3STO Cash | +39 |
| R3STO Stock | +19 |
| R3STO Team | +29 |
| R3STO Finance | +19 |
| R3STO Engage | +19 |
| R3STO Menu | +9 |
| R3STO Insights | +19 |

### 6.4 Essai gratuit

**14 jours, accès complet Signature**, sans carte bancaire.
**Ne JAMAIS appeler « R3STO Light » en communication client** (Light = nom technique interne uniquement).

---

## 7. Tagline officielle

- **r3sto.com (B2C)** : *« Trouvez votre table. Sans intermédiaire. »*
  Sous-titre : *« L'annuaire des restaurateurs indépendants suisses. 0% de commission. Réservation directe. »*

- **r3sto.com/pro (B2B)** : *« Gérer. Remplir. Fidéliser. »*
  Sous-titre : *« 10 modules, 0% commission, hébergement inclus. Dès 29 CHF/mois (engagement 3 ans). Essai gratuit 14 jours. »*

- **Voix de marque** : claire, suisse, sans jargon, professionnelle mais accessible. Tutoiement sur sites consommateurs, vouvoiement sur sites B2B.

---

## 8. Positionnement vs concurrent (Piktable.ch)

**Piktable** joue : prix unique 49 CHF, offre lifetime 29 CHF Spring 2026 (50 premiers restos), 0% commission, un seul produit (résa).

**R3STO contre-positionnement** :
1. **Plateforme tout-en-un, pas juste résa** — 10 modules connectés vs 1
2. **Premium gastronomique** (palette navy/cuivre + serif Playfair) vs friendly low-end
3. **0% commission affichée aussi fort** que Piktable, qu'ils n'aient pas le monopole

**Offre de lancement R3STO** (à confirmer) :
*« 50 premiers restos : 30 jours d'essai (au lieu de 14) + audit gratuit de votre exploitation digitale. »*
→ on garde la marge, on offre du service.

---

## 9. Implémentation technique

### 9.1 Structure CSS (par site)

```css
:root {
  /* Primary */
  --r3sto-bleu: #1d4f91;
  --r3sto-bleu-clair: #3b82f6;
  --r3sto-bleu-surface: #eff6ff;

  /* Accent */
  --r3sto-cuivre: #b8632b;
  --r3sto-or: #c89752;

  /* Semantic */
  --r3sto-success: #10b981;
  --r3sto-warning: #f59e0b;
  --r3sto-error: #ef4444;
  --r3sto-info: #3b82f6;

  /* Neutrals — LIGHT */
  --surface: #ffffff;
  --surface-2: #f6f6f8;
  --border: #e5e7eb;
  --text: #0f1620;
  --text-muted: #6b7280;
}

[data-theme="dark"] {
  --surface: #0f1620;
  --surface-2: #141d2c;
  --surface-3: #1a2435;
  --border: #25304a;
  --text: #e8eef5;
  --text-muted: #aab5cc;
}
```

### 9.2 Fonts

```css
@font-face {
  font-family: 'Alethia Next';
  src: url('/fonts/AlethiaNext-Regular.otf') format('opentype');
  font-weight: 400;
  font-display: swap;
}

/* Importer Inter + Playfair via Google Fonts */
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,700;1,400&family=Inter:wght@300;400;500;600;700&display=swap');
```

### 9.3 Toggle theme (app uniquement)

```js
// Toggle entre clair et sombre
document.documentElement.setAttribute('data-theme', 'dark' | 'light');
localStorage.setItem('r3sto-theme', theme);
```

---

## 10. Références visuelles

- **Mockup palettes** : `docs/strategie/PALETTE-MOCKUP-ALT.html` (5 versions colorées)
- **App design system** : `docs/strategie/APP-DESIGN-SYSTEM.html` (light + dark côte à côte)
- **Typographie** : `docs/strategie/TYPOGRAPHIE-MOCKUP.html` (échelle + usages)
- **Logo SVG web** : `docs/strategie/logo-r3sto-blue.svg`
- **Logo officiel complet** : `kDrive/Sociétés/R3STO/Marketing/Logo R3STO/Official logos R3STO 6_2_2024/Blue/`
- **Police officielle** : `kDrive/Sociétés/R3STO/Marketing/Logo R3STO/MyFont Alethia Next Regular/`

---

## 11. Décisions enterrées — ne plus discuter

- ❌ Module gratuit permanent (pas de plan gratuit, juste essai 14j)
- ❌ Palette unique pour B2C et B2B (on a 2 : claire annuaire + foncée tout le reste)
- ❌ « R3STO Light » comme nom commercial (interne tech uniquement)
- ❌ « Lite » ou « Starter » comme tier (les tiers sont Essentiel / Premium / Signature)
- ❌ Changer la couleur du carré logo selon B2C/B2B (seul le wordmark sous-marque varie)
- ❌ Plan 2D en MVP (inclus dans Premium/Signature mais pas critique pour la prod J+3)
- ❌ Migration totale .ch → .com en J+3 (reportée post-lancement)
- ❌ Suppression de r3sto.ch (gardé en 301 vers r3sto.com)

---

*Document de référence — toute décision contradictoire ultérieure doit explicitement référencer et mettre à jour ce fichier, pas le contourner.*
