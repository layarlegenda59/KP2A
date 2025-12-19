#!/bin/bash

# Security Testing Script for sidarsih.site
# This script performs comprehensive security checks and vulnerability assessments

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
FRONTEND_URL="https://$DOMAIN"
RESULTS_DIR="/home/dell/KP2A-CIMAHI/KP2A/logs/security"
TIMESTAMP=$(date '+%Y%m%d_%H%M%S')

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
WARNING_TESTS=0

# Function to print colored output
print_pass() {
    echo -e "${GREEN}[PASS]${NC} $1"
    ((PASSED_TESTS++))
}

print_fail() {
    echo -e "${RED}[FAIL]${NC} $1"
    ((FAILED_TESTS++))
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
    ((WARNING_TESTS++))
}

print_header() {
    echo -e "${BLUE}=== $1 ===${NC}"
}

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# Function to log security test results
log_security_result() {
    local test_name="$1"
    local status="$2"
    local severity="$3"
    local details="$4"
    local recommendation="$5"
    
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    local result="{
        \"timestamp\": \"$timestamp\",
        \"test_name\": \"$test_name\",
        \"status\": \"$status\",
        \"severity\": \"$severity\",
        \"details\": \"$details\",
        \"recommendation\": \"$recommendation\"
    }"
    
    echo "$result" >> "$RESULTS_DIR/security_results_${TIMESTAMP}.json"
}

# Function to test HTTP security headers
test_security_headers() {
    print_header "Testing HTTP Security Headers"
    
    local endpoints=(
        "$BACKEND_URL/health"
        "$BACKEND_URL/api/status"
        "$BACKEND_URL/api/whatsapp/status"
    )
    
    for endpoint in "${endpoints[@]}"; do
        local endpoint_name=$(basename "$endpoint")
        print_info "Testing security headers for $endpoint_name"
        
        # Get headers
        local headers=$(curl -s -I --max-time 10 "$endpoint" 2>/dev/null || echo "")
        
        if [ -z "$headers" ]; then
            ((TOTAL_TESTS++))
            print_fail "$endpoint_name - Could not retrieve headers"
            log_security_result "$endpoint_name Headers" "FAIL" "HIGH" "Could not retrieve headers" "Check if service is running"
            continue
        fi
        
        # Test X-Content-Type-Options
        ((TOTAL_TESTS++))
        if echo "$headers" | grep -qi "X-Content-Type-Options.*nosniff"; then
            print_pass "$endpoint_name - X-Content-Type-Options: nosniff"
            log_security_result "$endpoint_name X-Content-Type-Options" "PASS" "LOW" "Header present and correct" ""
        else
            print_fail "$endpoint_name - Missing X-Content-Type-Options: nosniff"
            log_security_result "$endpoint_name X-Content-Type-Options" "FAIL" "MEDIUM" "Header missing or incorrect" "Add X-Content-Type-Options: nosniff header"
        fi
        
        # Test X-Frame-Options
        ((TOTAL_TESTS++))
        if echo "$headers" | grep -qi "X-Frame-Options"; then
            print_pass "$endpoint_name - X-Frame-Options present"
            log_security_result "$endpoint_name X-Frame-Options" "PASS" "LOW" "Header present" ""
        else
            print_fail "$endpoint_name - Missing X-Frame-Options"
            log_security_result "$endpoint_name X-Frame-Options" "FAIL" "MEDIUM" "Header missing" "Add X-Frame-Options: DENY or SAMEORIGIN"
        fi
        
        # Test X-XSS-Protection
        ((TOTAL_TESTS++))
        if echo "$headers" | grep -qi "X-XSS-Protection"; then
            print_pass "$endpoint_name - X-XSS-Protection present"
            log_security_result "$endpoint_name X-XSS-Protection" "PASS" "LOW" "Header present" ""
        else
            print_warning "$endpoint_name - Missing X-XSS-Protection (deprecated but still useful)"
            log_security_result "$endpoint_name X-XSS-Protection" "WARN" "LOW" "Header missing" "Consider adding X-XSS-Protection: 1; mode=block"
        fi
        
        # Test Strict-Transport-Security (for HTTPS)
        ((TOTAL_TESTS++))
        if [[ "$endpoint" == https* ]]; then
            if echo "$headers" | grep -qi "Strict-Transport-Security"; then
                print_pass "$endpoint_name - HSTS header present"
                log_security_result "$endpoint_name HSTS" "PASS" "LOW" "Header present" ""
            else
                print_fail "$endpoint_name - Missing HSTS header"
                log_security_result "$endpoint_name HSTS" "FAIL" "HIGH" "HSTS header missing" "Add Strict-Transport-Security header"
            fi
        else
            print_info "$endpoint_name - HSTS not applicable (HTTP endpoint)"
        fi
        
        # Test Content-Security-Policy
        ((TOTAL_TESTS++))
        if echo "$headers" | grep -qi "Content-Security-Policy"; then
            print_pass "$endpoint_name - CSP header present"
            log_security_result "$endpoint_name CSP" "PASS" "LOW" "Header present" ""
        else
            print_warning "$endpoint_name - Missing Content-Security-Policy"
            log_security_result "$endpoint_name CSP" "WARN" "MEDIUM" "CSP header missing" "Implement Content-Security-Policy"
        fi
        
        # Test Server header disclosure
        ((TOTAL_TESTS++))
        if echo "$headers" | grep -qi "Server:"; then
            local server_header=$(echo "$headers" | grep -i "Server:" | head -1)
            print_warning "$endpoint_name - Server header disclosed: $server_header"
            log_security_result "$endpoint_name Server Disclosure" "WARN" "LOW" "Server header disclosed" "Hide or modify server header"
        else
            print_pass "$endpoint_name - Server header not disclosed"
            log_security_result "$endpoint_name Server Disclosure" "PASS" "LOW" "Server header hidden" ""
        fi
        
        echo ""
    done
}

