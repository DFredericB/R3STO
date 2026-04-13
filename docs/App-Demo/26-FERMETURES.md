# Fermetures - /fermetures
Fichier : src/views/Fermetures/Fermetures.tsx
Store : fermetures (add/remove/toggle via useAppStore.setState)

## Elements
- Types : restaurant, salle, service, vacances, ferie, exception, travaux
- Calendrier avec marqueurs fermeture
- Cards fermeture : dates, type, label, note, salle/service concerne, message widget, toggle actif
- Formulaire ajout
- Jours feries suisses pre-remplis (FERIES_CH) - ajout en un clic
- Message widget par defaut (configurable)

## Connexion store : OK (CRUD complet via store)
## Actions : Ajouter, supprimer, toggle actif, ajouter ferie suisse
## Filtres : Type
