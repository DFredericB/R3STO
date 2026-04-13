# delivery.r3sto.ch — Livraison & Take-away

> URL : https://delivery.r3sto.ch
> Sources : `src/views/Delivery/DeliveryDashboard.tsx`, `DeliveryOrders.tsx`, `DeliveryTracking.tsx`, `DeliveryZones.tsx`
> Statut : ❌ DISCONNECTED — données demo hardcodées

## Vues

### DeliveryDashboard
- KPI cards (4 grille) :
  - 📦 Commandes actives
  - 🛵 En livraison
  - 🏃 Take-away prêts
  - 💰 CA du jour
- Filtres tabs : Toutes | 🛵 Livraison | 🏃 Take-away
- Liste commandes avec :
  - Point statut coloré (pending/preparing/ready/delivering/delivered/cancelled)
  - ID commande (DEL-001)
  - Nom client + adresse
  - Items (qty x nom)
  - Total (vert, aligné droite)
  - Badge statut

### DeliveryOrders
- ❌ Affiche `<LockedModule>` : "Module livraison à venir"

### DeliveryTracking
- Suivi temps réel des livreurs (carte prévue)
- ❌ Non implémenté réellement

### DeliveryZones
- Configuration zones de livraison
- ❌ Données demo hardcodées

## Structure données commande
- id, customer (name, phone, address)
- items[] (qty, name)
- status : pending → preparing → ready → delivering → delivered
- type : delivery | takeaway
- estimatedTime, driverName, timestamps

## Problèmes identifiés
- ❌ DEMO_ORDERS hardcodé (6 commandes)
- ❌ Aucune connexion store
- ❌ DeliveryOrders = placeholder LockedModule
- ❌ Pas de vraie intégration avec Commandes/KDS
