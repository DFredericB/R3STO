// ══════════════════════════════════════════════════════════════════════
//  R3STO — RÈGLES MÉTIER EXHAUSTIVES
//  ─────────────────────────────────────────────────────────────────────
//  CE FICHIER EST LA RÉFÉRENCE ABSOLUE.
//  Toute logique métier DOIT être cohérente avec ces règles.
//  Chaque règle pointe vers la/les fonction(s) qui l'implémente(nt).
//
//  ⚠️  NE PAS MODIFIER CE FICHIER SANS METTRE À JOUR LE CODE ASSOCIÉ.
//  ⚠️  NE PAS ÉCRIRE DE LOGIQUE MÉTIER EN DEHORS DE placementRules.ts.
//
//  Dernière mise à jour : 2026-03-24
// ══════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────
//  A. STATUTS DE RÉSERVATION
// ─────────────────────────────────────────────────────────────────────
//
//  A1. Les 6 statuts possibles :
//      reserved | arrived | done | noshow | cancelled | waitlist
//      → Définis dans types/index.ts (ResaStatus)
//      → Visuels dans utils/design.ts (STATUS)
//
//  A2. Occupation de table :
//      SEULS 'reserved' et 'arrived' OCCUPENT une table.
//      'done', 'noshow', 'cancelled', 'waitlist' = table libre.
//      → Implémenté : placementRules.ts → isOccupying()
//
//  A3. Transitions de statut autorisées (Grille — dropdown badge) :
//
//      waitlist  → reserved   (Confirmer ✓)
//      waitlist  → cancelled  (Refuser ✗)
//      reserved  → arrived    (Arrivé ✓)
//      reserved  → noshow     (No-show 👻)
//      reserved  → cancelled  (Annuler 🚫)
//      arrived   → done       (Libérer 🪑 — libère la table)
//      arrived   → noshow     (No-show 👻 — client parti sans payer, etc.)
//      done      → reserved   (Remettre ↩)
//      noshow    → reserved   (Remettre ↩)
//      cancelled → reserved   (Remettre ↩)
//
//      → Implémenté : Grille.tsx → dropdown badge (portal) par statut
//
//  A3b. Ordre des actions dans le dropdown badge (table occupée) :
//      1. ✏️ Modifier     (toujours visible — ouvre modale édition)
//      2. ↔ Déplacer      (reserved/arrived — active move mode)
//      3. ✂ Délier combo  (si en combo, reserved/arrived)
//      4. Actions statut  (selon statut courant, voir A3)
//
//      → Le dropdown badge ne s'ouvre PAS sur table libre (pas d'actions)
//      → Pas de +résa ni combos dans le dropdown badge
//
//  A4. waitlist n'a PAS de table assignée (tbl = '').
//      Quand on confirme (→ reserved), l'IA ou le manuel assigne la table.
//      → Implémenté : Grille.tsx → onRestore met en 'reserved'
//      → TODO futur : lancer le placement IA à la confirmation

// ─────────────────────────────────────────────────────────────────────
//  B. TABLES
// ─────────────────────────────────────────────────────────────────────
//
//  B1. États d'une table :
//      - active=true,  blocked=false, held=false → NORMALE (libre ou occupée)
//      - active=true,  blocked=true              → BLOQUÉE (🚫, non cliquable, jamais assignable)
//      - active=true,  held=true                 → DE RÉSERVE (🔒, cliquable pour forcer une résa)
//      - active=false                            → INACTIVE (pas affichée du tout)
//
//  B2. Table bloquée :
//      - Exclue de getFreeTables() (t.blocked = true)
//      - Jamais proposée en mode IA ni Manuel
//      - Affichée en rouge dans la Grille, sans action
//      - Peut avoir un blockedReason (ex: "Réparation")
//      → Implémenté : placementRules.ts → getFreeTables() exclut blocked
//      → Implémenté : Grille.tsx → rendu spécial bloqué
//
//  B3. Table de réserve (held) :
//      - INCLUSE dans getFreeTables() (on ne filtre pas held)
//      - L'IA peut la proposer si aucune autre table ne convient
//      - Le restaurateur peut cliquer dessus dans la Grille pour forcer une résa
//      - Affichée en ambre 🔒 quand libre
//      → Implémenté : placementRules.ts → getFreeTables() n'exclut PAS held
//      → Implémenté : Grille.tsx → rendu held + onClick → onPlaceResa
//
//  B4. Capacité :
//      - Chaque table a capMin (confort) et capMax (physique)
//      - On ne peut PAS réserver plus que capMax
//      - capMin est informatif (peut sous-remplir, ex: 2p sur table de 4)
//      → Implémenté : placementRules.ts → canMoveResa vérifie capMax
//      → Implémenté : Resas.tsx → CoverChips maxCap = table.capMax
//
//  B5. Priorité de remplissage (mode IA) :
//      - table.priority = ordre de préférence pour l'IA
//      - Plus petit numéro = rempli en premier
//      - Tri principal : capMax croissant (éviter gaspillage)
//      → Implémenté : placementRules.ts → iaPlacement() trie par capMax

