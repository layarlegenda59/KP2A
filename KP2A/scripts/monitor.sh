#!/bin/bash

# Continuous Monitoring Script for sidarsih.site
# This script provides real-time monitoring and alerting

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_DIR="/home/dell/KP2A-CIMAHI/KP2A"
DOMAIN="sidarsih.site"
BACKEND_URL="http://localhost:3001"
MONITOR_INTERVAL=60  # seconds
LOG_FILE="/home/dell/KP2A-CIMAHI/KP2A/logs/monitor.log"
METRICS_FILE="/home/dell/KP2A-CIMAHI/KP2A/logs/metrics.json"
PID_FILE="/home/dell/KP2A-CIMAHI/KP2A/logs/monitor.pid"

# Thresholds
CPU_THRESHOLD=80
MEMORY_THRESHOLD=80
DISK_THRESHOLD=85
RESPONSE_TIME_THRESHOLD=3

# Function to print colored output
print_status() {
    echo -e "${GREEN}[$(date '+%H:%M:%S')]${NC} $1"
    log_message "INFO: $1"
}

print_warning() {
    echo -e "${YELLOW}[$(date '+%H:%M:%S')]${NC} $1"
    log_message "WARNING: $1"
}

print_error() {
    echo -e "${RED}[$(date '+%H:%M:%S')]${NC} $1"
    log_message "ERROR: $1"
}

print_header() {
    echo -e "${BLUE}[$(date '+%H:%M:%S')] === $1 ===${NC}"
    log_message "=== $1 ==="
}

# Function to log messages
log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> "$LOG_FILE"
}

# Function to save metrics
save_metrics() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    local cpu_usage="$1"
    local memory_usage="$2"
    local disk_usage="$3"
    local response_time="$4"
    local backend_status="$5"
    
    local metrics="{
        \"timestamp\": \"$timestamp\",
        \"cpu_usage\": $cpu_usage,
        \"memory_usage\": $memory_usage,
        \"disk_usage\": $disk_usage,
        \"response_time\": $response_time,
        \"backend_status\": \"$backend_status\"
    }"
    
    echo "$metrics" >> "$METRICS_FILE"
}

# Function to get CPU usage
get_cpu_usage() {
    top -bn1 | grep "Cpu(s)" | awk '{print $2}' | sed 's/%us,//'
}

# Function to get memory usage
get_memory_usage() {
    free | grep Mem | awk '{printf "%.1f", $3/$2 * 100.0}'
}

# Function to get disk usage
get_disk_usage() {
    df "$PROJECT_DIR" | awk 'NR==2 {print $5}' | sed 's/%//'
}

# Function to get response time
get_response_time() {
    curl -s -o /dev/null -w "%{time_total}" --max-time 10 "$BACKEND_URL/health" 2>/dev/null || echo "999"
}

# Function to check backend status
check_backend_status() {
    local response=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$BACKEND_URL/health" 2>/dev/null || echo "000")
    
    if [ "$response" = "200" ]; then
        echo "online"
    else
        echo "offline"
    fi
}

# Function to check PM2 processes
monitor_pm2_processes() {
    if ! command -v pm2 >/dev/null 2>&1; then
        print_error "PM2 not found"
        return
    fi
    
    local pm2_status=$(pm2 jlist 2>/dev/null)
    
    if [ "$?" -ne 0 ]; then
        print_error "Could not get PM2 status"
        return
    fi
    
    local processes=$(echo "$pm2_status" | jq -r '.[].name' 2>/dev/null || echo "")
    
    if [ -z "$processes" ]; then
        print_warning "No PM2 processes found"
        return
    fi
    
    echo "$processes" | while read -r process; do
        if [ -n "$process" ]; then
            local status=$(echo "$pm2_status" | jq -r ".[] | select(.name==\"$process\") | .pm2_env.status" 2>/dev/null)
            local restarts=$(echo "$pm2_status" | jq -r ".[] | select(.name==\"$process\") | .pm2_env.restart_time" 2>/dev/null)
            
            if [ "$status" != "online" ]; then
                print_error "Process $process is $status (restarts: $restarts)"
                
                # Auto-restart if process is stopped
                if [ "$status" = "stopped" ]; then
                    print_status "Attempting to restart $process"
                    pm2 restart "$process" 2>/dev/null || print_error "Failed to restart $process"
                fi
            fi
        fi
    done
}