# Function to test for common vulnerabilities
test_common_vulnerabilities() {
    print_header "Testing Common Vulnerabilities"
    
    # Test directory traversal
    print_info "Testing directory traversal attacks"
    local traversal_payloads=(
        "../../../etc/passwd"
        "..\\..\\..\\windows\\system32\\drivers\\etc\\hosts"
        "%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd"
        "....//....//....//etc/passwd"
    )
    
    for payload in "${traversal_payloads[@]}"; do
        ((TOTAL_TESTS++))
        local response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
                            --max-time 10 \
                            "$BACKEND_URL/$payload" 2>/dev/null || echo "HTTPSTATUS:000")
        
        local http_code=$(echo "$response" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
        local body=$(echo "$response" | sed -E 's/HTTPSTATUS:[0-9]*$//')
        
        if [ "$http_code" = "404" ] || [ "$http_code" = "403" ] || [ "$http_code" = "400" ]; then
            print_pass "Directory traversal protection - $payload"
            log_security_result "Directory Traversal" "PASS" "LOW" "Payload blocked: $payload" ""
        elif [ "$http_code" = "200" ] && [[ "$body" == *"root:"* ]]; then
            print_fail "Directory traversal vulnerability - $payload"
            log_security_result "Directory Traversal" "FAIL" "CRITICAL" "Payload successful: $payload" "Implement proper input validation and path sanitization"
        else
            print_pass "Directory traversal protection - $payload (HTTP $http_code)"
            log_security_result "Directory Traversal" "PASS" "LOW" "Payload handled: $payload (HTTP $http_code)" ""
        fi
    done
    
    # Test SQL injection
    print_info "Testing SQL injection attacks"
    local sqli_payloads=(
        "1' OR '1'='1"
        "1; DROP TABLE users--"
        "' UNION SELECT * FROM users--"
        "1' AND (SELECT COUNT(*) FROM users) > 0--"
    )
    
    for payload in "${sqli_payloads[@]}"; do
        ((TOTAL_TESTS++))
        local encoded_payload=$(echo "$payload" | sed 's/ /%20/g' | sed "s/'/%27/g")
        local response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
                            --max-time 10 \
                            "$BACKEND_URL/api/status?id=$encoded_payload" 2>/dev/null || echo "HTTPSTATUS:000")
        
        local http_code=$(echo "$response" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
        local body=$(echo "$response" | sed -E 's/HTTPSTATUS:[0-9]*$//')
        
        if [[ "$body" == *"SQL"* ]] || [[ "$body" == *"syntax error"* ]] || [[ "$body" == *"mysql"* ]] || [[ "$body" == *"postgres"* ]]; then
            print_fail "SQL injection vulnerability detected - $payload"
            log_security_result "SQL Injection" "FAIL" "CRITICAL" "SQL error exposed: $payload" "Implement parameterized queries and input validation"
        else
            print_pass "SQL injection protection - $payload"
            log_security_result "SQL Injection" "PASS" "LOW" "Payload handled safely: $payload" ""
        fi
    done
    
    # Test XSS
    print_info "Testing Cross-Site Scripting (XSS)"
    local xss_payloads=(
        "<script>alert('XSS')</script>"
        "javascript:alert('XSS')"
        "<img src=x onerror=alert('XSS')>"
        "';alert('XSS');//"
    )
    
    for payload in "${xss_payloads[@]}"; do
        ((TOTAL_TESTS++))
        local encoded_payload=$(echo "$payload" | sed 's/ /%20/g' | sed 's/</%3C/g' | sed 's/>/%3E/g')
        local response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
                            --max-time 10 \
                            "$BACKEND_URL/api/status?message=$encoded_payload" 2>/dev/null || echo "HTTPSTATUS:000")
        
        local body=$(echo "$response" | sed -E 's/HTTPSTATUS:[0-9]*$//')
        
        if [[ "$body" == *"<script>"* ]] || [[ "$body" == *"javascript:"* ]] || [[ "$body" == *"onerror="* ]]; then
            print_fail "XSS vulnerability detected - $payload"
            log_security_result "XSS" "FAIL" "HIGH" "XSS payload reflected: $payload" "Implement proper output encoding and CSP"
        else
            print_pass "XSS protection - $payload"
            log_security_result "XSS" "PASS" "LOW" "Payload sanitized: $payload" ""
        fi
    done
}

