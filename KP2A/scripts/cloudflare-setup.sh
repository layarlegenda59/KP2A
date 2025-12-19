#!/bin/bash

# Cloudflare Domain Setup Script for sidarsih.site
# Email: layarlegenda59@gmail.com
# Domain: sidarsih.site

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DOMAIN="sidarsih.site"
EMAIL="layarlegenda59@gmail.com"
PROJECT_DIR="/home/dell/KP2A-CIMAHI/KP2A"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Cloudflare Setup for sidarsih.site   ${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Function to print status
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
print_status "Checking prerequisites..."

if ! command_exists curl; then
    print_error "curl is required but not installed."
    exit 1
fi

if ! command_exists dig; then
    print_warning "dig not found. Installing dnsutils..."
    sudo apt-get update && sudo apt-get install -y dnsutils
fi

# Get server IP address
print_status "Detecting server IP address..."
SERVER_IP=$(curl -s ifconfig.me || curl -s ipinfo.io/ip || curl -s icanhazip.com)

if [ -z "$SERVER_IP" ]; then
    print_error "Could not detect server IP address."
    read -p "Please enter your server IP address: " SERVER_IP
fi

print_status "Server IP detected: $SERVER_IP"

# DNS Propagation Check
check_dns_propagation() {
    print_status "Checking DNS propagation for $DOMAIN..."
    
    # Check A record for root domain
    ROOT_IP=$(dig +short $DOMAIN @8.8.8.8)
    if [ "$ROOT_IP" = "$SERVER_IP" ]; then
        print_status "✅ Root domain ($DOMAIN) resolves correctly to $SERVER_IP"
    else
        print_warning "❌ Root domain resolves to: $ROOT_IP (expected: $SERVER_IP)"
    fi
    
    # Check WWW subdomain
    WWW_IP=$(dig +short www.$DOMAIN @8.8.8.8)
    if [ "$WWW_IP" = "$SERVER_IP" ]; then
        print_status "✅ WWW subdomain resolves correctly to $SERVER_IP"
    else
        print_warning "❌ WWW subdomain resolves to: $WWW_IP (expected: $SERVER_IP)"
    fi
    
    # Check API subdomain
    API_IP=$(dig +short api.$DOMAIN @8.8.8.8)
    if [ "$API_IP" = "$SERVER_IP" ]; then
        print_status "✅ API subdomain resolves correctly to $SERVER_IP"
    else
        print_warning "❌ API subdomain resolves to: $API_IP (expected: $SERVER_IP)"
    fi
    
    # Check WhatsApp subdomain
    WA_IP=$(dig +short whatsapp.$DOMAIN @8.8.8.8)
    if [ "$WA_IP" = "$SERVER_IP" ]; then
        print_status "✅ WhatsApp subdomain resolves correctly to $SERVER_IP"
    else
        print_warning "❌ WhatsApp subdomain resolves to: $WA_IP (expected: $SERVER_IP)"
    fi
}

# SSL Certificate Check
check_ssl_certificate() {
    print_status "Checking SSL certificate for $DOMAIN..."
    
    if command_exists openssl; then
        SSL_INFO=$(echo | openssl s_client -connect $DOMAIN:443 -servername $DOMAIN 2>/dev/null | openssl x509 -noout -subject -dates 2>/dev/null)
        if [ $? -eq 0 ]; then
            print_status "✅ SSL certificate is valid"
            echo "$SSL_INFO"
        else
            print_warning "❌ SSL certificate check failed"
        fi
    else
        print_warning "OpenSSL not found, skipping SSL check"
    fi
}

# Website Accessibility Check
check_website_accessibility() {
    print_status "Checking website accessibility..."
    
    # Check HTTPS redirect
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -L http://$DOMAIN)
    if [ "$HTTP_STATUS" = "200" ]; then
        print_status "✅ HTTP to HTTPS redirect working"
    else
        print_warning "❌ HTTP redirect status: $HTTP_STATUS"
    fi
    
    # Check HTTPS access
    HTTPS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://$DOMAIN)
    if [ "$HTTPS_STATUS" = "200" ]; then
        print_status "✅ HTTPS access working"
    else
        print_warning "❌ HTTPS access status: $HTTPS_STATUS"
    fi
    
    # Check API endpoint
    API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://api.$DOMAIN/health)
    if [ "$API_STATUS" = "200" ]; then
        print_status "✅ API endpoint accessible"
    else
        print_warning "❌ API endpoint status: $API_STATUS"
    fi
}

# Update Environment Files
update_environment_files() {
    print_status "Updating environment files with domain configuration..."
    
    # Update frontend .env.production
    FRONTEND_ENV="$PROJECT_DIR/.env.production"
    if [ -f "$FRONTEND_ENV" ]; then
        print_status "Updating frontend environment file..."
        
        # Backup original file
        cp "$FRONTEND_ENV" "$FRONTEND_ENV.backup.$(date +%Y%m%d_%H%M%S)"
        
        # Update environment variables
        sed -i "s|VITE_API_URL=.*|VITE_API_URL=https://api.$DOMAIN|g" "$FRONTEND_ENV"
        sed -i "s|VITE_WHATSAPP_API_URL=.*|VITE_WHATSAPP_API_URL=https://whatsapp.$DOMAIN|g" "$FRONTEND_ENV"
        sed -i "s|VITE_SOCKET_URL=.*|VITE_SOCKET_URL=https://whatsapp.$DOMAIN|g" "$FRONTEND_ENV"
        sed -i "s|VITE_APP_DOMAIN=.*|VITE_APP_DOMAIN=$DOMAIN|g" "$FRONTEND_ENV"
        
        print_status "✅ Frontend environment updated"
    else
        print_warning "Frontend .env.production not found"
    fi
    
    # Update backend .env.production
    BACKEND_ENV="$PROJECT_DIR/whatsapp-backend/.env.production"
    if [ -f "$BACKEND_ENV" ]; then
        print_status "Updating backend environment file..."
        
        # Backup original file
        cp "$BACKEND_ENV" "$BACKEND_ENV.backup.$(date +%Y%m%d_%H%M%S)"
        
        # Update environment variables
        sed -i "s|FRONTEND_URL=.*|FRONTEND_URL=https://$DOMAIN|g" "$BACKEND_ENV"
        sed -i "s|CORS_ORIGIN=.*|CORS_ORIGIN=https://$DOMAIN,https://www.$DOMAIN,https://admin.$DOMAIN|g" "$BACKEND_ENV"
        sed -i "s|DOMAIN=.*|DOMAIN=$DOMAIN|g" "$BACKEND_ENV"
        
        print_status "✅ Backend environment updated"
    else
        print_warning "Backend .env.production not found"
    fi
}

# Generate Nginx Configuration
generate_nginx_config() {
    print_status "Generating Nginx configuration for $DOMAIN..."
    
    NGINX_CONFIG="$PROJECT_DIR/nginx/$DOMAIN.conf"
    mkdir -p "$PROJECT_DIR/nginx"
    
    cat > "$NGINX_CONFIG" << EOF
# Nginx configuration for $DOMAIN
# Generated on $(date)

# Rate limiting zones
limit_req_zone \$binary_remote_addr zone=api:10m rate=10r/m;
limit_req_zone \$binary_remote_addr zone=general:10m rate=30r/m;

# Upstream for WhatsApp backend
upstream whatsapp_backend {
    least_conn;
    server 127.0.0.1:3001 max_fails=3 fail_timeout=30s;
}

# HTTP to HTTPS redirect
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN api.$DOMAIN whatsapp.$DOMAIN admin.$DOMAIN;
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    
    # Redirect all HTTP to HTTPS
    return 301 https://\$server_name\$request_uri;
}

# Main HTTPS server block
server {
    listen 443 ssl http2;
    server_name $DOMAIN www.$DOMAIN;
    
    # SSL Configuration (Cloudflare Origin Certificate)
    ssl_certificate /etc/ssl/certs/$DOMAIN.pem;
    ssl_certificate_key /etc/ssl/private/$DOMAIN.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Referrer-Policy "strict-origin-when-cross-origin";
    
    # Document root
    root $PROJECT_DIR/dist;
    index index.html;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
    
    # Main location
    location / {
        try_files \$uri \$uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)\$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
    # Health check
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}

# API subdomain
server {
    listen 443 ssl http2;
    server_name api.$DOMAIN;
    
    # SSL Configuration
    ssl_certificate /etc/ssl/certs/$DOMAIN.pem;
    ssl_certificate_key /etc/ssl/private/$DOMAIN.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    
    # Proxy to backend
    location / {
        limit_req zone=api burst=20 nodelay;
        
        proxy_pass http://whatsapp_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}

# WhatsApp subdomain
server {
    listen 443 ssl http2;
    server_name whatsapp.$DOMAIN;
    
    # SSL Configuration
    ssl_certificate /etc/ssl/certs/$DOMAIN.pem;
    ssl_certificate_key /etc/ssl/private/$DOMAIN.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # Proxy to WhatsApp backend
    location / {
        limit_req zone=general burst=50 nodelay;
        
        proxy_pass http://whatsapp_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # WebSocket support
        proxy_buffering off;
        proxy_request_buffering off;
    }
}
EOF

    print_status "✅ Nginx configuration generated: $NGINX_CONFIG"
}

# Main execution
main() {
    echo ""
    print_status "Starting Cloudflare domain setup for $DOMAIN"
    print_status "Email: $EMAIL"
    print_status "Server IP: $SERVER_IP"
    echo ""
    
    # Menu options
    echo "Select setup options:"
    echo "1. Check DNS propagation"
    echo "2. Check SSL certificate"
    echo "3. Check website accessibility"
    echo "4. Update environment files"
    echo "5. Generate Nginx configuration"
    echo "6. Run all checks"
    echo "7. Full setup (update files + generate config)"
    echo ""
    
    read -p "Enter your choice (1-7): " choice
    
    case $choice in
        1)
            check_dns_propagation
            ;;
        2)
            check_ssl_certificate
            ;;
        3)
            check_website_accessibility
            ;;
        4)
            update_environment_files
            ;;
        5)
            generate_nginx_config
            ;;
        6)
            check_dns_propagation
            echo ""
            check_ssl_certificate
            echo ""
            check_website_accessibility
            ;;
        7)
            update_environment_files
            echo ""
            generate_nginx_config
            echo ""
            print_status "Full setup completed!"
            ;;
        *)
            print_error "Invalid choice. Please run the script again."
            exit 1
            ;;
    esac
    
    echo ""
    print_status "Setup completed! Next steps:"
    echo "1. Login to Cloudflare dashboard: https://dash.cloudflare.com"
    echo "2. Configure DNS records as per the guide"
    echo "3. Set up SSL/TLS settings"
    echo "4. Configure security and performance settings"
    echo "5. Deploy your application"
    echo ""
    print_status "For detailed instructions, see: CLOUDFLARE_DOMAIN_SETUP_GUIDE.md"
}

