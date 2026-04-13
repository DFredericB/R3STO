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
      role: user.role
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
