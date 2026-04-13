# booking.r3sto.ch — Widget de réservation public

> URL : https://booking.r3sto.ch
> Source : `src/views/Widget/Widget.tsx`
> Statut : ❌ DISCONNECTED — données hardcodées, pas de store

## Architecture

Widget de réservation en multi-étapes, configurable visuellement. Destiné à être embarqué en iframe sur le site du restaurant ou accessible directement.

## Configuration (objet wgtCfg)

| Paramètre | Type | Défaut | Description |
|-----------|------|--------|-------------|
| color | string | #4480d8 | Couleur primaire |
| theme | 'light'/'dark' | light | Thème |
| lang | string | fr | Langue |
| msg | string | - | Message accueil |
| showTable | bool | true | Choix de table |
| showNote | bool | true | Champ notes |
| showPrepay | bool | false | Prépaiement |
| minCvt/maxCvt | number | 1/20 | Min/max couverts |
| layout | enum | vertical | vertical/horizontal/popup/floating |
| borderRadius | number | 8 | Arrondi |
| shadow | bool | true | Ombre portée |
| showPhone | bool | true | Champ téléphone |
| showEmail | bool | true | Champ email |
| showOccasion | bool | false | Champ occasion |
| showLang | bool | false | Sélecteur langue |
| confirmAuto | bool | false | Confirmation auto |
| showSlots | bool | true | Créneaux horaires |
| maxDaysAhead | number | 30 | Jours max à l'avance |
| btnLabel | string | Réserver | Texte bouton |
| successMsg | string | - | Message confirmation |
| showRedirect | bool | false | Redirection après |

## Flux multi-étapes

### Étape 1 — Date & Service
- Chips date : 7 jours (Aujourd'hui, Lun, Mar, ...)
- Cartes service (ex: "Midi" 12h-14h, "Soir" 19h-21h30)
- Détection service fermé (icône cadenas)

### Étape 2 — Couverts & Table
- Boutons +/- pour nombre de couverts (1-20)
- Sélection table (si activé) : tables dispo avec capacité

### Étape 3 — Informations client
- Nom, Email, Téléphone
- Occasion (anniversaire, célébration, etc.)
- Sélecteur langue
- Notes (textarea)

### Étape 4 — Confirmation
- Résumé commande
- Option redirection

## Éléments UI
- Barre progression horizontale (étapes remplies/active/pending)
- Chips date (fond coloré quand sélectionné)
- Indicateurs disponibilité
- SIBLING_SITES : suggestions restos alternatifs si complet

## Problèmes identifiés
- ❌ RESTO, SERVICES, TABLES sont des constantes hardcodées
- ❌ SIBLING_SITES hardcodé
- ❌ Aucune lecture du store
- ❌ La réservation soumise ne va nulle part (local state)
- Doit lire les données du restaurant via API publique ou store
