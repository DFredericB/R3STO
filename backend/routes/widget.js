import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { row, rows, run } from '../db.js'
import { extractUserMiddleware } from '../middleware/auth.js'

const router = Router()

// ════════════════════════════════════════════════════════════════════════════
//  GET /api/widget/:slug/config
//  Get widget configuration (public)
// ════════════════════════════════════════════════════════════════════════════

router.get('/:slug/config', extractUserMiddleware, (req, res) => {
  try {
    const { slug } = req.params

    // For demo: find restaurant by partial name match
    const resto = row(
      `SELECT r.*,
        (SELECT COUNT(*) FROM tables WHERE restaurantId = r.id AND active = 1) as tableCount
       FROM restaurants r
       WHERE LOWER(r.name) LIKE ? OR LOWER(r.email) LIKE ?
       LIMIT 1`,
      `%${slug}%`,
      `%${slug}%`
    )

    if (!resto) {
      return res.status(404).json({ message: 'Restaurant not found' })
    }

    const services = rows('SELECT * FROM services WHERE restaurantId = ? AND active = 1', resto.id)
    const options = row('SELECT * FROM options WHERE restaurantId = ?', resto.id)
    const salles = rows('SELECT * FROM salles WHERE restaurantId = ? AND active = 1', resto.id)

    res.json({
      restaurant: {
        id: resto.id,
        name: resto.name,
        ville: resto.ville,
        tel: resto.tel,
        email: resto.email,
        maxCvt: resto.maxCvt
      },
      services,
      options: options || {},
      salles
    })
  } catch (error) {
    console.error('[WIDGET_CONFIG]', error)
    res.status(500).json({ message: 'Failed to fetch widget config' })
  }
})

// ════════════════════════════════════════════════════════════════════════════
//  GET /api/widget/:slug/availability
//  Check availability for date/service/party size (public)
// ════════════════════════════════════════════════════════════════════════════

router.get('/:slug/availability', extractUserMiddleware, (req, res) => {
  try {
    const { slug } = req.params
    const { date, svc, cvt } = req.query

    if (!date || !svc || !cvt) {
      return res.status(400).json({ message: 'Missing date, svc, or cvt' })
    }

    const resto = row(
      'SELECT id FROM restaurants WHERE LOWER(name) LIKE ? OR LOWER(email) LIKE ?',
      `%${slug}%`,
      `%${slug}%`
    )

    if (!resto) {
      return res.status(404).json({ message: 'Restaurant not found' })
    }

    // Check if restaurant is closed
    const closure = row(
      `SELECT * FROM fermetures
       WHERE restaurantId = ? AND active = 1 AND type = 'restaurant'
       AND date = ? LIMIT 1`,
      resto.id,
      date
    )

    if (closure) {
      return res.json({
        available: false,
        reason: closure.label || 'Restaurant closed',
        slots: [],
        tables: []
      })
    }

    // Get available tables for the party size
    const availableTables = rows(
      `SELECT t.id, t.n, t.capMin, t.capMax, t.salle
       FROM tables t
       WHERE t.restaurantId = ?
       AND t.active = 1
       AND t.blocked = 0
       AND t.capMin <= ?
       AND t.capMax >= ?
       AND t.id NOT IN (
         SELECT tbl FROM resas
         WHERE restaurantId = ? AND date = ? AND svc = ? AND s != 'cancelled'
       )
       ORDER BY t.priority ASC`,
      resto.id,
      parseInt(cvt),
      parseInt(cvt),
      resto.id,
      date,
      svc
    )

    // Generate time slots
    const service = row(
      'SELECT open, close, lastOrder FROM services WHERE restaurantId = ? AND id = ?',
      resto.id,
      svc
    )

    const slots = []
    if (service) {
      const [openHour, openMin] = service.open.split(':').map(Number)
      const [lastOrderHour, lastOrderMin] = (service.lastOrder || service.close).split(':').map(Number)

      let currentTime = new Date(date)
      currentTime.setHours(openHour, openMin, 0)

      const lastOrderTime = new Date(date)
      lastOrderTime.setHours(lastOrderHour, lastOrderMin, 0)

      while (currentTime <= lastOrderTime) {
        slots.push(currentTime.toTimeString().slice(0, 5))
        currentTime.setMinutes(currentTime.getMinutes() + 15)
      }
    }

    res.json({
      available: availableTables.length > 0,
      slots,
      tables: availableTables
    })
  } catch (error) {
    console.error('[WIDGET_AVAILABILITY]', error)
    res.status(500).json({ message: 'Failed to check availability' })
  }
})

