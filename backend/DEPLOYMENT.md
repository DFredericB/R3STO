# Deployment Guide

Complete guide for deploying R3STO API to production environments.

## Infomaniak Node.js Hosting

Infomaniak supports Node.js applications with the following setup:

### 1. Prepare Repository

```bash
# Ensure .gitignore excludes:
- node_modules/
- .env
- data/
- *.log

# Create .env file in root (not in git)
cp .env.example .env
# Edit .env with production values
```

### 2. Git Push

```bash
git add .
git commit -m "Initial R3STO backend"
git push origin main
```

### 3. Infomaniak Configuration

In Infomaniak hosting panel:

1. **Node.js Version**: Select 18+ LTS
2. **Start Command**: `node server.js`
3. **Environment Variables**:
   ```
   NODE_ENV=production
   PORT=3001
   JWT_SECRET=your-secure-random-key-here
   STRIPE_SECRET_KEY=sk_live_...
   DB_PATH=/data/r3sto.db
   CORS_ORIGINS=https://app.r3sto.ch,https://booking.r3sto.ch
   ```

4. **Persistent Storage**:
   - Configure `/data/` directory for database persistence
   - Path: `/root/data/` or similar (check Infomaniak docs)

### 4. Domain Setup

Configure DNS records for:
- `api.r3sto.ch` → Your Infomaniak app URL
- `auth.r3sto.ch` → Redirect to api.r3sto.ch
- `booking.r3sto.ch` → Same (public widget)

Update CORS_ORIGINS environment variable:
```
CORS_ORIGINS=https://app.r3sto.ch,https://booking.r3sto.ch,https://auth.r3sto.ch
```

### 5. SSL Certificate

