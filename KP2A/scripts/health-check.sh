#!/bin/bash

# Health Check Script for sidarsih.site Production Environment
# This script monitors the health of all services and components

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_DIR="/home/dell/KP2A-CIMAHI/KP2A"
BACKEND_DIR="$PROJECT_DIR/whatsapp-backend"
DOMAIN="sidarsih.site"
BACKEND_URL="http://localhost:3001"
FRONTEND_URL="https://$DOMAIN"
LOG_FILE="/home/dell/KP2A-CIMAHI/KP2A/logs/health-check.log"
ALERT_EMAIL=""  # Set email for alerts
SLACK_WEBHOOK=""  # Set Slack webhook for alerts

# Health check results
HEALTH_STATUS=0
HEALTH_REPORT=""

# Function to print colored output
print_status() {
    echo -e "${GREEN}[OK]${NC} $1"
    log_message "OK: $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
    log_message "WARNING: $1"
    HEALTH_STATUS=1
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
    log_message "ERROR: $1"
    HEALTH_STATUS=2
}

print_header() {
    echo -e "${BLUE}=== $1 ===${NC}"
    log_message "=== $1 ==="
}

# Function to log messages
log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> "$LOG_FILE"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check HTTP endpoint
check_http_endpoint() {
    local url="$1"
    local expected_status="${2:-200}"
    local timeout="${3:-10}"
    
    local response=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$timeout" "$url" 2>/dev/null || echo "000")
    
    if [ "$response" = "$expected_status" ]; then
        return 0
    else
        return 1
    fi
}

# Function to check service response time
check_response_time() {
    local url="$1"
    local max_time="${2:-2}"
    
    local response_time=$(curl -s -o /dev/null -w "%{time_total}" --max-time 10 "$url" 2>/dev/null || echo "999")
    
    if (( $(echo "$response_time < $max_time" | bc -l) )); then
        return 0
    else
        return 1
    fi
}

# Function to check disk space
check_disk_space() {
    print_header "Disk Space Check"
    
    local usage=$(df "$PROJECT_DIR" | awk 'NR==2 {print $5}' | sed 's/%//')
    
    if [ "$usage" -lt 80 ]; then
        print_status "Disk usage: ${usage}% (OK)"
    elif [ "$usage" -lt 90 ]; then
        print_warning "Disk usage: ${usage}% (High)"
    else
        print_error "Disk usage: ${usage}% (Critical)"
    fi
    
    # Check log directory
    if [ -d "$PROJECT_DIR/logs" ]; then
        local log_size=$(du -sh "$PROJECT_DIR/logs" | cut -f1)
        print_status "Log directory size: $log_size"
    fi
}

# Function to check memory usage
check_memory() {
    print_header "Memory Check"
    
    local mem_info=$(free | grep Mem)
    local total=$(echo $mem_info | awk '{print $2}')
    local used=$(echo $mem_info | awk '{print $3}')
    local usage=$(( used * 100 / total ))
    
    if [ "$usage" -lt 80 ]; then
        print_status "Memory usage: ${usage}% (OK)"
    elif [ "$usage" -lt 90 ]; then
        print_warning "Memory usage: ${usage}% (High)"
    else
        print_error "Memory usage: ${usage}% (Critical)"
    fi
}

# Function to check PM2 processes
check_pm2() {
    print_header "PM2 Process Check"
    
    if ! command_exists pm2; then
        print_error "PM2 is not installed"
        return
    fi
    
    # Check if PM2 daemon is running
    if ! pm2 ping > /dev/null 2>&1; then
        print_error "PM2 daemon is not running"
        return
    fi
    
    # Get PM2 status
    local pm2_status=$(pm2 jlist 2>/dev/null)
    
    if [ "$?" -ne 0 ]; then
        print_error "Could not get PM2 status"
        return
    fi
    
    # Check each process
    local processes=$(echo "$pm2_status" | jq -r '.[].name' 2>/dev/null || echo "")
    
    if [ -z "$processes" ]; then
        print_warning "No PM2 processes found"
        return
    fi
    
    echo "$processes" | while read -r process; do
        if [ -n "$process" ]; then
            local status=$(echo "$pm2_status" | jq -r ".[] | select(.name==\"$process\") | .pm2_env.status" 2>/dev/null)
            local cpu=$(echo "$pm2_status" | jq -r ".[] | select(.name==\"$process\") | .monit.cpu" 2>/dev/null)
            local memory=$(echo "$pm2_status" | jq -r ".[] | select(.name==\"$process\") | .monit.memory" 2>/dev/null)
            
            if [ "$status" = "online" ]; then
                print_status "Process $process: $status (CPU: ${cpu}%, Memory: $((memory/1024/1024))MB)"
            else
                print_error "Process $process: $status"
            fi
        fi
    done
}

