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
      `INSERT INTO restaurants (id, name, ville, pays, plan, maxCvt, email, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
      `INSERT INTO users (id, name, email, password, role, plan, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      userId,
      'Administrator',
      email,
      passwordHash,
      'proprietaire',
      plan || 'bistro',
      'active',
      new Date().toISOString()
    )

    // Create default options
    run(
      `INSERT INTO options (id, restaurantId, createdAt, updatedAt)
       VALUES (?, ?, ?, ?)`,
      uuidv4(),
      restaurantId,
      now,
      now
    )

    // Create default loyalty config
    run(
      `INSERT INTO loyalty_config (id, restaurantId, createdAt, updatedAt)
       VALUES (?, ?, ?, ?)`,
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

    const passwordValid = await verifyPassword(password, user.password)
    if (!passwordValid) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }

    if (user.status === 'inactive') {
      return res.status(403).json({ message: 'User is inactive' })
    }

    const token = generateToken(user)

    res.json({
      access_token: token,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
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
    const user = row('SELECT id, email, name, role, status FROM users WHERE id = ?', req.user.id)

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
