import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { row, rows, run } from '../db.js'
import { verifyTokenMiddleware } from '../middleware/auth.js'

const router = Router()

// ════════════════════════════════════════════════════════════════════════════
//  GET /api/clients
//  List all clients
// ════════════════════════════════════════════════════════════════════════════

router.get('/', verifyTokenMiddleware, (req, res) => {
  try {
    const restaurantId = req.user.restaurantId
    const { statut } = req.query

    let query = 'SELECT * FROM clients WHERE restaurantId = ?'
    const params = [restaurantId]

    if (statut !== undefined) {
      query += ' AND statut = ?'
      params.push(parseInt(statut))
    }

    query += ' ORDER BY createdAt DESC'

    const clients = rows(query, ...params)
    res.json(clients)
  } catch (error) {
    console.error('[GET_CLIENTS]', error)
    res.status(500).json({ message: 'Failed to fetch clients' })
  }
})

// ════════════════════════════════════════════════════════════════════════════
//  GET /api/clients/:id
//  Get single client
// ════════════════════════════════════════════════════════════════════════════

router.get('/:id', verifyTokenMiddleware, (req, res) => {
  try {
    const client = row(
      'SELECT * FROM clients WHERE id = ? AND restaurantId = ?',
      req.params.id,
      req.user.restaurantId
    )

    if (!client) {
      return res.status(404).json({ message: 'Client not found' })
    }

    res.json(client)
  } catch (error) {
    console.error('[GET_CLIENT]', error)
    res.status(500).json({ message: 'Failed to fetch client' })
  }
})

// ════════════════════════════════════════════════════════════════════════════
//  POST /api/clients
//  Create client
// ════════════════════════════════════════════════════════════════════════════