# Function to test authentication and authorization
test_auth_security() {
    print_header "Testing Authentication & Authorization"
    
    # Test for sensitive endpoints without authentication
    local sensitive_endpoints=(
        "/api/admin"
        "/api/users"
        "/api/config"
        "/api/logs"
        "/admin"
        "/.env"
        "/config.json"
    )
    
    for endpoint in "${sensitive_endpoints[@]}"; do
        ((TOTAL_TESTS++))
        local response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
                            --max-time 10 \
                            "$BACKEND_URL$endpoint" 2>/dev/null || echo "HTTPSTATUS:000")
        
        local http_code=$(echo "$response" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
        
        if [ "$http_code" = "401" ] || [ "$http_code" = "403" ] || [ "$http_code" = "404" ]; then
            print_pass "Protected endpoint - $endpoint (HTTP $http_code)"
            log_security_result "Endpoint Protection" "PASS" "LOW" "$endpoint properly protected" ""
        elif [ "$http_code" = "200" ]; then
            print_fail "Unprotected sensitive endpoint - $endpoint"
            log_security_result "Endpoint Protection" "FAIL" "HIGH" "$endpoint accessible without auth" "Implement proper authentication"
        else
            print_warning "Unexpected response for $endpoint - HTTP $http_code"
            log_security_result "Endpoint Protection" "WARN" "MEDIUM" "$endpoint returned HTTP $http_code" "Review endpoint security"
        fi
    done
    
    # Test for default credentials
    print_info "Testing for default credentials"
    local default_creds=(
        "admin:admin"
        "admin:password"
        "root:root"
        "test:test"
        "user:user"
    )
    
    for cred in "${default_creds[@]}"; do
        ((TOTAL_TESTS++))
        local username=$(echo "$cred" | cut -d: -f1)
        local password=$(echo "$cred" | cut -d: -f2)
        
        local response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
                            --max-time 10 \
                            -X POST \
                            -H "Content-Type: application/json" \
                            -d "{\"username\":\"$username\",\"password\":\"$password\"}" \
                            "$BACKEND_URL/api/auth/login" 2>/dev/null || echo "HTTPSTATUS:000")
        
        local http_code=$(echo "$response" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
        local body=$(echo "$response" | sed -E 's/HTTPSTATUS:[0-9]*$//')
        
        if [ "$http_code" = "200" ] && [[ "$body" == *"token"* ]]; then
            print_fail "Default credentials accepted - $username:$password"
            log_security_result "Default Credentials" "FAIL" "CRITICAL" "Default creds work: $cred" "Change default credentials immediately"
        else
            print_pass "Default credentials rejected - $username:$password"
            log_security_result "Default Credentials" "PASS" "LOW" "Default creds rejected: $cred" ""
        fi
    done
}