# Run main function
main "$@"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DOMAIN="sidarsih.site"
EMAIL="layarlegenda59@gmail.com"
PROJECT_DIR="/home/dell/KP2A-CIMAHI/KP2A"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Cloudflare Setup for sidarsih.site   ${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Function to print status
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
print_status "Checking prerequisites..."

if ! command_exists curl; then
    print_error "curl is required but not installed."
    exit 1
fi

if ! command_exists dig; then
    print_warning "dig not found. Installing dnsutils..."
    sudo apt-get update && sudo apt-get install -y dnsutils
fi

# Get server IP address
print_status "Detecting server IP address..."
SERVER_IP=$(curl -s ifconfig.me || curl -s ipinfo.io/ip || curl -s icanhazip.com)

if [ -z "$SERVER_IP" ]; then
    print_error "Could not detect server IP address."
    read -p "Please enter your server IP address: " SERVER_IP
fi

print_status "Server IP detected: $SERVER_IP"

# DNS Propagation Check
check_dns_propagation() {
    print_status "Checking DNS propagation for $DOMAIN..."
    
    # Check A record for root domain
    ROOT_IP=$(dig +short $DOMAIN @8.8.8.8)
    if [ "$ROOT_IP" = "$SERVER_IP" ]; then
        print_status "✅ Root domain ($DOMAIN) resolves correctly to $SERVER_IP"
    else
        print_warning "❌ Root domain resolves to: $ROOT_IP (expected: $SERVER_IP)"
    fi
    
    # Check WWW subdomain
    WWW_IP=$(dig +short www.$DOMAIN @8.8.8.8)
    if [ "$WWW_IP" = "$SERVER_IP" ]; then
        print_status "✅ WWW subdomain resolves correctly to $SERVER_IP"
    else
        print_warning "❌ WWW subdomain resolves to: $WWW_IP (expected: $SERVER_IP)"
    fi
    
    # Check API subdomain
    API_IP=$(dig +short api.$DOMAIN @8.8.8.8)
    if [ "$API_IP" = "$SERVER_IP" ]; then
        print_status "✅ API subdomain resolves correctly to $SERVER_IP"
    else
        print_warning "❌ API subdomain resolves to: $API_IP (expected: $SERVER_IP)"
    fi
    
    # Check WhatsApp subdomain
    WA_IP=$(dig +short whatsapp.$DOMAIN @8.8.8.8)
    if [ "$WA_IP" = "$SERVER_IP" ]; then
        print_status "✅ WhatsApp subdomain resolves correctly to $SERVER_IP"
    else
        print_warning "❌ WhatsApp subdomain resolves to: $WA_IP (expected: $SERVER_IP)"
    fi
}

# SSL Certificate Check
check_ssl_certificate() {
    print_status "Checking SSL certificate for $DOMAIN..."
    
    if command_exists openssl; then
        SSL_INFO=$(echo | openssl s_client -connect $DOMAIN:443 -servername $DOMAIN 2>/dev/null | openssl x509 -noout -subject -dates 2>/dev/null)
        if [ $? -eq 0 ]; then
            print_status "✅ SSL certificate is valid"
            echo "$SSL_INFO"
        else
            print_warning "❌ SSL certificate check failed"
        fi
    else
        print_warning "OpenSSL not found, skipping SSL check"
    fi
}

# Website Accessibility Check
check_website_accessibility() {
    print_status "Checking website accessibility..."
    
    # Check HTTPS redirect
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -L http://$DOMAIN)
    if [ "$HTTP_STATUS" = "200" ]; then
        print_status "✅ HTTP to HTTPS redirect working"
    else
        print_warning "❌ HTTP redirect status: $HTTP_STATUS"
    fi
    
    # Check HTTPS access
    HTTPS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://$DOMAIN)
    if [ "$HTTPS_STATUS" = "200" ]; then
        print_status "✅ HTTPS access working"
    else
        print_warning "❌ HTTPS access status: $HTTPS_STATUS"
    fi
    
    # Check API endpoint
    API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://api.$DOMAIN/health)
    if [ "$API_STATUS" = "200" ]; then
        print_status "✅ API endpoint accessible"
    else
        print_warning "❌ API endpoint status: $API_STATUS"
    fi
}

# Update Environment Files
update_environment_files() {
    print_status "Updating environment files with domain configuration..."
    
    # Update frontend .env.production
    FRONTEND_ENV="$PROJECT_DIR/.env.production"
    if [ -f "$FRONTEND_ENV" ]; then
        print_status "Updating frontend environment file..."
        
        # Backup original file
        cp "$FRONTEND_ENV" "$FRONTEND_ENV.backup.$(date +%Y%m%d_%H%M%S)"
        
        # Update environment variables
        sed -i "s|VITE_API_URL=.*|VITE_API_URL=https://api.$DOMAIN|g" "$FRONTEND_ENV"
        sed -i "s|VITE_WHATSAPP_API_URL=.*|VITE_WHATSAPP_API_URL=https://whatsapp.$DOMAIN|g" "$FRONTEND_ENV"
        sed -i "s|VITE_SOCKET_URL=.*|VITE_SOCKET_URL=https://whatsapp.$DOMAIN|g" "$FRONTEND_ENV"
        sed -i "s|VITE_APP_DOMAIN=.*|VITE_APP_DOMAIN=$DOMAIN|g" "$FRONTEND_ENV"
        
        print_status "✅ Frontend environment updated"
    else
        print_warning "Frontend .env.production not found"
    fi
    
    # Update backend .env.production
    BACKEND_ENV="$PROJECT_DIR/whatsapp-backend/.env.production"
    if [ -f "$BACKEND_ENV" ]; then
        print_status "Updating backend environment file..."
        
        # Backup original file
        cp "$BACKEND_ENV" "$BACKEND_ENV.backup.$(date +%Y%m%d_%H%M%S)"
        
        # Update environment variables
        sed -i "s|FRONTEND_URL=.*|FRONTEND_URL=https://$DOMAIN|g" "$BACKEND_ENV"
        sed -i "s|CORS_ORIGIN=.*|CORS_ORIGIN=https://$DOMAIN,https://www.$DOMAIN,https://admin.$DOMAIN|g" "$BACKEND_ENV"
        sed -i "s|DOMAIN=.*|DOMAIN=$DOMAIN|g" "$BACKEND_ENV"
        
        print_status "✅ Backend environment updated"
    else
        print_warning "Backend .env.production not found"
    fi
}

# Generate Nginx Configuration
generate_nginx_config() {
    print_status "Generating Nginx configuration for $DOMAIN..."
    
    NGINX_CONFIG="$PROJECT_DIR/nginx/$DOMAIN.conf"
    mkdir -p "$PROJECT_DIR/nginx"
    
    cat > "$NGINX_CONFIG" << EOF
# Nginx configuration for $DOMAIN
# Generated on $(date)

# Rate limiting zones
limit_req_zone \$binary_remote_addr zone=api:10m rate=10r/m;
limit_req_zone \$binary_remote_addr zone=general:10m rate=30r/m;

# Upstream for WhatsApp backend
upstream whatsapp_backend {
    least_conn;
    server 127.0.0.1:3001 max_fails=3 fail_timeout=30s;
}

# HTTP to HTTPS redirect
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN api.$DOMAIN whatsapp.$DOMAIN admin.$DOMAIN;
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    
    # Redirect all HTTP to HTTPS
    return 301 https://\$server_name\$request_uri;
}

# Main HTTPS server block
server {
    listen 443 ssl http2;
    server_name $DOMAIN www.$DOMAIN;
    
    # SSL Configuration (Cloudflare Origin Certificate)
    ssl_certificate /etc/ssl/certs/$DOMAIN.pem;
    ssl_certificate_key /etc/ssl/private/$DOMAIN.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Referrer-Policy "strict-origin-when-cross-origin";
    
    # Document root
    root $PROJECT_DIR/dist;
    index index.html;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
    
    # Main location
    location / {
        try_files \$uri \$uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)\$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
    # Health check
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}

# API subdomain
server {
    listen 443 ssl http2;
    server_name api.$DOMAIN;
    
    # SSL Configuration
    ssl_certificate /etc/ssl/certs/$DOMAIN.pem;
    ssl_certificate_key /etc/ssl/private/$DOMAIN.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    
    # Proxy to backend
    location / {
        limit_req zone=api burst=20 nodelay;
        
        proxy_pass http://whatsapp_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}

# WhatsApp subdomain
server {
    listen 443 ssl http2;
    server_name whatsapp.$DOMAIN;
    
    # SSL Configuration
    ssl_certificate /etc/ssl/certs/$DOMAIN.pem;
    ssl_certificate_key /etc/ssl/private/$DOMAIN.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # Proxy to WhatsApp backend
    location / {
        limit_req zone=general burst=50 nodelay;
        
        proxy_pass http://whatsapp_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # WebSocket support
        proxy_buffering off;
        proxy_request_buffering off;
    }
}
EOF

    print_status "✅ Nginx configuration generated: $NGINX_CONFIG"
}

# Main execution
main() {
    echo ""
    print_status "Starting Cloudflare domain setup for $DOMAIN"
    print_status "Email: $EMAIL"
    print_status "Server IP: $SERVER_IP"
    echo ""
    
    # Menu options
    echo "Select setup options:"
    echo "1. Check DNS propagation"
    echo "2. Check SSL certificate"
    echo "3. Check website accessibility"
    echo "4. Update environment files"
    echo "5. Generate Nginx configuration"
    echo "6. Run all checks"
    echo "7. Full setup (update files + generate config)"
    echo ""
    
    read -p "Enter your choice (1-7): " choice
    
    case $choice in
        1)
            check_dns_propagation
            ;;
        2)
            check_ssl_certificate
            ;;
        3)
            check_website_accessibility
            ;;
        4)
            update_environment_files
            ;;
        5)
            generate_nginx_config
            ;;
        6)
            check_dns_propagation
            echo ""
            check_ssl_certificate
            echo ""
            check_website_accessibility
            ;;
        7)
            update_environment_files
            echo ""
            generate_nginx_config
            echo ""
            print_status "Full setup completed!"
            ;;
        *)
            print_error "Invalid choice. Please run the script again."
            exit 1
            ;;
    esac
    
    echo ""
    print_status "Setup completed! Next steps:"
    echo "1. Login to Cloudflare dashboard: https://dash.cloudflare.com"
    echo "2. Configure DNS records as per the guide"
    echo "3. Set up SSL/TLS settings"
    echo "4. Configure security and performance settings"
    echo "5. Deploy your application"
    echo ""
    print_status "For detailed instructions, see: CLOUDFLARE_DOMAIN_SETUP_GUIDE.md"
}

# Run main function
main "$@"