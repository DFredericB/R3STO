# Journal des Reservations - /reservations

Fichier : src/views/Resas/Resas.tsx
Store : resas, services, activeDate, tables, combos, clients, addResa, updateResa, deleteResa, setResaStatus

## Elements visibles

### Barre de filtres
- Recherche par nom/telephone
- Filtre statut : Tous / Reserve / Arrive / Termine / No-show / Annule
- Filtre service (midi/soir/etc)
- Filtre salle

### Liste des reservations
- Nom client, telephone, heure, couverts, table, statut
- Badge canal (widget, tel, email, walk-in)
- Indicateurs : VIP, allergie, bebe, PMR, note
- Actions par resa : modifier statut, editer, supprimer, dupliquer

### Formulaire de detail (panneau lateral)
- Client : nom, prenom, tel (PhoneInput), email
- Resa : date, heure, couverts, service, salle, table
- Mode : IA / manuel / telephone / widget
- Statut client : Standard / Regulier / VIP / Surveille
- Occasion (anniversaire, affaires, etc)
- Allergenes (checkboxes)
- Notes libres
- Pris par (personnel)

## Connexion store : OK (CRUD complet via store)
## Actions : Creer, modifier, supprimer, changer statut, dupliquer, exporter
## Filtres : Statut, service, salle, recherche texte