# Function to test rate limiting
test_rate_limiting() {
    print_header "Testing Rate Limiting"
    
    local test_endpoint="$BACKEND_URL/api/status"
    local requests_count=50
    local success_count=0
    local rate_limited_count=0
    
    print_info "Sending $requests_count rapid requests to test rate limiting"
    
    for ((i=1; i<=requests_count; i++)); do
        local response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
                            --max-time 5 \
                            "$test_endpoint" 2>/dev/null || echo "HTTPSTATUS:000")
        
        local http_code=$(echo "$response" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
        
        if [ "$http_code" = "200" ]; then
            ((success_count++))
        elif [ "$http_code" = "429" ] || [ "$http_code" = "503" ]; then
            ((rate_limited_count++))
        fi
        
        # Small delay to avoid overwhelming the system
        sleep 0.1
    done
    
    ((TOTAL_TESTS++))
    if [ "$rate_limited_count" -gt 0 ]; then
        print_pass "Rate limiting active ($rate_limited_count/$requests_count requests limited)"
        log_security_result "Rate Limiting" "PASS" "LOW" "$rate_limited_count requests rate limited" ""
    else
        print_warning "No rate limiting detected ($success_count/$requests_count requests succeeded)"
        log_security_result "Rate Limiting" "WARN" "MEDIUM" "No rate limiting observed" "Implement rate limiting to prevent abuse"
    fi
}

# Function to test file upload security
test_file_upload_security() {
    print_header "Testing File Upload Security"
    
    # Test if file upload endpoint exists
    local upload_endpoints=(
        "/api/upload"
        "/api/files/upload"
        "/upload"
    )
    
    for endpoint in "${upload_endpoints[@]}"; do
        print_info "Testing file upload security for $endpoint"
        
        # Test malicious file upload
        local malicious_files=(
            "test.php"
            "test.jsp"
            "test.asp"
            "test.exe"
            "test.sh"
        )
        
        for file in "${malicious_files[@]}"; do
            ((TOTAL_TESTS++))
            
            # Create a temporary malicious file
            local temp_file="/tmp/$file"
            echo "<?php echo 'malicious code'; ?>" > "$temp_file"
            
            local response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
                                --max-time 10 \
                                -X POST \
                                -F "file=@$temp_file" \
                                "$BACKEND_URL$endpoint" 2>/dev/null || echo "HTTPSTATUS:000")
            
            local http_code=$(echo "$response" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
            
            if [ "$http_code" = "400" ] || [ "$http_code" = "403" ] || [ "$http_code" = "415" ]; then
                print_pass "Malicious file rejected - $file"
                log_security_result "File Upload Security" "PASS" "LOW" "Malicious file rejected: $file" ""
            elif [ "$http_code" = "404" ]; then
                print_info "Upload endpoint not found - $endpoint"
                break
            elif [ "$http_code" = "200" ] || [ "$http_code" = "201" ]; then
                print_fail "Malicious file accepted - $file"
                log_security_result "File Upload Security" "FAIL" "HIGH" "Malicious file accepted: $file" "Implement file type validation"
            else
                print_warning "Unexpected response for $file upload - HTTP $http_code"
                log_security_result "File Upload Security" "WARN" "MEDIUM" "Unexpected response: $file" "Review upload handling"
            fi
            
            rm -f "$temp_file"
        done
    done
}

