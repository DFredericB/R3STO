import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { row, rows, run } from '../db.js'
import { verifyTokenMiddleware, extractUserMiddleware } from '../middleware/auth.js'

const router = Router()

// ════════════════════════════════════════════════════════════════════════════
//  POST /api/payments/create-intent
//  Create payment intent for table
// ════════════════════════════════════════════════════════════════════════════

router.post('/create-intent', extractUserMiddleware, (req, res) => {
  try {
    const { table, amount, method } = req.body

    if (!table || !amount) {
      return res.status(400).json({ message: 'Table and amount required' })
    }

    // Generate client secret (in production, use Stripe)
    const clientSecret = uuidv4()
    const intentId = uuidv4()

    // Store in memory or session for this demo
    // In production, use Stripe API

    res.json({
      clientSecret,
      intentId
    })
  } catch (error) {
    console.error('[CREATE_INTENT]', error)
    res.status(500).json({ message: 'Failed to create payment intent' })
  }
})

// ════════════════════════════════════════════════════════════════════════════
//  GET /api/payments/bill/:table
//  Get bill for table
// ════════════════════════════════════════════════════════════════════════════

router.get('/bill/:table', verifyTokenMiddleware, (req, res) => {
  try {
    const restaurantId = req.user.restaurantId
    const { table } = req.params

    // Find active reservation for table
    const resa = row(
      `SELECT * FROM resas
       WHERE restaurantId = ? AND tbl = ? AND s IN ('arrived', 'done')
       ORDER BY createdAt DESC LIMIT 1`,
      restaurantId,
      table
    )

    if (!resa) {
      return res.status(404).json({ message: 'No active reservation for this table' })
    }

    // Calculate bill (in production, pull from order system)
    // For demo: rough estimate based on average ticket and party size
    const resto = row('SELECT avg_ticket FROM restaurants WHERE id = ?', restaurantId)
    const estimatedTotal = (resto?.avg_ticket || 50) * resa.c

    res.json({
      table,
      resaId: resa.id,
      guestName: resa.n,
      partySize: resa.c,
      items: [
        { description: 'Food & Beverages', amount: estimatedTotal }
      ],
      subtotal: estimatedTotal,
      tax: estimatedTotal * 0.077, // Swiss VAT
      total: estimatedTotal * 1.077,
      currency: 'CHF'
    })
  } catch (error) {
    console.error('[GET_BILL]', error)
    res.status(500).json({ message: 'Failed to fetch bill' })
  }
})

// ════════════════════════════════════════════════════════════════════════════
//  POST /api/payments/:id/split
//  Split bill
// ════════════════════════════════════════════════════════════════════════════

router.post('/:id/split', verifyTokenMiddleware, (req, res) => {
  try {
    const { splits } = req.body

    if (!Array.isArray(splits) || splits.length === 0) {
      return res.status(400).json({ message: 'Splits must be a non-empty array' })
    }

    // Validate splits sum to total
    const totalAmount = splits.reduce((sum, s) => sum + (s.amount || 0), 0)

    res.json({
      splits,
      total: totalAmount,
      message: 'Bill split successfully'
    })
  } catch (error) {
    console.error('[SPLIT_BILL]', error)
    res.status(500).json({ message: 'Failed to split bill' })
  }
})

// ════════════════════════════════════════════════════════════════════════════
//  POST /api/payments/:id/confirm
//  Confirm payment
// ════════════════════════════════════════════════════════════════════════════

router.post('/:id/confirm', verifyTokenMiddleware, (req, res) => {
  try {
    const restaurantId = req.user.restaurantId
    const intentId = req.params.id

    // In production, confirm with Stripe
    const transactionId = uuidv4()
    const receiptNumber = `R-${Date.now()}`

    res.json({
      success: true,
      receipt: receiptNumber,
      transactionId,
      message: 'Payment confirmed'
    })
  } catch (error) {
    console.error('[CONFIRM_PAYMENT]', error)
    res.status(500).json({ message: 'Failed to confirm payment' })
  }
})

// ════════════════════════════════════════════════════════════════════════════
//  GET /api/payments/:id/status
//  Get payment status
// ════════════════════════════════════════════════════════════════════════════

router.get('/:id/status', extractUserMiddleware, (req, res) => {
  try {
    const intentId = req.params.id

    // In production, check Stripe API
    res.json({
      intentId,
      status: 'succeeded',
      amount: 0,
      currency: 'CHF'
    })
  } catch (error) {
    console.error('[PAYMENT_STATUS]', error)
    res.status(500).json({ message: 'Failed to get payment status' })
  }
})

// ════════════════════════════════════════════════════════════════════════════
//  POST /api/payments/:id/refund
//  Refund payment
// ════════════════════════════════════════════════════════════════════════════

router.post('/:id/refund', verifyTokenMiddleware, (req, res) => {
  try {
    const { amount } = req.body
    const intentId = req.params.id

    // In production, process refund with Stripe
    const refundId = uuidv4()

    res.json({
      refunded: true,
      refundId,
      amount,
      message: 'Refund processed successfully'
    })
  } catch (error) {
    console.error('[REFUND_PAYMENT]', error)
    res.status(500).json({ message: 'Failed to process refund' })
  }
})

// ════════════════════════════════════════════════════════════════════════════
//  POST /api/create-checkout-session
//  Create Stripe checkout session for subscription
// ════════════════════════════════════════════════════════════════════════════

router.post('/create-checkout-session', verifyTokenMiddleware, (req, res) => {
  try {
    const restaurantId = req.user.restaurantId
    const { plan } = req.body

    // In production, create Stripe checkout session
    const sessionId = uuidv4()

    res.json({
      sessionId,
      message: 'Checkout session created'
    })
  } catch (error) {
    console.error('[CREATE_CHECKOUT]', error)
    res.status(500).json({ message: 'Failed to create checkout session' })
  }
})

// ════════════════════════════════════════════════════════════════════════════
//  POST /api/create-portal-session
//  Create Stripe customer portal session
// ════════════════════════════════════════════════════════════════════════════

router.post('/create-portal-session', verifyTokenMiddleware, (req, res) => {
  try {
    const restaurantId = req.user.restaurantId

    // In production, create Stripe portal session
    const portalUrl = 'https://billing.stripe.com/p/login/test'

    res.json({
      url: portalUrl
    })
  } catch (error) {
    console.error('[CREATE_PORTAL]', error)
    res.status(500).json({ message: 'Failed to create portal session' })
  }
})

export default router
