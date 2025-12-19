# Panduan Integrasi Cloudflare untuk Domain sidarsih.site

## Daftar Isi
1. [Konfigurasi DNS Cloudflare](#1-konfigurasi-dns-cloudflare)
2. [Pengaturan Keamanan](#2-pengaturan-keamanan)
3. [Optimasi Performa](#3-optimasi-performa)
4. [Integrasi Aplikasi](#4-integrasi-aplikasi)
5. [Konfigurasi Nginx/Reverse Proxy](#5-konfigurasi-nginxreverse-proxy)
6. [Environment Configuration](#6-environment-configuration)
7. [Testing & Verification](#7-testing--verification)
8. [Deployment Procedures](#8-deployment-procedures)

---

## 1. Konfigurasi DNS Cloudflare

### 1.1 Setup DNS Records

**Langkah-langkah:**

1. **Login ke Cloudflare Dashboard**
   - Akses: https://dash.cloudflare.com
   - Login dengan akun Cloudflare Anda

2. **Tambahkan Domain sidarsih.site**
   ```
   - Klik "Add a Site"
   - Masukkan: sidarsih.site
   - Pilih plan (Free/Pro/Business)
   - Klik "Add Site"
   ```

3. **Konfigurasi DNS Records**
   ```
   Type    Name              Content                 TTL    Proxy Status
   A       @                 [SERVER_IP_ADDRESS]     Auto   Proxied (Orange Cloud)
   A       www               [SERVER_IP_ADDRESS]     Auto   Proxied (Orange Cloud)
   A       api               [SERVER_IP_ADDRESS]     Auto   Proxied (Orange Cloud)
   A       whatsapp          [SERVER_IP_ADDRESS]     Auto   Proxied (Orange Cloud)
   CNAME   backend           sidarsih.site           Auto   Proxied (Orange Cloud)
   CNAME   admin             sidarsih.site           Auto   Proxied (Orange Cloud)
   ```

### 1.2 Nameserver Configuration

**Nameserver Cloudflare:**
```
ns1.cloudflare.com
ns2.cloudflare.com
```

**Langkah Update Nameserver:**
1. Login ke registrar domain (tempat beli domain)
2. Cari pengaturan DNS/Nameserver
3. Ganti nameserver ke Cloudflare
4. Tunggu propagasi DNS (24-48 jam)

### 1.3 Domain Verification

**Verifikasi Status:**
```bash
# Cek DNS propagation
dig sidarsih.site
dig www.sidarsih.site
dig api.sidarsih.site

# Cek nameserver
dig NS sidarsih.site
```

**Expected Output:**
```
sidarsih.site.     300    IN    A    [CLOUDFLARE_IP]
```

---

## 2. Pengaturan Keamanan

### 2.1 SSL/TLS Configuration

**Mode: Full (Strict)**

1. **Cloudflare Dashboard → SSL/TLS → Overview**
   ```
   Encryption Mode: Full (strict)
   ```

2. **Edge Certificates**
   ```
   ✅ Always Use HTTPS: ON
   ✅ HTTP Strict Transport Security (HSTS): ON
   ✅ Minimum TLS Version: 1.2
   ✅ Opportunistic Encryption: ON
   ✅ TLS 1.3: ON
   ```

3. **Origin Certificates**
   ```
   - Generate Origin Certificate
   - Download certificate dan private key
   - Install di server (Nginx)
   ```

### 2.2 Web Application Firewall (WAF)

**Security → WAF → Managed Rules**

```yaml
Cloudflare Managed Ruleset: ON
Cloudflare OWASP Core Ruleset: ON
Cloudflare WordPress Ruleset: OFF (tidak diperlukan)
```

**Custom Rules:**
```yaml
# Block suspicious requests
Rule 1:
  Expression: (http.request.uri.path contains "/admin" and ip.geoip.country ne "ID")
  Action: Block

# Rate limiting for API
Rule 2:
  Expression: (http.request.uri.path contains "/api/")
  Action: Rate Limit (10 requests per minute)

# Block common attack patterns
Rule 3:
  Expression: (http.request.uri.query contains "union select" or http.request.uri.query contains "script>")
  Action: Block
```

### 2.3 DDoS Protection

**Security → DDoS**
```yaml
HTTP DDoS Attack Protection: ON
Network-layer DDoS Attack Protection: ON
```

**Advanced DDoS Protection:**
```yaml
Sensitivity Level: Medium
```

### 2.4 Security Headers

**Security → Settings**
```yaml
Security Level: Medium
Challenge Passage: 30 minutes
Browser Integrity Check: ON
Privacy Pass Support: ON
```

---

## 3. Optimasi Performa

### 3.1 Caching Configuration

**Caching → Configuration**

```yaml
Caching Level: Standard
Browser Cache TTL: 4 hours
Development Mode: OFF (untuk production)
```

**Page Rules untuk Caching:**

```yaml
# Static Assets
URL: sidarsih.site/assets/*
Settings:
  - Cache Level: Cache Everything
  - Edge Cache TTL: 1 month
  - Browser Cache TTL: 1 month

# API Endpoints
URL: api.sidarsih.site/*
Settings:
  - Cache Level: Bypass
  - Disable Apps
  - Disable Performance

# WhatsApp Backend
URL: whatsapp.sidarsih.site/*
Settings:
  - Cache Level: Bypass
  - WebSockets: ON
```

### 3.2 Speed Optimization

**Speed → Optimization**

```yaml
Auto Minify:
  - JavaScript: ON
  - CSS: ON
  - HTML: ON

Brotli: ON
Early Hints: ON
```

### 3.3 Argo Smart Routing

**Network → Argo Smart Routing**
```yaml
Argo Smart Routing: ON (berbayar)
```

### 3.4 Image Optimization

**Speed → Optimization → Image Resizing**
```yaml
Polish: Lossy
WebP: ON
```

---

## 4. Integrasi Aplikasi

### 4.1 Backend Endpoint Configuration

**Update Environment Variables:**

```bash
# /home/dell/KP2A-CIMAHI/KP2A/.env
VITE_API_URL=https://api.sidarsih.site
VITE_WHATSAPP_API_URL=https://whatsapp.sidarsih.site
VITE_SOCKET_URL=https://whatsapp.sidarsih.site

# /home/dell/KP2A-CIMAHI/KP2A/whatsapp-backend/.env
FRONTEND_URL=https://sidarsih.site
CORS_ORIGIN=https://sidarsih.site,https://www.sidarsih.site
DOMAIN=sidarsih.site
SSL_ENABLED=true
```

### 4.2 CORS Configuration

**Backend CORS Setup:**

```javascript
// /home/dell/KP2A-CIMAHI/KP2A/whatsapp-backend/src/app.js
const cors = require('cors');

const corsOptions = {
  origin: [
    'https://sidarsih.site',
    'https://www.sidarsih.site',
    'https://admin.sidarsih.site'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));
```

### 4.3 WebSocket Configuration

**Socket.IO dengan Cloudflare:**

```javascript
// Frontend Socket.IO configuration
const socket = io('https://whatsapp.sidarsih.site', {
  transports: ['websocket', 'polling'],
  upgrade: true,
  rememberUpgrade: true,
  secure: true,
  rejectUnauthorized: true
});
```

### 4.4 HTTP to HTTPS Redirect

**Page Rules:**
```yaml
URL: http://sidarsih.site/*
Settings:
  - Always Use HTTPS: ON
  - Forwarding URL: 301 Redirect to https://sidarsih.site/$1
```

---

## 5. Konfigurasi Nginx/Reverse Proxy

### 5.1 Nginx Configuration

**File: `/etc/nginx/sites-available/sidarsih.site`**

```nginx
# HTTP Redirect to HTTPS
server {
    listen 80;
    server_name sidarsih.site www.sidarsih.site;
    return 301 https://$server_name$request_uri;
}

# Main Application (Frontend)
server {
    listen 443 ssl http2;
    server_name sidarsih.site www.sidarsih.site;

    # Cloudflare Origin Certificate
    ssl_certificate /etc/ssl/certs/sidarsih.site.pem;
    ssl_certificate_key /etc/ssl/private/sidarsih.site.key;
    
    # SSL Configuration
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
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Cloudflare Real IP
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
    real_ip_header CF-Connecting-IP;

    # Document Root
    root /home/dell/KP2A-CIMAHI/KP2A/dist;
    index index.html;

    # Frontend Routes
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Static Assets
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Health Check
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}

# API Backend
server {
    listen 443 ssl http2;
    server_name api.sidarsih.site;

    # SSL Configuration (same as above)
    ssl_certificate /etc/ssl/certs/sidarsih.site.pem;
    ssl_certificate_key /etc/ssl/private/sidarsih.site.key;
    
    # Proxy to Supabase or local API
    location / {
        proxy_pass https://your-supabase-url.supabase.co;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# WhatsApp Backend
server {
    listen 443 ssl http2;
    server_name whatsapp.sidarsih.site;

    # SSL Configuration
    ssl_certificate /etc/ssl/certs/sidarsih.site.pem;
    ssl_certificate_key /etc/ssl/private/sidarsih.site.key;

    # Proxy to WhatsApp Backend
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # WebSocket Support
        proxy_set_header Sec-WebSocket-Extensions $http_sec_websocket_extensions;
        proxy_set_header Sec-WebSocket-Key $http_sec_websocket_key;
        proxy_set_header Sec-WebSocket-Version $http_sec_websocket_version;
    }

    # Socket.IO specific
    location /socket.io/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 5.2 Enable Nginx Configuration

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/sidarsih.site /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

---

## 6. Environment Configuration

### 6.1 Production Environment Variables

**Frontend (.env.production):**
```bash
# /home/dell/KP2A-CIMAHI/KP2A/.env.production
VITE_API_URL=https://api.sidarsih.site
VITE_WHATSAPP_API_URL=https://whatsapp.sidarsih.site
VITE_SOCKET_URL=https://whatsapp.sidarsih.site
VITE_APP_DOMAIN=sidarsih.site
VITE_APP_ENV=production
VITE_ENABLE_HTTPS=true
```

**Backend (.env.production):**
```bash
# /home/dell/KP2A-CIMAHI/KP2A/whatsapp-backend/.env.production
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://sidarsih.site
CORS_ORIGIN=https://sidarsih.site,https://www.sidarsih.site,https://admin.sidarsih.site
DOMAIN=sidarsih.site
SSL_ENABLED=true
SECURE_COOKIES=true

# Database
DATABASE_URL=your_production_database_url

# Security
JWT_SECRET=your_production_jwt_secret
SESSION_SECRET=your_production_session_secret

# Logging
LOG_LEVEL=info
LOG_FILE=/home/dell/KP2A-CIMAHI/KP2A/whatsapp-backend/logs/production.log
```

### 6.2 PM2 Ecosystem Configuration

**File: `/home/dell/KP2A-CIMAHI/KP2A/ecosystem.config.js`**

```javascript
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
      log_file: './logs/combined.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm Z',
      merge_logs: true,
      max_memory_restart: '1G',
      restart_delay: 4000,
      max_restarts: 10,
      min_uptime: '10s'
    }
  ]
};
```

---

## 7. Testing & Verification

### 7.1 SSL Certificate Verification

```bash
# Test SSL certificate
openssl s_client -connect sidarsih.site:443 -servername sidarsih.site

# Check SSL rating
curl -I https://sidarsih.site

# SSL Labs test (manual)
# https://www.ssllabs.com/ssltest/analyze.html?d=sidarsih.site
```

### 7.2 Endpoint Connectivity Tests

**Script: `/home/dell/KP2A-CIMAHI/KP2A/scripts/test-endpoints.js`**

```javascript
const axios = require('axios');
const io = require('socket.io-client');

const endpoints = [
  'https://sidarsih.site',
  'https://www.sidarsih.site',
  'https://api.sidarsih.site/health',
  'https://whatsapp.sidarsih.site/health'
];

async function testEndpoints() {
  console.log('🧪 Testing Endpoints...\n');
  
  for (const endpoint of endpoints) {
    try {
      const response = await axios.get(endpoint, {
        timeout: 10000,
        validateStatus: (status) => status < 500
      });
      
      console.log(`✅ ${endpoint} - Status: ${response.status}`);
    } catch (error) {
      console.log(`❌ ${endpoint} - Error: ${error.message}`);
    }
  }
  
  // Test WebSocket connection
  console.log('\n🔌 Testing WebSocket Connection...');
  const socket = io('https://whatsapp.sidarsih.site', {
    timeout: 10000
  });
  
  socket.on('connect', () => {
    console.log('✅ WebSocket connected successfully');
    socket.disconnect();
  });
  
  socket.on('connect_error', (error) => {
    console.log(`❌ WebSocket connection failed: ${error.message}`);
  });
}

testEndpoints();
```

### 7.3 Performance Benchmarks

**Script: `/home/dell/KP2A-CIMAHI/KP2A/scripts/performance-test.js`**

```javascript
const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');

async function runLighthouse() {
  const chrome = await chromeLauncher.launch({chromeFlags: ['--headless']});
  const options = {logLevel: 'info', output: 'html', onlyCategories: ['performance']};
  const runnerResult = await lighthouse('https://sidarsih.site', options);

  console.log('Performance Score:', runnerResult.lhr.categories.performance.score * 100);
  
  await chrome.kill();
}

runLighthouse();
```

### 7.4 Security Scan

```bash
# Test security headers
curl -I https://sidarsih.site

# Test for common vulnerabilities
nmap -sV --script vuln sidarsih.site

# Test WAF rules
curl -X POST "https://sidarsih.site/admin" \
  -H "User-Agent: sqlmap" \
  -d "id=1' UNION SELECT * FROM users--"
```

---

## 8. Deployment Procedures

### 8.1 Pre-deployment Checklist

```bash
# 1. Backup current application
sudo tar -czf /backup/sidarsih-$(date +%Y%m%d).tar.gz /home/dell/KP2A-CIMAHI/KP2A

# 2. Test build locally
cd /home/dell/KP2A-CIMAHI/KP2A
npm run build

# 3. Verify environment variables
cat .env.production

# 4. Test database connectivity
npm run test:db

# 5. Run security scan
npm audit
```

### 8.2 Deployment Steps

```bash
#!/bin/bash
# Deployment script: /home/dell/KP2A-CIMAHI/KP2A/scripts/deploy.sh

set -e

echo "🚀 Starting deployment to sidarsih.site..."

# 1. Pull latest code
git pull origin main

# 2. Install dependencies
npm ci --production

# 3. Build frontend
npm run build

# 4. Install backend dependencies
cd whatsapp-backend
npm ci --production
cd ..

# 5. Run database migrations
npm run migrate:prod

# 6. Restart PM2 processes
pm2 restart ecosystem.config.js --env production

# 7. Reload Nginx
sudo nginx -t && sudo systemctl reload nginx

# 8. Verify deployment
sleep 10
curl -f https://sidarsih.site/health || exit 1
curl -f https://whatsapp.sidarsih.site/health || exit 1

echo "✅ Deployment completed successfully!"
```

### 8.3 Rollback Procedures

```bash
#!/bin/bash
# Rollback script: /home/dell/KP2A-CIMAHI/KP2A/scripts/rollback.sh

set -e

BACKUP_DATE=$1
if [ -z "$BACKUP_DATE" ]; then
  echo "Usage: ./rollback.sh YYYYMMDD"
  exit 1
fi

echo "🔄 Rolling back to backup from $BACKUP_DATE..."

# 1. Stop PM2 processes
pm2 stop ecosystem.config.js

# 2. Restore from backup
sudo tar -xzf /backup/sidarsih-$BACKUP_DATE.tar.gz -C /

# 3. Restart services
pm2 start ecosystem.config.js --env production
sudo systemctl reload nginx

echo "✅ Rollback completed!"
```

### 8.4 Monitoring Setup

**Script: `/home/dell/KP2A-CIMAHI/KP2A/scripts/monitor.sh`**

```bash
#!/bin/bash
# Health monitoring script

while true; do
  # Check main site
  if ! curl -f -s https://sidarsih.site/health > /dev/null; then
    echo "$(date): Main site is down!" >> /var/log/sidarsih-monitor.log
    # Send alert (email, Slack, etc.)
  fi
  
  # Check WhatsApp backend
  if ! curl -f -s https://whatsapp.sidarsih.site/health > /dev/null; then
    echo "$(date): WhatsApp backend is down!" >> /var/log/sidarsih-monitor.log
    # Send alert
  fi
  
  # Check PM2 processes
  if ! pm2 list | grep -q "online"; then
    echo "$(date): PM2 processes are not running!" >> /var/log/sidarsih-monitor.log
    # Restart PM2
    pm2 restart all
  fi
  
  sleep 60
done
```

### 8.5 Troubleshooting Guide

**Common Issues:**

1. **SSL Certificate Issues**
   ```bash
   # Check certificate validity
   openssl x509 -in /etc/ssl/certs/sidarsih.site.pem -text -noout
   
   # Regenerate Cloudflare Origin Certificate if needed
   ```

2. **DNS Propagation Issues**
   ```bash
   # Check DNS from different locations
   dig @8.8.8.8 sidarsih.site
   dig @1.1.1.1 sidarsih.site
   ```

3. **WebSocket Connection Issues**
   ```bash
   # Check Nginx WebSocket configuration
   sudo nginx -t
   
   # Check PM2 logs
   pm2 logs sidarsih-whatsapp-backend
   ```

4. **Performance Issues**
   ```bash
   # Check server resources
   htop
   df -h
   
   # Check Cloudflare cache hit rate
   # (via Cloudflare Analytics dashboard)
   ```

---

## Kesimpulan

Dokumentasi ini menyediakan panduan lengkap untuk mengintegrasikan aplikasi SIDARSIH dengan Cloudflare menggunakan domain sidarsih.site. Pastikan untuk:

1. ✅ Mengikuti semua langkah konfigurasi secara berurutan
2. ✅ Melakukan testing menyeluruh sebelum production
3. ✅ Menyiapkan monitoring dan backup procedures
4. ✅ Memiliki rollback plan yang siap digunakan

**Kontak Support:**
- Cloudflare Support: https://support.cloudflare.com
- Dokumentasi: https://developers.cloudflare.com

**Next Steps:**
1. Setup monitoring dashboard
2. Implement automated backups
3. Configure alerting system
4. Performance optimization tuning