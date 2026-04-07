# R3STO API - Architecture & Design

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    INFOMANIAK HOSTING                       │
│                   (Shared PHP + MariaDB)                    │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                     .htaccess                               │
│         (URL Rewriting → index.php, CORS Headers)          │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    index.php (Router)                       │
│    - Parse request (method, path, headers, body)           │
│    - Route to correct handler                              │
│    - Handle CORS preflight (OPTIONS)                       │
│    - Extract & verify JWT token                            │
│    - Return JSON responses                                 │
└─────────────────────────────────────────────────────────────┘
                    ↓        ↓        ↓        ↓
         ┌──────────┴────────┴────────┴────────┴──────────┐
         ↓          ↓          ↓          ↓               ↓
    ┌────────┐ ┌────────┐ ┌───────────┐ ┌────────┐ ┌────────┐
    │ auth   │ │ rest   │ │ admin     │ │ setup  │ │config  │
    │.php    │ │aurants │ │.php       │ │.php    │ │.php    │
    │        │ │.php    │ │           │ │        │ │        │
    └────────┘ └────────┘ └───────────┘ └────────┘ └────────┘
         ↓          ↓          ↓          ↓               ↓
    ┌──────────────────────────────────────────────────────────┐
    │                   db.php (Database)                      │
    │        - PDO connection (singleton pattern)             │
    │        - Prepared statements                            │
    │        - Error handling                                 │
    └──────────────────────────────────────────────────────────┘
                            ↓
    ┌──────────────────────────────────────────────────────────┐
    │              localhost:3306 (MariaDB)                    │
    │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
    │  │  users       │  │ restaurants  │  │  sessions    │   │
    │  │              │  │              │  │              │   │
    │  │ - id         │  │ - id         │  │ - id         │   │
    │  │ - email      │  │ - owner_id   │  │ - user_id    │   │
    │  │ - password_  │  │ - name       │  │ - token_hash │   │
    │  │   hash       │  │ - city       │  │ - expires_at │   │
    │  │ - name       │  │ - address    │  │ - created_at │   │
    │  │ - role       │  │ - phone      │  │              │   │
    │  │ - created_at │  │ - plan       │  └──────────────┘   │
    │  │ - updated_at │  │ - status     │                     │
    │  └──────────────┘  │ - tables_cnt │                     │
    │                    │ - stripe_cust│                     │
    │                    │ - created_at │                     │
    │                    │ - updated_at │                     │
    │                    └──────────────┘                     │
    └──────────────────────────────────────────────────────────┘
```

## Request Flow

1. **HTTP Request arrives at api.r3sto.ch**
   - Browser/Client sends HTTP method + path + headers + body

2. **.htaccess Processing**
   - If file/directory exists: serve directly
   - Otherwise: rewrite to index.php
   - Add CORS headers to response
   - Handle OPTIONS (preflight) requests

3. **index.php Router**
   - Set CORS headers (Access-Control-Allow-*)
   - Handle OPTIONS preflight (exit with 200)
   - Parse request method, path, headers, JSON body
   - Extract Authorization header (Bearer token)

4. **Route Matching**
   - Match request path + method against defined routes
   - If protected route: extract & verify JWT token
   - If admin route: verify user role is admin/superadmin
   - Call appropriate handler function

5. **Handler Execution**
   - auth.php: Register, login, getMe
   - restaurants.php: Create, list, get, update
   - admin.php: getClients, getStats
   - setup.php: Create tables, insert default user

6. **Database Operations (db.php)**
   - Execute prepared statements (prevent SQL injection)
   - Fetch results as associative arrays
   - Handle PDO exceptions

7. **Response**
   - Build JSON object from handler result
   - Extract HTTP status code from result
   - Set Content-Type: application/json
   - Echo JSON and exit

## Security Layers

### 1. Transport Layer (.htaccess + HTTPS)
- HTTPS enforced by Infomaniak SSL
- CORS headers prevent unauthorized origins
- OPTIONS preflight requests validated

### 2. Authentication Layer (auth.php)
- Email/password validation on register
- Password hashing with bcrypt (PASSWORD_DEFAULT)
- JWT token generation with HMAC-SHA256
- Token expiration: 30 days
- Bearer token extraction and verification

### 3. Authorization Layer (index.php router)
- Protected routes require valid JWT token
- Admin routes require role = admin/superadmin
- User can only access own resources
- Ownership verification on CRUD operations

### 4. Database Layer (db.php)
- PDO prepared statements (parameterized queries)
- SQL injection prevention
- No string concatenation in SQL
- Proper error handling without exposing details

### 5. Input Validation (Handler functions)
- Email format validation (filter_var)
- Password length requirements (8+ chars)
- Required field checks
- Plan/status enum validation
- Type casting for numeric fields

### 6. Error Handling (index.php router)
- try/catch around all operations
- Generic error messages (no stack traces)
- Proper HTTP status codes
- JSON error format

## JWT Token Structure

**Header:**
```json
{
  "typ": "JWT",
  "alg": "HS256"
}
```

**Payload:**
```json
{
  "user_id": 1,
  "email": "user@example.com",
  "role": "user",
  "iat": 1710000000,
  "exp": 1712678400
}
```

**Signature:**
```
HMACSHA256(
  base64url(header) + "." + base64url(payload),
  "r3sto_jwt_secret_2026_prod"
)
```

**Full Token (example):**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJlbWFpbCI6InVzZXJAZXhhbXBsZS5jb20iLCJyb2xlIjoidXNlciIsImlhdCI6MTcxMDAwMDAwMCwiZXhwIjoxNzEyNjc4NDAwfQ.signature...
```