// ─────────────────────────────────────────────────────────────────────
//  C. COMBOS (tables combinées)
// ─────────────────────────────────────────────────────────────────────
//
//  C1. Définition :
//      - Un combo = 2+ tables physiques combinées en une seule place
//      - combo.label = "T1+T2" (jointure des noms avec +)
//      - combo.tables = ['t1','t2'] (IDs des tables)
//      - combo.cap = capacité totale du combo
//      - Quand une résa est sur un combo, resa.tbl = combo.label ("T3+T4")
//
//  C2. Disponibilité :
//      - Un combo est disponible si TOUTES ses tables sont libres
//      - Si une seule table du combo est occupée, le combo est indisponible
//      → Implémenté : placementRules.ts → getFreeCombos()
//
//  C3. Matching exact :
//      - Pour savoir si une table T3 est dans un combo "T3+T4" :
//        JAMAIS de .includes() (substring match → "T1" matcherait "T10+T11")
//        TOUJOURS split('+') puis comparaison exacte de chaque partie
//      → Implémenté : Grille.tsx → tblMatchesTable()
//      → Doit être utilisé PARTOUT où l'on compare resa.tbl à table.n
//
//  C4. Affichage Grille :
//      - Table libre avec combos possibles : indicateur 🔗 + noms combos
//        en fin de ligne (ex: "🔗 T1+T2 8p · T3+T4 10p")
//      - Table occupée en combo : bande dorée à gauche (3px gradient gold)
//      - Menu déroulant combo : sur une ligne de table LIBRE ayant des combos,
//        cliquer sur 🔗 ouvre une liste des combos disponibles incluant
//        cette table → sélectionner un combo → ouvre modale pré-remplie
//      → Implémenté : Grille.tsx → TableRow (isInCombo, gold band, combo list)
//      → Implémenté : Grille.tsx → availableCombos + showComboMenu dropdown
//        → onPlaceCombo(combo.label) → navigate ?table=combo&mode=manuel
//
//  C5. Sélection combo (modale) :
//      - Mode Manuel : le sélecteur de table montre les tables individuelles
//        PUIS un séparateur, PUIS les combos disponibles (boutons dorés 🔗)
//      - Quand un combo est sélectionné, CoverChips.maxCap = combo.cap
//      - Warning si les couverts tiennent sur une seule table du combo
//        ("combo inutile ?") avec boutons pour choisir la table simple
//      → Implémenté : Resas.tsx → table selector + combo chips + warning
//
//  C6. Délier (uncombine) :
//      - Depuis la Grille, bouton ✂ sur une résa en combo
//      - Vérifie que la table individuelle a capMax >= couverts
//      - Si OK, resa.tbl passe du combo.label au table.n simple
//      - Les autres tables du combo deviennent libres automatiquement
//      → Implémenté : placementRules.ts → canUncombine()
//      → Implémenté : Grille.tsx → onUncombine → updateResa(id, { tbl: table.n })

