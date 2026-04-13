# Demandes Groupes - /groupes
Fichier : src/views/Groupes/Groupes.tsx
Store : tables, combos, resas, services, activeDate, addResa, options (groupRequests + groupSettings)

## Elements
### En-tete
- Compteur demandes en attente
- Bouton "Nouvelle demande"
- Bouton "Parametres"

### Parametres (panneau)
- Seuil widget (nb couverts pour redirection)
- Validation manuelle obligatoire (toggle)
- Delai reponse (12/24/48/72h)
- Prepaiement (toggle + % acompte)
- Notifications email/SMS

### Formulaire nouvelle demande
- Nom, couverts, service, heure, date, mode (auto/manuel), tel, note

### Liste en attente
- Card par demande : couverts, nom, service, heure, date, note
- Suggestion IA (table/combo + capacite)
- Boutons : Accepter / Refuser / Toggle mode

### Liste traitees
- Historique acceptes/refuses

## Connexion store : OK (via options.groupRequests + options.groupSettings)
## Actions : Ajouter demande, accepter (cree resa), refuser, sauvegarder parametres
## Filtres : Statut (pending/treated)
