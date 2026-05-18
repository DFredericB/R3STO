# R3STO — Stratégie Modules & Vision Produit

**Objectif** : Devenir la plateforme tout-en-un qui gère 100% d'un restaurant suisse.

---

## 1. Architecture des modules

### Naming : R3STO + Nom du module

Chaque module s'appelle **R3STO [Nom]** avec sa propre couleur d'accent dans l'interface.

| Module | Nom | Couleur | Icône | Statut |
|--------|-----|---------|-------|--------|
| Réservations | **R3STO Résa** | Bleu `#3b82f6` | Calendrier | Prêt |
| Commandes en salle | **R3STO Order** | Orange `#f97316` | Tablette | Bêta |
| Livraison/Take-away | **R3STO Delivery** | Vert `#10b981` | Scooter | Bêta |
| Caisse / POS | **R3STO Cash** | Violet `#8b5cf6` | Terminal | À venir |
| Stock & Approvisionnement | **R3STO Stock** | Ambre `#f59e0b` | Entrepôt | À planifier |
| Ressources humaines | **R3STO Team** | Rose `#ec4899` | Personnes | À planifier |
| Comptabilité & Finances | **R3STO Finance** | Emeraude `#059669` | Graphique | À planifier |
| Marketing & Fidélité | **R3STO Engage** | Cyan `#06b6d4` | Coeur | Partiel (CRM dans Résa) |
| Menu & Carte digitale | **R3STO Menu** | Rouge `#ef4444` | Assiette | Partiel (menu.r3sto.ch) |
| Analytics & BI | **R3STO Insights** | Indigo `#6366f1` | Dashboard | À planifier |

### Représentation visuelle

Dans le sidebar de l'app, chaque module apparaît avec le logo R3STO miniature + le nom du module en couleur :

```
[Logo] R3STO Résa          ← bleu, actif
[Logo] R3STO Order         ← orange, badge "BÊTA"
[Logo] R3STO Delivery      ← vert, badge "BÊTA"
[Logo] R3STO Cash          ← violet, badge "BIENTÔT"
[Logo] R3STO Stock         ← ambre, badge "BIENTÔT"
[Logo] R3STO Team          ← rose, badge "BIENTÔT"
─────────────────
⚙️ Paramètres
```

---

## 2. Détail de chaque module

### R3STO Résa (Prêt)
Ce qu'il fait aujourd'hui :
- Réservations illimitées avec confirmation instantanée (2 sec)
- Plan de salle IA
- Widget intégrable sur le site du restaurant
- Rappels SMS + email automatiques
- CRM clients (historique, préférences, allergies)
- Anti no-show (prépaiement Stripe dans plan Gastro)
- Bons cadeaux et programme de fidélité
- QR code menu digital

### R3STO Order (Bêta)
Commandes en salle via tablette/smartphone :
- Scan QR code à table → menu digital → commande directe
- Le serveur voit les commandes en temps réel sur tablette
- Envoi automatique en cuisine (écran KDS ou imprimante)
- Gestion des modifications, allergies, notes spéciales
- Liaison avec R3STO Cash pour le paiement
- Réduction des erreurs serveur et du temps d'attente

### R3STO Delivery (Bêta)
Livraison et take-away sans commission :
- Boutique en ligne intégrée au site du restaurant
- Gestion des zones de livraison (rayon, codes postaux)
- Suivi de commande en temps réel pour le client
- Gestion des livreurs (internes ou partenaires)
- Intégration avec Uber Direct, Stuart (livraison à la demande)
- Paiement en ligne Stripe
- Pas de commission par commande (contrairement à Uber Eats, Just Eat)

### R3STO Cash (À venir)
Caisse enregistreuse et point de vente :
- Encaissement sur tablette/iPad (pas de terminal dédié coûteux)
- Paiement carte (Stripe Terminal), cash, Twint
- Ticket de caisse digital (email/SMS, écologique)
- Split de l'addition (par convive, par article)
- Pourboire digital
- Liaison directe avec R3STO Order (commandes → addition)
- Journal de caisse conforme aux obligations légales suisses
- Rapports de fin de journée / clôture de caisse

### R3STO Stock (À planifier)
Gestion des stocks et approvisionnement :
- Inventaire digital des matières premières
- Fiches techniques des plats (ingrédients, coûts, allergènes)
- Calcul automatique du food cost par plat
- Alertes stock bas / péremption
- Bons de commande fournisseurs automatisés
- Suivi des réceptions et écarts
- Liaison avec R3STO Order : déstockage automatique à la vente
- Analyse des pertes et du gaspillage

