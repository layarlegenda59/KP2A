# File Konfigurasi Cloudflare untuk SIDARSIH

## 1. Environment Configuration Files

### 1.1 Frontend Environment (.env.production)

```bash
# /home/dell/KP2A-CIMAHI/KP2A/.env.production
VITE_API_URL=https://api.sidarsih.site
VITE_WHATSAPP_API_URL=https://whatsapp.sidarsih.site
VITE_SOCKET_URL=https://whatsapp.sidarsih.site
VITE_APP_DOMAIN=sidarsih.site
VITE_APP_ENV=production
VITE_ENABLE_HTTPS=true
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 1.2 Backend Environment (.env.production)

```bash
# /home/dell/KP2A-CIMAHI/KP2A/whatsapp-backend/.env.production
NODE_ENV=production
PORT=3001
HOST=0.0.0.0

# Frontend Configuration
FRONTEND_URL=https://sidarsih.site
CORS_ORIGIN=https://sidarsih.site,https://www.sidarsih.site,https://admin.sidarsih.site

# Domain Configuration
DOMAIN=sidarsih.site
SSL_ENABLED=true
SECURE_COOKIES=true

# Database Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-supabase-service-key
DATABASE_URL=postgresql://postgres:password@db.your-project.supabase.co:5432/postgres

# Security
JWT_SECRET=your-production-jwt-secret-min-32-chars
SESSION_SECRET=your-production-session-secret-min-32-chars
ENCRYPTION_KEY=your-encryption-key-32-chars

# WhatsApp Configuration
WHATSAPP_SESSION_PATH=/home/dell/KP2A-CIMAHI/KP2A/whatsapp-backend/sessions
WHATSAPP_TIMEOUT=60000
WHATSAPP_RETRY_LIMIT=3

# Logging
LOG_LEVEL=info
LOG_FILE=/home/dell/KP2A-CIMAHI/KP2A/whatsapp-backend/logs/production.log
ERROR_LOG_FILE=/home/dell/KP2A-CIMAHI/KP2A/whatsapp-backend/logs/error.log

# Rate Limiting
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100

# Health Check
HEALTH_CHECK_INTERVAL=30000
```

## 2. PM2 Ecosystem Configuration

### 2.1 PM2 Ecosystem File

```javascript
// /home/dell/KP2A-CIMAHI/KP2A/ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'sidarsih-whatsapp-backend',
      script: './whatsapp-backend/src/app.js',
      cwd: '/home/dell/KP2A-CIMAHI/KP2A',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'development',
        PORT: 3001
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      // Logging
      log_file: './logs/combined.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      
      // Performance
      max_memory_restart: '1G',
      restart_delay: 4000,
      max_restarts: 10,
      min_uptime: '10s',
      
      // Health monitoring
      health_check_grace_period: 3000,
      health_check_fatal_exceptions: true,
      
      // Environment specific
      node_args: '--max-old-space-size=1024',
      
      // Auto restart on file changes (development only)
      watch: false,
      ignore_watch: ['node_modules', 'logs', 'sessions'],
      
      // Graceful shutdown
      kill_timeout: 5000,
      listen_timeout: 3000,
      
      // Error handling
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s'
    }
  ],
  
  deploy: {
    production: {
      user: 'dell',
      host: 'sidarsih.site',
      ref: 'origin/main',
      repo: 'git@github.com:your-repo/sidarsih.git',
      path: '/home/dell/KP2A-CIMAHI/KP2A',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  }
};
```

## 3. Nginx Configuration

### 3.1 Main Nginx Configuration

```nginx
# /etc/nginx/sites-available/sidarsih.site

# Rate limiting zones
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/m;
limit_req_zone $binary_remote_addr zone=general:10m rate=30r/m;

# Upstream definitions
upstream whatsapp_backend {
    least_conn;
    server 127.0.0.1:3001 max_fails=3 fail_timeout=30s;
    keepalive 32;
}

