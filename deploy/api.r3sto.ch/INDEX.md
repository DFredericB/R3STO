# R3STO API - Complete File Index

## Quick Navigation

### Getting Started (Read These First)
1. **QUICKSTART.md** - 5-minute setup guide, ideal for first-time deployment
2. **README.md** - Complete API documentation with examples
3. **MANIFEST.txt** - High-level overview of all deliverables

### For Deployment
1. **DEPLOYMENT.md** - Step-by-step deployment instructions and checklist
2. **ARCHITECTURE.md** - System design, database schema, security layers

### For Testing & Integration
1. **TESTING.md** - Comprehensive testing guide with curl examples
2. All PHP files listed below

---

## Production Files (Copy to api.r3sto.ch)

### 1. Core Application Files

#### index.php (8.2 KB) - Main Router
The entry point for all API requests.
- CORS header management
- HTTP method and path parsing
- Route matching and dispatcher
- JWT token extraction and verification
- Request/response handling
- Error catching and formatting

**Contains:** APIRouter class with route definitions

#### config.php (424 bytes) - Configuration
Database credentials, JWT secret, and setup key.

**IMPORTANT:** Must be configured before deployment
- DB_HOST: localhost (NOT external hostname)
- DB_PORT: 3306
- DB_USER: pl7wy9_R3STO
- DB_PASS: RueNeuve20#1081
- DB_NAME: pl7wy9_R3STO
- JWT_SECRET: Should be changed in production
- CORS_ORIGINS: Change from "*" to specific domains

#### db.php (2.1 KB) - Database Layer
PDO wrapper for database operations.

**Contains:** Database class with static methods
- connect() - Get PDO connection
- query() - Execute prepared statement
- fetchOne() - Get single row
- fetchAll() - Get multiple rows
- insert() - Insert and return ID
- update() - Update rows
- testConnection() - Health check

### 2. Authentication & Security

#### auth.php (5.8 KB) - User Management
User registration, login, profile retrieval, and JWT tokens.

**Contains:**
- JWTHandler class: JWT token creation/verification
  - generateJWT(userId, email, role) - Create 30-day token
  - verifyJWT(token) - Validate and decode token
  - getAuthUser(headers) - Extract user from request
  
- AuthHandler class: User operations
  - register(data) - Create new user account
  - login(data) - Authenticate user
  - getMe(userId) - Get user profile

**Security:** Bcrypt password hashing, HMAC-SHA256 JWT

### 3. Business Logic

#### restaurants.php (7.5 KB) - Restaurant Management
Complete CRUD operations for restaurants.

**Contains:** RestaurantHandler class
- createRestaurant(userId, data) - Add new restaurant
- listRestaurants(userId) - Get user's restaurants
- getRestaurant(userId, id) - Get single restaurant
- updateRestaurant(userId, id, data) - Update restaurant

**Features:** Ownership validation, plan/status enums

#### admin.php (3.2 KB) - Admin Dashboard
Administrative endpoints for business analytics.

**Contains:** AdminHandler class
- checkAdminRole(role) - Verify admin permission
- getClients() - List all restaurants (with owners)
- getStats() - Dashboard statistics (totals, by_plan, etc.)

**Security:** Role-based access control (admin/superadmin only)

### 4. Database Setup

#### setup.php (4.2 KB) - Database Initialization
Creates tables and default admin user.

**Contains:** SetupHandler class
- validateSetupKey(key) - Verify setup authorization
- createTables() - Create users, restaurants, sessions tables
- createDefaultAdmin() - Insert default superadmin
- runSetup() - Execute all setup operations

**Access:** GET /?key=r3sto_setup_2026

**Default Admin:**
- Email: didier@r3sto.com
- Password: R3STO2026!
- Role: superadmin

### 5. Web Server Configuration

#### .htaccess (477 bytes) - URL Rewriting
Routes all requests to index.php and sets CORS headers.

**Configuration:**
- mod_rewrite enabled and active
- Preserves existing files and directories
- Sets CORS response headers
- Handles OPTIONS preflight requests

---

## Documentation Files

### README.md (6.9 KB)
**Complete API Reference**
- All endpoint definitions
- Request/response examples
- Database schema
- Authentication details
- Error codes and meanings
- CORS configuration
- Testing examples
- Security notes

**Read this for:** Full API specification

### QUICKSTART.md (5+ KB)
**Fast Setup Guide**
- Files overview table
- 3-step deployment
- 5-minute API overview
- Common curl examples
- File dependency diagram
- Quick testing checklist
- Configuration instructions
- Troubleshooting tips

**Read this for:** Quick deployment and testing

### TESTING.md (9.3 KB)
**Comprehensive Testing Guide**
- Test every endpoint
- Example curl commands
- Expected responses
- Error testing scenarios
- CORS validation
- Batch test script template
- Performance benchmarks
- Security validation checklist

**Read this for:** Complete testing of API

### DEPLOYMENT.md (5.1 KB)
**Deployment Instructions**
- Pre-deployment checklist
- FTP upload steps
- File permissions
- Apache module requirements
- Database initialization
- Post-deployment security
- Testing after deployment
- Troubleshooting guide
- Maintenance tasks

**Read this for:** Deploying to production

### ARCHITECTURE.md (10+ KB)
**System Design Documentation**
- Architecture diagrams
- Request flow explanation
- Security layers
- JWT token structure
- Database design details
- Code structure overview
- Performance considerations
- Deployment topology
- Error handling strategy
- Future enhancement ideas

**Read this for:** Understanding the system design

