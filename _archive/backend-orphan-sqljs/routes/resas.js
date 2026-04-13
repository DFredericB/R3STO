import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { row, rows, run } from '../db.js'
import { verifyTokenMiddleware, requireAuth } from '../middleware/auth.js'
import { validateResa } from '../utils/resaValidation.js'

const router = Router()

// ════════════════════════════════════════════════════════════════════════════
//  GET /api/resas
//  List reservations with filters
// ════════════════════════════════════════════════════════════════════════════

router.get('/', verifyTokenMiddleware, (req, res) => {
  try {
    const { date, svc, status } = req.query
    const restaurantId = req.user.restaurantId

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

    if (status) {
      query += ' AND s = ?'
      params.push(status)
    }

    query += ' ORDER BY t ASC'

    const resas = rows(query, ...params)
    res.json(resas)
  } catch (error) {
    console.error('[GET_RESAS]', error)
    res.status(500).json({ message: 'Failed to fetch reservations' })
  }
})

// ════════════════════════════════════════════════════════════════════════════
//  GET /api/resas/:id
//  Get single reservation
// ════════════════════════════════════════════════════════════════════════════

router.get('/:id', verifyTokenMiddleware, (req, res) => {
  try {
    const resa = row(
      'SELECT * FROM resas WHERE id = ? AND restaurantId = ?',
      req.params.id,
      req.user.restaurantId
    )

    if (!resa) {
      return res.status(404).json({ message: 'Reservation not found' })
    }

    res.json(resa)
  } catch (error) {
    console.error('[GET_RESA]', error)
    res.status(500).json({ message: 'Failed to fetch reservation' })
  }
})

// ════════════════════════════════════════════════════════════════════════════
//  POST /api/resas
//  Create reservation
// ════════════════════════════════════════════════════════════════════════════

