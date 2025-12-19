#!/bin/bash

# SIDARSIH Cloudflare Tunnel Automated Monitoring Script
# This script performs comprehensive system health checks and automated monitoring

# Configuration
PROJECT_DIR="/home/dell/KP2A-CIMAHI/KP2A"
SCRIPTS_DIR="$PROJECT_DIR/scripts"
LOGS_DIR="$PROJECT_DIR/logs"
PIDS_DIR="$PROJECT_DIR/pids"
CONFIG_FILE="$PROJECT_DIR/cloudflared-config-proxmox.yml"
ENV_FILE="$PROJECT_DIR/.env.tunnel"
MONITOR_LOG="$LOGS_DIR/automated-monitoring.log"
HEALTH_LOG="$LOGS_DIR/health-check.log"
ALERT_LOG="$LOGS_DIR/alerts.log"

# Monitoring configuration
CHECK_INTERVAL=60  # seconds
MAX_CPU_USAGE=80   # percentage
MAX_MEMORY_USAGE=80 # percentage
MAX_DISK_USAGE=85  # percentage
MAX_LOAD_AVERAGE=4.0
MIN_FREE_MEMORY=512 # MB
RESTART_THRESHOLD=3 # number of failed checks before restart

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Create necessary directories
mkdir -p "$LOGS_DIR" "$PIDS_DIR"

# PID file for this monitoring script
MONITOR_PID_FILE="$PIDS_DIR/automated-monitoring.pid"

# Logging function
log() {
    local level=$1
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [$level] $message" >> "$MONITOR_LOG"
    
    case $level in
        "ERROR")   echo -e "${RED}[ERROR]${NC} $message" ;;
        "WARN")    echo -e "${YELLOW}[WARN]${NC} $message" ;;
        "INFO")    echo -e "${GREEN}[INFO]${NC} $message" ;;
        "DEBUG")   echo -e "${BLUE}[DEBUG]${NC} $message" ;;
        "ALERT")   echo -e "${PURPLE}[ALERT]${NC} $message" ;;
        "HEALTH")  echo -e "${CYAN}[HEALTH]${NC} $message" ;;
        *)         echo -e "${CYAN}[$level]${NC} $message" ;;
    esac
}

# Health logging function
health_log() {
    local status=$1
    local component=$2
    local details=$3
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [$status] $component: $details" >> "$HEALTH_LOG"
}

# Alert logging function
alert_log() {
    local severity=$1
    local message=$2
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [$severity] $message" >> "$ALERT_LOG"
    log "ALERT" "[$severity] $message"
}

# Load environment variables
load_environment() {
    if [[ -f "$ENV_FILE" ]]; then
        source "$ENV_FILE"
        log "INFO" "Environment variables loaded from $ENV_FILE"
    else
        log "WARN" "Environment file not found: $ENV_FILE"
    fi
}

