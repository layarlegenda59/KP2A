# Panduan Testing dan Troubleshooting - SIDARSIH Cloudflare Integration

## 1. Pre-Deployment Testing Checklist

### 1.1 Local Environment Testing

```bash
#!/bin/bash
# /home/dell/KP2A-CIMAHI/KP2A/scripts/pre-deployment-test.sh

echo "🧪 Starting pre-deployment tests..."

# Test 1: Environment Variables
echo "1. Testing environment variables..."
if [ ! -f ".env.production" ]; then
    echo "❌ .env.production file missing"
    exit 1
fi

if [ ! -f "whatsapp-backend/.env.production" ]; then
    echo "❌ Backend .env.production file missing"
    exit 1
fi

# Test 2: Dependencies
echo "2. Testing dependencies..."
npm audit --audit-level high
if [ $? -ne 0 ]; then
    echo "❌ High severity vulnerabilities found"
    exit 1
fi

# Test 3: Build Process
echo "3. Testing build process..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Frontend build failed"
    exit 1
fi

# Test 4: Backend Dependencies
echo "4. Testing backend dependencies..."
cd whatsapp-backend
npm audit --audit-level high
if [ $? -ne 0 ]; then
    echo "❌ Backend vulnerabilities found"
    exit 1
fi
cd ..

# Test 5: Database Connection
echo "5. Testing database connection..."
node -e "
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.production' });
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
supabase.from('users').select('count').then(console.log).catch(console.error);
"

echo "✅ Pre-deployment tests completed successfully!"
```

### 1.2 SSL Certificate Validation

```bash
#!/bin/bash
# /home/dell/KP2A-CIMAHI/KP2A/scripts/test-ssl.sh

echo "🔒 Testing SSL certificates..."

# Test certificate files exist
if [ ! -f "/etc/ssl/certs/sidarsih.site.pem" ]; then
    echo "❌ SSL certificate file missing"
    exit 1
fi

if [ ! -f "/etc/ssl/private/sidarsih.site.key" ]; then
    echo "❌ SSL private key missing"
    exit 1
fi

# Test certificate validity
echo "📋 Certificate information:"
openssl x509 -in /etc/ssl/certs/sidarsih.site.pem -text -noout | grep -E "(Subject:|Issuer:|Not Before:|Not After:)"

# Test certificate expiration
expiry_date=$(openssl x509 -in /etc/ssl/certs/sidarsih.site.pem -noout -enddate | cut -d= -f2)
expiry_timestamp=$(date -d "$expiry_date" +%s)
current_timestamp=$(date +%s)
days_until_expiry=$(( (expiry_timestamp - current_timestamp) / 86400 ))

if [ $days_until_expiry -lt 30 ]; then
    echo "⚠️ Certificate expires in $days_until_expiry days"
else
    echo "✅ Certificate valid for $days_until_expiry days"
fi

# Test certificate chain
echo "🔗 Testing certificate chain..."
openssl verify -CAfile /etc/ssl/certs/cloudflare-origin-ca.pem /etc/ssl/certs/sidarsih.site.pem

echo "✅ SSL certificate tests completed!"
```

## 2. Post-Deployment Testing

### 2.1 Comprehensive Endpoint Testing

