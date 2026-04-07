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
