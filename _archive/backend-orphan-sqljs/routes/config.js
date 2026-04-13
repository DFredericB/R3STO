import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { row, rows, run } from '../db.js'
import { verifyTokenMiddleware, requireRole } from '../middleware/auth.js'

const router = Router()

// ════════════════════════════════════════════════════════════════════════════
//  GET /api/resto
//  Get restaurant info
// ════════════════════════════════════════════════════════════════════════════

router.get('/resto', verifyTokenMiddleware, (req, res) => {
  try {
    const resto = row('SELECT * FROM restaurants WHERE id = ?', req.user.restaurantId)

    if (!resto) {
      return res.status(404).json({ message: 'Restaurant not found' })
    }

    res.json(resto)
  } catch (error) {
    console.error('[GET_RESTO]', error)
    res.status(500).json({ message: 'Failed to fetch restaurant' })
  }
})

// ════════════════════════════════════════════════════════════════════════════
//  PATCH /api/resto
//  Update restaurant info
// ════════════════════════════════════════════════════════════════════════════

router.patch('/resto', verifyTokenMiddleware, requireRole('proprietaire'), (req, res) => {
  try {
    const restaurantId = req.user.restaurantId
    const updates = req.body
    const allowedFields = ['name', 'ville', 'pays', 'plan', 'maxCvt', 'tel', 'web', 'avg_ticket']

    let setClauses = ['updatedAt = ?']
    let params = [Date.now()]

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        setClauses.push(`${key} = ?`)
        params.push(value)
      }
    }

    params.push(restaurantId)

    run(
      `UPDATE restaurants SET ${setClauses.join(', ')} WHERE id = ?`,
      ...params
    )

    const updated = row('SELECT * FROM restaurants WHERE id = ?', restaurantId)
    res.json(updated)
  } catch (error) {
    console.error('[UPDATE_RESTO]', error)
    res.status(500).json({ message: 'Failed to update restaurant' })
  }
})

// ════════════════════════════════════════════════════════════════════════════
//  GET /api/options
//  Get restaurant options
// ════════════════════════════════════════════════════════════════════════════

router.get('/options', verifyTokenMiddleware, (req, res) => {
  try {
    let options = row('SELECT * FROM options WHERE restaurantId = ?', req.user.restaurantId)

    if (!options) {
      // Create default options if not exists
      const id = uuidv4()
      const now = Date.now()
      run(
        'INSERT INTO options (id, restaurantId, createdAt, updatedAt) VALUES (?, ?, ?, ?)',
        id,
        req.user.restaurantId,
        now,
        now
      )
      options = row('SELECT * FROM options WHERE id = ?', id)
    }

    res.json(options)
  } catch (error) {
    console.error('[GET_OPTIONS]', error)
    res.status(500).json({ message: 'Failed to fetch options' })
  }
})

// ════════════════════════════════════════════════════════════════════════════
//  PATCH /api/options
//  Update options
// ════════════════════════════════════════════════════════════════════════════

router.patch('/options', verifyTokenMiddleware, requireRole('proprietaire', 'manager'), (req, res) => {
  try {
    const restaurantId = req.user.restaurantId
    const updates = req.body

    // Get all allowed option fields
    const allowedFields = [
      'wifi', 'wifi_payant', 'parking', 'parking_valet', 'terrasse', 'accessible', 'animaux', 'animaux_terrasse_only',
      'reservation_min', 'reservation_max', 'annulation_h', 'allow_past_booking', 'booking_horizon_days',
      'slot_interval_mins', 'default_duration_mins', 'require_phone', 'allow_walkin',
      'dispersion_mode', 'dispersion_interval', 'dispersion_max_per_slot',
      'groupe_seuil', 'groupe_max_par_service',
      'notif_new_resa', 'notif_new_hours',
      'auto_confirm', 'auto_remind_24h', 'auto_noshow_flag',
      'chaises_bebe', 'places_pmr'
    ]

    let setClauses = ['updatedAt = ?']
    let params = [Date.now()]

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        setClauses.push(`${key} = ?`)
        params.push(value)
      }
    }

    params.push(restaurantId)

    run(
      `UPDATE options SET ${setClauses.join(', ')} WHERE restaurantId = ?`,
      ...params
    )

    const updated = row('SELECT * FROM options WHERE restaurantId = ?', restaurantId)
    res.json(updated)
  } catch (error) {
    console.error('[UPDATE_OPTIONS]', error)
    res.status(500).json({ message: 'Failed to update options' })
  }
})

// ════════════════════════════════════════════════════════════════════════════
//  GET /api/services
//  List services
// ════════════════════════════════════════════════════════════════════════════

router.get('/services', verifyTokenMiddleware, (req, res) => {
  try {
    const services = rows(
      'SELECT * FROM services WHERE restaurantId = ? ORDER BY name ASC',
      req.user.restaurantId
    )
    res.json(services)
  } catch (error) {
    console.error('[GET_SERVICES]', error)
    res.status(500).json({ message: 'Failed to fetch services' })
  }
})

// ════════════════════════════════════════════════════════════════════════════
//  POST /api/services
//  Create service
// ════════════════════════════════════════════════════════════════════════════

