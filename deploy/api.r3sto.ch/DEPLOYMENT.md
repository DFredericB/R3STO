# R3STO API Deployment Checklist

## Pre-Deployment

- [ ] All 8 PHP files created and syntax validated
  - [ ] index.php (main router)
  - [ ] config.php (configuration)
  - [ ] db.php (database helper)
  - [ ] auth.php (authentication)
  - [ ] restaurants.php (restaurant CRUD)
  - [ ] admin.php (admin endpoints)
  - [ ] setup.php (database initialization)
  - [ ] .htaccess (URL rewriting)

- [ ] Infomaniak credentials verified
  - Host: api.r3sto.ch
  - Database: pl7wy9_R3STO
  - User: pl7wy9_R3STO
  - Password: RueNeuve20#1081

## Deployment Steps

1. **Connect to Infomaniak FTP**
   ```
   Server: ftp.infomaniak.com (or via cpanel)
   Username: Your Infomaniak account
   Password: Your password
   ```

2. **Upload Files**
   - Create directory: `/api.r3sto.ch/public_html/` (or equivalent)
   - Upload all files from this directory to the public root
   - Ensure .htaccess is uploaded (hidden file - enable viewing in FTP client)

3. **Set File Permissions**
   - `.htaccess`: 644 (rw-r--r--)
   - PHP files: 644 (rw-r--r--)
   - No need for executable permissions on PHP files

4. **Enable Apache Modules**
   - Ensure `mod_rewrite` is enabled (usually default on Infomaniak)
   - Ensure `mod_headers` is enabled for CORS headers

5. **Initialize Database**
   - Visit: `https://api.r3sto.ch/?key=r3sto_setup_2026`
   - Expected response: JSON with created tables and admin user
   - This creates:
     - `users` table
     - `restaurants` table
     - `sessions` table
     - Default superadmin: didier@r3sto.com / R3STO2026!

6. **Verify Health Endpoint**
   - Visit: `https://api.r3sto.ch/health`
   - Expected response:
   ```json
   {
     "status": "ok",
     "timestamp": "2026-03-27 10:00:00",
     "database": "connected"
   }
   ```

## Post-Deployment Security

- [ ] Change JWT_SECRET in config.php (from 'r3sto_jwt_secret_2026_prod')
- [ ] Change SETUP_KEY in config.php and disable setup endpoint OR delete setup.php
- [ ] Restrict CORS_ORIGINS to specific domains (remove wildcard)
- [ ] Consider moving database credentials to environment variables
- [ ] Enable HTTPS (should be automatic on api.r3sto.ch)
- [ ] Set up error logging to a file outside public_html
- [ ] Review and test all endpoints

## Testing After Deployment

```bash
# 1. Health check
curl https://api.r3sto.ch/health

# 2. Register new user
TOKEN_RESPONSE=$(curl -s -X POST https://api.r3sto.ch/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email":"test@r3sto.ch",
    "password":"TestPassword123",
    "name":"Test User"
  }')

# Extract token
TOKEN=$(echo $TOKEN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)

# 3. Get user profile
curl https://api.r3sto.ch/auth/me \
  -H "Authorization: Bearer $TOKEN"

# 4. Create restaurant
curl -X POST https://api.r3sto.ch/restaurants \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name":"Test Restaurant",
    "city":"Geneva",
    "address":"123 Test St",
    "phone":"+41223456789",
    "plan":"bistro"
  }'

# 5. List restaurants
curl https://api.r3sto.ch/restaurants \
  -H "Authorization: Bearer $TOKEN"

# 6. Admin login and check stats
ADMIN_TOKEN_RESPONSE=$(curl -s -X POST https://api.r3sto.ch/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email":"didier@r3sto.com",
    "password":"R3STO2026!"
  }')

ADMIN_TOKEN=$(echo $ADMIN_TOKEN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)

curl https://api.r3sto.ch/admin/stats \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

## Troubleshooting

### 404 - Endpoint not found
- Check .htaccess is uploaded and mod_rewrite is enabled
- Verify the exact URL matches the route

### 500 - Internal server error
- Check database connection - ensure localhost is used, not external hostname
- Verify database credentials in config.php
- Check error logs in Infomaniak cpanel

### Database connection failed
- Infomaniak blocks external database connections
- MUST use `localhost` as host (not the external hostname)
- Verify user: pl7wy9_R3STO and password are correct
- The database user must have privileges on pl7wy9_R3STO database

### CORS issues
- Ensure .htaccess is properly uploaded
- Verify mod_headers is enabled
- Check that CORS headers are in response (use browser dev tools)

### Setup endpoint issues
- Verify the setup key is correct: `r3sto_setup_2026`
- URL must be: `https://api.r3sto.ch/?key=r3sto_setup_2026`
- Setup can only run once (second run checks if tables exist)

## Maintenance

- Monitor error logs regularly
- Backup database regularly
- Review admin stats periodically (/admin/stats)
- Keep JWT_SECRET and SETUP_KEY secure
- Update contact information if needed

## File Sizes

- index.php: ~8 KB (main router)
- auth.php: ~6 KB (authentication)
- restaurants.php: ~7.5 KB (CRUD)
- db.php: ~2 KB (database helper)
- admin.php: ~3 KB (admin handlers)
- setup.php: ~4 KB (database initialization)
- config.php: ~0.5 KB (configuration)
- .htaccess: ~0.5 KB (rewriting rules)

Total: ~31 KB (very lightweight)

## Support Contacts

- Infomaniak Support: https://www.infomaniak.com/en/support
- PHP Version: >= 7.0 required (bcrypt, PDO, JSON support)
- MariaDB Version: >= 5.5 required
