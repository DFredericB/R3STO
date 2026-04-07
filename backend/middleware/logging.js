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
    const statusColor = status < 400 ? '\x1b[32m' : status < 500 ? '\x1b[33m' : '\x1b[31m'

    console.log(
      `${statusColor}${status}\x1b[0m ${method} ${path} ${duration}ms`
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
