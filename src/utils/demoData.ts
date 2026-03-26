// ══════════════════════════════════════════════════
//  R3STO — Données démo : "Le Comptoir du Lac"
//  Restaurant suisse 120 couverts, 3 salles,
//  services midi/soir + double service ven/sam soir.
//  Plan réaliste — zones distinctes, entrée dégagée,
//  objets de salle bien positionnés.
//  Canvas : 120 × 80 par salle.
// ══════════════════════════════════════════════════

import type { Resa, Table, Combo, Service, Salle, Resto, RoomItem } from '../types'

function today(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function dayOfWeek(): number { return new Date().getDay() } // 0=dim ... 5=ven, 6=sam

export function loadDemoFallback() {
  const t = today()
  const dow = dayOfWeek()
  const isWeekend = dow === 5 || dow === 6 // ven ou sam

  // ══════════════════════════════════════════════════
  //  SALLES — 3 espaces distincts
  // ══════════════════════════════════════════════════

  const salles: Salle[] = [
    { id:'sa1', name:'Salle principale', type:'intérieure', exterior:false, active:true, openByDefault:true, color:'#4480d8', priority:1 },
    { id:'sa2', name:'Terrasse',         type:'extérieure', exterior:true,  active:true, openByDefault:true, color:'#38b090', priority:2 },
    { id:'sa3', name:'Salon privé',      type:'privée',     exterior:false, active:true, openByDefault:false, color:'#7c3aed', priority:3 },
  ]

  // ══════════════════════════════════════════════════
  //  SERVICES — Midi + Soir (+ 2e service ven/sam)
  // ══════════════════════════════════════════════════

  const services: Service[] = [
    { id:'sv1', name:'Midi',      icon:'☀️', open:'12:00', close:'14:30', lastOrder:'13:45', buffer:15, bookingCutoffMins:0, active:true, color:'#4480d8', jours:[1,2,3,4,5,6,0], maxCouverts:100, maxParService:0 },
    { id:'sv2', name:'Soir',      icon:'🌙', open:'19:00', close:'22:30', lastOrder:'21:30', buffer:15, bookingCutoffMins:0, active:true, color:'#7c3aed', jours:[1,2,3,4,5,6,0], maxCouverts:100, maxParService:0 },
    // Double service vendredi & samedi soir
    { id:'sv3', name:'Soir 1er',  icon:'🌙', open:'18:30', close:'20:30', lastOrder:'19:45', buffer:15, bookingCutoffMins:0, active:isWeekend, color:'#e8a530', jours:[5,6], maxCouverts:100, maxParService:0 },
    { id:'sv4', name:'Soir 2e',   icon:'🌟', open:'21:00', close:'23:30', lastOrder:'22:30', buffer:15, bookingCutoffMins:0, active:isWeekend, color:'#dc5050', jours:[5,6], maxCouverts:100, maxParService:0 },
  ]

  // ══════════════════════════════════════════════════════════════
  //  TABLES — Plan réaliste · Canvas M : 120 × 80
  //
  //  SALLE PRINCIPALE — layout en zones :
  //  ┌─────────────────────────────────────────────────────────┐
  //  │ [fenêtre vue lac]      [baie vitrée]       [fenêtre]    │
  //  │ T1○ T2○  T5□ T6□  T7□ T8□ T9□    T17◊VIP  🔥cheminée │ zone fenêtre
  //  │                                                         │
  //  │ T3○ T4○  T10▬ T11▬  T12▬          T18○hte   ●col      │ zone centre
  //  │  🌿  ●col                                              │
  //  │          T14▬▬   T15▬▬        T23✕blocked              │ zone grandes
  //  │                                                         │
  //  │ 🚻WC 🧥  T19□T20□T21□  ▬▬T22(bar)▬▬  T24○held 💰cais│ zone bar/fond
  //  │  🌿                                                     │
  //  │ 🚪entrée          [espace libre]            🚪cuisine  │
  //  └─────────────────────────────────────────────────────────┘
  // ══════════════════════════════════════════════════════════════

  const tables: Table[] = [
    // ═══ SALLE PRINCIPALE ═══

    // ── Zone fenêtre (haut) — tables vue lac ──
    { id:'t1',  n:'T1',  salle:'Salle principale', shape:'round_sm', capMin:1, capMax:2,  x:6,   y:6,  w:7,  h:7,  active:true, priority:1,  blocked:false, held:false },
    { id:'t2',  n:'T2',  salle:'Salle principale', shape:'round_sm', capMin:1, capMax:2,  x:6,  y:17,  w:7,  h:7,  active:true, priority:2,  blocked:false, held:false },
    { id:'t5',  n:'T5',  salle:'Salle principale', shape:'square',   capMin:2, capMax:4,  x:20,  y:5,  w:9,  h:9,  active:true, priority:5,  blocked:false, held:false },
    { id:'t6',  n:'T6',  salle:'Salle principale', shape:'square',   capMin:2, capMax:4,  x:32,  y:5,  w:9,  h:9,  active:true, priority:6,  blocked:false, held:false },
    { id:'t7',  n:'T7',  salle:'Salle principale', shape:'square',   capMin:2, capMax:4,  x:46,  y:5,  w:9,  h:9,  active:true, priority:7,  blocked:false, held:false },
    { id:'t8',  n:'T8',  salle:'Salle principale', shape:'square',   capMin:2, capMax:4,  x:58,  y:5,  w:9,  h:9,  active:true, priority:8,  blocked:false, held:false },
    { id:'t9',  n:'T9',  salle:'Salle principale', shape:'square',   capMin:2, capMax:4,  x:70,  y:5,  w:9,  h:9,  active:true, priority:9,  blocked:false, held:false },
    { id:'t17', n:'T17', salle:'Salle principale', shape:'oval',     capMin:4, capMax:6,  x:86,  y:4,  w:14, h:10, active:true, priority:17, blocked:false, held:false },

    // ── Zone centre — rectangles (3 au lieu de 4, plus aéré) ──
    { id:'t3',  n:'T3',  salle:'Salle principale', shape:'round',    capMin:2, capMax:4,  x:6,  y:30,  w:9,  h:9,  active:true, priority:3,  blocked:false, held:false },
    { id:'t4',  n:'T4',  salle:'Salle principale', shape:'round',    capMin:2, capMax:4,  x:6,  y:44,  w:9,  h:9,  active:true, priority:4,  blocked:false, held:false },
    { id:'t10', n:'T10', salle:'Salle principale', shape:'rect',     capMin:2, capMax:4,  x:24, y:28,  w:12, h:9,  active:true, priority:10, blocked:false, held:false },
    { id:'t11', n:'T11', salle:'Salle principale', shape:'rect',     capMin:2, capMax:4,  x:42, y:28,  w:12, h:9,  active:true, priority:11, blocked:false, held:false },
    { id:'t12', n:'T12', salle:'Salle principale', shape:'rect',     capMin:2, capMax:4,  x:60, y:28,  w:12, h:9,  active:true, priority:12, blocked:false, held:false },
    { id:'t18', n:'T18', salle:'Salle principale', shape:'round',    capMin:3, capMax:5,  x:82, y:28,  w:9,  h:9,  active:true, priority:18, blocked:false, held:false, tableH:'haute' },

    // ── Zone grandes tables (y ~46-56) — 2 au lieu de 3, plus spacieux ──
    { id:'t14', n:'T14', salle:'Salle principale', shape:'rect_lg',  capMin:4, capMax:8,  x:24, y:46,  w:16, h:9,  active:true, priority:14, blocked:false, held:false },
    { id:'t15', n:'T15', salle:'Salle principale', shape:'rect_lg',  capMin:4, capMax:8,  x:48, y:46,  w:16, h:9,  active:true, priority:15, blocked:false, held:false },
    { id:'t23', n:'T23', salle:'Salle principale', shape:'rect',     capMin:2, capMax:4,  x:74, y:46,  w:11, h:9,  active:true, priority:23, blocked:true,  held:false, blockedReason:'Pied cassé' },

    // ── Zone bar/fond (y ~58-68) — à droite, loin de l'entrée ──
    { id:'t19', n:'T19', salle:'Salle principale', shape:'square_sm',capMin:1, capMax:2,  x:44, y:60,  w:7,  h:7,  active:true, priority:19, blocked:false, held:false, orient:'H' },
    { id:'t20', n:'T20', salle:'Salle principale', shape:'square_sm',capMin:1, capMax:2,  x:54, y:60,  w:7,  h:7,  active:true, priority:20, blocked:false, held:false, orient:'H' },
    { id:'t21', n:'T21', salle:'Salle principale', shape:'square_sm',capMin:1, capMax:2,  x:64, y:60,  w:7,  h:7,  active:true, priority:21, blocked:false, held:false, orient:'H' },
    { id:'t22', n:'T22', salle:'Salle principale', shape:'bar',      capMin:2, capMax:6,  x:76, y:59,  w:20, h:7,  active:true, priority:22, blocked:false, held:false },
    { id:'t24', n:'T24', salle:'Salle principale', shape:'round',    capMin:2, capMax:4,  x:100,y:59,  w:9,  h:9,  active:true, priority:24, blocked:false, held:true },

    // ═══ TERRASSE ═══ (plan étalé, parasols, verdure)

    // Rangée 1 — rondes sous parasols
    { id:'t30', n:'T30', salle:'Terrasse', shape:'round',    capMin:2, capMax:4,  x:10,  y:10, w:9,  h:9,  active:true, priority:30, blocked:false, held:false },
    { id:'t31', n:'T31', salle:'Terrasse', shape:'round',    capMin:2, capMax:4,  x:26,  y:10, w:9,  h:9,  active:true, priority:31, blocked:false, held:false },
    { id:'t32', n:'T32', salle:'Terrasse', shape:'round',    capMin:2, capMax:4,  x:42,  y:10, w:9,  h:9,  active:true, priority:32, blocked:false, held:false },
    { id:'t33', n:'T33', salle:'Terrasse', shape:'round',    capMin:2, capMax:4,  x:58,  y:10, w:9,  h:9,  active:true, priority:33, blocked:false, held:false },

    // Rangée 2 — rectangles
    { id:'t34', n:'T34', salle:'Terrasse', shape:'rect',     capMin:2, capMax:4,  x:10,  y:30, w:12, h:9,  active:true, priority:34, blocked:false, held:false },
    { id:'t35', n:'T35', salle:'Terrasse', shape:'rect',     capMin:2, capMax:4,  x:28,  y:30, w:12, h:9,  active:true, priority:35, blocked:false, held:false },
    { id:'t36', n:'T36', salle:'Terrasse', shape:'rect',     capMin:2, capMax:4,  x:46,  y:30, w:12, h:9,  active:true, priority:36, blocked:false, held:false },

    // Rangée 3 — grande + ovale
    { id:'t37', n:'T37', salle:'Terrasse', shape:'rect_lg',  capMin:4, capMax:8,  x:10,  y:50, w:16, h:10, active:true, priority:37, blocked:false, held:false },
    { id:'t38', n:'T38', salle:'Terrasse', shape:'oval',     capMin:4, capMax:6,  x:34,  y:50, w:14, h:10, active:true, priority:38, blocked:false, held:false },

    // Tables hautes côté droit
    { id:'t39', n:'T39', salle:'Terrasse', shape:'round_sm', capMin:1, capMax:2,  x:66,  y:30, w:7,  h:7,  active:true, priority:39, blocked:false, held:false, tableH:'haute' },
    { id:'t40', n:'T40', salle:'Terrasse', shape:'round_sm', capMin:1, capMax:2,  x:66,  y:44, w:7,  h:7,  active:true, priority:40, blocked:false, held:false, tableH:'haute' },

    // ═══ SALON PRIVÉ ═══ (espace fermé, tables spacieuses)

    { id:'t50', n:'P1',  salle:'Salon privé', shape:'rect_lg',  capMin:6, capMax:12, x:12,  y:12, w:24, h:12, active:true, priority:50, blocked:false, held:false },
    { id:'t51', n:'P2',  salle:'Salon privé', shape:'rect_lg',  capMin:4, capMax:8,  x:46,  y:12, w:18, h:12, active:true, priority:51, blocked:false, held:false },
    { id:'t52', n:'P3',  salle:'Salon privé', shape:'round',    capMin:2, capMax:4,  x:16,  y:40, w:10, h:10, active:true, priority:52, blocked:false, held:false },
    { id:'t53', n:'P4',  salle:'Salon privé', shape:'round',    capMin:2, capMax:4,  x:36,  y:40, w:10, h:10, active:true, priority:53, blocked:false, held:false },
  ]

  // ══════════════════════════════════════════════════
  //  COMBOS — tailles raisonnables (max 3 tables)
  // ══════════════════════════════════════════════════

  // Helper pour construire origPositions et origSpan à partir des tables
  const tblMap = Object.fromEntries(tables.map(t => [t.id, t]))
  function mkCombo(id: string, label: string, tids: string[], cap: number, salle: string, orient: 'H'|'V' = 'H', align: 'L'|'C'|'R' = 'L'): Combo {
    const ctbls = tids.map(tid => tblMap[tid]).filter(Boolean)
    const origPositions: Record<string, { x: number; y: number }> = {}
    ctbls.forEach(t => { origPositions[t.id] = { x: t.x, y: t.y } })
    const origSpan = {
      x1: Math.min(...ctbls.map(t => t.x)),
      x2: Math.max(...ctbls.map(t => t.x + t.w)),
      y1: Math.min(...ctbls.map(t => t.y)),
      y2: Math.max(...ctbls.map(t => t.y + t.h)),
    }
    return { id, label, tables: tids, cap, salle, orient, align, origSpan, origPositions }
  }

  const combos: Combo[] = [
    // Salle principale
    mkCombo('c1', 'T5+T6',       ['t5','t6'],              8,  'Salle principale'),
    mkCombo('c2', 'T7+T8+T9',    ['t7','t8','t9'],         12, 'Salle principale'),
    mkCombo('c3', 'T10+T11',     ['t10','t11'],            8,  'Salle principale'),
    mkCombo('c4', 'T14+T15',     ['t14','t15'],            16, 'Salle principale'),
    mkCombo('c5', 'T19+T20+T21', ['t19','t20','t21'],      6,  'Salle principale'),
    // Terrasse
    mkCombo('c6', 'T30+T31+T32', ['t30','t31','t32'],      12, 'Terrasse'),
    mkCombo('c7', 'T34+T35',     ['t34','t35'],            8,  'Terrasse'),
    // Salon privé
    mkCombo('c8', 'P1+P2',       ['t50','t51'],            20, 'Salon privé'),
    mkCombo('c9', 'P3+P4',       ['t52','t53'],            8,  'Salon privé'),
  ]

  // ══════════════════════════════════════════════════════════════
  //  OBJETS DE SALLE — positionnés SANS chevaucher les tables
  //  Murs autour du périmètre, entrée dégagée en bas-gauche,
  //  objets contre les murs ou dans les espaces vides.
  // ══════════════════════════════════════════════════════════════

  const roomItems: RoomItem[] = [
    // ── SALLE PRINCIPALE — structure ──

    // Murs périmètre
    { id:'ri1',  sym:'▬',  lbl:'Mur haut',        shape:'mur',         x:0,   y:0,   w:115, h:2,  salle:'Salle principale' },
    { id:'ri2',  sym:'▬',  lbl:'Mur bas',         shape:'mur',         x:0,   y:74,  w:115, h:2,  salle:'Salle principale' },
    { id:'ri3',  sym:'▬',  lbl:'Mur gauche',      shape:'mur',         x:0,   y:0,   w:2,   h:76, salle:'Salle principale' },
    { id:'ri4',  sym:'▬',  lbl:'Mur droit',       shape:'mur',         x:113, y:0,   w:2,   h:76, salle:'Salle principale' },

    // Fenêtres sur le mur haut (vue lac)
    { id:'ri5',  sym:'▭',  lbl:'Fenêtre vue lac',  shape:'fenetre',    x:18,  y:0,   w:22,  h:2,  salle:'Salle principale' },
    { id:'ri6',  sym:'▭',  lbl:'Baie vitrée',      shape:'baie_vitree',x:44,  y:0,   w:34,  h:2,  salle:'Salle principale' },
    { id:'ri7',  sym:'▭',  lbl:'Fenêtre VIP',      shape:'fenetre',    x:84,  y:0,   w:16,  h:2,  salle:'Salle principale' },

    // Portes
    { id:'ri8',  sym:'🚪', lbl:'Entrée',           shape:'porte_lg',   x:5,   y:74,  w:14,  h:4,  salle:'Salle principale' },
    { id:'ri9',  sym:'🚪', lbl:'Cuisine',          shape:'porte',      x:111, y:36,  w:4,   h:8,  salle:'Salle principale' },

    // Colonnes structurelles (dans les espaces entre zones)
    { id:'ri10', sym:'●',  lbl:'Colonne',          shape:'colonne',    x:18,  y:36,  w:3,   h:3,  salle:'Salle principale' },
    { id:'ri11', sym:'●',  lbl:'Colonne',          shape:'colonne',    x:82,  y:36,  w:3,   h:3,  salle:'Salle principale' },

    // Cheminée contre mur droit (entre T17 et T18)
    { id:'ri12', sym:'🔥', lbl:'Cheminée',         shape:'cheminee',   x:101, y:5,   w:11,  h:10, salle:'Salle principale' },

    // Zone accueil bas-gauche — bien espacés, AUCUNE TABLE dans cette zone
    { id:'ri13', sym:'🚻', lbl:'WC',               shape:'wc',         x:4,   y:56,  w:9,   h:10, salle:'Salle principale' },
    { id:'ri14', sym:'🧥', lbl:'Vestiaire',        shape:'vestiaire',  x:18,  y:58,  w:9,   h:7,  salle:'Salle principale' },
    { id:'ri15', sym:'💰', lbl:'Caisse',           shape:'caisse',     x:30,  y:70,  w:10,  h:5,  salle:'Salle principale' },

    // Déco — plantes dans les espaces libres (pas contre les tables)
    { id:'ri16', sym:'🌿', lbl:'Plante entrée',    shape:'plante',     x:4,   y:69,  w:5,   h:5,  salle:'Salle principale' },
    { id:'ri17', sym:'🌿', lbl:'Plante colonne',   shape:'plante',     x:18,  y:40,  w:4,   h:4,  salle:'Salle principale' },
    { id:'ri18', sym:'🌿', lbl:'Plante fenêtre',   shape:'plante',     x:4,   y:4,   w:4,   h:4,  salle:'Salle principale' },

    // ── TERRASSE — extérieur ouvert ──

    // Garde-corps (3 côtés — ouvert côté restaurant à gauche)
    { id:'ri20', sym:'━',  lbl:'Garde-corps haut',  shape:'garde_corps', x:0,  y:0,  w:80, h:2,  salle:'Terrasse' },
    { id:'ri21', sym:'━',  lbl:'Garde-corps bas',   shape:'garde_corps', x:0,  y:66, w:80, h:2,  salle:'Terrasse' },
    { id:'ri22', sym:'━',  lbl:'Garde-corps droit', shape:'garde_corps', x:78, y:0,  w:2,  h:68, salle:'Terrasse' },

    // Parasols au-dessus des tables rondes (centrés, décalés vers le haut)
    { id:'ri23', sym:'⛱',  lbl:'Parasol',          shape:'parasol',    x:11,  y:3,  w:7,  h:7,  salle:'Terrasse' },
    { id:'ri24', sym:'⛱',  lbl:'Parasol',          shape:'parasol',    x:27,  y:3,  w:7,  h:7,  salle:'Terrasse' },
    { id:'ri25', sym:'⛱',  lbl:'Parasol',          shape:'parasol',    x:43,  y:3,  w:7,  h:7,  salle:'Terrasse' },
    { id:'ri26', sym:'⛱',  lbl:'Parasol',          shape:'parasol',    x:59,  y:3,  w:7,  h:7,  salle:'Terrasse' },

    // Végétation extérieure
    { id:'ri27', sym:'🌿', lbl:'Plante',           shape:'plante',     x:72, y:10,  w:5,  h:5,  salle:'Terrasse' },
    { id:'ri28', sym:'🌿', lbl:'Plante',           shape:'plante',     x:72, y:26,  w:5,  h:5,  salle:'Terrasse' },
    { id:'ri29', sym:'🪴', lbl:'Jardinière',       shape:'jardiniere', x:0,  y:24,  w:4,  h:16, salle:'Terrasse' },
    { id:'ri30', sym:'🌳', lbl:'Arbre',            shape:'arbre',      x:64, y:52,  w:10, h:10, salle:'Terrasse' },
    { id:'ri31', sym:'🌳', lbl:'Arbre',            shape:'arbre',      x:56, y:58,  w:8,  h:8,  salle:'Terrasse' },

    // ── SALON PRIVÉ — espace clos et intimiste ──

    // Cloisons (4 côtés fermés)
    { id:'ri40', sym:'▬',  lbl:'Cloison haut',     shape:'cloison',    x:0,  y:0,   w:80, h:2,  salle:'Salon privé' },
    { id:'ri41', sym:'▬',  lbl:'Cloison bas',      shape:'cloison',    x:0,  y:58,  w:80, h:2,  salle:'Salon privé' },
    { id:'ri42', sym:'▬',  lbl:'Cloison gauche',   shape:'cloison',    x:0,  y:0,   w:2,  h:60, salle:'Salon privé' },
    { id:'ri43', sym:'▬',  lbl:'Cloison droite',   shape:'cloison',    x:78, y:0,   w:2,  h:60, salle:'Salon privé' },

    // Porte d'accès
    { id:'ri44', sym:'🚪', lbl:'Porte salon',      shape:'porte',      x:0,  y:26,  w:4,  h:8,  salle:'Salon privé' },

    // Équipements
    { id:'ri45', sym:'🎹', lbl:'Piano',            shape:'piano',      x:58, y:38,  w:14, h:10, salle:'Salon privé' },
    { id:'ri46', sym:'🍸', lbl:'Mini bar',         shape:'bar_el',     x:58, y:8,   w:14, h:8,  salle:'Salon privé' },

    // Déco
    { id:'ri47', sym:'🌿', lbl:'Plante',           shape:'plante',     x:72, y:26,  w:5,  h:5,  salle:'Salon privé' },
    { id:'ri48', sym:'🌿', lbl:'Plante',           shape:'plante',     x:4,  y:50,  w:5,  h:5,  salle:'Salon privé' },
  ]

  // ══════════════════════════════════════════════════
  //  RÉSERVATIONS — couvrant tous les cas métier
  // ══════════════════════════════════════════════════

  const resas: Resa[] = [
    // ── MIDI — Salle principale ──
    { id:'r1',  n:'Martin Jean',     nom:'Martin',    prenom:'Jean',     c:2,  tbl:'T1',      t:'12:00', svc:'midi', s:'arrived',  date:t, createdAt:Date.now(), statut:1, mode:'ia',     canal:'telephone', prisPar:'Admin', note:'', tel:'+41 79 123 45 67', email:'', bebe:0, pmr:0, allergie:false },
    { id:'r2',  n:'Dupont Marie',    nom:'Dupont',    prenom:'Marie',    c:2,  tbl:'T2',      t:'12:15', svc:'midi', s:'arrived',  date:t, createdAt:Date.now(), statut:0, mode:'ia',     canal:'telephone', prisPar:'', note:'', tel:'+41 78 234 56 78', email:'', bebe:0, pmr:0, allergie:false },
    { id:'r3',  n:'Schmid Anna',     nom:'Schmid',    prenom:'Anna',     c:4,  tbl:'T3',      t:'12:00', svc:'midi', s:'reserved', date:t, createdAt:Date.now(), statut:2, mode:'ia',     canal:'widget',    prisPar:'', note:'Anniversaire — gâteau commandé', tel:'+41 76 345 67 89', email:'anna@mail.ch', bebe:0, pmr:0, allergie:true },
    { id:'r4',  n:'Favre Isabelle',  nom:'Favre',     prenom:'Isabelle', c:4,  tbl:'T4',      t:'12:30', svc:'midi', s:'reserved', date:t, createdAt:Date.now(), statut:0, mode:'ia',     canal:'telephone', prisPar:'', note:'', tel:'', email:'', bebe:0, pmr:0, allergie:false },
    { id:'r5',  n:'Rochat Pierre',   nom:'Rochat',    prenom:'Pierre',   c:4,  tbl:'T10',     t:'12:45', svc:'midi', s:'reserved', date:t, createdAt:Date.now(), statut:0, mode:'manuel', canal:'telephone', prisPar:'', note:'', tel:'', email:'', bebe:0, pmr:0, allergie:false },
    { id:'r6',  n:'Blanc Julie',     nom:'Blanc',     prenom:'Julie',    c:4,  tbl:'T11',     t:'13:00', svc:'midi', s:'reserved', date:t, createdAt:Date.now(), statut:0, mode:'ia',     canal:'walkin',    prisPar:'', note:'', tel:'', email:'', bebe:0, pmr:0, allergie:false },

    // ── MIDI — Combo 2 tables ──
    { id:'r7',  n:'Weber Lisa',      nom:'Weber',     prenom:'Lisa',     c:7,  tbl:'T5+T6',   t:'12:15', svc:'midi', s:'reserved', date:t, createdAt:Date.now(), statut:0, mode:'manuel', canal:'telephone', prisPar:'Admin', note:'Repas famille — combo demandé', tel:'+41 79 222 33 44', email:'', bebe:1, pmr:0, allergie:false },

    // ── MIDI — Combo 3 tables ──
    { id:'r8',  n:'Müller Klaus',    nom:'Müller',    prenom:'Klaus',    c:10, tbl:'T7+T8+T9', t:'12:00', svc:'midi', s:'arrived',  date:t, createdAt:Date.now(), statut:1, mode:'ia',     canal:'telephone', prisPar:'', note:'Déjeuner d\'affaires', tel:'+41 79 456 78 90', email:'', bebe:0, pmr:0, allergie:false },

    // ── MIDI — Grande table ──
    { id:'r9',  n:'Bernard Claire',  nom:'Bernard',   prenom:'Claire',   c:6,  tbl:'T14',     t:'12:30', svc:'midi', s:'reserved', date:t, createdAt:Date.now(), statut:0, mode:'ia',     canal:'telephone', prisPar:'', note:'', tel:'+41 76 111 22 33', email:'', bebe:0, pmr:0, allergie:false },

    // ── MIDI — Bar ──
    { id:'r10', n:'Costa Miguel',    nom:'Costa',     prenom:'Miguel',   c:2,  tbl:'T22',     t:'12:00', svc:'midi', s:'arrived',  date:t, createdAt:Date.now(), statut:0, mode:'ia',     canal:'walkin',    prisPar:'', note:'', tel:'', email:'', bebe:0, pmr:0, allergie:false },

    // ── MIDI — Table haute ──
    { id:'r11', n:'Keller Thomas',   nom:'Keller',    prenom:'Thomas',   c:3,  tbl:'T18',     t:'13:00', svc:'midi', s:'reserved', date:t, createdAt:Date.now(), statut:0, mode:'ia',     canal:'telephone', prisPar:'', note:'', tel:'', email:'', bebe:0, pmr:0, allergie:false },

    // ── MIDI — Ovale VIP ──
    { id:'r12', n:'Perrin Sophie',   nom:'Perrin',    prenom:'Sophie',   c:5,  tbl:'T17',     t:'12:30', svc:'midi', s:'reserved', date:t, createdAt:Date.now(), statut:2, mode:'ia',     canal:'email',     prisPar:'', note:'VIP fidèle — 47e visite', tel:'+41 79 678 90 12', email:'sophie@perrin.ch', bebe:0, pmr:0, allergie:false },

    // ── MIDI — No-show ──
    { id:'r13', n:'Zürcher Hans',    nom:'Zürcher',   prenom:'Hans',     c:2,  tbl:'T19',     t:'12:00', svc:'midi', s:'noshow',   date:t, createdAt:Date.now(), statut:0, mode:'ia',     canal:'widget',    prisPar:'', note:'', tel:'+41 78 111 00 99', email:'', bebe:0, pmr:0, allergie:false },

    // ── MIDI — Terrasse ──
    { id:'r14', n:'Dubois Marc',     nom:'Dubois',    prenom:'Marc',     c:4,  tbl:'T30',     t:'12:00', svc:'midi', s:'arrived',  date:t, createdAt:Date.now(), statut:0, mode:'ia',     canal:'telephone', prisPar:'', note:'', tel:'', email:'', bebe:0, pmr:0, allergie:false },
    { id:'r15', n:'Roth Michel',     nom:'Roth',      prenom:'Michel',   c:4,  tbl:'T31',     t:'12:15', svc:'midi', s:'reserved', date:t, createdAt:Date.now(), statut:0, mode:'ia',     canal:'telephone', prisPar:'', note:'', tel:'', email:'', bebe:1, pmr:0, allergie:false },
    { id:'r16', n:'Ammann Eva',      nom:'Ammann',    prenom:'Eva',      c:3,  tbl:'T34',     t:'12:30', svc:'midi', s:'reserved', date:t, createdAt:Date.now(), statut:0, mode:'ia',     canal:'telephone', prisPar:'', note:'Chien', tel:'', email:'', bebe:0, pmr:0, allergie:false },

    // ── MIDI — Salon privé ──
    { id:'r17', n:'Entreprise SA',   nom:'Entreprise',prenom:'SA',       c:10, tbl:'P1',      t:'12:00', svc:'midi', s:'reserved', date:t, createdAt:Date.now(), statut:1, mode:'manuel', canal:'email',     prisPar:'Manager', note:'Séminaire — menu fixe commandé', tel:'+41 21 555 66 77', email:'contact@entreprise.ch', bebe:0, pmr:0, allergie:false },

    // ── SOIR — Tables individuelles ──
    { id:'r20', n:'Leroy Alice',     nom:'Leroy',     prenom:'Alice',    c:2,  tbl:'T1',      t:'19:00', svc:'soir', s:'reserved', date:t, createdAt:Date.now(), statut:0, mode:'ia',     canal:'telephone', prisPar:'', note:'', tel:'+41 79 555 66 77', email:'', bebe:0, pmr:0, allergie:false },
    { id:'r21', n:'Girard Paul',     nom:'Girard',    prenom:'Paul',     c:2,  tbl:'T2',      t:'19:00', svc:'soir', s:'reserved', date:t, createdAt:Date.now(), statut:0, mode:'ia',     canal:'telephone', prisPar:'', note:'', tel:'', email:'', bebe:0, pmr:0, allergie:false },
    { id:'r22', n:'Morel Sandrine',  nom:'Morel',     prenom:'Sandrine', c:4,  tbl:'T3',      t:'19:30', svc:'soir', s:'reserved', date:t, createdAt:Date.now(), statut:0, mode:'ia',     canal:'widget',    prisPar:'', note:'', tel:'+41 76 444 55 66', email:'sandrine@morel.ch', bebe:0, pmr:0, allergie:true },
    { id:'r23', n:'Nguyen Thi',      nom:'Nguyen',    prenom:'Thi',      c:4,  tbl:'T4',      t:'19:30', svc:'soir', s:'reserved', date:t, createdAt:Date.now(), statut:0, mode:'ia',     canal:'telephone', prisPar:'', note:'', tel:'', email:'', bebe:0, pmr:0, allergie:false },

    // ── SOIR — Combo 2 tables ──
    { id:'r24', n:'Fischer Daniel',  nom:'Fischer',   prenom:'Daniel',   c:7,  tbl:'T5+T6',   t:'19:00', svc:'soir', s:'reserved', date:t, createdAt:Date.now(), statut:1, mode:'ia',     canal:'telephone', prisPar:'', note:'Client régulier — même table SVP', tel:'+41 79 888 77 66', email:'', bebe:0, pmr:0, allergie:false },

    // ── SOIR — Combo 3 tables ──
    { id:'r25', n:'Hoffmann Georg',  nom:'Hoffmann',  prenom:'Georg',    c:11, tbl:'T7+T8+T9', t:'19:30', svc:'soir', s:'reserved', date:t, createdAt:Date.now(), statut:0, mode:'manuel', canal:'telephone', prisPar:'Manager', note:'Anniversaire 50 ans — champagne', tel:'+41 78 333 22 11', email:'', bebe:0, pmr:0, allergie:false },

    // ── SOIR — VIP ovale ──
    { id:'r26', n:'De Watteville',   nom:'De Watteville', prenom:'François', c:6, tbl:'T17', t:'20:00', svc:'soir', s:'reserved', date:t, createdAt:Date.now(), statut:2, mode:'ia',   canal:'telephone', prisPar:'', note:'VIP — carte privée, vin réservé', tel:'+41 79 999 00 11', email:'f.dewatteville@private.ch', bebe:0, pmr:0, allergie:false },

    // ── SOIR — Grande table + combo ──
    { id:'r27', n:'Bauer Christine', nom:'Bauer',     prenom:'Christine', c:14, tbl:'T14+T15', t:'19:00', svc:'soir', s:'reserved', date:t, createdAt:Date.now(), statut:0, mode:'ia',     canal:'telephone', prisPar:'', note:'Dîner de famille élargie', tel:'', email:'', bebe:2, pmr:0, allergie:false },
    { id:'r28', n:'Steiner Marco',   nom:'Steiner',   prenom:'Marco',    c:8,  tbl:'T15',     t:'20:30', svc:'soir', s:'reserved', date:t, createdAt:Date.now(), statut:0, mode:'ia',     canal:'telephone', prisPar:'', note:'Repas entreprise', tel:'', email:'m.steiner@corp.ch', bebe:0, pmr:0, allergie:false },

    // ── SOIR — PMR ──
    { id:'r29', n:'Meyer Laura',     nom:'Meyer',     prenom:'Laura',    c:4,  tbl:'T10',     t:'19:30', svc:'soir', s:'reserved', date:t, createdAt:Date.now(), statut:0, mode:'ia',     canal:'telephone', prisPar:'', note:'Fauteuil roulant — accès facile SVP', tel:'+41 76 222 11 00', email:'', bebe:0, pmr:1, allergie:false },

    // ── SOIR — Bar ──
    { id:'r30', n:'Petit Jean-Luc',  nom:'Petit',     prenom:'Jean-Luc', c:4,  tbl:'T22',     t:'19:00', svc:'soir', s:'reserved', date:t, createdAt:Date.now(), statut:0, mode:'ia',     canal:'walkin',    prisPar:'', note:'Apéro avant dîner', tel:'', email:'', bebe:0, pmr:0, allergie:false },

    // ── SOIR — Terrasse ──
    { id:'r31', n:'Bonvin Nathalie', nom:'Bonvin',    prenom:'Nathalie', c:4,  tbl:'T30',     t:'19:00', svc:'soir', s:'reserved', date:t, createdAt:Date.now(), statut:0, mode:'ia',     canal:'telephone', prisPar:'', note:'Si beau temps', tel:'', email:'', bebe:0, pmr:0, allergie:false },
    { id:'r32', n:'Crettaz Yves',    nom:'Crettaz',   prenom:'Yves',     c:3,  tbl:'T32',     t:'19:30', svc:'soir', s:'reserved', date:t, createdAt:Date.now(), statut:0, mode:'ia',     canal:'telephone', prisPar:'', note:'', tel:'', email:'', bebe:0, pmr:0, allergie:false },

    // ── SOIR — Combo terrasse ──
    { id:'r33', n:'Jeanrenaud Famille', nom:'Jeanrenaud', prenom:'Famille', c:7, tbl:'T34+T35', t:'19:00', svc:'soir', s:'reserved', date:t, createdAt:Date.now(), statut:0, mode:'manuel', canal:'telephone', prisPar:'', note:'Réunion familiale mensuelle', tel:'+41 79 777 66 55', email:'', bebe:1, pmr:0, allergie:false },

    // ── SOIR — Salon privé combo ──
    { id:'r34', n:'Mariage Réception', nom:'Dupuis',   prenom:'Marc',     c:18, tbl:'P1+P2',   t:'19:00', svc:'soir', s:'reserved', date:t, createdAt:Date.now(), statut:2, mode:'manuel', canal:'email',     prisPar:'Manager', note:'Réception mariage — menu dégustation 7 services', tel:'+41 79 111 22 33', email:'marc@dupuis.ch', bebe:0, pmr:0, allergie:true },

    // ── WAITLIST ──
    { id:'r40', n:'Gruber Stefan',   nom:'Gruber',    prenom:'Stefan',   c:2,  tbl:'',        t:'19:30', svc:'soir', s:'waitlist', date:t, createdAt:Date.now(), statut:0, mode:'ia',     canal:'widget',    prisPar:'', note:'Demande via widget', tel:'+41 78 999 88 77', email:'stefan@gruber.ch', bebe:0, pmr:0, allergie:false },
    { id:'r41', n:'Villard Anne',    nom:'Villard',   prenom:'Anne',     c:6,  tbl:'',        t:'20:00', svc:'soir', s:'waitlist', date:t, createdAt:Date.now(), statut:0, mode:'ia',     canal:'widget',    prisPar:'', note:'Grande table souhaitée', tel:'+41 76 888 77 66', email:'', bebe:0, pmr:0, allergie:false },

    // ── CANCELLED ──
    { id:'r42', n:'Renaud Éric',     nom:'Renaud',    prenom:'Éric',     c:4,  tbl:'T12',     t:'19:00', svc:'soir', s:'cancelled', date:t, createdAt:Date.now(), statut:0, mode:'ia',    canal:'telephone', prisPar:'', note:'Annulé 2h avant', tel:'', email:'', bebe:0, pmr:0, allergie:false },

    // ── DONE (table libérée midi) ──
    { id:'r43', n:'Lambert Yves',    nom:'Lambert',   prenom:'Yves',     c:2,  tbl:'T20',     t:'12:00', svc:'midi', s:'done',     date:t, createdAt:Date.now(), statut:0, mode:'ia',     canal:'walkin',    prisPar:'', note:'', tel:'', email:'', bebe:0, pmr:0, allergie:false },
  ]

  // ══════════════════════════════════════════════════
  //  RESTAURANT
  // ══════════════════════════════════════════════════

  const resto: Resto = {
    name: "Le Comptoir du Lac",
    ville: 'Montpreveyres',
    pays: 'CH',
    plan: 'bistro',
    maxCvt: 120,
    tel: '+41 21 903 45 67',
    email: 'info@comptoirdulac.ch',
    web: 'www.comptoirdulac.ch'
  }

  return { resas, tables, combos, services, salles, resto, roomItems, isDemo: true, activeDate: t, _demoVersion: 11 }
}
