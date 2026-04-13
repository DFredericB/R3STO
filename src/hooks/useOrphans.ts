/**
 * useOrphans — Hook global de détection de réservations orphelines.
 *
 * Détecte les résas dont la table a été supprimée, désactivée ou dont
 * la capacité est devenue insuffisante. Fournit aussi l'auto-réassignment IA.
 *
 * Utilisé dans : Grille, Agenda, Journal, Plan, Dashboard (bannière).
 */
import { useMemo } from 'react'
import { useAppStore } from '../store/useAppStore'
import type { Resa, Table, Combo } from '../types'
import { isOccupying, iaPlacement } from '../utils/placementRules'

export interface OrphanResa {
  resa: Resa
  reason: string
  autoTarget: string | null
}

/**
 * Détecte les résas orphelines pour une date et un service donnés.
 * Si `svc` est omis, scanne TOUS les services de la date.
 */
export function detectOrphans(
  resas: Resa[], tables: Table[], combos: Combo[],
  date: string, svc?: string,
): OrphanResa[] {
  const orphans: OrphanResa[] = []
  const svcResas = resas.filter(r =>
    r.date === date &&
    (svc ? r.svc === svc : true) &&
    (isOccupying(r) || r.s === 'waitlist')
  )

  for (const r of svcResas) {
    if (!r.tbl) {
      // Résa sans table et pas en waitlist → orpheline
      if (r.s !== 'waitlist') {
        const autoTarget = iaPlacement(r.c, date, r.svc, tables, combos, resas, undefined, r.id)
        orphans.push({ resa: r, reason: 'Aucune table assignée', autoTarget })
      }
      continue
    }

    let reason = ''

    if (r.tbl.includes('+')) {
      const combo = combos.find(c => c.label === r.tbl ||
        c.tables.map(id => tables.find(t => t.id === id)?.n).filter(Boolean).join('+') === r.tbl)
      if (!combo) {
        reason = `Combo "${r.tbl}" supprimé`
      } else {
        const cap = combo.capOverride ?? combo.cap
        if (cap < r.c) reason = `Combo "${r.tbl}" capacité réduite (${cap}p < ${r.c}p)`
      }
    } else {
      const tbl = tables.find(t => t.n === r.tbl)
      if (!tbl) {
        reason = `Table "${r.tbl}" supprimée`
      } else if (!tbl.active) {
        reason = `Table "${r.tbl}" désactivée`
      } else if (tbl.blocked) {
        reason = `Table "${r.tbl}" bloquée`
      } else if (tbl.capMax < r.c) {
        reason = `Table "${r.tbl}" capacité réduite (${tbl.capMax}p < ${r.c}p)`
      }
    }

    if (reason) {
      const autoTarget = iaPlacement(r.c, date, r.svc, tables, combos, resas, undefined, r.id)
      orphans.push({ resa: r, reason, autoTarget })
    }
  }
  return orphans
}

/**
 * Réassigne automatiquement toutes les orphelines qui ont un autoTarget.
 */
export function autoReassignOrphans(
  orphans: OrphanResa[],
  updateResa: (id: string, patch: Partial<Resa>) => void,
): number {
  let count = 0
  for (const o of orphans) {
    if (o.autoTarget) {
      updateResa(o.resa.id, { tbl: o.autoTarget })
      count++
    }
  }
  return count
}

/**
 * Hook React — retourne les orphelines de la date active (tous services).
 */
export function useOrphans() {
  const resas = useAppStore(s => s.resas)
  const tables = useAppStore(s => s.tables)
  const combos = useAppStore(s => s.combos)
  const activeDate = useAppStore(s => s.activeDate)
  const updateResa = useAppStore(s => s.updateResa)

  const orphans = useMemo(
    () => detectOrphans(resas, tables, combos, activeDate),
    [resas, tables, combos, activeDate]
  )

  const autoReassign = () => autoReassignOrphans(orphans, updateResa)

  const orphansWithTarget = orphans.filter(o => o.autoTarget)
  const orphansWithoutTarget = orphans.filter(o => !o.autoTarget)

  return { orphans, orphansWithTarget, orphansWithoutTarget, autoReassign, count: orphans.length }
}
