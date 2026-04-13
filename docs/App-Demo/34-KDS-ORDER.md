# R3STO Order - KDS & Service

## KDS Cuisine - /kds-cuisine
Fichier : src/views/KDS/KDSCuisine.tsx
- Cards commande cuisine : table, items, total, notes, temps
- Transition : Pending -> Preparing -> Ready -> Served
- Alertes sonores (Web Audio)
- Filtre : Actives / Terminees
- Store : NON (local state demo)

## KDS Bar - /kds-bar
Fichier : src/views/KDS/KDSBar.tsx
- Meme structure que KDS Cuisine, filtrage boissons
- Store : NON (local state demo)

## Service (Serveur) - /service
Fichier : src/views/Service/ServiceView.tsx
- Commandes pretes a servir (status=ready)
- Detail : table, items, total, notes
- Sonnette appel table
- Plan de salle (liste salles)
- Store : NON (local state)

## Caisse - /caisse
Fichier : src/views/Caisse/CaisseView.tsx
- Commandes servies (a encaisser)
- Resume : table, items, total, temps depuis service
- Encaissement (marquer paye)
- Total du shift
- Comptage caisse
- Store : NON (local state)
