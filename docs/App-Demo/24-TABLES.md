# Editeur de Tables - /tables (alias /setup-plan)
Fichier : src/views/SetupPlan/TablesSetup.tsx
Store : tables, salles, combos, setCombos, setTables

## Elements
- Liste tables par salle : nom, capacite, forme, statut
- Stats : total tables, capacite totale, bloquees, en reserve, en combo
- Onglets par salle
- Gestion combos : creation multi-selection, liste, suppression
- Detail table : nom, forme (rond/carre/rect/banquette), capacite, actif, priorite
- Mode combo pour creation par lot

## Connexion store : OK (CRUD tables + combos)
## Actions : Ajouter, modifier, supprimer table, creer/supprimer combo, toggle actif/bloque
## Filtres : Salle
