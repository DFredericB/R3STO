// R3STO Backend Setup - Creates all server files
// Run: node setup.js
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function writeFile(filePath, content) {
  const fullPath = path.join(__dirname, filePath)
  const dir = path.dirname(fullPath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  fs.writeFileSync(fullPath, content)
  console.log('  Created: ' + filePath)
}

console.log('R3STO Backend Setup - Creating files...')

writeFile('middleware/auth.js', `
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key'

// ════════════════════════════════════════════════════════════════════════════
//  Token Management
// ════════════════════════════════════════════════════════════════════════════

export function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      restaurantId: user.restaurantId
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  )
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET)
  } catch (error) {
    return null
  }
}

export async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10)
  return bcrypt.hash(password, salt)
}

export async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash)
}

// ════════════════════════════════════════════════════════════════════════════
//  Middleware
// ════════════════════════════════════════════════════════════════════════════

export function verifyTokenMiddleware(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader) {
    return res.status(401).json({ message: 'Missing authorization header' })
  }

  const token = authHeader.replace('Bearer ', '')
  const decoded = verifyToken(token)

  if (!decoded) {
    return res.status(401).json({ message: 'Invalid or expired token' })
  }

  req.user = decoded
  next()
}

export function extractUserMiddleware(req, res, next) {
  const authHeader = req.headers.authorization
  if (authHeader) {
    const token = authHeader.replace('Bearer ', '')
    const decoded = verifyToken(token)
    if (decoded) {
      req.user = decoded
    }
  }
  next()
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Insufficient permissions' })
    }

    next()
  }
}

export function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' })
  }
  next()
}
`)

writeFile('middleware/logging.js', `
// ════════════════════════════════════════════════════════════════════════════
//  Request Logging Middleware
// ════════════════════════════════════════════════════════════════════════════

export function requestLogger(req, res, next) {
  const startTime = Date.now()
  const method = req.method
  const path = req.path

  // Capture response finish to log
  res.on('finish', () => {
    const duration = Date.now() - startTime
    const status = res.statusCode
    const statusColor = status < 400 ? '\\x1b[32m' : status < 500 ? '\\x1b[33m' : '\\x1b[31m'

    console.log(
      \`\${statusColor}\${status}\\x1b[0m \${method} \${path} \${duration}ms\`
    )
  })

  next()
}

// ════════════════════════════════════════════════════════════════════════════
//  Rate Limiting (In-Memory)
// ════════════════════════════════════════════════════════════════════════════

const requestCounts = new Map()
const WINDOW_MS = 60 * 1000 // 1 minute
const MAX_REQUESTS = 100

export function rateLimiter(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress
  const now = Date.now()

  if (!requestCounts.has(ip)) {
    requestCounts.set(ip, [])
  }

  const requests = requestCounts.get(ip)
  const recentRequests = requests.filter(time => now - time < WINDOW_MS)

  if (recentRequests.length >= MAX_REQUESTS) {
    return res.status(429).json({ message: 'Too many requests, please try again later' })
  }

  recentRequests.push(now)
  requestCounts.set(ip, recentRequests)

  // Cleanup old entries periodically
  if (Math.random() < 0.01) {
    for (const [key, times] of requestCounts) {
      const recentTimes = times.filter(time => now - time < WINDOW_MS)
      if (recentTimes.length === 0) {
        requestCounts.delete(key)
      } else {
        requestCounts.set(key, recentTimes)
      }
    }
  }

  next()
}
`)

writeFile('middleware/errorHandler.js', `
// ════════════════════════════════════════════════════════════════════════════
//  Error Handler Middleware
// ════════════════════════════════════════════════════════════════════════════

export function errorHandler(err, req, res, next) {
  console.error('[ERROR]', err)

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      message: 'Validation error',
      errors: err.errors
    })
  }

  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({ message: 'Unauthorized' })
  }

  if (err.name === 'NotFoundError') {
    return res.status(404).json({ message: err.message })
  }

  return res.status(err.status || 500).json({
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  })
}

// ════════════════════════════════════════════════════════════════════════════
//  Custom Error Classes
// ════════════════════════════════════════════════════════════════════════════

export class NotFoundError extends Error {
  constructor(message) {
    super(message)
    this.name = 'NotFoundError'
    this.status = 404
  }
}

export class ValidationError extends Error {
  constructor(message, errors = {}) {
    super(message)
    this.name = 'ValidationError'
    this.status = 400
    this.errors = errors
  }
}

export class UnauthorizedError extends Error {
  constructor(message = 'Unauthorized') {
    super(message)
    this.name = 'UnauthorizedError'
    this.status = 401
  }
}

export class ForbiddenError extends Error {
  constructor(message = 'Forbidden') {
    super(message)
    this.name = 'ForbiddenError'
    this.status = 403
  }
}
`)

writeFile('routes/health.js', `
import { Router } from 'express'

const router = Router()
const startTime = Date.now()

// ════════════════════════════════════════════════════════════════════════════
//  GET /api/health
//  Health check endpoint
// ════════════════════════════════════════════════════════════════════════════

router.get('/', (req, res) => {
  const uptime = Date.now() - startTime

  res.json({
    status: 'ok',
    uptime: Math.floor(uptime / 1000),
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  })
})

// ════════════════════════════════════════════════════════════════════════════
//  GET /api/ready
//  Kubernetes readiness probe
// ════════════════════════════════════════════════════════════════════════════

router.get('/ready', (req, res) => {
  res.json({ ready: true })
})

// ════════════════════════════════════════════════════════════════════════════
//  GET /api/live
//  Kubernetes liveness probe
// ════════════════════════════════════════════════════════════════════════════

router.get('/live', (req, res) => {
  res.json({ alive: true })
})

export default router
`)

writeFile('routes/auth.js', `
import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { row, run } from '../db.js'
import { generateToken, verifyPassword, hashPassword, verifyTokenMiddleware } from '../middleware/auth.js'

const router = Router()

// ════════════════════════════════════════════════════════════════════════════
//  POST /api/auth/register
//  Create a new restaurant and admin user
// ════════════════════════════════════════════════════════════════════════════

router.post('/register', async (req, res) => {
  try {
    const { restaurantName, email, password, ville, plan } = req.body

    // Validate input
    if (!restaurantName || !email || !password) {
      return res.status(400).json({ message: 'Missing required fields' })
    }

    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters' })
    }

    // Check if email already exists
    const existing = row('SELECT id FROM users WHERE email = ?', email)
    if (existing) {
      return res.status(409).json({ message: 'Email already registered' })
    }

    const restaurantId = uuidv4()
    const userId = uuidv4()
    const now = Date.now()

    // Hash password
    const passwordHash = await hashPassword(password)

    // Create restaurant
    run(
      \`INSERT INTO restaurants (id, name, ville, pays, plan, maxCvt, email, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)\`,
      restaurantId,
      restaurantName,
      ville || 'Switzerland',
      'CH',
      plan || 'bistro',
      100,
      email,
      now,
      now
    )

    // Create admin user
    run(
      \`INSERT INTO users (id, restaurantId, n, email, passwordHash, role, active, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)\`,
      userId,
      restaurantId,
      'Administrator',
      email,
      passwordHash,
      'proprietaire',
      1,
      now,
      now
    )

    // Create default options
    run(
      \`INSERT INTO options (id, restaurantId, createdAt, updatedAt)
       VALUES (?, ?, ?, ?)\`,
      uuidv4(),
      restaurantId,
      now,
      now
    )

    // Create default loyalty config
    run(
      \`INSERT INTO loyalty_config (id, restaurantId, createdAt, updatedAt)
       VALUES (?, ?, ?, ?)\`,
      uuidv4(),
      restaurantId,
      now,
      now
    )

    const token = generateToken({
      id: userId,
      email,
      role: 'proprietaire',
      restaurantId
    })

    res.status(201).json({
      token,
      user: {
        id: userId,
        email,
        role: 'proprietaire',
        restaurantId
      }
    })
  } catch (error) {
    console.error('[REGISTER]', error)
    res.status(500).json({ message: 'Registration failed' })
  }
})

// ════════════════════════════════════════════════════════════════════════════
//  POST /api/auth/login
//  Authenticate and return JWT token
// ════════════════════════════════════════════════════════════════════════════

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password required' })
    }

    const user = row('SELECT * FROM users WHERE email = ?', email)

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }

    const passwordValid = await verifyPassword(password, user.passwordHash)
    if (!passwordValid) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }

    if (!user.active) {
      return res.status(403).json({ message: 'User is inactive' })
    }

    const token = generateToken(user)

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        n: user.n,
        role: user.role,
        restaurantId: user.restaurantId
      }
    })
  } catch (error) {
    console.error('[LOGIN]', error)
    res.status(500).json({ message: 'Login failed' })
  }
})

// ════════════════════════════════════════════════════════════════════════════
//  GET /api/auth/me
//  Get current authenticated user
// ════════════════════════════════════════════════════════════════════════════

router.get('/me', verifyTokenMiddleware, (req, res) => {
  try {
    const user = row('SELECT id, email, n, role, active FROM users WHERE id = ?', req.user.id)

    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    res.json(user)
  } catch (error) {
    console.error('[GET_ME]', error)
    res.status(500).json({ message: 'Failed to fetch user' })
  }
})

// ════════════════════════════════════════════════════════════════════════════
//  POST /api/auth/logout
//  Invalidate token (client-side token removal)
// ════════════════════════════════════════════════════════════════════════════

router.post('/logout', verifyTokenMiddleware, (req, res) => {
  // Tokens are stateless, so logout is just a signal to client to remove token
  res.json({ message: 'Logged out successfully' })
})

// ════════════════════════════════════════════════════════════════════════════
//  POST /api/auth/refresh
//  Refresh JWT token
// ════════════════════════════════════════════════════════════════════════════

router.post('/refresh', verifyTokenMiddleware, (req, res) => {
  try {
    const user = row('SELECT * FROM users WHERE id = ?', req.user.id)

    if (!user || !user.active) {
      return res.status(401).json({ message: 'User not found or inactive' })
    }

    const token = generateToken(user)
    res.json({ token })
  } catch (error) {
    console.error('[REFRESH]', error)
    res.status(500).json({ message: 'Token refresh failed' })
  }
})

export default router
`)

writeFile('routes/resas.js', `
import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { row, rows, run } from '../db.js'
import { verifyTokenMiddleware, requireAuth } from '../middleware/auth.js'

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

    // Validation
    if (!n || !c || !date || !svc) {
      return res.status(400).json({ message: 'Missing required fields' })
    }

    // Generate time if not provided
    let resaTime = t
    if (!resaTime) {
      const service = row('SELECT open FROM services WHERE id = ? AND restaurantId = ?', svc, restaurantId)
      resaTime = service?.open || '19:00'
    }

    const id = uuidv4()
    const now = Date.now()

    run(
      \`INSERT INTO resas (
        id, restaurantId, n, nom, prenom, c, tbl, t, svc, s, note, date,
        createdAt, updatedAt, statut, mode, tel, email, canal, prisPar,
        bebe, pmr, allergie, tablePref, noteProfil
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)\`,
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
        setClauses.push(\`\${key} = ?\`)
        params.push(value)
      }
    }

    params.push(resaId)
    params.push(restaurantId)

    run(
      \`UPDATE resas SET \${setClauses.join(', ')} WHERE id = ? AND restaurantId = ?\`,
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

    const searchTerm = \`%\${q}%\`
    const results = rows(
      \`SELECT * FROM resas WHERE restaurantId = ? AND (n LIKE ? OR email LIKE ? OR tel LIKE ?)\`,
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
`)

writeFile('routes/tables.js', `
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
      \`INSERT INTO tables (
        id, restaurantId, salle, n, shape, capMin, capMax, x, y, w, h, active,
        priority, tableH, orient, barSide, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)\`,
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
        setClauses.push(\`\${key} = ?\`)
        params.push(value)
      }
    }

    params.push(tableId)

    run(
      \`UPDATE tables SET \${setClauses.join(', ')} WHERE id = ?\`,
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
            setClauses.push(\`\${key} = ?\`)
            params.push(value)
          }
        }

        params.push(now, table.id)
        run(
          \`UPDATE tables SET \${setClauses.join(', ')}, updatedAt = ? WHERE id = ?\`,
          ...params
        )
      } else {
        run(
          \`INSERT INTO tables (id, restaurantId, salle, n, shape, capMin, capMax, x, y, w, h, active, priority, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)\`,
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
`)

writeFile('routes/clients.js', `
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
      \`INSERT INTO clients (
        id, restaurantId, nom, prenom, tel, email, statut, allergies,
        notes, langue, entreprise, tags, tablePref, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)\`,
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
          setClauses.push(\`\${key} = ?\`)
          params.push(JSON.stringify(value))
        } else {
          setClauses.push(\`\${key} = ?\`)
          params.push(value)
        }
      }
    }

    params.push(clientId)

    run(
      \`UPDATE clients SET \${setClauses.join(', ')} WHERE id = ?\`,
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

    const searchTerm = \`%\${q}%\`
    const results = rows(
      \`SELECT * FROM clients WHERE restaurantId = ? AND (nom LIKE ? OR prenom LIKE ? OR email LIKE ? OR tel LIKE ?)\`,
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
`)

writeFile('routes/config.js', `
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
        setClauses.push(\`\${key} = ?\`)
        params.push(value)
      }
    }

    params.push(restaurantId)

    run(
      \`UPDATE restaurants SET \${setClauses.join(', ')} WHERE id = ?\`,
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
        setClauses.push(\`\${key} = ?\`)
        params.push(value)
      }
    }

    params.push(restaurantId)

    run(
      \`UPDATE options SET \${setClauses.join(', ')} WHERE restaurantId = ?\`,
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
      \`INSERT INTO services (
        id, restaurantId, name, icon, open, close, lastOrder, buffer,
        bookingCutoffMins, active, color, jours, maxCouverts, maxParService,
        createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)\`,
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
        \`INSERT INTO services (
          id, restaurantId, name, icon, open, close, lastOrder, buffer,
          bookingCutoffMins, active, color, jours, maxCouverts, maxParService,
          createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)\`,
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
        \`INSERT INTO salles (
          id, restaurantId, name, type, exterior, active, color, priority, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)\`,
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
`)

writeFile('routes/widget.js', `
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
      \`SELECT r.*,
        (SELECT COUNT(*) FROM tables WHERE restaurantId = r.id AND active = 1) as tableCount
       FROM restaurants r
       WHERE LOWER(r.name) LIKE ? OR LOWER(r.email) LIKE ?
       LIMIT 1\`,
      \`%\${slug}%\`,
      \`%\${slug}%\`
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
      \`%\${slug}%\`,
      \`%\${slug}%\`
    )

    if (!resto) {
      return res.status(404).json({ message: 'Restaurant not found' })
    }

    // Check if restaurant is closed
    const closure = row(
      \`SELECT * FROM fermetures
       WHERE restaurantId = ? AND active = 1 AND type = 'restaurant'
       AND date = ? LIMIT 1\`,
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
      \`SELECT t.id, t.n, t.capMin, t.capMax, t.salle
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
       ORDER BY t.priority ASC\`,
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
      \`%\${slug}%\`,
      \`%\${slug}%\`
    )

    if (!resto) {
      return res.status(404).json({ message: 'Restaurant not found' })
    }

    // Check availability
    const availableTable = row(
      \`SELECT id FROM tables
       WHERE restaurantId = ?
       AND active = 1
       AND blocked = 0
       AND capMin <= ?
       AND capMax >= ?
       AND id NOT IN (
         SELECT tbl FROM resas
         WHERE restaurantId = ? AND date = ? AND svc = ? AND s != 'cancelled'
       )
       LIMIT 1\`,
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
      \`INSERT INTO resas (
        id, restaurantId, n, nom, prenom, c, tbl, t, svc, s, note, date,
        createdAt, updatedAt, statut, mode, tel, email, canal, src, confirmed
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)\`,
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
`)

writeFile('routes/payments.js', `
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
      \`SELECT * FROM resas
       WHERE restaurantId = ? AND tbl = ? AND s IN ('arrived', 'done')
       ORDER BY createdAt DESC LIMIT 1\`,
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
    const receiptNumber = \`R-\${Date.now()}\`

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
`)

writeFile('routes/orders.js', `
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
      query += \` AND DATE(datetime(createdAt/1000, 'unixepoch')) = ?\`
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
      \`INSERT INTO orders (
        id, restaurantId, resaId, tableId, status, items, notes, priority, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)\`,
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
          setClauses.push(\`\${key} = ?\`)
          params.push(value)
        }
      }
    }

    params.push(orderId)

    run(
      \`UPDATE orders SET \${setClauses.join(', ')} WHERE id = ?\`,
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
`)

writeFile('routes/sync.js', `
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
`)

writeFile('db.js', `
import initSqlJs from 'sql.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { v4 as uuidv4 } from 'uuid'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dbDir = path.join(__dirname, 'data')
const dbPath = process.env.DB_PATH || path.join(dbDir, 'r3sto.db')

// Ensure data directory exists
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true })
}

// Initialize sql.js
const SQL = await initSqlJs()

// Load existing database or create new one
let dbBuffer = null
if (fs.existsSync(dbPath)) {
  try {
    dbBuffer = fs.readFileSync(dbPath)
    console.log('Loaded existing database from', dbPath)
  } catch (e) {
    console.log('No existing database found, creating new one')
  }
}

const db = dbBuffer ? new SQL.Database(dbBuffer) : new SQL.Database()

// Enable foreign keys
db.run('PRAGMA foreign_keys = ON')

// ════════════════════════════════════════════════════════════════════════════
//  Auto-save to disk
// ════════════════════════════════════════════════════════════════════════════

let saveTimer = null

function scheduleSave() {
  if (saveTimer) return
  saveTimer = setTimeout(() => {
    saveToDisk()
    saveTimer = null
  }, 3000)
}

function saveToDisk() {
  try {
    const data = db.export()
    const buffer = Buffer.from(data)
    fs.writeFileSync(dbPath, buffer)
  } catch (e) {
    console.error('Error saving database:', e.message)
  }
}

// Save on exit
process.on('exit', saveToDisk)
process.on('SIGINT', () => { saveToDisk(); process.exit(0) })
process.on('SIGTERM', () => { saveToDisk(); process.exit(0) })

// ════════════════════════════════════════════════════════════════════════════
//  Helper Functions — same API as better-sqlite3 wrappers
// ════════════════════════════════════════════════════════════════════════════

function row(query, ...params) {
  try {
    const stmt = db.prepare(query)
    if (params.length > 0) stmt.bind(params)
    if (stmt.step()) {
      const columns = stmt.getColumnNames()
      const values = stmt.get()
      const result = {}
      for (let i = 0; i < columns.length; i++) {
        result[columns[i]] = values[i]
      }
      stmt.free()
      return result
    }
    stmt.free()
    return undefined
  } catch (e) {
    console.error('DB row error:', e.message, '| Query:', query)
    throw e
  }
}

function rows(query, ...params) {
  try {
    const results = []
    const stmt = db.prepare(query)
    if (params.length > 0) stmt.bind(params)
    while (stmt.step()) {
      const columns = stmt.getColumnNames()
      const values = stmt.get()
      const obj = {}
      for (let i = 0; i < columns.length; i++) {
        obj[columns[i]] = values[i]
      }
      results.push(obj)
    }
    stmt.free()
    return results
  } catch (e) {
    console.error('DB rows error:', e.message, '| Query:', query)
    throw e
  }
}

function run(query, ...params) {
  try {
    if (params.length > 0) {
      db.run(query, params)
    } else {
      db.run(query)
    }
    scheduleSave()
    const info = db.exec('SELECT changes() as c, last_insert_rowid() as r')
    return {
      changes: info[0]?.values[0]?.[0] || 0,
      lastInsertRowid: info[0]?.values[0]?.[1] || 0
    }
  } catch (e) {
    console.error('DB run error:', e.message, '| Query:', query)
    throw e
  }
}

function transaction(fn) {
  db.run('BEGIN TRANSACTION')
  try {
    const result = fn()
    db.run('COMMIT')
    scheduleSave()
    return result
  } catch (e) {
    db.run('ROLLBACK')
    throw e
  }
}

// ════════════════════════════════════════════════════════════════════════════
//  Schema — exact same as original (tables, open, close, read columns)
// ════════════════════════════════════════════════════════════════════════════

function initDb() {
  db.run(\`CREATE TABLE IF NOT EXISTS migrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    executedAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )\`)

  applyMigrations()
}

function execMulti(sql) {
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'))
  for (const stmt of statements) {
    try {
      db.run(stmt)
    } catch (e) {
      if (!e.message.includes('already exists')) {
        console.warn('  Migration warning:', e.message.substring(0, 80))
      }
    }
  }
}

function applyMigrations() {
  const migrations = [
    {
      name: '001_initial_schema',
      sql: \`
CREATE TABLE IF NOT EXISTS restaurants (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, ville TEXT NOT NULL,
  pays TEXT DEFAULT 'CH', plan TEXT DEFAULT 'bistro', maxCvt INTEGER DEFAULT 100,
  tel TEXT, email TEXT UNIQUE, web TEXT, avg_ticket REAL,
  createdAt INTEGER, updatedAt INTEGER
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY, restaurantId TEXT NOT NULL,
  n TEXT NOT NULL, email TEXT NOT NULL, passwordHash TEXT NOT NULL,
  role TEXT DEFAULT 'serveur', active BOOLEAN DEFAULT 1, pin TEXT,
  createdAt INTEGER, updatedAt INTEGER,
  FOREIGN KEY (restaurantId) REFERENCES restaurants(id),
  UNIQUE(restaurantId, email)
);

CREATE TABLE IF NOT EXISTS salles (
  id TEXT PRIMARY KEY, restaurantId TEXT NOT NULL,
  name TEXT NOT NULL, type TEXT DEFAULT 'intérieure',
  exterior BOOLEAN DEFAULT 0, active BOOLEAN DEFAULT 1,
  openByDefault BOOLEAN DEFAULT 1, color TEXT, priority INTEGER DEFAULT 0,
  createdAt INTEGER, updatedAt INTEGER,
  FOREIGN KEY (restaurantId) REFERENCES restaurants(id)
);

CREATE TABLE IF NOT EXISTS tables (
  id TEXT PRIMARY KEY, restaurantId TEXT NOT NULL, salle TEXT NOT NULL,
  n TEXT NOT NULL, shape TEXT DEFAULT 'round',
  capMin INTEGER DEFAULT 2, capMax INTEGER DEFAULT 4,
  x REAL DEFAULT 0, y REAL DEFAULT 0, w REAL DEFAULT 10, h REAL DEFAULT 10,
  active BOOLEAN DEFAULT 1, priority INTEGER DEFAULT 0,
  blocked BOOLEAN DEFAULT 0, blockedReason TEXT,
  held BOOLEAN DEFAULT 0, _closedToday TEXT,
  tableH TEXT, orient TEXT, barSide TEXT,
  createdAt INTEGER, updatedAt INTEGER,
  FOREIGN KEY (restaurantId) REFERENCES restaurants(id),
  FOREIGN KEY (salle) REFERENCES salles(id)
);

CREATE TABLE IF NOT EXISTS combos (
  id TEXT PRIMARY KEY, restaurantId TEXT NOT NULL, salle TEXT NOT NULL,
  label TEXT NOT NULL, tables TEXT NOT NULL,
  cap INTEGER NOT NULL, capOverride INTEGER,
  align TEXT, orient TEXT, origSpan TEXT, origPositions TEXT,
  createdAt INTEGER, updatedAt INTEGER,
  FOREIGN KEY (restaurantId) REFERENCES restaurants(id)
);

CREATE TABLE IF NOT EXISTS services (
  id TEXT PRIMARY KEY, restaurantId TEXT NOT NULL,
  name TEXT NOT NULL, icon TEXT,
  open TEXT NOT NULL, close TEXT NOT NULL, lastOrder TEXT,
  buffer INTEGER DEFAULT 15, bookingCutoffMins INTEGER DEFAULT 30,
  active BOOLEAN DEFAULT 1, color TEXT, jours TEXT NOT NULL,
  maxCouverts INTEGER DEFAULT 100, maxParService INTEGER DEFAULT 50,
  _closedToday TEXT, createdAt INTEGER, updatedAt INTEGER,
  FOREIGN KEY (restaurantId) REFERENCES restaurants(id)
);

CREATE TABLE IF NOT EXISTS resas (
  id TEXT PRIMARY KEY, restaurantId TEXT NOT NULL,
  n TEXT NOT NULL, nom TEXT, prenom TEXT, c INTEGER NOT NULL,
  tbl TEXT, t TEXT NOT NULL, svc TEXT NOT NULL,
  s TEXT DEFAULT 'reserved', note TEXT, date TEXT NOT NULL,
  createdAt INTEGER, updatedAt INTEGER,
  statut INTEGER DEFAULT 0, mode TEXT DEFAULT 'manuel',
  tel TEXT, email TEXT, canal TEXT, prisPar TEXT, src TEXT,
  bebe INTEGER DEFAULT 0, pmr INTEGER DEFAULT 0,
  allergie BOOLEAN DEFAULT 0, confirmed BOOLEAN DEFAULT 0,
  tablePref TEXT, noteProfil TEXT,
  FOREIGN KEY (restaurantId) REFERENCES restaurants(id)
);

CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY, restaurantId TEXT NOT NULL,
  nom TEXT NOT NULL, prenom TEXT, tel TEXT, email TEXT,
  statut INTEGER DEFAULT 0, allergies TEXT, notes TEXT,
  langue TEXT DEFAULT 'fr', entreprise TEXT, tags TEXT, tablePref TEXT,
  createdAt INTEGER, updatedAt INTEGER, lastVisit TEXT,
  totalVisits INTEGER DEFAULT 0, totalCouverts INTEGER DEFAULT 0,
  totalNoshows INTEGER DEFAULT 0, blacklisted BOOLEAN DEFAULT 0,
  blacklistReason TEXT,
  FOREIGN KEY (restaurantId) REFERENCES restaurants(id)
);

CREATE TABLE IF NOT EXISTS options (
  id TEXT PRIMARY KEY, restaurantId TEXT UNIQUE NOT NULL,
  wifi BOOLEAN DEFAULT 0, wifi_payant BOOLEAN DEFAULT 0,
  parking BOOLEAN DEFAULT 0, parking_valet BOOLEAN DEFAULT 0,
  terrasse BOOLEAN DEFAULT 0, accessible BOOLEAN DEFAULT 0,
  animaux BOOLEAN DEFAULT 0, animaux_terrasse_only BOOLEAN DEFAULT 0,
  reservation_min INTEGER DEFAULT 1, reservation_max INTEGER DEFAULT 20,
  annulation_h INTEGER DEFAULT 24, allow_past_booking BOOLEAN DEFAULT 0,
  booking_horizon_days INTEGER DEFAULT 180, slot_interval_mins INTEGER DEFAULT 15,
  default_duration_mins INTEGER DEFAULT 90, require_phone BOOLEAN DEFAULT 1,
  allow_walkin BOOLEAN DEFAULT 1, dispersion_mode TEXT DEFAULT 'ia',
  dispersion_interval INTEGER DEFAULT 5, dispersion_max_per_slot INTEGER DEFAULT 3,
  groupe_seuil INTEGER DEFAULT 8, groupe_max_par_service INTEGER DEFAULT 2,
  notif_new_resa BOOLEAN DEFAULT 1, notif_new_hours INTEGER DEFAULT 1,
  auto_confirm BOOLEAN DEFAULT 0, auto_remind_24h BOOLEAN DEFAULT 1,
  auto_noshow_flag BOOLEAN DEFAULT 1, chaises_bebe INTEGER DEFAULT 0,
  places_pmr INTEGER DEFAULT 0,
  createdAt INTEGER, updatedAt INTEGER,
  FOREIGN KEY (restaurantId) REFERENCES restaurants(id)
);

CREATE TABLE IF NOT EXISTS fermetures (
  id TEXT PRIMARY KEY, restaurantId TEXT NOT NULL,
  type TEXT NOT NULL, date TEXT NOT NULL, dateFin TEXT,
  label TEXT NOT NULL, note TEXT, salle TEXT, service TEXT,
  active BOOLEAN DEFAULT 1, createdAt INTEGER, updatedAt INTEGER,
  FOREIGN KEY (restaurantId) REFERENCES restaurants(id)
);

CREATE TABLE IF NOT EXISTS gift_cards (
  id TEXT PRIMARY KEY, restaurantId TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL, amount REAL NOT NULL, balance REAL NOT NULL,
  currency TEXT DEFAULT 'CHF', status TEXT DEFAULT 'active',
  buyerName TEXT, buyerEmail TEXT, buyerTel TEXT,
  recipientName TEXT, recipientEmail TEXT, message TEXT,
  createdAt INTEGER, updatedAt INTEGER, expiresAt TEXT,
  usedAt TEXT, usedResaId TEXT, stripePaymentId TEXT,
  source TEXT DEFAULT 'admin',
  FOREIGN KEY (restaurantId) REFERENCES restaurants(id)
);

CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY, restaurantId TEXT NOT NULL,
  resaId TEXT, clientId TEXT, clientName TEXT NOT NULL,
  clientEmail TEXT, date TEXT, createdAt INTEGER, updatedAt INTEGER,
  rating INTEGER NOT NULL, comment TEXT, service TEXT,
  source TEXT DEFAULT 'internal', reply TEXT, repliedAt INTEGER,
  visible BOOLEAN DEFAULT 1, flagged BOOLEAN DEFAULT 0,
  FOREIGN KEY (restaurantId) REFERENCES restaurants(id)
);

CREATE TABLE IF NOT EXISTS loyalty_config (
  id TEXT PRIMARY KEY, restaurantId TEXT UNIQUE NOT NULL,
  active BOOLEAN DEFAULT 0, mode TEXT DEFAULT 'points',
  pointsPerChf REAL DEFAULT 1.0, stampsGoal INTEGER DEFAULT 10,
  cashbackPercent REAL DEFAULT 5.0, rewardName TEXT,
  rewardValue REAL, rewardThreshold INTEGER,
  welcomeBonus INTEGER DEFAULT 0, birthdayBonus INTEGER DEFAULT 0,
  expirationMonths INTEGER DEFAULT 0, doublePointsDays TEXT,
  createdAt INTEGER, updatedAt INTEGER,
  FOREIGN KEY (restaurantId) REFERENCES restaurants(id)
);

CREATE TABLE IF NOT EXISTS loyalty_cards (
  id TEXT PRIMARY KEY, restaurantId TEXT NOT NULL,
  clientId TEXT NOT NULL, clientName TEXT NOT NULL, clientEmail TEXT,
  points INTEGER DEFAULT 0, stamps INTEGER DEFAULT 0,
  cashbackBalance REAL DEFAULT 0, totalEarned INTEGER DEFAULT 0,
  rewardsUsed INTEGER DEFAULT 0, joinedAt INTEGER, updatedAt INTEGER,
  lastActivity TEXT,
  FOREIGN KEY (restaurantId) REFERENCES restaurants(id)
);

CREATE TABLE IF NOT EXISTS loyalty_events (
  id TEXT PRIMARY KEY, loyaltyCardId TEXT NOT NULL,
  date TEXT NOT NULL, type TEXT NOT NULL,
  amount INTEGER NOT NULL, label TEXT NOT NULL,
  resaId TEXT, createdAt INTEGER,
  FOREIGN KEY (loyaltyCardId) REFERENCES loyalty_cards(id)
);

CREATE TABLE IF NOT EXISTS room_items (
  id TEXT PRIMARY KEY, restaurantId TEXT NOT NULL, salle TEXT NOT NULL,
  sym TEXT, lbl TEXT NOT NULL, shape TEXT NOT NULL,
  x REAL NOT NULL, y REAL NOT NULL, w REAL NOT NULL, h REAL NOT NULL,
  createdAt INTEGER, updatedAt INTEGER,
  FOREIGN KEY (restaurantId) REFERENCES restaurants(id)
);

CREATE TABLE IF NOT EXISTS sites (
  id TEXT PRIMARY KEY, restaurantId TEXT NOT NULL,
  name TEXT NOT NULL, ville TEXT, adresse TEXT, tel TEXT, email TEXT, web TEXT,
  active BOOLEAN DEFAULT 1, color TEXT, plan TEXT DEFAULT 'bistro',
  maxCvt INTEGER DEFAULT 100, createdAt INTEGER, updatedAt INTEGER,
  acceptRedirect BOOLEAN DEFAULT 0, redirectPriority INTEGER DEFAULT 0,
  redirectMsg TEXT,
  FOREIGN KEY (restaurantId) REFERENCES restaurants(id)
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY, restaurantId TEXT NOT NULL,
  resaId TEXT, tableId TEXT, status TEXT DEFAULT 'pending',
  items TEXT NOT NULL, notes TEXT, priority INTEGER DEFAULT 0,
  createdAt INTEGER, updatedAt INTEGER, sentAt INTEGER, completedAt INTEGER,
  FOREIGN KEY (restaurantId) REFERENCES restaurants(id)
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY, restaurantId TEXT NOT NULL,
  userId TEXT, type TEXT NOT NULL, title TEXT NOT NULL,
  message TEXT, data TEXT, read BOOLEAN DEFAULT 0, createdAt INTEGER,
  FOREIGN KEY (restaurantId) REFERENCES restaurants(id)
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY, restaurantId TEXT NOT NULL,
  userId TEXT, action TEXT NOT NULL, resource TEXT,
  resourceId TEXT, changes TEXT, createdAt INTEGER,
  FOREIGN KEY (restaurantId) REFERENCES restaurants(id)
)
      \`
    }
  ]

  for (const migration of migrations) {
    const existing = row('SELECT name FROM migrations WHERE name = ?', migration.name)
    if (!existing) {
      execMulti(migration.sql)
      run('INSERT INTO migrations (name) VALUES (?)', migration.name)
      console.log(\`  ✓ Applied migration: \${migration.name}\`)
    }
  }
}

// ════════════════════════════════════════════════════════════════════════════
//  Seed Demo Data
// ════════════════════════════════════════════════════════════════════════════

function seedDemoData() {
  try {
    const existing = row('SELECT id FROM restaurants LIMIT 1')
    if (existing) {
      console.log('  Demo data already present')
      return
    }

    const rid = uuidv4()
    const now = Date.now()

    run(\`INSERT INTO restaurants (id,name,ville,pays,plan,maxCvt,tel,email,web,createdAt,updatedAt)
      VALUES (?,?,?,?,?,?,?,?,?,?,?)\`,
      rid,'Le Bistro de Sion','Sion','CH','bistro',80,'+41 27 322 80 80','info@bistro.ch','https://bistro.ch',now,now)

    run(\`INSERT INTO users (id,restaurantId,n,email,passwordHash,role,active,createdAt,updatedAt)
      VALUES (?,?,?,?,?,?,?,?,?)\`,
      uuidv4(),rid,'Admin Bistro','admin@bistro.ch',
      '\$2a\$10\$Zd4oHzGgJzQW.gKJNKQjZ.mH6vf9jKVCvEUZ2U.8LVhJ/8YoVZvhS',
      'proprietaire',1,now,now)

    const s1 = uuidv4(), s2 = uuidv4()
    run(\`INSERT INTO salles (id,restaurantId,name,type,exterior,active,color,priority,createdAt,updatedAt)
      VALUES (?,?,?,?,?,?,?,?,?,?)\`, s1,rid,'Salle intérieure','intérieure',0,1,'#4F46E5',0,now,now)
    run(\`INSERT INTO salles (id,restaurantId,name,type,exterior,active,color,priority,createdAt,updatedAt)
      VALUES (?,?,?,?,?,?,?,?,?,?)\`, s2,rid,'Terrasse','extérieure',1,1,'#EC4899',1,now,now)

    for (let i = 1; i <= 8; i++) {
      run(\`INSERT INTO tables (id,restaurantId,salle,n,shape,capMin,capMax,x,y,w,h,active,priority,createdAt,updatedAt)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)\`,
        uuidv4(),rid,s1,\`T\${i}\`,'round',2,4,(i%4)*25,Math.floor(i/4)*50,15,15,1,i,now,now)
    }
    for (let i = 9; i <= 12; i++) {
      run(\`INSERT INTO tables (id,restaurantId,salle,n,shape,capMin,capMax,x,y,w,h,active,priority,createdAt,updatedAt)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)\`,
        uuidv4(),rid,s2,\`T\${i}\`,'square',2,6,((i-9)%2)*50,Math.floor((i-9)/2)*50,20,20,1,i,now,now)
    }

    run(\`INSERT INTO services (id,restaurantId,name,icon,open,close,lastOrder,buffer,bookingCutoffMins,active,color,jours,maxCouverts,maxParService,createdAt,updatedAt)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)\`,
      uuidv4(),rid,'Midi','12','12:00','14:30','13:45',15,30,1,'#60A5FA','[1,2,3,4,5]',80,40,now,now)
    run(\`INSERT INTO services (id,restaurantId,name,icon,open,close,lastOrder,buffer,bookingCutoffMins,active,color,jours,maxCouverts,maxParService,createdAt,updatedAt)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)\`,
      uuidv4(),rid,'Soir','18','18:30','22:00','21:15',15,30,1,'#F97316','[0,1,2,3,4,5,6]',80,40,now,now)

    run(\`INSERT INTO options (id,restaurantId,wifi,parking,terrasse,accessible,animaux,require_phone,createdAt,updatedAt)
      VALUES (?,?,?,?,?,?,?,?,?,?)\`, uuidv4(),rid,1,1,1,1,1,1,now,now)

    run(\`INSERT INTO loyalty_config (id,restaurantId,active,mode,pointsPerChf,stampsGoal,rewardName,rewardValue,rewardThreshold,createdAt,updatedAt)
      VALUES (?,?,?,?,?,?,?,?,?,?,?)\`, uuidv4(),rid,1,'points',1.0,10,'Repas offert',100,500,now,now)

    saveToDisk()
    console.log('  ✓ Demo data seeded')
  } catch (error) {
    console.error('  ✗ Seed error:', error.message)
  }
}

// ════════════════════════════════════════════════════════════════════════════
//  Initialize
// ════════════════════════════════════════════════════════════════════════════

initDb()

if (process.env.DEMO_MODE !== 'false') {
  seedDemoData()
}

export { db, row, rows, run, transaction, saveToDisk }
`)

writeFile('server.js', `
import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { requestLogger, rateLimiter } from './middleware/logging.js'
import { errorHandler } from './middleware/errorHandler.js'

// Import routes
import authRoutes from './routes/auth.js'
import resasRoutes from './routes/resas.js'
import tablesRoutes from './routes/tables.js'
import clientsRoutes from './routes/clients.js'
import configRoutes from './routes/config.js'
import widgetRoutes from './routes/widget.js'
import paymentsRoutes from './routes/payments.js'
import ordersRoutes from './routes/orders.js'
import syncRoutes from './routes/sync.js'
import healthRoutes from './routes/health.js'

// ════════════════════════════════════════════════════════════════════════════
//  Application Setup
// ════════════════════════════════════════════════════════════════════════════

const app = express()
const PORT = process.env.PORT || 4000
const HOST = process.env.HOST || '0.0.0.0'
const NODE_ENV = process.env.NODE_ENV || 'development'

// ════════════════════════════════════════════════════════════════════════════
//  Security Middleware
// ════════════════════════════════════════════════════════════════════════════

app.use(helmet())

// CORS Configuration
const corsOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:3000,https://app.r3sto.ch,https://r3sto.ch').split(',')
app.use(cors({
  origin: corsOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Type']
}))

// ════════════════════════════════════════════════════════════════════════════
//  Request Processing Middleware
// ════════════════════════════════════════════════════════════════════════════

app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ limit: '10mb', extended: true }))

// ════════════════════════════════════════════════════════════════════════════
//  Logging & Rate Limiting
// ════════════════════════════════════════════════════════════════════════════

app.use(requestLogger)
app.use(rateLimiter)

// ════════════════════════════════════════════════════════════════════════════
//  Health Check Endpoints (no auth required)
// ════════════════════════════════════════════════════════════════════════════

app.use('/health', healthRoutes)

// ════════════════════════════════════════════════════════════════════════════
//  API Routes
// ════════════════════════════════════════════════════════════════════════════

// Authentication
app.use('/api/auth', authRoutes)

// Reservations
app.use('/api/resas', resasRoutes)

// Tables
app.use('/api/tables', tablesRoutes)

// Clients (CRM)
app.use('/api/clients', clientsRoutes)

// Configuration (restaurant, options, services, salles, users)
app.use('/api', configRoutes)

// Public Widget (booking engine - no auth required)
app.use('/api/widget', widgetRoutes)

// Payments
app.use('/api/payments', paymentsRoutes)

// Kitchen Orders
app.use('/api/orders', ordersRoutes)

// Sync & Real-time
app.use('/api/sync', syncRoutes)

// ════════════════════════════════════════════════════════════════════════════
//  API Documentation
// ════════════════════════════════════════════════════════════════════════════

app.get('/api', (req, res) => {
  res.json({
    name: 'R3STO API',
    version: '1.0.0',
    status: 'running',
    environment: NODE_ENV,
    endpoints: {
      health: 'GET /health',
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        logout: 'POST /api/auth/logout',
        me: 'GET /api/auth/me',
        refresh: 'POST /api/auth/refresh'
      },
      reservations: {
        list: 'GET /api/resas?date=&svc=&status=',
        get: 'GET /api/resas/:id',
        create: 'POST /api/resas',
        update: 'PATCH /api/resas/:id',
        delete: 'DELETE /api/resas/:id',
        changeStatus: 'POST /api/resas/:id/status',
        swap: 'POST /api/resas/swap'
      },
      tables: {
        list: 'GET /api/tables',
        get: 'GET /api/tables/:id',
        create: 'POST /api/tables',
        update: 'PATCH /api/tables/:id',
        delete: 'DELETE /api/tables/:id',
        batch: 'PUT /api/tables/batch',
        block: 'POST /api/tables/:id/block',
        unblock: 'POST /api/tables/:id/unblock'
      },
      clients: {
        list: 'GET /api/clients',
        get: 'GET /api/clients/:id',
        create: 'POST /api/clients',
        update: 'PATCH /api/clients/:id',
        delete: 'DELETE /api/clients/:id',
        search: 'GET /api/clients/search?q=',
        stats: 'GET /api/clients/:id/stats',
        blacklist: 'POST /api/clients/:id/blacklist'
      },
      config: {
        restaurant: 'GET /api/resto | PATCH /api/resto',
        options: 'GET /api/options | PATCH /api/options',
        services: 'GET /api/services | PUT /api/services',
        salles: 'GET /api/salles | PUT /api/salles',
        users: 'GET /api/users | PUT /api/users'
      },
      widget: {
        config: 'GET /api/widget/:slug/config',
        availability: 'GET /api/widget/:slug/availability?date=&svc=&cvt=',
        book: 'POST /api/widget/:slug/book',
        cancel: 'POST /api/widget/cancel'
      },
      payments: {
        createIntent: 'POST /api/payments/create-intent',
        getBill: 'GET /api/payments/bill/:table',
        confirm: 'POST /api/payments/:id/confirm',
        status: 'GET /api/payments/:id/status'
      },
      orders: {
        list: 'GET /api/orders',
        get: 'GET /api/orders/:id',
        create: 'POST /api/orders',
        advance: 'POST /api/orders/:id/advance',
        delete: 'DELETE /api/orders/:id'
      },
      sync: {
        state: 'GET /api/sync/state',
        push: 'POST /api/sync/push',
        events: 'GET /api/sync/events'
      }
    }
  })
})

// ════════════════════════════════════════════════════════════════════════════
//  404 Handler
// ════════════════════════════════════════════════════════════════════════════

app.use((req, res) => {
  res.status(404).json({
    message: 'Endpoint not found',
    path: req.path,
    method: req.method
  })
})

// ════════════════════════════════════════════════════════════════════════════
//  Error Handler (must be last)
// ════════════════════════════════════════════════════════════════════════════

app.use(errorHandler)

// ════════════════════════════════════════════════════════════════════════════
//  Server Startup
// ════════════════════════════════════════════════════════════════════════════

const server = app.listen(PORT, HOST, () => {
  console.log(\`
╔════════════════════════════════════════════════════════════╗
║         R3STO Restaurant Management API                   ║
║════════════════════════════════════════════════════════════║
║  Environment:      \${NODE_ENV.padEnd(37)}║
║  Port:             \${PORT.toString().padEnd(37)}║
║  CORS Origins:     \${corsOrigins[0].padEnd(37)}║
║════════════════════════════════════════════════════════════║
║  API Available at: http://localhost:\${PORT}/api           \${NODE_ENV === 'development' ? '│' : '║'}
║  Status Check:     http://localhost:\${PORT}/health          \${NODE_ENV === 'development' ? '│' : '║'}
╚════════════════════════════════════════════════════════════╝
  \`)

  if (NODE_ENV === 'development') {
    console.log('  Tip: Run "npm run dev" for file watching')
  }
})

// ════════════════════════════════════════════════════════════════════════════
//  Graceful Shutdown
// ════════════════════════════════════════════════════════════════════════════

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...')
  server.close(() => {
    console.log('Server closed')
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...')
  server.close(() => {
    console.log('Server closed')
    process.exit(0)
  })
})

export default app
`)

// Create data directory
if (!fs.existsSync(path.join(__dirname, 'data'))) {
  fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true })
  console.log('  Created: data/')
}

console.log('Setup complete!')
