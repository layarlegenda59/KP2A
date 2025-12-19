#!/bin/bash

# SIDARSIH Cloudflare Tunnel Startup Script
# Advanced PM2 Management with Duplicate Prevention
# Version: 2.0
# Author: SIDARSIH Development Team

set -e

# ========================================
# CONFIGURATION
# ========================================
PROJECT_DIR="/home/dell/KP2A-CIMAHI/KP2A"
SCRIPTS_DIR="$PROJECT_DIR/scripts"
LOGS_DIR="$PROJECT_DIR/logs"
PIDS_DIR="$PROJECT_DIR/pids"
ENV_FILE="$PROJECT_DIR/.env.tunnel"
# Use CommonJS ecosystem to avoid ESM loading errors in PM2
ECOSYSTEM_CONFIG="$PROJECT_DIR/ecosystem-tunnel.config.cjs"

# PM2 Application Names
TUNNEL_APP="sidarsih-cloudflare-tunnel"
MONITOR_APP="sidarsih-tunnel-monitor"
METRICS_APP="sidarsih-tunnel-metrics"

# Lock file to prevent multiple instances
LOCK_FILE="$PIDS_DIR/tunnel-startup.lock"
PID_FILE="$PIDS_DIR/tunnel-startup.pid"

# ========================================
# COLORS AND LOGGING
# ========================================
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# Logging functions
log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOGS_DIR/startup.log"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOGS_DIR/startup.log"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOGS_DIR/startup.log"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOGS_DIR/startup.log" >&2
}

info() {
    echo -e "${PURPLE}[INFO]${NC} $1" | tee -a "$LOGS_DIR/startup.log"
}

debug() {
    if [ "$DEBUG" = "true" ]; then
        echo -e "${CYAN}[DEBUG]${NC} $1" | tee -a "$LOGS_DIR/startup.log"
    fi
}

# ========================================
# UTILITY FUNCTIONS
# ========================================

# Check if script is already running
check_lock() {
    if [ -f "$LOCK_FILE" ]; then
        local lock_pid=$(cat "$LOCK_FILE" 2>/dev/null || echo "")
        if [ -n "$lock_pid" ] && kill -0 "$lock_pid" 2>/dev/null; then
            error "Startup script is already running (PID: $lock_pid)"
            error "If you're sure no other instance is running, remove: $LOCK_FILE"
            exit 1
        else
            warning "Stale lock file found, removing..."
            rm -f "$LOCK_FILE"
        fi
    fi
}

# Create lock file
create_lock() {
    echo $$ > "$LOCK_FILE"
    echo $$ > "$PID_FILE"
    debug "Lock file created: $LOCK_FILE (PID: $$)"
}

# Remove lock file
remove_lock() {
    rm -f "$LOCK_FILE" "$PID_FILE"
    debug "Lock file removed"
}

# Cleanup function
cleanup() {
    local exit_code=$?
    log "Cleaning up..."
    remove_lock
    exit $exit_code
}

# Set trap for cleanup
trap cleanup EXIT INT TERM

# Check if running as correct user
check_user() {
    if [ "$USER" != "dell" ]; then
        error "This script must be run as user 'dell'"
        exit 1
    fi
    debug "Running as correct user: $USER"
}

# Load environment variables
load_environment() {
    if [ -f "$ENV_FILE" ]; then
        source "$ENV_FILE"
        success "Environment variables loaded from $ENV_FILE"
    else
        warning "Environment file not found: $ENV_FILE"
        warning "Using default values"
    fi
    # Force Go DNS resolver to avoid SRV compression issues
    export GODEBUG=netdns=go
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check if PM2 is installed
    if ! command -v pm2 &> /dev/null; then
        error "PM2 is not installed. Please install PM2 first:"
        error "npm install -g pm2"
        exit 1
    fi
    
    # Check if cloudflared is installed (PATH or local)
    if ! command -v cloudflared &> /dev/null; then
        if [ -x "$PROJECT_DIR/cloudflared" ]; then
            success "Using local cloudflared binary at $PROJECT_DIR/cloudflared"
        else
            error "Cloudflared is not installed. Please install cloudflared or place binary at $PROJECT_DIR/cloudflared."
            exit 1
        fi
    fi
    
    # Check if ecosystem config exists
    if [ ! -f "$ECOSYSTEM_CONFIG" ]; then
        error "Ecosystem config not found: $ECOSYSTEM_CONFIG"
        exit 1
    fi
    
    # Check if tunnel config exists
    local tunnel_config="$PROJECT_DIR/cloudflared-config-proxmox.yml"
    if [ ! -f "$tunnel_config" ]; then
        error "Tunnel config not found: $tunnel_config"
        exit 1
    fi
    
    # Check if credentials file exists
    local credentials_file="/home/dell/.cloudflared/e4cee886-4f46-4676-a344-7ea2cb86e4eb.json"
    if [ ! -f "$credentials_file" ]; then
        error "Credentials file not found: $credentials_file"
        error "Please ensure Cloudflare tunnel is properly authenticated"
        exit 1
    fi
    
    success "All prerequisites satisfied"
}