```javascript
// /home/dell/KP2A-CIMAHI/KP2A/scripts/test-endpoints.js
const axios = require('axios');
const io = require('socket.io-client');

const endpoints = [
    {
        name: 'Main Site',
        url: 'https://sidarsih.site',
        expectedStatus: 200,
        timeout: 10000
    },
    {
        name: 'Main Site WWW',
        url: 'https://www.sidarsih.site',
        expectedStatus: 200,
        timeout: 10000
    },
    {
        name: 'WhatsApp Backend Health',
        url: 'https://whatsapp.sidarsih.site/health',
        expectedStatus: 200,
        timeout: 5000
    },
    {
        name: 'API Gateway',
        url: 'https://api.sidarsih.site',
        expectedStatus: 200,
        timeout: 10000
    },
    {
        name: 'WhatsApp QR Endpoint',
        url: 'https://whatsapp.sidarsih.site/api/whatsapp/qr-code',
        expectedStatus: 200,
        timeout: 15000
    }
];

async function testEndpoints() {
    console.log('🧪 Testing Endpoints...\n');
    
    let passedTests = 0;
    let totalTests = endpoints.length;
    
    for (const endpoint of endpoints) {
        try {
            const startTime = Date.now();
            const response = await axios.get(endpoint.url, {
                timeout: endpoint.timeout,
                validateStatus: (status) => status < 500,
                headers: {
                    'User-Agent': 'SIDARSIH-Test-Agent/1.0'
                }
            });
            
            const responseTime = Date.now() - startTime;
            
            if (response.status === endpoint.expectedStatus) {
                console.log(`✅ ${endpoint.name} - Status: ${response.status} - Time: ${responseTime}ms`);
                passedTests++;
            } else {
                console.log(`⚠️ ${endpoint.name} - Expected: ${endpoint.expectedStatus}, Got: ${response.status} - Time: ${responseTime}ms`);
            }
            
            // Check response headers for security
            const securityHeaders = [
                'strict-transport-security',
                'x-frame-options',
                'x-content-type-options'
            ];
            
            securityHeaders.forEach(header => {
                if (!response.headers[header]) {
                    console.log(`⚠️ ${endpoint.name} - Missing security header: ${header}`);
                }
            });
            
        } catch (error) {
            console.log(`❌ ${endpoint.name} - Error: ${error.message}`);
        }
    }
    
    console.log(`\n📊 Test Results: ${passedTests}/${totalTests} passed\n`);
    
    // Test WebSocket connection
    await testWebSocket();
    
    // Test HTTPS redirect
    await testHttpsRedirect();
    
    // Test CORS
    await testCORS();
}

async function testWebSocket() {
    console.log('🔌 Testing WebSocket Connection...');
    
    return new Promise((resolve) => {
        const socket = io('https://whatsapp.sidarsih.site', {
            timeout: 10000,
            transports: ['websocket', 'polling']
        });
        
        const timeout = setTimeout(() => {
            console.log('❌ WebSocket connection timeout');
            socket.disconnect();
            resolve();
        }, 10000);
        
        socket.on('connect', () => {
            console.log('✅ WebSocket connected successfully');
            clearTimeout(timeout);
            socket.disconnect();
            resolve();
        });
        
        socket.on('connect_error', (error) => {
            console.log(`❌ WebSocket connection failed: ${error.message}`);
            clearTimeout(timeout);
            resolve();
        });
    });
}

async function testHttpsRedirect() {
    console.log('🔄 Testing HTTPS Redirect...');
    
    try {
        const response = await axios.get('http://sidarsih.site', {
            maxRedirects: 0,
            validateStatus: (status) => status === 301 || status === 302
        });
        
        if (response.headers.location && response.headers.location.startsWith('https://')) {
            console.log('✅ HTTPS redirect working correctly');
        } else {
            console.log('❌ HTTPS redirect not configured properly');
        }
    } catch (error) {
        if (error.response && (error.response.status === 301 || error.response.status === 302)) {
            console.log('✅ HTTPS redirect working correctly');
        } else {
            console.log(`❌ HTTPS redirect test failed: ${error.message}`);
        }
    }
}

async function testCORS() {
    console.log('🌐 Testing CORS Configuration...');
    
    try {
        const response = await axios.options('https://whatsapp.sidarsih.site/api/whatsapp/qr-code', {
            headers: {
                'Origin': 'https://sidarsih.site',
                'Access-Control-Request-Method': 'GET',
                'Access-Control-Request-Headers': 'Content-Type'
            }
        });
        
        const corsHeaders = response.headers['access-control-allow-origin'];
        if (corsHeaders && corsHeaders.includes('sidarsih.site')) {
            console.log('✅ CORS configuration working correctly');
        } else {
            console.log('⚠️ CORS configuration may need adjustment');
        }
    } catch (error) {
        console.log(`❌ CORS test failed: ${error.message}`);
    }
}

// Run tests
testEndpoints().then(() => {
    console.log('🏁 All tests completed!');
}).catch(console.error);
```

### 2.2 Performance Testing