# HTTP to HTTPS redirect
server {
    listen 80;
    listen [::]:80;
    server_name sidarsih.site www.sidarsih.site api.sidarsih.site whatsapp.sidarsih.site;
    
    # Security headers even for redirects
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    
    # Redirect all HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

# Main Application (Frontend) - sidarsih.site
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name sidarsih.site www.sidarsih.site;

    # SSL Configuration with Cloudflare Origin Certificate
    ssl_certificate /etc/ssl/certs/sidarsih.site.pem;
    ssl_certificate_key /etc/ssl/private/sidarsih.site.key;
    
    # SSL Security Settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    ssl_session_tickets off;
    
    # OCSP Stapling
    ssl_stapling on;
    ssl_stapling_verify on;
    ssl_trusted_certificate /etc/ssl/certs/cloudflare-origin-ca.pem;
    
    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://whatsapp.sidarsih.site https://api.sidarsih.site wss://whatsapp.sidarsih.site; frame-ancestors 'none';" always;
    
    # Cloudflare Real IP Configuration
    set_real_ip_from 173.245.48.0/20;
    set_real_ip_from 103.21.244.0/22;
    set_real_ip_from 103.22.200.0/22;
    set_real_ip_from 103.31.4.0/22;
    set_real_ip_from 141.101.64.0/18;
    set_real_ip_from 108.162.192.0/18;
    set_real_ip_from 190.93.240.0/20;
    set_real_ip_from 188.114.96.0/20;
    set_real_ip_from 197.234.240.0/22;
    set_real_ip_from 198.41.128.0/17;
    set_real_ip_from 162.158.0.0/15;
    set_real_ip_from 104.16.0.0/13;
    set_real_ip_from 104.24.0.0/14;
    set_real_ip_from 172.64.0.0/13;
    set_real_ip_from 131.0.72.0/22;
    set_real_ip_from 2400:cb00::/32;
    set_real_ip_from 2606:4700::/32;
    set_real_ip_from 2803:f800::/32;
    set_real_ip_from 2405:b500::/32;
    set_real_ip_from 2405:8100::/32;
    set_real_ip_from 2a06:98c0::/29;
    set_real_ip_from 2c0f:f248::/32;
    real_ip_header CF-Connecting-IP;
    
    # Document Root
    root /home/dell/KP2A-CIMAHI/KP2A/dist;
    index index.html;
    
    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/javascript
        application/xml+rss
        application/json;
    
    # Rate limiting
    limit_req zone=general burst=50 nodelay;
    
    # Frontend Routes (SPA)
    location / {
        try_files $uri $uri/ /index.html;
        
        # Cache control for HTML files
        location ~* \.html$ {
            expires -1;
            add_header Cache-Control "no-cache, no-store, must-revalidate";
        }
    }
    
    # Static Assets with aggressive caching
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        add_header Vary "Accept-Encoding";
        
        # Enable CORS for fonts
        location ~* \.(woff|woff2|ttf|eot)$ {
            add_header Access-Control-Allow-Origin "*";
        }
    }
    
    # Favicon
    location = /favicon.ico {
        expires 1y;
        add_header Cache-Control "public, immutable";
        log_not_found off;
    }
    
    # Robots.txt
    location = /robots.txt {
        expires 1d;
        add_header Cache-Control "public";
        log_not_found off;
    }
    
    # Health Check
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
    
    # Security: Block access to sensitive files
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }
    
    location ~ \.(env|log|config)$ {
        deny all;
        access_log off;
        log_not_found off;
    }
}

# WhatsApp Backend - whatsapp.sidarsih.site
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name whatsapp.sidarsih.site;

    # SSL Configuration (same as main site)
    ssl_certificate /etc/ssl/certs/sidarsih.site.pem;
    ssl_certificate_key /etc/ssl/private/sidarsih.site.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Cloudflare Real IP (same as above)
    set_real_ip_from 173.245.48.0/20;
    # ... (other Cloudflare IP ranges)
    real_ip_header CF-Connecting-IP;
    
    # Rate limiting for API
    limit_req zone=api burst=20 nodelay;
    
    # Proxy to WhatsApp Backend
    location / {
        proxy_pass http://whatsapp_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # Buffer settings
        proxy_buffering on;
        proxy_buffer_size 128k;
        proxy_buffers 4 256k;
        proxy_busy_buffers_size 256k;
        
        # WebSocket Support
        proxy_set_header Sec-WebSocket-Extensions $http_sec_websocket_extensions;
        proxy_set_header Sec-WebSocket-Key $http_sec_websocket_key;
        proxy_set_header Sec-WebSocket-Version $http_sec_websocket_version;
        proxy_set_header Sec-WebSocket-Protocol $http_sec_websocket_protocol;
    }
    
    # Socket.IO specific endpoint
    location /socket.io/ {
        proxy_pass http://whatsapp_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket specific timeouts
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
        
        # Disable buffering for real-time communication
        proxy_buffering off;
    }
    
    # Health Check
    location /health {
        proxy_pass http://whatsapp_backend/health;
        access_log off;
    }
}

