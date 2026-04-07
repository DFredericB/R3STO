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
      'Widget de réservation en ligne',
      'Confirmations & rappels email auto',
      'Plan de salle interactif',
      'Salles illimitées',
      'Services multiples (midi, soir…)',
      'Fermeture exceptionnelle',
      'Taux de remplissage',
      'Export CSV',
      '2 utilisateurs',
      'Support email',
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
      'QR code de réservation',
      'Rappels SMS automatiques',
      'Gestion no-shows & blacklist',
      'Fiche client & préférences',
      'Score fidélité client',
      'SMS rappel J-1',
      'SmartScan (IA photo)',
      'Utilisateurs illimités',
      'Chat support & onboarding',
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
      'Prépaiement en ligne (Stripe)',
      'Caution & remboursement auto',
      'Gestion terrasse',
      "Liste d'attente + rapatriement",
      'Multi-sites (jusqu\'à 12)',
      'Prédictions IA',
      'Optimisation créneaux IA',
      'API REST publique',
      'Support prioritaire + SLA',
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