# Function to monitor system resources
monitor_resources() {
    local cpu_usage=$(get_cpu_usage)
    local memory_usage=$(get_memory_usage)
    local disk_usage=$(get_disk_usage)
    
    # Remove % and convert to number for comparison
    cpu_usage=${cpu_usage%.*}
    memory_usage=${memory_usage%.*}
    
    # Check CPU usage
    if [ "$cpu_usage" -gt "$CPU_THRESHOLD" ]; then
        print_warning "High CPU usage: ${cpu_usage}%"
    fi
    
    # Check memory usage
    if [ "$memory_usage" -gt "$MEMORY_THRESHOLD" ]; then
        print_warning "High memory usage: ${memory_usage}%"
    fi
    
    # Check disk usage
    if [ "$disk_usage" -gt "$DISK_THRESHOLD" ]; then
        print_warning "High disk usage: ${disk_usage}%"
    fi
    
    echo "$cpu_usage $memory_usage $disk_usage"
}

# Function to monitor backend performance
monitor_backend() {
    local response_time=$(get_response_time)
    local backend_status=$(check_backend_status)
    
    if [ "$backend_status" = "offline" ]; then
        print_error "Backend is offline"
        
        # Attempt to restart backend
        print_status "Attempting to restart backend"
        cd "$PROJECT_DIR"
        pm2 restart sidarsih-whatsapp-backend 2>/dev/null || print_error "Failed to restart backend"
        
    elif (( $(echo "$response_time > $RESPONSE_TIME_THRESHOLD" | bc -l) )); then
        print_warning "Slow backend response: ${response_time}s"
    else
        print_status "Backend is healthy (${response_time}s)"
    fi
    
    echo "$response_time $backend_status"
}

# Function to monitor log files
monitor_logs() {
    local log_dir="$PROJECT_DIR/logs"
    
    if [ -d "$log_dir" ]; then
        # Check for new errors in the last minute
        local recent_errors=$(find "$log_dir" -name "*.log" -mmin -1 -exec grep -i "error" {} \; 2>/dev/null | wc -l)
        
        if [ "$recent_errors" -gt 0 ]; then
            print_warning "Found $recent_errors new errors in logs"
        fi
        
        # Check for large log files
        find "$log_dir" -name "*.log" -size +500M -exec basename {} \; | while read -r large_log; do
            if [ -n "$large_log" ]; then
                print_warning "Very large log file: $large_log"
                
                # Rotate large log files
                local log_path="$log_dir/$large_log"
                local backup_path="${log_path}.$(date +%Y%m%d_%H%M%S)"
                
                print_status "Rotating large log file: $large_log"
                mv "$log_path" "$backup_path" 2>/dev/null || print_error "Failed to rotate $large_log"
                touch "$log_path"
            fi
        done
    fi
}

# Function to cleanup old files
cleanup_old_files() {
    local log_dir="$PROJECT_DIR/logs"
    
    if [ -d "$log_dir" ]; then
        # Remove log files older than 30 days
        find "$log_dir" -name "*.log.*" -mtime +30 -delete 2>/dev/null || true
        
        # Remove old metrics files (keep last 7 days)
        find "$log_dir" -name "metrics_*.json" -mtime +7 -delete 2>/dev/null || true
    fi
    
    # Cleanup old backups (keep last 10)
    local backup_dir="/home/dell/KP2A-CIMAHI/backups"
    if [ -d "$backup_dir" ]; then
        ls -1t "$backup_dir" | tail -n +11 | while read -r old_backup; do
            if [ -n "$old_backup" ]; then
                print_status "Removing old backup: $old_backup"
                rm -rf "$backup_dir/$old_backup" 2>/dev/null || true
            fi
        done
    fi
}

# Function to generate monitoring report
generate_monitoring_report() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    print_header "Monitoring Report - $timestamp"
    
    # System resources
    local resources=$(monitor_resources)
    local cpu_usage=$(echo $resources | awk '{print $1}')
    local memory_usage=$(echo $resources | awk '{print $2}')
    local disk_usage=$(echo $resources | awk '{print $3}')
    
    echo "System Resources:"
    echo "  CPU: ${cpu_usage}%"
    echo "  Memory: ${memory_usage}%"
    echo "  Disk: ${disk_usage}%"
    
    # Backend performance
    local backend_info=$(monitor_backend)
    local response_time=$(echo $backend_info | awk '{print $1}')
    local backend_status=$(echo $backend_info | awk '{print $2}')
    
    echo "Backend:"
    echo "  Status: $backend_status"
    echo "  Response Time: ${response_time}s"
    
    # PM2 processes
    echo "PM2 Processes:"
    pm2 status 2>/dev/null || echo "  PM2 not available"
    
    # Save metrics
    save_metrics "$cpu_usage" "$memory_usage" "$disk_usage" "$response_time" "$backend_status"
}

