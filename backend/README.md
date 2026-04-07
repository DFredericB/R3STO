# R3STO API Backend

Complete Node.js/Express backend for R3STO restaurant management system.

## Overview

R3STO is a modern restaurant management platform providing:
- Reservation management with intelligent table assignment
- Real-time synchronization
- CRM for customer relationships
- Kitchen order management
- Payment processing (Stripe integration)
- Loyalty program support
- Multi-site management
- Public booking widget

## Features

### Core Modules

1. **Authentication** - JWT-based auth, role management (proprietaire, manager, serveur)
2. **Reservations** - Full CRUD with status tracking, filtering, search
3. **Tables** - Dynamic seating layout, availability checks, blocking/holding
4. **Clients** - CRM with visit history, preferences, blacklist
5. **Configuration** - Restaurant settings, services, rooms, users
6. **Widget** - Public-facing booking engine
7. **Payments** - Stripe integration, bill splitting, refunds
8. **Orders** - Kitchen order queue with status progression
9. **Sync** - Real-time state synchronization

### Database

SQLite with better-sqlite3 for simplicity:
- 24+ tables covering all entities
- Proper foreign keys and indexes
- Migration system with version tracking
- Demo data seed for testing

## Installation

### Prerequisites
- Node.js 16+
- npm or yarn

### Setup

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your configuration
# Update JWT_SECRET, database path, Stripe keys, etc.
nano .env

# Start development server
npm run dev

# Or production
npm start
```

## Configuration

### Environment Variables

```env
PORT=3001
JWT_SECRET=your-secret-key
STRIPE_SECRET_KEY=sk_test_...
DB_PATH=./data/r3sto.db
CORS_ORIGINS=https://app.r3sto.ch,http://localhost:5173
DEMO_MODE=false
```

### CORS

Configure trusted origins in `.env`:
```
CORS_ORIGINS=https://app.r3sto.ch,https://booking.r3sto.ch,http://localhost:5173
```

## API Endpoints

### Authentication

```
POST   /api/auth/register      Create restaurant + admin user
POST   /api/auth/login         Get JWT token
POST   /api/auth/logout        Logout (client-side)
GET    /api/auth/me            Get current user
POST   /api/auth/refresh       Refresh token
```

### Reservations

```
GET    /api/resas              List (with filters: date, svc, status)
GET    /api/resas/:id          Get single
POST   /api/resas              Create
PATCH  /api/resas/:id          Update
DELETE /api/resas/:id          Delete
POST   /api/resas/:id/status   Change status
POST   /api/resas/swap         Swap tables
GET    /api/resas/search       Search by name/email/phone
```

### Tables

```
GET    /api/tables             List all
GET    /api/tables/:id         Get single
POST   /api/tables             Create
PATCH  /api/tables/:id         Update
DELETE /api/tables/:id         Delete
PUT    /api/tables/batch       Batch update
POST   /api/tables/:id/block   Block table
POST   /api/tables/:id/unblock Unblock table
POST   /api/tables/:id/hold    Hold for later
POST   /api/tables/:id/release Release hold
```

### Clients (CRM)

```
GET    /api/clients            List all
GET    /api/clients/:id        Get single
POST   /api/clients            Create
PATCH  /api/clients/:id        Update
DELETE /api/clients/:id        Delete
GET    /api/clients/search     Search
GET    /api/clients/:id/stats  Get visit statistics
POST   /api/clients/:id/blacklist
POST   /api/clients/:id/unblacklist
```

### Configuration

```
GET    /api/resto              Get restaurant info
PATCH  /api/resto              Update restaurant
GET    /api/options            Get settings
PATCH  /api/options            Update settings
GET    /api/services           List services
PUT    /api/services           Replace all
GET    /api/salles             List rooms
PUT    /api/salles             Replace all
GET    /api/users              List team
PUT    /api/users              Update team
```

### Widget (Public Booking)

```
GET    /api/widget/:slug/config           Get config
GET    /api/widget/:slug/availability     Check availability
POST   /api/widget/:slug/book             Create booking
POST   /api/widget/validate-email         Email confirmation
POST   /api/widget/cancel                 Cancel booking
```

### Payments

```
POST   /api/payments/create-intent        Create payment intent
GET    /api/payments/bill/:table          Get table bill
POST   /api/payments/:id/confirm          Confirm payment
GET    /api/payments/:id/status           Check status
POST   /api/payments/:id/refund           Refund
POST   /api/payments/create-checkout-session    Stripe checkout
POST   /api/payments/create-portal-session      Stripe portal
```

### Orders

```
GET    /api/orders             List kitchen orders
GET    /api/orders/:id         Get single
POST   /api/orders             Create
PATCH  /api/orders/:id         Update
POST   /api/orders/:id/advance Advance status
DELETE /api/orders/:id         Delete
```

### Sync

```
GET    /api/sync/state         Full state dump
POST   /api/sync/push          Push changes
GET    /api/sync/events        Get pending events
```

### Health

```
GET    /health                 Status check
GET    /health/ready           Readiness probe
GET    /health/live            Liveness probe
```

## Authentication

Uses JWT tokens in Authorization header:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Roles:
- `proprietaire` - Restaurant owner, full access
- `manager` - Manager, can manage staff and settings
- `serveur` - Staff, limited access

## Database Schema

### Main Tables

- **restaurants** - Restaurant info
- **users** - Staff/team members
- **resas** - Reservations
- **tables** - Seating layout
- **services** - Midi/Soir services
- **salles** - Dining rooms
- **clients** - CRM customer database
- **orders** - Kitchen orders
- **options** - Restaurant settings
- **fermetures** - Closures/holidays
- **gift_cards** - Gift card inventory
- **reviews** - Customer reviews
- **loyalty_config** - Loyalty program settings
- **loyalty_cards** - Customer loyalty cards
- **room_items** - Room decorations/obstacles
- **sites** - Multi-site info
- **notifications** - System notifications
- **audit_logs** - Change tracking

## Rate Limiting

In-memory rate limiting: 100 requests per minute per IP

## Error Handling

Standard HTTP error codes with JSON responses:

```json
{
  "message": "Error description",
  "errors": {}
}
```

## Deployment

### On Infomaniak (Node.js)

1. Push code to Git repository
2. Configure environment variables in hosting panel
3. Set start command to `node server.js`
4. Database will persist in `data/r3sto.db`

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3001
CMD ["node", "server.js"]
```