# Function to test SSL/TLS configuration
test_ssl_configuration() {
    print_header "Testing SSL/TLS Configuration"
    
    # Test SSL certificate (if domain is accessible)
    if ping -c 1 "$DOMAIN" >/dev/null 2>&1; then
        print_info "Testing SSL certificate for $DOMAIN"
        
        ((TOTAL_TESTS++))
        local ssl_info=$(echo | openssl s_client -connect "$DOMAIN:443" -servername "$DOMAIN" 2>/dev/null | openssl x509 -noout -dates 2>/dev/null || echo "")
        
        if [ -n "$ssl_info" ]; then
            print_pass "SSL certificate accessible"
            
            # Check certificate expiry
            local not_after=$(echo "$ssl_info" | grep "notAfter" | cut -d= -f2)
            if [ -n "$not_after" ]; then
                local expiry_date=$(date -d "$not_after" +%s 2>/dev/null || echo "0")
                local current_date=$(date +%s)
                local days_until_expiry=$(( (expiry_date - current_date) / 86400 ))
                
                ((TOTAL_TESTS++))
                if [ "$days_until_expiry" -gt 30 ]; then
                    print_pass "SSL certificate valid for $days_until_expiry days"
                    log_security_result "SSL Certificate" "PASS" "LOW" "Certificate valid for $days_until_expiry days" ""
                elif [ "$days_until_expiry" -gt 0 ]; then
                    print_warning "SSL certificate expires in $days_until_expiry days"
                    log_security_result "SSL Certificate" "WARN" "MEDIUM" "Certificate expires soon: $days_until_expiry days" "Renew SSL certificate"
                else
                    print_fail "SSL certificate expired"
                    log_security_result "SSL Certificate" "FAIL" "HIGH" "Certificate expired" "Renew SSL certificate immediately"
                fi
            fi
            
            log_security_result "SSL Certificate" "PASS" "LOW" "Certificate accessible" ""
        else
            print_fail "SSL certificate not accessible"
            log_security_result "SSL Certificate" "FAIL" "HIGH" "Certificate not accessible" "Check SSL configuration"
        fi
        
        # Test SSL protocols
        print_info "Testing SSL/TLS protocols"
        local protocols=("ssl3" "tls1" "tls1_1" "tls1_2" "tls1_3")
        
        for protocol in "${protocols[@]}"; do
            ((TOTAL_TESTS++))
            local test_result=$(echo | openssl s_client -connect "$DOMAIN:443" -"$protocol" 2>&1 | grep -c "Verify return code: 0" || echo "0")
            
            if [ "$protocol" = "ssl3" ] || [ "$protocol" = "tls1" ] || [ "$protocol" = "tls1_1" ]; then
                # These should be disabled
                if [ "$test_result" = "0" ]; then
                    print_pass "Insecure protocol $protocol disabled"
                    log_security_result "SSL Protocol" "PASS" "LOW" "$protocol disabled" ""
                else
                    print_fail "Insecure protocol $protocol enabled"
                    log_security_result "SSL Protocol" "FAIL" "MEDIUM" "$protocol enabled" "Disable insecure SSL/TLS protocols"
                fi
            else
                # These should be enabled
                if [ "$test_result" = "1" ]; then
                    print_pass "Secure protocol $protocol enabled"
                    log_security_result "SSL Protocol" "PASS" "LOW" "$protocol enabled" ""
                else
                    print_warning "Secure protocol $protocol not available"
                    log_security_result "SSL Protocol" "WARN" "LOW" "$protocol not available" "Consider enabling modern TLS protocols"
                fi
            fi
        done
    else
        print_info "Domain $DOMAIN not accessible - skipping SSL tests"
    fi
}

