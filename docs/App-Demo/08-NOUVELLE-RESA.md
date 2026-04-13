# Nouvelle Reservation - /nouvelle-resa
Fichier : src/views/NouvelleResa/NouvelleResa.tsx
Store : resas, tables, services, combos, salles, options, resto, clients, addResa, blinkResa

## Elements
### Etape 1 - Parametres
- Mode : IA (placement auto) / Manuel (grille selection)
- Date (nav 7 jours)
- Service (midi/soir/etc)
- Salle
- Couverts (chips 1-6 + stepper 7+)

### Etape 2 - Table
- Mode IA : Suggestion auto (table, capacite, score)
- Mode Manuel : Grille tables libres, selection manuelle

### Etape 3 - Client
- Recherche client existant (nom/tel)
- Ou saisie nouvelle : nom, prenom, tel (PhoneInput E.164)
- Notes, occasion, allergies, enfants, PMR
- Resa anonyme possible (walk-in)

### Validation
- Toast de confirmation avec resume

## Connexion store : OK (addResa + lookup clients)
## Actions : Creer resa (3 modes : normal, anonyme, IA auto)
## Filtres : Aucun (flux creation)