router.post('/services', verifyTokenMiddleware, (req, res) => {
  try {
    const restaurantId = req.user.restaurantId
    const { name, icon, open, close, lastOrder, buffer, bookingCutoffMins, color, jours, maxCouverts, maxParService } = req.body

    if (!name || !open || !close) {
      return res.status(400).json({ message: 'Missing required fields' })
    }

    const id = uuidv4()
    const now = Date.now()

    run(
      `INSERT INTO services (
        id, restaurantId, name, icon, open, close, lastOrder, buffer,
        bookingCutoffMins, active, color, jours, maxCouverts, maxParService,
        createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id, restaurantId, name, icon || null, open, close, lastOrder || close,
      buffer || 15, bookingCutoffMins || 30, 1, color || '#000000',
      JSON.stringify(jours || []), maxCouverts || 100, maxParService || 50,
      now, now
    )

    const newService = row('SELECT * FROM services WHERE id = ?', id)
    res.status(201).json(newService)
  } catch (error) {
    console.error('[CREATE_SERVICE]', error)
    res.status(500).json({ message: 'Failed to create service' })
  }
})

// ════════════════════════════════════════════════════════════════════════════
//  PUT /api/services
//  Replace all services
// ════════════════════════════════════════════════════════════════════════════

router.put('/services', verifyTokenMiddleware, requireRole('proprietaire'), (req, res) => {
  try {
    const restaurantId = req.user.restaurantId
    const { services } = req.body

    if (!Array.isArray(services)) {
      return res.status(400).json({ message: 'Services must be an array' })
    }

    const now = Date.now()

    // Delete existing services
    run('DELETE FROM services WHERE restaurantId = ?', restaurantId)

    // Insert new services
    for (const service of services) {
      run(
        `INSERT INTO services (
          id, restaurantId, name, icon, open, close, lastOrder, buffer,
          bookingCutoffMins, active, color, jours, maxCouverts, maxParService,
          createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        service.id || uuidv4(),
        restaurantId,
        service.name,
        service.icon || null,
        service.open,
        service.close,
        service.lastOrder || service.close,
        service.buffer || 15,
        service.bookingCutoffMins || 30,
        service.active !== false ? 1 : 0,
        service.color || '#000000',
        JSON.stringify(service.jours || []),
        service.maxCouverts || 100,
        service.maxParService || 50,
        now,
        now
      )
    }

    const updated = rows('SELECT * FROM services WHERE restaurantId = ? ORDER BY name ASC', restaurantId)
    res.json(updated)
  } catch (error) {
    console.error('[UPDATE_SERVICES]', error)
    res.status(500).json({ message: 'Failed to update services' })
  }
})

// ════════════════════════════════════════════════════════════════════════════
//  GET /api/salles
//  List dining rooms
// ════════════════════════════════════════════════════════════════════════════

router.get('/salles', verifyTokenMiddleware, (req, res) => {
  try {
    const salles = rows(
      'SELECT * FROM salles WHERE restaurantId = ? ORDER BY priority ASC',
      req.user.restaurantId
    )
    res.json(salles)
  } catch (error) {
    console.error('[GET_SALLES]', error)
    res.status(500).json({ message: 'Failed to fetch salles' })
  }
})

// ════════════════════════════════════════════════════════════════════════════
//  PUT /api/salles
//  Replace all salles
// ════════════════════════════════════════════════════════════════════════════

router.put('/salles', verifyTokenMiddleware, requireRole('proprietaire'), (req, res) => {
  try {
    const restaurantId = req.user.restaurantId
    const { salles } = req.body

    if (!Array.isArray(salles)) {
      return res.status(400).json({ message: 'Salles must be an array' })
    }

    const now = Date.now()

    // Delete existing salles (and their tables)
    run('DELETE FROM salles WHERE restaurantId = ?', restaurantId)

    // Insert new salles
    for (const salle of salles) {
      run(
        `INSERT INTO salles (
          id, restaurantId, name, type, exterior, active, color, priority, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        salle.id || uuidv4(),
        restaurantId,
        salle.name,
        salle.type || 'intérieure',
        salle.exterior ? 1 : 0,
        salle.active !== false ? 1 : 0,
        salle.color || '#000000',
        salle.priority || 0,
        now,
        now
      )
    }

    const updated = rows('SELECT * FROM salles WHERE restaurantId = ? ORDER BY priority ASC', restaurantId)
    res.json(updated)
  } catch (error) {
    console.error('[UPDATE_SALLES]', error)
    res.status(500).json({ message: 'Failed to update salles' })
  }
})

// ════════════════════════════════════════════════════════════════════════════
//  GET /api/users
//  List team members
// ════════════════════════════════════════════════════════════════════════════

router.get('/users', verifyTokenMiddleware, requireRole('proprietaire', 'manager'), (req, res) => {
  try {
    const users = rows(
      'SELECT id, restaurantId, n, email, role, active FROM users WHERE restaurantId = ? ORDER BY n ASC',
      req.user.restaurantId
    )
    res.json(users)
  } catch (error) {
    console.error('[GET_USERS]', error)
    res.status(500).json({ message: 'Failed to fetch users' })
  }
})

// ════════════════════════════════════════════════════════════════════════════
//  PUT /api/users
//  Update team members
// ════════════════════════════════════════════════════════════════════════════

router.put('/users', verifyTokenMiddleware, requireRole('proprietaire'), (req, res) => {
  try {
    const restaurantId = req.user.restaurantId
    const { users } = req.body

    if (!Array.isArray(users)) {
      return res.status(400).json({ message: 'Users must be an array' })
    }

    const now = Date.now()

    for (const user of users) {
      const existing = row(
        'SELECT id FROM users WHERE id = ? AND restaurantId = ?',
        user.id,
        restaurantId
      )

      if (existing) {
        run(
          'UPDATE users SET n = ?, role = ?, active = ?, updatedAt = ? WHERE id = ?',
          user.n,
          user.role,
          user.active ? 1 : 0,
          now,
          user.id
        )
      }
    }

    const updated = rows(
      'SELECT id, restaurantId, n, email, role, active FROM users WHERE restaurantId = ? ORDER BY n ASC',
      restaurantId
    )
    res.json(updated)
  } catch (error) {
    console.error('[UPDATE_USERS]', error)
    res.status(500).json({ message: 'Failed to update users' })
  }
})

export default router
