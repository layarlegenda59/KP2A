#!/bin/bash

# Fix 522 Error Script for SIDARSIH
# This script provides solutions for the 522 Connection Timeout error

echo "🔧 SIDARSIH - Fix 522 Error Script"
echo "=================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check current server status
echo "📊 Checking Current Server Status..."
echo "-----------------------------------"

# Check PM2 processes
print_info "PM2 Processes:"
pm2 status

echo ""

# Check listening ports
print_info "Listening Ports:"
ss -tlnp | grep -E ':80|:443|:3000|:3001|:8000|:8080'

echo ""

# Check server IP
SERVER_IP=$(curl -s ifconfig.me)
print_info "Server IP: $SERVER_IP"

# Check DNS resolution
print_info "DNS Resolution for sidarsih.site:"
dig +short sidarsih.site

echo ""
echo "🔍 Diagnosis Results:"
echo "-------------------"

# Check if applications are running
if pm2 list | grep -q "whatsapp-backend.*online"; then
    print_status "Backend application is running (port 3001)"
else
    print_error "Backend application is not running"
fi

if pm2 list | grep -q "whatsapp-frontend-port80.*online"; then
    print_status "Frontend application is running (port 8080)"
else
    print_error "Frontend application is not running"
fi

if pm2 list | grep -q "sidarsih-proxy.*online"; then
    print_status "Proxy server is running (port 8000)"
else
    print_error "Proxy server is not running"
fi

# Check if port 80 is available
if ss -tlnp | grep -q ":80 "; then
    print_warning "Port 80 is occupied"
else
    print_info "Port 80 is available"
fi

echo ""
echo "🛠️  Available Solutions:"
echo "----------------------"

echo "1. 🔄 Restart all services"
echo "2. 🌐 Test current setup (port 8000)"
echo "3. 📋 Show Cloudflare configuration instructions"
echo "4. 🔧 Create simple HTTP server on port 80 (requires root)"
echo "5. 📊 Show monitoring dashboard"
echo "6. 🚀 Auto-fix common issues"
echo "7. ❌ Exit"

echo ""
read -p "Choose an option (1-7): " choice

case $choice in
    1)
        echo ""
        print_info "Restarting all services..."
        pm2 restart all
        sleep 3
        pm2 status
        ;;
    2)
        echo ""
        print_info "Testing current setup..."
        echo "Testing proxy server (port 8000):"
        curl -I http://localhost:8000 2>/dev/null && print_status "Proxy server is working" || print_error "Proxy server failed"
        
        echo ""
        echo "Testing frontend (port 8080):"
        curl -I http://localhost:8080 2>/dev/null && print_status "Frontend is working" || print_error "Frontend failed"
        
        echo ""
        echo "Testing backend (port 3001):"
        curl -I http://localhost:3001 2>/dev/null && print_status "Backend is working" || print_error "Backend failed"
        ;;
    3)
        echo ""
        print_info "Cloudflare Configuration Instructions:"
        echo "======================================"
        echo ""
        echo "Since we cannot use port 80 without root access, you need to configure"
        echo "Cloudflare to use a custom origin port:"
        echo ""
        echo "1. Login to Cloudflare Dashboard"
        echo "2. Go to DNS settings for sidarsih.site"
        echo "3. Edit the A record for @ (root domain)"
        echo "4. Set the IP to: $SERVER_IP"
        echo "5. Click on the orange cloud (proxy) to disable it temporarily"
        echo "6. Or configure custom origin port in SSL/TLS settings"
        echo ""
        echo "Alternative: Use subdomain with port:"
        echo "- Create CNAME record: app.sidarsih.site -> sidarsih.site"
        echo "- Access via: http://app.sidarsih.site:8000"
        echo ""
        print_warning "Current working URLs:"
        echo "- http://$SERVER_IP:8000 (proxy server)"
        echo "- http://$SERVER_IP:8080 (frontend direct)"
        echo "- http://$SERVER_IP:3001 (backend API)"
        ;;
    4)
        echo ""
        print_warning "This option requires root access (sudo)"
        echo "Creating simple HTTP server on port 80..."
        
        # Create simple HTTP server script
        cat > /tmp/simple-server-80.js << 'EOF'
const http = require('http');
const httpProxy = require('http-proxy-middleware');

const proxy = httpProxy.createProxyMiddleware({
  target: 'http://localhost:8000',
  changeOrigin: true,
  ws: true
});

const server = http.createServer(proxy);
server.listen(80, '0.0.0.0', () => {
  console.log('Simple HTTP server running on port 80, proxying to port 8000');
});
EOF
        
        echo "Script created at /tmp/simple-server-80.js"
        echo "To run: sudo node /tmp/simple-server-80.js"
        print_warning "You need to run this with sudo privileges"
        ;;
    5)
        echo ""
        print_info "Monitoring Dashboard:"
        echo "===================="
        echo ""
        while true; do
            clear
            echo "🖥️  SIDARSIH Server Monitoring - $(date)"
            echo "========================================"
            echo ""
            
            # PM2 status
            echo "📊 PM2 Processes:"
            pm2 status
            
            echo ""
            echo "🌐 Port Status:"
            ss -tlnp | grep -E ':80|:443|:3000|:3001|:8000|:8080' || echo "No relevant ports found"
            
            echo ""
            echo "💾 Memory Usage:"
            free -h
            
            echo ""
            echo "💿 Disk Usage:"
            df -h / | tail -1
            
            echo ""
            echo "Press Ctrl+C to exit monitoring..."
            sleep 5
        done
        ;;
    6)
        echo ""
        print_info "Auto-fixing common issues..."
        
        # Stop any conflicting processes
        print_info "Stopping old processes..."
        pm2 delete sidarsih-proxy 2>/dev/null || true
        pm2 delete whatsapp-frontend 2>/dev/null || true
        
        # Start services in correct order
        print_info "Starting backend..."
        pm2 restart whatsapp-backend 2>/dev/null || pm2 start "npm run dev" --name "whatsapp-backend" --cwd "./whatsapp-backend"
        
        print_info "Starting frontend on port 8080..."
        pm2 restart whatsapp-frontend-port80 2>/dev/null || pm2 start "npm run dev -- --port 8080 --host 0.0.0.0" --name "whatsapp-frontend-port80"
        
        print_info "Starting proxy server on port 8000..."
        pm2 restart sidarsih-proxy 2>/dev/null || pm2 start proxy-server.cjs --name "sidarsih-proxy"
        
        sleep 3
        
        print_info "Testing services..."
        curl -I http://localhost:8000 >/dev/null 2>&1 && print_status "Proxy server OK" || print_error "Proxy server failed"
        curl -I http://localhost:8080 >/dev/null 2>&1 && print_status "Frontend OK" || print_error "Frontend failed"
        curl -I http://localhost:3001 >/dev/null 2>&1 && print_status "Backend OK" || print_error "Backend failed"
        
        echo ""
        print_status "Auto-fix completed!"
        print_info "You can now access the application at:"
        echo "- http://$SERVER_IP:8000 (recommended)"
        echo "- http://$SERVER_IP:8080 (frontend only)"
        ;;
    7)
        echo ""
        print_info "Exiting..."
        exit 0
        ;;
    *)
        print_error "Invalid option. Please choose 1-7."
        ;;
esac

echo ""
print_info "Script completed. Run again to perform more actions."