# Salles & Services - /salles
Fichier : src/views/Salles/Salles.tsx
Store : salles, services, tables, resas, fermetures (via useAppStore)

## Elements
### Onglet Salles
- Cards salle : nom, type (interieur/exterieur/prive/bar), couleur, toggle actif
- Stats occupation reelle (basees sur les resas)
- Formulaire ajout/edition

### Onglet Services
- Cards service : nom, icone, heures ouverture/fermeture, derniere commande, buffer, cutoff
- Formulaire edition avec time pickers

### Onglet Avance
- Planification capacite
- Combinaisons de services

## Connexion store : OK (CRUD salles + services via store)
## Actions : Ajouter, modifier, supprimer salles/services, toggle actif
## Filtres : Onglet