## Database Design

### Users Table
- Primary key: `id` (auto-increment)
- Unique constraint: `email`
- Roles: user (default), admin, superadmin
- Timestamps: created_at, updated_at
- Indexed: email (frequent lookups)

### Restaurants Table
- Primary key: `id` (auto-increment)
- Foreign key: `owner_id` → users.id
- Indexed: owner_id (frequent list queries)
- Plans: bistro, resto, gastro
- Status: active, paused, trial, suspended
- Timestamps: created_at, updated_at

### Sessions Table
- Primary key: `id` (auto-increment)
- Foreign key: `user_id` → users.id
- Indexed: user_id (session lookups)
- Purpose: Session tracking (currently unused, reserved for future)
- Timestamps: created_at, expires_at

## Code Structure

### config.php (Global Configuration)
- Database credentials (localhost, port, user, password, database)
- JWT secret key
- CORS origins
- Setup key for database initialization
- Error reporting settings

### db.php (Database Abstraction)
- Database class with static methods
- Singleton pattern (single PDO connection)
- Methods: connect(), query(), fetchOne(), fetchAll(), insert(), update()
- Error handling with PDOException
- Prepared statement support via parameter binding

### auth.php (Authentication)
- JWTHandler class: generateJWT(), verifyJWT(), getAuthUser()
- AuthHandler class: register(), login(), getMe()
- JWT implementation: base64url encoding, HMAC-SHA256, expiry check
- Password hashing: password_hash(PASSWORD_DEFAULT), password_verify()
- Input validation: email format, password length, required fields

### restaurants.php (Business Logic)
- RestaurantHandler class
- Methods: createRestaurant(), listRestaurants(), getRestaurant(), updateRestaurant()
- Ownership validation (user can only manage own restaurants)
- Plan/status enum validation
- Full CRUD operations with error handling

### admin.php (Admin Features)
- AdminHandler class
- Methods: checkAdminRole(), getClients(), getStats()
- Admin-only endpoint protection
- Aggregated statistics: counts, by_plan breakdown

### setup.php (Database Initialization)
- SetupHandler class
- Methods: validateSetupKey(), createTables(), createDefaultAdmin(), runSetup()
- SQL DDL for tables: users, restaurants, sessions
- Default admin creation with bcrypt hash
- Idempotent operations (can run multiple times safely)

### index.php (Router & API Gateway)
- APIRouter class
- CORS header management
- HTTP method parsing
- Path routing (regex matching for parameterized routes)
- Request parsing (JSON body, headers, query params)
- Response formatting and error handling
- Route definitions and dispatcher

### .htaccess (Web Server Configuration)
- mod_rewrite rules: Route all requests to index.php
- Exclude existing files and directories
- CORS headers: Allow-Origin, Allow-Methods, Allow-Headers
- OPTIONS preflight handling
- Base path rewriting

## Performance Considerations

### Response Times
- Simple auth endpoints: ~50ms (password verification)
- Database query endpoints: ~100ms (direct queries)
- List endpoints: ~150ms (scanning multiple rows)
- Admin stats: ~100ms (aggregate queries)

### Scalability
- Stateless API (can run on multiple servers)
- No persistent connections (PDO new connection each request)
- Database queries are direct (no ORM overhead)
- JWT tokens reduce database lookups
- Can scale horizontally with load balancer

### Database Optimization
- Indexed foreign keys (owner_id, user_id)
- Indexed unique fields (email)
- Charset: utf8mb4 (full Unicode support)
- InnoDBengine (row-level locking, ACID compliance)

