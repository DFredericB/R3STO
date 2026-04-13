# bill.r3sto.ch — Addition & Paiement table

> URL : https://bill.r3sto.ch
> Source : Référencé dans `QRCode.tsx` et `SiteVitrine.tsx`
> Statut : ❌ NON IMPLÉMENTÉ — stub/référence uniquement

## Description

Sous-domaine prévu pour permettre aux clients de consulter et payer leur addition directement depuis un QR code posé sur la table.

## Flux prévu
1. Client scanne QR code sur la table
2. Ouverture bill.r3sto.ch/table/{id}
3. Affichage items commandés + total
4. Paiement Stripe (split possible)

## État actuel
- Le QR code est généré dans `QRCode.tsx` avec l'URL bill.r3sto.ch
- Aucune vue dédiée n'existe dans le codebase
- Le sous-domaine est listé dans la config CORS

## Problèmes identifiés
- ❌ Pas de composant React
- ❌ Pas de route
- ❌ Module à créer entièrement