// ════════════════════════════════════════════════════════════════════════════
//  POST /api/widget/:slug/book
//  Create booking through widget (public)
// ════════════════════════════════════════════════════════════════════════════

router.post('/:slug/book', extractUserMiddleware, (req, res) => {
  try {
    const { slug } = req.params
    const { n, email, tel, c, date, t, svc, note, prenom, nom } = req.body

    if (!n || !email || !c || !date || !t || !svc) {
      return res.status(400).json({ message: 'Missing required fields' })
    }

    const resto = row(
      'SELECT id FROM restaurants WHERE LOWER(name) LIKE ? OR LOWER(email) LIKE ?',
      `%${slug}%`,
      `%${slug}%`
    )

    if (!resto) {
      return res.status(404).json({ message: 'Restaurant not found' })
    }

    // Check availability
    const availableTable = row(
      `SELECT id FROM tables
       WHERE restaurantId = ?
       AND active = 1
       AND blocked = 0
       AND capMin <= ?
       AND capMax >= ?
       AND id NOT IN (
         SELECT tbl FROM resas
         WHERE restaurantId = ? AND date = ? AND svc = ? AND s != 'cancelled'
       )
       LIMIT 1`,
      resto.id,
      parseInt(c),
      parseInt(c),
      resto.id,
      date,
      svc
    )

    if (!availableTable) {
      return res.status(409).json({ message: 'No available tables for this date/time/party size' })
    }

    // Create reservation
    const id = uuidv4()
    const now = Date.now()

    run(
      `INSERT INTO resas (
        id, restaurantId, n, nom, prenom, c, tbl, t, svc, s, note, date,
        createdAt, updatedAt, statut, mode, tel, email, canal, src, confirmed
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id,
      resto.id,
      n,
      nom || '',
      prenom || '',
      parseInt(c),
      availableTable.id,
      t,
      svc,
      'reserved',
      note || '',
      date,
      now,
      now,
      0,
      'web',
      tel || '',
      email,
      'widget',
      'web',
      0
    )

    const newResa = row('SELECT * FROM resas WHERE id = ?', id)

    res.status(201).json({
      id: newResa.id,
      confirmed: false,
      message: 'Booking created successfully. Please confirm your email.'
    })
  } catch (error) {
    console.error('[WIDGET_BOOK]', error)
    res.status(500).json({ message: 'Failed to create booking' })
  }
})

// ════════════════════════════════════════════════════════════════════════════
//  POST /api/widget/validate-email
//  Validate email confirmation (public)
// ════════════════════════════════════════════════════════════════════════════

router.post('/validate-email', (req, res) => {
  try {
    const { email, code } = req.body

    if (!email || !code) {
      return res.status(400).json({ message: 'Email and code required' })
    }

    // In production, verify email confirmation code
    // For now, just mark reservation as confirmed
    const resa = row('SELECT * FROM resas WHERE email = ? LIMIT 1', email)

    if (!resa) {
      return res.status(404).json({ valid: false })
    }

    run(
      'UPDATE resas SET confirmed = 1, updatedAt = ? WHERE email = ?',
      Date.now(),
      email
    )

    res.json({ valid: true })
  } catch (error) {
    console.error('[VALIDATE_EMAIL]', error)
    res.status(500).json({ message: 'Email validation failed' })
  }
})

// ════════════════════════════════════════════════════════════════════════════
//  POST /api/widget/cancel
//  Cancel booking via widget (public)
// ════════════════════════════════════════════════════════════════════════════

router.post('/cancel', (req, res) => {
  try {
    const { resaId, email } = req.body

    if (!resaId || !email) {
      return res.status(400).json({ message: 'Reservation ID and email required' })
    }

    const resa = row(
      'SELECT * FROM resas WHERE id = ? AND email = ?',
      resaId,
      email
    )

    if (!resa) {
      return res.status(404).json({ cancelled: false })
    }

    run(
      'UPDATE resas SET s = ?, updatedAt = ? WHERE id = ?',
      'cancelled',
      Date.now(),
      resaId
    )

    res.json({ cancelled: true, message: 'Booking cancelled successfully' })
  } catch (error) {
    console.error('[CANCEL_BOOKING]', error)
    res.status(500).json({ message: 'Failed to cancel booking' })
  }
})

export default router
