// ══════════════════════════════════════════════════════════════
//  R3STO — Règles de placement & gestion des tables/combos
//  Fichier central de référence — TOUTE logique de placement
//  doit passer par ces fonctions.
// ══════════════════════════════════════════════════════════════

import type { Resa, Table, Combo } from '../types'

// ─────────────────────────────────────────────────────────────
//  RÈGLE 0 — MATCHING EXACT TABLE / COMBO
//  Vérifie si une table (ex: "T3") fait partie d'un tbl combo
//  (ex: "T3+T4"). JAMAIS de .includes() (substring) — toujours
//  split('+') puis comparaison exacte.
//  → RULES.ts C3
// ─────────────────────────────────────────────────────────────
export function tblMatchesTable(tbl: string, tableName: string): boolean {
  if (!tbl || !tableName) return false
  if (tbl === tableName) return true
  if (tbl.includes('+')) {
    return tbl.split('+').some(part => part.trim() === tableName)
  }
  return false
}

// ─────────────────────────────────────────────────────────────
//  RÈGLE 1 — OCCUPATION
//  Seuls les statuts 'reserved' et 'arrived' occupent une table.
//  'done' (libérée), 'noshow', 'cancelled' = table libre.
// ─────────────────────────────────────────────────────────────
export function isOccupying(resa: Resa): boolean {
  return resa.s === 'reserved' || resa.s === 'arrived'
}

// ─────────────────────────────────────────────────────────────
//  RÈGLE 2 — TABLES OCCUPÉES / LIBRES
//  Retourne les IDs des tables actuellement occupées
//  pour une date + service donnés.
// ─────────────────────────────────────────────────────────────
export function getOccupiedTableIds(
  resas: Resa[], date: string, svc: string, excludeResaId?: string
): Set<string> {
  const ids = new Set<string>()
  for (const r of resas) {
    if (r.date !== date || r.svc !== svc) continue
    if (excludeResaId && r.id === excludeResaId) continue
    if (!isOccupying(r)) continue
    if (r.tbl) {
      if (r.tbl.includes('+')) {
        r.tbl.split('+').forEach(tn => ids.add(tn.trim()))
      } else {
        ids.add(r.tbl)
      }
    }
  }
  return ids
}

export function getFreeTables(
  tables: Table[], resas: Resa[], date: string, svc: string, excludeResaId?: string
): Table[] {
  const occupied = getOccupiedTableIds(resas, date, svc, excludeResaId)
  return tables.filter(t =>
    t.active && !t.blocked && !t.held && !occupied.has(t.n)
  )
}

// ─────────────────────────────────────────────────────────────
//  RÈGLE 3 — COMBOS DISPONIBLES
//  Un combo est disponible si TOUTES ses tables sont libres.
// ─────────────────────────────────────────────────────────────
export function getFreeCombos(
  combos: Combo[], tables: Table[], resas: Resa[],
  date: string, svc: string, excludeResaId?: string
): Combo[] {
  const free = getFreeTables(tables, resas, date, svc, excludeResaId)
  const freeIds = new Set(free.map(t => t.id))
  return combos.filter(c => c.tables.every(tid => freeIds.has(tid)))
}

// ─────────────────────────────────────────────────────────────
//  RÈGLE 4 — CAPACITÉ MAXIMALE DISPONIBLE
//  Le max de couverts qu'on peut accepter = max entre
//  la plus grande table libre ET le plus grand combo libre.
//  On ne peut PAS réserver plus que ce max.
// ─────────────────────────────────────────────────────────────
export function getMaxCapacity(
  tables: Table[], combos: Combo[], resas: Resa[],
  date: string, svc: string, excludeResaId?: string
): number {
  const free = getFreeTables(tables, resas, date, svc, excludeResaId)
  const freeCombos = getFreeCombos(combos, tables, resas, date, svc, excludeResaId)
  return Math.max(
    ...free.map(t => t.capMax),
    ...freeCombos.map(c => c.cap),
    0
  )
}