# System resource monitoring
check_system_resources() {
    log "HEALTH" "Checking system resources..."
    
    # CPU Usage
    local cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)
    cpu_usage=${cpu_usage%.*}  # Remove decimal part
    
    if [[ $cpu_usage -gt $MAX_CPU_USAGE ]]; then
        alert_log "HIGH" "CPU usage is high: ${cpu_usage}% (threshold: ${MAX_CPU_USAGE}%)"
        health_log "CRITICAL" "CPU" "${cpu_usage}%"
    else
        health_log "OK" "CPU" "${cpu_usage}%"
    fi
    
    # Memory Usage
    local memory_info=$(free -m | grep "Mem:")
    local total_memory=$(echo $memory_info | awk '{print $2}')
    local used_memory=$(echo $memory_info | awk '{print $3}')
    local free_memory=$(echo $memory_info | awk '{print $4}')
    local memory_usage=$((used_memory * 100 / total_memory))
    
    if [[ $memory_usage -gt $MAX_MEMORY_USAGE ]]; then
        alert_log "HIGH" "Memory usage is high: ${memory_usage}% (threshold: ${MAX_MEMORY_USAGE}%)"
        health_log "CRITICAL" "MEMORY" "${memory_usage}% (${used_memory}MB/${total_memory}MB)"
    elif [[ $free_memory -lt $MIN_FREE_MEMORY ]]; then
        alert_log "MEDIUM" "Low free memory: ${free_memory}MB (threshold: ${MIN_FREE_MEMORY}MB)"
        health_log "WARN" "MEMORY" "${memory_usage}% (Free: ${free_memory}MB)"
    else
        health_log "OK" "MEMORY" "${memory_usage}% (${used_memory}MB/${total_memory}MB)"
    fi
    
    # Disk Usage
    local disk_usage=$(df -h "$PROJECT_DIR" | tail -1 | awk '{print $5}' | cut -d'%' -f1)
    
    if [[ $disk_usage -gt $MAX_DISK_USAGE ]]; then
        alert_log "HIGH" "Disk usage is high: ${disk_usage}% (threshold: ${MAX_DISK_USAGE}%)"
        health_log "CRITICAL" "DISK" "${disk_usage}%"
    else
        health_log "OK" "DISK" "${disk_usage}%"
    fi
    
    # Load Average
    local load_avg=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | cut -d',' -f1)
    local load_comparison=$(echo "$load_avg > $MAX_LOAD_AVERAGE" | bc -l 2>/dev/null || echo 0)
    
    if [[ $load_comparison -eq 1 ]]; then
        alert_log "MEDIUM" "Load average is high: $load_avg (threshold: $MAX_LOAD_AVERAGE)"
        health_log "WARN" "LOAD" "$load_avg"
    else
        health_log "OK" "LOAD" "$load_avg"
    fi
}

# Check Cloudflared process
check_cloudflared_process() {
    log "HEALTH" "Checking Cloudflared process..."
    
    local cloudflared_pid=$(pgrep -f "cloudflared tunnel run")
    
    if [[ -n "$cloudflared_pid" ]]; then
        health_log "OK" "CLOUDFLARED" "Running (PID: $cloudflared_pid)"
        
        # Check process resource usage
        local process_info=$(ps -p "$cloudflared_pid" -o pid,pcpu,pmem,etime --no-headers 2>/dev/null)
        if [[ -n "$process_info" ]]; then
            local cpu_percent=$(echo $process_info | awk '{print $2}')
            local mem_percent=$(echo $process_info | awk '{print $3}')
            local runtime=$(echo $process_info | awk '{print $4}')
            
            log "DEBUG" "Cloudflared process stats - CPU: ${cpu_percent}%, Memory: ${mem_percent}%, Runtime: $runtime"
            
            # Alert if process is using too many resources
            local cpu_int=${cpu_percent%.*}
            if [[ $cpu_int -gt 50 ]]; then
                alert_log "MEDIUM" "Cloudflared process using high CPU: ${cpu_percent}%"
            fi
        fi
    else
        alert_log "CRITICAL" "Cloudflared process is not running"
        health_log "CRITICAL" "CLOUDFLARED" "Not running"
        return 1
    fi
    
    return 0
}

