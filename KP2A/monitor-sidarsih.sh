#!/bin/bash

# SIDARSIH Monitoring and Auto-Recovery Script
# Monitors all services and automatically recovers from failures

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="$SCRIPT_DIR/monitor.log"
PID_FILE="$SCRIPT_DIR/monitor.pid"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
FRONTEND_PORT=8080
PROXY_PORT=8000
BACKEND_PORT=3001
CHECK_INTERVAL=30
MAX_RETRIES=3

# Logging function
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

# Check if service is running
check_service() {
    local service_name="$1"
    local port="$2"
    
    # Check PM2 process
    if pm2 list | grep -q "$service_name.*online"; then
        # Check if port is responding
        if timeout 5 curl -s http://localhost:$port >/dev/null 2>&1; then
            return 0
        else
            log_warning "$service_name is running but port $port is not responding"
            return 1
        fi
    else
        log_error "$service_name is not running in PM2"
        return 1
    fi
}

# Restart service
restart_service() {
    local service_name="$1"
    local command="$2"
    
    log_info "Restarting $service_name..."
    
    # Stop the service
    pm2 stop "$service_name" 2>/dev/null || true
    sleep 2
    
    # Start the service
    if [[ "$service_name" == "whatsapp-backend" ]]; then
        cd "$SCRIPT_DIR/whatsapp-backend"
        pm2 start "$command" --name "$service_name" 2>/dev/null || pm2 restart "$service_name"
        cd "$SCRIPT_DIR"
    else
        pm2 start "$command" --name "$service_name" 2>/dev/null || pm2 restart "$service_name"
    fi
    
    sleep 5
    
    # Verify restart
    if pm2 list | grep -q "$service_name.*online"; then
        log_success "$service_name restarted successfully"
        return 0
    else
        log_error "Failed to restart $service_name"
        return 1
    fi
}

# Check and recover services
check_and_recover() {
    local recovery_needed=false
    
    log_info "Starting health check..."
    
    # Check Backend
    if ! check_service "whatsapp-backend" "$BACKEND_PORT"; then
        log_warning "Backend service needs recovery"
        if restart_service "whatsapp-backend" "npm run dev"; then
            recovery_needed=true
        fi
    else
        log_success "Backend service is healthy"
    fi
    
    # Check Frontend
    if ! check_service "whatsapp-frontend-port80" "$FRONTEND_PORT"; then
        log_warning "Frontend service needs recovery"
        if restart_service "whatsapp-frontend-port80" "npm run dev -- --port $FRONTEND_PORT --host 0.0.0.0"; then
            recovery_needed=true
        fi
    else
        log_success "Frontend service is healthy"
    fi
    
    # Check Proxy
    if ! check_service "sidarsih-proxy" "$PROXY_PORT"; then
        log_warning "Proxy service needs recovery"
        if restart_service "sidarsih-proxy" "proxy-server.cjs"; then
            recovery_needed=true
        fi
    else
        log_success "Proxy service is healthy"
    fi
    
    # Overall health check
    if timeout 5 curl -s http://localhost:$PROXY_PORT >/dev/null 2>&1; then
        log_success "Application is accessible via proxy (port $PROXY_PORT)"
    else
        log_error "Application is not accessible via proxy"
        recovery_needed=true
    fi
    
    if $recovery_needed; then
        log_info "Recovery actions completed"
        # Send notification (if configured)
        send_notification "SIDARSIH services recovered"
    fi
}

# Send notification (placeholder for future implementation)
send_notification() {
    local message="$1"
    log_info "Notification: $message"
    # TODO: Implement email/webhook notifications
}

