# Commandes (KDS) - /commandes
Fichier : src/views/Commandes/Commandes.tsx
Store : tables (noms des tables depuis le store)

## Elements
- Vue d'ensemble avec compteurs statut
- Commandes actives (pending/preparing/ready) avec alerte sonore
- Detail commande : table, items (nom, qte, prix), total, notes, temps ecoule
- Transition statut : En preparation -> Pret -> Servi -> Termine
- Systeme alertes sonnette (appel table)
- Notifications sonores (Web Audio API)
- Formulaire nouvelle commande
- Filtre : Actives / Terminees
- Filtre multi-statut et par table

## Connexion store : PARTIEL (tables du store, commandes en local session)
## Actions : Creer commande, changer statut, alertes sonores
## Filtres : Actives/terminees, table, statut
## Note : Les commandes sont ephemeres (session uniquement, pas de persistance API)
