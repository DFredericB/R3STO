# Topbar (Header) - app.r3sto.ch / demo.r3sto.ch

Fichier : src/components/layout/Header.tsx

## Elements

- Logo R3STO (lien vers /)
- Horloge en temps reel (hh:mm:ss) + date du jour
- Selecteur de langue (FR / DE / IT / EN) - pills cliquables
- Cloche notifications avec badge compteur
  - Types : nouvelle resa, no-show, annulation, resa widget, arrivee VIP, allergie, alerte systeme
  - Panneau deroulant au clic
- Recherche globale (Cmd+K)

## Etat actuel

- Horloge : OK fonctionnelle
- Langue : OK (change via store Zustand `lang`)
- Notifications : Visuelles uniquement, pas connectees a l'API (local state)
- Recherche : Modale UI presente, filtre local sur les resas du store
