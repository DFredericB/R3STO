import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { row, rows, run } from '../db.js'
import { verifyTokenMiddleware } from '../middleware/auth.js'

const router = Router()

// ════════════════════════════════════════════════════════════════════════════
//  GET /api/tables
//  List all tables for restaurant
// ════════════════════════════════════════════════════════════════════════════

router.get('/', verifyTokenMiddleware, (req, res) => {
  try {
    const restaurantId = req.user.restaurantId
    const { salle } = req.query

    let query = 'SELECT * FROM tables WHERE restaurantId = ?'
    const params = [restaurantId]

    if (salle) {
      query += ' AND salle = ?'
      params.push(salle)
    }

    query += ' ORDER BY priority ASC, n ASC'

    const tables = rows(query, ...params)
    res.json(tables)
  } catch (error) {
    console.error('[GET_TABLES]', error)
    res.status(500).json({ message: 'Failed to fetch tables' })
  }
})

// ════════════════════════════════════════════════════════════════════════════
//  GET /api/tables/:id
//  Get single table
// ════════════════════════════════════════════════════════════════════════════

router.get('/:id', verifyTokenMiddleware, (req, res) => {
  try {
    const table = row(
      'SELECT * FROM tables WHERE id = ? AND restaurantId = ?',
      req.params.id,
      req.user.restaurantId
    )

    if (!table) {
      return res.status(404).json({ message: 'Table not found' })
    }

    res.json(table)
  } catch (error) {
    console.error('[GET_TABLE]', error)
    res.status(500).json({ message: 'Failed to fetch table' })
  }
})

// ════════════════════════════════════════════════════════════════════════════
//  POST /api/tables
//  Create table
// ════════════════════════════════════════════════════════════════════════════

router.post('/', verifyTokenMiddleware, (req, res) => {
  try {
    const restaurantId = req.user.restaurantId
    const {
      salle, n, shape, capMin, capMax, x, y, w, h, priority,
      tableH, orient, barSide
    } = req.body

    if (!salle || !n) {
      return res.status(400).json({ message: 'Missing required fields' })
    }

    const id = uuidv4()
    const now = Date.now()

    run(
      `INSERT INTO tables (
        id, restaurantId, salle, n, shape, capMin, capMax, x, y, w, h, active,
        priority, tableH, orient, barSide, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id, restaurantId, salle, n, shape || 'round', capMin || 2, capMax || 4,
      x || 0, y || 0, w || 10, h || 10, 1, priority || 0, tableH || null,
      orient || null, barSide || null, now, now
    )

    const newTable = row('SELECT * FROM tables WHERE id = ?', id)
    res.status(201).json(newTable)
  } catch (error) {
    console.error('[CREATE_TABLE]', error)
    res.status(500).json({ message: 'Failed to create table' })
  }
})

// ════════════════════════════════════════════════════════════════════════════
//  PATCH /api/tables/:id
//  Update table
// ════════════════════════════════════════════════════════════════════════════

router.patch('/:id', verifyTokenMiddleware, (req, res) => {
  try {
    const restaurantId = req.user.restaurantId
    const tableId = req.params.id

    const existing = row(
      'SELECT * FROM tables WHERE id = ? AND restaurantId = ?',
      tableId,
      restaurantId
    )

    if (!existing) {
      return res.status(404).json({ message: 'Table not found' })
    }

    const now = Date.now()
    const updates = req.body
    const allowedFields = ['n', 'shape', 'capMin', 'capMax', 'x', 'y', 'w', 'h', 'active', 'priority', 'blocked', 'blockedReason', 'tableH', 'orient', 'barSide']

    let setClauses = ['updatedAt = ?']
    let params = [now]

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        setClauses.push(`${key} = ?`)
        params.push(value)
      }
    }

    params.push(tableId)

    run(
      `UPDATE tables SET ${setClauses.join(', ')} WHERE id = ?`,
      ...params
    )

    const updated = row('SELECT * FROM tables WHERE id = ?', tableId)
    res.json(updated)
  } catch (error) {
    console.error('[UPDATE_TABLE]', error)
    res.status(500).json({ message: 'Failed to update table' })
  }
})

// ════════════════════════════════════════════════════════════════════════════
//  DELETE /api/tables/:id
//  Delete table
// ════════════════════════════════════════════════════════════════════════════

router.delete('/:id', verifyTokenMiddleware, (req, res) => {
  try {
    const restaurantId = req.user.restaurantId
    const result = run(
      'DELETE FROM tables WHERE id = ? AND restaurantId = ?',
      req.params.id,
      restaurantId
    )

    if (result.changes === 0) {
      return res.status(404).json({ message: 'Table not found' })
    }

    res.json({ message: 'Table deleted' })
  } catch (error) {
    console.error('[DELETE_TABLE]', error)
    res.status(500).json({ message: 'Failed to delete table' })
  }
})

// ════════════════════════════════════════════════════════════════════════════
//  PUT /api/tables/batch
//  Update multiple tables (replace all)
// ════════════════════════════════════════════════════════════════════════════

router.put('/batch', verifyTokenMiddleware, (req, res) => {
  try {
    const restaurantId = req.user.restaurantId
    const { tables } = req.body

    if (!Array.isArray(tables)) {
      return res.status(400).json({ message: 'Tables must be an array' })
    }

    const now = Date.now()

    for (const table of tables) {
      const existing = row(
        'SELECT id FROM tables WHERE id = ? AND restaurantId = ?',
        table.id,
        restaurantId
      )

      if (existing) {
        const setClauses = []
        const params = []

        for (const [key, value] of Object.entries(table)) {
          if (key !== 'id' && key !== 'restaurantId' && key !== 'createdAt') {
            setClauses.push(`${key} = ?`)
            params.push(value)
          }
        }

        params.push(now, table.id)
        run(
          `UPDATE tables SET ${setClauses.join(', ')}, updatedAt = ? WHERE id = ?`,
          ...params
        )
      } else {
        run(
          `INSERT INTO tables (id, restaurantId, salle, n, shape, capMin, capMax, x, y, w, h, active, priority, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          table.id || uuidv4(),
          restaurantId,
          table.salle,
          table.n,
          table.shape || 'round',
          table.capMin || 2,
          table.capMax || 4,
          table.x || 0,
          table.y || 0,
          table.w || 10,
          table.h || 10,
          table.active !== false ? 1 : 0,
          table.priority || 0,
          now,
          now
        )
      }
    }

    const updated = rows('SELECT * FROM tables WHERE restaurantId = ? ORDER BY priority ASC', restaurantId)
    res.json(updated)
  } catch (error) {
    console.error('[BATCH_UPDATE_TABLES]', error)
    res.status(500).json({ message: 'Failed to update tables' })
  }
})