// ─────────────────────────────────────────────────────────────
//  RÈGLE 5 — DÉPLACEMENT DE RÉSERVATION
//  Types de déplacements possibles :
//
//  A) Table → Table
//     La table cible doit être libre ET capMax >= couverts.
//     Résultat : resa.tbl = nouvelleTable.n
//
//  B) Table → Combo
//     Toutes les tables du combo doivent être libres ET cap >= couverts.
//     Résultat : resa.tbl = combo.label (ex: "T1+T2")
//
//  C) Combo → Table (DÉLIER = réduire)
//     La table cible doit avoir capMax >= nouveaux couverts.
//     Les autres tables du combo deviennent libres.
//     Résultat : resa.tbl = table.n
//
//  D) Combo → Combo
//     Toutes les tables du nouveau combo doivent être libres
//     (sauf celles déjà occupées par la resa courante).
//     Résultat : resa.tbl = newCombo.label
// ─────────────────────────────────────────────────────────────

export type MoveTarget =
  | { type: 'table'; table: Table }
  | { type: 'combo'; combo: Combo }

export interface MoveResult {
  valid: boolean
  reason?: string
  newTbl?: string  // nouvelle valeur pour resa.tbl
}

export function canMoveResa(
  resa: Resa,
  target: MoveTarget,
  tables: Table[],
  combos: Combo[],
  resas: Resa[],
): MoveResult {
  const covers = resa.c

  if (target.type === 'table') {
    const tbl = target.table
    // Table libre ?
    const occupied = getOccupiedTableIds(resas, resa.date, resa.svc, resa.id)
    if (occupied.has(tbl.n)) {
      return { valid: false, reason: `${tbl.n} est occupée` }
    }
    // Capacité suffisante ?
    if (tbl.capMax < covers) {
      return { valid: false, reason: `${tbl.n} max ${tbl.capMax}p, resa ${covers}p` }
    }
    return { valid: true, newTbl: tbl.n }
  }

  if (target.type === 'combo') {
    const combo = target.combo
    // Capacité suffisante ?
    if (combo.cap < covers) {
      return { valid: false, reason: `${combo.label} max ${combo.cap}p, resa ${covers}p` }
    }
    // Toutes les tables du combo libres (sauf celles déjà dans la resa courante) ?
    const occupied = getOccupiedTableIds(resas, resa.date, resa.svc, resa.id)
    const blocked = combo.tables.filter(tid => {
      const t = tables.find(t => t.id === tid)
      return t && occupied.has(t.n)
    })
    if (blocked.length > 0) {
      const names = blocked.map(tid => tables.find(t => t.id === tid)?.n || tid)
      return { valid: false, reason: `Tables occupées : ${names.join(', ')}` }
    }
    return { valid: true, newTbl: combo.label }
  }

  return { valid: false, reason: 'Type de cible inconnu' }
}

// ─────────────────────────────────────────────────────────────
//  RÈGLE 5b — ÉCHANGE DE TABLES (SWAP)
//  Vérifie si deux résas peuvent échanger leurs tables :
//  - resaA.c doit tenir sur tblB
//  - resaB.c doit tenir sur tblA
//  Fonctionne aussi avec les combos (tables liées).
// ─────────────────────────────────────────────────────────────
export interface SwapResult {
  valid: boolean
  reason?: string
}

export function canSwapResas(
  resaA: Resa,
  resaB: Resa,
  tables: Table[],
  combos: Combo[],
): SwapResult {
  // Résoudre capacité de chaque emplacement
  function capOf(tbl: string): number {
    if (tbl.includes('+')) {
      const combo = combos.find(c => c.label === tbl)
      return combo?.cap ?? 0
    }
    const t = tables.find(t => t.n === tbl)
    return t?.capMax ?? 0
  }

  const capA = capOf(resaA.tbl)
  const capB = capOf(resaB.tbl)

  if (resaB.c > capA) {
    return { valid: false, reason: `${resaB.n} (${resaB.c}p) ne tient pas sur ${resaA.tbl} (max ${capA}p)` }
  }
  if (resaA.c > capB) {
    return { valid: false, reason: `${resaA.n} (${resaA.c}p) ne tient pas sur ${resaB.tbl} (max ${capB}p)` }
  }

  return { valid: true }
}

