/**
 * R3STO API — Express Server
 *
 * Deployed on api.r3sto.ch (Infomaniak managed cloud)
 *
 * Routes:
 *   POST /create-checkout-session  → Create Stripe Checkout Session
 *   POST /create-portal-session    → Create Stripe Customer Portal Session
 *   POST /webhook                  → Stripe webhook handler
 *   GET  /health                   → Health check
 */

import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import Stripe from 'stripe'

// ── Validate env ──
const { STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, PORT = '3001', CORS_ORIGINS } = process.env
if (!STRIPE_SECRET_KEY) throw new Error('Missing STRIPE_SECRET_KEY')
if (!STRIPE_WEBHOOK_SECRET) console.warn('⚠️  Missing STRIPE_WEBHOOK_SECRET — webhooks will fail')

// ── Stripe client ──
const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2026-03-25.dahlia' })

// ── Express app ──
const app = express()

// CORS — allow app.r3sto.ch, auth.r3sto.ch, admin.r3sto.ch
const origins = CORS_ORIGINS?.split(',').map(s => s.trim()) || [
  'https://app.r3sto.ch',
  'https://auth.r3sto.ch',
  'https://admin.r3sto.ch',
  'http://localhost:5173', // Vite dev
]
app.use(cors({ origin: origins, credentials: true }))

// ── Health check ──
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'r3sto-api', timestamp: new Date().toISOString() })
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// WEBHOOK — must be BEFORE express.json() to get raw body
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
app.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'] as string
  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET!)
  } catch (err: any) {
    console.error('⚠️ Webhook signature failed:', err.message)
    return res.status(400).json({ error: `Webhook Error: ${err.message}` })
  }

  console.log(`✅ Webhook: ${event.type}`)

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const { planId, restaurantId } = session.metadata || {}
        console.log(`🎉 Checkout completed — plan: ${planId}, restaurant: ${restaurantId}`)
        console.log(`   Customer: ${session.customer}, Email: ${session.customer_email}`)
        // TODO: Update your database
        // await db.restaurants.update({ id: restaurantId, plan: planId, stripeCustomerId: session.customer, status: 'active' })
        break
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        const { planId, restaurantId } = sub.metadata || {}
        console.log(`🔄 Subscription updated — ${restaurantId} → ${planId} (${sub.status})`)
        // TODO: Update plan/status in your database
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        const { restaurantId } = sub.metadata || {}
        console.log(`❌ Subscription canceled — ${restaurantId}`)
        // TODO: Downgrade or deactivate restaurant
        break
      }

      case 'invoice.payment_succeeded': {
        const inv = event.data.object as Stripe.Invoice
        console.log(`💰 Payment OK: ${(inv.amount_paid ?? 0) / 100} CHF — ${inv.customer_email}`)
        break
      }

      case 'invoice.payment_failed': {
        const inv = event.data.object as Stripe.Invoice
        console.error(`❌ Payment FAILED: ${inv.customer_email}`)
        // TODO: Send alert email, flag restaurant
        break
      }

      default:
        console.log(`Unhandled: ${event.type}`)
    }
  } catch (err: any) {
    console.error(`Error processing ${event.type}:`, err.message)
  }

  res.json({ received: true })
})

// ── JSON body parser for all other routes ──
app.use(express.json())

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CREATE CHECKOUT SESSION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
app.post('/create-checkout-session', async (req, res) => {
  try {
    const { priceId, planId, restaurantId, successUrl, cancelUrl, customerEmail } = req.body

    if (!priceId || !successUrl || !cancelUrl) {
      return res.status(400).json({ error: 'Missing: priceId, successUrl, cancelUrl' })
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      ...(customerEmail ? { customer_email: customerEmail } : {}),
      metadata: { planId, restaurantId: restaurantId || '' },
      subscription_data: {
        metadata: { planId, restaurantId: restaurantId || '' },
      },
      success_url: `${successUrl}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl,
      billing_address_collection: 'required',
      allow_promotion_codes: true,
      automatic_tax: { enabled: true },
      locale: 'fr',
    })

    res.json({ sessionId: session.id, url: session.url })
  } catch (err: any) {
    console.error('Checkout error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CREATE PORTAL SESSION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
app.post('/create-portal-session', async (req, res) => {
  try {
    const { customerId, returnUrl } = req.body

    if (!customerId || !returnUrl) {
      return res.status(400).json({ error: 'Missing: customerId, returnUrl' })
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    })

    res.json({ url: session.url })
  } catch (err: any) {
    console.error('Portal error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// ── Start ──
const port = parseInt(PORT, 10)
app.listen(port, () => {
  console.log(`🚀 R3STO API running on port ${port}`)
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`)
  console.log(`   CORS: ${origins.join(', ')}`)
})
