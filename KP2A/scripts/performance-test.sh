#!/bin/bash

# Performance Testing Script for sidarsih.site
# This script performs load testing and performance analysis

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
RESULTS_DIR="/home/dell/KP2A-CIMAHI/KP2A/logs/performance"
TIMESTAMP=$(date '+%Y%m%d_%H%M%S')

# Test parameters
CONCURRENT_USERS=10
TEST_DURATION=60
RAMP_UP_TIME=10

# Function to print colored output
print_pass() {
    echo -e "${GREEN}[PASS]${NC} $1"
}

print_fail() {
    echo -e "${RED}[FAIL]${NC} $1"
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

# Function to check if required tools are installed
check_dependencies() {
    print_header "Checking Dependencies"
    
    local missing_tools=()
    
    # Check for curl
    if ! command -v curl &> /dev/null; then
        missing_tools+=("curl")
    fi
    
    # Check for bc (for calculations)
    if ! command -v bc &> /dev/null; then
        missing_tools+=("bc")
    fi
    
    # Check for ab (Apache Bench) - optional
    if ! command -v ab &> /dev/null; then
        print_warning "Apache Bench (ab) not found - some tests will be skipped"
    fi
    
    # Check for wrk - optional
    if ! command -v wrk &> /dev/null; then
        print_warning "wrk not found - some tests will be skipped"
    fi
    
    if [ ${#missing_tools[@]} -gt 0 ]; then
        print_fail "Missing required tools: ${missing_tools[*]}"
        echo "Please install missing tools and try again."
        exit 1
    fi
    
    print_pass "All required dependencies are available"
}

# Function to test single endpoint performance
test_endpoint_performance() {
    local name="$1"
    local url="$2"
    local requests="${3:-100}"
    local concurrency="${4:-10}"
    
    print_info "Testing $name performance"
    
    local results_file="$RESULTS_DIR/${name// /_}_${TIMESTAMP}.txt"
    
    # Create a simple performance test using curl
    local total_time=0
    local successful_requests=0
    local failed_requests=0
    local min_time=999
    local max_time=0
    local response_times=()
    
    print_info "Running $requests requests with concurrency $concurrency"
    
    # Run requests in batches to simulate concurrency
    local batch_size=$concurrency
    local batches=$((requests / batch_size))
    
    for ((batch=1; batch<=batches; batch++)); do
        local pids=()
        local batch_start_time=$(date +%s.%N)
        
        # Start batch of concurrent requests
        for ((i=1; i<=batch_size; i++)); do
            {
                local start_time=$(date +%s.%N)
                local response=$(curl -s -w "%{http_code}:%{time_total}:%{time_connect}:%{time_starttransfer}" \
                                    -o /dev/null \
                                    --max-time 30 \
                                    "$url" 2>/dev/null || echo "000:999:999:999")
                local end_time=$(date +%s.%N)
                
                echo "$response:$(echo "$end_time - $start_time" | bc -l)" > "/tmp/perf_result_$$_$i"
            } &
            pids+=($!)
        done
        
        # Wait for all requests in this batch to complete
        for pid in "${pids[@]}"; do
            wait $pid
        done
        
        # Process results from this batch
        for ((i=1; i<=batch_size; i++)); do
            if [ -f "/tmp/perf_result_$$_$i" ]; then
                local result=$(cat "/tmp/perf_result_$$_$i")
                local http_code=$(echo "$result" | cut -d: -f1)
                local curl_time=$(echo "$result" | cut -d: -f2)
                local connect_time=$(echo "$result" | cut -d: -f3)
                local ttfb=$(echo "$result" | cut -d: -f4)
                local total_time_calc=$(echo "$result" | cut -d: -f5)
                
                if [ "$http_code" = "200" ]; then
                    ((successful_requests++))
                    response_times+=("$curl_time")
                    
                    # Update min/max times
                    if (( $(echo "$curl_time < $min_time" | bc -l) )); then
                        min_time=$curl_time
                    fi
                    
                    if (( $(echo "$curl_time > $max_time" | bc -l) )); then
                        max_time=$curl_time
                    fi
                    
                    total_time=$(echo "$total_time + $curl_time" | bc -l)
                else
                    ((failed_requests++))
                fi
                
                rm -f "/tmp/perf_result_$$_$i"
            fi
        done
        
        # Show progress
        local completed=$((batch * batch_size))
        local progress=$((completed * 100 / requests))
        echo -ne "\rProgress: $progress% ($completed/$requests requests completed)"
    done
    
    echo "" # New line after progress
    
    # Calculate statistics
    local avg_time=0
    local success_rate=0
    
    if [ "$successful_requests" -gt 0 ]; then
        avg_time=$(echo "scale=3; $total_time / $successful_requests" | bc -l)
        success_rate=$(echo "scale=2; $successful_requests * 100 / $requests" | bc -l)
    fi
    
    # Calculate percentiles (simplified)
    local p95_time=0
    local p99_time=0
    
    if [ ${#response_times[@]} -gt 0 ]; then
        # Sort response times
        IFS=$'\n' sorted_times=($(sort -n <<<"${response_times[*]}"))
        unset IFS
        
        local p95_index=$(echo "scale=0; ${#sorted_times[@]} * 0.95" | bc -l)
        local p99_index=$(echo "scale=0; ${#sorted_times[@]} * 0.99" | bc -l)
        
        p95_time=${sorted_times[$p95_index]:-0}
        p99_time=${sorted_times[$p99_index]:-0}
    fi
    
    # Calculate requests per second
    local rps=0
    if (( $(echo "$avg_time > 0" | bc -l) )); then
        rps=$(echo "scale=2; 1 / $avg_time" | bc -l)
    fi
    
    # Save detailed results
    {
        echo "Performance Test Results for $name"
        echo "=================================="
        echo "URL: $url"
        echo "Timestamp: $(date)"
        echo "Total Requests: $requests"
        echo "Concurrency: $concurrency"
        echo "Successful Requests: $successful_requests"
        echo "Failed Requests: $failed_requests"
        echo "Success Rate: ${success_rate}%"
        echo "Average Response Time: ${avg_time}s"
        echo "Min Response Time: ${min_time}s"
        echo "Max Response Time: ${max_time}s"
        echo "95th Percentile: ${p95_time}s"
        echo "99th Percentile: ${p99_time}s"
        echo "Requests per Second: $rps"
        echo ""
    } > "$results_file"
    
    # Display summary
    echo "Results for $name:"
    echo "  Success Rate: ${success_rate}%"
    echo "  Average Response Time: ${avg_time}s"
    echo "  Min/Max: ${min_time}s / ${max_time}s"
    echo "  95th/99th Percentile: ${p95_time}s / ${p99_time}s"
    echo "  Requests per Second: $rps"
    echo "  Results saved to: $results_file"
    echo ""
    
    # Determine if test passed
    if (( $(echo "$success_rate >= 95" | bc -l) )) && (( $(echo "$avg_time <= 2" | bc -l) )); then
        print_pass "$name performance test"
        return 0
    else
        print_fail "$name performance test (Success: ${success_rate}%, Avg Time: ${avg_time}s)"
        return 1
    fi
}

# Function to test with Apache Bench (if available)
test_with_apache_bench() {
    local name="$1"
    local url="$2"
    local requests="${3:-1000}"
    local concurrency="${4:-10}"
    
    if ! command -v ab &> /dev/null; then
        print_warning "Apache Bench not available - skipping $name"
        return 0
    fi
    
    print_info "Testing $name with Apache Bench"
    
    local results_file="$RESULTS_DIR/ab_${name// /_}_${TIMESTAMP}.txt"
    
    # Run Apache Bench test
    ab -n "$requests" -c "$concurrency" -g "$results_file.gnuplot" "$url" > "$results_file" 2>&1
    
    if [ $? -eq 0 ]; then
        # Extract key metrics
        local rps=$(grep "Requests per second" "$results_file" | awk '{print $4}')
        local avg_time=$(grep "Time per request" "$results_file" | head -1 | awk '{print $4}')
        local failed=$(grep "Failed requests" "$results_file" | awk '{print $3}')
        
        echo "Apache Bench Results for $name:"
        echo "  Requests per Second: $rps"
        echo "  Average Time per Request: ${avg_time}ms"
        echo "  Failed Requests: $failed"
        echo "  Full results: $results_file"
        echo ""
        
        if [ "$failed" = "0" ] && (( $(echo "$rps > 50" | bc -l) )); then
            print_pass "$name Apache Bench test"
            return 0
        else
            print_fail "$name Apache Bench test"
            return 1
        fi
    else
        print_fail "$name Apache Bench test failed to run"
        return 1
    fi
}

# Function to test with wrk (if available)
test_with_wrk() {
    local name="$1"
    local url="$2"
    local duration="${3:-30s}"
    local threads="${4:-4}"
    local connections="${5:-10}"
    
    if ! command -v wrk &> /dev/null; then
        print_warning "wrk not available - skipping $name"
        return 0
    fi
    
    print_info "Testing $name with wrk"
    
    local results_file="$RESULTS_DIR/wrk_${name// /_}_${TIMESTAMP}.txt"
    
    # Run wrk test
    wrk -t"$threads" -c"$connections" -d"$duration" --latency "$url" > "$results_file" 2>&1
    
    if [ $? -eq 0 ]; then
        # Extract key metrics
        local rps=$(grep "Requests/sec" "$results_file" | awk '{print $2}')
        local avg_latency=$(grep "Latency" "$results_file" | awk '{print $2}')
        local errors=$(grep -c "Socket errors" "$results_file" || echo "0")
        
        echo "wrk Results for $name:"
        echo "  Requests per Second: $rps"
        echo "  Average Latency: $avg_latency"
        echo "  Socket Errors: $errors"
        echo "  Full results: $results_file"
        echo ""
        
        if [ "$errors" = "0" ] && (( $(echo "$rps > 50" | bc -l) )); then
            print_pass "$name wrk test"
            return 0
        else
            print_fail "$name wrk test"
            return 1
        fi
    else
        print_fail "$name wrk test failed to run"
        return 1
    fi
}

# Function to test memory and CPU usage during load
test_resource_usage() {
    print_header "Testing Resource Usage During Load"
    
    local results_file="$RESULTS_DIR/resource_usage_${TIMESTAMP}.txt"
    local pid_file="/tmp/resource_monitor_$$"
    
    # Start resource monitoring in background
    {
        echo "Timestamp,CPU%,Memory%,Load1,Load5,Load15"
        while [ -f "$pid_file" ]; do
            local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
            local cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)
            local memory_usage=$(free | grep Mem | awk '{printf "%.1f", $3/$2 * 100.0}')
            local load_avg=$(uptime | awk -F'load average:' '{print $2}' | sed 's/,//g')
            
            echo "$timestamp,$cpu_usage,$memory_usage,$load_avg"
            sleep 5
        done
    } > "$results_file" &
    
    local monitor_pid=$!
    touch "$pid_file"
    
    print_info "Starting resource monitoring (PID: $monitor_pid)"
    
    # Run a load test while monitoring
    test_endpoint_performance "Resource Usage Test" "$BACKEND_URL/health" 500 20
    
    # Stop monitoring
    rm -f "$pid_file"
    wait $monitor_pid 2>/dev/null || true
    
    print_info "Resource usage data saved to: $results_file"
    
    # Analyze resource usage
    if [ -f "$results_file" ]; then
        local max_cpu=$(tail -n +2 "$results_file" | cut -d, -f2 | sort -n | tail -1)
        local max_memory=$(tail -n +2 "$results_file" | cut -d, -f3 | sort -n | tail -1)
        
        echo "Peak Resource Usage:"
        echo "  CPU: ${max_cpu}%"
        echo "  Memory: ${max_memory}%"
        
        if (( $(echo "$max_cpu < 80" | bc -l) )) && (( $(echo "$max_memory < 80" | bc -l) )); then
            print_pass "Resource usage within acceptable limits"
        else
            print_warning "High resource usage detected (CPU: ${max_cpu}%, Memory: ${max_memory}%)"
        fi
    fi
}

# Function to test WebSocket performance
test_websocket_performance() {
    print_header "Testing WebSocket Performance"
    
    local results_file="$RESULTS_DIR/websocket_${TIMESTAMP}.txt"
    
    print_info "Testing WebSocket connection performance"
    
    # Create a simple WebSocket test script
    cat > "/tmp/websocket_test_$$.js" << 'EOF'
const WebSocket = require('ws');

const url = process.argv[2] || 'ws://localhost:3001/socket.io/?EIO=4&transport=websocket';
const connections = parseInt(process.argv[3]) || 10;
const duration = parseInt(process.argv[4]) || 30;

let connectedCount = 0;
let messageCount = 0;
let errorCount = 0;
let startTime = Date.now();

console.log(`Testing ${connections} WebSocket connections for ${duration} seconds`);

for (let i = 0; i < connections; i++) {
    try {
        const ws = new WebSocket(url);
        
        ws.on('open', () => {
            connectedCount++;
            
            // Send periodic messages
            const interval = setInterval(() => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
                    messageCount++;
                }
            }, 1000);
            
            setTimeout(() => {
                clearInterval(interval);
                ws.close();
            }, duration * 1000);
        });
        
        ws.on('error', (error) => {
            errorCount++;
        });
        
        ws.on('close', () => {
            connectedCount--;
            if (connectedCount === 0) {
                const endTime = Date.now();
                const totalTime = (endTime - startTime) / 1000;
                
                console.log(`\nWebSocket Performance Results:`);
                console.log(`Total Time: ${totalTime}s`);
                console.log(`Messages Sent: ${messageCount}`);
                console.log(`Errors: ${errorCount}`);
                console.log(`Messages per Second: ${(messageCount / totalTime).toFixed(2)}`);
                
                process.exit(errorCount > 0 ? 1 : 0);
            }
        });
    } catch (error) {
        errorCount++;
    }
}

// Timeout safety
setTimeout(() => {
    console.log('Test timeout reached');
    process.exit(1);
}, (duration + 10) * 1000);
EOF
    
    # Check if Node.js and ws module are available
    if command -v node &> /dev/null; then
        # Try to install ws module if not available
        if ! node -e "require('ws')" 2>/dev/null; then
            print_info "Installing ws module for WebSocket testing"
            npm install ws --no-save 2>/dev/null || {
                print_warning "Could not install ws module - skipping WebSocket performance test"
                rm -f "/tmp/websocket_test_$$.js"
                return 0
            }
        fi
        
        # Run WebSocket test
        if node "/tmp/websocket_test_$$.js" "ws://localhost:3001/socket.io/?EIO=4&transport=websocket" 5 15 > "$results_file" 2>&1; then
            print_pass "WebSocket performance test"
            cat "$results_file"
        else
            print_fail "WebSocket performance test"
            print_info "Error details in: $results_file"
        fi
    else
        print_warning "Node.js not available - skipping WebSocket performance test"
    fi
    
    rm -f "/tmp/websocket_test_$$.js"
}

# Function to generate performance report
generate_performance_report() {
    print_header "Performance Test Summary"
    
    local report_file="$RESULTS_DIR/performance_summary_${TIMESTAMP}.html"
    
    # Create HTML report
    cat > "$report_file" << EOF
<!DOCTYPE html>
<html>
<head>
    <title>Performance Test Report - sidarsih.site</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f0f0f0; padding: 20px; border-radius: 5px; }
        .section { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
        .pass { color: green; }
        .fail { color: red; }
        .warn { color: orange; }
        table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Performance Test Report</h1>
        <p><strong>Domain:</strong> $DOMAIN</p>
        <p><strong>Timestamp:</strong> $(date)</p>
        <p><strong>Test Duration:</strong> $TEST_DURATION seconds</p>
        <p><strong>Concurrent Users:</strong> $CONCURRENT_USERS</p>
    </div>
    
    <div class="section">
        <h2>Test Results</h2>
        <p>Detailed results can be found in the following files:</p>
        <ul>
EOF
    
    # Add links to result files
    for file in "$RESULTS_DIR"/*_"$TIMESTAMP".*; do
        if [ -f "$file" ]; then
            local filename=$(basename "$file")
            echo "            <li><a href=\"$filename\">$filename</a></li>" >> "$report_file"
        fi
    done
    
    cat >> "$report_file" << EOF
        </ul>
    </div>
    
    <div class="section">
        <h2>Recommendations</h2>
        <ul>
            <li>Monitor response times regularly</li>
            <li>Set up automated performance testing</li>
            <li>Consider implementing caching for better performance</li>
            <li>Monitor resource usage during peak loads</li>
            <li>Implement rate limiting to prevent abuse</li>
        </ul>
    </div>
</body>
</html>
EOF
    
    print_info "Performance report generated: $report_file"
}

# Main function
main() {
    print_header "Starting Performance Testing for $DOMAIN"
    
    # Create results directory
    mkdir -p "$RESULTS_DIR"
    
    # Check dependencies
    check_dependencies
    
    # Test individual endpoints
    print_header "Testing Individual Endpoints"
    test_endpoint_performance "Health Check" "$BACKEND_URL/health" 100 10
    test_endpoint_performance "API Status" "$BACKEND_URL/api/status" 100 10
    test_endpoint_performance "WhatsApp Status" "$BACKEND_URL/api/whatsapp/status" 50 5
    
    # Test with external tools if available
    test_with_apache_bench "Health Check AB" "$BACKEND_URL/health" 1000 20
    test_with_wrk "API Status wrk" "$BACKEND_URL/api/status" "30s" 4 10
    
    # Test resource usage
    test_resource_usage
    
    # Test WebSocket performance
    test_websocket_performance
    
    # Generate report
    generate_performance_report
    
    print_header "Performance Testing Complete"
    print_info "All results saved to: $RESULTS_DIR"
}

# Handle script arguments
case "$1" in
    --help|-h)
        echo "Usage: $0 [OPTIONS]"
        echo "Options:"
        echo "  --help, -h     Show this help message"
        echo "  --users N      Number of concurrent users (default: $CONCURRENT_USERS)"
        echo "  --duration N   Test duration in seconds (default: $TEST_DURATION)"
        echo ""
        echo "This script performs comprehensive performance testing of the sidarsih.site application."
        echo "Results are saved to: $RESULTS_DIR"
        exit 0
        ;;
    --users)
        CONCURRENT_USERS="$2"
        shift 2
        ;;
    --duration)
        TEST_DURATION="$2"
        shift 2
        ;;
    *)
        main "$@"
        ;;
esac