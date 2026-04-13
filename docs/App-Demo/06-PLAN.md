# Plan de Salle Interactif - /plan

Fichier : src/views/Plan/Plan.tsx
Store : resas, tables, combos, salles, services, activeDate, setResaStatus, updateResa

## Elements visibles

### Canvas SVG
- Tables positionnees (x, y) avec forme (rond/carre/rect/banquette)
- Couleur selon statut :
  - Libre = clair, Reserve = bleu, Arrive = vert, Bloque = gris
  - Combo partiel = violet, Reserve (held) = orange
- Indicateurs sur chaque table : nom, capacite, VIP, allergie, bebe, PMR

### Panneau lateral (au clic sur table)
- Detail de la resa assignee
- Boutons d'action : arrivee, noshow, termine, annuler
- Deplacer vers autre table (drag ou selection)

### Banniere orphelins
- Resas non assignees

### Mode deplacement
- Drag-and-drop pour reassigner
- Echange entre deux tables
- Placement IA automatique

### Quick-resa depuis le plan
- Clic table libre -> formulaire rapide (nom, couverts, heure)

## Connexion store : OK (complet)
## Actions : Toutes les mutations de resa + gestion tables
## Filtres : Date, service (implicite via resas)
