# Clients Bloques - /blacklist
Fichier : src/views/Blacklist/Blacklist.tsx
Store : clients (filtre blacklisted), options (blacklistRules)

## Elements
3 onglets : Liste / Regles auto / Blocage manuel
Liste : tableau nom, tel, score, niveau (1-4), raison, actions
Niveaux : 1=Surveillance, 2=Attention, 3=Interdit, 4=Ban total
Regles auto : seuil no-show, seuil ban, seuil annulations, rehabilitation auto
Blocage manuel : formulaire nom, tel, niveau, raison
KPI : total, actifs, niveau 3-4, score moyen

## Connexion store : OK (clients store filtre + options.blacklistRules)
## Actions : Bloquer manuellement, rehabiliter, sauvegarder regles, exporter CSV
## Filtres : Onglet
