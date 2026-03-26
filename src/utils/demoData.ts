// ══════════════════════════════════════════════════
//  R3STO — Données démo : "Le Comptoir du Lac"
//  Restaurant suisse 120 couverts, 3 salles,
//  services midi/soir + double service ven/sam soir.
//  Plan réaliste — modèle exporté le 26/03/2026.
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
  //  TABLES — Modèle exporté 26/03/2026
  //
  //  SALLE PRINCIPALE :
  //  ┌─────────────────────────────────────────────────────────┐
  //  │ T1○ T2○  T10□ T11□ T12□ T13□ T14□   🧥vest  ●col     │
  //  │                                        💰caisse        │
  //  │ T3○      T20▬▬▬▬▬▬  T21▬ T22▬                         │
  //  │ T4○(B)                                                  │
  //  │          T30▬▬   T31▬▬   T32▬▬                         │
  //  │ T5○(B)   🔥chem  T22(bar)▬▬   T6○(H) T7○(H)          │
  //  └─────────────────────────────────────────────────────────┘
  // ══════════════════════════════════════════════════════════════

  const tables: Table[] = [
    // ═══ SALLE PRINCIPALE ═══

    // ── Rondes 2p vue lac (gauche haut) ──
    { id:'t1',  n:'T1',  salle:'Salle principale', shape:'round_sm', capMin:1, capMax:2,  x:7.25,  y:8.25,  w:7,  h:7,  active:true, priority:1,  blocked:false, held:false, orient:'H' },
    { id:'t2',  n:'T2',  salle:'Salle principale', shape:'round_sm', capMin:1, capMax:2,  x:7.25,  y:20.75, w:7,  h:7,  active:true, priority:2,  blocked:false, held:false, orient:'H' },

    // ── Carrées 4p (rangée haut) ──
    { id:'t5',  n:'T10', salle:'Salle principale', shape:'square',   capMin:2, capMax:4,  x:22.25, y:7.25,  w:9,  h:9,  active:true, priority:5,  blocked:false, held:false },
    { id:'t6',  n:'T11', salle:'Salle principale', shape:'square',   capMin:2, capMax:4,  x:36.5,  y:7.25,  w:9,  h:9,  active:true, priority:6,  blocked:false, held:false },
    { id:'t7',  n:'T12', salle:'Salle principale', shape:'square',   capMin:2, capMax:4,  x:52.5,  y:7.25,  w:9,  h:9,  active:true, priority:7,  blocked:false, held:false },
    { id:'t8',  n:'T13', salle:'Salle principale', shape:'square',   capMin:2, capMax:4,  x:67,    y:7.25,  w:9,  h:9,  active:true, priority:8,  blocked:false, held:false },
    { id:'t9',  n:'T14', salle:'Salle principale', shape:'square',   capMin:2, capMax:4,  x:80.5,  y:7.25,  w:9,  h:9,  active:true, priority:9,  blocked:false, held:false },

    // ── Rondes 3p (milieu gauche) ──
    { id:'t3',  n:'T3',  salle:'Salle principale', shape:'round',    capMin:2, capMax:3,  x:6.25,  y:34.75, w:9,  h:9,  active:true, priority:3,  blocked:false, held:false, tableH:'standard' },
    { id:'t4',  n:'T4',  salle:'Salle principale', shape:'round',    capMin:2, capMax:3,  x:6.25,  y:51.5,  w:9,  h:9,  active:true, priority:4,  blocked:false, held:false, tableH:'basse' },

    // ── Rectangles centre ──
    { id:'t11', n:'T20', salle:'Salle principale', shape:'rect',     capMin:2, capMax:8,  x:25,    y:25.25, w:24.5, h:8.5, active:true, priority:11, blocked:false, held:false },
    { id:'t12', n:'T21', salle:'Salle principale', shape:'rect',     capMin:2, capMax:4,  x:58,    y:24.75, w:12, h:9,  active:true, priority:12, blocked:false, held:false },
    { id:'t13', n:'T22', salle:'Salle principale', shape:'rect',     capMin:2, capMax:4,  x:75.5,  y:24.75, w:12, h:9,  active:true, priority:13, blocked:false, held:false },

    // ── Grandes tables (rangée basse) ──
    { id:'t14', n:'T30', salle:'Salle principale', shape:'rect_lg',  capMin:4, capMax:8,  x:25,    y:44,    w:16, h:9,  active:true, priority:14, blocked:false, held:false },
    { id:'t15', n:'T31', salle:'Salle principale', shape:'rect_lg',  capMin:4, capMax:8,  x:49,    y:44,    w:16, h:9,  active:true, priority:15, blocked:false, held:false },
    { id:'t16', n:'T32', salle:'Salle principale', shape:'rect_lg',  capMin:4, capMax:8,  x:73.5,  y:44,    w:16, h:9,  active:true, priority:16, blocked:false, held:false },

    // ── Bar haute + rondes hautes (bas) ──
    { id:'t22', n:'T22', salle:'Salle principale', shape:'bar',      capMin:2, capMax:6,  x:54,    y:66,    w:22, h:7,  active:true, priority:22, blocked:false, held:false, tableH:'haute', barSide:'top' },
    { id:'t24', n:'T5',  salle:'Salle principale', shape:'round',    capMin:2, capMax:3,  x:19.25, y:61,    w:9,  h:9,  active:true, priority:24, blocked:false, held:true,  tableH:'basse' },
    { id:'t202',n:'T6',  salle:'Salle principale', shape:'round_sm', capMin:1, capMax:3,  x:82.25, y:61,    w:9,  h:9,  active:true, priority:18, blocked:false, held:false, tableH:'haute' },
    { id:'t203',n:'T7',  salle:'Salle principale', shape:'round_sm', capMin:1, capMax:3,  x:98.5,  y:61,    w:9,  h:9,  active:true, priority:19, blocked:false, held:false, tableH:'haute' },

    // ═══ TERRASSE ═══

    // Rangée 1 — rondes sous parasols
    { id:'t30', n:'TE1', salle:'Terrasse', shape:'round',    capMin:2, capMax:4,  x:10,  y:10, w:9,  h:9,  active:true, priority:30, blocked:false, held:false },
    { id:'t31', n:'TE2', salle:'Terrasse', shape:'round',    capMin:2, capMax:4,  x:26,  y:10, w:9,  h:9,  active:true, priority:31, blocked:false, held:false },
    { id:'t32', n:'TE3', salle:'Terrasse', shape:'round',    capMin:2, capMax:4,  x:42,  y:10, w:9,  h:9,  active:true, priority:32, blocked:false, held:false },
    { id:'t33', n:'TE4', salle:'Terrasse', shape:'round',    capMin:2, capMax:4,  x:58,  y:10, w:9,  h:9,  active:true, priority:33, blocked:false, held:false },

    // Rangée 2 — rectangles
    { id:'t34', n:'TE5', salle:'Terrasse', shape:'rect',     capMin:2, capMax:4,  x:10,  y:30, w:12, h:9,  active:true, priority:34, blocked:false, held:false },
    { id:'t35', n:'TE6', salle:'Terrasse', shape:'rect',     capMin:2, capMax:4,  x:28,  y:30, w:12, h:9,  active:true, priority:35, blocked:false, held:false },
    { id:'t36', n:'TE7', salle:'Terrasse', shape:'rect',     capMin:2, capMax:4,  x:46,  y:30, w:12, h:9,  active:true, priority:36, blocked:false, held:false },

    // Rangée 3 — grande + ovale
    { id:'t37', n:'TE8', salle:'Terrasse', shape:'rect_lg',  capMin:4, capMax:8,  x:10,  y:50, w:16, h:10, active:true, priority:37, blocked:false, held:false },
    { id:'t38', n:'TE9', salle:'Terrasse', shape:'oval',     capMin:4, capMax:6,  x:34,  y:50, w:14, h:10, active:true, priority:38, blocked:false, held:false },

    // Tables hautes côté droit
    { id:'t39', n:'T39', salle:'Terrasse', shape:'round_sm', capMin:1, capMax:2,  x:66,  y:30, w:7,  h:7,  active:true, priority:39, blocked:false, held:false, tableH:'haute' },
    { id:'t40', n:'T40', salle:'Terrasse', shape:'round_sm', capMin:1, capMax:2,  x:66,  y:44, w:7,  h:7,  active:true, priority:40, blocked:false, held:false, tableH:'haute' },

    // ═══ SALON PRIVÉ ═══

    { id:'t50', n:'P1',  salle:'Salon privé', shape:'rect_lg',  capMin:6, capMax:12, x:12,  y:12, w:24, h:12, active:true, priority:50, blocked:false, held:false },
    { id:'t51', n:'P2',  salle:'Salon privé', shape:'rect_lg',  capMin:4, capMax:8,  x:46,  y:12, w:18, h:12, active:true, priority:51, blocked:false, held:false },
    { id:'t52', n:'P3',  salle:'Salon privé', shape:'round',    capMin:2, capMax:4,  x:16,  y:40, w:10, h:10, active:true, priority:52, blocked:false, held:false },
    { id:'t53', n:'P4',  salle:'Salon privé', shape:'round',    capMin:2, capMax:4,  x:36,  y:40, w:10, h:10, active:true, priority:53, blocked:false, held:false },
  ]

  // ══════════════════════════════════════════════════
  //  COMBOS — modèle exporté
  // ══════════════════════════════════════════════════

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
    mkCombo('c1', 'T10+T11',          ['t5','t6'],               8,  'Salle principale'),
    mkCombo('c2', 'T12+T13+T14',      ['t7','t8','t9'],          12, 'Salle principale'),
    mkCombo('c4', 'T30+T31',          ['t14','t15'],             16, 'Salle principale'),
    mkCombo('combo_1774536451052', 'T21+T22', ['t12','t13'],     8,  'Salle principale', 'H', 'R'),
    mkCombo('combo_1774537407126', 'T30+T31+T32', ['t14','t15','t16'], 24, 'Salle principale', 'H', 'C'),
    // Terrasse
    mkCombo('c6', 'TE1+TE2+TE3',      ['t30','t31','t32'],       12, 'Terrasse'),
    mkCombo('c7', 'TE5+TE6',          ['t34','t35'],             8,  'Terrasse'),
    // Salon privé
    mkCombo('c8', 'P1+P2',            ['t50','t51'],             20, 'Salon privé'),
    mkCombo('c9', 'P3+P4',            ['t52','t53'],             8,  'Salon privé'),
  ]

  // ══════════════════════════════════════════════════════════════
  //  OBJETS DE SALLE — modèle exporté
  // ══════════════════════════════════════════════════════════════

  const roomItems: RoomItem[] = [
    // ── SALLE PRINCIPALE — structure ──
    { id:'ri1',  sym:'▬',  lbl:'Mur haut',        shape:'mur',         x:0,      y:0,     w:115, h:2,  salle:'Salle principale' },
    { id:'ri2',  sym:'▬',  lbl:'Mur bas',         shape:'mur',         x:0,      y:74,    w:115, h:2,  salle:'Salle principale' },
    { id:'ri3',  sym:'▬',  lbl:'Mur gauche',      shape:'mur',         x:0,      y:0,     w:2,   h:76, salle:'Salle principale' },
    { id:'ri4',  sym:'▬',  lbl:'Mur droit',       shape:'mur',         x:113,    y:0,     w:2,   h:76, salle:'Salle principale' },
    // Fenêtres
    { id:'ri5',  sym:'▭',  lbl:'Fenêtre vue lac',  shape:'fenetre',    x:18,  y:0,   w:22,  h:2,  salle:'Salle principale' },
    { id:'ri6',  sym:'▭',  lbl:'Baie vitrée',      shape:'baie_vitree',x:44,  y:0,   w:34,  h:2,  salle:'Salle principale' },
    { id:'ri7',  sym:'▭',  lbl:'Fenêtre VIP',      shape:'fenetre',    x:84,  y:0,   w:16,  h:2,  salle:'Salle principale' },
    // Portes
    { id:'ri9',  sym:'🚪', lbl:'Cuisine',          shape:'porte',      x:111, y:36,  w:4,   h:8,  salle:'Salle principale' },
    // Cheminée
    { id:'ri12', sym:'🔥', lbl:'Cheminée',         shape:'cheminee',   x:37.25, y:63.5, w:11, h:10, salle:'Salle principale' },
    // Colonne
    { id:'ri204',sym:'●',  lbl:'Colonne',          shape:'colonne',    x:104.25, y:29, w:5,  h:5,  salle:'Salle principale' },
    // Vestiaire & caisse
    { id:'ri207',sym:'🧥', lbl:'Vestiaire',        shape:'vestiaire',  x:100.5, y:2.75, w:12, h:6, salle:'Salle principale' },
    { id:'ri208',sym:'💰', lbl:'Caisse',           shape:'caisse',     x:102.5, y:17.25, w:10, h:8, salle:'Salle principale' },

    // ── TERRASSE ──
    { id:'ri20', sym:'━',  lbl:'Garde-corps haut',  shape:'garde_corps', x:0,  y:0,  w:80, h:2,  salle:'Terrasse' },
    { id:'ri21', sym:'━',  lbl:'Garde-corps bas',   shape:'garde_corps', x:0,  y:66, w:80, h:2,  salle:'Terrasse' },
    { id:'ri22', sym:'━',  lbl:'Garde-corps droit', shape:'garde_corps', x:78, y:0,  w:2,  h:68, salle:'Terrasse' },
    // Parasols
    { id:'ri23', sym:'⛱',  lbl:'Parasol',          shape:'parasol',    x:11,  y:3,  w:7,  h:7,  salle:'Terrasse' },
    { id:'ri24', sym:'⛱',  lbl:'Parasol',          shape:'parasol',    x:27,  y:3,  w:7,  h:7,  salle:'Terrasse' },
    { id:'ri25', sym:'⛱',  lbl:'Parasol',          shape:'parasol',    x:43,  y:3,  w:7,  h:7,  salle:'Terrasse' },
    { id:'ri26', sym:'⛱',  lbl:'Parasol',          shape:'parasol',    x:59,  y:3,  w:7,  h:7,  salle:'Terrasse' },
    // Végétation
    { id:'ri27', sym:'🌿', lbl:'Plante',           shape:'plante',     x:72, y:10,  w:5,  h:5,  salle:'Terrasse' },
    { id:'ri28', sym:'🌿', lbl:'Plante',           shape:'plante',     x:72, y:26,  w:5,  h:5,  salle:'Terrasse' },
    { id:'ri29', sym:'🪴', lbl:'Jardinière',       shape:'jardiniere', x:0,  y:24,  w:4,  h:16, salle:'Terrasse' },
    { id:'ri30', sym:'🌳', lbl:'Arbre',            shape:'arbre',      x:64, y:52,  w:10, h:10, salle:'Terrasse' },
    { id:'ri31', sym:'🌳', lbl:'Arbre',            shape:'arbre',      x:56, y:58,  w:8,  h:8,  salle:'Terrasse' },

    // ── SALON PRIVÉ ──
    { id:'ri40', sym:'▬',  lbl:'Cloison haut',     shape:'cloison',    x:0,  y:0,   w:80, h:2,  salle:'Salon privé' },
    { id:'ri41', sym:'▬',  lbl:'Cloison bas',      shape:'cloison',    x:0,  y:58,  w:80, h:2,  salle:'Salon privé' },
    { id:'ri42', sym:'▬',  lbl:'Cloison gauche',   shape:'cloison',    x:0,  y:0,   w:2,  h:60, salle:'Salon privé' },
    { id:'ri43', sym:'▬',  lbl:'Cloison droite',   shape:'cloison',    x:78, y:0,   w:2,  h:60, salle:'Salon privé' },
    { id:'ri44', sym:'🚪', lbl:'Porte salon',      shape:'porte',      x:0,  y:26,  w:4,  h:8,  salle:'Salon privé' },
    { id:'ri45', sym:'🎹', lbl:'Piano',            shape:'piano',      x:58, y:38,  w:14, h:10, salle:'Salon privé' },
    { id:'ri46', sym:'🍸', lbl:'Mini bar',         shape:'bar_el',     x:58, y:8,   w:14, h:8,  salle:'Salon privé' },
    { id:'ri47', sym:'🌿', lbl:'Plante',           shape:'plante',     x:72, y:26,  w:5,  h:5,  salle:'Salon privé' },
    { id:'ri48', sym:'🌿', lbl:'Plante',           shape:'plante',     x:4,  y:50,  w:5,  h:5,  salle:'Salon privé' },
  ]

  // ══════════════════════════════════════════════════
  //  RÉSERVATIONS — adaptées aux nouvelles tables
  // ══════════════════════════════════════════════════

  const resas: Resa[] = [
    // ── MIDI — Salle principale ──
    { id:'r1',  n:'Martin Jean',     nom:'Martin',    prenom:'Jean',     c:2,  tbl:'T1',      t:'12:00', svc:'midi', s:'arrived',  date:t, createdAt:Date.now(), statut:1, mode:'ia',     canal:'telephone', prisPar:'Admin', note:'', tel:'+41 79 123 45 67', email:'', bebe:0, pmr:0, allergie:false },
    { id:'r2',  n:'Dupont Marie',    nom:'Dupont',    prenom:'Marie',    c:2,  tbl:'T2',      t:'12:15', svc:'midi', s:'arrived',  date:t, createdAt:Date.now(), statut:0, mode:'ia',     canal:'telephone', prisPar:'', note:'', tel:'+41 78 234 56 78', email:'', bebe:0, pmr:0, allergie:false },
    { id:'r3',  n:'Schmid Anna',     nom:'Schmid',    prenom:'Anna',     c:3,  tbl:'T3',      t:'12:00', svc:'midi', s:'reserved', date:t, createdAt:Date.now(), statut:2, mode:'ia',     canal:'widget',    prisPar:'', note:'Anniversaire — gâteau commandé', tel:'+41 76 345 67 89', email:'anna@mail.ch', bebe:0, pmr:0, allergie:true },
    { id:'r4',  n:'Favre Isabelle',  nom:'Favre',     prenom:'Isabelle', c:3,  tbl:'T4',      t:'12:30', svc:'midi', s:'reserved', date:t, createdAt:Date.now(), statut:0, mode:'ia',     canal:'telephone', prisPar:'', note:'', tel:'', email:'', bebe:0, pmr:0, allergie:false },
    { id:'r5',  n:'Rochat Pierre',   nom:'Rochat',    prenom:'Pierre',   c:4,  tbl:'T20',     t:'12:45', svc:'midi', s:'reserved', date:t, createdAt:Date.now(), statut:0, mode:'manuel', canal:'telephone', prisPar:'', note:'', tel:'', email:'', bebe:0, pmr:0, allergie:false },
    { id:'r6',  n:'Blanc Julie',     nom:'Blanc',     prenom:'Julie',    c:4,  tbl:'T21',     t:'13:00', svc:'midi', s:'reserved', date:t, createdAt:Date.now(), statut:0, mode:'ia',     canal:'walkin',    prisPar:'', note:'', tel:'', email:'', bebe:0, pmr:0, allergie:false },

    // ── MIDI — Combo 2 tables ──
    { id:'r7',  n:'Weber Lisa',      nom:'Weber',     prenom:'Lisa',     c:7,  tbl:'T10+T11', t:'12:15', svc:'midi', s:'reserved', date:t, createdAt:Date.now(), statut:0, mode:'manuel', canal:'telephone', prisPar:'Admin', note:'Repas famille — combo demandé', tel:'+41 79 222 33 44', email:'', bebe:1, pmr:0, allergie:false },

    // ── MIDI — Combo 3 tables ──
    { id:'r8',  n:'Müller Klaus',    nom:'Müller',    prenom:'Klaus',    c:10, tbl:'T12+T13+T14', t:'12:00', svc:'midi', s:'arrived',  date:t, createdAt:Date.now(), statut:1, mode:'ia',     canal:'telephone', prisPar:'', note:'Déjeuner d\'affaires', tel:'+41 79 456 78 90', email:'', bebe:0, pmr:0, allergie:false },

    // ── MIDI — Grande table ──
    { id:'r9',  n:'Bernard Claire',  nom:'Bernard',   prenom:'Claire',   c:6,  tbl:'T30',     t:'12:30', svc:'midi', s:'reserved', date:t, createdAt:Date.now(), statut:0, mode:'ia',     canal:'telephone', prisPar:'', note:'', tel:'+41 76 111 22 33', email:'', bebe:0, pmr:0, allergie:false },

    // ── MIDI — Bar ──
    { id:'r10', n:'Costa Miguel',    nom:'Costa',     prenom:'Miguel',   c:2,  tbl:'T22',     t:'12:00', svc:'midi', s:'arrived',  date:t, createdAt:Date.now(), statut:0, mode:'ia',     canal:'walkin',    prisPar:'', note:'', tel:'', email:'', bebe:0, pmr:0, allergie:false },

    // ── MIDI — Terrasse ──
    { id:'r14', n:'Dubois Marc',     nom:'Dubois',    prenom:'Marc',     c:4,  tbl:'TE1',     t:'12:00', svc:'midi', s:'arrived',  date:t, createdAt:Date.now(), statut:0, mode:'ia',     canal:'telephone', prisPar:'', note:'', tel:'', email:'', bebe:0, pmr:0, allergie:false },
    { id:'r15', n:'Roth Michel',     nom:'Roth',      prenom:'Michel',   c:4,  tbl:'TE2',     t:'12:15', svc:'midi', s:'reserved', date:t, createdAt:Date.now(), statut:0, mode:'ia',     canal:'telephone', prisPar:'', note:'', tel:'', email:'', bebe:1, pmr:0, allergie:false },
    { id:'r16', n:'Ammann Eva',      nom:'Ammann',    prenom:'Eva',      c:3,  tbl:'TE5',     t:'12:30', svc:'midi', s:'reserved', date:t, createdAt:Date.now(), statut:0, mode:'ia',     canal:'telephone', prisPar:'', note:'Chien', tel:'', email:'', bebe:0, pmr:0, allergie:false },

    // ── MIDI — Salon privé ──
    { id:'r17', n:'Entreprise SA',   nom:'Entreprise',prenom:'SA',       c:10, tbl:'P1',      t:'12:00', svc:'midi', s:'reserved', date:t, createdAt:Date.now(), statut:1, mode:'manuel', canal:'email',     prisPar:'Manager', note:'Séminaire — menu fixe commandé', tel:'+41 21 555 66 77', email:'contact@entreprise.ch', bebe:0, pmr:0, allergie:false },

    // ── SOIR — Tables individuelles ──
    { id:'r20', n:'Leroy Alice',     nom:'Leroy',     prenom:'Alice',    c:2,  tbl:'T1',      t:'19:00', svc:'soir', s:'reserved', date:t, createdAt:Date.now(), statut:0, mode:'ia',     canal:'telephone', prisPar:'', note:'', tel:'+41 79 555 66 77', email:'', bebe:0, pmr:0, allergie:false },
    { id:'r21', n:'Girard Paul',     nom:'Girard',    prenom:'Paul',     c:2,  tbl:'T2',      t:'19:00', svc:'soir', s:'reserved', date:t, createdAt:Date.now(), statut:0, mode:'ia',     canal:'telephone', prisPar:'', note:'', tel:'', email:'', bebe:0, pmr:0, allergie:false },
    { id:'r22', n:'Morel Sandrine',  nom:'Morel',     prenom:'Sandrine', c:3,  tbl:'T3',      t:'19:30', svc:'soir', s:'reserved', date:t, createdAt:Date.now(), statut:0, mode:'ia',     canal:'widget',    prisPar:'', note:'', tel:'+41 76 444 55 66', email:'sandrine@morel.ch', bebe:0, pmr:0, allergie:true },
    { id:'r23', n:'Nguyen Thi',      nom:'Nguyen',    prenom:'Thi',      c:3,  tbl:'T4',      t:'19:30', svc:'soir', s:'reserved', date:t, createdAt:Date.now(), statut:0, mode:'ia',     canal:'telephone', prisPar:'', note:'', tel:'', email:'', bebe:0, pmr:0, allergie:false },

    // ── SOIR — Combo 2 tables ──
    { id:'r24', n:'Fischer Daniel',  nom:'Fischer',   prenom:'Daniel',   c:7,  tbl:'T10+T11', t:'19:00', svc:'soir', s:'reserved', date:t, createdAt:Date.now(), statut:1, mode:'ia',     canal:'telephone', prisPar:'', note:'Client régulier — même table SVP', tel:'+41 79 888 77 66', email:'', bebe:0, pmr:0, allergie:false },

    // ── SOIR — Combo 3 tables ──
    { id:'r25', n:'Hoffmann Georg',  nom:'Hoffmann',  prenom:'Georg',    c:11, tbl:'T12+T13+T14', t:'19:30', svc:'soir', s:'reserved', date:t, createdAt:Date.now(), statut:0, mode:'manuel', canal:'telephone', prisPar:'Manager', note:'Anniversaire 50 ans — champagne', tel:'+41 78 333 22 11', email:'', bebe:0, pmr:0, allergie:false },

    // ── SOIR — Grande table + combo ──
    { id:'r27', n:'Bauer Christine', nom:'Bauer',     prenom:'Christine', c:14, tbl:'T30+T31', t:'19:00', svc:'soir', s:'reserved', date:t, createdAt:Date.now(), statut:0, mode:'ia',     canal:'telephone', prisPar:'', note:'Dîner de famille élargie', tel:'', email:'', bebe:2, pmr:0, allergie:false },
    { id:'r28', n:'Steiner Marco',   nom:'Steiner',   prenom:'Marco',    c:8,  tbl:'T31',     t:'20:30', svc:'soir', s:'reserved', date:t, createdAt:Date.now(), statut:0, mode:'ia',     canal:'telephone', prisPar:'', note:'Repas entreprise', tel:'', email:'m.steiner@corp.ch', bebe:0, pmr:0, allergie:false },

    // ── SOIR — PMR ──
    { id:'r29', n:'Meyer Laura',     nom:'Meyer',     prenom:'Laura',    c:4,  tbl:'T20',     t:'19:30', svc:'soir', s:'reserved', date:t, createdAt:Date.now(), statut:0, mode:'ia',     canal:'telephone', prisPar:'', note:'Fauteuil roulant — accès facile SVP', tel:'+41 76 222 11 00', email:'', bebe:0, pmr:1, allergie:false },

    // ── SOIR — Bar ──
    { id:'r30', n:'Petit Jean-Luc',  nom:'Petit',     prenom:'Jean-Luc', c:4,  tbl:'T22',     t:'19:00', svc:'soir', s:'reserved', date:t, createdAt:Date.now(), statut:0, mode:'ia',     canal:'walkin',    prisPar:'', note:'Apéro avant dîner', tel:'', email:'', bebe:0, pmr:0, allergie:false },

    // ── SOIR — Terrasse ──
    { id:'r31', n:'Bonvin Nathalie', nom:'Bonvin',    prenom:'Nathalie', c:4,  tbl:'TE1',     t:'19:00', svc:'soir', s:'reserved', date:t, createdAt:Date.now(), statut:0, mode:'ia',     canal:'telephone', prisPar:'', note:'Si beau temps', tel:'', email:'', bebe:0, pmr:0, allergie:false },
    { id:'r32', n:'Crettaz Yves',    nom:'Crettaz',   prenom:'Yves',     c:3,  tbl:'TE3',     t:'19:30', svc:'soir', s:'reserved', date:t, createdAt:Date.now(), statut:0, mode:'ia',     canal:'telephone', prisPar:'', note:'', tel:'', email:'', bebe:0, pmr:0, allergie:false },

    // ── SOIR — Combo terrasse ──
    { id:'r33', n:'Jeanrenaud Famille', nom:'Jeanrenaud', prenom:'Famille', c:7, tbl:'TE5+TE6', t:'19:00', svc:'soir', s:'reserved', date:t, createdAt:Date.now(), statut:0, mode:'manuel', canal:'telephone', prisPar:'', note:'Réunion familiale mensuelle', tel:'+41 79 777 66 55', email:'', bebe:1, pmr:0, allergie:false },

    // ── SOIR — Salon privé combo ──
    { id:'r34', n:'Mariage Réception', nom:'Dupuis',   prenom:'Marc',     c:18, tbl:'P1+P2',   t:'19:00', svc:'soir', s:'reserved', date:t, createdAt:Date.now(), statut:2, mode:'manuel', canal:'email',     prisPar:'Manager', note:'Réception mariage — menu dégustation 7 services', tel:'+41 79 111 22 33', email:'marc@dupuis.ch', bebe:0, pmr:0, allergie:true },

    // ── WAITLIST ──
    { id:'r40', n:'Gruber Stefan',   nom:'Gruber',    prenom:'Stefan',   c:2,  tbl:'',        t:'19:30', svc:'soir', s:'waitlist', date:t, createdAt:Date.now(), statut:0, mode:'ia',     canal:'widget',    prisPar:'', note:'Demande via widget', tel:'+41 78 999 88 77', email:'stefan@gruber.ch', bebe:0, pmr:0, allergie:false },
    { id:'r41', n:'Villard Anne',    nom:'Villard',   prenom:'Anne',     c:6,  tbl:'',        t:'20:00', svc:'soir', s:'waitlist', date:t, createdAt:Date.now(), statut:0, mode:'ia',     canal:'widget',    prisPar:'', note:'Grande table souhaitée', tel:'+41 76 888 77 66', email:'', bebe:0, pmr:0, allergie:false },

    // ── CANCELLED ──
    { id:'r42', n:'Renaud Éric',     nom:'Renaud',    prenom:'Éric',     c:4,  tbl:'T21',     t:'19:00', svc:'soir', s:'cancelled', date:t, createdAt:Date.now(), statut:0, mode:'ia',    canal:'telephone', prisPar:'', note:'Annulé 2h avant', tel:'', email:'', bebe:0, pmr:0, allergie:false },

    // ── DONE (table libérée midi) ──
    { id:'r43', n:'Lambert Yves',    nom:'Lambert',   prenom:'Yves',     c:2,  tbl:'T6',      t:'12:00', svc:'midi', s:'done',     date:t, createdAt:Date.now(), statut:0, mode:'ia',     canal:'walkin',    prisPar:'', note:'', tel:'', email:'', bebe:0, pmr:0, allergie:false },
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

  return { resas, tables, combos, services, salles, resto, roomItems, isDemo: true, activeDate: t, _demoVersion: 14 }
}