# Function to check backend health
check_backend() {
    print_header "Backend Health Check"
    
    # Check if backend is responding
    if check_http_endpoint "$BACKEND_URL/health" 200 10; then
        print_status "Backend is responding"
        
        # Check response time
        if check_response_time "$BACKEND_URL/health" 2; then
            print_status "Backend response time is good"
        else
            print_warning "Backend response time is slow"
        fi
        
        # Check specific endpoints
        if check_http_endpoint "$BACKEND_URL/api/status" 200 10; then
            print_status "API status endpoint is working"
        else
            print_warning "API status endpoint is not responding"
        fi
        
    else
        print_error "Backend is not responding"
    fi
}

# Function to check frontend
check_frontend() {
    print_header "Frontend Check"
    
    # Check if dist directory exists
    if [ -d "$PROJECT_DIR/dist" ]; then
        print_status "Frontend build directory exists"
        
        # Check if index.html exists
        if [ -f "$PROJECT_DIR/dist/index.html" ]; then
            print_status "Frontend index.html exists"
        else
            print_error "Frontend index.html not found"
        fi
        
        # Check build size
        local build_size=$(du -sh "$PROJECT_DIR/dist" | cut -f1)
        print_status "Frontend build size: $build_size"
        
    else
        print_error "Frontend build directory not found"
    fi
}

# Function to check SSL certificates
check_ssl() {
    print_header "SSL Certificate Check"
    
    local cert_file="/home/dell/KP2A-CIMAHI/KP2A/ssl/certs/$DOMAIN.pem"
    local key_file="/home/dell/KP2A-CIMAHI/KP2A/ssl/private/$DOMAIN.key"
    
    if [ -f "$cert_file" ]; then
        # Check certificate validity
        if openssl x509 -in "$cert_file" -text -noout > /dev/null 2>&1; then
            local expiry=$(openssl x509 -in "$cert_file" -enddate -noout | cut -d= -f2)
            local expiry_timestamp=$(date -d "$expiry" +%s 2>/dev/null || echo "0")
            local current_timestamp=$(date +%s)
            local days_until_expiry=$(( (expiry_timestamp - current_timestamp) / 86400 ))
            
            if [ "$days_until_expiry" -gt 30 ]; then
                print_status "SSL certificate expires in $days_until_expiry days"
            elif [ "$days_until_expiry" -gt 7 ]; then
                print_warning "SSL certificate expires in $days_until_expiry days"
            else
                print_error "SSL certificate expires in $days_until_expiry days"
            fi
        else
            print_error "SSL certificate is invalid"
        fi
    else
        print_warning "SSL certificate not found"
    fi
    
    if [ -f "$key_file" ]; then
        if openssl rsa -in "$key_file" -check -noout > /dev/null 2>&1; then
            print_status "SSL private key is valid"
        else
            print_error "SSL private key is invalid"
        fi
    else
        print_warning "SSL private key not found"
    fi
}

# Function to check database connectivity
check_database() {
    print_header "Database Check"
    
    # Check if Supabase configuration exists
    if [ -f "$PROJECT_DIR/.env.production" ]; then
        local supabase_url=$(grep "VITE_SUPABASE_URL" "$PROJECT_DIR/.env.production" | cut -d= -f2 | tr -d '"')
        
        if [ -n "$supabase_url" ]; then
            if check_http_endpoint "$supabase_url/rest/v1/" 200 10; then
                print_status "Supabase database is accessible"
            else
                print_error "Supabase database is not accessible"
            fi
        else
            print_warning "Supabase URL not configured"
        fi
    else
        print_warning "Production environment file not found"
    fi
}

