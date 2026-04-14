/**
 * R3STO — Stripe Integration
 *
 * Config, Price IDs, and Checkout helpers.
 *
 * SETUP:
 * 1. Add VITE_STRIPE_PUBLIC_KEY to your .env
 * 2. Replace the price_xxx IDs below with real ones from your Stripe dashboard
 * 3. Deploy the api/ serverless endpoints (Vercel, Netlify, or standalone Express)
 */

// @ts-ignore
import { loadStripe, type Stripe } from '@stripe/stripe-js'

// ── Stripe public key (test vs live) ──
const STRIPE_PUBLIC_KEY = import.meta.env.VITE_STRIPE_PUBLIC_KEY as string || ''
if (!STRIPE_PUBLIC_KEY && typeof window !== 'undefined') {
  console.error('[R3STO] VITE_STRIPE_PUBLIC_KEY manquante — paiements désactivés')
}

// ── Singleton Stripe instance ──
let stripePromise: Promise<Stripe | null> | null = null
export function getStripe() {
  if (!stripePromise) {
    stripePromise = loadStripe(STRIPE_PUBLIC_KEY)
  }
  return stripePromise
}

// ── Plan definitions ──
export type PlanId = 'bistro' | 'resto' | 'gastro'

export interface PlanConfig {
  name: string
  priceMonthly: number   // CHF displayed per month
  priceAnnual: number    // CHF billed annually
  stripePriceId: string  // Stripe Price ID (annual)
  color: string
  features: string[]
}

/**
 * Replace `price_xxx` with the real Price IDs from your Stripe dashboard:
 *   Dashboard → Produits → R3STO → each price has an ID like price_1Qx...
 */
export const PLANS: Record<PlanId, PlanConfig> = {
  bistro: {
    name: 'Bistro',
    priceMonthly: 39,
    priceAnnual: 468,
    stripePriceId: 'price_1TFWg9906pQ0p9GXfDcLAi20',
    color: 'var(--gn)',
    features: [
      'Grille interactive',
      'Agenda & Journal',
      'Dashboard temps réel',
      'Nouvelle résa rapide',
      'Services & Salles',
      'Fermetures exceptionnelles',
      'Notifications email',
      'Export CSV',
      '1 utilisateur',
      'Support dédié',
    ],
  },
  resto: {
    name: 'Resto',
    priceMonthly: 59,
    priceAnnual: 708,
    stripePriceId: 'price_1TFWg9906pQ0p9GXtwaDm2PV',
    color: 'var(--bl)',
    features: [
      'Tout Bistro +',
      'Plan 2D interactif',
      'Tables & Combos',
      'Waitlist intelligente',
      'Groupes & événements',
      'CRM complet',
      'Widget réservation',
      'Menu digital & QR',
      'Bons cadeaux',
      'Marketplace',
      'Rôles illimités',
      'Support dédié',
    ],
  },
  gastro: {
    name: 'Gastro',
    priceMonthly: 79,
    priceAnnual: 948,
    stripePriceId: 'price_1TFWg9906pQ0p9GX98TbpANS',
    color: 'var(--am)',
    features: [
      'Tout Resto +',
      'Avis clients',
      'Site vitrine',
      'Prépaiement & acomptes',
      'Multi-sites (jusqu\'à 12)',
      'IA optimisation',
      'Notifications SMS',
      'Rapports avancés',
      'Marketplace premium',
      'API REST',
      'Support dédié + SLA',
    ],
  },
}

// ── Plan gating ──
export const PLAN_LEVEL: Record<PlanId, number> = { bistro: 1, resto: 2, gastro: 3 }
export function hasPlan(current: PlanId | undefined, required: PlanId): boolean {
  return PLAN_LEVEL[current || 'bistro'] >= PLAN_LEVEL[required]
}

// ── Module Add-on definitions ──
export type ModuleId = 'order' | 'cash' | 'delivery'

export interface ModuleConfig {
  name: string
  priceMonthly: number
  priceAnnual: number
  stripePriceId: string   // TODO: create in Stripe and replace
  color: string
  icon: string
  description: string
  features: string[]
}

export const MODULES: Record<ModuleId, ModuleConfig> = {
  order: {
    name: 'Order',
    priceMonthly: 25,
    priceAnnual: 300,
    stripePriceId: '', // TODO: Stripe Price ID à créer
    color: 'var(--am)',
    icon: '📋',
    description: 'Commandes QR code à table',
    features: [
      'Menu digital multi-langues',
      'QR code à table',
      'Envoi en cuisine en temps réel',
      'Paiement à table',
      'Supplément & commentaires',
      'Historique commandes',
    ],
  },
  cash: {
    name: 'Cash',
    priceMonthly: 19,
    priceAnnual: 228,
    stripePriceId: '', // TODO: Stripe Price ID à créer
    color: 'var(--gn)',
    icon: '💳',
    description: 'Bons cadeaux & fidélité',
    features: [
      'Bons cadeaux personnalisés',
      'Programme fidélité par points',
      'Facturation complète',
      'Export comptable',
      'Paiement en ligne',
      'Tableau de bord financier',
    ],
  },
  delivery: {
    name: 'Delivery',
    priceMonthly: 29,
    priceAnnual: 348,
    stripePriceId: '', // TODO: Stripe Price ID à créer
    color: 'var(--rd)',
    icon: '🛵',
    description: 'Click & collect + livraison',
    features: [
      'Click & collect',
      'Livraison avec zones',
      'Frais de livraison par zone',
      'Suivi temps réel',
      'Intégration livreurs',
      'Créneaux horaires',
    ],
  },
}

// ── Checkout redirect ──

/** Base URL of your API (serverless functions or Express) */
const API_BASE = import.meta.env.VITE_API_BASE as string || '/api'

/**
 * Redirect the user to Stripe Checkout for the given plan.
 *
 * Flow:
 * 1. Call your backend to create a Checkout Session
 * 2. Redirect to Stripe's hosted payment page
 * 3. Stripe redirects back to success_url or cancel_url
 */
export async function redirectToCheckout(planId: PlanId, restaurantId?: string) {
  const plan = PLANS[planId]
  if (!plan) throw new Error(`Unknown plan: ${planId}`)

  // 1. Create Checkout Session via your API
  const res = await fetch(`${API_BASE}/create-checkout-session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      priceId: plan.stripePriceId,
      planId,
      restaurantId,
      successUrl: `${window.location.origin}/profil?checkout=success&plan=${planId}`,
      cancelUrl: `${window.location.origin}/profil?checkout=cancel`,
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Erreur serveur' }))
    throw new Error(err.error || `HTTP ${res.status}`)
  }

  const { sessionId, url } = await res.json()

  // 2. Redirect — prefer URL (simpler), fallback to sessionId
  if (url) {
    window.location.href = url
    return
  }

  const stripe = await getStripe()
  if (!stripe) throw new Error('Stripe not loaded')
  // @ts-ignore — redirectToCheckout exists at runtime when @stripe/stripe-js is loaded
  const { error } = await stripe.redirectToCheckout({ sessionId })
  if (error) throw new Error(error.message)
}

// ── Customer Portal ──

/**
 * Redirect to Stripe Customer Portal (manage subscription, invoices, payment method).
 * Requires the portal to be configured in Stripe Dashboard → Settings → Billing → Customer Portal.
 */
export async function redirectToPortal(customerId?: string) {
  const res = await fetch(`${API_BASE}/create-portal-session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customerId,
      returnUrl: `${window.location.origin}/profil`,
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Erreur serveur' }))
    throw new Error(err.error || `HTTP ${res.status}`)
  }

  const { url } = await res.json()
  window.location.href = url
}