# Check PM2 processes
check_pm2_processes() {
    log "HEALTH" "Checking PM2 processes..."
    
    if ! command -v pm2 >/dev/null 2>&1; then
        alert_log "CRITICAL" "PM2 is not installed or not in PATH"
        health_log "CRITICAL" "PM2" "Not available"
        return 1
    fi
    
    # Check if PM2 daemon is running
    if ! pm2 ping >/dev/null 2>&1; then
        alert_log "CRITICAL" "PM2 daemon is not running"
        health_log "CRITICAL" "PM2_DAEMON" "Not running"
        return 1
    fi
    
    # Check specific tunnel processes
    local tunnel_processes=("sidarsih-cloudflare-tunnel" "sidarsih-tunnel-monitor" "sidarsih-tunnel-metrics")
    
    for process_name in "${tunnel_processes[@]}"; do
        local process_status=$(pm2 jlist 2>/dev/null | jq -r ".[] | select(.name == \"$process_name\") | .pm2_env.status" 2>/dev/null)
        
        if [[ "$process_status" == "online" ]]; then
            health_log "OK" "PM2_$process_name" "Online"
            
            # Get process details
            local process_info=$(pm2 jlist 2>/dev/null | jq -r ".[] | select(.name == \"$process_name\") | {cpu: .monit.cpu, memory: .monit.memory, uptime: .pm2_env.pm_uptime}" 2>/dev/null)
            if [[ -n "$process_info" ]]; then
                log "DEBUG" "PM2 process $process_name stats: $process_info"
            fi
        elif [[ "$process_status" == "stopped" ]]; then
            alert_log "HIGH" "PM2 process $process_name is stopped"
            health_log "CRITICAL" "PM2_$process_name" "Stopped"
        elif [[ "$process_status" == "errored" ]]; then
            alert_log "CRITICAL" "PM2 process $process_name has errors"
            health_log "CRITICAL" "PM2_$process_name" "Errored"
        else
            alert_log "MEDIUM" "PM2 process $process_name status unknown: $process_status"
            health_log "WARN" "PM2_$process_name" "Unknown status: $process_status"
        fi
    done
}

# Check network connectivity
check_network_connectivity() {
    log "HEALTH" "Checking network connectivity..."
    
    # Check internet connectivity
    if ping -c 1 -W 5 8.8.8.8 >/dev/null 2>&1; then
        health_log "OK" "INTERNET" "Connected"
    else
        alert_log "CRITICAL" "No internet connectivity"
        health_log "CRITICAL" "INTERNET" "Disconnected"
        return 1
    fi
    
    # Check Cloudflare connectivity
    if ping -c 1 -W 5 1.1.1.1 >/dev/null 2>&1; then
        health_log "OK" "CLOUDFLARE_DNS" "Connected"
    else
        alert_log "HIGH" "Cannot reach Cloudflare DNS"
        health_log "CRITICAL" "CLOUDFLARE_DNS" "Disconnected"
    fi
    
    # Check domain connectivity (if domain is configured)
    if [[ -n "$DOMAIN" ]]; then
        if curl -s --max-time 10 "https://$DOMAIN" >/dev/null 2>&1; then
            health_log "OK" "DOMAIN_$DOMAIN" "Accessible"
        else
            alert_log "HIGH" "Domain $DOMAIN is not accessible"
            health_log "CRITICAL" "DOMAIN_$DOMAIN" "Not accessible"
        fi
    fi
}

# Check service ports
check_service_ports() {
    log "HEALTH" "Checking service ports..."
    
    # Load port configurations from environment
    local ports_to_check=(
        "${FRONTEND_PORT:-5173}:Frontend"
        "${BACKEND_PORT:-3001}:Backend"
        "${HEALTH_CHECK_PORT:-8080}:Health Check"
        "${METRICS_PORT:-8081}:Metrics"
        "${MONITOR_PORT:-8082}:Monitor"
    )
    
    for port_info in "${ports_to_check[@]}"; do
        local port="${port_info%:*}"
        local service="${port_info#*:}"
        
        if netstat -tlnp 2>/dev/null | grep -q ":$port "; then
            health_log "OK" "PORT_$port" "$service listening"
        else
            alert_log "MEDIUM" "Port $port ($service) is not listening"
            health_log "WARN" "PORT_$port" "$service not listening"
        fi
    done
}

