#!/bin/bash

# Production Deployment Script for sidarsih.site
# This script handles the complete deployment process

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
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="backup_$TIMESTAMP"

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

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check service status
check_service() {
    if systemctl is-active --quiet "$1"; then
        print_status "$1 is running"
        return 0
    else
        print_warning "$1 is not running"
        return 1
    fi
}

# Function to backup current deployment
backup_deployment() {
    print_header "Creating Backup"
    
    mkdir -p "$BACKUP_DIR"
    
    # Create backup directory
    BACKUP_PATH="$BACKUP_DIR/$BACKUP_NAME"
    mkdir -p "$BACKUP_PATH"
    
    # Backup application files
    print_status "Backing up application files..."
    cp -r "$PROJECT_DIR" "$BACKUP_PATH/app" 2>/dev/null || true
    
    # Backup PM2 processes
    print_status "Backing up PM2 configuration..."
    pm2 save --force 2>/dev/null || true
    cp ~/.pm2/dump.pm2 "$BACKUP_PATH/pm2_dump.pm2" 2>/dev/null || true
    
    # Backup Nginx configuration
    print_status "Backing up Nginx configuration..."
    if [ -f "/etc/nginx/sites-available/$DOMAIN" ]; then
        cp "/etc/nginx/sites-available/$DOMAIN" "$BACKUP_PATH/nginx_$DOMAIN.conf" 2>/dev/null || true
    fi
    
    # Create backup info file
    cat > "$BACKUP_PATH/backup_info.txt" << EOF
Backup created: $(date)
Domain: $DOMAIN
Project directory: $PROJECT_DIR
Backend directory: $BACKEND_DIR
Git commit: $(cd "$PROJECT_DIR" && git rev-parse HEAD 2>/dev/null || echo "N/A")
Git branch: $(cd "$PROJECT_DIR" && git branch --show-current 2>/dev/null || echo "N/A")
Node version: $(node --version 2>/dev/null || echo "N/A")
PM2 version: $(pm2 --version 2>/dev/null || echo "N/A")
EOF
    
    print_status "Backup created: $BACKUP_PATH"
    echo "$BACKUP_PATH" > "$PROJECT_DIR/.last_backup"
}

# Function to check prerequisites
check_prerequisites() {
    print_header "Checking Prerequisites"
    
    # Check if we're in the right directory
    if [ ! -f "$PROJECT_DIR/package.json" ]; then
        print_error "package.json not found in $PROJECT_DIR"
        exit 1
    fi
    
    # Check Node.js
    if ! command_exists node; then
        print_error "Node.js is not installed"
        exit 1
    fi
    
    # Check npm
    if ! command_exists npm; then
        print_error "npm is not installed"
        exit 1
    fi
    
    # Check PM2
    if ! command_exists pm2; then
        print_warning "PM2 is not installed. Installing..."
        npm install -g pm2
    fi
    
    # Check Git
    if ! command_exists git; then
        print_warning "Git is not installed"
    fi
    
    print_status "Prerequisites check completed"
}

# Function to update code
update_code() {
    print_header "Updating Code"
    
    cd "$PROJECT_DIR"
    
    # Stash any local changes
    if command_exists git; then
        print_status "Stashing local changes..."
        git stash push -m "Auto-stash before deployment $TIMESTAMP" 2>/dev/null || true
        
        # Pull latest changes
        print_status "Pulling latest changes..."
        git pull origin main 2>/dev/null || print_warning "Could not pull from git repository"
    else
        print_warning "Git not available, skipping code update"
    fi
}

# Function to install dependencies
install_dependencies() {
    print_header "Installing Dependencies"
    
    # Frontend dependencies
    print_status "Installing frontend dependencies..."
    cd "$PROJECT_DIR"
    npm ci --production=false
    
    # Backend dependencies
    print_status "Installing backend dependencies..."
    cd "$BACKEND_DIR"
    npm ci --production=false
    
    print_status "Dependencies installed successfully"
}

# Function to build application
build_application() {
    print_header "Building Application"
    
    # Build frontend
    print_status "Building frontend..."
    cd "$PROJECT_DIR"
    npm run build
    
    # Check if build was successful
    if [ ! -d "$PROJECT_DIR/dist" ]; then
        print_error "Frontend build failed - dist directory not found"
        exit 1
    fi
    
    print_status "Application built successfully"
}