Infomaniak automatically provides SSL certificates. Configure HTTPS redirect in your Node.js app (or use Infomaniak's settings).

## Docker Deployment

Deploy using Docker to any cloud provider.

### Build Image

```bash
# From backend directory
docker build -t r3sto-api:1.0.0 .

# Tag for registry
docker tag r3sto-api:1.0.0 your-registry/r3sto-api:1.0.0

# Push
docker push your-registry/r3sto-api:1.0.0
```

### Docker Compose (Local/Development)

```yaml
version: '3.8'

services:
  api:
    build: .
    ports:
      - "3001:3001"
    environment:
      NODE_ENV: production
      JWT_SECRET: ${JWT_SECRET}
      STRIPE_SECRET_KEY: ${STRIPE_SECRET_KEY}
      DB_PATH: /app/data/r3sto.db
      CORS_ORIGINS: http://localhost:5173
    volumes:
      - ./data:/app/data
    restart: unless-stopped
```

Run:
```bash
docker-compose up -d
```

## VPS Deployment

Deploy to any Linux VPS (Ubuntu 20.04+, Debian, etc.)

### 1. Server Setup

```bash
# SSH into server
ssh root@your-server.com

# Update system
apt update && apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt install -y nodejs

# Install PM2 (process manager)
npm install -g pm2

# Create app directory
mkdir -p /var/www/r3sto-api
cd /var/www/r3sto-api
```

### 2. Clone & Setup

```bash
# Clone repository
git clone https://github.com/your-org/r3sto-backend.git .

# Install dependencies
npm ci --only=production

# Copy environment file
cp .env.example .env
nano .env  # Edit with production values

# Create data directory
mkdir -p data
chmod 755 data
```

### 3. Process Management (PM2)

```bash
# Start application
pm2 start server.js --name "r3sto-api"

# Configure startup on reboot
pm2 startup
pm2 save

# Monitor
pm2 logs r3sto-api
pm2 monit

# Restart/Reload
pm2 restart r3sto-api
pm2 reload r3sto-api
```

### 4. Nginx Reverse Proxy

```nginx
# /etc/nginx/sites-available/r3sto-api
upstream r3sto_api {
    server localhost:3001;
    keepalive 64;
}

server {
    listen 80;
    listen [::]:80;
    server_name api.r3sto.ch;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name api.r3sto.ch;

    # SSL certificates (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/api.r3sto.ch/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.r3sto.ch/privkey.pem;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_types text/plain text/css text/xml text/javascript
               application/x-javascript application/xml+rss
               application/json;

    location / {
        proxy_pass http://r3sto_api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

Enable site:
```bash
ln -s /etc/nginx/sites-available/r3sto-api /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

### 5. SSL Certificate (Let's Encrypt)

```bash
apt install certbot python3-certbot-nginx -y
certbot certonly --standalone -d api.r3sto.ch

# Auto-renewal
systemctl enable certbot.timer
```

## Database Backups

### Automated Backup Script

```bash
#!/bin/bash
# /var/www/r3sto-api/backup.sh

BACKUP_DIR="/var/www/r3sto-api/backups"
DB_FILE="/var/www/r3sto-api/data/r3sto.db"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Copy database
cp $DB_FILE $BACKUP_DIR/r3sto_${DATE}.db

# Keep last 30 days
find $BACKUP_DIR -mtime +30 -delete

echo "Backup completed: r3sto_${DATE}.db"
```

Schedule with cron:
```bash
# Run daily at 2 AM
0 2 * * * /var/www/r3sto-api/backup.sh
```

Or cloud backup:
```bash
# AWS S3 backup
aws s3 cp /var/www/r3sto-api/data/r3sto.db s3://my-bucket/backups/r3sto_$(date +%Y%m%d).db
```

## Monitoring & Logging

### PM2 Monitoring

```bash
# Monitor CPU/Memory
pm2 monit

# View logs
pm2 logs r3sto-api

# Save logs to file
pm2 logs r3sto-api > /var/log/r3sto-api.log
```

### Systemd Logging

```bash
# View system logs
journalctl -u r3sto-api -n 100

# Real-time
journalctl -u r3sto-api -f
```

### Metrics

Monitor key endpoints:

```bash
# Health check
curl https://api.r3sto.ch/health

# Should return:
# {"status":"ok","uptime":12345,"timestamp":"...","version":"1.0.0"}
```

## Updates & Migrations

### Deploy New Version

```bash
# On VPS
cd /var/www/r3sto-api

# Pull latest
git pull origin main

# Install new dependencies
npm ci --only=production

# Restart application
pm2 restart r3sto-api

# Verify
curl https://api.r3sto.ch/health
```

### Database Migrations

Migrations are applied automatically on startup. To manually run:

```bash
node -e "import('./db.js').then(m => m.initDb())"
```

## Security Checklist

- [ ] Change JWT_SECRET to random 32+ character string
- [ ] Set NODE_ENV=production
- [ ] Enable HTTPS only (redirect HTTP)
- [ ] Configure proper CORS origins
- [ ] Set strong database passwords
- [ ] Enable firewall (UFW):
  ```bash
  ufw allow 22/tcp  # SSH
  ufw allow 80/tcp  # HTTP
  ufw allow 443/tcp # HTTPS
  ufw enable
  ```
- [ ] Add rate limiting (already in code)
- [ ] Regular backups (automated)
- [ ] Monitor logs for suspicious activity
- [ ] Keep Node.js updated
- [ ] Review API logs regularly

## Troubleshooting

### Database Locked

If you get "database is locked" errors:

```bash
# Check for stale processes
ps aux | grep node

# Kill if needed
pkill -f "node server.js"

# Restart
pm2 restart r3sto-api
```

### High Memory Usage

```bash
# Increase Node.js memory
NODE_OPTIONS="--max-old-space-size=512" pm2 start server.js
```

### Network Issues

```bash
# Check port is open
netstat -tlnp | grep 3001

# Check Nginx
nginx -t
systemctl status nginx
```

## Performance Optimization

### Database Indexes

Already included in schema. Verify:

```bash
sqlite3 data/r3sto.db ".indices"
```

### Connection Pooling

For high-load scenarios, consider using node-sqlite3 with connection pooling (future enhancement).

### Caching

Add Redis for session/cache layer (optional):

```bash
apt install redis-server
npm install redis
```

## Support & Monitoring

- Health endpoint: `GET /health`
- API docs: `GET /api`
- Check logs: `pm2 logs r3sto-api`
- Monitor: `pm2 monit`

For issues, review error logs and check connectivity to Stripe API (if using payments).