# Check for duplicate PM2 processes
check_duplicates() {
    log "Checking for duplicate processes..."
    
    local apps=("$TUNNEL_APP" "$MONITOR_APP" "$METRICS_APP")
    local duplicates_found=false
    
    for app in "${apps[@]}"; do
        local running_count=$(pm2 list | grep -c "$app" || echo "0")
        if [ "$running_count" -gt 0 ]; then
            warning "Found existing PM2 process: $app"
            duplicates_found=true
        fi
    done
    
    if [ "$duplicates_found" = true ]; then
        warning "Duplicate processes detected. Stopping existing processes..."
        stop_existing_processes
    else
        success "No duplicate processes found"
    fi
}

# Stop existing processes
stop_existing_processes() {
    log "Stopping existing tunnel processes..."
    
    local apps=("$TUNNEL_APP" "$MONITOR_APP" "$METRICS_APP")
    
    for app in "${apps[@]}"; do
        if pm2 list | grep -q "$app"; then
            info "Stopping $app..."
            pm2 stop "$app" 2>/dev/null || true
            pm2 delete "$app" 2>/dev/null || true
            success "Stopped $app"
        fi
    done
    
    # Wait for processes to fully stop
    sleep 3
    
    success "All existing processes stopped"
}

# Validate tunnel configuration
validate_config() {
    log "Validating tunnel configuration..."
    
    local config_file="$PROJECT_DIR/cloudflared-config-proxmox.yml"
    
    # Basic YAML syntax check
    if command -v python3 &> /dev/null; then
        python3 -c "
import yaml
import sys
try:
    with open('$config_file', 'r') as f:
        yaml.safe_load(f)
    print('YAML syntax is valid')
except Exception as e:
    print(f'YAML syntax error: {e}')
    sys.exit(1)
" || {
            error "Invalid YAML syntax in configuration file"
            exit 1
        }
    fi
    
    # Check required fields
    if ! grep -q "tunnel:" "$config_file"; then
        error "Missing tunnel ID in configuration"
        exit 1
    fi
    
    if ! grep -q "credentials-file:" "$config_file"; then
        error "Missing credentials file in configuration"
        exit 1
    fi
    
    if ! grep -q "ingress:" "$config_file"; then
        error "Missing ingress rules in configuration"
        exit 1
    fi
    
    success "Tunnel configuration validated"
}

# DNS and SRV checks for Cloudflare edge discovery
dns_srv_checks() {
    log "Running DNS/SRV checks for Cloudflare edge discovery..."
    local resolver="1.1.1.1"
    if command -v dig &> /dev/null; then
        info "dig srv _auto-v2-origintunneld._tcp.argotunnel.com @${resolver}"
        dig srv _auto-v2-origintunneld._tcp.argotunnel.com @"${resolver}" +time=3 +tries=1 || true
        info "dig srv _origintunneld._tcp.argotunnel.com @${resolver}"
        dig srv _origintunneld._tcp.argotunnel.com @"${resolver}" +time=3 +tries=1 || true
    else
        warning "dig not available; skipping SRV tests"
    fi
}

# Start tunnel services
start_tunnel_services() {
    log "Starting tunnel services..."
    
    # Change to project directory
    cd "$PROJECT_DIR"
    
    # Start PM2 ecosystem
    info "Starting PM2 ecosystem..."
    pm2 start "$ECOSYSTEM_CONFIG" --env production
    
    # Wait for services to initialize
    sleep 5
    
    # Check if services started successfully
    local apps=("$TUNNEL_APP" "$MONITOR_APP" "$METRICS_APP")
    local all_started=true
    
    for app in "${apps[@]}"; do
        if pm2 list | grep -q "$app.*online"; then
            success "$app started successfully"
        else
            error "$app failed to start"
            all_started=false
        fi
    done
    
    if [ "$all_started" = true ]; then
        success "All tunnel services started successfully"
    else
        error "Some services failed to start. Check logs for details."
        return 1
    fi
}

# Monitor startup process
monitor_startup() {
    log "Monitoring startup process..."
    
    local max_attempts=30
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        attempt=$((attempt + 1))
        
        # Check tunnel status
        if curl -s --connect-timeout 3 "http://localhost:8081/metrics" >/dev/null 2>&1; then
            success "Tunnel is responding to health checks"
            break
        fi
        
        if [ $attempt -eq $max_attempts ]; then
            error "Tunnel failed to respond after $max_attempts attempts"
            return 1
        fi
        
        sleep 2
    done
}

# Show logs
show_logs() {
    log "Showing PM2 logs (last 50 lines each)..."
    pm2 logs --lines 50 --raw 2>/dev/null || true
}

# Main execution flow
main() {
    check_lock
    create_lock
    check_user
    load_environment
    check_prerequisites
    validate_config
    dns_srv_checks
    check_duplicates
    start_tunnel_services
    monitor_startup
    show_logs
    success "Tunnel startup sequence completed"
}

main "$@"