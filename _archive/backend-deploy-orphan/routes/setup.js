import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { row, run } from '../db.js'
import { hashPassword } from '../middleware/auth.js'

const router = Router()

const SETUP_KEY = process.env.SETUP_KEY || 'r3sto_setup_2026'

// GET /api/setup?key=r3sto_setup_2026
router.get('/', async (req, res) => {
  const key = req.query.key
  if (key !== SETUP_KEY) {
    return res.status(403).json({ error: 'Invalid setup key' })
  }

  const results = {}

  // Update or create admin user: didier@r3sto.ch / R3sto2026!
  try {
    const newEmail = 'didier@r3sto.ch'
    const newPassword = 'R3sto2026!'
    const passwordHash = await hashPassword(newPassword)

    // Check old emails
    const oldEmails = ['didier@r3sto.com', 'didier@r3sto.ch', 'admin@r3sto.ch']
    let updated = false

    for (const email of oldEmails) {
      const existing = row('SELECT id, restaurantId FROM users WHERE email = ?', email)
      if (existing) {
        run(
          'UPDATE users SET email = ?, passwordHash = ?, n = ?, role = ?, active = 1, updatedAt = ? WHERE id = ?',
          newEmail, passwordHash, 'Didier Genoud', 'proprietaire', Date.now(), existing.id
        )
        results.admin = { status: 'updated', email: newEmail, userId: existing.id }
        updated = true
        break
      }
    }

    if (!updated) {
      // Need a restaurant first
      let restaurantId = null
      const existingResto = row('SELECT id FROM restaurants LIMIT 1')
      if (existingResto) {
        restaurantId = existingResto.id
      } else {
        restaurantId = uuidv4()
        const now = Date.now()
        run(
          `INSERT INTO restaurants (id, name, ville, pays, plan, maxCvt, email, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          restaurantId, 'R3STO Admin', 'Lausanne', 'CH', 'gastro', 200, newEmail, now, now
        )
      }

      const userId = uuidv4()
      run(
        `INSERT INTO users (id, restaurantId, n, email, passwordHash, role, active, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        userId, restaurantId, 'Didier Genoud', newEmail, passwordHash, 'proprietaire', 1, Date.now(), Date.now()
      )
      results.admin = { status: 'created', email: newEmail, userId }
    }
  } catch (e) {
    results.admin = { status: 'error', message: e.message }
  }

  results.timestamp = new Date().toISOString()
  res.json(results)
})

export default router
