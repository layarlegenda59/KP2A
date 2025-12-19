#!/bin/bash

# SIDARSIH Cloudflare Tunnel Security Validation Script
# This script validates tunnel credentials, permissions, and security configurations

# Configuration
PROJECT_DIR="/home/dell/KP2A-CIMAHI/KP2A"
SCRIPTS_DIR="$PROJECT_DIR/scripts"
LOGS_DIR="$PROJECT_DIR/logs"
CONFIG_FILE="$PROJECT_DIR/cloudflared-config-proxmox.yml"
ENV_FILE="$PROJECT_DIR/.env.tunnel"
CREDENTIALS_FILE="$PROJECT_DIR/.cloudflared/credentials.json"
SECURITY_LOG="$LOGS_DIR/security-check.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Logging function
log() {
    local level=$1
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [$level] $message" >> "$SECURITY_LOG"
    
    case $level in
        "ERROR")   echo -e "${RED}[ERROR]${NC} $message" ;;
        "WARN")    echo -e "${YELLOW}[WARN]${NC} $message" ;;
        "INFO")    echo -e "${GREEN}[INFO]${NC} $message" ;;
        "DEBUG")   echo -e "${BLUE}[DEBUG]${NC} $message" ;;
        "SECURITY") echo -e "${PURPLE}[SECURITY]${NC} $message" ;;
        *)         echo -e "${CYAN}[$level]${NC} $message" ;;
    esac
}

# Create security log if it doesn't exist
mkdir -p "$LOGS_DIR"
touch "$SECURITY_LOG"

# Security check functions
check_file_permissions() {
    local file=$1
    local expected_perm=$2
    local description=$3
    
    if [[ ! -f "$file" ]]; then
        log "ERROR" "$description not found: $file"
        return 1
    fi
    
    local actual_perm=$(stat -c "%a" "$file")
    if [[ "$actual_perm" != "$expected_perm" ]]; then
        log "WARN" "$description has incorrect permissions: $actual_perm (expected: $expected_perm)"
        log "INFO" "Fixing permissions for $file"
        chmod "$expected_perm" "$file"
        if [[ $? -eq 0 ]]; then
            log "INFO" "Permissions fixed for $file"
        else
            log "ERROR" "Failed to fix permissions for $file"
            return 1
        fi
    else
        log "INFO" "$description permissions OK: $actual_perm"
    fi
    return 0
}

check_directory_permissions() {
    local dir=$1
    local expected_perm=$2
    local description=$3
    
    if [[ ! -d "$dir" ]]; then
        log "ERROR" "$description not found: $dir"
        return 1
    fi
    
    local actual_perm=$(stat -c "%a" "$dir")
    if [[ "$actual_perm" != "$expected_perm" ]]; then
        log "WARN" "$description has incorrect permissions: $actual_perm (expected: $expected_perm)"
        log "INFO" "Fixing permissions for $dir"
        chmod "$expected_perm" "$dir"
        if [[ $? -eq 0 ]]; then
            log "INFO" "Permissions fixed for $dir"
        else
            log "ERROR" "Failed to fix permissions for $dir"
            return 1
        fi
    else
        log "INFO" "$description permissions OK: $actual_perm"
    fi
    return 0
}

validate_credentials_file() {
    log "SECURITY" "Validating Cloudflare credentials file..."
    
    if [[ ! -f "$CREDENTIALS_FILE" ]]; then
        log "ERROR" "Credentials file not found: $CREDENTIALS_FILE"
        log "INFO" "Please run: cloudflared tunnel login"
        return 1
    fi
    
    # Check file permissions (should be 600 - readable/writable by owner only)
    check_file_permissions "$CREDENTIALS_FILE" "600" "Credentials file"
    
    # Validate JSON structure
    if ! jq empty "$CREDENTIALS_FILE" 2>/dev/null; then
        log "ERROR" "Credentials file is not valid JSON"
        return 1
    fi
    
    # Check required fields
    local account_tag=$(jq -r '.AccountTag // empty' "$CREDENTIALS_FILE")
    local tunnel_secret=$(jq -r '.TunnelSecret // empty' "$CREDENTIALS_FILE")
    local tunnel_id=$(jq -r '.TunnelID // empty' "$CREDENTIALS_FILE")
    
    if [[ -z "$account_tag" || -z "$tunnel_secret" || -z "$tunnel_id" ]]; then
        log "ERROR" "Credentials file missing required fields"
        return 1
    fi
    
    log "INFO" "Credentials file validation passed"
    log "INFO" "Tunnel ID: $tunnel_id"
    return 0
}