# Check log files
check_log_files() {
    log "HEALTH" "Checking log files..."
    
    local log_files=(
        "$MONITOR_LOG:Monitor Log"
        "$HEALTH_LOG:Health Log"
        "$ALERT_LOG:Alert Log"
        "$LOGS_DIR/tunnel.log:Tunnel Log"
        "$LOGS_DIR/pm2.log:PM2 Log"
    )
    
    for log_info in "${log_files[@]}"; do
        local log_file="${log_info%:*}"
        local log_name="${log_info#*:}"
        
        if [[ -f "$log_file" ]]; then
            local log_size=$(stat -c%s "$log_file" 2>/dev/null || echo 0)
            local log_size_mb=$((log_size / 1024 / 1024))
            
            if [[ $log_size_mb -gt 100 ]]; then
                alert_log "MEDIUM" "$log_name is large (${log_size_mb}MB)"
                health_log "WARN" "LOG_SIZE" "$log_name: ${log_size_mb}MB"
            else
                health_log "OK" "LOG_SIZE" "$log_name: ${log_size_mb}MB"
            fi
            
            # Check for recent errors in logs
            local recent_errors=$(tail -100 "$log_file" 2>/dev/null | grep -i "error\|critical\|fatal" | wc -l)
            if [[ $recent_errors -gt 5 ]]; then
                alert_log "MEDIUM" "$log_name has $recent_errors recent errors"
            fi
        else
            health_log "WARN" "LOG_FILE" "$log_name not found"
        fi
    done
}

# Auto-restart failed services
auto_restart_services() {
    log "INFO" "Checking for services that need restart..."
    
    # Check if cloudflared needs restart
    if ! check_cloudflared_process >/dev/null 2>&1; then
        log "INFO" "Attempting to restart Cloudflared tunnel..."
        if [[ -f "$SCRIPTS_DIR/start-tunnel-pm2.sh" ]]; then
            "$SCRIPTS_DIR/start-tunnel-pm2.sh" >/dev/null 2>&1
            if [[ $? -eq 0 ]]; then
                log "INFO" "Cloudflared tunnel restarted successfully"
                alert_log "INFO" "Cloudflared tunnel auto-restarted"
            else
                log "ERROR" "Failed to restart Cloudflared tunnel"
                alert_log "CRITICAL" "Failed to auto-restart Cloudflared tunnel"
            fi
        fi
    fi
    
    # Check PM2 processes and restart if needed
    if command -v pm2 >/dev/null 2>&1; then
        local stopped_processes=$(pm2 jlist 2>/dev/null | jq -r '.[] | select(.pm2_env.status == "stopped" or .pm2_env.status == "errored") | .name' 2>/dev/null)
        
        if [[ -n "$stopped_processes" ]]; then
            log "INFO" "Restarting stopped PM2 processes: $stopped_processes"
            echo "$stopped_processes" | while read -r process_name; do
                pm2 restart "$process_name" >/dev/null 2>&1
                if [[ $? -eq 0 ]]; then
                    log "INFO" "PM2 process $process_name restarted successfully"
                    alert_log "INFO" "PM2 process $process_name auto-restarted"
                else
                    log "ERROR" "Failed to restart PM2 process $process_name"
                    alert_log "CRITICAL" "Failed to auto-restart PM2 process $process_name"
                fi
            done
        fi
    fi
}

