// ══════════════════════════════════════════════════════════════════
//  R3STO PRO — Plans & features matrix (l'app principale)
//  3 packages : bistro (Essentiel) · resto (Premium) · gastro (Signature)
//
//  NOTE : R3STO Light (Mini + Mini+) est une ENTITÉ DISTINCTE avec
//  sa propre app et sa propre config. Pas géré dans cette codebase.
//  → app.r3sto.com  = Pro (cette codebase)
//  → light.r3sto.com = Light (autre build / autre repo)
//
//  En démo : tout retourne true (démo = miroir app complet).
// ══════════════════════════════════════════════════════════════════

import { useAppStore } from '../store/useAppStore'

export type Plan = 'bistro' | 'resto' | 'gastro'

export type PlanFeature =
  | 'multiSite'
  | 'marketing'
  | 'loyalty'
  | 'widget'
  | 'advancedAnalytics'
  | 'apiAccess'
  | 'whiteLabel'
  | 'giftCards'
  | 'reviewsReply'
  | 'antiNoshowStripe'

/** Matrice plans × features — source unique de vérité */
export const PLAN_FEATURES: Record<Plan, PlanFeature[]> = {
  // Bistro (Essentiel) · 39 CHF — CRM complet, plan de salle, menu
  bistro: ['widget', 'antiNoshowStripe', 'loyalty', 'reviewsReply'],

  // Resto (Premium) · 59 CHF — + marketing, cartes cadeaux, analytics
  resto: ['widget', 'antiNoshowStripe', 'loyalty', 'reviewsReply',
          'marketing', 'giftCards', 'advancedAnalytics'],

  // Gastro (Signature) · 79 CHF — tout + multi-sites, site web, API
  gastro: ['widget', 'antiNoshowStripe', 'loyalty', 'reviewsReply',
           'marketing', 'giftCards', 'advancedAnalytics',
           'multiSite', 'apiAccess', 'whiteLabel'],
}

/** Metadata d'affichage — labels marketing 2026 (slugs DB inchangés pour rétrocompat) */
export const PLAN_META: Record<Plan, { labelKey: string; label: string; priceChf: number; color: string }> = {
  bistro: { labelKey: 'plan.bistro', label: 'Essentiel', priceChf: 39, color: 'var(--t2)' },
  resto:  { labelKey: 'plan.resto',  label: 'Premium',   priceChf: 59, color: 'var(--bl)' },
  gastro: { labelKey: 'plan.gastro', label: 'Signature', priceChf: 79, color: 'var(--or)' },
}

/** Rang ordinal pour comparaison ≥ */
const PLAN_RANK: Record<Plan, number> = { bistro: 1, resto: 2, gastro: 3 }

/** Plan courant de l'utilisateur (avec fallback safe) */
export function currentPlan(): Plan {
  const { isDemo, resto } = useAppStore.getState()
  if (isDemo) return 'gastro' // démo = tout débloqué
  const p = resto?.plan as string | undefined
  if (p && p in PLAN_RANK) return p as Plan
  return 'bistro' // fallback safe
}

/** Hook/selector : la feature est-elle accessible dans le plan courant ? */
export function isPlanEligible(feature: PlanFeature): boolean {
  const { isDemo } = useAppStore.getState()
  if (isDemo) return true
  return PLAN_FEATURES[currentPlan()]?.includes(feature) ?? false
}

/** Le plan A couvre-t-il ≥ plan B ? (pour affichage gates UI) */
export function planAtLeast(minimum: Plan): boolean {
  const { isDemo } = useAppStore.getState()
  if (isDemo) return true
  return PLAN_RANK[currentPlan()] >= PLAN_RANK[minimum]
}

/** Plan suivant disponible pour upgrade (null si déjà au max) */
export function nextPlan(): Plan | null {
  const cur = currentPlan()
  const sorted: Plan[] = ['bistro', 'resto', 'gastro']
  const idx = sorted.indexOf(cur)
  return idx >= 0 && idx < sorted.length - 1 ? sorted[idx + 1] : null
}
