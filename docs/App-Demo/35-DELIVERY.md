# R3STO Delivery

## Dashboard - /delivery
Fichier : src/views/Delivery/DeliveryDashboard.tsx
- Filtre : Tous / Livraison / A emporter
- Kanban statuts : Pending, Preparing, Ready, Delivering, Delivered, Cancelled
- Card commande : ID, client, tel, adresse, items, total, ETA, livreur
- KPI : commandes actives, revenue jour
- Store : NON (DEMO_ORDERS local)

## Commandes Livraison - /delivery-orders
Fichier : src/views/Delivery/DeliveryOrders.tsx
- Module verrouille (LockedModule placeholder)

## Suivi en Direct - /delivery-tracking
Fichier : src/views/Delivery/DeliveryTracking.tsx
- Carte simulee (SVG grid)
- Liste livraisons actives : client, adresse, livreur, statut, ETA
- Store : NON (DEMO local)

## Zones de Livraison - /delivery-zones
Fichier : src/views/Delivery/DeliveryZones.tsx
- Module verrouille (LockedModule placeholder)
