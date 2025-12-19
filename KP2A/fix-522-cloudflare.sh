#!/bin/bash

# SIDARSIH 522 Error Fix Script
# Comprehensive solution for Cloudflare 522 connection timeout

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="$SCRIPT_DIR/cloudflare-fix.log"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$LOG_FILE"
}

# Check current status
check_status() {
    log_info "=== SIDARSIH 522 ERROR DIAGNOSIS ==="
    
    # Check PM2 services
    echo ""
    log_info "1. PM2 Services Status:"
    pm2 list | grep -E "(whatsapp-backend|whatsapp-frontend-port80|sidarsih-proxy)"
    
    # Check listening ports
    echo ""
    log_info "2. Listening Ports:"
    ss -tlnp | grep -E ':(3001|8080|8000|80)'
    
    # Check local connectivity
    echo ""
    log_info "3. Local Connectivity Test:"
    if timeout 5 curl -s http://localhost:8000 >/dev/null 2>&1; then
        log_success "✅ Port 8000 accessible locally"
    else
        log_error "❌ Port 8000 NOT accessible locally"
    fi
    
    # Check external connectivity
    echo ""
    log_info "4. External Connectivity Test:"
    if timeout 5 curl -s http://103.139.10.210:8000 >/dev/null 2>&1; then
        log_success "✅ Port 8000 accessible externally"
    else
        log_error "❌ Port 8000 NOT accessible externally (FIREWALL BLOCKED)"
    fi
    
    # Check server IP
    echo ""
    log_info "5. Server IP Verification:"
    SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || echo "Unable to detect")
    echo "Current IP: $SERVER_IP"
    
    # DNS Check
    echo ""
    log_info "6. DNS Resolution:"
    nslookup sidarsih.site 2>/dev/null | grep -A2 "Non-authoritative answer:" || echo "DNS lookup failed"
}

# Test external connectivity
test_external_connectivity() {
    log_info "=== EXTERNAL CONNECTIVITY TEST ==="
    
    echo ""
    log_info "Testing various ports..."
    
    for port in 80 8000 8080 3000 5000; do
        echo -n "Port $port: "
        if timeout 3 curl -s http://103.139.10.210:$port >/dev/null 2>&1; then
            echo -e "${GREEN}✅ ACCESSIBLE${NC}"
        else
            echo -e "${RED}❌ BLOCKED${NC}"
        fi
    done
}

# Show Cloudflare solutions
show_cloudflare_solutions() {
    echo ""
    echo "🔧 CLOUDFLARE 522 ERROR - SOLUTIONS"
    echo "=================================="
    echo ""
    echo "🚨 PROBLEM IDENTIFIED:"
    echo "   Server firewall blocks external access to all ports"
    echo "   Local services work fine, but Cloudflare cannot connect"
    echo ""
    echo "🎯 IMMEDIATE SOLUTIONS:"
    echo ""
    echo "1. 🌐 UPDATE CLOUDFLARE ORIGIN RULES (RECOMMENDED)"
    echo "   - Login to Cloudflare Dashboard"
    echo "   - Go to Rules → Origin Rules"
    echo "   - Create rule: Override origin port to 8080"
    echo "   - This bypasses the proxy and connects directly to frontend"
    echo ""
    echo "2. 🚇 USE CLOUDFLARE TUNNEL (BEST LONG-TERM)"
    echo "   - Install: curl -L cloudflared.deb && sudo dpkg -i cloudflared.deb"
    echo "   - Setup tunnel to bypass ALL firewall issues"
    echo "   - Run: cloudflared tunnel create sidarsih"
    echo ""
    echo "3. 📞 CONTACT VPS PROVIDER"
    echo "   - Request firewall configuration for ports 80, 443, 8000"
    echo "   - This is the root cause that needs fixing"
    echo ""
    echo "4. 🔄 TEMPORARY WORKAROUND"
    echo "   - Change Cloudflare DNS to 'DNS Only' (gray cloud)"
    echo "   - This disables proxy but allows direct access"
    echo ""
}

