// ══════════════════════════════════════════════════════════════════
//  R3STO PRO — Plans & features matrix
//  4 packages : mini · essentiel · premium · signature
//  Locked pricing 2026-05: 29 / 39 / 59 / 79 CHF mensuel
//
//  Rétrocompat : les anciens slugs (bistro/resto/gastro) sont mappés
//  vers les nouveaux (essentiel/premium/signature). Toutes les fonctions
//  acceptent les 7 slugs (4 nouveaux + 3 legacy + 'free').
//
//  En démo : tout retourne true (démo = miroir app complet).
// ══════════════════════════════════════════════════════════════════

import { useAppStore } from '../store/useAppStore'

// Slug canonique (nouveau)
export type PlanNew = 'mini' | 'essentiel' | 'premium' | 'signature'
// Slug legacy (encore dans certains fichiers)
export type PlanLegacy = 'bistro' | 'resto' | 'gastro' | 'free'
// Union large pour accepter les deux partout
export type Plan = PlanNew | PlanLegacy

export type PlanFeature =
  | 'multiSalle'
  | 'multiSite'
  | 'autoPilot'
  | 'marketing'
  | 'loyalty'
  | 'widget'
  | 'advancedAnalytics'
  | 'apiAccess'
  | 'whiteLabel'
  | 'giftCards'
  | 'reviewsReply'
  | 'antiNoshowStripe'
  | 'yieldMgmt'

/** Mapping des anciens slugs DB vers les nouveaux */
const LEGACY_ALIAS: Record<string, PlanNew> = {
  bistro: 'essentiel',
  resto:  'premium',
  gastro: 'signature',
  free:   'mini',
}

/** Rang ordinal pour comparaison ≥ (uniquement nouveaux slugs) */
const PLAN_RANK: Record<PlanNew, number> = { mini: 1, essentiel: 2, premium: 3, signature: 4 }

/** Normalise un plan venant de la DB (peut être un ancien slug) */
export function normalizePlan(raw: unknown): PlanNew {
  const s = String(raw || '').toLowerCase()
  if (s in PLAN_RANK) return s as PlanNew
  if (s in LEGACY_ALIAS) return LEGACY_ALIAS[s]
  return 'essentiel'
}

/** Matrice plans × features — source unique de vérité (nouveaux slugs) */
const FEATURES_NEW: Record<PlanNew, PlanFeature[]> = {
  // Mini · 29 CHF — environnement unique simple, mono-salle
  mini: ['widget'],

  // Essentiel · 39 CHF — multi-salles, CRM, plan, menu, widget
  essentiel: ['widget', 'multiSalle', 'antiNoshowStripe', 'loyalty', 'reviewsReply'],

  // Premium · 59 CHF — + auto-pilot, marketing, cartes cadeaux, analytics
  premium: ['widget', 'multiSalle', 'antiNoshowStripe', 'loyalty', 'reviewsReply',
            'autoPilot', 'marketing', 'giftCards', 'advancedAnalytics'],

  // Signature · 79 CHF — tout + multi-sites, yield, API, white-label
  signature: ['widget', 'multiSalle', 'antiNoshowStripe', 'loyalty', 'reviewsReply',
              'autoPilot', 'marketing', 'giftCards', 'advancedAnalytics',
              'multiSite', 'apiAccess', 'whiteLabel', 'yieldMgmt'],
}

/** Matrice étendue (legacy + new) — Proxy qui normalise à la lecture */
export const PLAN_FEATURES = new Proxy({} as Record<Plan, PlanFeature[]>, {
  get(_t, prop: string) {
    return FEATURES_NEW[normalizePlan(prop)]
  },
})

/** Metadata d'affichage (canonique) */
const META_NEW: Record<PlanNew, {
  labelKey: string;
  label: string;
  priceChf: number;
  priceYearly: number;
  priceTriennial: number;
  color: string;
}> = {
  mini:      { labelKey: 'plan.mini',      label: 'Mini',      priceChf: 29, priceYearly: 26, priceTriennial: 19, color: 'var(--t3)' },
  essentiel: { labelKey: 'plan.essentiel', label: 'Essentiel', priceChf: 39, priceYearly: 35, priceTriennial: 29, color: 'var(--t2)' },
  premium:   { labelKey: 'plan.premium',   label: 'Premium',   priceChf: 59, priceYearly: 53, priceTriennial: 44, color: 'var(--bl)' },
  signature: { labelKey: 'plan.signature', label: 'Signature', priceChf: 79, priceYearly: 71, priceTriennial: 59, color: 'var(--or)' },
}

/** PLAN_META accessible avec n'importe quel slug (legacy ou nouveau) */
export const PLAN_META = new Proxy({} as Record<Plan, typeof META_NEW[PlanNew]>, {
  get(_t, prop: string) {
    return META_NEW[normalizePlan(prop)]
  },
})

/** Plan courant de l'utilisateur (normalisé) */
export function currentPlan(): PlanNew {
  const { isDemo, resto } = useAppStore.getState()
  if (isDemo) return 'signature'
  return normalizePlan(resto?.plan)
}

/** Hook/selector : la feature est-elle accessible dans le plan courant ? */
export function isPlanEligible(feature: PlanFeature): boolean {
  const { isDemo } = useAppStore.getState()
  if (isDemo) return true
  return FEATURES_NEW[currentPlan()]?.includes(feature) ?? false
}

/** Le plan courant couvre-t-il ≥ plan minimum ? */
export function planAtLeast(minimum: Plan): boolean {
  const { isDemo } = useAppStore.getState()
  if (isDemo) return true
  return PLAN_RANK[currentPlan()] >= PLAN_RANK[normalizePlan(minimum)]
}

/** Plan suivant disponible pour upgrade (null si déjà au max) */
export function nextPlan(): PlanNew | null {
  const cur = currentPlan()
  const sorted: PlanNew[] = ['mini', 'essentiel', 'premium', 'signature']
  const idx = sorted.indexOf(cur)
  return idx >= 0 && idx < sorted.length - 1 ? sorted[idx + 1] : null
}

/** Liste ordonnée (pour pricing pages) */
export const PLAN_ORDER: PlanNew[] = ['mini', 'essentiel', 'premium', 'signature']
