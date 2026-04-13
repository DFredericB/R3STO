import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import crypto from 'crypto'
import { row, run } from '../db.js'
import { generateToken, verifyPassword, hashPassword, verifyTokenMiddleware } from '../middleware/auth.js'
import { sendResetEmail, sendInviteEmail } from '../utils/mailer.js'

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
      `INSERT INTO users (id, restaurantId, n, email, passwordHash, role, active, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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

// ════════════════════════════════════════════════════════════════════════════
//  POST /api/auth/check-email
//  Check if email is already registered (for real-time signup validation)
// ════════════════════════════════════════════════════════════════════════════

router.post('/check-email', (req, res) => {
  try {
    const { email } = req.body
    if (!email) return res.status(400).json({ exists: false })

    const existing = row('SELECT id FROM users WHERE email = ?', email)
    res.json({ exists: !!existing })
  } catch (error) {
    console.error('[CHECK_EMAIL]', error)
    res.json({ exists: false })
  }
})

// ════════════════════════════════════════════════════════════════════════════
//  POST /api/auth/invite
//  Send team invitation email with access code
// ════════════════════════════════════════════════════════════════════════════

router.post('/invite', async (req, res) => {
  try {
    const { name, email, role, code } = req.body
    if (!email || !name || !code) {
      return res.status(400).json({ message: 'Name, email and code required' })
    }

    const sent = await sendInviteEmail(email, name, role || 'serveur', code)
    if (sent) {
      res.json({ sent: true })
    } else {
      res.status(500).json({ message: 'Email send failed' })
    }
  } catch (error) {
    console.error('[INVITE]', error)
    res.status(500).json({ message: 'Invite failed' })
  }
})

// ════════════════════════════════════════════════════════════════════════════
//  POST /api/auth/forgot-password
//  Send password reset email (always returns 200 to prevent enumeration)
// ════════════════════════════════════════════════════════════════════════════

router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body
    if (!email) return res.json({ sent: true })

    const user = row('SELECT id, email FROM users WHERE email = ?', email)

    if (user) {
      // Generate secure token
      const token = crypto.randomBytes(32).toString('hex')
      const now = Date.now()
      const expiresAt = now + 60 * 60 * 1000 // 1 hour

      // Invalidate any previous tokens for this user
      run('UPDATE password_resets SET usedAt = ? WHERE userId = ? AND usedAt IS NULL', now, user.id)

      // Store new token
      run(
        'INSERT INTO password_resets (id, userId, token, expiresAt, createdAt) VALUES (?, ?, ?, ?, ?)',
        uuidv4(), user.id, token, expiresAt, now
      )

      // Send email (async, don't block response)
      sendResetEmail(user.email, token).catch(err => {
        console.error('[FORGOT_PASSWORD] Email send failed:', err)
      })
    }

    // Always return success to prevent email enumeration
    res.json({ sent: true })
  } catch (error) {
    console.error('[FORGOT_PASSWORD]', error)
    res.json({ sent: true })
  }
})

// ════════════════════════════════════════════════════════════════════════════
//  POST /api/auth/reset-password
//  Reset password using token from email
// ════════════════════════════════════════════════════════════════════════════

router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body

    if (!token || !password) {
      return res.status(400).json({ message: 'Token and password required' })
    }

    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters' })
    }

    const now = Date.now()
    const resetRecord = row(
      'SELECT * FROM password_resets WHERE token = ? AND usedAt IS NULL AND expiresAt > ?',
      token, now
    )

    if (!resetRecord) {
      return res.status(400).json({ message: 'Invalid or expired reset link' })
    }

    // Hash new password
    const passwordHash = await hashPassword(password)

    // Update user password
    run('UPDATE users SET passwordHash = ?, updatedAt = ? WHERE id = ?', passwordHash, now, resetRecord.userId)

    // Mark token as used
    run('UPDATE password_resets SET usedAt = ? WHERE id = ?', now, resetRecord.id)

    res.json({ success: true })
  } catch (error) {
    console.error('[RESET_PASSWORD]', error)
    res.status(500).json({ message: 'Password reset failed' })
  }
})

export default router