# Function to test for information disclosure
test_information_disclosure() {
    print_header "Testing Information Disclosure"
    
    # Test for sensitive files
    local sensitive_files=(
        "/.env"
        "/.env.local"
        "/.env.production"
        "/config.json"
        "/package.json"
        "/composer.json"
        "/.git/config"
        "/backup.sql"
        "/database.sql"
        "/phpinfo.php"
        "/info.php"
        "/test.php"
        "/robots.txt"
        "/.htaccess"
        "/web.config"
    )
    
    for file in "${sensitive_files[@]}"; do
        ((TOTAL_TESTS++))
        local response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
                            --max-time 10 \
                            "$BACKEND_URL$file" 2>/dev/null || echo "HTTPSTATUS:000")
        
        local http_code=$(echo "$response" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
        local body=$(echo "$response" | sed -E 's/HTTPSTATUS:[0-9]*$//')
        
        if [ "$http_code" = "200" ]; then
            if [[ "$file" == *".env"* ]] && [[ "$body" == *"="* ]]; then
                print_fail "Sensitive file exposed - $file"
                log_security_result "Information Disclosure" "FAIL" "CRITICAL" "Sensitive file accessible: $file" "Block access to sensitive files"
            elif [[ "$file" == "robots.txt" ]]; then
                print_pass "robots.txt accessible (expected)"
                log_security_result "Information Disclosure" "PASS" "LOW" "robots.txt accessible" ""
            else
                print_warning "File accessible - $file"
                log_security_result "Information Disclosure" "WARN" "MEDIUM" "File accessible: $file" "Review if file should be public"
            fi
        else
            print_pass "Sensitive file protected - $file"
            log_security_result "Information Disclosure" "PASS" "LOW" "File protected: $file" ""
        fi
    done
    
    # Test for error message disclosure
    print_info "Testing error message disclosure"
    local error_endpoints=(
        "/nonexistent"
        "/api/nonexistent"
        "/api/users/999999"
    )
    
    for endpoint in "${error_endpoints[@]}"; do
        ((TOTAL_TESTS++))
        local response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
                            --max-time 10 \
                            "$BACKEND_URL$endpoint" 2>/dev/null || echo "HTTPSTATUS:000")
        
        local body=$(echo "$response" | sed -E 's/HTTPSTATUS:[0-9]*$//')
        
        if [[ "$body" == *"stack trace"* ]] || [[ "$body" == *"Error:"* ]] || [[ "$body" == *"Exception"* ]]; then
            print_fail "Detailed error messages exposed - $endpoint"
            log_security_result "Error Disclosure" "FAIL" "MEDIUM" "Detailed errors exposed: $endpoint" "Implement generic error messages"
        else
            print_pass "Error messages properly handled - $endpoint"
            log_security_result "Error Disclosure" "PASS" "LOW" "Errors handled properly: $endpoint" ""
        fi
    done
}

