# REMARQUES EN COURS — R3STO
**Date:** 2026-04-14
**Source:** Didier, dicté manuellement (les précédentes remarques reconstruites à partir de transcripts étaient fausses)

---

## 🚨 INTERJECTIONS URGENTES (quick wins)

- [x] **Badges demo/admin visibles** — Header.tsx lignes 243-269, détection via hostname. À vérifier sur capture écran.
- [x] **Retirer "Mon restaurant" de Admin** — Header.tsx l.708, bouton dropdown profil wrappé `{!isAdmin && ...}` (14 avril 2026).
- [ ] **Demo : accès à tous les sites clients avec données fictives cohérentes + interactions live** (NEW 14 avril)
  - Depuis `demo.r3sto.ch`, pouvoir ouvrir widget/menu/delivery/bill/etc. d'un resto fictif "Chez Bunny's"
  - Données fictives mais **cohérentes** (mêmes tables, mêmes menus, mêmes horaires partout)
  - **Interactions réelles** : créer une résa sur le widget → doit apparaître dans le Journal/Grille du demo app
  - Scénarios à montrer aux prospects en live

---

## 📋 LISTE D'ATTENTE (à traiter plus tard, pas urgent)

- [ ] **Logo officiel CARAT** (icône diamant doré + texte "CARAT" + baseline "ÉVALUATION GASTRONOMIQUE INDÉPENDANTE")
  - Remplacer le placeholder actuel `deploy/carat.r3sto.ch/logo-r3sto.jpg` par le vrai logo CARAT
  - Intégrer dans le header + favicon du site carat.r3sto.ch
  - Format fourni : PNG sur fond noir (à rechercher le .png quand Didier re-upload)
- [ ] **Logo R3STO en vert** pour pass.r3sto.ch
  - Adapter le logo R3STO officiel à la palette verte forêt du site Pass
  - SVG recoloré (pas un filter CSS, version propre)
  - Respecter la règle : pas d'effets (box-shadow, glow, border-radius)

---

## LES 7 POINTS RÉELS (à traiter un à un, dans l'ordre)

### 1. Landing pro — mettre en avant annuaire + SEO ?
- Bloc "Bonus annuaire" sur pro.r3sto.ch : **pas maintenant**, dans ~2 mois quand SEO établi
- **Status:** ⏸ reporté (SEO first)

### 2. Simplifier Bistro + revoir packages
Matrice validée par Didier :

| Feature            | Bistro | Resto | Gastro |
|--------------------|:------:|:-----:|:------:|
| Grille             |   ✅   |  ✅   |  ✅    |
| Agenda             |   ✅   |  ✅   |  ✅    |
| Journal            |   ✅   |  ✅   |  ✅    |
| **Widget**         |   ✅   |  ✅   |  ✅    |
| **Tables & Combos**|   ✅   |  ✅   |  ✅    |
| Plan 2D (Éditeur)  |   ❌   |  ✅   |  ✅    |
| CRM clients        |   ❌   |  ✅   |  ✅    |
| Menu QR            |   ❌   |  ✅   |  ✅    |
| Waitlist           |   ❌   |  ✅   |  ✅    |
| Groupes            |   ❌   |  ✅   |  ✅    |
| Blacklist          |   ❌   |  ✅   |  ✅    |
| Prépaiement        |   ❌   |  ❌   |  ✅    |
| Multi-sites        |   ❌   |  ❌   |  ✅    |
| IA                 |   ❌   |  ❌   |  ✅    |
| SMS                |   ❌   |  ❌   |  ❌    | (retiré partout)
| API REST           |   ❌   |  ❌   |  ❌    | (retiré tant qu'aucune demande concrète)

- Bistro : ajouter "**< 500 CHF/an, système automatique autonome**"
- Mettre à jour `src/utils/stripe.ts` + landing pro.r3sto.ch + pricing
- **Status:** ⏳ à faire

### 3. Corriger /restaurants (annuaire déplacé à la racine r3sto.ch/)
- 301 redirect `/restaurants` → `/` (annuaire = home)
- Bouton header droit : **texte invisible** à corriger
- Liste cuisines **alignée** sur inscription app
- Membres (restos payants) **visibles d'office** en tête
- Section Admin : gestion annuaire, modération fiches, claims
- **Placements/promos** type TheFork (restos sponsorisés en top)
- **Impersonation** : depuis admin console, "login as" le demo avec choix du rôle
- **Status:** ⏳ à faire

### 4. booking.r3sto.ch cassé — reconstruction par slug
- Page par resto : `booking.r3sto.ch/chez-martin`
- Widget **iframable** (pour intégration site du resto)
- Agenda du jour par défaut
- Créneaux sélectionnables
- Formulaire résa complet (nom, tel, email, personnes, remarques)
- Intégrations : **limites de capacité, groupes, waitlist, blacklist, menus, prépaiement**
- **Status:** ⏳ à faire

### 5. Logo R3STO partout (audit systématique)
- r3sto.ch, auth, app, admin, bill, booking, menu, delivery, demo, pass, pro, carat, api
- Logo bleu officiel sur pro.r3sto.ch (rappel : jamais modifier)
- **Accès demo** : url demo.r3sto.ch direct selon rôle+autorisations depuis admin console (impersonation)
- **Status:** ⏳ à faire

### 6. Demo — données auto-générées miroir de l'app
- `generateDemoData(referenceDate)` : 18 mois d'historique + 6 semaines de futur
- Patterns réalistes : pics midi/soir, no-shows, walk-ins
- 200 clients fictifs avec profils complets (préférences, historique, notes)
- **Runtime** : pas de seed figé, régénéré à chaque ouverture depuis date du jour
- **Cohérence cross-sites** (voir interjection urgente ci-dessus)
- **Status:** ⏳ à faire

### 7. Tables & Combos obligatoire avant Éditeur
- Bloquer accès Éditeur tant que 0 table dans Tables & Combos
- Sync **bidirectionnelle** Tables ↔ Éditeur ↔ vues (Grille/Plan)
- Modale réassignation **forcée** si suppression d'une table/combo avec résas futures
- Bloquer création nouvelle résa tant que résas orphelines non réassignées
- Note Didier : "étape 2 déjà en fonction non? Juste on ob