```javascript
// /home/dell/KP2A-CIMAHI/KP2A/scripts/performance-test.js
const axios = require('axios');

async function performanceTest() {
    console.log('⚡ Starting Performance Tests...\n');
    
    const testUrls = [
        'https://sidarsih.site',
        'https://whatsapp.sidarsih.site/health',
        'https://api.sidarsih.site'
    ];
    
    for (const url of testUrls) {
        await testResponseTime(url);
        await testConcurrentRequests(url);
    }
}

async function testResponseTime(url) {
    console.log(`📊 Testing response time for ${url}...`);
    
    const times = [];
    const iterations = 10;
    
    for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();
        try {
            await axios.get(url, { timeout: 30000 });
            const responseTime = Date.now() - startTime;
            times.push(responseTime);
        } catch (error) {
            console.log(`❌ Request ${i + 1} failed: ${error.message}`);
        }
    }
    
    if (times.length > 0) {
        const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
        const minTime = Math.min(...times);
        const maxTime = Math.max(...times);
        
        console.log(`   Average: ${avgTime.toFixed(2)}ms`);
        console.log(`   Min: ${minTime}ms, Max: ${maxTime}ms`);
        
        if (avgTime > 3000) {
            console.log(`   ⚠️ Average response time is high (${avgTime.toFixed(2)}ms)`);
        } else {
            console.log(`   ✅ Response time is acceptable`);
        }
    }
    console.log('');
}

async function testConcurrentRequests(url) {
    console.log(`🚀 Testing concurrent requests for ${url}...`);
    
    const concurrentRequests = 10;
    const promises = [];
    
    const startTime = Date.now();
    
    for (let i = 0; i < concurrentRequests; i++) {
        promises.push(
            axios.get(url, { timeout: 30000 }).catch(error => ({ error: error.message }))
        );
    }
    
    const results = await Promise.all(promises);
    const totalTime = Date.now() - startTime;
    
    const successful = results.filter(r => !r.error).length;
    const failed = results.filter(r => r.error).length;
    
    console.log(`   Successful: ${successful}/${concurrentRequests}`);
    console.log(`   Failed: ${failed}/${concurrentRequests}`);
    console.log(`   Total time: ${totalTime}ms`);
    console.log(`   Requests per second: ${(concurrentRequests / (totalTime / 1000)).toFixed(2)}`);
    
    if (failed > 0) {
        console.log(`   ⚠️ ${failed} requests failed under load`);
    } else {
        console.log(`   ✅ All requests successful under load`);
    }
    console.log('');
}

performanceTest().catch(console.error);
```

### 2.3 Security Testing

```bash
#!/bin/bash
# /home/dell/KP2A-CIMAHI/KP2A/scripts/security-test.sh

echo "🔒 Starting Security Tests..."

# Test 1: SSL/TLS Configuration
echo "1. Testing SSL/TLS configuration..."
echo | openssl s_client -connect sidarsih.site:443 -servername sidarsih.site 2>/dev/null | openssl x509 -noout -text | grep -E "(Signature Algorithm|Public Key Algorithm|Subject:|Issuer:)"

# Test 2: Security Headers
echo -e "\n2. Testing security headers..."
curl -I https://sidarsih.site 2>/dev/null | grep -E "(Strict-Transport-Security|X-Frame-Options|X-Content-Type-Options|X-XSS-Protection|Content-Security-Policy)"

# Test 3: HTTP to HTTPS Redirect
echo -e "\n3. Testing HTTP to HTTPS redirect..."
redirect_status=$(curl -s -o /dev/null -w "%{http_code}" -L http://sidarsih.site)
if [ "$redirect_status" = "200" ]; then
    echo "✅ HTTP to HTTPS redirect working"
else
    echo "❌ HTTP to HTTPS redirect failed (Status: $redirect_status)"
fi

# Test 4: Common Vulnerability Scans
echo -e "\n4. Testing for common vulnerabilities..."

# Test for directory traversal
echo "   Testing directory traversal..."
status=$(curl -s -o /dev/null -w "%{http_code}" https://sidarsih.site/../../../etc/passwd)
if [ "$status" = "404" ] || [ "$status" = "403" ]; then
    echo "   ✅ Directory traversal protection working"
else
    echo "   ⚠️ Directory traversal test returned status: $status"
fi

# Test for SQL injection patterns
echo "   Testing SQL injection protection..."
status=$(curl -s -o /dev/null -w "%{http_code}" "https://whatsapp.sidarsih.site/api/whatsapp/qr-code?id=1'%20OR%20'1'='1")
if [ "$status" = "400" ] || [ "$status" = "403" ] || [ "$status" = "404" ]; then
    echo "   ✅ SQL injection protection working"
else
    echo "   ⚠️ SQL injection test returned status: $status"
fi

# Test 5: Rate Limiting
echo -e "\n5. Testing rate limiting..."
for i in {1..15}; do
    status=$(curl -s -o /dev/null -w "%{http_code}" https://whatsapp.sidarsih.site/api/whatsapp/qr-code)
    if [ "$status" = "429" ]; then
        echo "   ✅ Rate limiting working (triggered after $i requests)"
        break
    fi
    if [ $i -eq 15 ]; then
        echo "   ⚠️ Rate limiting may not be configured properly"
    fi
done

echo -e "\n✅ Security tests completed!"
```

