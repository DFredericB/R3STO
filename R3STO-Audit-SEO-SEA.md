# Audit SEO & SEA — R3STO

**Date** : 5 avril 2026
**Domaine** : r3sto.ch (+ 9 sous-domaines)
**Préparé pour** : Didier Bonny, Innoptim Group Sàrl

---

## Résumé exécutif

R3STO possède de bons fondamentaux SEO on-page (title, meta description, Open Graph, canonical, structured data JSON-LD). Cependant, **le site n'est pas encore indexé par Google** (`site:r3sto.ch` = 0 résultats), ce qui signifie que tout le travail SEO reste à activer. Les trois priorités immédiates sont : (1) créer `robots.txt` et `sitemap.xml` pour permettre le crawl, (2) soumettre le site à Google Search Console, et (3) lancer des campagnes Google Ads ciblées sur les mots-clés à forte intention pour générer du trafic pendant que le SEO organique monte en puissance.

Le marché suisse de la réservation restaurant est **concurrentiel mais fragmenté** : TheFork domine en volume mais avec un modèle contesté (commissions), Zenchef et Aleno sont bien positionnés en SEO, et un nouveau concurrent direct — **miMesa** — propose un positionnement quasi identique à R3STO (sans commission, hébergé en Suisse). La différenciation devra passer par le contenu, la spécificité suisse (LPD, 4 langues), et l'agressivité SEA.

---

## 1. Audit technique SEO

### 1.1. Ce qui est bien fait

| Élément | Statut | Détail |
|---------|--------|--------|
| Title tag | OK | 72 caractères, inclut mots-clés principaux |
| Meta description | OK | 195 caractères (un peu long, idéal < 160) |
| Open Graph | OK | og:title, og:description, og:image, og:url |
| Canonical | OK | `<link rel="canonical" href="https://r3sto.ch">` |
| Schema.org JSON-LD | OK | SoftwareApplication avec les 3 offres (Bistro/Resto/Gastro) |
| H1 unique | OK | Un seul H1 par page |
| HTTPS | OK | Certificat SSL valide |
| Responsive | OK | Viewport meta tag + media queries |
| Langue | OK | `<html lang="fr">` |

### 1.2. Problèmes critiques

| Problème | Sévérité | Impact |
|----------|----------|--------|
| **Pas de `robots.txt`** | CRITIQUE | Google ne sait pas quoi crawler |
| **Pas de `sitemap.xml`** | CRITIQUE | Google ne découvre pas les pages |
| **Site non indexé** | CRITIQUE | 0 résultat sur `site:r3sto.ch` |
| **Pas de Google Search Console** | CRITIQUE | Aucune visibilité sur l'indexation |
| **Pas de Google Business Profile** | ÉLEVÉ | Pas de présence locale sur Google Maps |

### 1.3. Problèmes importants

| Problème | Sévérité | Recommandation |
|----------|----------|----------------|
| Meta description trop longue (195 car.) | MOYEN | Réduire à 155 caractères max |
| Sous-pages sans Open Graph | MOYEN | Ajouter og:title, og:description, og:image sur /comparatif, /assistant, /video |
| Sous-pages sans canonical | MOYEN | Ajouter `<link rel="canonical">` sur chaque page |
| Sous-pages sans JSON-LD | MOYEN | Ajouter schema FAQPage, Article, etc. |
| Pages légales sans meta description | BAS | Ajouter meta description aux 3 pages légales |
| Pas de favicon .ico | BAS | Ajouter un favicon.ico en plus du JPEG |
| Pas de `hreflang` | ÉLEVÉ | Le site est multilingue (FR/EN/DE/IT) mais sans balises hreflang |
| Images en base64 | MOYEN | Ralentit le chargement initial, préférer des fichiers séparés |
| Pas de `<meta name="robots">` | BAS | Ajouter `index, follow` explicitement |

### 1.4. Actions immédiates — Fichiers à créer

**robots.txt** (à placer à la racine de r3sto.ch) :

