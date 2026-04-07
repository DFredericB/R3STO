# R3STO API Quick Start

## Files Overview

| File | Purpose | Size |
|------|---------|------|
| `index.php` | Main router & request handler | 8 KB |
| `config.php` | Database & JWT configuration | 0.5 KB |
| `db.php` | PDO database wrapper | 2 KB |
| `auth.php` | Authentication & JWT tokens | 6 KB |
| `restaurants.php` | Restaurant CRUD operations | 7.5 KB |
| `admin.php` | Admin dashboard endpoints | 3 KB |
| `setup.php` | Database initialization | 4 KB |
| `.htaccess` | URL rewriting & CORS | 0.5 KB |
| **Total** | | **31 KB** |

## Deployment in 3 Steps

### 1. Upload Files
- FTP to api.r3sto.ch on Infomaniak
- Upload all files to public_html/
- Ensure .htaccess is uploaded (enable hidden files in FTP)

### 2. Initialize Database
Visit: `https://api.r3sto.ch/?key=r3sto_setup_2026`

This creates:
- Users table
- Restaurants table
- Sessions table
- Default superadmin: didier@r3sto.com / R3STO2026!

### 3. Verify Installation
Visit: `https://api.r3sto.ch/health`

Expected response:
```json
{
  "status": "ok",
  "database": "connected"
}
```

## 5-Minute API Overview

### Database Credentials (Pre-configured)
```
Host: localhost
User: pl7wy9_R3STO
Pass: RueNeuve20#1081
DB: pl7wy9_R3STO
```

### User Registration
```bash
curl -X POST https://api.r3sto.ch/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email":"user@example.com",
    "password":"SecurePass123",
    "name":"User Name"
  }'
```
Returns JWT token in response.

### User Login
```bash
curl -X POST https://api.r3sto.ch/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email":"user@example.com",
    "password":"SecurePass123"
  }'
```

### Access Protected Endpoints
Use the token in Authorization header:
```bash
curl https://api.r3sto.ch/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Create Restaurant
```bash
curl -X POST https://api.r3sto.ch/restaurants \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name":"My Restaurant",
    "city":"Geneva",
    "plan":"bistro"
  }'
```

## Core Concepts

### Pure PHP, No Dependencies
- No Composer required
- No external libraries
- Works on standard PHP 7.0+ hosting
- PDO + bcrypt + JSON only

### JWT Authentication
- 30-day expiration
- HMAC-SHA256 signed
- Tokens in Authorization header
- No database session storage

### REST Endpoints
```
GET  /health                      Status check
POST /auth/register               Create account
POST /auth/login                  Login
GET  /auth/me                     Current user

POST /restaurants                 Create restaurant
GET  /restaurants                 List user's restaurants
GET  /restaurants/:id             Get details
PUT  /restaurants/:id             Update restaurant

GET  /admin/clients               All restaurants (admin)
GET  /admin/stats                 Dashboard stats (admin)
```

### Request/Response Format
- All requests must have: `Content-Type: application/json`
- All responses are JSON
- POST/PUT: body contains JSON data
- GET: query parameters supported

### HTTP Status Codes
- 200: Success (GET, PUT)
- 201: Created (POST)
- 400: Bad request (validation error)
- 401: Unauthorized (invalid/missing token)
- 403: Forbidden (insufficient permissions)
- 404: Not found
- 500: Server error

## File Dependencies

```
index.php (main entry)
├── config.php (configuration)
├── db.php (database)
├── auth.php (authentication)
├── restaurants.php (CRUD)
├── admin.php (admin handlers)
└── setup.php (database init)

.htaccess (URL rewriting)
```

All files are automatically loaded by index.php via require_once.

## Database Schema

### users table
```
id, email (unique), password_hash, name, role, created_at, updated_at
Roles: user, admin, superadmin
```

### restaurants table
```
id, owner_id (FK users), name, city, address, phone
plan, status, tables_count, stripe_customer_id
created_at, updated_at
Plans: bistro, resto, gastro
Status: active, paused, trial, suspended
```

### sessions table
```
id, user_id (FK users), token_hash, expires_at, created_at
```

## Security Features

✓ Bcrypt password hashing (password_hash/verify)
✓ JWT tokens with HMAC-SHA256
✓ PDO prepared statements (SQL injection protection)
✓ CORS headers for cross-origin requests
✓ No stack trace exposure in errors
✓ Authorization checks on protected routes
✓ Role-based access control (admin endpoints)
✓ Local database connection only (Infomaniak requirement)

## Common Issues & Solutions

### "Database connection failed"
- Check localhost is used (not external hostname)
- Verify credentials in config.php
- Ensure database is created: pl7wy9_R3STO

### "404 Endpoint not found"
- Check .htaccess is uploaded
- Verify mod_rewrite is enabled in Infomaniak
- Check URL format matches routes

### "Unauthorized" / "Forbidden"
- Ensure token is in Authorization header
- Check token format: "Bearer TOKEN"
- Verify token hasn't expired (30 days)
- For admin endpoints: verify user role is admin/superadmin

### "Bad request"
- Check JSON format is valid
- Verify all required fields are present
- Check Content-Type header is application/json

## Quick Testing Checklist

After deployment, run these tests:

- [ ] `GET /health` → 200 OK
- [ ] `GET /?key=r3sto_setup_2026` → 200 OK (creates tables)
- [ ] `POST /auth/register` → 201 Created
- [ ] `POST /auth/login` → 200 OK (returns token)
- [ ] `GET /auth/me` (with token) → 200 OK
- [ ] `POST /restaurants` (with token) → 201 Created
- [ ] `GET /restaurants` (with token) → 200 OK
- [ ] `GET /admin/stats` (admin token) → 200 OK
- [ ] `POST /auth/register` (duplicate email) → 400 Bad Request
- [ ] `GET /invalid/path` → 404 Not Found

## Configuration

Edit `config.php` to change:
- JWT_SECRET: Change from default for production
- CORS_ORIGINS: Restrict from "*" to specific domains
- DB credentials: Already set for Infomaniak

## Performance

- Response time: < 100ms
- No caching layer needed initially
- Database: Direct queries (no ORM overhead)
- API is stateless (scales horizontally)

## Next Steps

1. Deploy all files to api.r3sto.ch
2. Run setup: `/?key=r3sto_setup_2026`
3. Test all endpoints (see TESTING.md)
4. Change JWT_SECRET in config.php
5. Restrict CORS_ORIGINS to your domains
6. Remove or protect setup endpoint
7. Set up monitoring/logging
8. Plan integration with booking app

## Support Resources

- Full API docs: see README.md
- Deployment guide: see DEPLOYMENT.md
- Testing examples: see TESTING.md
- PHP date: 2026-03-27
- API version: 1.0
- Database: MariaDB 5.5+

## Default Credentials (Change After Setup)

**Superadmin:**
- Email: didier@r3sto.com
- Password: R3STO2026!
- Role: superadmin

**Setup Key:**
- Key: r3sto_setup_2026
- Purpose: Initialize database tables
- Recommendation: Disable after first use
