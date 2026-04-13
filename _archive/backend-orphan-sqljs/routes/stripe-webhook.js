import { Router } from 'express'
import { run, row } from '../db.js'

const router = Router()

// ════════════════════════════════════════════════════════════════════════════
//  POST /api/stripe/webhook-event
//  Called by api.r3sto.ch after Stripe webhook signature verification
//  Internal route — protected by shared secret (X-Webhook-Secret header)
// ════════════════════════════════════════════════════════════════════════════

const WEBHOOK_INTERNAL_SECRET = process.env.WEBHOOK_INTERNAL_SECRET || 'r3sto-webhook-internal-2026'

router.post('/webhook-event', (req, res) => {
  // Verify internal secret
  const secret = req.headers['x-webhook-secret']
  if (secret !== WEBHOOK_INTERNAL_SECRET) {
    return res.status(403).json({ message: 'Forbidden' })
  }

  const { type, data } = req.body

  if (!type || !data) {
    return res.status(400).json({ message: 'Missing type or data' })
  }

  const now = Date.now()

  try {
    switch (type) {
      // ── Checkout terminé : activer l'abonnement ──
      case 'checkout.session.completed': {
        const { planId, restaurantId, stripeCustomerId, email } = data
        if (!restaurantId) {
          console.warn('[WEBHOOK] checkout.session.completed without restaurantId')
          break
        }

        // Update restaurant with Stripe info
        run(
          `UPDATE restaurants SET plan = ?, stripeCustomerId = ?, subscriptionStatus = 'active', updatedAt = ? WHERE id = ?`,
          planId || 'bistro', stripeCustomerId || null, now, restaurantId
        )
        console.log(`[WEBHOOK] ✓ Restaurant ${restaurantId} → plan ${planId}, status active`)

        // Log audit
        run(
          `INSERT INTO audit_logs (id, restaurantId, action, resource, changes, createdAt) VALUES (?, ?, ?, ?, ?, ?)`,
          crypto.randomUUID(), restaurantId, 'subscription.activated',
          'restaurants', JSON.stringify({ plan: planId, email }), now
        )
        break
      }

      // ── Abonnement modifié (upgrade/downgrade) ──
      case 'customer.subscription.updated': {
        const { planId, restaurantId, subscriptionId, status } = data
        if (!restaurantId) break

        run(
          `UPDATE restaurants SET plan = ?, stripeSubscriptionId = ?, subscriptionStatus = ?, updatedAt = ? WHERE id = ?`,
          planId || 'bistro', subscriptionId || null, status || 'active', now, restaurantId
        )
        console.log(`[WEBHOOK] ✓ Subscription updated: ${restaurantId} → ${planId} (${status})`)

        run(
          `INSERT INTO audit_logs (id, restaurantId, action, resource, changes, createdAt) VALUES (?, ?, ?, ?, ?, ?)`,
          crypto.randomUUID(), restaurantId, 'subscription.updated',
          'restaurants', JSON.stringify({ plan: planId, status }), now
        )
        break
      }

      // ── Abonnement annulé ──
      case 'customer.subscription.deleted': {
        const { restaurantId } = data
        if (!restaurantId) break

        // Downgrade to free/inactive — on garde le restaurant mais on marque cancelled
        run(
          `UPDATE restaurants SET subscriptionStatus = 'cancelled', updatedAt = ? WHERE id = ?`,
          now, restaurantId
        )
        console.log(`[WEBHOOK] ✓ Subscription cancelled: ${restaurantId}`)

        run(
          `INSERT INTO audit_logs (id, restaurantId, action, resource, changes, createdAt) VALUES (?, ?, ?, ?, ?, ?)`,
          crypto.randomUUID(), restaurantId, 'subscription.cancelled',
          'restaurants', JSON.stringify({ status: 'cancelled' }), now
        )
        break
      }

      // ── Paiement réussi (renouvellement) ──
      case 'invoice.payment_succeeded': {
        const { restaurantId, amount, email } = data
        if (restaurantId) {
          run(
            `UPDATE restaurants SET subscriptionStatus = 'active', updatedAt = ? WHERE id = ?`,
            now, restaurantId
          )
        }
        console.log(`[WEBHOOK] ✓ Payment OK: ${amount} CHF — ${email}`)
        break
      }

      // ── Paiement échoué ──
      case 'invoice.payment_failed': {
        const { restaurantId, email } = data
        if (restaurantId) {
          run(
            `UPDATE restaurants SET subscriptionStatus = 'past_due', updatedAt = ? WHERE id = ?`,
            now, restaurantId
          )

          // Create notification for restaurant owner
          run(
            `INSERT INTO notifications (id, restaurantId, type, title, message, createdAt) VALUES (?, ?, ?, ?, ?, ?)`,
            crypto.randomUUID(), restaurantId, 'billing',
            'Paiement échoué',
            'Votre paiement a échoué. Veuillez mettre à jour votre moyen de paiement dans la section Profil.',
            now
          )
        }
        console.log(`[WEBHOOK] ⚠ Payment FAILED: ${email}`)
        break
      }

      default:
        console.log(`[WEBHOOK] Unhandled type: ${type}`)
    }

    res.json({ received: true })
  } catch (error) {
    console.error(`[WEBHOOK] Error processing ${type}:`, error)
    res.status(500).json({ message: 'Error processing webhook event' })
  }
})

// ════════════════════════════════════════════════════════════════════════════
//  GET /api/stripe/subscription
//  Get current subscription status for a restaurant (auth required)
// ════════════════════════════════════════════════════════════════════════════

router.get('/subscription', (req, res) => {
  try {
    const restaurantId = req.headers['x-restaurant-id']
    if (!restaurantId) {
      return res.status(400).json({ message: 'Missing X-Restaurant-Id header' })
    }

    const restaurant = row(
      'SELECT plan, stripeCustomerId, stripeSubscriptionId, subscriptionStatus FROM restaurants WHERE id = ?',
      restaurantId
    )

    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found' })
    }

    // Get active addons
    const addons = []
    // addons query would go here when addon purchasing is implemented

    res.json({
      plan: restaurant.plan,
      stripeCustomerId: restaurant.stripeCustomerId,
      subscriptionStatus: restaurant.subscriptionStatus || 'none',
      addons,
    })
  } catch (error) {
    console.error('[STRIPE_SUB]', error)
    res.status(500).json({ message: 'Failed to fetch subscription' })
  }
})

export default router
