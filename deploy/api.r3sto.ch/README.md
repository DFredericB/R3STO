# R3STO API Documentation

Complete PHP REST API for R3STO restaurant reservation SaaS.

## Deployment

Deploy all files in this directory to `api.r3sto.ch` on Infomaniak shared hosting (PHP + MariaDB).

### Database Connection
- Host: `localhost`
- Port: 3306
- User: `pl7wy9_R3STO`
- Password: `RueNeuve20#1081`
- Database: `pl7wy9_R3STO`
- Charset: utf8mb4

### Initial Setup

Visit `https://api.r3sto.ch/?key=r3sto_setup_2026` to initialize the database. This will:
- Create all required tables (users, restaurants, sessions)
- Create the default superadmin user (didier@r3sto.com / R3STO2026!)

## Architecture

### Core Files

- **index.php** - Main router handling all requests and routing
- **config.php** - Configuration constants (database, JWT secret)
- **db.php** - Database connection helper (PDO wrapper)
- **auth.php** - Authentication and JWT token handling
- **restaurants.php** - Restaurant CRUD operations
- **admin.php** - Admin endpoints (clients list, stats)
- **setup.php** - Database initialization
- **.htaccess** - URL rewriting and CORS headers

### Pure PHP Implementation

- No external dependencies (no Composer, no frameworks)
- PDO with prepared statements for all queries
- bcrypt password hashing (password_hash/password_verify)
- JWT tokens with HMAC-SHA256 (pure PHP implementation)
- JSON request/response handling
- CORS enabled for all origins (configurable)

## API Endpoints

### Health & Setup

```
GET  /health              Status check + database connection test
GET  /?key=...           Database initialization (setup endpoint)
```

### Authentication

```
POST /auth/register      Create user account
POST /auth/login         Login, return JWT token
GET  /auth/me            Get current user profile (requires JWT)
```

**Register Request:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "name": "User Name"
}
```

**Login Request:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response (both register & login):**
```json
{
  "user_id": 1,
  "email": "user@example.com",
  "name": "User Name",
  "role": "user",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Restaurants (User)

```
POST /restaurants              Create new restaurant
GET  /restaurants              List user's restaurants
GET  /restaurants/:id          Get restaurant details
PUT  /restaurants/:id          Update restaurant
```

**Create Restaurant Request:**
```json
{
  "name": "Pizza Palace",
  "city": "Geneva",
  "address": "123 Main St",
  "phone": "+41223456789",
  "plan": "bistro"
}
```

**Response:**
```json
{
  "id": 1,
  "owner_id": 1,
  "name": "Pizza Palace",
  "city": "Geneva",
  "address": "123 Main St",
  "phone": "+41223456789",
  "plan": "bistro",
  "status": "trial",
  "tables_count": 0,
  "created_at": "2026-03-27 10:00:00",
  "updated_at": "2026-03-27 10:00:00"
}
```

### Admin Endpoints

```
GET  /admin/clients       List all restaurants (with owner info)
GET  /admin/stats         Dashboard statistics
```

**Admin Stats Response:**
```json
{
  "total_clients": 10,
  "total_restaurants": 15,
  "active_restaurants": 12,
  "trial_restaurants": 3,
  "total_users": 10,
  "by_plan": {
    "bistro": 5,
    "resto": 7,
    "gastro": 3
  }
}
```

## Authentication

All endpoints (except register, login, health, setup) require a JWT token in the Authorization header:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

JWT tokens expire after 30 days.

## Database Schema

### users
```sql
id INT PRIMARY KEY AUTO_INCREMENT
email VARCHAR(255) UNIQUE NOT NULL
password_hash VARCHAR(255) NOT NULL
name VARCHAR(255) NOT NULL
role ENUM('user', 'admin', 'superadmin') DEFAULT 'user'
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
```

### restaurants
```sql
id INT PRIMARY KEY AUTO_INCREMENT
owner_id INT NOT NULL FOREIGN KEY (users.id)
name VARCHAR(255) NOT NULL
city VARCHAR(255)
address TEXT
phone VARCHAR(50)
plan ENUM('bistro', 'resto', 'gastro') DEFAULT 'bistro'
status ENUM('active', 'paused', 'trial', 'suspended') DEFAULT 'trial'
tables_count INT DEFAULT 0
stripe_customer_id VARCHAR(255)
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
```

### sessions
```sql
id INT PRIMARY KEY AUTO_INCREMENT
user_id INT NOT NULL FOREIGN KEY (users.id)
token_hash VARCHAR(255) NOT NULL
expires_at TIMESTAMP NOT NULL
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

## Error Responses

All errors return JSON with appropriate HTTP status codes:

```json
{
  "error": "Error message"
}
```

HTTP Status Codes:
- 200 OK - Successful GET/PUT
- 201 Created - Successful POST (resource created)
- 400 Bad Request - Invalid input
- 401 Unauthorized - Missing or invalid JWT token
- 403 Forbidden - Admin-only endpoint, user lacks permission
- 404 Not Found - Resource not found
- 500 Internal Server Error - Server error (details not exposed)

## CORS

CORS headers are set on all responses:
- Access-Control-Allow-Origin: * (configurable in config.php)
- Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
- Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With

OPTIONS preflight requests are automatically handled by .htaccess rewriting.

## Testing

Quick test commands:

```bash
# Health check
curl https://api.r3sto.ch/health

# Setup database
curl "https://api.r3sto.ch/?key=r3sto_setup_2026"

# Register user
curl -X POST https://api.r3sto.ch/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPass123","name":"Test User"}'

# Login
curl -X POST https://api.r3sto.ch/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPass123"}'

# Get profile (with token)
curl https://api.r3sto.ch/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# Create restaurant
curl -X POST https://api.r3sto.ch/restaurants \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{"name":"My Restaurant","city":"Geneva","plan":"bistro"}'

# List restaurants
curl https://api.r3sto.ch/restaurants \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# Admin stats
curl https://api.r3sto.ch/admin/stats \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## Security Notes

1. JWT secret is hardcoded - consider environment variables for production
2. CORS allows all origins (*) - restrict to specific domains before production
3. Setup endpoint requires setup key - change this key after initialization
4. Passwords are hashed with bcrypt (PASSWORD_DEFAULT)
5. All database queries use prepared statements (PDO)
6. Stack traces are never exposed in error responses
7. Database connection uses localhost only (external connections blocked by Infomaniak)

## Default Superadmin

Email: didier@r3sto.com
Password: R3STO2026!

(Created automatically during setup)
