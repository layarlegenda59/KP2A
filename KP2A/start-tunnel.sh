#!/bin/bash

# SIDARSIH Cloudflare Tunnel Startup Script
# This script starts the Cloudflare tunnel for sidarsih.site

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TUNNEL_NAME="sidarsih"
TUNNEL_ID="e4cee886-4f46-4676-a344-7ea2cb86e4eb"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check if cloudflared exists
if [ ! -f "$SCRIPT_DIR/cloudflared" ]; then
    log_error "cloudflared binary not found in $SCRIPT_DIR"
    exit 1
fi

# Skip global config file check; using local proxmox config
# Previously required: $HOME/.cloudflared/config.yml
# We now rely on $SCRIPT_DIR/cloudflared-config-proxmox.yml


# Check if tunnel credentials exist
if [ ! -f "$HOME/.cloudflared/$TUNNEL_ID.json" ]; then
    log_error "Tunnel credentials not found at $HOME/.cloudflared/$TUNNEL_ID.json"
    exit 1
fi

# Function to start tunnel
start_tunnel() {
    log_info "Starting Cloudflare tunnel: $TUNNEL_NAME"
    log_info "Tunnel ID: $TUNNEL_ID"

    # Ensure local config exists (use proxmox config)
    LOCAL_CONFIG="$SCRIPT_DIR/cloudflared-config-proxmox.yml"
    if [ ! -f "$LOCAL_CONFIG" ]; then
        log_error "Local tunnel config not found at $LOCAL_CONFIG"
        log_error "Expected Cloudflare Proxmox config with ingress for required hostnames"
        exit 1
    fi
    
    # Check if tunnel is already running
    if pgrep -f "cloudflared.*tunnel.*run.*$TUNNEL_NAME" > /dev/null; then
        log_warning "Tunnel is already running!"
        return 0
    fi
    
    # Force Go DNS resolver to avoid SRV compression issues from systemd-resolved
    export GODEBUG=netdns=go

    # Start tunnel in background using local config
    nohup "$SCRIPT_DIR/cloudflared" tunnel --config "$LOCAL_CONFIG" run "$TUNNEL_NAME" > "$SCRIPT_DIR/tunnel.log" 2>&1 &
    TUNNEL_PID=$!
    
    # Wait a moment and check if it started successfully
    sleep 3
    
    if kill -0 "$TUNNEL_PID" 2>/dev/null; then
        log_success "Tunnel started successfully with PID: $TUNNEL_PID"
        echo "$TUNNEL_PID" > "$SCRIPT_DIR/tunnel.pid"
        
        # Show tunnel info
        log_info "Tunnel configuration:"
        echo "  - Frontend (/) -> http://localhost:8080"
        echo "  - API (/api/*) -> http://localhost:3001"
        echo "  - WhatsApp (/whatsapp/*) -> http://localhost:3001"
        echo "  - Socket.IO (/socket.io/*) -> http://localhost:3001"
        echo ""
        log_info "Tunnel log: $SCRIPT_DIR/tunnel.log"
        log_info "Tunnel PID file: $SCRIPT_DIR/tunnel.pid"
        
        return 0
    else
        log_error "Failed to start tunnel"
        return 1
    fi
}

# Function to stop tunnel
stop_tunnel() {
    log_info "Stopping Cloudflare tunnel..."
    
    # Kill by PID file
    if [ -f "$SCRIPT_DIR/tunnel.pid" ]; then
        PID=$(cat "$SCRIPT_DIR/tunnel.pid")
        if kill -0 "$PID" 2>/dev/null; then
            kill "$PID"
            log_success "Tunnel stopped (PID: $PID)"
        fi
        rm -f "$SCRIPT_DIR/tunnel.pid"
    fi
    
    # Kill any remaining cloudflared processes
    pkill -f "cloudflared.*tunnel.*run.*$TUNNEL_NAME" 2>/dev/null
    
    log_success "Tunnel stopped"
}

# Function to check tunnel status
status_tunnel() {
    log_info "Checking tunnel status..."
    
    # Check if process is running
    if pgrep -f "cloudflared.*tunnel.*run.*$TUNNEL_NAME" > /dev/null; then
        PID=$(pgrep -f "cloudflared.*tunnel.*run.*$TUNNEL_NAME")
        log_success "Tunnel is running (PID: $PID)"
        
        # Show tunnel info
        "$SCRIPT_DIR/cloudflared" tunnel info "$TUNNEL_NAME" 2>/dev/null || true
        
        return 0
    else
        log_warning "Tunnel is not running"
        return 1
    fi
}

# Function to show logs
show_logs() {
    if [ -f "$SCRIPT_DIR/tunnel.log" ]; then
        log_info "Showing tunnel logs (last 50 lines):"
        tail -n 50 "$SCRIPT_DIR/tunnel.log"
    else
        log_warning "No log file found"
    fi
}

# Function to test tunnel
test_tunnel() {
    log_info "Testing tunnel connectivity..."
    
    # Test local services first
    log_info "Testing local services:"
    
    echo -n "  Frontend (localhost:8080): "
    if curl -s -I http://localhost:8080 | grep -q "200 OK"; then
        echo -e "${GREEN}✅ OK${NC}"
    else
        echo -e "${RED}❌ FAILED${NC}"
    fi
    
    echo -n "  Backend (localhost:3001): "
    if curl -s -I http://localhost:3001 | grep -q "HTTP"; then
        echo -e "${GREEN}✅ OK${NC}"
    else
        echo -e "${RED}❌ FAILED${NC}"
    fi
    
    # Test external access
    log_info "Testing external access:"
    echo -n "  sidarsih.site: "
    if curl -s -I https://sidarsih.site --connect-timeout 10 | grep -q "HTTP"; then
        echo -e "${GREEN}✅ OK${NC}"
    else
        echo -e "${RED}❌ FAILED (Check DNS configuration)${NC}"
    fi
}

# Main menu
case "${1:-menu}" in
    "start")
        start_tunnel
        ;;
    "stop")
        stop_tunnel
        ;;
    "restart")
        stop_tunnel
        sleep 2
        start_tunnel
        ;;
    "status")
        status_tunnel
        ;;
    "logs")
        show_logs
        ;;
    "test")
        test_tunnel
        ;;
    "menu"|*)
        echo ""
        echo "🌐 SIDARSIH Cloudflare Tunnel Manager"
        echo "===================================="
        echo ""
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  start    - Start the tunnel"
        echo "  stop     - Stop the tunnel"
        echo "  restart  - Restart the tunnel"
        echo "  status   - Check tunnel status"
        echo "  logs     - Show tunnel logs"
        echo "  test     - Test tunnel connectivity"
        echo ""
        echo "Current Status:"
        status_tunnel
        ;;
esac