router.post('/', verifyTokenMiddleware, (req, res) => {
  try {
    const restaurantId = req.user.restaurantId
    const {
      n, nom, prenom, c, t, svc, note, date, tel, email, canal, mode,
      statut, bebe, pmr, allergie, tablePref, noteProfil
    } = req.body

    // Basic field validation
    if (!n || !c || !date || !svc) {
      return res.status(400).json({ message: 'Missing required fields' })
    }

    // Generate time if not provided
    let resaTime = t
    if (!resaTime) {
      const service = row('SELECT open FROM services WHERE id = ? AND restaurantId = ?', svc, restaurantId)
      resaTime = service?.open || '19:00'
    }

    // ── Anti-overbooking + business rules ─────────────────────────────
    const validation = validateResa(restaurantId, {
      date, svc, c, email, tel, t: resaTime
    })
    if (!validation.ok) {
      return res.status(validation.code).json({ message: validation.message })
    }

    const id = uuidv4()
    const now = Date.now()

    run(
      `INSERT INTO resas (
        id, restaurantId, n, nom, prenom, c, tbl, t, svc, s, note, date,
        createdAt, updatedAt, statut, mode, tel, email, canal, prisPar,
        bebe, pmr, allergie, tablePref, noteProfil
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id, restaurantId, n, nom || '', prenom || '', c, '', resaTime, svc, 'reserved', note || '', date,
      now, now, statut || 0, mode || 'manuel', tel || '', email || '', canal || 'telephone', req.user.id,
      bebe || 0, pmr || 0, allergie ? 1 : 0, tablePref || '', noteProfil || ''
    )

    const newResa = row('SELECT * FROM resas WHERE id = ?', id)
    res.status(201).json(newResa)
  } catch (error) {
    console.error('[CREATE_RESA]', error)
    res.status(500).json({ message: 'Failed to create reservation' })
  }
})

// ════════════════════════════════════════════════════════════════════════════
//  PATCH /api/resas/:id
//  Update reservation
// ════════════════════════════════════════════════════════════════════════════

router.patch('/:id', verifyTokenMiddleware, (req, res) => {
  try {
    const restaurantId = req.user.restaurantId
    const resaId = req.params.id

    // Verify reservation exists and belongs to restaurant
    const existing = row(
      'SELECT * FROM resas WHERE id = ? AND restaurantId = ?',
      resaId,
      restaurantId
    )

    if (!existing) {
      return res.status(404).json({ message: 'Reservation not found' })
    }

    const now = Date.now()
    const updates = req.body
    const allowedFields = ['n', 'nom', 'prenom', 'c', 'tbl', 't', 'note', 'tel', 'email', 'statut', 'tablePref', 'noteProfil']

    let setClauses = ['updatedAt = ?']
    let params = [now]

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        setClauses.push(`${key} = ?`)
        params.push(value)
      }
    }

    params.push(resaId)
    params.push(restaurantId)

    run(
      `UPDATE resas SET ${setClauses.join(', ')} WHERE id = ? AND restaurantId = ?`,
      ...params
    )

    const updated = row('SELECT * FROM resas WHERE id = ?', resaId)
    res.json(updated)
  } catch (error) {
    console.error('[UPDATE_RESA]', error)
    res.status(500).json({ message: 'Failed to update reservation' })
  }
})

// ════════════════════════════════════════════════════════════════════════════
//  DELETE /api/resas/:id
//  Delete reservation
// ════════════════════════════════════════════════════════════════════════════

router.delete('/:id', verifyTokenMiddleware, (req, res) => {
  try {
    const restaurantId = req.user.restaurantId
    const result = run(
      'DELETE FROM resas WHERE id = ? AND restaurantId = ?',
      req.params.id,
      restaurantId
    )

    if (result.changes === 0) {
      return res.status(404).json({ message: 'Reservation not found' })
    }

    res.json({ message: 'Reservation deleted' })
  } catch (error) {
    console.error('[DELETE_RESA]', error)
    res.status(500).json({ message: 'Failed to delete reservation' })
  }
})

// ════════════════════════════════════════════════════════════════════════════
//  POST /api/resas/:id/status
//  Change reservation status
// ════════════════════════════════════════════════════════════════════════════

router.post('/:id/status', verifyTokenMiddleware, (req, res) => {
  try {
    const { status } = req.body
    const restaurantId = req.user.restaurantId
    const validStatuses = ['reserved', 'arrived', 'done', 'noshow', 'cancelled', 'waitlist']

    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' })
    }

    const resa = row(
      'SELECT * FROM resas WHERE id = ? AND restaurantId = ?',
      req.params.id,
      restaurantId
    )

    if (!resa) {
      return res.status(404).json({ message: 'Reservation not found' })
    }

    const now = Date.now()
    run(
      'UPDATE resas SET s = ?, updatedAt = ? WHERE id = ?',
      status,
      now,
      req.params.id
    )

    const updated = row('SELECT * FROM resas WHERE id = ?', req.params.id)
    res.json(updated)
  } catch (error) {
    console.error('[RESA_STATUS]', error)
    res.status(500).json({ message: 'Failed to update reservation status' })
  }
})

// ════════════════════════════════════════════════════════════════════════════
//  POST /api/resas/swap
//  Swap tables between two reservations
// ════════════════════════════════════════════════════════════════════════════

router.post('/swap', verifyTokenMiddleware, (req, res) => {
  try {
    const { idA, idB } = req.body
    const restaurantId = req.user.restaurantId

    if (!idA || !idB) {
      return res.status(400).json({ message: 'Missing reservation IDs' })
    }

    const resaA = row(
      'SELECT tbl FROM resas WHERE id = ? AND restaurantId = ?',
      idA,
      restaurantId
    )

    const resaB = row(
      'SELECT tbl FROM resas WHERE id = ? AND restaurantId = ?',
      idB,
      restaurantId
    )

    if (!resaA || !resaB) {
      return res.status(404).json({ message: 'One or both reservations not found' })
    }

    const now = Date.now()

    // Swap tables
    run('UPDATE resas SET tbl = ?, updatedAt = ? WHERE id = ?', resaB.tbl, now, idA)
    run('UPDATE resas SET tbl = ?, updatedAt = ? WHERE id = ?', resaA.tbl, now, idB)

    res.json({ message: 'Tables swapped' })
  } catch (error) {
    console.error('[SWAP_RESAS]', error)
    res.status(500).json({ message: 'Failed to swap reservations' })
  }
})

// ════════════════════════════════════════════════════════════════════════════
//  GET /api/resas/search
//  Search reservations
// ════════════════════════════════════════════════════════════════════════════

router.get('/search', verifyTokenMiddleware, (req, res) => {
  try {
    const { q } = req.query
    const restaurantId = req.user.restaurantId

    if (!q) {
      return res.status(400).json({ message: 'Search query required' })
    }

    const searchTerm = `%${q}%`
    const results = rows(
      `SELECT * FROM resas WHERE restaurantId = ? AND (n LIKE ? OR email LIKE ? OR tel LIKE ?)`,
      restaurantId,
      searchTerm,
      searchTerm,
      searchTerm
    )

    res.json(results)
  } catch (error) {
    console.error('[SEARCH_RESAS]', error)
    res.status(500).json({ message: 'Search failed' })
  }
})

export default router
