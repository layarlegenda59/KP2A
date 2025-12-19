#!/bin/bash

# SSL Certificate Setup Script for sidarsih.site
# This script helps setup Cloudflare Origin Certificates

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DOMAIN="sidarsih.site"
SSL_DIR="/home/dell/KP2A-CIMAHI/KP2A/ssl"
CERT_DIR="$SSL_DIR/certs"
PRIVATE_DIR="$SSL_DIR/private"
CERT_FILE="$CERT_DIR/$DOMAIN.pem"
KEY_FILE="$PRIVATE_DIR/$DOMAIN.key"

echo -e "${BLUE}=== Cloudflare Origin Certificate Setup for $DOMAIN ===${NC}"

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

# Check if directories exist
print_status "Checking SSL directories..."
if [ ! -d "$CERT_DIR" ]; then
    mkdir -p "$CERT_DIR"
    print_status "Created certificate directory: $CERT_DIR"
fi

if [ ! -d "$PRIVATE_DIR" ]; then
    mkdir -p "$PRIVATE_DIR"
    print_status "Created private key directory: $PRIVATE_DIR"
fi

# Set proper permissions
chmod 755 "$SSL_DIR"
chmod 755 "$CERT_DIR"
chmod 700 "$PRIVATE_DIR"

print_status "SSL directories are ready."

# Check if certificates already exist
if [ -f "$CERT_FILE" ] && [ -f "$KEY_FILE" ]; then
    print_warning "SSL certificates already exist!"
    echo "Certificate: $CERT_FILE"
    echo "Private Key: $KEY_FILE"
    
    # Check certificate validity
    if openssl x509 -in "$CERT_FILE" -text -noout > /dev/null 2>&1; then
        EXPIRY=$(openssl x509 -in "$CERT_FILE" -enddate -noout | cut -d= -f2)
        print_status "Current certificate expires: $EXPIRY"
        
        # Check if certificate is valid for the domain
        if openssl x509 -in "$CERT_FILE" -text -noout | grep -q "$DOMAIN"; then
            print_status "Certificate is valid for $DOMAIN"
        else
            print_warning "Certificate may not be valid for $DOMAIN"
        fi
    else
        print_error "Existing certificate file is invalid!"
    fi
    
    read -p "Do you want to replace the existing certificates? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_status "Keeping existing certificates."
        exit 0
    fi
fi

echo
echo -e "${BLUE}=== Cloudflare Origin Certificate Instructions ===${NC}"
echo
echo "To obtain a Cloudflare Origin Certificate:"
echo
echo "1. Log in to your Cloudflare dashboard"
echo "2. Select your domain ($DOMAIN)"
echo "3. Go to SSL/TLS > Origin Server"
echo "4. Click 'Create Certificate'"
echo "5. Choose 'Let Cloudflare generate a private key and a CSR'"
echo "6. Set hostnames to: $DOMAIN, *.$DOMAIN"
echo "7. Choose certificate validity (15 years recommended)"
echo "8. Click 'Create'"
echo
echo "9. Copy the Origin Certificate and save it to:"
echo "   $CERT_FILE"
echo
echo "10. Copy the Private Key and save it to:"
echo "    $KEY_FILE"
echo

# Interactive certificate installation
read -p "Do you want to install the certificates now? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo
    echo -e "${YELLOW}Please paste the Origin Certificate (including -----BEGIN CERTIFICATE----- and -----END CERTIFICATE-----):${NC}"
    echo "Press Ctrl+D when finished."
    
    # Read certificate
    cat > "$CERT_FILE"
    
    if [ -s "$CERT_FILE" ]; then
        print_status "Certificate saved to $CERT_FILE"
        
        # Validate certificate
        if openssl x509 -in "$CERT_FILE" -text -noout > /dev/null 2>&1; then
            print_status "Certificate is valid!"
        else
            print_error "Invalid certificate format!"
            rm "$CERT_FILE"
            exit 1
        fi
    else
        print_error "No certificate data received!"
        exit 1
    fi
    
    echo
    echo -e "${YELLOW}Please paste the Private Key (including -----BEGIN PRIVATE KEY----- and -----END PRIVATE KEY-----):${NC}"
    echo "Press Ctrl+D when finished."
    
    # Read private key
    cat > "$KEY_FILE"
    
    if [ -s "$KEY_FILE" ]; then
        print_status "Private key saved to $KEY_FILE"
        
        # Set proper permissions for private key
        chmod 600 "$KEY_FILE"
        
        # Validate private key
        if openssl rsa -in "$KEY_FILE" -check -noout > /dev/null 2>&1; then
            print_status "Private key is valid!"
        else
            print_error "Invalid private key format!"
            rm "$KEY_FILE"
            exit 1
        fi
    else
        print_error "No private key data received!"
        exit 1
    fi
    
    # Verify certificate and key match
    CERT_MODULUS=$(openssl x509 -noout -modulus -in "$CERT_FILE" | openssl md5)
    KEY_MODULUS=$(openssl rsa -noout -modulus -in "$KEY_FILE" | openssl md5)
    
    if [ "$CERT_MODULUS" = "$KEY_MODULUS" ]; then
        print_status "Certificate and private key match!"
    else
        print_error "Certificate and private key do not match!"
        exit 1
    fi
    
    echo
    print_status "SSL certificates have been successfully installed!"
    print_status "Certificate: $CERT_FILE"
    print_status "Private Key: $KEY_FILE"
    
    # Display certificate information
    echo
    echo -e "${BLUE}=== Certificate Information ===${NC}"
    openssl x509 -in "$CERT_FILE" -text -noout | grep -A 2 "Subject:"
    openssl x509 -in "$CERT_FILE" -text -noout | grep -A 2 "Validity"
    openssl x509 -in "$CERT_FILE" -text -noout | grep -A 5 "Subject Alternative Name"
    
else
    echo
    print_warning "Certificates not installed. You can run this script again later."
    echo
    echo "Manual installation:"
    echo "1. Save the Origin Certificate to: $CERT_FILE"
    echo "2. Save the Private Key to: $KEY_FILE"
    echo "3. Set proper permissions: chmod 600 $KEY_FILE"
fi

echo
echo -e "${BLUE}=== Next Steps ===${NC}"
echo "1. Update Nginx configuration to use the certificates"
echo "2. Test Nginx configuration: nginx -t"
echo "3. Reload Nginx: systemctl reload nginx"
echo "4. Test SSL: curl -I https://$DOMAIN"
echo
print_status "SSL setup completed!"