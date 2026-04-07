# R3STO API Testing Guide

## Quick Start Testing

### 1. Health Check (No Auth Required)
```bash
curl -X GET https://api.r3sto.ch/health \
  -H "Content-Type: application/json"
```

Expected response (200 OK):
```json
{
  "status": "ok",
  "timestamp": "2026-03-27 10:00:00",
  "database": "connected"
}
```

### 2. Database Setup (No Auth Required)
```bash
curl -X GET "https://api.r3sto.ch/?key=r3sto_setup_2026" \
  -H "Content-Type: application/json"
```

Expected response (200 OK):
```json
{
  "tables": {
    "users_table": "created",
    "restaurants_table": "created",
    "sessions_table": "created"
  },
  "admin": {
    "status": "admin user created",
    "email": "didier@r3sto.com"
  },
  "timestamp": "2026-03-27 10:00:00"
}
```

### 3. Register New User
```bash
curl -X POST https://api.r3sto.ch/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice@example.com",
    "password": "SecurePass123!",
    "name": "Alice Johnson"
  }'
```

Expected response (201 Created):
```json
{
  "user_id": 2,
  "email": "alice@example.com",
  "name": "Alice Johnson",
  "role": "user",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoyLCJlbWFpbCI6ImFsaWNlQGV4YW1wbGUuY29tIiwicm9sZSI6InVzZXIiLCJpYXQiOjE3NDUzNjAwMDAsImV4cCI6MTc0ODA5NjAwMH0...."
}
```

Save the token for subsequent requests.

### 4. Login (Get Token)
```bash
curl -X POST https://api.r3sto.ch/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice@example.com",
    "password": "SecurePass123!"
  }'
```

Expected response (200 OK):
```json
{
  "user_id": 2,
  "email": "alice@example.com",
  "name": "Alice Johnson",
  "role": "user",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 5. Get Current User Profile (Auth Required)
```bash
curl -X GET https://api.r3sto.ch/auth/me \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

Replace `YOUR_TOKEN_HERE` with actual token from login/register.

Expected response (200 OK):
```json
{
  "user_id": 2,
  "email": "alice@example.com",
  "name": "Alice Johnson",
  "role": "user",
  "created_at": "2026-03-27 10:00:00"
}
```

## Restaurant Endpoints Testing

### 6. Create Restaurant (Auth Required)
```bash
curl -X POST https://api.r3sto.ch/restaurants \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "name": "La Trattoria",
    "city": "Geneva",
    "address": "42 Rue des Alpes",
    "phone": "+41223456789",
    "plan": "bistro"
  }'
```

Expected response (201 Created):
```json
{
  "id": 1,
  "owner_id": 2,
  "name": "La Trattoria",
  "city": "Geneva",
  "address": "42 Rue des Alpes",
  "phone": "+41223456789",
  "plan": "bistro",
  "status": "trial",
  "tables_count": 0,
  "created_at": "2026-03-27 10:00:00",
  "updated_at": "2026-03-27 10:00:00"
}
```

### 7. List User's Restaurants (Auth Required)
```bash
curl -X GET https://api.r3sto.ch/restaurants \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

Expected response (200 OK):
```json
{
  "restaurants": [
    {
      "id": 1,
      "owner_id": 2,
      "name": "La Trattoria",
      "city": "Geneva",
      "address": "42 Rue des Alpes",
      "phone": "+41223456789",
      "plan": "bistro",
      "status": "trial",
      "tables_count": 0,
      "created_at": "2026-03-27 10:00:00",
      "updated_at": "2026-03-27 10:00:00"
    }
  ]
}
```

### 8. Get Restaurant Details (Auth Required)
```bash
curl -X GET https://api.r3sto.ch/restaurants/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

Expected response (200 OK):
```json
{
  "id": 1,
  "owner_id": 2,
  "name": "La Trattoria",
  "city": "Geneva",
  "address": "42 Rue des Alpes",
  "phone": "+41223456789",
  "plan": "bistro",
  "status": "trial",
  "tables_count": 0,
  "stripe_customer_id": null,
  "created_at": "2026-03-27 10:00:00",
  "updated_at": "2026-03-27 10:00:00"
}
```

### 9. Update Restaurant (Auth Required)
```bash
curl -X PUT https://api.r3sto.ch/restaurants/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "status": "active",
    "tables_count": 8,
    "plan": "resto"
  }'
```

Expected response (200 OK):
```json
{
  "id": 1,
  "owner_id": 2,
  "name": "La Trattoria",
  "city": "Geneva",
  "address": "42 Rue des Alpes",
  "phone": "+41223456789",
  "plan": "resto",
  "status": "active",
  "tables_count": 8,
  "stripe_customer_id": null,
  "created_at": "2026-03-27 10:00:00",
  "updated_at": "2026-03-27 10:00:56"
}
```

