#!/bin/bash

# SIDARSIH Cloudflare Tunnel Installation Script
# This script automates the complete setup and validation of the Cloudflare Tunnel

# Configuration
PROJECT_DIR="/home/dell/KP2A-CIMAHI/KP2A"
SCRIPTS_DIR="$PROJECT_DIR/scripts"
LOGS_DIR="$PROJECT_DIR/logs"
PIDS_DIR="$PROJECT_DIR/pids"
BACKUP_DIR="$PROJECT_DIR/backups"
CONFIG_FILE="$PROJECT_DIR/cloudflared-config-proxmox.yml"
ENV_FILE="$PROJECT_DIR/.env.tunnel"
ECOSYSTEM_FILE="$PROJECT_DIR/ecosystem-tunnel.config.js"
INSTALL_LOG="$LOGS_DIR/installation.log"

# Installation configuration
CLOUDFLARED_VERSION="latest"
NODE_MIN_VERSION="16.0.0"
PM2_MIN_VERSION="5.0.0"
REQUIRED_PORTS=(3001 3003 3004 5173 8080 8081 8082)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Create necessary directories
mkdir -p "$LOGS_DIR" "$PIDS_DIR" "$BACKUP_DIR" "$SCRIPTS_DIR"

# Logging function
log() {
    local level=$1
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [$level] $message" >> "$INSTALL_LOG"
    
    case $level in
        "ERROR")   echo -e "${RED}[ERROR]${NC} $message" ;;
        "WARN")    echo -e "${YELLOW}[WARN]${NC} $message" ;;
        "INFO")    echo -e "${GREEN}[INFO]${NC} $message" ;;
        "DEBUG")   echo -e "${BLUE}[DEBUG]${NC} $message" ;;
        "INSTALL") echo -e "${PURPLE}[INSTALL]${NC} $message" ;;
        "SUCCESS") echo -e "${GREEN}${BOLD}[SUCCESS]${NC} $message" ;;
        *)         echo -e "${CYAN}[$level]${NC} $message" ;;
    esac
}

# Progress indicator
show_progress() {
    local current=$1
    local total=$2
    local description=$3
    local percentage=$((current * 100 / total))
    local bar_length=50
    local filled_length=$((percentage * bar_length / 100))
    
    printf "\r${BLUE}[%3d%%]${NC} [" "$percentage"
    printf "%*s" "$filled_length" | tr ' ' '='
    printf "%*s" $((bar_length - filled_length)) | tr ' ' '-'
    printf "] %s" "$description"
    
    if [[ $current -eq $total ]]; then
        echo ""
    fi
}