### R3STO Team (À planifier)
Gestion du personnel et planning :
- Planning des équipes (drag & drop)
- Gestion des disponibilités et demandes de congé
- Pointage digital (arrivée/départ via l'app)
- Calcul des heures et heures supplémentaires
- Respect des conventions collectives suisses (CCNT hôtellerie-restauration)
- Notifications de remplacement en cas d'absence
- Tableau de bord des coûts personnel vs chiffre d'affaires
- Export pour la comptabilité / fiduciaire

### R3STO Finance (À planifier)
Comptabilité simplifiée et pilotage financier :
- Dashboard chiffre d'affaires journalier/hebdomadaire/mensuel
- Rapports TVA automatiques (taux suisses : 8.1%, 2.6% réduit)
- Suivi des encaissements par mode de paiement
- Rapports pour fiduciaire (export CSV/PDF)
- Marge brute par plat (liaison R3STO Stock)
- Prévisions de trésorerie
- Liaison bancaire (optionnel, futur)

### R3STO Engage (Partiel → complet)
Marketing et fidélisation :
- CRM avancé (déjà dans Résa, à enrichir)
- Campagnes email/SMS (anniversaires, offres, événements)
- Programme de fidélité à points
- Bons cadeaux digitaux
- Gestion de la e-réputation (Google, TripAdvisor, TheFork)
- Enquêtes de satisfaction post-visite
- Analyse du taux de retour clients

### R3STO Menu (Partiel → complet)
Carte digitale et gestion du menu :
- Menu digital multilingue (QR code)
- Gestion des allergènes et régimes (végan, sans gluten, etc.)
- Photos des plats avec IA de description
- Carte du jour / menu du midi dynamique
- Prix différenciés midi/soir
- Suggestions et upselling IA
- Impression de cartes physiques (PDF export)

### R3STO Insights (À planifier)
Analytics et business intelligence :
- Dashboard temps réel (couverts, CA, panier moyen)
- Heatmap du plan de salle (tables les plus demandées)
- Prévisions d'affluence IA (par jour, créneau, météo)
- Analyse des tendances (plats populaires, évolution CA)
- Benchmark anonymisé vs restaurants similaires
- Rapports automatiques hebdomadaires par email
- KPIs : RevPASH, food cost %, taux de remplissage, no-show rate

---

## 3. Stratégie de tarification

### Approche : Plans + Modules add-on

Les plans de base (Bistro/Resto/Gastro) incluent R3STO Résa. Les autres modules sont des add-ons activables.

### Plans de base (R3STO Résa inclus)

| | Bistro | Resto | Gastro |
|--|--------|-------|--------|
| Prix | 39 CHF/mois | 59 CHF/mois | 79 CHF/mois |
| Réservations | Illimitées | Illimitées | Illimitées |
| Plan de salle IA | Oui | Oui | Oui |
| Widget + rappels | Oui | Oui | Oui |
| CRM basique | Oui | Oui | Oui |
| Bons cadeaux | — | Oui | Oui |
| Fidélité | — | Oui | Oui |
| QR Menu | — | Oui | Oui |
| Prépaiement Stripe | — | — | Oui |
| Multi-sites | — | — | Oui |
| IA prédictions | — | — | Oui |
| API REST | — | — | Oui |

### Modules add-on

| Module | Prix | Inclus dans |
|--------|------|-------------|
| **R3STO Order** | +29 CHF/mois | — |
| **R3STO Delivery** | +29 CHF/mois | — |
| **R3STO Cash** | +39 CHF/mois | — |
| **R3STO Stock** | +19 CHF/mois | — |
| **R3STO Team** | +29 CHF/mois | — |
| **R3STO Finance** | +19 CHF/mois | — |
| **R3STO Engage** | +19 CHF/mois | CRM basique dans Résa |
| **R3STO Menu** | +9 CHF/mois | QR Menu basique dans Resto/Gastro |
| **R3STO Insights** | +19 CHF/mois | Dashboard basique dans Résa |

### Pack "R3STO Total"

Pour le restaurateur qui veut tout : **199 CHF/mois** (au lieu de ~280 CHF à la carte).

Tous les modules inclus. Équivalent d'un Gastro + tous les add-ons.

Argument : "Moins cher qu'un seul mois de commissions TheFork pour un restaurant de 50 couverts/jour."

### Matrice de comparaison prix

| Solution | Prix mensuel | Commission | Total pour 100 couverts/jour |
|----------|-------------|------------|-------------------------------|
| **R3STO Total** | 199 CHF | 0 CHF | **199 CHF** |
| **TheFork** | 139 CHF | 3-4 CHF/couvert | **9'139 – 12'139 CHF** |
| **Zenchef** | ~109 EUR (~105 CHF) | 0 CHF | ~105 CHF (mais moins de modules) |
| **Aleno** | ~100+ CHF | 0 CHF | ~100+ CHF (mais moins de modules) |

---

## 4. Roadmap de lancement

### Phase 1 : Maintenant (avril 2026)
- R3STO Résa : **production**
- R3STO Order : **bêta fermée** (5 restaurants pilotes)
- R3STO Delivery : **bêta fermée** (5 restaurants pilotes)
- R3STO Menu : **partiel** (QR code menu existant)
- Landing page : modules bêta visibles avec badge "Bêta"

### Phase 2 : T3 2026 (juillet-septembre)
- R3STO Order : **production**
- R3STO Delivery : **production**
- R3STO Cash : **bêta** (intégration Stripe Terminal + Twint)
- R3STO Engage : **v1** (campagnes email/SMS)
- Blog actif (SEO)

### Phase 3 : T4 2026 (octobre-décembre)
- R3STO Cash : **production**
- R3STO Stock : **bêta** (inventaire + fiches techniques)
- R3STO Insights : **v1** (dashboard analytics)
- Pack R3STO Total disponible

### Phase 4 : T1 2027 (janvier-mars)
- R3STO Stock : **production**
- R3STO Team : **bêta** (planning + pointage)
- R3STO Finance : **bêta** (rapports TVA + export fiduciaire)

### Phase 5 : T2 2027 (avril-juin)
- Tous les modules en production
- R3STO Total : **lancement officiel**
- Objectif : plateforme la plus complète du marché suisse

---

## 5. Modules complémentaires à considérer (futur)

Au-delà des 10 modules principaux, d'autres opportunités existent :

| Idée | Description | Priorité |
|------|-------------|----------|
| **R3STO Events** | Gestion d'événements privés, banquets, séminaires | Moyenne |
| **R3STO Reviews** | Agrégation et réponse aux avis (Google, TripAdvisor) | Haute |
| **R3STO Pay** | Paiement à table via QR code (sans serveur) | Haute |
| **R3STO Connect** | Marketplace d'intégrations tierces (POS, compta, PMS) | Moyenne |
| **R3STO Kitchen** | Écran cuisine (KDS) pour gestion des tickets | Haute (lié à Order) |
| **R3STO Kiosk** | Borne de commande pour fast-food/cafétéria | Basse |
| **R3STO Drive** | Click & collect avec créneaux horaires | Moyenne |
| **R3STO Training** | Formation du personnel (onboarding digital) | Basse |
| **R3STO Waste** | Suivi du gaspillage alimentaire (obligation légale à venir) | Moyenne |
| **R3STO Energy** | Suivi consommation énergie (frigos, fours) — IoT | Basse |

---

## 6. Positionnement vs concurrence

### Le message clé

> **"R3STO, c'est votre restaurant. En entier. En digital. En Suisse."**

### Avantages concurrentiels par module

| Concurrent | Ce qu'il fait bien | Ce qui lui manque | Avantage R3STO |
|------------|-------------------|-------------------|----------------|
| TheFork | Volume de clients | 0% commission, tout-en-un | Prix fixe + modules complets |
| Zenchef | Résa + marketing | Confirmation manuelle, pas suisse | Instantané + hébergement CH |
| Aleno | Résa + intégrations | Pas de Order/Delivery/Cash | Modules intégrés nativement |
| miMesa | Sans commission, suisse | Fonctionnalités limitées | 10 modules vs 1 |
| Lightspeed | POS puissant | Complexe, cher, pas suisse | Simplicité + prix + suisse |
| Gastrofix | POS + stock | Pas de résa, pas de delivery | Tout-en-un natif |
| iKentoo | POS suisse | Pas de résa online | R3STO = résa + POS + tout |

### Le "fossé" stratégique

La vraie force de R3STO sera l'**intégration native** entre tous les modules :
- Une réservation (Résa) → génère une commande (Order) → déclenche le déstockage (Stock) → alimente la caisse (Cash) → met à jour le CRM (Engage) → apparaît dans les analytics (Insights) → les heures serveur sont tracées (Team) → le CA est comptabilisé (Finance)

Aucun concurrent ne fait ce circuit complet. C'est ça le fossé.

---

*Document stratégique — R3STO — Avril 2026*