// ─────────────────────────────────────────────────────────────────────
//  D. PLACEMENT
// ─────────────────────────────────────────────────────────────────────
//
//  D1. Mode IA (automatique) :
//      Le placement est 100% automatique, aucune interaction de l'utilisateur.
//      L'IA choisit la table ou le combo le plus optimal selon cet ordre :
//      1. Table préférée du client (tablePref) si dispo + capMax >= couverts
//      2. Plus petite table simple libre avec capMax >= couverts (best fit)
//      3. Plus petit combo libre avec cap >= couverts (best fit combo)
//      4. null → "À assigner" (aucune table ne convient)
//      Le restaurateur ne touche à rien — il remplit couverts/nom/heure et valide.
//      → Implémenté : placementRules.ts → iaPlacement()
//
//  D2. Mode Manuel — Table simple :
//      - DEPUIS LA GRILLE : le restaurateur clique sur une ligne de table libre
//        → ouvre la modale pré-remplie avec cette table
//        → couverts pré-remplis au capMax de la table (ex: T1=4p → 4 couverts)
//      - DEPUIS LA MODALE : le sélecteur de table (dropdown) liste les tables
//        libres du service. Le restaurateur en choisit une.
//      - La modale affiche UNIQUEMENT les tables libres
//      - CoverChips plafonné au capMax de la table sélectionnée
//      → Implémenté : Grille.tsx → onPlaceResa(tableId) → navigate avec ?table=
//      → Implémenté : Resas.tsx → useEffect searchParams → setCouverts(tb.capMax)
//      → Implémenté : Resas.tsx → CoverChips maxCap = table.capMax
//
//  D3. Mode Manuel — Combo :
//      - DEPUIS LA GRILLE : le restaurateur clique sur le menu déroulant (🔗)
//        à droite d'une ligne de table libre → affiche la liste des combos
//        disponibles incluant cette table → sélectionne un combo
//        → ouvre la modale pré-remplie avec ce combo
//        → couverts pré-remplis au cap du combo (ex: T1+T2=8p → 8 couverts)
//      - DEPUIS LA MODALE : sous le sélecteur de tables individuelles,
//        un séparateur puis les combos disponibles (boutons dorés 🔗)
//        Quand un combo est sélectionné, CoverChips.maxCap = combo.cap
//      - Warning si les couverts tiennent sur une seule table du combo
//        ("combo inutile ?") avec boutons pour choisir la table simple
//      → Implémenté : Resas.tsx → useEffect searchParams → setCouverts(combo.cap)
//      → Implémenté : Resas.tsx → combo chips dorés + warning
//      → Implémenté : Grille.tsx → showComboMenu dropdown + onPlaceCombo()
//
//  D4. Capacité maximale globale (mode IA) :
//      - Le CoverChips affiche le max global comme plafond :
//        maxCapFree = Max(plus grande table libre, plus grand combo libre)
//      - Cela permet au client de réserver jusqu'au plus grand espace dispo
//      - En mode IA, le CoverChips n'est PAS limité à une table spécifique
//        puisque l'IA trouvera la meilleure table/combo après le choix de couverts
//      - Guard-fou dans handleSubmit : si couverts > capMax → alert + return
//      → Implémenté : placementRules.ts → getMaxCapacity()
//      → Implémenté : Resas.tsx → CoverChips maxCap = maxCapFree en mode IA
//      → Implémenté : Resas.tsx → handleSubmit capacity guard
//
//  D5. Résumé des maxCap par mode :
//      ┌────────────────┬──────────────────────────┬──────────────────────────┐
//      │ Mode           │ maxCap CoverChips        │ couverts pré-remplis     │
//      ├────────────────┼──────────────────────────┼──────────────────────────┤
//      │ IA             │ maxCapFree (global)       │ 2 (par défaut)           │
//      │ Manuel table   │ table.capMax              │ table.capMax (depuis     │
//      │                │                           │ Grille) ou 2 (modale)    │
//      │ Manuel combo   │ combo.cap                 │ combo.cap (depuis        │
//      │                │                           │ Grille) ou 2 (modale)    │
//      └────────────────┴──────────────────────────┴──────────────────────────┘

