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
  // Base (Mini+)
  | 'widget'             // Widget de réservation
  | 'multiSalle'         // Multi-salles
  | 'multiService'       // Multi-services (midi/soir/brunch)
  | 'blacklist'          // Gestion blacklist clients
  | 'crmLight'           // CRM léger (nom/tel/email/historique)
  | 'emailConfirm'       // Email confirmation auto
  | 'annuaireCarat'      // Fiche annuaire + Carat
  // Essentiel+
  | 'plan2D'             // Plan de salle 2D interactif
  | 'antiNoshowStripe'   // Empreinte CB + acomptes
  | 'smsAuto'            // SMS confirmation + rappel
  | 'crmAdvanced'        // CRM avancé (prefs, allergies, VIP, tags)
  | 'loyalty'            // Programme fidélité points
  // Premium+
  | 'autoPilot'          // Pickbest-table IA scoring
  | 'marketing'          // Campagnes email/SMS auto segmentées
  | 'advancedAnalytics'  // Stats avancées + cohortes
  | 'reviewsReply'       // Réponses aux avis
  | 'multiSite2'         // Multi-établissements (2)
  // Signature
  | 'multiSiteUnlimited' // Multi-établissements illimités
  | 'yieldMgmt'          // Yield management revenue optim
  | 'whiteLabel'         // Widget white-label custom branding
  | 'apiAccess'          // API ouverte
  | 'giftCards'          // Bons cadeaux émission
  | 'prepaiement'        // Prépaiement / acomptes groupes
  | 'siteVitrine'        // Site vitrine inclus (sinon = module)
  | 'caratBoost'         // Boost référencement Carat
  | 'sla'                // SLA premium

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

/** Matrice plans × features — source unique de vérité (nouveaux slugs)
 *  LOCKED 2026-05-20 après itérations tarifaires user.
 *  Mini = offre spéciale 19 CHF/mois engagement 3 ans (acquisition + lock-in).
 */
const FEATURES_NEW: Record<PlanNew, PlanFeature[]> = {
  // Mini · OFFRE 19 CHF (3 ans) — calepin numérique pro
  mini: [
    'widget',           // Widget résa (limité aux services configurés)
    'multiSalle',       // Multi-salles
    'multiService',     // Multi-services
    'blacklist',        // Blacklist clients problématiques
    'crmLight',         // CRM léger
    'emailConfirm',     // Email confirmation auto
    'annuaireCarat',    // Fiche annuaire + Carat (gratuit pour tous)
  ],

  // Essentiel · 39 CHF — vraie plateforme avec équipe
  essentiel: [
    'widget', 'multiSalle', 'multiService', 'blacklist', 'crmLight', 'emailConfirm', 'annuaireCarat',
    'plan2D',           // Plan de salle 2D
    'antiNoshowStripe', // Empreinte CB / acomptes
    'smsAuto',          // SMS auto rappels
    'crmAdvanced',      // CRM complet (prefs, VIP)
    'loyalty',          // Fidélité points
  ],

  // Premium · 59 CHF — intelligence + 2 établissements
  premium: [
    'widget', 'multiSalle', 'multiService', 'blacklist', 'crmLight', 'emailConfirm', 'annuaireCarat',
    'plan2D', 'antiNoshowStripe', 'smsAuto', 'crmAdvanced', 'loyalty',
    'autoPilot',          // IA pickBestTable scoring
    'marketing',          // Campagnes auto segments
    'advancedAnalytics',  // Stats avancées
    'reviewsReply',       // Réponses avis
    'multiSite2',         // 2 établissements
  ],

  // Signature · 79 CHF — top, multi-sites illimité + yield
  signature: [
    'widget', 'multiSalle', 'multiService', 'blacklist', 'crmLight', 'emailConfirm', 'annuaireCarat',
    'plan2D', 'antiNoshowStripe', 'smsAuto', 'crmAdvanced', 'loyalty',
    'autoPilot', 'marketing', 'advancedAnalytics', 'reviewsReply',
    'multiSiteUnlimited', // Multi-établissements illimités
    'yieldMgmt',          // Yield management
    'whiteLabel',         // Widget white-label
    'apiAccess',          // API ouverte
    'giftCards',          // Bons cadeaux
    'prepaiement',        // Acomptes groupes
    'siteVitrine',        // Site vitrine inclus
    'caratBoost',         // Boost référencement Carat
    'sla',                // SLA premium
  ],
}

/** Limites numériques par plan (séparées des features pour clarté) */
export const PLAN_LIMITS: Record<PlanNew, {
  maxUsers: number;       // nombre d'utilisateurs autorisés
  maxEstablishments: number;
  trialDays: number;
}> = {
  mini:      { maxUsers: 1,   maxEstablishments: 1,  trialDays: 14 },
  essentiel: { maxUsers: 3,   maxEstablishments: 1,  trialDays: 14 },
  premium:   { maxUsers: 99,  maxEstablishments: 2,  trialDays: 14 },
  signature: { maxUsers: 999, maxEstablishments: 99, trialDays: 14 },
}

/** Matrice étendue (legacy + new) — Proxy qui normalise à la lecture */
export const PLAN_FEATURES = new Proxy({} as Record<Plan, PlanFeature[]>, {
  get(_t, prop: string) {
    return FEATURES_NEW[normalizePlan(prop)]
  },
})

/** Type de billing supporté par chaque plan
 *  Mini = SPECIAL OFFER : uniquement triennial à 19 CHF
 *  Essentiel/Premium/Signature : mensuel + annuel (pas de 3-ans pour rester simple)
 */
export type BillingCycle = 'monthly' | 'yearly' | 'triennial'

/** Metadata d'affichage (canonique) */
const META_NEW: Record<PlanNew, {
  labelKey: string;
  label: string;
  priceChf: number;       // prix mensuel d'affichage (Mini = 19 special offer)
  priceYearly: number;    // prix annuel/mois (Mini = 19 aussi puisque triennial only)
  priceTriennial: number; // prix sur 3 ans (Mini = 19)
  availableBillings: BillingCycle[];
  isSpecialOffer: boolean;
  color: string;
}> = {
  mini: {
    labelKey: 'plan.mini', label: 'Mini',
    priceChf: 19, priceYearly: 19, priceTriennial: 19,
    availableBillings: ['triennial'], // ⭐ UNIQUEMENT 3 ans
    isSpecialOffer: true,
    color: 'var(--t3)',
  },
  essentiel: {
    labelKey: 'plan.essentiel', label: 'Essentiel',
    priceChf: 39, priceYearly: 35, priceTriennial: 35,
    availableBillings: ['monthly', 'yearly'],
    isSpecialOffer: false,
    color: 'var(--t2)',
  },
  premium: {
    labelKey: 'plan.premium', label: 'Premium',
    priceChf: 59, priceYearly: 53, priceTriennial: 53,
    availableBillings: ['monthly', 'yearly'],
    isSpecialOffer: false,
    color: 'var(--bl)',
  },
  signature: {
    labelKey: 'plan.signature', label: 'Signature',
    priceChf: 79, priceYearly: 71, priceTriennial: 71,
    availableBillings: ['monthly', 'yearly'],
    isSpecialOffer: false,
    color: 'var(--or)',
  },
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
