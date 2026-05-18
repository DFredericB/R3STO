# Audit SEO — r3sto.ch
**Date : 12 avril 2026**

---

## Résumé exécutif

La landing page r3sto.ch a de bonnes fondations SEO : meta tags complets (title, description, OG, Twitter), schema.org JSON-LD, canonical, hreflang, sitemap.xml, robots.txt et Google Search Console connectée. La plus grande force est le contenu riche et ciblé sur des problèmes concrets (no-shows, commissions, digitalisation). Les 3 priorités qui auront le plus d'impact sont : (1) corriger le sitemap pour refléter la date réelle et ajouter les pages légales manquantes, (2) enrichir les sous-pages existantes (/comparatif, /restaurants, /video, /assistant) avec du contenu SEO unique et conséquent, (3) ajouter des pages de contenu ciblées sur les mots-clés longue traîne (guides, FAQ structurée). Évaluation globale : **fondation solide, optimisation à poursuivre**.

---

## 1. Audit on-page

### Homepage (index.html)

| Élément | Status | Détails |
|---------|--------|---------|
| Title tag | ✅ OK | "R3STO — Réservations & gestion pour restaurants suisses" (54 car.) |
| Meta description | ✅ OK | 167 car. — un peu long (idéal 150-160), mais dense en mots-clés |
| H1 unique | ✅ OK | "La plateforme qui gère votre restaurant. Vraiment." |
| H2/H3 hiérarchie | ⚠️ Moyen | Beaucoup de H3 sans H2 parent dans la section "Problèmes". Certaines sections utilisent des divs `.s-title` au lieu de vrais H2 |
| Canonical | ✅ OK | `https://r3sto.ch` |
| OG complet | ✅ OK | title, description, image, locale fr_CH, site_name |
| Twitter Card | ✅ OK | summary card complète |
| Hreflang | ⚠️ Partiel | Seulement `fr` et `x-default` — pas de `de`, `en`, `it` malgré l'i18n 4 langues |
| Schema.org | ✅ OK | SoftwareApplication avec les 3 offres |
| Alt text images | ⚠️ Faible | Seulement 2 images avec alt="R3STO" (logo). Aucun alt sur les SVG inline (normal) mais pas d'autres images avec alt |
| Keyword 1ers 100 mots | ✅ OK | "réservations", "restaurant", "commission", "suisse" dans le hero |
| Internal linking | ⚠️ Moyen | Liens vers /restaurants, /comparatif, mais la section "Discover" a été simplifiée |
| URL structure | ✅ OK | URLs propres : /comparatif/, /restaurants/, /video/, /assistant/ |

### Sous-pages

| Page | Title | Description | Contenu | Verdict |
|------|-------|-------------|---------|---------|
| /comparatif/ | ✅ "R3STO vs TheFork, Zenchef, Aleno" | ✅ 109 car. | 249 lignes — correct | ✅ Bien |
| /restaurants/ | ✅ "Restaurants R3STO — Réservez une table" | ✅ 110 car. | 891 lignes — dynamique | ✅ Bien |
| /video/ | ✅ "R3STO en 3 minutes" | ✅ 123 car. | 112 lignes — **très léger** | ⚠️ Thin content |
| /assistant/ | ✅ "Assistant R3STO — Posez vos questions" | ✅ 115 car. | 130 lignes — **très léger** | ⚠️ Thin content |
| /legal/cgu.html | ✅ | — | 9078 car. | ✅ OK |
| /legal/confidentialite.html | ✅ | — | 8118 car. | ✅ OK |
| /legal/mentions.html | ✅ | — | 3894 car. | ✅ OK |

---

## 2. Technical SEO