// ─────────────────────────────────────────────────────────────────────
//  E. DÉPLACEMENT & ÉCHANGE
// ─────────────────────────────────────────────────────────────────────
//
//  E1. Déplacement simple (table occupée → table libre) :
//      - Cible libre + capMax >= couverts → OK
//      - resa.tbl = nouvelle table
//      → Implémenté : placementRules.ts → canMoveResa(target.type='table')
//      → Implémenté : Grille.tsx → handleMoveTarget (table libre)
//
//  E2. Déplacement vers combo (table → combo libre) :
//      - Toutes les tables du combo doivent être libres
//      - combo.cap >= couverts → OK
//      → Implémenté : placementRules.ts → canMoveResa(target.type='combo')
//
//  E3. Échange / Switch (table occupée ↔ table occupée) :
//      - resaA.c doit tenir sur tblB (capMax/combo.cap)
//      - resaB.c doit tenir sur tblA (capMax/combo.cap)
//      - Si OK : les deux resa.tbl s'échangent atomiquement
//      → Implémenté : placementRules.ts → canSwapResas()
//      → Implémenté : store/useAppStore.ts → swapTables(idA, idB)
//      → Implémenté : Grille.tsx → handleMoveTarget (table occupée)
//
//  E4. UI Move mode dans la Grille :
//      - Bouton ↔ sur chaque résa reserved/arrived → active le mode
//      - Bandeau bleu : "Déplacer {nom} ({Xp}) depuis {table}"
//      - Tables libres OK → bordure verte + "→ Déplacer ici"
//      - Tables occupées → bordure ambre + indicateur ↔ (swap)
//      - Tables trop petites / bloquées → grisées (opacity .35)
//      - Autres services → grisés (on reste dans le même service)
//      - Feedback : message vert ✅ ou rouge ❌ pendant 2.5s
//      → Implémenté : Grille.tsx → moveMode state + handleStartMove/handleMoveTarget
//
//  E5. Déplacement avec IA (move mode) :
//      - En mode déplacement, un bouton 🤖 "Placer avec IA" apparaît
//        dans l'en-tête de la colonne service (à la place du compteur)
//      - Cliquer dessus = l'IA choisit la meilleure table disponible
//        via iaPlacement() (même algo que création IA)
//      - Feedback : message vert ✅ ou rouge ❌ si aucune table dispo
//      - Bandeau move mode indique : "toucher une table ou 🤖 IA"
//      → Implémenté : Grille.tsx → handleMoveIA + bouton dans ServiceColumn header
//
//  E6. Déplacement inter-date / inter-service / inter-salle :
//      GRILLE move mode = MÊME SERVICE UNIQUEMENT (même date, même svc).
//      Les colonnes des autres services sont grisées (opacity .3).
//      Raison : la Grille montre le plan d'un service, pas tous les services.
//
//      Pour déplacer vers un autre service, une autre date ou une autre salle :
//      → Passer par la MODALE D'ÉDITION (clic sur la résa → modifier)
//      → La modale permet de changer date, service et table librement
//      → Les tables libres se recalculent pour la nouvelle date+svc
//      → Implémenté : Resas.tsx → activeDate + svcId modifiables en édition
//      → Implémenté : Grille.tsx → moveMode grise les colonnes hors-service

// ─────────────────────────────────────────────────────────────────────
//  F. SERVICES & DATE
// ─────────────────────────────────────────────────────────────────────
//
//  F1. Service :
//      - Chaque service a open/close/lastOrder/buffer
//      - maxCouverts = capacité max du service (tous les couverts confondus)
//      - jours[] = jours de la semaine où le service est actif
//      - active = true/false
//
//  F1b. Indicateur d'état du service :
//      - EN COURS (🟢 vert + glow) : now >= open ET now <= close
//      - PROCHAIN (🟠 orange + glow) : now < open ET now >= open - 60min
//      - TERMINÉ : now > close + 30min → chip grisé (opacity .5), label "Terminé"
//      - Affiché dans :
//        • Grille.tsx → en-tête ServiceColumn (point + background teinté)
//        • ViewToolbar.tsx → chips de service (point avant le label)
//      → Implémenté : Grille.tsx → isActive, isNext, isDone
//      → Implémenté : ViewToolbar.tsx → svcActive, svcNext, svcDone
//
//  F2. Filtrage par service :
//      - La Grille affiche une colonne par service actif
//      - Les résas sont filtrées par resa.svc === service.name.toLowerCase()
//      - Le sélecteur de service dans la modale ne montre que les actifs
//
//  F3. Date :
//      - activeDate = date courante affichée (YYYY-MM-DD)
//      - Toutes les résas sont filtrées par resa.date === activeDate
//      - Navigation ◀ ▶ dans le toolbar change activeDate

