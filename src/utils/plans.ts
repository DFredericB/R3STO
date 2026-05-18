// ══════════════════════════════════════════════════════════════════
//  R3STO — Plans & features matrix (centralisé)
//  5 plans : mini · mini_plus · bistro · resto · gastro
//  Aliases marketing : bistro→Essentiel, resto→Premium, gastro→Signature
//  Mini & Mini+ = mode "Light" (UI épurée pour petits restos)
//  En démo : tout retourne true (démo = miroir app complet).
// ══════════════════════════════════════════════════════════════════

import { useAppStore } from '../store/useAppStore'

export type Plan = 'mini' | 'mini_plus' | 'bistro' | 'resto' | 'gastro'

/** Plans considérés comme "Light" (UI épurée, modules limités) */
export const LIGHT_PLANS: ReadonlySet<Plan> = new Set(['mini', 'mini_plus'])

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
  // Mini · 19 CHF — l'essentiel pour démarrer (Light)
  mini: ['widget'],

  // Mini+ · 29 CHF — + anti no-show Stripe + loyalty (Light)
  mini_plus: ['widget', 'antiNoshowStripe', 'loyalty'],

  // Bistro (Essentiel) · 39 CHF — CRM, plan de salle, menu (full UI)
  bistro: ['widget', 'antiNoshowStripe', 'loyalty', 'reviewsReply'],

  // Resto (Premium) · 59 CHF — + marketing, cartes cadeaux, analytics
  resto: ['widget', 'antiNoshowStripe', 'loyalty', 'reviewsReply',
          'marketing', 'giftCards', 'advancedAnalytics'],

  // Gastro (Signature) · 79 CHF — tout + multi-sites, site web, API
  gastro: ['widget', 'antiNoshowStripe', 'loyalty', 'reviewsReply',
           'marketing', 'giftCards', 'advancedAnalytics',
           'multiSite', 'apiAccess', 'whiteLabel'],
}

/** Metadata d'affichage pour chaque plan (label marketing + prix) */
export const PLAN_META: Record<Plan, { labelKey: string; label: string; priceChf: number; color: string; isLight: boolean }> = {
  mini:      { labelKey: 'plan.mini',      label: 'Mini',      priceChf: 19, color: 'var(--t3)', isLight: true  },
  mini_plus: { labelKey: 'plan.mini_plus', label: 'Mini+',     priceChf: 29, color: 'var(--t3)', isLight: true  },
  bistro:    { labelKey: 'plan.bistro',    label: 'Essentiel', priceChf: 39, color: 'var(--t2)', isLight: false },
  resto:     { labelKey: 'plan.resto',     label: 'Premium',   priceChf: 59, color: 'var(--bl)', isLight: false },
  gastro:    { labelKey: 'plan.gastro',    label: 'Signature', priceChf: 79, color: 'var(--or)', isLight: false },
}

/** Rang ordinal pour comparaison ≥ */
const PLAN_RANK: Record<Plan, number> = {
  mini: 1, mini_plus: 2, bistro: 3, resto: 4, gastro: 5,
}

/** Plan courant de l'utilisateur (avec fallback safe sur 'bistro' si plan inconnu) */
export function currentPlan(): Plan {
  const { isDemo, resto } = useAppStore.getState()
  if (isDemo) return 'gastro' // démo = tout débloqué
  const p = resto?.plan as string | undefined
  if (p && p in PLAN_RANK) return p as Plan
  return 'bistro' // fallback safe (anciens comptes sans plan défini)
}

/** Hook/selector : la feature est-elle accessible dans le plan courant ? */
export function isPlanEligible(feature: PlanFeature): boolean {
  const { isDemo } = useAppStore.getState()
  if (isDemo) return true
  return PLAN_FEATURES[currentPlan()]?.includes(feature) ?? false
}

/** Le plan courant couvre-t-il ≥ plan B ? (pour affichage gates UI) */
export function planAtLeast(minimum: Plan): boolean {
  const { isDemo } = useAppStore.getState()
  if (isDemo) return true
  return PLAN_RANK[currentPlan()] >= PLAN_RANK[minimum]
}

/** Le compte est-il en mode Light (UI épurée Mini / Mini+) ? */
export function isLightMode(): boolean {
  const { isDemo } = useAppStore.getState()
  if (isDemo) return false // démo = full
  return LIGHT_PLANS.has(currentPlan())
}

/** Plan suivant disponible pour upgrade (null si déjà au max) */
export function nextPlan(): Plan | null {
  const cur = currentPlan()
  const sorted: Plan[] = ['mini', 'mini_plus', 'bistro', 'resto', 'gastro']
  const idx = sorted.indexOf(cur)
  return idx >= 0 && idx < sorted.length - 1 ? sorted[idx + 1] : null
}