validate_config_file() {
    log "SECURITY" "Validating Cloudflare configuration file..."
    
    if [[ ! -f "$CONFIG_FILE" ]]; then
        log "ERROR" "Configuration file not found: $CONFIG_FILE"
        return 1
    fi
    
    # Check file permissions (should be 644 - readable by all, writable by owner)
    check_file_permissions "$CONFIG_FILE" "644" "Configuration file"
    
    # Validate YAML syntax
    if ! python3 -c "import yaml; yaml.safe_load(open('$CONFIG_FILE'))" 2>/dev/null; then
        log "ERROR" "Configuration file has invalid YAML syntax"
        return 1
    fi
    
    # Check for sensitive information in config
    if grep -q "password\|secret\|key\|token" "$CONFIG_FILE"; then
        log "WARN" "Configuration file may contain sensitive information"
    fi
    
    log "INFO" "Configuration file validation passed"
    return 0
}

validate_environment_file() {
    log "SECURITY" "Validating environment file..."
    
    if [[ ! -f "$ENV_FILE" ]]; then
        log "ERROR" "Environment file not found: $ENV_FILE"
        return 1
    fi
    
    # Check file permissions (should be 600 - readable/writable by owner only)
    check_file_permissions "$ENV_FILE" "600" "Environment file"
    
    # Check for required environment variables
    local required_vars=("TUNNEL_ID" "TUNNEL_NAME" "DOMAIN" "CREDENTIALS_FILE")
    for var in "${required_vars[@]}"; do
        if ! grep -q "^$var=" "$ENV_FILE"; then
            log "ERROR" "Missing required environment variable: $var"
            return 1
        fi
    done
    
    # Check for empty values
    while IFS='=' read -r key value; do
        if [[ -n "$key" && -z "$value" ]]; then
            log "WARN" "Empty value for environment variable: $key"
        fi
    done < "$ENV_FILE"
    
    log "INFO" "Environment file validation passed"
    return 0
}

check_script_permissions() {
    log "SECURITY" "Checking script permissions..."
    
    local scripts=(
        "$SCRIPTS_DIR/start-tunnel-pm2.sh"
        "$SCRIPTS_DIR/tunnel-monitor.js"
        "$SCRIPTS_DIR/metrics-collector.js"
        "$SCRIPTS_DIR/security-check.sh"
    )
    
    for script in "${scripts[@]}"; do
        if [[ -f "$script" ]]; then
            check_file_permissions "$script" "755" "Script $(basename "$script")"
        else
            log "WARN" "Script not found: $script"
        fi
    done
}

check_directory_structure() {
    log "SECURITY" "Checking directory structure and permissions..."
    
    local directories=(
        "$PROJECT_DIR/.cloudflared:700"
        "$LOGS_DIR:755"
        "$SCRIPTS_DIR:755"
        "$PROJECT_DIR/pids:755"
    )
    
    for dir_perm in "${directories[@]}"; do
        local dir="${dir_perm%:*}"
        local perm="${dir_perm#*:}"
        
        if [[ -d "$dir" ]]; then
            check_directory_permissions "$dir" "$perm" "Directory $(basename "$dir")"
        else
            log "WARN" "Directory not found: $dir"
            log "INFO" "Creating directory: $dir"
            mkdir -p "$dir"
            chmod "$perm" "$dir"
        fi
    done
}

check_network_security() {
    log "SECURITY" "Checking network security configuration..."
    
    # Check if cloudflared is running
    if pgrep -f "cloudflared" > /dev/null; then
        log "INFO" "Cloudflared process is running"
        
        # Check listening ports
        local listening_ports=$(netstat -tlnp 2>/dev/null | grep cloudflared | awk '{print $4}' | cut -d: -f2)
        if [[ -n "$listening_ports" ]]; then
            log "INFO" "Cloudflared listening on ports: $(echo $listening_ports | tr '\n' ' ')"
        fi
    else
        log "WARN" "Cloudflared process is not running"
    fi
    
    # Check firewall status (if ufw is available)
    if command -v ufw >/dev/null 2>&1; then
        local ufw_status=$(ufw status 2>/dev/null | head -1)
        log "INFO" "Firewall status: $ufw_status"
    fi
}

