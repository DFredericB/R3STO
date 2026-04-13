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