// ─────────────────────────────────────────────────────────────────────
//  G. CLIENT & PROFIL
// ─────────────────────────────────────────────────────────────────────
//
//  G1. Statuts client :
//      0 = Standard (☆)
//      1 = Habitué / Régulier (🔄)
//      2 = VIP (⭐)
//      3 = Surveillé / À surveiller (👁)
//      → Défini dans types/index.ts → Resa.statut
//      → Visuels dans design.ts → CLIENT_STATUTS
//
//  G2. Table préférée (détection auto) :
//      - Analyse l'historique des résas du client (par tel ou nom+prénom)
//      - Si le même client a réservé 2+ fois la même table → tablePref
//      - En mode IA, la tablePref est prioritaire si disponible
//      → Implémenté : placementRules.ts → detectTablePref()
//
//  G3. Allergies / Intolérances :
//      - Tags prédéfinis (Arachides, Gluten, Lactose, etc.)
//      - Stockés dans resa.note (préfixe ⚠️)
//      - resa.allergie = boolean flag pour affichage rapide
//      → Implémenté : Resas.tsx → allergieTags + flag allergie
//
//  G4. Infos affichées dans la Grille par résa :
//      - Heure (fontFamily mono)
//      - Nom + prénom (truncated)
//      - Icônes statut client (🔄 ⭐ 👁)
//      - Icône allergie (⚠️)
//      - Couverts (Xp)
//      - Bébé (👶X) / PMR (♿)
//      - Canal (📞 🚶 🌐 🔍 ✉️)
//      - Pill statut colorée
//      - Note (1ère ligne, 40 chars max)
//      → Implémenté : Grille.tsx → TableRow resa rendering

// ─────────────────────────────────────────────────────────────────────
//  H. NAVIGATION & MODALE
// ─────────────────────────────────────────────────────────────────────
//
//  H1. Grille — Modèle d'interaction (3 zones cliquables par ligne) :
//
//      ┌──────┬──────────────────────────────────┐
//      │ BADGE│  LIGNE (contenu)          [🔗▼] │
//      │  T1  │  12:30 Dupont 4p                 │
//      │  4p  │                                  │
//      │  ▼   │                                  │
//      └──────┴──────────────────────────────────┘
//
//      1) Clic LIGNE (zone contenu) :
//         - Table libre  → /reservations?new=1&table={n}&mode=manuel&from=grille
//           (ouvre modale pour créer une résa Manuel sur cette table)
//         - Table occupée → /reservations?edit={id}&from=grille
//           (ouvre modale pour éditer la résa existante)
//         - Mode déplacement → onMoveTarget si cible valide
//
//      2) Clic BADGE (numéro de table) :
//         - Table libre  : PAS de dropdown (le badge ne fait rien)
//         - Table occupée : dropdown d'actions contextuelles (portal)
//           en-tête résa (statut, nom, couverts, heure)
//           puis : ✏️ Modifier → ↔ Déplacer → ✂ Délier combo (si combo)
//           puis actions statut selon état (voir A3b)
//
//      3) Clic 🔗 (bouton combo, tables libres uniquement) :
//         → Dropdown liste des combos disponibles pour cette table
//         → Sélection → /reservations?new=1&table={comboLabel}&mode=manuel&from=grille
//
//      → Implémenté : Grille.tsx → TableRow (onClick ligne, badge dropdown, combo dropdown)
//
//  H1b. Grille → Modale (URLs) :
//      - Click table libre → /reservations?new=1&table={n}&mode=manuel&from=grille
//      - Click combo      → /reservations?new=1&table={comboLabel}&mode=manuel&from=grille
//      - Click résa       → /reservations?edit={id}&from=grille
//      - Le param 'from=grille' est stocké dans un useRef (returnToRef)
//        AVANT que setSearchParams ne le clear
//
//  H2. Retour Grille :
//      - closeModal() vérifie returnToRef.current === 'grille'
//      - Si oui → navigate('/grille')
//      - TOUS les points de fermeture utilisent closeModal() :
//        ✕ bouton, backdrop click, annuler, supprimer, submit
//      → Implémenté : Resas.tsx → returnToRef + closeModal()
//
//  H3. Bouton ➕ Réserver :
//      - Positionné dans la barre de service (right-aligned, Line 2)
//      - Ouvre la modale en mode création (pas d'editingId)
//      → Implémenté : ViewToolbar.tsx → onNewResa
//      → Masqué en mode déplacement (moveMode)