```
User-agent: *
Allow: /

Sitemap: https://r3sto.ch/sitemap.xml
```

**sitemap.xml** (à placer à la racine) :

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://r3sto.ch/</loc>
    <lastmod>2026-04-05</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://r3sto.ch/comparatif/</loc>
    <lastmod>2026-04-05</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://r3sto.ch/video/</loc>
    <lastmod>2026-04-05</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://r3sto.ch/assistant/</loc>
    <lastmod>2026-04-05</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://r3sto.ch/legal/cgu.html</loc>
    <lastmod>2026-04-05</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.3</priority>
  </url>
  <url>
    <loc>https://r3sto.ch/legal/confidentialite.html</loc>
    <lastmod>2026-04-05</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.3</priority>
  </url>
  <url>
    <loc>https://r3sto.ch/legal/mentions.html</loc>
    <lastmod>2026-04-05</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.3</priority>
  </url>
</urlset>
```

---

## 2. Recherche de mots-clés

### 2.1. Mots-clés principaux (intention transactionnelle)

| Mot-clé | Difficulté | Opportunité | Intention | Contenu recommandé |
|---------|------------|-------------|-----------|---------------------|
| logiciel réservation restaurant | Élevée | Haute | Transactionnelle | Landing page principale |
| réservation restaurant sans commission | Moyenne | Très haute | Transactionnelle | Landing + comparatif |
| plateforme réservation restaurant suisse | Basse | Très haute | Transactionnelle | Landing page, blog |
| alternative thefork suisse | Basse | Très haute | Commerciale | Page comparatif dédiée |
| alternative thefork sans commission | Basse | Haute | Commerciale | Comparatif + blog |
| logiciel gestion restaurant suisse | Moyenne | Haute | Transactionnelle | Landing |
| système réservation restaurant | Moyenne | Haute | Transactionnelle | Landing |
| widget réservation restaurant site web | Basse | Haute | Transactionnelle | Page fonctionnalité dédiée |
| CRM restaurant | Moyenne | Moyenne | Commerciale | Blog + fonctionnalité |
| plan de salle restaurant digital | Basse | Haute | Commerciale | Blog + fonctionnalité |

### 2.2. Mots-clés secondaires (intention informationnelle)

| Mot-clé | Difficulté | Opportunité | Intention | Contenu recommandé |
|---------|------------|-------------|-----------|---------------------|
| comment réduire no-show restaurant | Basse | Haute | Informationnelle | Article de blog |
| commission thefork combien | Basse | Très haute | Informationnelle | Article comparatif |
| LPD restaurant données clients suisse | Très basse | Moyenne | Informationnelle | Guide légal |
| digitalisation restaurant suisse | Basse | Haute | Informationnelle | Guide complet |
| gestion réservation restaurant gratuit | Moyenne | Moyenne | Transactionnelle | Landing (attention: pas de "gratuit" !) |
| confirmation réservation automatique | Très basse | Haute | Informationnelle | Blog + FAQ |
| prépaiement restaurant no-show | Basse | Haute | Informationnelle | Article + fonctionnalité |
| meilleur logiciel restaurant 2026 | Élevée | Haute | Commerciale | Article de blog |
| migrer thefork alternative | Très basse | Très haute | Transactionnelle | Guide migration |
| restaurant suisse RGPD LPD | Très basse | Moyenne | Informationnelle | Guide légal |

### 2.3. Mots-clés longue traîne (faible concurrence, forte conversion)

| Mot-clé | Opportunité | Type de page |
|---------|-------------|--------------|
| logiciel réservation restaurant sans commission suisse | Très haute | Landing |
| alternative thefork restaurant genève | Très haute | Blog |
| réservation restaurant instantanée sans attente | Haute | Landing / blog |
| widget réservation restaurant wordpress | Haute | Guide technique |
| système fidélité restaurant digital suisse | Haute | Fonctionnalité |
| bon cadeau restaurant en ligne suisse | Haute | Fonctionnalité |
| anti no-show restaurant solution | Haute | Blog |
| hébergement données restaurant suisse infomaniak | Moyenne | Blog |
| plan de salle intelligent restaurant ia | Haute | Blog |
| commande en salle tablette restaurant | Haute | Fonctionnalité (bientôt) |

### 2.4. Mots-clés multilingues

Le site est en 4 langues. Les mots-clés allemands et italiens sont stratégiques car moins concurrentiels :

| Langue | Mot-clé prioritaire | Concurrence |
|--------|---------------------|-------------|
| DE | Reservierungssystem Restaurant Schweiz | Basse |
| DE | Restaurant Software ohne Provision | Basse |
| DE | Alternative TheFork Schweiz | Très basse |
| DE | Tischreservierung online Restaurant | Moyenne |
| IT | software prenotazione ristorante svizzera | Très basse |
| IT | alternativa TheFork senza commissioni | Très basse |
| IT | gestione ristorante digitale | Basse |
| EN | restaurant reservation software switzerland | Basse |
| EN | thefork alternative no commission | Basse |

---

## 3. Analyse des concurrents SEO

### 3.1. Vue d'ensemble

| Dimension | R3STO | TheFork | Zenchef | Aleno | miMesa |
|-----------|-------|---------|---------|-------|--------|
| Indexé sur Google | Non | Oui (massif) | Oui (fort) | Oui (moyen) | Oui (faible) |
| Blog / contenu | Non | Oui | Oui (actif) | Oui (blog) | Non |
| Fréquence publication | — | Élevée | Élevée | Mensuelle | — |
| Données structurées | Oui (basique) | Oui (riche) | Oui | Oui | Non |
| Pages comparatives | Oui (1 page) | Non | Non | Oui (blog) | Non |
| Présence locale (Google) | Non | Oui | Oui | Oui | Non |
| Multilingue | Oui (4) | Oui (multi) | Oui (FR/EN) | Oui (DE/FR/EN) | Oui (FR/EN) |
| Hébergement suisse | Oui | Non | Non | Oui | Oui |

### 3.2. Forces et faiblesses par concurrent

**TheFork (thefork.ch)**
- Force : domination absolue en SEO (1300+ restaurants indexés, Google Maps)
- Force : énorme contenu UGC (avis, fiches restaurant)
- Faiblesse : modèle commission contesté (139 CHF/mois + 3-4 CHF/réservation)
- Opportunité R3STO : cibler les requêtes "alternative thefork", "thefork commission"

**Zenchef (zenchef.com)**
- Force : blog actif, bon SEO, 0% commission
- Force : intégrations (Google Reserve, Instagram)
- Faiblesse : confirmation manuelle, pas suisse, prix dès 109 EUR/mois
- Opportunité R3STO : confirmation instantanée, prix plus bas, hébergement suisse

**Aleno (aleno.me)**
- Force : bien implanté en Suisse alémanique, bons avis
- Force : 32+ intégrations marketplace
- Faiblesse : pas de pricing public transparent, pas de modules Order/Delivery/Cash
- Opportunité R3STO : transparence prix, modules complémentaires, 4 langues

**miMesa (mimesa.ch)** — ATTENTION, concurrent direct
- Force : même positionnement (sans commission, suisse, prix fixe)
- Faiblesse : site minimaliste, peu de contenu, pas de blog
- Opportunité R3STO : contenu plus riche, fonctionnalités différenciantes (modules Order/Delivery/Cash), comparatif direct

### 3.3. Gaps de contenu — Ce que les concurrents ont et R3STO n'a pas

| Type de contenu | TheFork | Zenchef | Aleno | R3STO |
|-----------------|---------|---------|-------|-------|
| Blog avec articles réguliers | Oui | Oui | Oui | **Manque** |
| Études de cas / témoignages | Oui | Oui | Oui | **Manque** |
| Guide de démarrage | — | Oui | Oui | **Manque** |
| Page par fonctionnalité | — | Oui | Oui | **Manque** |
| Page de comparaison directe | — | — | Oui | Oui (1 page) |
| Centre d'aide / FAQ | Oui | Oui | Oui | Partiel (assistant) |
| Vidéos / tutoriels | Oui | Oui | Oui | En cours |
| Page "À propos" / "Notre histoire" | Oui | Oui | Oui | **Manque** |

---

## 4. Recommandations SEA (Google Ads)

### 4.1. Budget et benchmarks

D'après les données du marché 2026 :
- CPC moyen secteur restaurant SaaS : **1.50–3.50 CHF** (Suisse)
- CPC mots-clés "sans commission" : **0.80–2.00 CHF** (moins concurrentiel)
- Taux de conversion landing page SaaS : **5–8%**
- Coût par lead estimé : **25–50 CHF**
- Budget mensuel recommandé pour démarrer : **500–1'000 CHF/mois**

### 4.2. Campagnes recommandées

**Campagne 1 — "Alternative TheFork" (priorité 1)**

Cibler les restaurateurs frustrés par les commissions TheFork.

Mots-clés :
- alternative thefork
- thefork commission trop cher
- réservation restaurant sans commission
- quitter thefork
- thefork tarif restaurant

Exemple d'annonce :
> **R3STO — 0% Commission, Toujours**
> Dès 39 CHF/mois. Réservations illimitées.
> Confirmation instantanée. Hébergé en Suisse.
> → Tester R3STO

Budget : 300 CHF/mois
CPC estimé : 1.00–2.00 CHF

**Campagne 2 — "Logiciel réservation restaurant" (priorité 2)**

Cibler les restaurateurs cherchant une solution.

Mots-clés :
- logiciel réservation restaurant
- système réservation restaurant en ligne
- widget réservation restaurant
- gestion réservation restaurant

Exemple d'annonce :
> **R3STO — Réservations Restaurant Suisse**
> Plan de salle IA, CRM, rappels automatiques.
> 0% commission. Hébergé chez Infomaniak.
> → Créer mon compte

Budget : 400 CHF/mois
CPC estimé : 2.00–3.50 CHF

**Campagne 3 — "Restaurant Suisse" (priorité 3)**

Cibler la dimension locale et souveraineté des données.

Mots-clés :
- logiciel restaurant suisse
- données restaurant suisse LPD
- hébergement données suisse restaurant
- gestion restaurant fribourg / genève / lausanne / zurich

Exemple d'annonce :
> **R3STO — 100% Suisse, 0% Commission**
> Données hébergées à Genève (Infomaniak).
> Conforme LPD. Support FR/DE/IT/EN.
> → Découvrir R3STO

Budget : 200 CHF/mois
CPC estimé : 0.50–1.50 CHF

**Campagne 4 — Remarketing (priorité 2)**

Recibler les visiteurs du site qui n'ont pas créé de compte.

Plateforme : Google Display Network + YouTube
Budget : 100 CHF/mois
CPC estimé : 0.20–0.50 CHF

### 4.3. Landing pages dédiées

Pour maximiser le Quality Score et le taux de conversion, créer des landing pages spécifiques :

1. `/ads/alternative-thefork` — page centrée sur la comparaison TheFork vs R3STO
2. `/ads/reservation-restaurant` — page centrée sur les fonctionnalités de réservation
3. `/ads/restaurant-suisse` — page centrée sur l'hébergement suisse et la LPD

Chaque page doit avoir un seul CTA clair ("Créer mon compte") et reprendre les mots-clés de la campagne.

---

## 5. Plan d'action priorisé

### Quick Wins — Cette semaine

| Action | Impact | Effort | Détail |
|--------|--------|--------|--------|
| Créer `robots.txt` | Critique | 5 min | Voir contenu ci-dessus |
| Créer `sitemap.xml` | Critique | 10 min | Voir contenu ci-dessus |
| Créer un compte Google Search Console | Critique | 15 min | Vérifier propriété via DNS TXT |
| Soumettre le sitemap à Google | Critique | 5 min | Via Search Console |
| Créer un Google Business Profile | Élevé | 30 min | Pour Innoptim Group Sàrl / R3STO |
| Raccourcir la meta description (< 160 car.) | Moyen | 5 min | Couper les éléments redondants |
| Ajouter canonical + OG aux sous-pages | Moyen | 20 min | /comparatif, /assistant, /video |
| Ajouter meta description aux pages légales | Bas | 10 min | 3 pages |
| Installer Google Analytics 4 (GA4) | Élevé | 15 min | Tag gtag.js ou Google Tag Manager |
| Ajouter `hreflang` pour les 4 langues | Élevé | 30 min | Indispensable pour le SEO multilingue |

### Investissements stratégiques — Ce trimestre

| Action | Impact | Effort | Détail |
|--------|--------|--------|--------|
| Lancer un blog (3-4 articles/mois) | Très élevé | 2-3h/article | Cibler les mots-clés informationnels |
| Créer des pages par fonctionnalité | Élevé | 1 jour | /reservations, /plan-de-salle, /crm, /no-show |
| Créer 3 landing pages SEA | Élevé | 1 jour | /ads/alternative-thefork, /ads/reservation, /ads/suisse |
| Lancer les campagnes Google Ads | Élevé | 2h setup | Budget initial 500–1000 CHF/mois |
| Obtenir des backlinks locaux | Élevé | Continu | GastroSuisse, blogs gastronomiques, presse locale |
| Créer une page "À propos" / histoire | Moyen | 2h | Renforce la confiance et le SEO |
| Ajouter schema FAQPage à la landing | Moyen | 30 min | FAQ existante = éligible aux rich snippets |
| Publier des témoignages clients | Élevé | Continu | Quand les premiers clients arrivent |
| Créer du contenu DE/IT spécifique | Élevé | 1 article/langue/mois | Marché moins concurrentiel |
| Inscrire R3STO sur les annuaires SaaS | Moyen | 2h | Capterra, G2, GetApp, AppVizer |

### Articles de blog prioritaires (premiers 5)

1. **"TheFork : combien ça coûte vraiment pour un restaurateur suisse ?"** — Cible : `commission thefork`, `thefork tarif restaurant`
2. **"Comment réduire les no-shows de 87% dans votre restaurant"** — Cible : `no-show restaurant solution`, `réduire no-show`
3. **"LPD et RGPD : ce que chaque restaurateur suisse doit savoir sur les données clients"** — Cible : `LPD restaurant`, `RGPD restaurant suisse`
4. **"Confirmation instantanée vs manuelle : pourquoi vos clients n'attendent plus"** — Cible : `confirmation réservation automatique`
5. **"5 raisons de quitter TheFork (et les alternatives sans commission)"** — Cible : `alternative thefork`, `quitter thefork`

---

## 6. Suivi et KPIs

| KPI | Objectif 3 mois | Objectif 6 mois |
|-----|-----------------|-----------------|
| Pages indexées (Google) | 10+ | 30+ |
| Trafic organique mensuel | 200 visites | 1'000 visites |
| Mots-clés en top 10 | 5 | 20 |
| CTR Google Ads | > 5% | > 7% |
| Coût par inscription (SEA) | < 50 CHF | < 30 CHF |
| Articles de blog publiés | 8 | 20 |
| Backlinks obtenus | 10 | 30 |

---

## 7. Concurrent à surveiller : miMesa

miMesa (mimesa.ch) est un concurrent direct avec un positionnement quasi identique : sans commission, prix fixe, hébergé en Suisse. Leur site est encore minimaliste et peu référencé. C'est le moment d'agir vite pour prendre l'avantage SEO avant qu'ils ne fassent de même. Ajouter miMesa au comparatif existant et créer du contenu qui positionne R3STO comme la solution la plus complète (modules Order, Delivery, Cash).

---

*Audit réalisé le 5 avril 2026 — Sources : Google Search, analyse du code source r3sto.ch, benchmarks PPC 2026*