# Function to check logs for errors
check_logs() {
    print_header "Log Analysis"
    
    local log_dir="$PROJECT_DIR/logs"
    
    if [ -d "$log_dir" ]; then
        # Check for recent errors
        local error_count=$(find "$log_dir" -name "*.log" -mtime -1 -exec grep -i "error" {} \; 2>/dev/null | wc -l)
        
        if [ "$error_count" -eq 0 ]; then
            print_status "No errors found in recent logs"
        elif [ "$error_count" -lt 10 ]; then
            print_warning "Found $error_count errors in recent logs"
        else
            print_error "Found $error_count errors in recent logs"
        fi
        
        # Check log file sizes
        find "$log_dir" -name "*.log" -size +100M -exec basename {} \; | while read -r large_log; do
            if [ -n "$large_log" ]; then
                print_warning "Large log file detected: $large_log"
            fi
        done
        
    else
        print_warning "Log directory not found"
    fi
}

# Function to check network connectivity
check_network() {
    print_header "Network Connectivity Check"
    
    # Check internet connectivity
    if ping -c 1 8.8.8.8 > /dev/null 2>&1; then
        print_status "Internet connectivity is working"
    else
        print_error "No internet connectivity"
    fi
    
    # Check DNS resolution
    if nslookup "$DOMAIN" > /dev/null 2>&1; then
        print_status "DNS resolution for $DOMAIN is working"
    else
        print_error "DNS resolution for $DOMAIN failed"
    fi
    
    # Check if domain is accessible
    if check_http_endpoint "https://$DOMAIN" 200 10; then
        print_status "Domain $DOMAIN is accessible"
    else
        print_warning "Domain $DOMAIN is not accessible"
    fi
}

# Function to send alerts
send_alert() {
    local message="$1"
    local severity="$2"
    
    # Email alert
    if [ -n "$ALERT_EMAIL" ] && command_exists mail; then
        echo "$message" | mail -s "[$severity] Health Check Alert - $DOMAIN" "$ALERT_EMAIL"
    fi
    
    # Slack alert
    if [ -n "$SLACK_WEBHOOK" ] && command_exists curl; then
        local payload="{\"text\":\"[$severity] Health Check Alert - $DOMAIN\\n$message\"}"
        curl -X POST -H 'Content-type: application/json' --data "$payload" "$SLACK_WEBHOOK" > /dev/null 2>&1
    fi
}

# Function to generate health report
generate_report() {
    print_header "Health Check Summary"
    
    local status_text=""
    case $HEALTH_STATUS in
        0) status_text="HEALTHY" ;;
        1) status_text="WARNING" ;;
        2) status_text="CRITICAL" ;;
    esac
    
    echo "Overall Status: $status_text"
    echo "Check completed at: $(date)"
    echo "Domain: $DOMAIN"
    echo "Project: $PROJECT_DIR"
    
    # Send alert if there are issues
    if [ $HEALTH_STATUS -gt 0 ]; then
        local alert_message="Health check failed for $DOMAIN. Status: $status_text. Check logs for details."
        send_alert "$alert_message" "$status_text"
    fi
}

# Main health check function
main() {
    print_header "Starting Health Check for $DOMAIN"
    
    # Create log directory if it doesn't exist
    mkdir -p "$(dirname "$LOG_FILE")"
    
    # Run all health checks
    check_disk_space
    check_memory
    check_pm2
    check_backend
    check_frontend
    check_ssl
    check_database
    check_logs
    check_network
    
    # Generate final report
    generate_report
    
    exit $HEALTH_STATUS
}

# Handle script arguments
case "$1" in
    --help|-h)
        echo "Usage: $0 [OPTIONS]"
        echo "Options:"
        echo "  --help, -h     Show this help message"
        echo ""
        echo "Exit codes:"
        echo "  0 - All checks passed"
        echo "  1 - Warnings detected"
        echo "  2 - Critical issues detected"
        exit 0
        ;;
    *)
        main "$@"
        ;;
esac