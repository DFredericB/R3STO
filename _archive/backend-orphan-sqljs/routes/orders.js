import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { row, rows, run } from '../db.js'
import { verifyTokenMiddleware } from '../middleware/auth.js'

const router = Router()

// ════════════════════════════════════════════════════════════════════════════
//  GET /api/orders
//  List kitchen orders
// ════════════════════════════════════════════════════════════════════════════

router.get('/', verifyTokenMiddleware, (req, res) => {
  try {
    const restaurantId = req.user.restaurantId
    const { status, date } = req.query

    let query = 'SELECT * FROM orders WHERE restaurantId = ?'
    const params = [restaurantId]

    if (status) {
      query += ' AND status = ?'
      params.push(status)
    }

    if (date) {
      query += ` AND DATE(datetime(createdAt/1000, 'unixepoch')) = ?`
      params.push(date)
    }

    query += ' ORDER BY priority DESC, createdAt ASC'

    const orders = rows(query, ...params)
    res.json(orders)
  } catch (error) {
    console.error('[GET_ORDERS]', error)
    res.status(500).json({ message: 'Failed to fetch orders' })
  }
})

// ════════════════════════════════════════════════════════════════════════════
//  GET /api/orders/:id
//  Get single order
// ════════════════════════════════════════════════════════════════════════════

router.get('/:id', verifyTokenMiddleware, (req, res) => {
  try {
    const order = row(
      'SELECT * FROM orders WHERE id = ? AND restaurantId = ?',
      req.params.id,
      req.user.restaurantId
    )

    if (!order) {
      return res.status(404).json({ message: 'Order not found' })
    }

    res.json(order)
  } catch (error) {
    console.error('[GET_ORDER]', error)
    res.status(500).json({ message: 'Failed to fetch order' })
  }
})

// ════════════════════════════════════════════════════════════════════════════
//  POST /api/orders
//  Create kitchen order
// ════════════════════════════════════════════════════════════════════════════

router.post('/', verifyTokenMiddleware, (req, res) => {
  try {
    const restaurantId = req.user.restaurantId
    const { resaId, tableId, items, notes, priority } = req.body

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Items must be a non-empty array' })
    }

    const id = uuidv4()
    const now = Date.now()

    run(
      `INSERT INTO orders (
        id, restaurantId, resaId, tableId, status, items, notes, priority, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id,
      restaurantId,
      resaId || null,
      tableId || null,
      'pending',
      JSON.stringify(items),
      notes || '',
      priority || 0,
      now,
      now
    )

    const newOrder = row('SELECT * FROM orders WHERE id = ?', id)
    res.status(201).json(newOrder)
  } catch (error) {
    console.error('[CREATE_ORDER]', error)
    res.status(500).json({ message: 'Failed to create order' })
  }
})

// ════════════════════════════════════════════════════════════════════════════
//  POST /api/orders/:id/advance
//  Advance order status
// ════════════════════════════════════════════════════════════════════════════

router.post('/:id/advance', verifyTokenMiddleware, (req, res) => {
  try {
    const restaurantId = req.user.restaurantId
    const orderId = req.params.id

    const order = row(
      'SELECT * FROM orders WHERE id = ? AND restaurantId = ?',
      orderId,
      restaurantId
    )

    if (!order) {
      return res.status(404).json({ message: 'Order not found' })
    }

    // Status progression: pending -> cooking -> ready -> completed
    const statuses = ['pending', 'cooking', 'ready', 'completed']
    const currentIndex = statuses.indexOf(order.status)
    const nextStatus = currentIndex < statuses.length - 1 ? statuses[currentIndex + 1] : 'completed'

    const now = Date.now()
    const updates = {
      status: nextStatus,
      updatedAt: now
    }

    if (nextStatus === 'cooking') {
      updates.sentAt = now
    }

    if (nextStatus === 'completed') {
      updates.completedAt = now
    }

    run(
      'UPDATE orders SET status = ?, updatedAt = ?, sentAt = ?, completedAt = ? WHERE id = ?',
      updates.status,
      updates.updatedAt,
      updates.sentAt || null,
      updates.completedAt || null,
      orderId
    )

    const updated = row('SELECT * FROM orders WHERE id = ?', orderId)
    res.json(updated)
  } catch (error) {
    console.error('[ADVANCE_ORDER]', error)
    res.status(500).json({ message: 'Failed to advance order' })
  }
})

// ════════════════════════════════════════════════════════════════════════════
//  PATCH /api/orders/:id
//  Update order
// ════════════════════════════════════════════════════════════════════════════

router.patch('/:id', verifyTokenMiddleware, (req, res) => {
  try {
    const restaurantId = req.user.restaurantId
    const orderId = req.params.id

    const existing = row(
      'SELECT * FROM orders WHERE id = ? AND restaurantId = ?',
      orderId,
      restaurantId
    )

    if (!existing) {
      return res.status(404).json({ message: 'Order not found' })
    }

    const now = Date.now()
    const updates = req.body
    const allowedFields = ['status', 'items', 'notes', 'priority']

    let setClauses = ['updatedAt = ?']
    let params = [now]

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        if (key === 'items') {
          setClauses.push('items = ?')
          params.push(JSON.stringify(value))
        } else {
          setClauses.push(`${key} = ?`)
          params.push(value)
        }
      }
    }

    params.push(orderId)

    run(
      `UPDATE orders SET ${setClauses.join(', ')} WHERE id = ?`,
      ...params
    )

    const updated = row('SELECT * FROM orders WHERE id = ?', orderId)
    res.json(updated)
  } catch (error) {
    console.error('[UPDATE_ORDER]', error)
    res.status(500).json({ message: 'Failed to update order' })
  }
})

// ════════════════════════════════════════════════════════════════════════════
//  DELETE /api/orders/:id
//  Delete order
// ════════════════════════════════════════════════════════════════════════════

router.delete('/:id', verifyTokenMiddleware, (req, res) => {
  try {
    const restaurantId = req.user.restaurantId
    const result = run(
      'DELETE FROM orders WHERE id = ? AND restaurantId = ?',
      req.params.id,
      restaurantId
    )

    if (result.changes === 0) {
      return res.status(404).json({ message: 'Order not found' })
    }

    res.json({ message: 'Order deleted' })
  } catch (error) {
    console.error('[DELETE_ORDER]', error)
    res.status(500).json({ message: 'Failed to delete order' })
  }
})

export default router