# Function to start monitoring daemon
start_daemon() {
    if [ -f "$PID_FILE" ]; then
        local old_pid=$(cat "$PID_FILE")
        if kill -0 "$old_pid" 2>/dev/null; then
            print_error "Monitor is already running (PID: $old_pid)"
            exit 1
        else
            rm -f "$PID_FILE"
        fi
    fi
    
    print_status "Starting monitoring daemon for $DOMAIN"
    print_status "Monitoring interval: ${MONITOR_INTERVAL}s"
    print_status "Log file: $LOG_FILE"
    print_status "Metrics file: $METRICS_FILE"
    
    # Save PID
    echo $$ > "$PID_FILE"
    
    # Create log directory
    mkdir -p "$(dirname "$LOG_FILE")"
    
    # Main monitoring loop
    while true; do
        generate_monitoring_report
        monitor_pm2_processes
        monitor_logs
        
        # Cleanup every hour (3600 seconds / 60 seconds = 60 iterations)
        if [ $(($(date +%s) % 3600)) -lt $MONITOR_INTERVAL ]; then
            cleanup_old_files
        fi
        
        sleep "$MONITOR_INTERVAL"
    done
}

# Function to stop monitoring daemon
stop_daemon() {
    if [ -f "$PID_FILE" ]; then
        local pid=$(cat "$PID_FILE")
        if kill -0 "$pid" 2>/dev/null; then
            print_status "Stopping monitoring daemon (PID: $pid)"
            kill "$pid"
            rm -f "$PID_FILE"
            print_status "Monitor stopped"
        else
            print_warning "Monitor is not running"
            rm -f "$PID_FILE"
        fi
    else
        print_warning "Monitor is not running"
    fi
}

# Function to show monitoring status
show_status() {
    if [ -f "$PID_FILE" ]; then
        local pid=$(cat "$PID_FILE")
        if kill -0 "$pid" 2>/dev/null; then
            print_status "Monitor is running (PID: $pid)"
            
            # Show recent metrics
            if [ -f "$METRICS_FILE" ]; then
                print_header "Recent Metrics"
                tail -5 "$METRICS_FILE" | jq -r '. | "\(.timestamp): CPU=\(.cpu_usage)%, Memory=\(.memory_usage)%, Disk=\(.disk_usage)%, Response=\(.response_time)s, Backend=\(.backend_status)"' 2>/dev/null || tail -5 "$METRICS_FILE"
            fi
        else
            print_warning "Monitor is not running (stale PID file)"
            rm -f "$PID_FILE"
        fi
    else
        print_warning "Monitor is not running"
    fi
}

# Function to show help
show_help() {
    echo "Usage: $0 {start|stop|status|restart|check|help}"
    echo ""
    echo "Commands:"
    echo "  start    - Start monitoring daemon"
    echo "  stop     - Stop monitoring daemon"
    echo "  status   - Show monitoring status"
    echo "  restart  - Restart monitoring daemon"
    echo "  check    - Run single health check"
    echo "  help     - Show this help message"
    echo ""
    echo "Configuration:"
    echo "  Domain: $DOMAIN"
    echo "  Backend URL: $BACKEND_URL"
    echo "  Monitor Interval: ${MONITOR_INTERVAL}s"
    echo "  Log File: $LOG_FILE"
    echo "  Metrics File: $METRICS_FILE"
}

# Main function
main() {
    case "$1" in
        start)
            start_daemon
            ;;
        stop)
            stop_daemon
            ;;
        status)
            show_status
            ;;
        restart)
            stop_daemon
            sleep 2
            start_daemon
            ;;
        check)
            generate_monitoring_report
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            echo "Usage: $0 {start|stop|status|restart|check|help}"
            exit 1
            ;;
    esac
}

# Handle script execution
main "$@"