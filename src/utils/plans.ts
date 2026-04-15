// ══════════════════════════════════════════════════
//  R3STO — Plans & features matrix (centralisé)
//  Plus de `if (plan === 'gastro')` éparpillé : utiliser
//  isPlanEligible(feature) partout.
//  En démo : tout retourne true (démo = miroir app complet).
// ══════════════════════════════════════════════════

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

/** Matrice plans × features — source unique de vérité */
export const PLAN_FEATURES: Record<Plan, PlanFeature[]> = {
  bistro: ['widget', 'loyalty'],
  resto:  ['widget', 'loyalty', 'marketing', 'giftCards', 'reviewsReply'],
  gastro: ['widget', 'loyalty', 'marketing', 'giftCards', 'reviewsReply',
           'multiSite', 'advancedAnalytics', 'apiAccess', 'whiteLabel'],
}

export const PLAN_META: Record<Plan, { labelKey: string; priceChf: number; color: string }> = {
  bistro: { labelKey: 'plan.bistro', priceChf: 39, color: 'var(--t2)' },
  resto:  { labelKey: 'plan.resto',  priceChf: 59, color: 'var(--bl)' },
  gastro: { labelKey: 'plan.gastro', priceChf: 79, color: 'var(--or)' },
}

/** Hook/selector : la feature est-elle accessible dans le plan courant ? */
export function isPlanEligible(feature: PlanFeature): boolean {
  const { isDemo, resto } = useAppStore.getState()
  if (isDemo) return true // démo = miroir app, tout débloqué
  const plan = (resto?.plan || 'bistro') as Plan
  return PLAN_FEATURES[plan]?.includes(feature) ?? false
}

/** Le plan A couvre-t-il ≥ plan B ? (pour affichage gates UI) */
const PLAN_RANK: Record<Plan, number> = { bistro: 1, resto: 2, gastro: 3 }
export function planAtLeast(minimum: Plan): boolean {
  const { isDemo, resto } = useAppStore.getState()
  if (isDemo) return true
  const current = (resto?.plan || 'bistro') as Plan
  return PLAN_RANK[current] >= PLAN_RANK[minimum]
}
