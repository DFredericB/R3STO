# Grille (Seating Grid) - /grille

Fichier : src/views/Grille/Grille.tsx
Store : resas, services, tables, combos, salles, activeDate, setResaStatus

## Elements visibles

### Barre superieure
- Selecteur service (Tous / Midi / Soir / etc)
- Selecteur salle (Toutes / Salle principale / Terrasse / etc)
- Date avec navigation

### Grille
- Lignes = tables (nom + capacite)
- Colonnes = creneaux horaires
- Badges reservation : nom, heure, couverts, icone statut
  - Bleu = reserve, Vert = arrive, Rouge = noshow, Gris = termine
  - Etoile VIP, icone allergie, icone bebe, icone PMR

### Banniere orphelins
- Resas sans table assignee (affichees en haut)

### Actions par badge
- Marquer arrive/noshow/termine
- Annuler / restaurer
- Deplacer vers autre table
- Echanger deux resas

### Popup table
- Bloquer/debloquer table
- Reserver/lever reserve
- Voir details

## Connexion store : OK (lecture + mutations statut)
## Actions : Changer statut, deplacer, echanger, bloquer table
## Filtres : Service, salle, date