### Production Checklist

- [ ] Change JWT_SECRET
- [ ] Set NODE_ENV=production
- [ ] Configure CORS_ORIGINS for your domains
- [ ] Add Stripe API keys
- [ ] Set up SSL/TLS certificate
- [ ] Configure database backups
- [ ] Enable rate limiting
- [ ] Add monitoring/logging
- [ ] Review security headers (Helmet)

## Development

### File Structure

```
backend/
├── server.js              Main entry point
├── db.js                  SQLite database setup
├── package.json           Dependencies
├── .env.example           Environment template
├── middleware/
│   ├── auth.js            JWT & password handling
│   ├── errorHandler.js    Error responses
│   └── logging.js         Request logging & rate limiting
└── routes/
    ├── auth.js            Authentication
    ├── resas.js           Reservations
    ├── tables.js          Tables
    ├── clients.js         CRM
    ├── config.js          Configuration
    ├── widget.js          Public booking
    ├── payments.js        Payments
    ├── orders.js          Kitchen orders
    ├── sync.js            Synchronization
    └── health.js          Health checks
```

### Running in Development

```bash
npm run dev    # With file watching
npm start      # Normal start
```

Visit http://localhost:3001/api for API overview

### Testing Endpoints

```bash
# Register
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "restaurantName": "Test Restaurant",
    "email": "test@example.com",
    "password": "password123"
  }'

# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'

# Use token in headers
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3001/api/resto
```

## Monitoring

Check server health:

```bash
curl http://localhost:3001/health
```

## Support

For issues or questions about R3STO, contact the development team.

## License

R3STO - All rights reserved