router.post('/', verifyTokenMiddleware, (req, res) => {
  try {
    const restaurantId = req.user.restaurantId
    const {
      nom, prenom, tel, email, statut, allergies, notes, langue, entreprise,
      tags, tablePref
    } = req.body

    if (!nom) {
      return res.status(400).json({ message: 'Name is required' })
    }

    // Check if email already exists
    if (email) {
      const existing = row(
        'SELECT id FROM clients WHERE email = ? AND restaurantId = ?',
        email,
        restaurantId
      )
      if (existing) {
        return res.status(409).json({ message: 'Email already exists' })
      }
    }

    const id = uuidv4()
    const now = Date.now()

    run(
      `INSERT INTO clients (
        id, restaurantId, nom, prenom, tel, email, statut, allergies,
        notes, langue, entreprise, tags, tablePref, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id, restaurantId, nom, prenom || '', tel || '', email || '', statut || 0,
      allergies || '', notes || '', langue || 'fr', entreprise || '',
      tags ? JSON.stringify(tags) : '[]', tablePref || '', now, now
    )

    const newClient = row('SELECT * FROM clients WHERE id = ?', id)
    res.status(201).json(newClient)
  } catch (error) {
    console.error('[CREATE_CLIENT]', error)
    res.status(500).json({ message: 'Failed to create client' })
  }
})

// ════════════════════════════════════════════════════════════════════════════
//  PATCH /api/clients/:id
//  Update client
// ════════════════════════════════════════════════════════════════════════════

router.patch('/:id', verifyTokenMiddleware, (req, res) => {
  try {
    const restaurantId = req.user.restaurantId
    const clientId = req.params.id

    const existing = row(
      'SELECT * FROM clients WHERE id = ? AND restaurantId = ?',
      clientId,
      restaurantId
    )

    if (!existing) {
      return res.status(404).json({ message: 'Client not found' })
    }

    const now = Date.now()
    const updates = req.body
    const allowedFields = ['nom', 'prenom', 'tel', 'email', 'statut', 'allergies', 'notes', 'langue', 'entreprise', 'tags', 'tablePref', 'blacklisted', 'blacklistReason']

    let setClauses = ['updatedAt = ?']
    let params = [now]

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        if (key === 'tags' && Array.isArray(value)) {
          setClauses.push(`${key} = ?`)
          params.push(JSON.stringify(value))
        } else {
          setClauses.push(`${key} = ?`)
          params.push(value)
        }
      }
    }

    params.push(clientId)

    run(
      `UPDATE clients SET ${setClauses.join(', ')} WHERE id = ?`,
      ...params
    )

    const updated = row('SELECT * FROM clients WHERE id = ?', clientId)
    res.json(updated)
  } catch (error) {
    console.error('[UPDATE_CLIENT]', error)
    res.status(500).json({ message: 'Failed to update client' })
  }
})

// ════════════════════════════════════════════════════════════════════════════
//  DELETE /api/clients/:id
//  Delete client
// ════════════════════════════════════════════════════════════════════════════

router.delete('/:id', verifyTokenMiddleware, (req, res) => {
  try {
    const restaurantId = req.user.restaurantId
    const result = run(
      'DELETE FROM clients WHERE id = ? AND restaurantId = ?',
      req.params.id,
      restaurantId
    )

    if (result.changes === 0) {
      return res.status(404).json({ message: 'Client not found' })
    }

    res.json({ message: 'Client deleted' })
  } catch (error) {
    console.error('[DELETE_CLIENT]', error)
    res.status(500).json({ message: 'Failed to delete client' })
  }
})

// ════════════════════════════════════════════════════════════════════════════
//  GET /api/clients/search
//  Search clients
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
      `SELECT * FROM clients WHERE restaurantId = ? AND (nom LIKE ? OR prenom LIKE ? OR email LIKE ? OR tel LIKE ?)`,
      restaurantId,
      searchTerm,
      searchTerm,
      searchTerm,
      searchTerm
    )

    res.json(results)
  } catch (error) {
    console.error('[SEARCH_CLIENTS]', error)
    res.status(500).json({ message: 'Search failed' })
  }
})

// ════════════════════════════════════════════════════════════════════════════
//  POST /api/clients/:id/blacklist
//  Add client to blacklist
// ════════════════════════════════════════════════════════════════════════════

router.post('/:id/blacklist', verifyTokenMiddleware, (req, res) => {
  try {
    const restaurantId = req.user.restaurantId
    const { reason } = req.body

    const client = row(
      'SELECT * FROM clients WHERE id = ? AND restaurantId = ?',
      req.params.id,
      restaurantId
    )

    if (!client) {
      return res.status(404).json({ message: 'Client not found' })
    }

    const now = Date.now()
    run(
      'UPDATE clients SET blacklisted = 1, blacklistReason = ?, updatedAt = ? WHERE id = ?',
      reason || null,
      now,
      req.params.id
    )

    const updated = row('SELECT * FROM clients WHERE id = ?', req.params.id)
    res.json(updated)
  } catch (error) {
    console.error('[BLACKLIST_CLIENT]', error)
    res.status(500).json({ message: 'Failed to blacklist client' })
  }
})

// ════════════════════════════════════════════════════════════════════════════
//  POST /api/clients/:id/unblacklist
//  Remove client from blacklist
// ════════════════════════════════════════════════════════════════════════════

router.post('/:id/unblacklist', verifyTokenMiddleware, (req, res) => {
  try {
    const restaurantId = req.user.restaurantId

    const client = row(
      'SELECT * FROM clients WHERE id = ? AND restaurantId = ?',
      req.params.id,
      restaurantId
    )

    if (!client) {
      return res.status(404).json({ message: 'Client not found' })
    }

    const now = Date.now()
    run(
      'UPDATE clients SET blacklisted = 0, blacklistReason = NULL, updatedAt = ? WHERE id = ?',
      now,
      req.params.id
    )

    const updated = row('SELECT * FROM clients WHERE id = ?', req.params.id)
    res.json(updated)
  } catch (error) {
    console.error('[UNBLACKLIST_CLIENT]', error)
    res.status(500).json({ message: 'Failed to remove client from blacklist' })
  }
})

// ════════════════════════════════════════════════════════════════════════════
//  GET /api/clients/:id/stats
//  Get client statistics
// ════════════════════════════════════════════════════════════════════════════

router.get('/:id/stats', verifyTokenMiddleware, (req, res) => {
  try {
    const restaurantId = req.user.restaurantId
    const clientId = req.params.id

    const client = row(
      'SELECT * FROM clients WHERE id = ? AND restaurantId = ?',
      clientId,
      restaurantId
    )

    if (!client) {
      return res.status(404).json({ message: 'Client not found' })
    }

    const resas = rows(
      'SELECT * FROM resas WHERE restaurantId = ? AND email = ? ORDER BY date DESC',
      restaurantId,
      client.email
    )

    const stats = {
      totalVisits: resas.length,
      totalCouverts: resas.reduce((sum, r) => sum + (r.c || 0), 0),
      totalNoshows: resas.filter(r => r.s === 'noshow').length,
      lastVisit: resas.length > 0 ? resas[0].date : null,
      averagePartySize: resas.length > 0 ? Math.round(resas.reduce((sum, r) => sum + (r.c || 0), 0) / resas.length) : 0
    }

    res.json(stats)
  } catch (error) {
    console.error('[CLIENT_STATS]', error)
    res.status(500).json({ message: 'Failed to fetch client stats' })
  }
})

export default router
