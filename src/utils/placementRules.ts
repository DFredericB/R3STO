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
//  Si slot + durationMins fournis → vérifie le chevauchement
//  (une table occupée de 19h à 20h30 est libre à 20h30+).
//  Sans slot → comportement legacy (tout le service).
// ─────────────────────────────────────────────────────────────
function _hmToMins(t: string): number {
  const [h, m] = t.replace('h', ':').split(':').map(Number)
  return h * 60 + (m || 0)
}

export function getOccupiedTableIds(
  resas: Resa[], date: string, svc: string,
  excludeResaId?: string, slot?: string, durationMins?: number
): Set<string> {
  const ids = new Set<string>()
  const slotM = slot ? _hmToMins(slot) : null
  const dur = durationMins || 90
  for (const r of resas) {
    if (r.date !== date || r.svc !== svc) continue
    if (excludeResaId && r.id === excludeResaId) continue
    if (!isOccupying(r)) continue
    // Vérification de chevauchement si créneau spécifié
    if (slotM !== null && r.t) {
      const resaM = _hmToMins(r.t)
      // Pas de chevauchement si la nouvelle résa commence après la fin
      // de l'existante OU si l'existante commence après la fin de la nouvelle
      if (slotM >= resaM + dur || resaM >= slotM + dur) continue
    }
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
  tables: Table[], resas: Resa[], date: string, svc: string,
  excludeResaId?: string, slot?: string, durationMins?: number
): Table[] {
  const occupied = getOccupiedTableIds(resas, date, svc, excludeResaId, slot, durationMins)
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
  date: string, svc: string, excludeResaId?: string,
  slot?: string, durationMins?: number
): Combo[] {
  const free = getFreeTables(tables, resas, date, svc, excludeResaId, slot, durationMins)
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

// ═════════════════════════════════════════════════════════════
//  ██ RÈGLE 4b — ANTI-OVERBOOKING (CRITIQUE) ██
//
//  AUCUNE réservation ne doit dépasser la capacité physique
//  réellement disponible sur le service.
//
//  Plafond effectif = min(
//    maxCapFree,       ← plus grande table/combo libre
//    remainingCvt      ← couverts restants avant maxCouverts du service
//  )
//
//  Cette règle s'applique à TOUS les canaux :
//    - ModalResa (app interne)
//    - Resas.tsx (édition inline)
//    - Widget public (réservation en ligne)
//    - API / intégrations futures
//
//  Le sélecteur de couverts DOIT bloquer au-delà de ce plafond.
//  Les boutons au-delà sont désactivés (not-allowed) et barrés.
//
//  ⚠️  NE JAMAIS CONTOURNER CETTE RÈGLE — risque de surbooking !
// ═════════════════════════════════════════════════════════════
export function getEffectiveMaxCovers(
  tables: Table[], combos: Combo[], resas: Resa[],
  date: string, svc: string, serviceMaxCvt: number,
  excludeResaId?: string
): number {
  const maxCapFree = getMaxCapacity(tables, combos, resas, date, svc, excludeResaId)
  const svcResas = resas.filter(r =>
    r.date === date && r.svc === svc && r.s !== 'cancelled' && r.s !== 'noshow'
    && (!excludeResaId || r.id !== excludeResaId)
  )
  const totalCvt = svcResas.reduce((s, r) => s + r.c, 0)
  const remainingCvt = Math.max(0, serviceMaxCvt - totalCvt)
  // Le plafond effectif = le plus petit des deux limites
  const effective = maxCapFree > 0
    ? Math.min(maxCapFree, remainingCvt)
    : remainingCvt
  return Math.max(effective, 0)
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
  _combos: Combo[],
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
// ─────────────────────────────────────────────────────────────
//  RÈGLE 6a — SMART LAST PLACEMENTS (anti-gaspillage)
//  Quand le service se remplit, éviter de placer N couverts
//  sur une table de capacité >> N si c'est l'une des dernières
//  grandes tables disponibles.
//
//  Score de gaspillage = (capMax - covers) / capMax
//  Seuil d'alerte : >50% de gaspillage ET <30% de tables libres
//
//  Retourne un objet avec :
//  - table: la table recommandée (ou null)
//  - warning: message d'alerte si gaspillage détecté
//  - wastePercent: pourcentage de gaspillage
//  - fillPercent: taux de remplissage du service
//  - suggestion: texte pour le restaurateur
// ─────────────────────────────────────────────────────────────
export interface SmartPlacementResult {
  table: string | null
  warning: string | null
  wastePercent: number       // 0-100, gaspillage de la table choisie
  fillPercent: number        // 0-100, remplissage du service
  suggestion: string | null  // conseil actionnable
  shouldWaitlist: boolean    // recommander waitlist plutôt que placer
  alternativeTable: string | null  // meilleure alternative si gaspillage
}

export function smartPlacement(
  covers: number,
  date: string,
  svc: string,
  tables: Table[],
  combos: Combo[],
  resas: Resa[],
  tablePref?: string,
  excludeResaId?: string,
  salleFilter?: string,
): SmartPlacementResult {
  const activeTables = tables.filter(t => t.active && !t.blocked)
    .filter(t => !salleFilter || salleFilter === 'toutes' || t.salle === salleFilter)
  const totalTables = activeTables.length
  const free = getFreeTables(tables, resas, date, svc, excludeResaId)
    .filter(t => !salleFilter || salleFilter === 'toutes' || t.salle === salleFilter)
  const freeCount = free.length
  const fillPercent = totalTables > 0 ? Math.round(((totalTables - freeCount) / totalTables) * 100) : 0

  // Placement standard (Règle 6)
  const chosenTable = iaPlacement(covers, date, svc, tables, combos, resas, tablePref, excludeResaId, salleFilter)
  if (!chosenTable) {
    return { table: null, warning: null, wastePercent: 0, fillPercent, suggestion: null, shouldWaitlist: false, alternativeTable: null }
  }

  // Calculer la capacité de la table choisie
  let chosenCap = 0
  if (chosenTable.includes('+')) {
    const combo = combos.find(c => c.label === chosenTable)
    chosenCap = combo?.cap ?? 0
  } else {
    const t = tables.find(t => t.n === chosenTable)
    chosenCap = t?.capMax ?? 0
  }

  const wastePercent = chosenCap > 0 ? Math.round(((chosenCap - covers) / chosenCap) * 100) : 0

  // Seuils : gaspillage significatif quand service presque plein
  const isHighFill = fillPercent >= 70
  const isHighWaste = wastePercent >= 50 && (chosenCap - covers) >= 2
  const isLastLargeTable = free.filter(t => t.capMax >= 4).length <= 2

  let warning: string | null = null
  let suggestion: string | null = null
  let shouldWaitlist = false
  let alternativeTable: string | null = null

  if (isHighFill && isHighWaste && isLastLargeTable) {
    // Chercher une alternative avec moins de gaspillage
    // Tables libres capables mais avec capMax plus proche de covers
    const betterFit = free
      .filter(t => t.capMax >= covers && t.n !== chosenTable)
      .sort((a, b) => a.capMax - b.capMax)
    const bestAlt = betterFit.find(t => ((t.capMax - covers) / t.capMax) < 0.5)

    if (bestAlt) {
      alternativeTable = bestAlt.n
      warning = `⚠️ ${chosenTable} (${chosenCap}p) gaspille ${wastePercent}% avec ${covers}p — ${bestAlt.n} (${bestAlt.capMax}p) serait plus adapté`
      suggestion = `Préférer ${bestAlt.n} pour préserver ${chosenTable} pour un groupe plus grand`
    } else {
      // Pas d'alternative → recommander waitlist si remplissage très élevé
      if (fillPercent >= 85) {
        shouldWaitlist = true
        warning = `⚠️ Service rempli à ${fillPercent}% — placer ${covers}p sur ${chosenTable} (${chosenCap}p) gaspille ${wastePercent}% de capacité`
        suggestion = `Envisager la liste d'attente pour préserver ${chosenTable} pour un groupe de ${chosenCap}p`
      } else {
        warning = `⚠️ ${chosenTable} (${chosenCap}p) est une des dernières grandes tables — ${covers}p = ${wastePercent}% de gaspillage`
        suggestion = `Dernières grandes tables disponibles — placement optimisé recommandé`
      }
    }
  }

  return {
    table: alternativeTable || chosenTable,
    warning,
    wastePercent,
    fillPercent,
    suggestion,
    shouldWaitlist,
    alternativeTable,
  }
}

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
  slot?: string,
  durationMins?: number,
): string | null {
  const free = getFreeTables(tables, resas, date, svc, excludeResaId, slot, durationMins)
    .filter(t => !salleFilter || salleFilter === 'toutes' || t.salle === salleFilter)
  const freeCombos = getFreeCombos(combos, tables, resas, date, svc, excludeResaId, slot, durationMins)

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

  // 2. Plus petite table simple suffisante (tri par priority croissant en second)
  const candidates = free
    .filter(t => t.capMax >= covers)
    .sort((a, b) => a.capMax - b.capMax || a.priority - b.priority)
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