# Generate status report
generate_status_report() {
    local report_file="$SCRIPT_DIR/status-report.html"
    
    cat > "$report_file" << EOF
<!DOCTYPE html>
<html>
<head>
    <title>SIDARSIH Status Report</title>
    <meta charset="UTF-8">
    <meta http-equiv="refresh" content="30">
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .header { text-align: center; color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px; margin-bottom: 20px; }
        .status-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-bottom: 20px; }
        .status-card { background: #f8f9fa; padding: 15px; border-radius: 6px; border-left: 4px solid #007bff; }
        .status-online { border-left-color: #28a745; }
        .status-offline { border-left-color: #dc3545; }
        .status-warning { border-left-color: #ffc107; }
        .metric { display: flex; justify-content: space-between; margin: 5px 0; }
        .timestamp { text-align: center; color: #666; font-size: 0.9em; margin-top: 20px; }
        .logs { background: #f8f9fa; padding: 15px; border-radius: 6px; margin-top: 20px; }
        .logs pre { max-height: 300px; overflow-y: auto; font-size: 0.8em; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🖥️ SIDARSIH System Status</h1>
            <p>Real-time monitoring dashboard</p>
        </div>
        
        <div class="status-grid">
EOF

    # Check each service and add to report
    for service in "whatsapp-backend:$BACKEND_PORT" "whatsapp-frontend-port80:$FRONTEND_PORT" "sidarsih-proxy:$PROXY_PORT"; do
        IFS=':' read -r name port <<< "$service"
        
        if check_service "$name" "$port"; then
            status_class="status-online"
            status_text="Online"
            status_icon="✅"
        else
            status_class="status-offline"
            status_text="Offline"
            status_icon="❌"
        fi
        
        cat >> "$report_file" << EOF
            <div class="status-card $status_class">
                <h3>$status_icon $name</h3>
                <div class="metric"><span>Status:</span><span>$status_text</span></div>
                <div class="metric"><span>Port:</span><span>$port</span></div>
                <div class="metric"><span>URL:</span><span>http://localhost:$port</span></div>
            </div>
EOF
    done
    
    cat >> "$report_file" << EOF
        </div>
        
        <div class="logs">
            <h3>📋 Recent Logs</h3>
            <pre>$(tail -20 "$LOG_FILE" 2>/dev/null || echo "No logs available")</pre>
        </div>
        
        <div class="timestamp">
            Last updated: $(date '+%Y-%m-%d %H:%M:%S')
        </div>
    </div>
</body>
</html>
EOF

    log_info "Status report generated: $report_file"
}

# Cleanup function
cleanup() {
    log_info "Monitoring stopped"
    rm -f "$PID_FILE"
    exit 0
}

# Signal handlers
trap cleanup SIGTERM SIGINT

# Main monitoring loop
start_monitoring() {
    echo $$ > "$PID_FILE"
    log_info "Starting SIDARSIH monitoring (PID: $$)"
    log_info "Check interval: ${CHECK_INTERVAL}s"
    log_info "Log file: $LOG_FILE"
    
    while true; do
        check_and_recover
        generate_status_report
        
        log_info "Next check in ${CHECK_INTERVAL} seconds..."
        sleep "$CHECK_INTERVAL"
    done
}

# Command line interface
case "${1:-start}" in
    start)
        if [[ -f "$PID_FILE" ]] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
            echo "Monitoring is already running (PID: $(cat "$PID_FILE"))"
            exit 1
        fi
        start_monitoring
        ;;
    stop)
        if [[ -f "$PID_FILE" ]]; then
            local pid=$(cat "$PID_FILE")
            if kill -0 "$pid" 2>/dev/null; then
                kill "$pid"
                log_info "Monitoring stopped (PID: $pid)"
            else
                log_warning "Monitoring process not found"
            fi
            rm -f "$PID_FILE"
        else
            echo "Monitoring is not running"
        fi
        ;;
    status)
        if [[ -f "$PID_FILE" ]] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
            echo "Monitoring is running (PID: $(cat "$PID_FILE"))"
            echo "Log file: $LOG_FILE"
            echo "Status report: $SCRIPT_DIR/status-report.html"
        else
            echo "Monitoring is not running"
        fi
        ;;
    check)
        check_and_recover
        ;;
    report)
        generate_status_report
        echo "Status report generated: $SCRIPT_DIR/status-report.html"
        ;;
    logs)
        tail -f "$LOG_FILE"
        ;;
    *)
        echo "Usage: $0 {start|stop|status|check|report|logs}"
        echo ""
        echo "Commands:"
        echo "  start   - Start monitoring daemon"
        echo "  stop    - Stop monitoring daemon"
        echo "  status  - Show monitoring status"
        echo "  check   - Run single health check"
        echo "  report  - Generate status report"
        echo "  logs    - Show live logs"
        exit 1
        ;;
esac