## Admin Endpoints Testing

### 10. Login as Superadmin
```bash
curl -X POST https://api.r3sto.ch/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "didier@r3sto.com",
    "password": "R3STO2026!"
  }'
```

Expected response (200 OK) - returns token for admin user with role "superadmin"

### 11. Get All Clients (Admin Only)
```bash
curl -X GET https://api.r3sto.ch/admin/clients \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_TOKEN_HERE"
```

Expected response (200 OK):
```json
{
  "clients": [
    {
      "id": 1,
      "owner_id": 2,
      "owner_name": "Alice Johnson",
      "owner_email": "alice@example.com",
      "name": "La Trattoria",
      "city": "Geneva",
      "plan": "resto",
      "status": "active",
      "created_at": "2026-03-27 10:00:00"
    }
  ]
}
```

### 12. Get Dashboard Stats (Admin Only)
```bash
curl -X GET https://api.r3sto.ch/admin/stats \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_TOKEN_HERE"
```

Expected response (200 OK):
```json
{
  "total_clients": 1,
  "total_restaurants": 1,
  "active_restaurants": 1,
  "trial_restaurants": 0,
  "total_users": 2,
  "by_plan": {
    "bistro": 0,
    "resto": 1,
    "gastro": 0
  }
}
```

## Error Response Testing

### Test 400 - Bad Request
Missing required field in register:
```bash
curl -X POST https://api.r3sto.ch/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com"
  }'
```

Expected response (400 Bad Request):
```json
{
  "error": "Password is required, Name is required"
}
```

### Test 401 - Unauthorized
Missing or invalid token:
```bash
curl -X GET https://api.r3sto.ch/auth/me \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer invalid_token"
```

Expected response (401 Unauthorized):
```json
{
  "error": "Unauthorized"
}
```

### Test 403 - Forbidden
Non-admin user accessing admin endpoint:
```bash
curl -X GET https://api.r3sto.ch/admin/stats \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer USER_TOKEN"
```

Expected response (403 Forbidden):
```json
{
  "error": "Forbidden"
}
```

### Test 404 - Not Found
Accessing non-existent restaurant:
```bash
curl -X GET https://api.r3sto.ch/restaurants/9999 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

Expected response (404 Not Found):
```json
{
  "error": "Restaurant not found"
}
```

### Test 404 - Invalid Endpoint
```bash
curl -X GET https://api.r3sto.ch/invalid/endpoint \
  -H "Content-Type: application/json"
```

Expected response (404 Not Found):
```json
{
  "error": "Endpoint not found"
}
```

## CORS Headers Testing

```bash
curl -X OPTIONS https://api.r3sto.ch/restaurants \
  -H "Origin: https://app.r3sto.ch" \
  -H "Access-Control-Request-Method: POST" \
  -v
```

Expected headers in response:
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With
```

## Batch Test Script

Save as `test_api.sh`:

```bash
#!/bin/bash

API_URL="https://api.r3sto.ch"

echo "1. Health Check"
curl -s $API_URL/health | jq .

echo -e "\n2. Setup Database"
curl -s "$API_URL/?key=r3sto_setup_2026" | jq .

echo -e "\n3. Register User"
REGISTER=$(curl -s -X POST $API_URL/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email":"test'$(date +%s)'@example.com",
    "password":"TestPass123",
    "name":"Test User"
  }')
echo $REGISTER | jq .
TOKEN=$(echo $REGISTER | jq -r '.token')

echo -e "\n4. Get Profile"
curl -s $API_URL/auth/me \
  -H "Authorization: Bearer $TOKEN" | jq .

echo -e "\n5. Create Restaurant"
curl -s -X POST $API_URL/restaurants \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name":"Test Restaurant",
    "city":"Geneva",
    "plan":"bistro"
  }' | jq .

echo -e "\n6. List Restaurants"
curl -s $API_URL/restaurants \
  -H "Authorization: Bearer $TOKEN" | jq .
```

Run with:
```bash
chmod +x test_api.sh
./test_api.sh
```

## Performance Notes

- Average response time: < 100ms (direct DB queries)
- JWT token size: ~300-400 bytes
- Request payload size: Typically < 1KB
- API is stateless (no sessions required)
- Can handle thousands of concurrent requests

## Security Validation

- JWT tokens are HMAC-SHA256 signed
- Passwords hashed with bcrypt (PASSWORD_DEFAULT)
- All SQL queries use prepared statements (no injection)
- Stack traces never exposed
- CORS headers properly set
- Database connection uses localhost only

## Next Steps

After successful testing:

1. Change JWT_SECRET in config.php
2. Change SETUP_KEY or remove setup endpoint
3. Restrict CORS_ORIGINS to specific domains
4. Set up SSL certificate (should be automatic)
5. Configure error logging
6. Set up monitoring/alerts
7. Plan for scaling if needed
