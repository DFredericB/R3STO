# Parametres - /options
Fichier : src/views/Options/Options.tsx
Store : theme, setTheme, options, updateOptions

## Elements
### Equipements (toggles)
WiFi, parking, terrasse, chauffage, borne EV, vue panoramique, etc.

### Acces (toggles)
Accessible PMR, animaux, fumeur, salons prives, vestiaire, cave a vin, dress code

### Notifications
- Notification nouvelle resa (toggle)
- Son (toggle)
- Seuil heures pour notif

### Langues supportees (FR, EN, DE, IT)

### Regles de reservation
- Min/max couverts
- Fenetre annulation (heures)
- Horizon reservation (jours)
- Intervalle creneaux (minutes)
- Duree par defaut (minutes)
- Autoriser resas passees, telephone requis, walk-in

### Dispersion
- Mode (IA/Manuel), intervalle, max par creneau

### Groupes
- Groupes prives, validation obligatoire, privatisation
- Seuil, taille max, max par service

## Connexion store : OK (updateOptions persiste tout)
## Actions : Modifier tous les parametres, sauvegarder
## Filtres : Aucun (formulaire complet)
