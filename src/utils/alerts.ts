// ══════════════════════════════════════════════════
//  R3STO — Alertes globales
//  Calcule les compteurs d'alertes pour toutes les vues
//  Utilisé par : Sidebar badges, Bandeau alertes global
// ══════════════════════════════════════════════════

import type { Resa } from '../types'

export interface AlertCounts {
  waitlist: number      // résas en attente de confirmation
  groups: number        // groupes (≥6 couverts) non confirmés
  unassigned: number    // résas sans table assignée (tbl vide)
  noshow: number        // no-shows du jour
  arriving: number      // résas arrivant dans les 30 prochaines minutes
}

export function computeAlerts(resas: Resa[], date: string): AlertCounts {
  const dayResas = resas.filter(r => r.date === date)

  const waitlist = dayResas.filter(r => r.s === 'waitlist').length
  const groups = dayResas.filter(r => r.c >= 6 && (r.s === 'reserved' || r.s === 'waitlist')).length
  const unassigned = dayResas.filter(r => (r.s === 'reserved' || r.s === 'waitlist') && !r.tbl).length
  const noshow = dayResas.filter(r => r.s === 'noshow').length

  // Résas arrivant dans les 30 prochaines minutes
  const now = new Date()
  const nowMins = now.getHours() * 60 + now.getMinutes()
  const arriving = dayResas.filter(r => {
    if (r.s !== 'reserved') return false
    const parts = r.t.split(/[h:]/)
    const m = parseInt(parts[0]) * 60 + parseInt(parts[1] || '0')
    return m >= nowMins && m <= nowMins + 30
  }).length

  return { waitlist, groups, unassigned, noshow, arriving }
}
