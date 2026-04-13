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
import setupRoutes from './routes/setup.js'

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
const corsOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:3000,https://app.r3sto.ch,https://r3sto.ch,https://auth.r3sto.ch,https://booking.r3sto.ch,https://admin.r3sto.ch,https://demo.r3sto.ch,https://menu.r3sto.ch,https://bill.r3sto.ch,https://delivery.r3sto.ch').split(',')
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

// Setup route (admin credentials)
app.use('/api/setup', setupRoutes)

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
  console.log(`
╔════════════════════════════════════════════════════════════╗
║         R3STO Restaurant Management API                   ║
║════════════════════════════════════════════════════════════║
║  Environment:      ${NODE_ENV.padEnd(37)}║
║  Port:             ${PORT.toString().padEnd(37)}║
║  CORS Origins:     ${corsOrigins[0].padEnd(37)}║
║════════════════════════════════════════════════════════════║
║  API Available at: http://localhost:${PORT}/api           ${NODE_ENV === 'development' ? '│' : '║'}
║  Status Check:     http://localhost:${PORT}/health          ${NODE_ENV === 'development' ? '│' : '║'}
╚════════════════════════════════════════════════════════════╝
  `)

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
