# Dashboard - /dashboard

Fichier : src/views/Dashboard/Dashboard.tsx
Store : resas, tables, services, salles, resto, activeDate, setActiveDate

## Elements visibles

### Barre superieure
- Selecteur de periode : Jour / 7j / 30j / 90j / Annee / Mois
- Date active avec navigation (< jour >)

### KPI Cards (4)
- Total couverts (somme des `c` des resas)
- Nombre de resas
- No-shows (statut `noshow`)
- Revenue estime (couverts x avg_ticket)

### Timeline journaliere
- Reservations groupees par creneaux 30min
- Badges statut : bleu=reserve, vert=arrive, rouge=noshow, gris=termine
- Indicateur VIP, allergie, bebe, PMR

### Repartition par canal
- Telephone, walk-in, email, widget, Google, WhatsApp, SMS
- Barre horizontale avec pourcentages

### Selecteur historique
- Mois/jour pour consulter les donnees passees

## Connexion store : OK (donnees reelles depuis Zustand)
## Actions fonctionnelles : Consultation uniquement, pas de mutation
## Filtres : Periode + date