# API Gateway - api.sidarsih.site (Supabase Proxy)
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name api.sidarsih.site;

    # SSL Configuration
    ssl_certificate /etc/ssl/certs/sidarsih.site.pem;
    ssl_certificate_key /etc/ssl/private/sidarsih.site.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers off;
    
    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    
    # Cloudflare Real IP
    real_ip_header CF-Connecting-IP;
    
    # Rate limiting
    limit_req zone=api burst=30 nodelay;
    
    # Proxy to Supabase
    location / {
        proxy_pass https://your-project.supabase.co;
        proxy_set_header Host your-project.supabase.co;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # CORS Headers
        add_header Access-Control-Allow-Origin "https://sidarsih.site" always;
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Authorization, Content-Type, X-Requested-With" always;
        add_header Access-Control-Allow-Credentials "true" always;
        
        # Handle preflight requests
        if ($request_method = 'OPTIONS') {
            add_header Access-Control-Allow-Origin "https://sidarsih.site";
            add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS";
            add_header Access-Control-Allow-Headers "Authorization, Content-Type, X-Requested-With";
            add_header Access-Control-Max-Age 1728000;
            add_header Content-Type "text/plain charset=UTF-8";
            add_header Content-Length 0;
            return 204;
        }
    }
}
```

## 4. SSL Certificate Installation

### 4.1 Cloudflare Origin Certificate Setup

```bash
#!/bin/bash
# /home/dell/KP2A-CIMAHI/KP2A/scripts/install-ssl.sh

# Create SSL directory
sudo mkdir -p /etc/ssl/certs
sudo mkdir -p /etc/ssl/private

# Download Cloudflare Origin CA
sudo curl -o /etc/ssl/certs/cloudflare-origin-ca.pem https://developers.cloudflare.com/ssl/static/origin_ca_rsa_root.pem

# Set proper permissions
sudo chmod 644 /etc/ssl/certs/sidarsih.site.pem
sudo chmod 600 /etc/ssl/private/sidarsih.site.key
sudo chmod 644 /etc/ssl/certs/cloudflare-origin-ca.pem

# Verify certificate
openssl x509 -in /etc/ssl/certs/sidarsih.site.pem -text -noout

echo "SSL certificates installed successfully!"
```

## 5. Deployment Scripts

### 5.1 Production Deployment Script

```bash
#!/bin/bash
# /home/dell/KP2A-CIMAHI/KP2A/scripts/deploy-production.sh

set -e

echo "🚀 Starting production deployment for sidarsih.site..."

# Configuration
PROJECT_DIR="/home/dell/KP2A-CIMAHI/KP2A"
BACKUP_DIR="/backup/sidarsih"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup
echo "📦 Creating backup..."
sudo mkdir -p $BACKUP_DIR
sudo tar -czf $BACKUP_DIR/sidarsih-$DATE.tar.gz $PROJECT_DIR

# Navigate to project directory
cd $PROJECT_DIR

# Pull latest code
echo "📥 Pulling latest code..."
git pull origin main

# Install dependencies
echo "📦 Installing dependencies..."
npm ci --production

# Build frontend
echo "🏗️ Building frontend..."
npm run build

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd whatsapp-backend
npm ci --production
cd ..

# Copy production environment files
echo "⚙️ Setting up production environment..."
cp .env.production .env
cp whatsapp-backend/.env.production whatsapp-backend/.env

# Create necessary directories
mkdir -p logs
mkdir -p whatsapp-backend/logs
mkdir -p whatsapp-backend/sessions