# Function to run tests
run_tests() {
    print_header "Running Tests"
    
    # Frontend tests
    print_status "Running frontend tests..."
    cd "$PROJECT_DIR"
    npm run test:ci 2>/dev/null || print_warning "Frontend tests not available or failed"
    
    # Backend tests
    print_status "Running backend tests..."
    cd "$BACKEND_DIR"
    npm run test 2>/dev/null || print_warning "Backend tests not available or failed"
    
    print_status "Tests completed"
}

# Function to deploy with PM2
deploy_pm2() {
    print_header "Deploying with PM2"
    
    cd "$PROJECT_DIR"
    
    # Stop existing processes
    print_status "Stopping existing PM2 processes..."
    pm2 stop ecosystem.config.js 2>/dev/null || true
    
    # Start with production environment
    print_status "Starting PM2 processes in production mode..."
    pm2 start ecosystem.config.js --env production
    
    # Save PM2 configuration
    print_status "Saving PM2 configuration..."
    pm2 save --force
    
    # Setup PM2 startup
    print_status "Setting up PM2 startup..."
    pm2 startup 2>/dev/null || print_warning "Could not setup PM2 startup (may require sudo)"
    
    print_status "PM2 deployment completed"
}

# Function to verify deployment
verify_deployment() {
    print_header "Verifying Deployment"
    
    # Wait for services to start
    print_status "Waiting for services to start..."
    sleep 10
    
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
    
    # Check if frontend is accessible
    print_status "Checking frontend..."
    if [ -f "$PROJECT_DIR/dist/index.html" ]; then
        print_status "Frontend build is available"
    else
        print_error "Frontend build not found"
        return 1
    fi
    
    print_status "Deployment verification completed successfully"
}

# Function to update Nginx configuration
update_nginx() {
    print_header "Updating Nginx Configuration"
    
    # Check if Nginx config exists
    if [ -f "$PROJECT_DIR/nginx/$DOMAIN.conf" ]; then
        print_status "Nginx configuration found"
        
        # Test configuration
        print_status "Testing Nginx configuration..."
        nginx -t -c "$PROJECT_DIR/nginx/$DOMAIN.conf" 2>/dev/null || print_warning "Nginx configuration test failed"
        
        print_warning "Please manually copy Nginx configuration to /etc/nginx/sites-available/"
        print_warning "Command: sudo cp $PROJECT_DIR/nginx/$DOMAIN.conf /etc/nginx/sites-available/"
        print_warning "Then: sudo ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/"
        print_warning "Finally: sudo nginx -t && sudo systemctl reload nginx"
    else
        print_warning "Nginx configuration not found at $PROJECT_DIR/nginx/$DOMAIN.conf"
    fi
}

# Function to show deployment summary
show_summary() {
    print_header "Deployment Summary"
    
    echo "Deployment completed at: $(date)"
    echo "Domain: $DOMAIN"
    echo "Project directory: $PROJECT_DIR"
    echo "Backup location: $(cat "$PROJECT_DIR/.last_backup" 2>/dev/null || echo "N/A")"
    echo
    echo "Services:"
    echo "- Backend: http://localhost:3001"
    echo "- Frontend: $PROJECT_DIR/dist"
    echo "- Domain: https://$DOMAIN (after Nginx setup)"
    echo
    echo "PM2 Status:"
    pm2 status
    echo
    echo "Next steps:"
    echo "1. Configure SSL certificates (run: $PROJECT_DIR/scripts/setup-ssl.sh)"
    echo "2. Setup Nginx configuration"
    echo "3. Configure Cloudflare DNS"
    echo "4. Test the complete setup"
}

# Main deployment function
main() {
    print_header "Starting Production Deployment for $DOMAIN"
    
    # Check if backup should be created
    if [ "$1" != "--no-backup" ]; then
        backup_deployment
    fi
    
    # Run deployment steps
    check_prerequisites
    update_code
    install_dependencies
    build_application
    
    # Run tests if not skipped
    if [ "$1" != "--skip-tests" ]; then
        run_tests
    fi
    
    deploy_pm2
    verify_deployment
    update_nginx
    show_summary
    
    print_status "Deployment completed successfully!"
    print_warning "Don't forget to setup SSL certificates and Nginx configuration"
}

# Handle script arguments
case "$1" in
    --help|-h)
        echo "Usage: $0 [OPTIONS]"
        echo "Options:"
        echo "  --no-backup    Skip backup creation"
        echo "  --skip-tests   Skip running tests"
        echo "  --help, -h     Show this help message"
        exit 0
        ;;
    *)
        main "$@"
        ;;
esac