# Function to generate security report
generate_security_report() {
    print_header "Security Test Summary"
    
    local report_file="$RESULTS_DIR/security_report_${TIMESTAMP}.html"
    local json_file="$RESULTS_DIR/security_results_${TIMESTAMP}.json"
    
    # Calculate statistics
    local total_issues=$((FAILED_TESTS + WARNING_TESTS))
    local critical_issues=$(grep -c '"severity": "CRITICAL"' "$json_file" 2>/dev/null || echo "0")
    local high_issues=$(grep -c '"severity": "HIGH"' "$json_file" 2>/dev/null || echo "0")
    local medium_issues=$(grep -c '"severity": "MEDIUM"' "$json_file" 2>/dev/null || echo "0")
    local low_issues=$(grep -c '"severity": "LOW"' "$json_file" 2>/dev/null || echo "0")
    
    # Create HTML report
    cat > "$report_file" << EOF
<!DOCTYPE html>
<html>
<head>
    <title>Security Test Report - sidarsih.site</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f0f0f0; padding: 20px; border-radius: 5px; }
        .section { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
        .critical { color: #d32f2f; font-weight: bold; }
        .high { color: #f57c00; font-weight: bold; }
        .medium { color: #fbc02d; }
        .low { color: #388e3c; }
        .pass { color: green; }
        .fail { color: red; }
        .warn { color: orange; }
        table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        .summary { display: flex; justify-content: space-around; margin: 20px 0; }
        .summary div { text-align: center; padding: 10px; border: 1px solid #ddd; border-radius: 5px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Security Test Report</h1>
        <p><strong>Domain:</strong> $DOMAIN</p>
        <p><strong>Timestamp:</strong> $(date)</p>
        <p><strong>Total Tests:</strong> $TOTAL_TESTS</p>
    </div>
    
    <div class="section">
        <h2>Test Results Summary</h2>
        <div class="summary">
            <div class="pass">
                <h3>$PASSED_TESTS</h3>
                <p>Passed</p>
            </div>
            <div class="fail">
                <h3>$FAILED_TESTS</h3>
                <p>Failed</p>
            </div>
            <div class="warn">
                <h3>$WARNING_TESTS</h3>
                <p>Warnings</p>
            </div>
        </div>
    </div>
    
    <div class="section">
        <h2>Security Issues by Severity</h2>
        <div class="summary">
            <div class="critical">
                <h3>$critical_issues</h3>
                <p>Critical</p>
            </div>
            <div class="high">
                <h3>$high_issues</h3>
                <p>High</p>
            </div>
            <div class="medium">
                <h3>$medium_issues</h3>
                <p>Medium</p>
            </div>
            <div class="low">
                <h3>$low_issues</h3>
                <p>Low</p>
            </div>
        </div>
    </div>
    
    <div class="section">
        <h2>Recommendations</h2>
        <ul>
            <li>Address all CRITICAL and HIGH severity issues immediately</li>
            <li>Implement proper input validation and output encoding</li>
            <li>Use HTTPS everywhere with proper SSL/TLS configuration</li>
            <li>Implement rate limiting and DDoS protection</li>
            <li>Regular security testing and code reviews</li>
            <li>Keep all dependencies and frameworks updated</li>
            <li>Implement proper logging and monitoring</li>
            <li>Use Content Security Policy (CSP) headers</li>
            <li>Implement proper authentication and authorization</li>
            <li>Regular security audits and penetration testing</li>
        </ul>
    </div>
    
    <div class="section">
        <h2>Detailed Results</h2>
        <p>Detailed test results are available in: <a href="security_results_${TIMESTAMP}.json">security_results_${TIMESTAMP}.json</a></p>
    </div>
</body>
</html>
EOF
    
    echo "Security Test Results:"
    echo "====================="
    echo "Total Tests: $TOTAL_TESTS"
    echo "Passed: $PASSED_TESTS"
    echo "Failed: $FAILED_TESTS"
    echo "Warnings: $WARNING_TESTS"
    echo ""
    echo "Security Issues by Severity:"
    echo "Critical: $critical_issues"
    echo "High: $high_issues"
    echo "Medium: $medium_issues"
    echo "Low: $low_issues"
    echo ""
    echo "Reports generated:"
    echo "- HTML Report: $report_file"
    echo "- JSON Results: $json_file"
    
    # Return appropriate exit code
    if [ "$critical_issues" -eq 0 ] && [ "$high_issues" -eq 0 ]; then
        print_pass "No critical or high severity issues found"
        return 0
    else
        print_fail "Critical or high severity issues found - immediate attention required"
        return 1
    fi
}

# Main function
main() {
    print_header "Starting Security Testing for $DOMAIN"
    
    # Create results directory
    mkdir -p "$RESULTS_DIR"
    
    # Initialize results file
    echo "" > "$RESULTS_DIR/security_results_${TIMESTAMP}.json"
    
    # Run all security test suites
    test_security_headers
    test_common_vulnerabilities
    test_auth_security
    test_rate_limiting
    test_file_upload_security
    test_ssl_configuration
    test_information_disclosure
    
    # Generate final report
    generate_security_report
}

# Handle script arguments
case "$1" in
    --help|-h)
        echo "Usage: $0 [OPTIONS]"
        echo "Options:"
        echo "  --help, -h     Show this help message"
        echo ""
        echo "This script performs comprehensive security testing of the sidarsih.site application."
        echo "Results are saved to: $RESULTS_DIR"
        exit 0
        ;;
    *)
        main "$@"
        ;;
esac