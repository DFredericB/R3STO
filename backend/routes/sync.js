import { Router } from 'express'
import { row, rows } from '../db.js'
import { verifyTokenMiddleware } from '../middleware/auth.js'

const router = Router()

// ════════════════════════════════════════════════════════════════════════════
//  GET /api/sync/state
//  Get complete app state for synchronization
// ════════════════════════════════════════════════════════════════════════════

router.get('/state', verifyTokenMiddleware, (req, res) => {
  try {
    const restaurantId = req.user.restaurantId

    const appState = {
      restaurant: row('SELECT * FROM restaurants WHERE id = ?', restaurantId),
      users: rows('SELECT id, n, email, role, active FROM users WHERE restaurantId = ?', restaurantId),
      salles: rows('SELECT * FROM salles WHERE restaurantId = ?', restaurantId),
      tables: rows('SELECT * FROM tables WHERE restaurantId = ?', restaurantId),
      combos: rows('SELECT * FROM combos WHERE restaurantId = ?', restaurantId),
      services: rows('SELECT * FROM services WHERE restaurantId = ?', restaurantId),
      options: row('SELECT * FROM options WHERE restaurantId = ?', restaurantId) || {},
      fermetures: rows('SELECT * FROM fermetures WHERE restaurantId = ?', restaurantId),
      clients: rows('SELECT * FROM clients WHERE restaurantId = ?', restaurantId),
      giftCards: rows('SELECT * FROM gift_cards WHERE restaurantId = ?', restaurantId),
      reviews: rows('SELECT * FROM reviews WHERE restaurantId = ?', restaurantId),
      loyaltyConfig: row('SELECT * FROM loyalty_config WHERE restaurantId = ?', restaurantId) || {},
      loyaltyCards: rows('SELECT * FROM loyalty_cards WHERE restaurantId = ?', restaurantId),
      roomItems: rows('SELECT * FROM room_items WHERE restaurantId = ?', restaurantId),
      sites: rows('SELECT * FROM sites WHERE restaurantId = ?', restaurantId),
      resas: rows('SELECT * FROM resas WHERE restaurantId = ?', restaurantId),
      orders: rows('SELECT * FROM orders WHERE restaurantId = ?', restaurantId)
    }

    res.json(appState)
  } catch (error) {
    console.error('[SYNC_STATE]', error)
    res.status(500).json({ message: 'Failed to fetch sync state' })
  }
})

// ════════════════════════════════════════════════════════════════════════════
//  POST /api/sync/push
//  Push changes from client to server (for future real-time sync)
// ════════════════════════════════════════════════════════════════════════════

router.post('/push', verifyTokenMiddleware, (req, res) => {
  try {
    const { changes } = req.body

    if (!Array.isArray(changes)) {
      return res.status(400).json({ message: 'Changes must be an array' })
    }

    // In production, process and validate changes
    // For now, just acknowledge receipt

    res.json({
      message: 'Changes received',
      count: changes.length
    })
  } catch (error) {
    console.error('[SYNC_PUSH]', error)
    res.status(500).json({ message: 'Failed to push changes' })
  }
})

// ════════════════════════════════════════════════════════════════════════════
//  GET /api/sync/events
//  Get pending events for client synchronization
// ════════════════════════════════════════════════════════════════════════════

router.get('/events', verifyTokenMiddleware, (req, res) => {
  try {
    const restaurantId = req.user.restaurantId

    // In production, implement event queue for real-time updates
    // For now, return empty array
    const events = []

    res.json(events)
  } catch (error) {
    console.error('[SYNC_EVENTS]', error)
    res.status(500).json({ message: 'Failed to fetch events' })
  }
})

// ════════════════════════════════════════════════════════════════════════════
//  GET /api/sync/reservations
//  Get reservations for a specific date and service
// ════════════════════════════════════════════════════════════════════════════

router.get('/reservations', verifyTokenMiddleware, (req, res) => {
  try {
    const restaurantId = req.user.restaurantId
    const { date, svc } = req.query

    let query = 'SELECT * FROM resas WHERE restaurantId = ?'
    const params = [restaurantId]

    if (date) {
      query += ' AND date = ?'
      params.push(date)
    }

    if (svc) {
      query += ' AND svc = ?'
      params.push(svc)
    }

    const resas = rows(query + ' ORDER BY t ASC', ...params)
    res.json(resas)
  } catch (error) {
    console.error('[SYNC_RESAS]', error)
    res.status(500).json({ message: 'Failed to fetch reservations' })
  }
})

export default router
