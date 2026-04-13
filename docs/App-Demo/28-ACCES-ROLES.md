# Acces & Roles - /acces-roles
Fichier : src/views/AccesRoles/AccesRoles.tsx
Store : users (via useAppStore.setState)

## Elements
- Liste utilisateurs : nom, email, role (Proprietaire/Manager/Serveur), toggle actif
- Formulaire invitation : nom, email, selecteur role
- Gestion PIN (4 chiffres par utilisateur)
- Historique connexions (user, timestamp, IP)
- Code couleur par role

## Connexion store : OK (mutations via setState)
## Actions : Inviter, modifier role, gerer PIN, desactiver, supprimer
## Filtres : Recherche nom/email