# Generate health report
generate_health_report() {
    local report_file="$LOGS_DIR/health-report-$(date +%Y%m%d-%H%M%S).json"
    
    log "INFO" "Generating health report: $report_file"
    
    # Collect system information
    local cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)
    local memory_info=$(free -m | grep "Mem:")
    local total_memory=$(echo $memory_info | awk '{print $2}')
    local used_memory=$(echo $memory_info | awk '{print $3}')
    local memory_usage=$((used_memory * 100 / total_memory))
    local disk_usage=$(df -h "$PROJECT_DIR" | tail -1 | awk '{print $5}' | cut -d'%' -f1)
    local load_avg=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | cut -d',' -f1)
    local uptime_info=$(uptime -p)
    
    # Create JSON report
    cat > "$report_file" << EOF
{
  "timestamp": "$(date -Iseconds)",
  "hostname": "$(hostname)",
  "system": {
    "uptime": "$uptime_info",
    "load_average": "$load_avg",
    "cpu_usage": "$cpu_usage",
    "memory": {
      "total": $total_memory,
      "used": $used_memory,
      "usage_percent": $memory_usage
    },
    "disk_usage": "$disk_usage"
  },
  "services": {
    "cloudflared": {
      "running": $(pgrep -f "cloudflared tunnel run" >/dev/null && echo "true" || echo "false"),
      "pid": "$(pgrep -f "cloudflared tunnel run" || echo "null")"
    },
    "pm2": {
      "daemon_running": $(pm2 ping >/dev/null 2>&1 && echo "true" || echo "false"),
      "processes": $(pm2 jlist 2>/dev/null | jq '[.[] | {name: .name, status: .pm2_env.status, cpu: .monit.cpu, memory: .monit.memory}]' 2>/dev/null || echo "[]")
    }
  },
  "network": {
    "internet": $(ping -c 1 -W 5 8.8.8.8 >/dev/null 2>&1 && echo "true" || echo "false"),
    "cloudflare_dns": $(ping -c 1 -W 5 1.1.1.1 >/dev/null 2>&1 && echo "true" || echo "false")
  },
  "alerts": {
    "recent_count": $(tail -100 "$ALERT_LOG" 2>/dev/null | wc -l || echo 0),
    "critical_count": $(tail -100 "$ALERT_LOG" 2>/dev/null | grep -c "CRITICAL" || echo 0)
  }
}
EOF

    log "INFO" "Health report generated: $report_file"
}

# Cleanup old logs and reports
cleanup_old_files() {
    log "INFO" "Cleaning up old files..."
    
    # Remove log files older than 7 days
    find "$LOGS_DIR" -name "*.log" -type f -mtime +7 -delete 2>/dev/null
    
    # Remove health reports older than 3 days
    find "$LOGS_DIR" -name "health-report-*.json" -type f -mtime +3 -delete 2>/dev/null
    
    # Remove security reports older than 7 days
    find "$LOGS_DIR" -name "security-report-*.txt" -type f -mtime +7 -delete 2>/dev/null
    
    log "INFO" "Cleanup completed"
}

# Main monitoring loop
monitoring_loop() {
    log "INFO" "Starting automated monitoring loop (interval: ${CHECK_INTERVAL}s)"
    
    local check_count=0
    local failed_checks=0
    
    while true; do
        check_count=$((check_count + 1))
        log "DEBUG" "Starting health check #$check_count"
        
        local check_failed=false
        
        # Run all health checks
        check_system_resources || check_failed=true
        check_cloudflared_process || check_failed=true
        check_pm2_processes || check_failed=true
        check_network_connectivity || check_failed=true
        check_service_ports || check_failed=true
        check_log_files || check_failed=true
        
        if [[ "$check_failed" == "true" ]]; then
            failed_checks=$((failed_checks + 1))
            log "WARN" "Health check #$check_count failed (total failures: $failed_checks)"
            
            # Auto-restart services if threshold reached
            if [[ $failed_checks -ge $RESTART_THRESHOLD ]]; then
                log "INFO" "Failure threshold reached, attempting auto-restart"
                auto_restart_services
                failed_checks=0  # Reset counter after restart attempt
            fi
        else
            failed_checks=0  # Reset counter on successful check
            log "DEBUG" "Health check #$check_count completed successfully"
        fi
        
        # Generate health report every 10 checks
        if [[ $((check_count % 10)) -eq 0 ]]; then
            generate_health_report
        fi
        
        # Cleanup old files every 100 checks
        if [[ $((check_count % 100)) -eq 0 ]]; then
            cleanup_old_files
        fi
        
        sleep "$CHECK_INTERVAL"
    done
}

# Signal handlers
cleanup_and_exit() {
    log "INFO" "Received termination signal, cleaning up..."
    if [[ -f "$MONITOR_PID_FILE" ]]; then
        rm -f "$MONITOR_PID_FILE"
    fi
    log "INFO" "Automated monitoring stopped"
    exit 0
}