## 3. Troubleshooting Guide

### 3.1 Common Issues and Solutions

#### Issue 1: SSL Certificate Problems

**Symptoms:**
- Browser shows "Not Secure" warning
- SSL certificate errors
- Mixed content warnings

**Diagnosis:**
```bash
# Check certificate validity
openssl x509 -in /etc/ssl/certs/sidarsih.site.pem -text -noout

# Check certificate chain
openssl verify -CAfile /etc/ssl/certs/cloudflare-origin-ca.pem /etc/ssl/certs/sidarsih.site.pem

# Test SSL connection
echo | openssl s_client -connect sidarsih.site:443 -servername sidarsih.site
```

**Solutions:**
```bash
# Regenerate Cloudflare Origin Certificate
# 1. Go to Cloudflare Dashboard → SSL/TLS → Origin Certificates
# 2. Create new certificate
# 3. Replace files:
sudo cp new-certificate.pem /etc/ssl/certs/sidarsih.site.pem
sudo cp new-private-key.key /etc/ssl/private/sidarsih.site.key
sudo chmod 644 /etc/ssl/certs/sidarsih.site.pem
sudo chmod 600 /etc/ssl/private/sidarsih.site.key

# Restart Nginx
sudo systemctl reload nginx
```

#### Issue 2: WebSocket Connection Failures

**Symptoms:**
- QR code not loading
- Real-time features not working
- Socket.IO connection errors

**Diagnosis:**
```bash
# Check PM2 status
pm2 status

# Check PM2 logs
pm2 logs sidarsih-whatsapp-backend

# Check Nginx configuration
sudo nginx -t

# Test WebSocket endpoint
curl -I https://whatsapp.sidarsih.site/socket.io/
```

**Solutions:**
```bash
# Restart PM2 processes
pm2 restart ecosystem.config.js --env production

# Check Nginx WebSocket configuration
sudo nano /etc/nginx/sites-available/sidarsih.site
# Ensure WebSocket headers are properly set

# Reload Nginx
sudo systemctl reload nginx

# Check firewall
sudo ufw status
sudo ufw allow 3001/tcp
```

#### Issue 3: High Response Times

**Symptoms:**
- Slow page loading
- API timeouts
- Poor user experience

**Diagnosis:**
```bash
# Check server resources
htop
df -h
iostat

# Check PM2 memory usage
pm2 monit

# Test response times
curl -w "@curl-format.txt" -o /dev/null -s https://sidarsih.site

# Check Nginx access logs
sudo tail -f /var/log/nginx/access.log
```

**Solutions:**
```bash
# Optimize PM2 configuration
# Increase instances in ecosystem.config.js
instances: 4  # or max

# Enable Nginx caching
# Add to Nginx configuration:
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=my_cache:10m max_size=10g 
                 inactive=60m use_temp_path=off;

# Optimize database queries
# Check slow query logs in Supabase dashboard

# Enable Cloudflare caching
# Set appropriate cache rules in Cloudflare dashboard
```

#### Issue 4: CORS Errors

**Symptoms:**
- Frontend can't connect to backend
- "CORS policy" errors in browser console
- API requests failing

**Diagnosis:**
```bash
# Test CORS headers
curl -H "Origin: https://sidarsih.site" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: X-Requested-With" \
     -X OPTIONS \
     https://whatsapp.sidarsih.site/api/whatsapp/qr-code
```

