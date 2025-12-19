#!/bin/bash

# Production Rollback Script for sidarsih.site
# This script handles rollback to previous deployment

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
BACKUP_DIR="/home/dell/KP2A-CIMAHI/backups"
DOMAIN="sidarsih.site"

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}=== $1 ===${NC}"
}

# Function to list available backups
list_backups() {
    print_header "Available Backups"
    
    if [ ! -d "$BACKUP_DIR" ]; then
        print_error "Backup directory not found: $BACKUP_DIR"
        exit 1
    fi
    
    local backups=($(ls -1t "$BACKUP_DIR" | grep "^backup_"))
    
    if [ ${#backups[@]} -eq 0 ]; then
        print_error "No backups found in $BACKUP_DIR"
        exit 1
    fi
    
    echo "Available backups:"
    for i in "${!backups[@]}"; do
        local backup="${backups[$i]}"
        local backup_path="$BACKUP_DIR/$backup"
        local backup_date=""
        
        if [ -f "$backup_path/backup_info.txt" ]; then
            backup_date=$(grep "Backup created:" "$backup_path/backup_info.txt" | cut -d: -f2- | xargs)
        fi
        
        echo "  $((i+1)). $backup"
        if [ -n "$backup_date" ]; then
            echo "     Created: $backup_date"
        fi
        
        if [ -f "$backup_path/backup_info.txt" ]; then
            local git_commit=$(grep "Git commit:" "$backup_path/backup_info.txt" | cut -d: -f2 | xargs)
            local git_branch=$(grep "Git branch:" "$backup_path/backup_info.txt" | cut -d: -f2 | xargs)
            if [ "$git_commit" != "N/A" ]; then
                echo "     Git: $git_branch ($git_commit)"
            fi
        fi
        echo
    done
    
    echo "${backups[@]}"
}

# Function to select backup
select_backup() {
    local backups_array=($1)
    
    if [ ${#backups_array[@]} -eq 1 ]; then
        echo "${backups_array[0]}"
        return
    fi
    
    while true; do
        read -p "Select backup number (1-${#backups_array[@]}): " selection
        
        if [[ "$selection" =~ ^[0-9]+$ ]] && [ "$selection" -ge 1 ] && [ "$selection" -le ${#backups_array[@]} ]; then
            echo "${backups_array[$((selection-1))]}"
            return
        else
            print_error "Invalid selection. Please enter a number between 1 and ${#backups_array[@]}"
        fi
    done
}

# Function to show backup details
show_backup_details() {
    local backup_name="$1"
    local backup_path="$BACKUP_DIR/$backup_name"
    
    print_header "Backup Details: $backup_name"
    
    if [ -f "$backup_path/backup_info.txt" ]; then
        cat "$backup_path/backup_info.txt"
    else
        print_warning "Backup info not available"
    fi
    
    echo
    echo "Backup contents:"
    ls -la "$backup_path" 2>/dev/null || print_warning "Could not list backup contents"
}

# Function to create pre-rollback backup
create_pre_rollback_backup() {
    print_header "Creating Pre-Rollback Backup"
    
    local timestamp=$(date +"%Y%m%d_%H%M%S")
    local pre_rollback_backup="pre_rollback_$timestamp"
    local backup_path="$BACKUP_DIR/$pre_rollback_backup"
    
    mkdir -p "$backup_path"
    
    # Backup current state
    print_status "Backing up current state..."
    cp -r "$PROJECT_DIR" "$backup_path/app" 2>/dev/null || true
    
    # Backup PM2 state
    pm2 save --force 2>/dev/null || true
    cp ~/.pm2/dump.pm2 "$backup_path/pm2_dump.pm2" 2>/dev/null || true
    
    # Create backup info
    cat > "$backup_path/backup_info.txt" << EOF
Pre-rollback backup created: $(date)
Domain: $DOMAIN
Project directory: $PROJECT_DIR
Backend directory: $BACKEND_DIR
Git commit: $(cd "$PROJECT_DIR" && git rev-parse HEAD 2>/dev/null || echo "N/A")
Git branch: $(cd "$PROJECT_DIR" && git branch --show-current 2>/dev/null || echo "N/A")
Node version: $(node --version 2>/dev/null || echo "N/A")
PM2 version: $(pm2 --version 2>/dev/null || echo "N/A")
EOF
    
    print_status "Pre-rollback backup created: $backup_path"
    echo "$backup_path" > "$PROJECT_DIR/.pre_rollback_backup"
}

# Function to stop current services
stop_services() {
    print_header "Stopping Current Services"
    
    # Stop PM2 processes
    print_status "Stopping PM2 processes..."
    pm2 stop all 2>/dev/null || print_warning "Could not stop PM2 processes"
    
    # Wait for processes to stop
    sleep 5
    
    print_status "Services stopped"
}

# Function to restore from backup
restore_backup() {
    local backup_name="$1"
    local backup_path="$BACKUP_DIR/$backup_name"
    
    print_header "Restoring from Backup: $backup_name"
    
    if [ ! -d "$backup_path" ]; then
        print_error "Backup not found: $backup_path"
        exit 1
    fi
    
    # Restore application files
    if [ -d "$backup_path/app" ]; then
        print_status "Restoring application files..."
        
        # Remove current files (except .git)
        find "$PROJECT_DIR" -mindepth 1 -maxdepth 1 ! -name '.git' ! -name '.last_backup' ! -name '.pre_rollback_backup' -exec rm -rf {} + 2>/dev/null || true
        
        # Copy backup files
        cp -r "$backup_path/app/"* "$PROJECT_DIR/" 2>/dev/null || true
        
        print_status "Application files restored"
    else
        print_error "Application backup not found in $backup_path"
        exit 1
    fi
    
    # Restore PM2 configuration
    if [ -f "$backup_path/pm2_dump.pm2" ]; then
        print_status "Restoring PM2 configuration..."
        cp "$backup_path/pm2_dump.pm2" ~/.pm2/dump.pm2 2>/dev/null || true
        print_status "PM2 configuration restored"
    else
        print_warning "PM2 backup not found"
    fi
}

# Function to reinstall dependencies
reinstall_dependencies() {
    print_header "Reinstalling Dependencies"
    
    # Frontend dependencies
    print_status "Installing frontend dependencies..."
    cd "$PROJECT_DIR"
    if [ -f "package.json" ]; then
        npm ci --production=false
    else
        print_error "package.json not found in $PROJECT_DIR"
        exit 1
    fi
    
    # Backend dependencies
    print_status "Installing backend dependencies..."
    cd "$BACKEND_DIR"
    if [ -f "package.json" ]; then
        npm ci --production=false
    else
        print_error "package.json not found in $BACKEND_DIR"
        exit 1
    fi
    
    print_status "Dependencies reinstalled"
}

# Function to rebuild application
rebuild_application() {
    print_header "Rebuilding Application"
    
    cd "$PROJECT_DIR"
    
    # Build frontend
    print_status "Building frontend..."
    npm run build
    
    # Check if build was successful
    if [ ! -d "$PROJECT_DIR/dist" ]; then
        print_error "Frontend build failed - dist directory not found"
        exit 1
    fi
    
    print_status "Application rebuilt successfully"
}

# Function to restart services
restart_services() {
    print_header "Restarting Services"
    
    cd "$PROJECT_DIR"
    
    # Start PM2 processes
    print_status "Starting PM2 processes..."
    pm2 start ecosystem.config.js --env production
    
    # Wait for services to start
    sleep 10
    
    print_status "Services restarted"
}

# Function to verify rollback
verify_rollback() {
    print_header "Verifying Rollback"
    
    # Check PM2 processes
    print_status "Checking PM2 processes..."
    pm2 status
    
    # Check backend health
    print_status "Checking backend health..."
    if curl -f -s "http://localhost:3001/health" > /dev/null; then
        print_status "Backend health check passed"
    else
        print_error "Backend health check failed"
        return 1
    fi
    
    # Check frontend
    print_status "Checking frontend..."
    if [ -f "$PROJECT_DIR/dist/index.html" ]; then
        print_status "Frontend is available"
    else
        print_error "Frontend not found"
        return 1
    fi
    
    print_status "Rollback verification completed successfully"
}

# Function to show rollback summary
show_rollback_summary() {
    local backup_name="$1"
    
    print_header "Rollback Summary"
    
    echo "Rollback completed at: $(date)"
    echo "Restored from backup: $backup_name"
    echo "Domain: $DOMAIN"
    echo "Project directory: $PROJECT_DIR"
    
    if [ -f "$PROJECT_DIR/.pre_rollback_backup" ]; then
        echo "Pre-rollback backup: $(cat "$PROJECT_DIR/.pre_rollback_backup")"
    fi
    
    echo
    echo "Services:"
    echo "- Backend: http://localhost:3001"
    echo "- Frontend: $PROJECT_DIR/dist"
    echo "- Domain: https://$DOMAIN"
    echo
    echo "PM2 Status:"
    pm2 status
}

# Main rollback function
main() {
    print_header "Starting Rollback for $DOMAIN"
    
    # List and select backup
    local backups_string=$(list_backups)
    local selected_backup=$(select_backup "$backups_string")
    
    # Show backup details
    show_backup_details "$selected_backup"
    
    # Confirm rollback
    echo
    read -p "Are you sure you want to rollback to this backup? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_status "Rollback cancelled"
        exit 0
    fi
    
    # Create pre-rollback backup
    if [ "$1" != "--no-backup" ]; then
        create_pre_rollback_backup
    fi
    
    # Perform rollback
    stop_services
    restore_backup "$selected_backup"
    reinstall_dependencies
    rebuild_application
    restart_services
    verify_rollback
    show_rollback_summary "$selected_backup"
    
    print_status "Rollback completed successfully!"
}

# Handle script arguments
case "$1" in
    --list|-l)
        list_backups > /dev/null
        exit 0
        ;;
    --help|-h)
        echo "Usage: $0 [OPTIONS]"
        echo "Options:"
        echo "  --list, -l     List available backups"
        echo "  --no-backup    Skip creating pre-rollback backup"
        echo "  --help, -h     Show this help message"
        exit 0
        ;;
    *)
        main "$@"
        ;;
esac