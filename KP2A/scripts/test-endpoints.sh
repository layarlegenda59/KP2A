#!/bin/bash

# Endpoint Testing Script for sidarsih.site
# This script validates all API endpoints and functionality

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
TEST_RESULTS_FILE="/home/dell/KP2A-CIMAHI/KP2A/logs/test-results.json"
TIMEOUT=10

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

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
}

print_header() {
    echo -e "${BLUE}=== $1 ===${NC}"
}

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# Function to log test results
log_test_result() {
    local test_name="$1"
    local status="$2"
    local response_time="$3"
    local details="$4"
    
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    local result="{
        \"timestamp\": \"$timestamp\",
        \"test_name\": \"$test_name\",
        \"status\": \"$status\",
        \"response_time\": \"$response_time\",
        \"details\": \"$details\"
    }"
    
    echo "$result" >> "$TEST_RESULTS_FILE"
}

# Function to test HTTP endpoint
test_endpoint() {
    local name="$1"
    local url="$2"
    local expected_status="${3:-200}"
    local method="${4:-GET}"
    local data="$5"
    
    ((TOTAL_TESTS++))
    
    local start_time=$(date +%s.%N)
    
    if [ -n "$data" ]; then
        local response=$(curl -s -w "HTTPSTATUS:%{http_code};TIME:%{time_total}" \
                            -X "$method" \
                            -H "Content-Type: application/json" \
                            -d "$data" \
                            --max-time "$TIMEOUT" \
                            "$url" 2>/dev/null || echo "HTTPSTATUS:000;TIME:999")
    else
        local response=$(curl -s -w "HTTPSTATUS:%{http_code};TIME:%{time_total}" \
                            -X "$method" \
                            --max-time "$TIMEOUT" \
                            "$url" 2>/dev/null || echo "HTTPSTATUS:000;TIME:999")
    fi
    
    local http_code=$(echo "$response" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
    local response_time=$(echo "$response" | grep -o "TIME:[0-9.]*" | cut -d: -f2)
    local body=$(echo "$response" | sed -E 's/HTTPSTATUS:[0-9]*;TIME:[0-9.]*$//')
    
    if [ "$http_code" = "$expected_status" ]; then
        print_pass "$name (${response_time}s)"
        log_test_result "$name" "PASS" "$response_time" "HTTP $http_code"
    else
        print_fail "$name - Expected $expected_status, got $http_code (${response_time}s)"
        log_test_result "$name" "FAIL" "$response_time" "HTTP $http_code - $body"
    fi
}

# Function to test WebSocket connection
test_websocket() {
    local name="$1"
    local url="$2"
    
    ((TOTAL_TESTS++))
    
    print_info "Testing WebSocket: $name"
    
    # Use a simple WebSocket test with timeout
    local result=$(timeout 5 bash -c "
        exec 3<>/dev/tcp/localhost/3001
        echo -e 'GET /socket.io/?EIO=4&transport=websocket HTTP/1.1\r\nHost: localhost:3001\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\r\nSec-WebSocket-Version: 13\r\n\r\n' >&3
        read -t 3 response <&3
        echo \$response
        exec 3<&-
        exec 3>&-
    " 2>/dev/null || echo "TIMEOUT")
    
    if [[ "$result" == *"101"* ]] || [[ "$result" == *"Switching Protocols"* ]]; then
        print_pass "$name"
        log_test_result "$name" "PASS" "N/A" "WebSocket connection successful"
    else
        print_fail "$name - WebSocket connection failed"
        log_test_result "$name" "FAIL" "N/A" "WebSocket connection failed: $result"
    fi
}

# Function to test backend endpoints
test_backend_endpoints() {
    print_header "Testing Backend Endpoints"
    
    # Health check
    test_endpoint "Backend Health Check" "$BACKEND_URL/health" 200
    
    # API status
    test_endpoint "API Status" "$BACKEND_URL/api/status" 200
    
    # WhatsApp status
    test_endpoint "WhatsApp Status" "$BACKEND_URL/api/whatsapp/status" 200
    
    # QR Code endpoint
    test_endpoint "QR Code Generation" "$BACKEND_URL/api/whatsapp/qr" 200
    
    # WebSocket connection
    test_websocket "Socket.IO Connection" "$BACKEND_URL/socket.io/"
    
    # Test CORS headers
    print_info "Testing CORS headers"
    local cors_response=$(curl -s -H "Origin: https://$DOMAIN" \
                              -H "Access-Control-Request-Method: POST" \
                              -H "Access-Control-Request-Headers: Content-Type" \
                              -X OPTIONS \
                              "$BACKEND_URL/api/status" \
                              -w "HTTPSTATUS:%{http_code}" \
                              --max-time "$TIMEOUT" 2>/dev/null || echo "HTTPSTATUS:000")
    
    local cors_code=$(echo "$cors_response" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
    
    ((TOTAL_TESTS++))
    if [ "$cors_code" = "200" ] || [ "$cors_code" = "204" ]; then
        print_pass "CORS Preflight Request"
        log_test_result "CORS Preflight" "PASS" "N/A" "HTTP $cors_code"
    else
        print_fail "CORS Preflight Request - HTTP $cors_code"
        log_test_result "CORS Preflight" "FAIL" "N/A" "HTTP $cors_code"
    fi
}

# Function to test frontend endpoints
test_frontend_endpoints() {
    print_header "Testing Frontend Endpoints"
    
    # Test if frontend files exist
    ((TOTAL_TESTS++))
    if [ -f "$PROJECT_DIR/dist/index.html" ]; then
        print_pass "Frontend Build Exists"
        log_test_result "Frontend Build" "PASS" "N/A" "index.html found"
    else
        print_fail "Frontend Build Missing"
        log_test_result "Frontend Build" "FAIL" "N/A" "index.html not found"
    fi
    
    # Test static assets
    local assets_dir="$PROJECT_DIR/dist/assets"
    ((TOTAL_TESTS++))
    if [ -d "$assets_dir" ] && [ "$(ls -A "$assets_dir" 2>/dev/null)" ]; then
        print_pass "Frontend Assets Exist"
        log_test_result "Frontend Assets" "PASS" "N/A" "Assets directory found with files"
    else
        print_fail "Frontend Assets Missing"
        log_test_result "Frontend Assets" "FAIL" "N/A" "Assets directory empty or missing"
    fi
    
    # Test if domain is accessible (if configured)
    if [ "$DOMAIN" != "sidarsih.site" ] || ping -c 1 "$DOMAIN" >/dev/null 2>&1; then
        test_endpoint "Frontend Domain Access" "$FRONTEND_URL" 200
        test_endpoint "Frontend HTTPS Redirect" "http://$DOMAIN" 301
    else
        print_warning "Domain $DOMAIN not accessible - skipping domain tests"
    fi
}

# Function to test database connectivity
test_database() {
    print_header "Testing Database Connectivity"
    
    # Check if Supabase configuration exists
    if [ -f "$PROJECT_DIR/.env.production" ]; then
        local supabase_url=$(grep "VITE_SUPABASE_URL" "$PROJECT_DIR/.env.production" | cut -d= -f2 | tr -d '"')
        local supabase_anon_key=$(grep "VITE_SUPABASE_ANON_KEY" "$PROJECT_DIR/.env.production" | cut -d= -f2 | tr -d '"')
        
        if [ -n "$supabase_url" ] && [ -n "$supabase_anon_key" ]; then
            # Test Supabase REST API
            test_endpoint "Supabase REST API" "$supabase_url/rest/v1/" 200
            
            # Test Supabase Auth
            test_endpoint "Supabase Auth" "$supabase_url/auth/v1/settings" 200
            
            # Test with authentication header
            ((TOTAL_TESTS++))
            local auth_response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
                                     -H "apikey: $supabase_anon_key" \
                                     -H "Authorization: Bearer $supabase_anon_key" \
                                     --max-time "$TIMEOUT" \
                                     "$supabase_url/rest/v1/" 2>/dev/null || echo "HTTPSTATUS:000")
            
            local auth_code=$(echo "$auth_response" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
            
            if [ "$auth_code" = "200" ]; then
                print_pass "Supabase Authentication"
                log_test_result "Supabase Auth" "PASS" "N/A" "HTTP $auth_code"
            else
                print_fail "Supabase Authentication - HTTP $auth_code"
                log_test_result "Supabase Auth" "FAIL" "N/A" "HTTP $auth_code"
            fi
        else
            print_warning "Supabase configuration incomplete"
        fi
    else
        print_warning "Production environment file not found"
    fi
}

# Function to test performance
test_performance() {
    print_header "Testing Performance"
    
    # Test backend response times
    local endpoints=(
        "$BACKEND_URL/health"
        "$BACKEND_URL/api/status"
        "$BACKEND_URL/api/whatsapp/status"
    )
    
    for endpoint in "${endpoints[@]}"; do
        local endpoint_name=$(basename "$endpoint")
        
        print_info "Testing response time for $endpoint_name"
        
        local total_time=0
        local successful_requests=0
        local max_time=0
        local min_time=999
        
        for i in {1..5}; do
            local response_time=$(curl -s -o /dev/null -w "%{time_total}" --max-time "$TIMEOUT" "$endpoint" 2>/dev/null || echo "999")
            
            if (( $(echo "$response_time < 10" | bc -l) )); then
                total_time=$(echo "$total_time + $response_time" | bc -l)
                ((successful_requests++))
                
                if (( $(echo "$response_time > $max_time" | bc -l) )); then
                    max_time=$response_time
                fi
                
                if (( $(echo "$response_time < $min_time" | bc -l) )); then
                    min_time=$response_time
                fi
            fi
        done
        
        ((TOTAL_TESTS++))
        if [ "$successful_requests" -gt 0 ]; then
            local avg_time=$(echo "scale=3; $total_time / $successful_requests" | bc -l)
            
            if (( $(echo "$avg_time < 2" | bc -l) )); then
                print_pass "$endpoint_name Performance - Avg: ${avg_time}s (Min: ${min_time}s, Max: ${max_time}s)"
                log_test_result "$endpoint_name Performance" "PASS" "$avg_time" "Min: ${min_time}s, Max: ${max_time}s"
            else
                print_fail "$endpoint_name Performance - Avg: ${avg_time}s (too slow)"
                log_test_result "$endpoint_name Performance" "FAIL" "$avg_time" "Response time too slow"
            fi
        else
            print_fail "$endpoint_name Performance - All requests failed"
            log_test_result "$endpoint_name Performance" "FAIL" "N/A" "All requests failed"
        fi
    done
}

# Function to test security
test_security() {
    print_header "Testing Security"
    
    # Test for security headers
    local security_endpoints=(
        "$BACKEND_URL/health"
        "$BACKEND_URL/api/status"
    )
    
    for endpoint in "${security_endpoints[@]}"; do
        local endpoint_name=$(basename "$endpoint")
        
        print_info "Testing security headers for $endpoint_name"
        
        local headers=$(curl -s -I --max-time "$TIMEOUT" "$endpoint" 2>/dev/null || echo "")
        
        # Check for security headers
        local security_checks=(
            "X-Content-Type-Options:nosniff"
            "X-Frame-Options"
            "X-XSS-Protection"
        )
        
        for check in "${security_checks[@]}"; do
            local header_name=$(echo "$check" | cut -d: -f1)
            local expected_value=$(echo "$check" | cut -d: -f2)
            
            ((TOTAL_TESTS++))
            if echo "$headers" | grep -qi "$header_name"; then
                if [ -n "$expected_value" ]; then
                    if echo "$headers" | grep -qi "$check"; then
                        print_pass "$endpoint_name - $header_name header correct"
                        log_test_result "$endpoint_name Security" "PASS" "N/A" "$header_name header present and correct"
                    else
                        print_fail "$endpoint_name - $header_name header incorrect"
                        log_test_result "$endpoint_name Security" "FAIL" "N/A" "$header_name header present but incorrect"
                    fi
                else
                    print_pass "$endpoint_name - $header_name header present"
                    log_test_result "$endpoint_name Security" "PASS" "N/A" "$header_name header present"
                fi
            else
                print_fail "$endpoint_name - $header_name header missing"
                log_test_result "$endpoint_name Security" "FAIL" "N/A" "$header_name header missing"
            fi
        done
    done
    
    # Test for common vulnerabilities
    print_info "Testing for common vulnerabilities"
    
    # Test for directory traversal
    ((TOTAL_TESTS++))
    local traversal_response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
                                  --max-time "$TIMEOUT" \
                                  "$BACKEND_URL/../../../etc/passwd" 2>/dev/null || echo "HTTPSTATUS:000")
    
    local traversal_code=$(echo "$traversal_response" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
    
    if [ "$traversal_code" = "404" ] || [ "$traversal_code" = "403" ]; then
        print_pass "Directory Traversal Protection"
        log_test_result "Directory Traversal" "PASS" "N/A" "HTTP $traversal_code"
    else
        print_fail "Directory Traversal Vulnerability - HTTP $traversal_code"
        log_test_result "Directory Traversal" "FAIL" "N/A" "HTTP $traversal_code"
    fi
    
    # Test for SQL injection (basic)
    ((TOTAL_TESTS++))
    local sqli_response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
                             --max-time "$TIMEOUT" \
                             "$BACKEND_URL/api/status?id=1'%20OR%20'1'='1" 2>/dev/null || echo "HTTPSTATUS:000")
    
    local sqli_code=$(echo "$sqli_response" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
    
    if [ "$sqli_code" = "200" ] || [ "$sqli_code" = "400" ] || [ "$sqli_code" = "404" ]; then
        print_pass "SQL Injection Protection"
        log_test_result "SQL Injection" "PASS" "N/A" "HTTP $sqli_code"
    else
        print_warning "SQL Injection Test - Unexpected response: HTTP $sqli_code"
        log_test_result "SQL Injection" "WARN" "N/A" "HTTP $sqli_code"
    fi
}

# Function to generate test report
generate_test_report() {
    print_header "Test Results Summary"
    
    local success_rate=0
    if [ "$TOTAL_TESTS" -gt 0 ]; then
        success_rate=$(echo "scale=2; $PASSED_TESTS * 100 / $TOTAL_TESTS" | bc -l)
    fi
    
    echo "Total Tests: $TOTAL_TESTS"
    echo "Passed: $PASSED_TESTS"
    echo "Failed: $FAILED_TESTS"
    echo "Success Rate: ${success_rate}%"
    echo "Test Results File: $TEST_RESULTS_FILE"
    echo "Timestamp: $(date)"
    
    # Return appropriate exit code
    if [ "$FAILED_TESTS" -eq 0 ]; then
        print_pass "All tests passed!"
        return 0
    else
        print_fail "$FAILED_TESTS tests failed"
        return 1
    fi
}

# Main testing function
main() {
    print_header "Starting Endpoint Testing for $DOMAIN"
    
    # Create log directory
    mkdir -p "$(dirname "$TEST_RESULTS_FILE")"
    
    # Clear previous results
    echo "" > "$TEST_RESULTS_FILE"
    
    # Run all test suites
    test_backend_endpoints
    test_frontend_endpoints
    test_database
    test_performance
    test_security
    
    # Generate final report
    generate_test_report
}

# Handle script arguments
case "$1" in
    --help|-h)
        echo "Usage: $0 [OPTIONS]"
        echo "Options:"
        echo "  --help, -h     Show this help message"
        echo ""
        echo "This script tests all endpoints and functionality of the sidarsih.site application."
        echo "Results are saved to: $TEST_RESULTS_FILE"
        exit 0
        ;;
    *)
        main "$@"
        ;;
esac