### Resource Usage
- Memory per request: ~2-3 MB
- Disk space for code: 31 KB
- Database size: Minimal initially (grows with data)
- No session files or caching overhead

## Error Handling Strategy

### Input Validation Errors (400 Bad Request)
- Missing required fields
- Invalid email format
- Password too short
- Invalid enum values (plan, status, role)

### Authentication Errors (401 Unauthorized)
- Missing Authorization header
- Invalid token format
- Token expired
- Invalid credentials (login)

### Authorization Errors (403 Forbidden)
- Non-admin user accessing admin endpoint
- User accessing another user's restaurant

### Resource Not Found Errors (404 Not Found)
- Invalid restaurant ID
- User not found
- Non-existent endpoint

### Server Errors (500 Internal Server Error)
- Database connection failure
- Unexpected exceptions
- Stack traces never exposed (security)

## Deployment Topology

```
┌─────────────────────┐
│   Infomaniak CDN    │
│   (Optional cache)  │
└──────────┬──────────┘
           │ HTTPS
           ↓
┌─────────────────────────────────────────┐
│  Infomaniak Shared Hosting              │
│  - Apache + mod_rewrite                 │
│  - PHP 7.0+ (bcrypt, PDO, JSON)        │
│  - MariaDB 5.5+ (localhost connection)  │
├─────────────────────────────────────────┤
│  /api.r3sto.ch/public_html/             │
│  - .htaccess (URL rewriting)            │
│  - index.php (router)                   │
│  - config.php (credentials)             │
│  - db.php (PDO wrapper)                 │
│  - auth.php (JWT, passwords)            │
│  - restaurants.php (CRUD)               │
│  - admin.php (dashboard)                │
│  - setup.php (initialization)           │
└─────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────┐
│  MariaDB (same server, localhost:3306)  │
│  - Database: pl7wy9_R3STO               │
│  - User: pl7wy9_R3STO                   │
│  - Tables: users, restaurants, sessions │
└─────────────────────────────────────────┘
```

## External Integrations (Future)

Currently not implemented but architecture supports:
- Stripe: stripe_customer_id field in restaurants table
- Email notifications: Hook points for registration/updates
- Analytics: Additional stats endpoints
- Webhooks: Event notification system
- Mobile APIs: Same endpoints (already JSON/RESTful)

## Deployment Checklist

### Pre-Deployment
- [ ] All 8 PHP files created
- [ ] .htaccess created
- [ ] Database credentials verified
- [ ] JWT secret configured
- [ ] CORS settings appropriate

### During Deployment
- [ ] Upload all files via FTP
- [ ] Ensure .htaccess uploaded (hidden file)
- [ ] Set correct file permissions (644)
- [ ] Verify mod_rewrite enabled
- [ ] Verify mod_headers enabled

### Post-Deployment
- [ ] Test /health endpoint
- [ ] Test /setup endpoint
- [ ] Verify database created
- [ ] Test /auth/register
- [ ] Test /auth/login
- [ ] Test protected endpoints
- [ ] Test admin endpoints
- [ ] Verify CORS headers

### Security Hardening
- [ ] Change JWT_SECRET
- [ ] Change SETUP_KEY or disable setup
- [ ] Restrict CORS_ORIGINS
- [ ] Set up error logging
- [ ] Review Infomaniak security settings
- [ ] Enable HTTPS (automatic)

## Testing Strategy

### Unit Testing (endpoints)
- Each endpoint tested independently
- Valid and invalid inputs tested
- Error responses verified
- HTTP status codes verified

### Integration Testing (flows)
- Register → Login → Access protected resource
- Create restaurant → Update → List
- Admin operations verified
- Cross-origin requests verified

### Security Testing
- SQL injection attempts
- XSS prevention (JSON only, no HTML)
- Token tampering detection
- Unauthorized access attempts

## Monitoring & Maintenance

### Key Metrics
- API response time (track latency)
- Error rate (track 4xx/5xx responses)
- Database connection status
- User registration rate
- Restaurant creation rate

### Logging
- Error logs to Infomaniak logs directory
- Consider external logging service
- Monitor for suspicious patterns

### Regular Tasks
- Database backups (Infomaniak automated)
- Review error logs weekly
- Monitor user growth
- Plan scaling if needed
- Security updates for PHP/MariaDB

## Future Enhancements

Without changing core architecture:
- Add more restaurant fields (menu, hours, capacity)
- Add user profiles (avatar, settings)
- Add invitation system (share restaurants)
- Add audit logs (track changes)
- Add email notifications
- Add SMS alerts
- Add payment integration (Stripe)
- Add rate limiting
- Add advanced search/filtering
- Add data export (CSV)