| Check | Status | Détails |
|-------|--------|---------|
| HTTPS | ✅ Pass | Infomaniak, SSL OK |
| robots.txt | ✅ Pass | `Allow: /` + Sitemap reference |
| sitemap.xml | ⚠️ Warning | `lastmod` toutes à 2026-04-05 (statique) — devrait être mis à jour à chaque deploy |
| Canonical tags | ✅ Pass | Toutes les pages ont un canonical correct |
| Mobile viewport | ✅ Pass | `width=device-width,initial-scale=1` |
| Google Search Console | ✅ Pass | Tag de vérification présent : `uYVfE2eWgE67ya8-qV7uRIopRU36Rr9bVwbHCq1aenc` |
| Font loading | ⚠️ Warning | `preconnect` pour Google Fonts, mais pas de `font-display: swap` explicite dans le `@font-face` |
| Structured data | ⚠️ Warning | SoftwareApplication OK, mais manque : Organization, FAQ, Breadcrumb |
| JS rendu | ⚠️ Warning | Contenu i18n injecté en JS — Google peut indexer mais le texte traduit n'est visible qu'après exécution JS |
| Inline CSS | ⚠️ Warning | Tout le CSS est inline (bon pour la perf, mais fichier lourd ~240KB) |
| Images | ✅ Pass | Peu d'images raster (logo JPG seulement), SVG inline = léger |
| Lazy loading | N/A | Pas d'images lourdes à lazy-loader |
| Compression | Dépend du serveur | Infomaniak devrait servir gzip/brotli automatiquement |

### Problèmes sitemap.xml

Le sitemap référence 8 URLs. Toutes les pages existent (vérifié). Corrections à apporter :

1. **`lastmod` statique** → doit refléter la vraie date de modification
2. **Pages légales manquantes** → ajouter `/legal/cgu.html`, `/legal/confidentialite.html`, `/legal/mentions.html` (elles sont dans le sitemap mais la priorité est correcte à 0.3)
3. **Booking widget URLs** → quand les restaurants auront des pages publiques type `/restaurants/le-petit-boeuf/`, les ajouter au sitemap dynamiquement

---

## 3. Keyword opportunities

| Mot-clé | Difficulté | Score opportunité | Intent | Format recommandé |
|---------|-----------|-------------------|--------|-------------------|
| logiciel réservation restaurant suisse | Modéré | 🔴 Haut | Commercial | Landing (déjà couvert) |
| réservation restaurant sans commission | Modéré | 🔴 Haut | Commercial | Landing + comparatif |
| no-show restaurant solution | Facile | 🔴 Haut | Commercial | Guide dédié / blog |
| plan de salle restaurant logiciel | Facile | 🔴 Haut | Commercial | Page feature dédiée |
| alternative TheFork suisse | Facile | 🔴 Haut | Commercial | /comparatif (déjà couvert) |
| alternative Zenchef | Modéré | 🟠 Moyen | Commercial | /comparatif (enrichir) |
| gestion restaurant SaaS | Modéré | 🟠 Moyen | Informationnel | Guide |
| widget réservation restaurant | Facile | 🟠 Moyen | Commercial | Page feature dédiée |
| CRM restaurant | Modéré | 🟠 Moyen | Commercial | Page feature dédiée |
| prépaiement restaurant | Facile | 🟠 Moyen | Informationnel | Guide / FAQ |
| fidélisation restaurant | Modéré | 🟠 Moyen | Informationnel | Blog post |
| commande en salle restaurant | Facile | 🟠 Moyen | Commercial | Page feature |
| site web restaurant gratuit | Modéré | 🟠 Moyen | Commercial | Landing section → page dédiée |
| comparatif logiciel restaurant 2026 | Facile | 🟠 Moyen | Commercial | /comparatif (enrichir) |
| digitalisation restaurant suisse | Facile | 🟡 Moyen | Informationnel | Blog / guide |
| réservation en ligne restaurant | Difficile | 🟡 Moyen | Mixte | Landing (couvert) |
| comment réduire no-show restaurant | Facile | 🔴 Haut | Informationnel | Blog / guide dédié |
| logiciel restaurant sans commission | Modéré | 🟠 Moyen | Commercial | Landing (couvert) |
| gestion table restaurant | Facile | 🟡 Moyen | Commercial | Feature page |
| rappel SMS réservation restaurant | Facile | 🟡 Faible | Informationnel | FAQ |
| bon cadeau restaurant en ligne | Facile | 🟡 Faible | Commercial | Feature page |
| caution réservation restaurant | Facile | 🟡 Faible | Informationnel | Blog / FAQ |