# Version comparison function
version_compare() {
    local version1=$1
    local version2=$2
    
    if [[ "$version1" == "$version2" ]]; then
        return 0
    fi
    
    local IFS=.
    local i ver1=($version1) ver2=($version2)
    
    for ((i=${#ver1[@]}; i<${#ver2[@]}; i++)); do
        ver1[i]=0
    done
    
    for ((i=0; i<${#ver1[@]}; i++)); do
        if [[ -z ${ver2[i]} ]]; then
            ver2[i]=0
        fi
        if ((10#${ver1[i]} > 10#${ver2[i]})); then
            return 1
        fi
        if ((10#${ver1[i]} < 10#${ver2[i]})); then
            return 2
        fi
    done
    return 0
}

# Check system requirements
check_system_requirements() {
    log "INSTALL" "Checking system requirements..."
    
    local requirements_met=true
    
    # Check operating system
    if [[ "$(uname)" != "Linux" ]]; then
        log "ERROR" "This script requires Linux operating system"
        requirements_met=false
    else
        log "INFO" "Operating system: $(uname -a)"
    fi
    
    # Check architecture
    local arch=$(uname -m)
    if [[ "$arch" != "x86_64" && "$arch" != "aarch64" ]]; then
        log "WARN" "Unsupported architecture: $arch (supported: x86_64, aarch64)"
    else
        log "INFO" "Architecture: $arch"
    fi
    
    # Check available disk space (minimum 1GB)
    local available_space=$(df "$PROJECT_DIR" | tail -1 | awk '{print $4}')
    local available_gb=$((available_space / 1024 / 1024))
    
    if [[ $available_gb -lt 1 ]]; then
        log "ERROR" "Insufficient disk space: ${available_gb}GB (minimum: 1GB)"
        requirements_met=false
    else
        log "INFO" "Available disk space: ${available_gb}GB"
    fi
    
    # Check memory (minimum 512MB)
    local total_memory=$(free -m | grep "Mem:" | awk '{print $2}')
    if [[ $total_memory -lt 512 ]]; then
        log "WARN" "Low memory: ${total_memory}MB (recommended: 1GB+)"
    else
        log "INFO" "Total memory: ${total_memory}MB"
    fi
    
    if [[ "$requirements_met" == "false" ]]; then
        log "ERROR" "System requirements not met"
        return 1
    fi
    
    log "SUCCESS" "System requirements check passed"
    return 0
}

# Check and install Node.js
check_install_nodejs() {
    log "INSTALL" "Checking Node.js installation..."
    
    if command -v node >/dev/null 2>&1; then
        local node_version=$(node --version | sed 's/v//')
        log "INFO" "Node.js found: v$node_version"
        
        version_compare "$node_version" "$NODE_MIN_VERSION"
        local result=$?
        
        if [[ $result -eq 2 ]]; then
            log "ERROR" "Node.js version too old: v$node_version (minimum: v$NODE_MIN_VERSION)"
            return 1
        else
            log "SUCCESS" "Node.js version is compatible"
            return 0
        fi
    else
        log "WARN" "Node.js not found, installation required"
        log "INFO" "Please install Node.js v$NODE_MIN_VERSION or later"
        log "INFO" "Visit: https://nodejs.org/en/download/"
        return 1
    fi
}

# Check and install PM2
check_install_pm2() {
    log "INSTALL" "Checking PM2 installation..."
    
    if command -v pm2 >/dev/null 2>&1; then
        local pm2_version=$(pm2 --version)
        log "INFO" "PM2 found: v$pm2_version"
        
        version_compare "$pm2_version" "$PM2_MIN_VERSION"
        local result=$?
        
        if [[ $result -eq 2 ]]; then
            log "WARN" "PM2 version might be too old: v$pm2_version (recommended: v$PM2_MIN_VERSION+)"
        else
            log "SUCCESS" "PM2 version is compatible"
        fi
        
        return 0
    else
        log "INFO" "Installing PM2 globally..."
        npm install -g pm2
        
        if [[ $? -eq 0 ]]; then
            log "SUCCESS" "PM2 installed successfully"
            return 0
        else
            log "ERROR" "Failed to install PM2"
            return 1
        fi
    fi
}

# Check and install Cloudflared
check_install_cloudflared() {
    log "INSTALL" "Checking Cloudflared installation..."
    
    if command -v cloudflared >/dev/null 2>&1; then
        local cloudflared_version=$(cloudflared --version 2>&1 | head -1)
        log "INFO" "Cloudflared found: $cloudflared_version"
        log "SUCCESS" "Cloudflared is available"
        return 0
    else
        log "INFO" "Installing Cloudflared..."
        
        # Detect architecture
        local arch=$(uname -m)
        local download_url=""
        
        case $arch in
            "x86_64")
                download_url="https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64"
                ;;
            "aarch64")
                download_url="https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64"
                ;;
            *)
                log "ERROR" "Unsupported architecture for Cloudflared: $arch"
                return 1
                ;;
        esac
        
        # Download and install
        local temp_file="/tmp/cloudflared"
        curl -L "$download_url" -o "$temp_file"
        
        if [[ $? -eq 0 ]]; then
            chmod +x "$temp_file"
            sudo mv "$temp_file" /usr/local/bin/cloudflared
            
            if [[ $? -eq 0 ]]; then
                log "SUCCESS" "Cloudflared installed successfully"
                return 0
            else
                log "ERROR" "Failed to install Cloudflared (permission denied)"
                return 1
            fi
        else
            log "ERROR" "Failed to download Cloudflared"
            return 1
        fi
    fi
}

# Check port availability
check_port_availability() {
    log "INSTALL" "Checking port availability..."
    
    local ports_in_use=()
    
    for port in "${REQUIRED_PORTS[@]}"; do
        if netstat -tlnp 2>/dev/null | grep -q ":$port "; then
            ports_in_use+=("$port")
            log "WARN" "Port $port is already in use"
        else
            log "DEBUG" "Port $port is available"
        fi
    done
    
    if [[ ${#ports_in_use[@]} -gt 0 ]]; then
        log "WARN" "Some required ports are in use: ${ports_in_use[*]}"
        log "INFO" "You may need to stop conflicting services or modify port configuration"
        return 1
    else
        log "SUCCESS" "All required ports are available"
        return 0
    fi
}

# Backup existing configuration
backup_existing_config() {
    log "INSTALL" "Backing up existing configuration..."
    
    local backup_timestamp=$(date +%Y%m%d-%H%M%S)
    local backup_archive="$BACKUP_DIR/config-backup-$backup_timestamp.tar.gz"
    
    local files_to_backup=()
    
    # Check for existing files
    [[ -f "$CONFIG_FILE" ]] && files_to_backup+=("$CONFIG_FILE")
    [[ -f "$ENV_FILE" ]] && files_to_backup+=("$ENV_FILE")
    [[ -f "$ECOSYSTEM_FILE" ]] && files_to_backup+=("$ECOSYSTEM_FILE")
    [[ -d "$PROJECT_DIR/.cloudflared" ]] && files_to_backup+=("$PROJECT_DIR/.cloudflared")
    
    if [[ ${#files_to_backup[@]} -gt 0 ]]; then
        tar -czf "$backup_archive" "${files_to_backup[@]}" 2>/dev/null
        
        if [[ $? -eq 0 ]]; then
            log "SUCCESS" "Configuration backed up to: $backup_archive"
        else
            log "ERROR" "Failed to create backup archive"
            return 1
        fi
    else
        log "INFO" "No existing configuration found to backup"
    fi
    
    return 0
}

# Install configuration files
install_config_files() {
    log "INSTALL" "Installing configuration files..."
    
    # Check if configuration files exist
    local config_files=(
        "$CONFIG_FILE:Cloudflared configuration"
        "$ENV_FILE:Environment variables"
        "$ECOSYSTEM_FILE:PM2 ecosystem configuration"
    )
    
    local missing_files=()
    
    for config_info in "${config_files[@]}"; do
        local config_file="${config_info%:*}"
        local description="${config_info#*:}"
        
        if [[ ! -f "$config_file" ]]; then
            missing_files+=("$description")
            log "ERROR" "$description not found: $config_file"
        else
            log "SUCCESS" "$description found: $config_file"
        fi
    done
    
    if [[ ${#missing_files[@]} -gt 0 ]]; then
        log "ERROR" "Missing configuration files: ${missing_files[*]}"
        log "INFO" "Please ensure all configuration files are created before installation"
        return 1
    fi
    
    # Validate configuration files
    log "INFO" "Validating configuration files..."
    
    # Validate YAML syntax
    if ! python3 -c "import yaml; yaml.safe_load(open('$CONFIG_FILE'))" 2>/dev/null; then
        log "ERROR" "Invalid YAML syntax in configuration file"
        return 1
    fi
    
    # Validate environment file
    if ! source "$ENV_FILE" 2>/dev/null; then
        log "ERROR" "Invalid environment file syntax"
        return 1
    fi
    
    # Validate PM2 ecosystem file
    if ! node -c "$ECOSYSTEM_FILE" 2>/dev/null; then
        log "ERROR" "Invalid JavaScript syntax in PM2 ecosystem file"
        return 1
    fi
    
    log "SUCCESS" "Configuration files validation passed"
    return 0
}

# Setup Cloudflare authentication
setup_cloudflare_auth() {
    log "INSTALL" "Setting up Cloudflare authentication..."
    
    local credentials_file="$PROJECT_DIR/.cloudflared/credentials.json"
    
    if [[ -f "$credentials_file" ]]; then
        log "INFO" "Cloudflare credentials already exist"
        
        # Validate credentials
        if jq empty "$credentials_file" 2>/dev/null; then
            local tunnel_id=$(jq -r '.TunnelID // empty' "$credentials_file")
            if [[ -n "$tunnel_id" ]]; then
                log "SUCCESS" "Valid Cloudflare credentials found (Tunnel ID: $tunnel_id)"
                return 0
            else
                log "ERROR" "Invalid credentials file (missing Tunnel ID)"
                return 1
            fi
        else
            log "ERROR" "Credentials file is not valid JSON"
            return 1
        fi
    else
        log "WARN" "Cloudflare credentials not found"
        log "INFO" "Please run the following commands to authenticate:"
        log "INFO" "1. cloudflared tunnel login"
        log "INFO" "2. cloudflared tunnel create sidarsih-tunnel"
        log "INFO" "3. Copy the credentials file to: $credentials_file"
        return 1
    fi
}

# Install and configure scripts
install_scripts() {
    log "INSTALL" "Installing and configuring scripts..."
    
    local scripts=(
        "$SCRIPTS_DIR/start-tunnel-pm2.sh:Tunnel startup script"
        "$SCRIPTS_DIR/tunnel-monitor.js:Tunnel monitoring script"
        "$SCRIPTS_DIR/metrics-collector.js:Metrics collection script"
        "$SCRIPTS_DIR/security-check.sh:Security validation script"
        "$SCRIPTS_DIR/automated-monitoring.sh:Automated monitoring script"
        "$SCRIPTS_DIR/cleanup.sh:System cleanup script"
    )
    
    local missing_scripts=()
    
    for script_info in "${scripts[@]}"; do
        local script_file="${script_info%:*}"
        local description="${script_info#*:}"
        
        if [[ -f "$script_file" ]]; then
            # Make script executable
            chmod +x "$script_file"
            log "SUCCESS" "$description installed: $script_file"
        else
            missing_scripts+=("$description")
            log "ERROR" "$description not found: $script_file"
        fi
    done
    
    if [[ ${#missing_scripts[@]} -gt 0 ]]; then
        log "ERROR" "Missing scripts: ${missing_scripts[*]}"
        return 1
    fi
    
    log "SUCCESS" "All scripts installed and configured"
    return 0
}

# Test tunnel configuration
test_tunnel_config() {
    log "INSTALL" "Testing tunnel configuration..."
    
    # Test configuration file syntax
    cloudflared tunnel --config "$CONFIG_FILE" ingress validate
    
    if [[ $? -eq 0 ]]; then
        log "SUCCESS" "Tunnel configuration validation passed"
    else
        log "ERROR" "Tunnel configuration validation failed"
        return 1
    fi
    
    # Test connectivity (dry run)
    log "INFO" "Testing tunnel connectivity (dry run)..."
    timeout 10 cloudflared tunnel --config "$CONFIG_FILE" run --dry-run 2>/dev/null
    
    if [[ $? -eq 0 ]]; then
        log "SUCCESS" "Tunnel connectivity test passed"
    else
        log "WARN" "Tunnel connectivity test failed (this may be normal if tunnel is not yet configured)"
    fi
    
    return 0
}

# Setup PM2 startup
setup_pm2_startup() {
    log "INSTALL" "Setting up PM2 startup configuration..."
    
    # Generate PM2 startup script
    pm2 startup
    
    if [[ $? -eq 0 ]]; then
        log "SUCCESS" "PM2 startup configuration generated"
        log "INFO" "Please run the displayed command with sudo to complete PM2 startup setup"
    else
        log "WARN" "Failed to generate PM2 startup configuration"
    fi
    
    return 0
}

# Run security check
run_security_check() {
    log "INSTALL" "Running security validation..."
    
    if [[ -f "$SCRIPTS_DIR/security-check.sh" ]]; then
        "$SCRIPTS_DIR/security-check.sh" --fix
        
        if [[ $? -eq 0 ]]; then
            log "SUCCESS" "Security validation passed"
        else
            log "WARN" "Security validation completed with warnings"
        fi
    else
        log "WARN" "Security check script not found, skipping security validation"
    fi
    
    return 0
}

# Generate installation report
generate_installation_report() {
    local report_file="$LOGS_DIR/installation-report-$(date +%Y%m%d-%H%M%S).json"
    
    log "INFO" "Generating installation report: $report_file"
    
    # Collect system information
    local node_version=$(node --version 2>/dev/null || echo "not installed")
    local pm2_version=$(pm2 --version 2>/dev/null || echo "not installed")
    local cloudflared_version=$(cloudflared --version 2>&1 | head -1 || echo "not installed")
    local os_info=$(uname -a)
    local total_memory=$(free -m | grep "Mem:" | awk '{print $2}')
    local available_space=$(df -h "$PROJECT_DIR" | tail -1 | awk '{print $4}')
    
    cat > "$report_file" << EOF
{
  "timestamp": "$(date -Iseconds)",
  "installation_summary": {
    "status": "completed",
    "project_directory": "$PROJECT_DIR",
    "installation_log": "$INSTALL_LOG"
  },
  "system_information": {
    "operating_system": "$os_info",
    "total_memory_mb": $total_memory,
    "available_disk_space": "$available_space",
    "architecture": "$(uname -m)"
  },
  "software_versions": {
    "nodejs": "$node_version",
    "pm2": "$pm2_version",
    "cloudflared": "$cloudflared_version"
  },
  "configuration_files": {
    "cloudflared_config": "$(test -f "$CONFIG_FILE" && echo "installed" || echo "missing")",
    "environment_file": "$(test -f "$ENV_FILE" && echo "installed" || echo "missing")",
    "pm2_ecosystem": "$(test -f "$ECOSYSTEM_FILE" && echo "installed" || echo "missing")",
    "credentials_file": "$(test -f "$PROJECT_DIR/.cloudflared/credentials.json" && echo "installed" || echo "missing")"
  },
  "scripts": {
    "startup_script": "$(test -f "$SCRIPTS_DIR/start-tunnel-pm2.sh" && echo "installed" || echo "missing")",
    "monitoring_script": "$(test -f "$SCRIPTS_DIR/tunnel-monitor.js" && echo "installed" || echo "missing")",
    "security_script": "$(test -f "$SCRIPTS_DIR/security-check.sh" && echo "installed" || echo "missing")",
    "cleanup_script": "$(test -f "$SCRIPTS_DIR/cleanup.sh" && echo "installed" || echo "missing")"
  },
  "port_configuration": {
    "required_ports": [$(IFS=,; echo "${REQUIRED_PORTS[*]}")],
    "port_check_status": "$(check_port_availability >/dev/null 2>&1 && echo "available" || echo "conflicts")"
  },
  "next_steps": [
    "Configure Cloudflare tunnel authentication if not done",
    "Update environment variables with your specific settings",
    "Run security check: ./scripts/security-check.sh",
    "Start tunnel: ./scripts/start-tunnel-pm2.sh",
    "Monitor status: ./scripts/automated-monitoring.sh --status"
  ]
}
EOF

    log "SUCCESS" "Installation report generated: $report_file"
}

# Main installation function
main_installation() {
    log "INSTALL" "Starting SIDARSIH Cloudflare Tunnel installation..."
    log "INFO" "Installation started at $(date)"
    log "INFO" "Project directory: $PROJECT_DIR"
    
    local total_steps=12
    local current_step=0
    
    # Step 1: Check system requirements
    current_step=$((current_step + 1))
    show_progress $current_step $total_steps "Checking system requirements"
    check_system_requirements || exit 1
    
    # Step 2: Check Node.js
    current_step=$((current_step + 1))
    show_progress $current_step $total_steps "Checking Node.js installation"
    check_install_nodejs || exit 1
    
    # Step 3: Check PM2
    current_step=$((current_step + 1))
    show_progress $current_step $total_steps "Checking PM2 installation"
    check_install_pm2 || exit 1
    
    # Step 4: Check Cloudflared
    current_step=$((current_step + 1))
    show_progress $current_step $total_steps "Checking Cloudflared installation"
    check_install_cloudflared || exit 1
    
    # Step 5: Check port availability
    current_step=$((current_step + 1))
    show_progress $current_step $total_steps "Checking port availability"
    check_port_availability  # Don't exit on failure, just warn
    
    # Step 6: Backup existing configuration
    current_step=$((current_step + 1))
    show_progress $current_step $total_steps "Backing up existing configuration"
    backup_existing_config || exit 1
    
    # Step 7: Install configuration files
    current_step=$((current_step + 1))
    show_progress $current_step $total_steps "Installing configuration files"
    install_config_files || exit 1
    
    # Step 8: Setup Cloudflare authentication
    current_step=$((current_step + 1))
    show_progress $current_step $total_steps "Setting up Cloudflare authentication"
    setup_cloudflare_auth  # Don't exit on failure, just warn
    
    # Step 9: Install scripts
    current_step=$((current_step + 1))
    show_progress $current_step $total_steps "Installing and configuring scripts"
    install_scripts || exit 1
    
    # Step 10: Test tunnel configuration
    current_step=$((current_step + 1))
    show_progress $current_step $total_steps "Testing tunnel configuration"
    test_tunnel_config || exit 1
    
    # Step 11: Setup PM2 startup
    current_step=$((current_step + 1))
    show_progress $current_step $total_steps "Setting up PM2 startup"
    setup_pm2_startup
    
    # Step 12: Run security check
    current_step=$((current_step + 1))
    show_progress $current_step $total_steps "Running security validation"
    run_security_check
    
    # Generate installation report
    generate_installation_report
    
    log "SUCCESS" "SIDARSIH Cloudflare Tunnel installation completed successfully!"
    log "INFO" "Installation finished at $(date)"
    
    # Display next steps
    echo ""
    echo -e "${BOLD}${GREEN}Installation Complete!${NC}"
    echo ""
    echo -e "${BOLD}Next Steps:${NC}"
    echo "1. Configure Cloudflare tunnel authentication (if not done):"
    echo "   cloudflared tunnel login"
    echo "   cloudflared tunnel create sidarsih-tunnel"
    echo ""
    echo "2. Update environment variables in .env.tunnel with your settings"
    echo ""
    echo "3. Run security check:"
    echo "   ./scripts/security-check.sh"
    echo ""
    echo "4. Start the tunnel:"
    echo "   ./scripts/start-tunnel-pm2.sh"
    echo ""
    echo "5. Monitor the tunnel:"
    echo "   ./scripts/automated-monitoring.sh --status"
    echo ""
    echo -e "${BOLD}Useful Commands:${NC}"
    echo "  View logs: tail -f logs/installation.log"
    echo "  Check status: pm2 status"
    echo "  Stop tunnel: pm2 stop sidarsih-cloudflare-tunnel"
    echo "  Restart tunnel: pm2 restart sidarsih-cloudflare-tunnel"
    echo ""
}

# Uninstall function
uninstall_tunnel() {
    log "INSTALL" "Starting SIDARSIH Cloudflare Tunnel uninstallation..."
    
    # Stop PM2 processes
    if command -v pm2 >/dev/null 2>&1; then
        pm2 stop sidarsih-cloudflare-tunnel 2>/dev/null
        pm2 stop sidarsih-tunnel-monitor 2>/dev/null
        pm2 stop sidarsih-tunnel-metrics 2>/dev/null
        pm2 delete sidarsih-cloudflare-tunnel 2>/dev/null
        pm2 delete sidarsih-tunnel-monitor 2>/dev/null
        pm2 delete sidarsih-tunnel-metrics 2>/dev/null
        log "INFO" "PM2 processes stopped and removed"
    fi
    
    # Backup configuration before removal
    backup_existing_config
    
    # Remove configuration files (with confirmation)
    read -p "Remove configuration files? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        rm -f "$CONFIG_FILE" "$ENV_FILE" "$ECOSYSTEM_FILE"
        rm -rf "$PROJECT_DIR/.cloudflared"
        log "INFO" "Configuration files removed"
    fi
    
    # Remove scripts (with confirmation)
    read -p "Remove scripts? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        rm -rf "$SCRIPTS_DIR"
        log "INFO" "Scripts removed"
    fi
    
    # Keep logs and backups by default
    log "INFO" "Logs and backups preserved in: $LOGS_DIR and $BACKUP_DIR"
    
    log "SUCCESS" "SIDARSIH Cloudflare Tunnel uninstallation completed"
}

# Handle script arguments
case "${1:-}" in
    --help|-h)
        echo "SIDARSIH Cloudflare Tunnel Installation Script"
        echo ""
        echo "Usage: $0 [OPTIONS]"
        echo ""
        echo "Options:"
        echo "  --help, -h        Show this help message"
        echo "  --install, -i     Run full installation (default)"
        echo "  --uninstall, -u   Uninstall tunnel configuration"
        echo "  --check, -c       Check system requirements only"
        echo "  --validate, -v    Validate existing installation"
        echo "  --repair, -r      Repair broken installation"
        echo ""
        echo "Requirements:"
        echo "  - Linux operating system"
        echo "  - Node.js v$NODE_MIN_VERSION or later"
        echo "  - PM2 v$PM2_MIN_VERSION or later"
        echo "  - Cloudflared (will be installed if missing)"
        echo "  - Available ports: ${REQUIRED_PORTS[*]}"
        echo "  - Minimum 1GB disk space"
        echo "  - Minimum 512MB RAM"
        echo ""
        echo "Configuration files required:"
        echo "  - $CONFIG_FILE"
        echo "  - $ENV_FILE"
        echo "  - $ECOSYSTEM_FILE"
        exit 0
        ;;
    --install|-i|"")
        main_installation
        ;;
    --uninstall|-u)
        uninstall_tunnel
        ;;
    --check|-c)
        log "INFO" "Checking system requirements only..."
        check_system_requirements
        check_install_nodejs
        check_install_pm2
        check_install_cloudflared
        check_port_availability
        log "INFO" "System requirements check completed"
        ;;
    --validate|-v)
        log "INFO" "Validating existing installation..."
        install_config_files
        setup_cloudflare_auth
        test_tunnel_config
        run_security_check
        log "INFO" "Installation validation completed"
        ;;
    --repair|-r)
        log "INFO" "Repairing installation..."
        backup_existing_config
        install_scripts
        test_tunnel_config
        run_security_check
        log "INFO" "Installation repair completed"
        ;;
    *)
        log "ERROR" "Unknown option: $1"
        log "INFO" "Use --help for usage information"
        exit 1
        ;;
esac