// ─────────────────────────────────────────────────────────────
//  RÈGLE 6 — PLACEMENT IA (automatique)
//  L'IA choisit la meilleure table/combo selon :
//
//  1. Table préférée du client (tablePref) — priorité absolue
//     si disponible ET capacité suffisante.
//
//  2. Table simple la plus petite qui accepte les couverts
//     (tri par capMax croissant → éviter gaspillage).
//
//  3. Combo le plus petit si aucune table simple ne suffit
//     (tri par cap croissant).
//
//  4. null si rien ne convient → "À assigner"
// ─────────────────────────────────────────────────────────────
export function iaPlacement(
  covers: number,
  date: string,
  svc: string,
  tables: Table[],
  combos: Combo[],
  resas: Resa[],
  tablePref?: string,
  excludeResaId?: string,
  salleFilter?: string,
): string | null {
  const free = getFreeTables(tables, resas, date, svc, excludeResaId)
    .filter(t => !salleFilter || salleFilter === 'toutes' || t.salle === salleFilter)
  const freeCombos = getFreeCombos(combos, tables, resas, date, svc, excludeResaId)

  // 1. Table préférée
  if (tablePref) {
    const pref = free.find(t => t.n === tablePref && t.capMax >= covers)
    if (pref) return pref.n
    // Vérifier aussi les combos contenant la table préférée
    const prefCombo = freeCombos.find(c =>
      c.cap >= covers && c.label.split('+').some(n => n.trim() === tablePref)
    )
    if (prefCombo) return prefCombo.label
  }

  // 2. Plus petite table simple suffisante
  const candidates = free
    .filter(t => t.capMax >= covers)
    .sort((a, b) => a.capMax - b.capMax)
  if (candidates.length > 0) return candidates[0].n

  // 3. Plus petit combo suffisant
  const comboCandidates = freeCombos
    .filter(c => c.cap >= covers)
    .sort((a, b) => a.cap - b.cap)
  if (comboCandidates.length > 0) return comboCandidates[0].label

  // 4. Rien ne convient
  return null
}

// ─────────────────────────────────────────────────────────────
//  RÈGLE 7 — DÉLIER (uncombine)
//  Quand une resa passe de combo → table seule :
//  - Vérifier que la table cible a capMax >= nouveaux couverts
//  - Les autres tables du combo deviennent automatiquement libres
//  - Si mode IA : l'IA peut réattribuer les tables libérées
// ─────────────────────────────────────────────────────────────
export function canUncombine(
  resa: Resa,
  targetTable: Table,
): MoveResult {
  if (targetTable.capMax < resa.c) {
    return {
      valid: false,
      reason: `${targetTable.n} max ${targetTable.capMax}p, resa ${resa.c}p — réduire d'abord les couverts`,
    }
  }
  return { valid: true, newTbl: targetTable.n }
}

// ─────────────────────────────────────────────────────────────
//  RÈGLE 8 — COMBOS POUR UNE TABLE
//  Retourne toutes les combinaisons possibles impliquant
//  une table donnée (pour le menu contextuel combo).
// ─────────────────────────────────────────────────────────────
export function getCombosForTable(
  tableId: string, combos: Combo[]
): Combo[] {
  return combos.filter(c => c.tables.includes(tableId))
}

// ─────────────────────────────────────────────────────────────
//  RÈGLE 9 — TABLE PRÉFÉRÉE (détection automatique)
//  Analyse l'historique des resas d'un client pour trouver
//  la table qu'il prend le plus souvent.
//  Minimum 2 occurrences sur la même table pour détecter.
// ─────────────────────────────────────────────────────────────
export function detectTablePref(
  tel: string, nom: string, prenom: string,
  resas: Resa[],
): string | null {
  const normalize = (s: string) => (s || '').replace(/\s/g, '').toLowerCase()
  const nTel = normalize(tel)
  const nNom = normalize(nom)
  const nPrenom = normalize(prenom)

  // Trouver les resas du même client
  const clientResas = resas.filter(r => {
    if (nTel && nTel.length >= 6 && normalize(r.tel).includes(nTel)) return true
    if (nNom && normalize(r.nom) === nNom && nPrenom && normalize(r.prenom) === nPrenom) return true
    return false
  })

  if (clientResas.length < 2) return null

  // Compter les tables
  const counts: Record<string, number> = {}
  for (const r of clientResas) {
    if (r.tbl) counts[r.tbl] = (counts[r.tbl] || 0) + 1
  }

  // Table la plus fréquente (min 2 fois)
  let best = '', max = 1
  for (const [tbl, cnt] of Object.entries(counts)) {
    if (cnt > max) { best = tbl; max = cnt }
  }
  return best || null
}
