# Audit - /audit
Fichier : src/views/Audit/Audit.tsx
Store : resas, tables, services, clients, users

## Elements
- KPI : total checks, OK, warnings, erreurs
- 5 categories : Data / Tables / Resas / Config / Access
- Checks auto-generes : resas orphelines, doublons clients, formats invalides, config manquante, permissions
- Cards avec severite (OK/WARN/ERR)

## Connexion store : OK
## Actions : Filtrer par categorie/severite, exporter rapport
## Filtres : Categorie, severite

---

# Alertes - /alertes
Fichier : src/views/Alertes/Alertes.tsx
Store : resas, activeDate, tables, services

## Elements
- Filtres : Tous / Waitlist / Non-assignes / No-show / Arrivees / Groupes / Surbooking
- Cards alerte : icone, titre, sous-titre, badge severite (critique/warning/info)
- Actions contextuelles par alerte

## Connexion store : OK
## Actions : Naviguer vers vue concernee, ignorer
## Filtres : Type d'alerte
