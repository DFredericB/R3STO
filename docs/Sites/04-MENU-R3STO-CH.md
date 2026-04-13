# menu.r3sto.ch — Menu interactif QR Code

> URL : https://menu.r3sto.ch
> Source : `src/views/Menu/Menu.tsx`
> Statut : ❌ DISCONNECTED — items hardcodés

## Architecture

Page de gestion du menu accessible par QR code. Côté admin = édition, côté public = lecture seule.

## Onglets

### Carte (vue menu)
- Catégories avec icônes :
  - 🥗 Entrées
  - 🍽️ Plats
  - 🍰 Desserts
  - 🥤 Boissons
  - 🍷 Vins

- Par item :
  | Élément | Style |
  |---------|-------|
  | Nom | bold 12px |
  | Description | 11px muted |
  | Allergènes | ⚠ amber |
  | Prix | monospace, bleu |
  | Dispo | ✓ Dispo / ✗ Off badge |
  | Éditer | crayon |
  | Supprimer | poubelle |

- Bouton "+ Ajouter" par catégorie

### Réglages (grille 2 colonnes)

**Colonne gauche :**
- Toggles affichage : prix, allergènes, descriptions, commandes
- Message accueil (textarea)
- Couleur principale (color picker)

**Colonne droite :**
- 🔔 Sonnette & Appel serveur (test)
- URL menu public (readonly + copier)

### Modal édition item
- Champs : Nom, Prix (grid 2-col), Catégorie (dropdown), Description, Allergènes
- Boutons : Annuler / Sauvegarder
- Escape pour fermer

## Toolbar
- Titre : "📋 Menu · Carte interactive · accessible par QR code"
- Onglets : Carte | Réglages
- 👁 Aperçu client
- 💾 Sauvegarder (vert)

## Problèmes identifiés
- ❌ Items de menu hardcodés dans le composant
- ❌ Aucune lecture/écriture store
- ❌ Sauvegarde ne persiste rien
- Doit connecter à un store "menuItems" ou via options