# Set up signal handlers
trap cleanup_and_exit SIGTERM SIGINT

# Main function
main() {
    # Check if already running
    if [[ -f "$MONITOR_PID_FILE" ]]; then
        local existing_pid=$(cat "$MONITOR_PID_FILE")
        if kill -0 "$existing_pid" 2>/dev/null; then
            log "ERROR" "Automated monitoring is already running (PID: $existing_pid)"
            exit 1
        else
            log "WARN" "Stale PID file found, removing it"
            rm -f "$MONITOR_PID_FILE"
        fi
    fi
    
    # Write PID file
    echo $$ > "$MONITOR_PID_FILE"
    
    log "INFO" "Starting SIDARSIH Cloudflare Tunnel Automated Monitoring"
    log "INFO" "PID: $$, PID file: $MONITOR_PID_FILE"
    
    # Load environment
    load_environment
    
    # Start monitoring
    monitoring_loop
}

# Handle script arguments
case "${1:-}" in
    --help|-h)
        echo "SIDARSIH Cloudflare Tunnel Automated Monitoring Script"
        echo ""
        echo "Usage: $0 [OPTIONS]"
        echo ""
        echo "Options:"
        echo "  --help, -h        Show this help message"
        echo "  --daemon, -d      Run as daemon (background process)"
        echo "  --stop, -s        Stop running monitoring daemon"
        echo "  --status, -t      Show monitoring status"
        echo "  --check, -c       Run single health check"
        echo "  --report, -r      Generate health report"
        echo ""
        echo "Configuration:"
        echo "  Check interval: ${CHECK_INTERVAL}s"
        echo "  CPU threshold: ${MAX_CPU_USAGE}%"
        echo "  Memory threshold: ${MAX_MEMORY_USAGE}%"
        echo "  Disk threshold: ${MAX_DISK_USAGE}%"
        echo "  Restart threshold: $RESTART_THRESHOLD failed checks"
        exit 0
        ;;
    --daemon|-d)
        log "INFO" "Starting automated monitoring as daemon"
        nohup "$0" > /dev/null 2>&1 &
        echo "Automated monitoring started as daemon (PID: $!)"
        exit 0
        ;;
    --stop|-s)
        if [[ -f "$MONITOR_PID_FILE" ]]; then
            local pid=$(cat "$MONITOR_PID_FILE")
            if kill -0 "$pid" 2>/dev/null; then
                kill "$pid"
                log "INFO" "Stopped automated monitoring (PID: $pid)"
                echo "Automated monitoring stopped"
            else
                log "WARN" "Process not running (PID: $pid)"
                rm -f "$MONITOR_PID_FILE"
                echo "Process not running"
            fi
        else
            echo "Automated monitoring is not running"
        fi
        exit 0
        ;;
    --status|-t)
        if [[ -f "$MONITOR_PID_FILE" ]]; then
            local pid=$(cat "$MONITOR_PID_FILE")
            if kill -0 "$pid" 2>/dev/null; then
                echo "Automated monitoring is running (PID: $pid)"
                echo "Started: $(ps -o lstart= -p "$pid" 2>/dev/null)"
            else
                echo "Automated monitoring is not running (stale PID file)"
            fi
        else
            echo "Automated monitoring is not running"
        fi
        exit 0
        ;;
    --check|-c)
        log "INFO" "Running single health check"
        load_environment
        check_system_resources
        check_cloudflared_process
        check_pm2_processes
        check_network_connectivity
        check_service_ports
        check_log_files
        log "INFO" "Single health check completed"
        exit 0
        ;;
    --report|-r)
        load_environment
        generate_health_report
        exit 0
        ;;
    "")
        main
        ;;
    *)
        log "ERROR" "Unknown option: $1"
        log "INFO" "Use --help for usage information"
        exit 1
        ;;
esac