---

## 4. Analyse concurrentielle (Suisse)

### Concurrents directs

| Dimension | R3STO | TheFork | aleno | Zenchef | miMesa |
|-----------|-------|---------|-------|---------|--------|
| Marché cible | Suisse romande | Europe (Suisse incl.) | Suisse + DACH | France/Europe | Suisse |
| Commission | 0% | 2-5 CHF/couvert | 0% | 0% | 0% |
| Prix entrée | 39 CHF/mois | 29€/mois | ~29€/mois | Sur devis | Sur devis |
| Hébergement CH | ✅ Infomaniak | ❌ | ✅ | ❌ | ✅ |
| Contenu SEO | Landing + 4 pages | Blog massif + guides | Blog + comparatifs | Blog riche | Minimal |
| Pages indexées (est.) | ~10 | Milliers | ~50-100 | ~200+ | ~10 |
| Schema.org | SoftwareApp | Multiples | FAQ + Organization | Multiples | Minimal |

### Ce que les concurrents font mieux

- **aleno** : Série de comparatifs dédiés ("aleno vs OpenTable", "aleno vs Zenchef") = excellent pour le SEO commercial
- **TheFork** : Blog massif avec du contenu informationnel ("comment réduire les no-shows", "tendances restauration 2026")
- **Zenchef** : Pages features individuelles (une page par fonctionnalité) avec SEO dédié

### Avantage R3STO

- **Positionnement "0% commission + 100% suisse"** = niche peu concurrencée
- **Anti no-show** comme feature phare = angle différenciant fort
- **Prix transparents affichés** = les concurrents cachent souvent leurs tarifs

---

## 5. Content gaps — recommandations

### Pages à enrichir (existent déjà)

| Page | Problème | Action | Priorité | Effort |
|------|----------|--------|----------|--------|
| /video/ | Thin content (112 lignes) | Ajouter transcription texte de la vidéo, description des fonctionnalités, FAQ vidéo | 🔴 Haut | Modéré |
| /assistant/ | Thin content (130 lignes) | Ajouter une vraie FAQ structurée (schema.org FAQ), réponses détaillées | 🔴 Haut | Modéré |
| /comparatif/ | Correct mais enrichissable | Ajouter aleno et miMesa, mettre à jour les prix 2026, ajouter "Mise à jour avril 2026" | 🟠 Moyen | Quick win |

### Nouveau contenu à créer

| Contenu | Mot-clé cible | Format | Priorité | Effort |
|---------|--------------|--------|----------|--------|
| "Comment réduire les no-shows en restaurant" | no-show restaurant solution | Guide long (1500+ mots) sous /blog/ ou /guides/ | 🔴 Haut | Substantiel |
| Pages features individuelles | plan de salle, CRM, widget, prépaiement | 1 page par feature sous /fonctionnalites/plan-de-salle/ etc. | 🔴 Haut | Substantiel |
| "R3STO vs TheFork" | alternative TheFork suisse | Page comparatif 1v1 sous /comparatif/thefork/ | 🟠 Moyen | Modéré |
| "R3STO vs aleno" | alternative aleno | Page comparatif 1v1 sous /comparatif/aleno/ | 🟠 Moyen | Modéré |
| FAQ structurée (schema.org) | questions restaurant logiciel | Section FAQ sur homepage OU page dédiée | 🟠 Moyen | Quick win |
| "Digitaliser son restaurant en 2026" | digitalisation restaurant suisse | Blog post / guide | 🟡 Faible | Modéré |
| "Bons cadeaux restaurant : guide complet" | bon cadeau restaurant en ligne | Guide | 🟡 Faible | Modéré |

---

## 6. Structured Data à ajouter

### Actuellement
- ✅ `SoftwareApplication` avec les 3 offres

### À ajouter