// ─────────────────────────────────────────────────────────────────────
//  I. CANAUX
// ─────────────────────────────────────────────────────────────────────
//
//  I1. Canaux possibles :
//      telephone | walkin | widget | google | email
//      → Défini dans types/index.ts (ResaCanal)
//      → Visuels dans design.ts (CANAUX)
//
//  I2. Canal 'widget' / 'google' :
//      - Résas créées depuis le site web ou Google Reserve
//      - Peuvent devenir 'waitlist' si plus de place
//      - Comptées séparément pour les quotas

// ─────────────────────────────────────────────────────────────────────
//  J. UI / IPAD
// ─────────────────────────────────────────────────────────────────────
//
//  J1. Touch targets :
//      - Minimum 40px (BTN = 40) pour tous les boutons d'action
//      - Bouton ✕ fermeture : 40×40
//      - Items dropdown : padding 10px 12px (zone touch ~44px)
//      - Badge table : 52px wide, full height (zone touch large)
//      - Bouton combo 🔗 : height 28px minimum
//      → Défini dans Grille.tsx → const BTN = 40
//
//  J2. Scroll iPad :
//      - WebkitOverflowScrolling: 'touch' sur les conteneurs scroll
//      - minHeight: 0 sur les flex children pour permettre overflow
//      - position: sticky sur les en-têtes de colonnes
//      → Implémenté : Grille.tsx → ServiceColumn
//
//  J3. Ligne compacte (UX Grille) :
//      - La ligne ne contient QUE l'essentiel : heure + nom + couverts + 🔗
//      - PAS de boutons inline — tout passe par les dropdowns
//      - 3 zones cliquables distinctes (voir H1 pour le détail) :
//        · Ligne = résa (libre→créer, occupée→éditer)
//        · Badge = dropdown actions contextuelles
//        · 🔗 = dropdown combos disponibles
//      - Un seul dropdown ouvert à la fois par colonne service
//        (expandedId dans ServiceColumn)
//      - Les dropdowns sont positionnés en absolute sous la ligne (zIndex 20)
//      → Implémenté : Grille.tsx → TableRow (overflow: visible, position: relative)

// ─────────────────────────────────────────────────────────────────────
//  K. RÈGLES NON ENCORE IMPLÉMENTÉES (TODO)
// ─────────────────────────────────────────────────────────────────────
//
//  K1. Widget reservation limits :
//      - Tables bloquées/held exclues des quotas widget
//      - Au-dessus d'un seuil (options.groupe_seuil), la résa widget
//        devient "groupe" avec validation manuelle requise
//      - Champ pendingValidation sur Resa
//
//  K2. Dispersion automatique :
//      - Mode IA répartit les résas sur les créneaux
//      - options.dispersion_interval = minutes entre slots
//      - options.dispersion_max_per_slot = max résas par créneau
//
//  K3. Annulation / modification client :
//      - options.annulation_h = heures avant le service
//      - Après ce délai, annulation bloquée côté widget
//
//  K4. Notifications :
//      - options.notif_new_resa = notifier le resto
//      - options.auto_remind_24h = rappel client 24h avant
//      - options.auto_noshow_flag = marquer noshow automatiquement
//
//  K5. Fermetures :
//      - Types : restaurant, salle, service, vacances, ferie, exception
//      - Filtrage par date/période, salle, service
//      - Bloque les résas sur les périodes/salles/services concernés

// ══════════════════════════════════════════════════════════════════════
//  FIN DES RÈGLES — Ce fichier ne contient PAS de code exécutable.
//  C'est un fichier de documentation TypeScript qui sert de référence.
// ══════════════════════════════════════════════════════════════════════
export {}