# Set proper permissions
chmod 755 dist/
chmod 755 whatsapp-backend/
chmod 644 .env
chmod 644 whatsapp-backend/.env

# Test Nginx configuration
echo "🔧 Testing Nginx configuration..."
sudo nginx -t

# Restart PM2 processes
echo "🔄 Restarting PM2 processes..."
pm2 stop ecosystem.config.js || true
pm2 start ecosystem.config.js --env production

# Reload Nginx
echo "🔄 Reloading Nginx..."
sudo systemctl reload nginx

# Wait for services to start
echo "⏳ Waiting for services to start..."
sleep 15

# Health checks
echo "🏥 Running health checks..."
curl -f https://sidarsih.site/health || { echo "❌ Frontend health check failed"; exit 1; }
curl -f https://whatsapp.sidarsih.site/health || { echo "❌ Backend health check failed"; exit 1; }

# Check PM2 status
pm2 status

echo "✅ Production deployment completed successfully!"
echo "🌐 Frontend: https://sidarsih.site"
echo "🔌 WhatsApp Backend: https://whatsapp.sidarsih.site"
echo "📊 API: https://api.sidarsih.site"
```

### 5.2 Rollback Script

```bash
#!/bin/bash
# /home/dell/KP2A-CIMAHI/KP2A/scripts/rollback.sh

set -e

BACKUP_DATE=$1
if [ -z "$BACKUP_DATE" ]; then
  echo "Usage: ./rollback.sh YYYYMMDD_HHMMSS"
  echo "Available backups:"
  ls -la /backup/sidarsih/
  exit 1
fi

echo "🔄 Rolling back to backup from $BACKUP_DATE..."

# Stop PM2 processes
echo "⏹️ Stopping PM2 processes..."
pm2 stop ecosystem.config.js

# Restore from backup
echo "📦 Restoring from backup..."
sudo tar -xzf /backup/sidarsih/sidarsih-$BACKUP_DATE.tar.gz -C /

# Restart services
echo "🔄 Restarting services..."
cd /home/dell/KP2A-CIMAHI/KP2A
pm2 start ecosystem.config.js --env production
sudo systemctl reload nginx

# Wait and verify
sleep 10
curl -f https://sidarsih.site/health || { echo "❌ Rollback verification failed"; exit 1; }

echo "✅ Rollback completed successfully!"
```

## 6. Monitoring Scripts

### 6.1 Health Monitoring Script

```bash
#!/bin/bash
# /home/dell/KP2A-CIMAHI/KP2A/scripts/monitor.sh

LOG_FILE="/var/log/sidarsih-monitor.log"
ALERT_EMAIL="admin@sidarsih.site"

log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> $LOG_FILE
}

send_alert() {
    local message="$1"
    log_message "ALERT: $message"
    # Send email alert (configure mail server)
    # echo "$message" | mail -s "SIDARSIH Alert" $ALERT_EMAIL
    
    # Send to webhook (Slack, Discord, etc.)
    # curl -X POST -H 'Content-type: application/json' \
    #   --data "{\"text\":\"$message\"}" \
    #   YOUR_WEBHOOK_URL
}

check_endpoint() {
    local url="$1"
    local name="$2"
    
    if ! curl -f -s --max-time 10 "$url" > /dev/null; then
        send_alert "$name is down! URL: $url"
        return 1
    fi
    return 0
}

check_pm2() {
    if ! pm2 list | grep -q "online"; then
        send_alert "PM2 processes are not running!"
        pm2 restart ecosystem.config.js --env production
        return 1
    fi
    return 0
}

check_disk_space() {
    local usage=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
    if [ $usage -gt 85 ]; then
        send_alert "Disk space usage is high: ${usage}%"
    fi
}

check_memory() {
    local usage=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
    if [ $usage -gt 90 ]; then
        send_alert "Memory usage is high: ${usage}%"
    fi
}

# Main monitoring loop
while true; do
    # Check endpoints
    check_endpoint "https://sidarsih.site/health" "Main Site"
    check_endpoint "https://whatsapp.sidarsih.site/health" "WhatsApp Backend"
    check_endpoint "https://api.sidarsih.site" "API Gateway"
    
    # Check PM2 processes
    check_pm2
    
    # Check system resources
    check_disk_space
    check_memory
    
    # Sleep for 1 minute
    sleep 60