check_log_security() {
    log "SECURITY" "Checking log file security..."
    
    # Check log directory permissions
    check_directory_permissions "$LOGS_DIR" "755" "Logs directory"
    
    # Check individual log files
    for log_file in "$LOGS_DIR"/*.log; do
        if [[ -f "$log_file" ]]; then
            check_file_permissions "$log_file" "644" "Log file $(basename "$log_file")"
            
            # Check log file size (warn if > 100MB)
            local size=$(stat -c%s "$log_file" 2>/dev/null || echo 0)
            if [[ $size -gt 104857600 ]]; then
                log "WARN" "Log file is large ($(($size / 1024 / 1024))MB): $log_file"
            fi
        fi
    done
}

validate_tunnel_connectivity() {
    log "SECURITY" "Validating tunnel connectivity..."
    
    # Load environment variables
    if [[ -f "$ENV_FILE" ]]; then
        source "$ENV_FILE"
    fi
    
    # Test tunnel connectivity
    if [[ -n "$DOMAIN" ]]; then
        log "INFO" "Testing connectivity to $DOMAIN"
        if curl -s --max-time 10 "https://$DOMAIN" > /dev/null; then
            log "INFO" "Tunnel connectivity test passed"
        else
            log "WARN" "Tunnel connectivity test failed"
        fi
    fi
}

generate_security_report() {
    local report_file="$LOGS_DIR/security-report-$(date +%Y%m%d-%H%M%S).txt"
    
    log "INFO" "Generating security report: $report_file"
    
    cat > "$report_file" << EOF
SIDARSIH Cloudflare Tunnel Security Report
Generated: $(date)
========================================

System Information:
- Hostname: $(hostname)
- User: $(whoami)
- OS: $(uname -a)

File Permissions:
$(ls -la "$CREDENTIALS_FILE" 2>/dev/null || echo "Credentials file not found")
$(ls -la "$CONFIG_FILE" 2>/dev/null || echo "Config file not found")
$(ls -la "$ENV_FILE" 2>/dev/null || echo "Environment file not found")

Directory Permissions:
$(ls -ld "$PROJECT_DIR/.cloudflared" 2>/dev/null || echo ".cloudflared directory not found")
$(ls -ld "$LOGS_DIR" 2>/dev/null || echo "Logs directory not found")
$(ls -ld "$SCRIPTS_DIR" 2>/dev/null || echo "Scripts directory not found")

Running Processes:
$(ps aux | grep -E "(cloudflared|pm2)" | grep -v grep)

Network Connections:
$(netstat -tlnp 2>/dev/null | grep -E "(cloudflared|node)" || echo "No relevant network connections found")

Recent Security Log Entries:
$(tail -20 "$SECURITY_LOG" 2>/dev/null || echo "No security log entries found")
EOF

    log "INFO" "Security report generated: $report_file"
}

# Main security check function
main() {
    log "SECURITY" "Starting SIDARSIH Cloudflare Tunnel security validation..."
    log "INFO" "Security check started at $(date)"
    
    local exit_code=0
    
    # Run all security checks
    validate_credentials_file || exit_code=1
    validate_config_file || exit_code=1
    validate_environment_file || exit_code=1
    check_script_permissions || exit_code=1
    check_directory_structure || exit_code=1
    check_network_security || exit_code=1
    check_log_security || exit_code=1
    validate_tunnel_connectivity || exit_code=1
    
    # Generate security report
    generate_security_report
    
    if [[ $exit_code -eq 0 ]]; then
        log "SECURITY" "All security checks passed successfully!"
        log "INFO" "Security validation completed successfully"
    else
        log "ERROR" "Some security checks failed. Please review the issues above."
        log "ERROR" "Security validation completed with errors"
    fi
    
    log "INFO" "Security check completed at $(date)"
    return $exit_code
}

# Handle script arguments
case "${1:-}" in
    --help|-h)
        echo "SIDARSIH Cloudflare Tunnel Security Validation Script"
        echo ""
        echo "Usage: $0 [OPTIONS]"
        echo ""
        echo "Options:"
        echo "  --help, -h     Show this help message"
        echo "  --report, -r   Generate security report only"
        echo "  --fix, -f      Attempt to fix permission issues automatically"
        echo ""
        echo "This script validates:"
        echo "  - Cloudflare credentials and permissions"
        echo "  - Configuration file security"
        echo "  - Environment variable security"
        echo "  - Script and directory permissions"
        echo "  - Network security configuration"
        echo "  - Log file security"
        echo "  - Tunnel connectivity"
        exit 0
        ;;
    --report|-r)
        generate_security_report
        exit 0
        ;;
    --fix|-f)
        log "INFO" "Running security check with automatic fixes enabled"
        main
        exit $?
        ;;
    "")
        main
        exit $?
        ;;
    *)
        log "ERROR" "Unknown option: $1"
        log "INFO" "Use --help for usage information"
        exit 1
        ;;
esac