**Solutions:**
```javascript
// Update CORS configuration in backend
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

### 3.2 Monitoring and Alerting

#### Real-time Monitoring Dashboard

```bash
#!/bin/bash
# /home/dell/KP2A-CIMAHI/KP2A/scripts/dashboard.sh

while true; do
    clear
    echo "🖥️  SIDARSIH System Dashboard - $(date)"
    echo "=================================================="
    
    # System Status
    echo "📊 System Status:"
    echo "   CPU: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | sed 's/%us,//')%"
    echo "   Memory: $(free | awk 'NR==2{printf "%.1f%%", $3*100/$2}')"
    echo "   Disk: $(df / | awk 'NR==2 {print $5}')"
    echo ""
    
    # PM2 Status
    echo "🔧 PM2 Status:"
    pm2 jlist | jq -r '.[] | "   \(.name): \(.pm2_env.status) (CPU: \(.monit.cpu)%, Memory: \(.monit.memory/1024/1024 | floor)MB)"'
    echo ""
    
    # Nginx Status
    echo "🌐 Nginx Status:"
    if systemctl is-active --quiet nginx; then
        echo "   ✅ Nginx: Running"
        echo "   Connections: $(netstat -an | grep :443 | wc -l)"
    else
        echo "   ❌ Nginx: Not Running"
    fi
    echo ""
    
    # Endpoint Health
    echo "🏥 Endpoint Health:"
    for endpoint in "https://sidarsih.site/health" "https://whatsapp.sidarsih.site/health"; do
        if curl -f -s --max-time 5 "$endpoint" > /dev/null; then
            echo "   ✅ $endpoint"
        else
            echo "   ❌ $endpoint"
        fi
    done
    echo ""
    
    # Recent Errors
    echo "🚨 Recent Errors (last 10 lines):"
    tail -n 10 /home/dell/KP2A-CIMAHI/KP2A/whatsapp-backend/logs/error.log 2>/dev/null | sed 's/^/   /' || echo "   No recent errors"
    
    sleep 30
done
```

#### Log Analysis Script

```bash
#!/bin/bash
# /home/dell/KP2A-CIMAHI/KP2A/scripts/analyze-logs.sh

LOG_DIR="/home/dell/KP2A-CIMAHI/KP2A/whatsapp-backend/logs"
NGINX_LOG="/var/log/nginx/access.log"

echo "📊 Log Analysis Report - $(date)"
echo "=================================================="

# Error Analysis
echo "🚨 Error Summary (last 24 hours):"
if [ -f "$LOG_DIR/error.log" ]; then
    grep "$(date -d '1 day ago' '+%Y-%m-%d')" "$LOG_DIR/error.log" | \
    awk '{print $4}' | sort | uniq -c | sort -nr | head -10
else
    echo "   No error log found"
fi
echo ""

# Request Analysis
echo "📈 Request Analysis (last hour):"
if [ -f "$NGINX_LOG" ]; then
    awk -v date="$(date -d '1 hour ago' '+%d/%b/%Y:%H')" '$4 ~ date {print $7}' "$NGINX_LOG" | \
    sort | uniq -c | sort -nr | head -10
else
    echo "   No access log found"
fi
echo ""

# Response Time Analysis
echo "⏱️  Response Time Analysis:"
if [ -f "$NGINX_LOG" ]; then
    awk -v date="$(date '+%d/%b/%Y')" '$4 ~ date && $NF != "-" {sum+=$NF; count++} END {if(count>0) print "   Average response time: " sum/count "ms"}' "$NGINX_LOG"
else
    echo "   No response time data available"
fi
echo ""

# Status Code Analysis
echo "📊 HTTP Status Codes (last hour):"
if [ -f "$NGINX_LOG" ]; then
    awk -v date="$(date -d '1 hour ago' '+%d/%b/%Y:%H')" '$4 ~ date {print $9}' "$NGINX_LOG" | \
    sort | uniq -c | sort -nr
else
    echo "   No status code data available"
fi
```

### 3.3 Emergency Procedures

#### Emergency Rollback

```bash
#!/bin/bash
# /home/dell/KP2A-CIMAHI/KP2A/scripts/emergency-rollback.sh