done
```

### 6.2 Performance Monitoring Script

```bash
#!/bin/bash
# /home/dell/KP2A-CIMAHI/KP2A/scripts/performance-monitor.sh

METRICS_FILE="/var/log/sidarsih-metrics.log"

collect_metrics() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    # System metrics
    local cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | sed 's/%us,//')
    local memory_usage=$(free | awk 'NR==2{printf "%.1f", $3*100/$2}')
    local disk_usage=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
    
    # Network metrics
    local connections=$(netstat -an | grep :443 | wc -l)
    
    # Application metrics
    local pm2_status=$(pm2 jlist | jq -r '.[0].pm2_env.status' 2>/dev/null || echo "unknown")
    local pm2_memory=$(pm2 jlist | jq -r '.[0].monit.memory' 2>/dev/null || echo "0")
    local pm2_cpu=$(pm2 jlist | jq -r '.[0].monit.cpu' 2>/dev/null || echo "0")
    
    # Response time check
    local response_time=$(curl -o /dev/null -s -w '%{time_total}' https://sidarsih.site/health)
    
    # Log metrics
    echo "$timestamp,CPU:$cpu_usage,Memory:$memory_usage%,Disk:$disk_usage%,Connections:$connections,PM2:$pm2_status,PM2_Memory:$pm2_memory,PM2_CPU:$pm2_cpu%,ResponseTime:${response_time}s" >> $METRICS_FILE
}

# Collect metrics every 5 minutes
while true; do
    collect_metrics
    sleep 300
done
```

## 7. Backup and Restore

### 7.1 Automated Backup Script

```bash
#!/bin/bash
# /home/dell/KP2A-CIMAHI/KP2A/scripts/backup.sh

BACKUP_DIR="/backup/sidarsih"
PROJECT_DIR="/home/dell/KP2A-CIMAHI/KP2A"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

# Create backup directory
mkdir -p $BACKUP_DIR

# Create application backup
echo "📦 Creating application backup..."
tar -czf $BACKUP_DIR/app-$DATE.tar.gz \
    --exclude='node_modules' \
    --exclude='dist' \
    --exclude='logs' \
    --exclude='.git' \
    $PROJECT_DIR

# Create database backup (if using local database)
# pg_dump your_database > $BACKUP_DIR/db-$DATE.sql

# Create configuration backup
echo "⚙️ Creating configuration backup..."
tar -czf $BACKUP_DIR/config-$DATE.tar.gz \
    /etc/nginx/sites-available/sidarsih.site \
    /etc/ssl/certs/sidarsih.site.pem \
    /etc/ssl/private/sidarsih.site.key

# Clean old backups
echo "🧹 Cleaning old backups..."
find $BACKUP_DIR -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete
find $BACKUP_DIR -name "*.sql" -mtime +$RETENTION_DAYS -delete

echo "✅ Backup completed: $DATE"
```

### 7.2 Crontab Configuration

```bash
# /etc/crontab entries for automated tasks

# Daily backup at 2 AM
0 2 * * * root /home/dell/KP2A-CIMAHI/KP2A/scripts/backup.sh

# Health monitoring (runs continuously)
@reboot root /home/dell/KP2A-CIMAHI/KP2A/scripts/monitor.sh &

# Performance metrics collection (runs continuously)
@reboot root /home/dell/KP2A-CIMAHI/KP2A/scripts/performance-monitor.sh &

# Log rotation
0 0 * * * root logrotate /etc/logrotate.d/sidarsih

# SSL certificate renewal check (monthly)
0 3 1 * * root /home/dell/KP2A-CIMAHI/KP2A/scripts/check-ssl.sh

# PM2 startup on boot
@reboot dell cd /home/dell/KP2A-CIMAHI/KP2A && pm2 start ecosystem.config.js --env production
```

Semua file konfigurasi ini siap digunakan untuk deployment produksi dengan Cloudflare. Pastikan untuk mengganti placeholder seperti `your-project.supabase.co` dengan nilai yang sesuai dengan setup Anda.