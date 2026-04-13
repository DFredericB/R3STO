# Quick Start Guide

Get R3STO API running in 5 minutes.

## Prerequisites

- Node.js 16+ installed
- npm or yarn
- Text editor

## 1. Install Dependencies

```bash
cd backend
npm install
```

## 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` if needed (defaults work for local development):

```env
PORT=3001
JWT_SECRET=dev-secret-change-in-production
NODE_ENV=development
DB_PATH=./data/r3sto.db
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

## 3. Start Server

```bash
npm run dev
```

You should see:

```
╔════════════════════════════════════════════════════════════╗
║         R3STO Restaurant Management API                   ║
║════════════════════════════════════════════════════════════║
║  Environment:      development
║  Port:             3001
║  CORS Origins:     http://localhost:5173
╚════════════════════════════════════════════════════════════╝

  API Available at: http://localhost:3001/api
  Status Check:     http://localhost:3001/health
```

## 4. Test the API

### Health Check

```bash
curl http://localhost:3001/health
```

Response:
```json
{
  "status": "ok",
  "uptime": 2,
  "timestamp": "2026-03-30T10:30:45.123Z",
  "version": "1.0.0"
}
```

### Register Restaurant

```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "restaurantName": "My Restaurant",
    "email": "owner@restaurant.com",
    "password": "SecurePassword123"
  }'
```

Response:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "owner@restaurant.com",
    "role": "proprietaire",
    "restaurantId": "f47ac10b-58cc-4372-a567-0e02b2c3d479"
  }
}
```

Save the token for next step.

### Login

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "owner@restaurant.com",
    "password": "SecurePassword123"
  }'
```

### Get Restaurant Info

Using the token from registration/login:

```bash
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/resto
```

### Create a Table

```bash
curl -X POST http://localhost:3001/api/tables \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "salle": "main-room",
    "n": "T1",
    "shape": "round",
    "capMin": 2,
    "capMax": 4,
    "x": 0,
    "y": 0,
    "w": 15,
    "h": 15
  }'
```

## 5. View All Endpoints

Visit in browser: http://localhost:3001/api

This shows all available endpoints and usage.

## Common Workflows

### Create a Complete Setup

1. **Register Restaurant** (POST /api/auth/register)
2. **Create Salle** (POST via /api/salles)
3. **Create Tables** (POST /api/tables)
4. **Create Services** (POST /api/services)
5. **Create Reservation** (POST /api/resas)

### Make a Reservation from Widget

1. **Get Config** (GET /api/widget/restaurant-slug/config) - No auth
2. **Check Availability** (GET /api/widget/restaurant-slug/availability?date=2026-03-30&svc=soir&cvt=4) - No auth
3. **Create Booking** (POST /api/widget/restaurant-slug/book) - No auth

## Database

- **Location**: `./data/r3sto.db` (auto-created)
- **Type**: SQLite
- **Tables**: 24 auto-created tables
- **Data persists** between restarts

To reset database:

```bash
rm -rf data/
npm run dev  # Will recreate fresh DB
```

## Development Tools

### View Logs

```bash
# Already shown in console with timestamps
# Status codes are color-coded:
# - Green (2xx): Success
# - Yellow (4xx): Client error
# - Red (5xx): Server error
```

### Monitor Activity

```bash
# Enable debug mode (optional)
DEBUG=* npm run dev
```

### Test with Postman/Insomnia

1. Create new request
2. Set method (GET, POST, etc.)
3. Set URL (http://localhost:3001/api/...)
4. Add header: `Authorization: Bearer YOUR_TOKEN`
5. Add header: `Content-Type: application/json`
6. Send

## Common Issues

### Port 3001 Already in Use

```bash
# Find what's using it
lsof -i :3001

# Or change port in .env
PORT=3002 npm run dev
```

### Database Locked

```bash
# Kill any stale processes
pkill -f "node server.js"

# Restart
npm run dev
```

### CORS Errors

Check `.env` CORS_ORIGINS includes your frontend URL:

```env
CORS_ORIGINS=http://localhost:5173,http://localhost:3000,https://app.r3sto.ch
```

### Can't Connect to Database

Ensure `data/` directory exists and is writable:

```bash
mkdir -p data
chmod 755 data
```

## Next Steps

- Read [README.md](./README.md) for complete API documentation
- Check [DEPLOYMENT.md](./DEPLOYMENT.md) for production setup
- Review [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) for architecture

## API Documentation

Full API endpoints: http://localhost:3001/api

Key sections:
- **Authentication**: Register, login, logout
- **Reservations**: CRUD, status changes, search
- **Tables**: Management, blocking, holding
- **Clients**: CRM database, search, stats
- **Widget**: Public booking engine

## Support

For issues:

1. Check server console for error messages
2. Verify network request (see Network tab in browser dev tools)
3. Check authorization header has valid token
4. Review error response for details

## Production Deployment

When ready for production:

1. Follow [DEPLOYMENT.md](./DEPLOYMENT.md)
2. Change JWT_SECRET in .env
3. Set NODE_ENV=production
4. Configure CORS_ORIGINS for your domains
5. Set up database backups
6. Enable HTTPS

## What's Included

- Express.js server
- SQLite database with 24 tables
- JWT authentication
- 13 route modules with 80+ endpoints
- Error handling & logging
- Rate limiting
- CORS security
- Input validation
- Complete documentation

---

**Questions?** Check the full documentation in README.md or DEPLOYMENT.md