// ════════════════════════════════════════════════════════════════════════════
//  POST /api/tables/:id/block
//  Block table
// ════════════════════════════════════════════════════════════════════════════

router.post('/:id/block', verifyTokenMiddleware, (req, res) => {
  try {
    const restaurantId = req.user.restaurantId
    const { reason } = req.body

    const table = row(
      'SELECT * FROM tables WHERE id = ? AND restaurantId = ?',
      req.params.id,
      restaurantId
    )

    if (!table) {
      return res.status(404).json({ message: 'Table not found' })
    }

    const now = Date.now()
    run(
      'UPDATE tables SET blocked = 1, blockedReason = ?, updatedAt = ? WHERE id = ?',
      reason || null,
      now,
      req.params.id
    )

    const updated = row('SELECT * FROM tables WHERE id = ?', req.params.id)
    res.json(updated)
  } catch (error) {
    console.error('[BLOCK_TABLE]', error)
    res.status(500).json({ message: 'Failed to block table' })
  }
})

// ════════════════════════════════════════════════════════════════════════════
//  POST /api/tables/:id/unblock
//  Unblock table
// ════════════════════════════════════════════════════════════════════════════

router.post('/:id/unblock', verifyTokenMiddleware, (req, res) => {
  try {
    const restaurantId = req.user.restaurantId

    const table = row(
      'SELECT * FROM tables WHERE id = ? AND restaurantId = ?',
      req.params.id,
      restaurantId
    )

    if (!table) {
      return res.status(404).json({ message: 'Table not found' })
    }

    const now = Date.now()
    run(
      'UPDATE tables SET blocked = 0, blockedReason = NULL, updatedAt = ? WHERE id = ?',
      now,
      req.params.id
    )

    const updated = row('SELECT * FROM tables WHERE id = ?', req.params.id)
    res.json(updated)
  } catch (error) {
    console.error('[UNBLOCK_TABLE]', error)
    res.status(500).json({ message: 'Failed to unblock table' })
  }
})

// ════════════════════════════════════════════════════════════════════════════
//  POST /api/tables/:id/hold
//  Hold table (reserve for upcoming service)
// ════════════════════════════════════════════════════════════════════════════

router.post('/:id/hold', verifyTokenMiddleware, (req, res) => {
  try {
    const restaurantId = req.user.restaurantId
    const now = Date.now()

    const table = row(
      'SELECT * FROM tables WHERE id = ? AND restaurantId = ?',
      req.params.id,
      restaurantId
    )

    if (!table) {
      return res.status(404).json({ message: 'Table not found' })
    }

    run(
      'UPDATE tables SET held = 1, updatedAt = ? WHERE id = ?',
      now,
      req.params.id
    )

    const updated = row('SELECT * FROM tables WHERE id = ?', req.params.id)
    res.json(updated)
  } catch (error) {
    console.error('[HOLD_TABLE]', error)
    res.status(500).json({ message: 'Failed to hold table' })
  }
})

// ════════════════════════════════════════════════════════════════════════════
//  POST /api/tables/:id/release
//  Release held table
// ════════════════════════════════════════════════════════════════════════════

router.post('/:id/release', verifyTokenMiddleware, (req, res) => {
  try {
    const restaurantId = req.user.restaurantId
    const now = Date.now()

    const table = row(
      'SELECT * FROM tables WHERE id = ? AND restaurantId = ?',
      req.params.id,
      restaurantId
    )

    if (!table) {
      return res.status(404).json({ message: 'Table not found' })
    }

    run(
      'UPDATE tables SET held = 0, updatedAt = ? WHERE id = ?',
      now,
      req.params.id
    )

    const updated = row('SELECT * FROM tables WHERE id = ?', req.params.id)
    res.json(updated)
  } catch (error) {
    console.error('[RELEASE_TABLE]', error)
    res.status(500).json({ message: 'Failed to release table' })
  }
})

export default router