### MANIFEST.txt (This File)
**Complete Inventory**
- All files listed with descriptions
- Database configuration
- API routes summary
- File statistics
- Deployment checklist
- Security features
- Version information

**Read this for:** High-level overview

### INDEX.md (This File)
**Navigation Guide**
- File organization
- Where to start
- File descriptions
- Quick links

**Read this for:** Navigating the documentation

---

## Database Schema

### users table
```
id (INT, PK, auto-increment)
email (VARCHAR 255, UNIQUE)
password_hash (VARCHAR 255)
name (VARCHAR 255)
role (ENUM: user, admin, superadmin) DEFAULT user
created_at (TIMESTAMP)
updated_at (TIMESTAMP)
```

### restaurants table
```
id (INT, PK, auto-increment)
owner_id (INT, FK → users.id)
name (VARCHAR 255)
city (VARCHAR 255)
address (TEXT)
phone (VARCHAR 50)
plan (ENUM: bistro, resto, gastro) DEFAULT bistro
status (ENUM: active, paused, trial, suspended) DEFAULT trial
tables_count (INT) DEFAULT 0
stripe_customer_id (VARCHAR 255)
created_at (TIMESTAMP)
updated_at (TIMESTAMP)
```

### sessions table
```
id (INT, PK, auto-increment)
user_id (INT, FK → users.id)
token_hash (VARCHAR 255)
expires_at (TIMESTAMP)
created_at (TIMESTAMP)
```

---

## API Endpoint Summary

### Health & Setup
- `GET /health` - Status check (no auth)
- `GET /?key=...` - Database setup (no auth)

### Authentication
- `POST /auth/register` - Create account (no auth)
- `POST /auth/login` - Login (no auth)
- `GET /auth/me` - Profile (JWT auth)

### Restaurants
- `POST /restaurants` - Create (JWT auth)
- `GET /restaurants` - List (JWT auth)
- `GET /restaurants/:id` - Get (JWT auth)
- `PUT /restaurants/:id` - Update (JWT auth)

### Admin
- `GET /admin/clients` - All restaurants (admin auth)
- `GET /admin/stats` - Statistics (admin auth)

---

## Deployment Checklist

### Pre-Deployment
- [ ] All 13 files created
- [ ] Database credentials verified
- [ ] JWT secret configured
- [ ] CORS settings reviewed

### Deployment
- [ ] Files uploaded to api.r3sto.ch
- [ ] .htaccess uploaded (hidden file)
- [ ] Permissions set to 644
- [ ] Apache modules enabled

### Post-Deployment
- [ ] /health endpoint tested
- [ ] Setup endpoint executed
- [ ] All routes tested (see TESTING.md)
- [ ] Security settings configured
- [ ] Error logs monitored

---

## File Dependencies

```
index.php (main router)
├── config.php (configuration)
├── db.php (database)
├── auth.php (authentication)
├── restaurants.php (CRUD)
├── admin.php (admin handlers)
└── setup.php (database init)

.htaccess (URL rewriting to index.php)

Documentation files (no dependencies)
```

All PHP files use `require_once` to avoid duplicate loading.

---

## Quick Command Reference

### Health Check
```bash
curl https://api.r3sto.ch/health
```

### Setup Database
```bash
curl "https://api.r3sto.ch/?key=r3sto_setup_2026"
```

### Register
```bash
curl -X POST https://api.r3sto.ch/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"Pass123","name":"Name"}'
```

### Login
```bash
curl -X POST https://api.r3sto.ch/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"Pass123"}'
```

### Protected Request (with token)
```bash
curl https://api.r3sto.ch/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

See TESTING.md for complete examples.

---

## Key Configuration Values

```php
// config.php
DB_HOST = 'localhost'          // MUST be localhost (Infomaniak blocks external)
DB_PORT = 3306
DB_USER = 'pl7wy9_R3STO'
DB_PASS = 'RueNeuve20#1081'
DB_NAME = 'pl7wy9_R3STO'
JWT_SECRET = 'r3sto_jwt_secret_2026_prod'  // CHANGE IN PRODUCTION
CORS_ORIGINS = '*'              // RESTRICT TO YOUR DOMAINS IN PRODUCTION
SETUP_KEY = 'r3sto_setup_2026'  // PROTECT OR REMOVE AFTER SETUP
```

---

## Security Summary

✓ Bcrypt password hashing
✓ JWT tokens (HMAC-SHA256, 30-day expiry)
✓ PDO prepared statements (SQL injection prevention)
✓ Authorization checks on protected routes
✓ Role-based access control (admin endpoints)
✓ CORS headers for cross-origin safety
✓ No stack trace exposure
✓ Input validation (email, password, enums)
✓ Local database only (Infomaniak requirement)
✓ Ownership validation for resources

---

## Support & Resources

- **Infomaniak Hosting:** https://www.infomaniak.com
- **PHP Documentation:** https://www.php.net/manual/
- **MariaDB Docs:** https://mariadb.org/documentation/
- **JWT.io:** https://jwt.io (token debugger)

---

## Version Information

- **API Version:** 1.0
- **Created:** 2026-03-27
- **Status:** Production Ready
- **Platform:** PHP 7.0+ + MariaDB 5.5+
- **Deployment:** Infomaniak Shared Hosting (api.r3sto.ch)

---

## Getting Help

1. **Setup issues?** → Read DEPLOYMENT.md
2. **Want to test?** → Read TESTING.md
3. **Need full docs?** → Read README.md
4. **Understanding design?** → Read ARCHITECTURE.md
5. **Quick reference?** → Read QUICKSTART.md

Start with QUICKSTART.md for fastest results.