echo "🚨 EMERGENCY ROLLBACK INITIATED"
echo "================================"

# Find latest backup
LATEST_BACKUP=$(ls -t /backup/sidarsih/app-*.tar.gz | head -1)
if [ -z "$LATEST_BACKUP" ]; then
    echo "❌ No backup found!"
    exit 1
fi

echo "📦 Using backup: $LATEST_BACKUP"

# Stop services
echo "⏹️ Stopping services..."
pm2 stop all
sudo systemctl stop nginx

# Restore backup
echo "📥 Restoring backup..."
cd /
sudo tar -xzf "$LATEST_BACKUP"

# Start services
echo "▶️ Starting services..."
sudo systemctl start nginx
cd /home/dell/KP2A-CIMAHI/KP2A
pm2 start ecosystem.config.js --env production

# Verify
sleep 10
if curl -f -s https://sidarsih.site/health > /dev/null; then
    echo "✅ Emergency rollback successful!"
else
    echo "❌ Emergency rollback failed - manual intervention required!"
fi
```

#### Service Recovery

```bash
#!/bin/bash
# /home/dell/KP2A-CIMAHI/KP2A/scripts/service-recovery.sh

echo "🔧 Service Recovery Script"
echo "========================="

# Check and restart PM2
if ! pm2 list | grep -q "online"; then
    echo "🔄 Restarting PM2 processes..."
    pm2 kill
    pm2 start ecosystem.config.js --env production
fi

# Check and restart Nginx
if ! systemctl is-active --quiet nginx; then
    echo "🔄 Restarting Nginx..."
    sudo systemctl start nginx
fi

# Clear cache if needed
echo "🧹 Clearing cache..."
sudo rm -rf /var/cache/nginx/*

# Check disk space
DISK_USAGE=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 90 ]; then
    echo "🧹 Cleaning up disk space..."
    # Clean old logs
    find /home/dell/KP2A-CIMAHI/KP2A/whatsapp-backend/logs -name "*.log" -mtime +7 -delete
    # Clean old backups
    find /backup/sidarsih -name "*.tar.gz" -mtime +30 -delete
fi

echo "✅ Service recovery completed!"
```

## 4. Performance Optimization

### 4.1 Database Optimization

```sql
-- Performance optimization queries for Supabase

-- Add indexes for frequently queried columns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_message_logs_created_at_desc 
ON message_logs (created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_sessions_status_updated 
ON user_sessions (status, updated_at DESC);

-- Analyze table statistics
ANALYZE users;
ANALYZE user_sessions;
ANALYZE message_logs;

-- Check for slow queries
SELECT query, mean_time, calls, total_time
FROM pg_stat_statements
WHERE mean_time > 100
ORDER BY mean_time DESC
LIMIT 10;
```

### 4.2 Frontend Optimization

```javascript
// /home/dell/KP2A-CIMAHI/KP2A/vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          socket: ['socket.io-client'],
          ui: ['@headlessui/react', '@heroicons/react']
        }
      }
    },
    chunkSizeWarningLimit: 1000,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    }
  },
  server: {
    host: true,
    port: 5173
  }
})
```

### 4.3 Cloudflare Optimization

```yaml
# Cloudflare Page Rules untuk optimasi performa

# Rule 1: Static Assets
URL: sidarsih.site/assets/*
Settings:
  - Cache Level: Cache Everything
  - Edge Cache TTL: 1 year
  - Browser Cache TTL: 1 year
  - Auto Minify: JS, CSS, HTML

# Rule 2: API Endpoints
URL: api.sidarsih.site/*
Settings:
  - Cache Level: Bypass
  - Security Level: Medium
  - Rocket Loader: Off

# Rule 3: WebSocket Endpoints
URL: whatsapp.sidarsih.site/socket.io/*
Settings:
  - Cache Level: Bypass
  - WebSockets: On
  - Security Level: Low
```

Dokumentasi ini menyediakan panduan lengkap untuk testing, troubleshooting, dan optimasi sistem SIDARSIH dengan integrasi Cloudflare. Semua script dan prosedur telah dirancang untuk memastikan sistem berjalan dengan optimal dan dapat diandalkan dalam lingkungan produksi.