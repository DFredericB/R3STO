// ══════════════════════════════════════════════════
//  R3STO — Lifecycle automatique des résas
//  Auto-noshow : marque les résas en retard comme noshow
//  après un délai configurable par resto, libère la table
//  et déclenche optionnellement un email client.
//
//  Concept R3STO :
//   - retard < délai → 'arrived' attendu (UI peut afficher "en retard")
//   - retard ≥ délai → 'noshow' (table libérée, email selon réglage)
//   - cancelled = annulation manuelle/client (≠ noshow)
// ══════════════════════════════════════════════════

import type { Resa, OptionsData } from '../types'

const DEFAULT_DELAY = 30 // minutes

/** Convertit "HH:mm" + date "YYYY-MM-DD" en timestamp ms (heure locale) */
function resaTimestamp(r: Resa): number | null {
  if (!r.date || !r.t) return null
  const [y, m, d] = r.date.split('-').map(Number)
  const [hh, mm] = r.t.split(':').map(Number)
  if (!y || !m || !d || isNaN(hh) || isNaN(mm)) return null
  return new Date(y, m - 1, d, hh, mm, 0, 0).getTime()
}

/** Retourne true si la résa doit basculer en noshow maintenant */
export function shouldAutoNoshow(r: Resa, opts: OptionsData, now: number = Date.now()): boolean {
  if (!opts.auto_noshow_flag) return false
  if (r.s !== 'reserved') return false // arrived/done/cancelled/noshow/waitlist : on touche pas
  const ts = resaTimestamp(r)
  if (ts == null) return false
  const delay = (opts.auto_noshow_delay_mins ?? DEFAULT_DELAY) * 60 * 1000
  return now - ts >= delay
}

export interface NoshowResult {
  flagged: string[]      // ids des résas passées en noshow
  emailsToSend: string[] // ids pour lesquels un email client doit partir
}

/** Applique l'auto-noshow sur une liste de résas. Pure : ne mute pas. */
export function computeAutoNoshow(
  resas: Resa[],
  opts: OptionsData,
  now: number = Date.now()
): NoshowResult {
  const flagged: string[] = []
  const emailsToSend: string[] = []
  for (const r of resas) {
    if (shouldAutoNoshow(r, opts, now)) {
      flagged.push(r.id)
      if (opts.auto_noshow_email_client) emailsToSend.push(r.id)
    }
  }
  return { flagged, emailsToSend }
}

/** Libère une table (auto-assign R3STO) : retire la résa du store de planning.
 *  Aucune action explicite : un noshow garde son tbl pour l'historique mais
 *  les vues planning/grille filtrent déjà sur s !== 'noshow' && s !== 'cancelled'.
 *  Donc "libérer la table" est implicite via le changement de statut.
 */
export function isTableReleasedFor(r: Resa): boolean {
  return r.s === 'noshow' || r.s === 'cancelled' || r.s === 'done'
}