# Create comprehensive fix guide
create_fix_guide() {
    cat > "$SCRIPT_DIR/CLOUDFLARE_522_COMPLETE_FIX.md" << 'EOF'
# 🔧 SIDARSIH 522 Error - Complete Fix Guide

## 🚨 ROOT CAUSE IDENTIFIED
**Problem**: VPS firewall/network policy blocks external access to ALL ports
**Evidence**: 
- ✅ All services running locally (3001, 8080, 8000)
- ❌ External access blocked to ports 80, 8000, 8080
- ❌ Cloudflare cannot connect to origin server

## 🎯 SOLUTION 1: Cloudflare Origin Rules (FASTEST)

### Step-by-Step Instructions:
1. **Login to Cloudflare Dashboard**
   ```
   https://dash.cloudflare.com
   ```

2. **Select Domain**
   - Click on `sidarsih.site`

3. **Create Origin Rule**
   - Navigate: **Rules** → **Origin Rules**
   - Click **"Create rule"**
   
4. **Configure Rule**
   ```
   Rule name: SIDARSIH Port Override
   
   When incoming requests match:
   - Field: Hostname
   - Operator: equals  
   - Value: sidarsih.site
   
   Then:
   - Override origin port: 8080
   ```

5. **Deploy Rule**
   - Click **"Deploy"**
   - Wait 1-2 minutes for propagation

### ✅ Expected Result:
- Cloudflare will connect directly to port 8080 (frontend)
- Bypasses the blocked port 8000 proxy
- sidarsih.site should work immediately

## 🎯 SOLUTION 2: Cloudflare Tunnel (BEST LONG-TERM)

### Installation:
```bash
# Download cloudflared
curl -L --output cloudflared.deb \
  https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb

# Install (requires sudo)
sudo dpkg -i cloudflared.deb
```

### Setup:
```bash
# Authenticate
cloudflared tunnel login

# Create tunnel
cloudflared tunnel create sidarsih

# Configure tunnel
mkdir -p ~/.cloudflared
cat > ~/.cloudflared/config.yml << EOL
tunnel: sidarsih
credentials-file: ~/.cloudflared/[TUNNEL-ID].json

ingress:
  - hostname: sidarsih.site
    service: http://localhost:8080
  - service: http_status:404
EOL

# Run tunnel
cloudflared tunnel run sidarsih
```

### ✅ Benefits:
- Bypasses ALL firewall restrictions
- Secure encrypted connection
- No need for open ports
- Works with any VPS provider

## 🎯 SOLUTION 3: VPS Firewall Configuration

### Contact VPS Provider:
Request to open these ports:
- **Port 80** (HTTP)
- **Port 443** (HTTPS) 
- **Port 8000** (Custom application)

### Common VPS Providers:
- **DigitalOcean**: Networking → Firewalls
- **AWS**: Security Groups
- **Google Cloud**: VPC Firewall Rules
- **Vultr**: Firewall settings

## 🎯 SOLUTION 4: Temporary DNS-Only Mode

### Quick Workaround:
1. Go to Cloudflare DNS settings
2. Click the orange cloud next to `sidarsih.site` A record
3. Change to gray cloud (DNS Only)
4. Wait 5 minutes for propagation

### ⚠️ Limitations:
- No Cloudflare protection/caching
- Direct server access (less secure)
- No SSL from Cloudflare

## 🔍 CURRENT SERVER STATUS

### Services Running:
```
✅ whatsapp-backend (port 3001)
✅ whatsapp-frontend-port80 (port 8080)  
✅ sidarsih-proxy (port 8000)
```

### Network Status:
```
✅ Local access: http://localhost:8080
❌ External access: BLOCKED by firewall
🌐 Server IP: 103.139.10.210
```

## 🚀 RECOMMENDED ACTION PLAN

### Immediate (5 minutes):
1. **Try Solution 1** (Origin Rules) - Fastest fix
2. Test: Visit http://sidarsih.site

### Short-term (30 minutes):
1. **Implement Solution 2** (Cloudflare Tunnel)
2. More reliable long-term solution

### Long-term (Contact provider):
1. **Request firewall configuration**
2. Enable proper port access

## 📞 SUPPORT CONTACTS

### VPS Provider:
- Check your hosting provider's firewall settings
- Request ports 80, 443, 8000 to be opened

### Cloudflare Support:
- For tunnel setup assistance
- Origin rule configuration help

---
**Status**: Server ready, waiting for Cloudflare configuration
**Next Step**: Update Cloudflare Origin Rules to use port 8080
**ETA**: 5 minutes after Cloudflare configuration
EOF

    log_success "Complete fix guide created: CLOUDFLARE_522_COMPLETE_FIX.md"
}

# Main menu
show_menu() {
    echo ""
    echo "🔧 SIDARSIH 522 Error Fix Menu"
    echo "================================"
    echo "1. Check current status"
    echo "2. Show Cloudflare solutions"
    echo "3. Test external connectivity"
    echo "4. Create complete fix guide"
    echo "5. Run monitoring check"
    echo "6. Show tunnel setup commands"
    echo "7. Exit"
    echo ""
    read -p "Select option (1-7): " choice
    
    case $choice in
        1) check_status ;;
        2) show_cloudflare_solutions ;;
        3) test_external_connectivity ;;
        4) create_fix_guide ;;
        5) ./monitor-sidarsih.sh check ;;
        6) show_tunnel_commands ;;
        7) exit 0 ;;
        *) echo "Invalid option"; show_menu ;;
    esac
}

# Show tunnel setup commands
show_tunnel_commands() {
    echo ""
    echo "🌐 CLOUDFLARE TUNNEL SETUP COMMANDS"
    echo "=================================="
    echo ""
    echo "# 1. Download and install cloudflared"
    echo "curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb"
    echo "sudo dpkg -i cloudflared.deb"
    echo ""
    echo "# 2. Authenticate with Cloudflare"
    echo "cloudflared tunnel login"
    echo ""
    echo "# 3. Create tunnel"
    echo "cloudflared tunnel create sidarsih"
    echo ""
    echo "# 4. Configure tunnel (edit the config file with your tunnel ID)"
    echo "mkdir -p ~/.cloudflared"
    echo "# Edit ~/.cloudflared/config.yml with tunnel configuration"
    echo ""
    echo "# 5. Run tunnel"
    echo "cloudflared tunnel run sidarsih"
    echo ""
    echo "✅ This will completely bypass firewall issues!"
}

# Auto-run if no arguments
if [ $# -eq 0 ]; then
    show_menu
else
    case "$1" in
        "check") check_status ;;
        "solutions") show_cloudflare_solutions ;;
        "guide") create_fix_guide ;;
        "test") test_external_connectivity ;;
        "tunnel") show_tunnel_commands ;;
        *) echo "Usage: $0 [check|solutions|guide|test|tunnel]"; exit 1 ;;
    esac
fi