**Organization** (crédibilité + Knowledge Panel) :
```json
{
  "@type": "Organization",
  "name": "R3STO",
  "legalName": "Innoptim SA",
  "url": "https://r3sto.ch",
  "logo": "https://r3sto.ch/logo-r3sto.jpg",
  "foundingDate": "2016",
  "address": {
    "@type": "PostalAddress",
    "addressLocality": "Le Mont-sur-Lausanne",
    "addressCountry": "CH"
  },
  "sameAs": [
    "https://www.linkedin.com/company/r3sto",
    "https://www.instagram.com/r3sto.ch",
    "https://www.facebook.com/r3sto.ch",
    "https://www.youtube.com/@r3sto",
    "https://x.com/r3sto_ch"
  ]
}
```

**FAQPage** (si on ajoute une section FAQ) :
```json
{
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "Combien coûte R3STO ?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "R3STO propose 3 plans : Bistro à 39 CHF/mois, Resto à 59 CHF/mois, et Gastro à 79 CHF/mois. 0% commission."
      }
    }
  ]
}
```

**BreadcrumbList** (pour les sous-pages) :
```json
{
  "@type": "BreadcrumbList",
  "itemListElement": [
    {"@type": "ListItem", "position": 1, "name": "Accueil", "item": "https://r3sto.ch"},
    {"@type": "ListItem", "position": 2, "name": "Comparatif", "item": "https://r3sto.ch/comparatif/"}
  ]
}
```

---

## 7. Plan d'action priorisé

### Quick wins (cette semaine)

| # | Action | Impact | Effort |
|---|--------|--------|--------|
| 1 | **Mettre à jour sitemap.xml** : dates `lastmod` correctes | Moyen | 15 min |
| 2 | **Ajouter schema Organization** dans le `<head>` de la landing | Moyen | 30 min |
| 3 | **Corriger hiérarchie H2/H3** : les `.s-title` doivent être de vrais `<h2>` | Moyen | 1h |
| 4 | **Raccourcir meta description** à 155 car. max | Faible | 10 min |
| 5 | **Ajouter hreflang de/en/it** pour les versions i18n | Moyen | 30 min |
| 6 | **Enrichir /comparatif/** : ajouter aleno, miMesa, prix 2026 | Haut | 2h |
| 7 | **Ajouter FAQ schema.org** sur la landing (5-8 questions fréquentes) | Haut | 1h |

### Investissements stratégiques (ce trimestre)

| # | Action | Impact | Effort | Dépendances |
|---|--------|--------|--------|-------------|
| 8 | **Créer /guides/reduire-no-shows/** — guide 1500+ mots | 🔴 Haut | 1 jour | — |
| 9 | **Pages features individuelles** (plan-de-salle, crm, widget, prepaiement) | 🔴 Haut | 2-3 jours | — |
| 10 | **Enrichir /video/** — transcription, timestamps, FAQ | 🟠 Moyen | 2h | Vidéo YouTube |
| 11 | **Enrichir /assistant/** — vraie FAQ structurée 20+ questions | 🟠 Moyen | 3h | — |
| 12 | **Pages 1v1** : /comparatif/thefork/, /comparatif/aleno/ | 🟠 Moyen | 1 jour | — |
| 13 | **Blog/guides section** avec 2-3 articles par mois | 🔴 Haut | Continu | Stratégie contenu |
| 14 | **Vérifier Search Console** — confirmer propriété, soumettre sitemap | 🔴 Haut | 30 min | Accès Search Console |

---

## 8. Google Search Console — à vérifier

Le tag de vérification est en place (`uYVfE2eWgE67ya8-qV7uRIopRU36Rr9bVwbHCq1aenc`). Ce qu'il faut faire :

1. Aller sur [search.google.com/search-console](https://search.google.com/search-console)
2. Vérifier que la propriété `https://r3sto.ch` est bien validée
3. Soumettre le sitemap : `https://r3sto.ch/sitemap.xml`
4. Vérifier l'onglet "Couverture" pour voir si des pages sont en erreur
5. Demander l'indexation de la page d'accueil si pas encore fait

Si la propriété n'est pas encore validée, la simple présence du meta tag devrait suffire — il faut juste cliquer "Vérifier" dans la console.
