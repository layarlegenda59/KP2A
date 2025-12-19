#!/bin/bash

# Cloudflare Tunnel Monitoring Script for sidarsih.site
# This script monitors tunnel health and connectivity

LOG_FILE="/home/dell/KP2A-CIMAHI/KP2A/logs/tunnel-monitor.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

# Function to log messages
log_message() {
    echo "[$DATE] $1" >> "$LOG_FILE"
}

# Function to check tunnel status
check_tunnel_status() {
    log_message "=== TUNNEL STATUS CHECK ==="
    
    # Check if cloudflared service is running
    if systemctl is-active --quiet cloudflared; then
        log_message "✅ Cloudflared service is running"
    else
        log_message "❌ Cloudflared service is not running"
        return 1
    fi
    
    # Check tunnel connections
    TUNNEL_INFO=$(cloudflared tunnel info sidarsih 2>/dev/null)
    if [[ $? -eq 0 ]]; then
        CONNECTIONS=$(echo "$TUNNEL_INFO" | grep -o '[0-9]*xsin' | wc -l)
        log_message "✅ Tunnel has $CONNECTIONS active connections"
    else
        log_message "❌ Unable to get tunnel info"
        return 1
    fi
    
    # Check local services
    if curl -s -f http://localhost:8080 > /dev/null; then
        log_message "✅ Frontend proxy (port 8080) is responding"
    else
        log_message "❌ Frontend proxy (port 8080) is not responding"
        return 1
    fi
    
    if curl -s -f http://localhost:3001/health > /dev/null; then
        log_message "✅ Backend service (port 3001) is responding"
    else
        log_message "❌ Backend service (port 3001) is not responding"
        return 1
    fi
    
    if curl -s -f http://localhost:5175 > /dev/null; then
        log_message "✅ Admin panel (port 5175) is responding"
    else
        log_message "❌ Admin panel (port 5175) is not responding"
        return 1
    fi
    
    return 0
}

# Function to check external connectivity
check_external_connectivity() {
    log_message "=== EXTERNAL CONNECTIVITY CHECK ==="
    
    # Check main domain
    if curl -s -f --connect-timeout 10 https://sidarsih.site > /dev/null; then
        log_message "✅ https://sidarsih.site is accessible"
    else
        log_message "❌ https://sidarsih.site is not accessible"
        return 1
    fi
    
    # Check www subdomain
    if curl -s -f --connect-timeout 10 https://www.sidarsih.site > /dev/null; then
        log_message "✅ https://www.sidarsih.site is accessible"
    else
        log_message "❌ https://www.sidarsih.site is not accessible"
        return 1
    fi
    
    # Check API subdomain
    if curl -s -f --connect-timeout 10 https://api.sidarsih.site/health > /dev/null; then
        log_message "✅ https://api.sidarsih.site is accessible"
    else
        log_message "❌ https://api.sidarsih.site is not accessible"
        return 1
    fi
    
    return 0
}

# Function to check metrics
check_metrics() {
    log_message "=== METRICS CHECK ==="
    
    if curl -s -f http://localhost:8081/metrics > /dev/null; then
        log_message "✅ Tunnel metrics endpoint is accessible"
    else
        log_message "❌ Tunnel metrics endpoint is not accessible"
        return 1
    fi
    
    return 0
}

# Main monitoring function
main() {
    log_message "Starting tunnel monitoring for sidarsih.site"
    
    OVERALL_STATUS=0
    
    check_tunnel_status || OVERALL_STATUS=1
    check_external_connectivity || OVERALL_STATUS=1
    check_metrics || OVERALL_STATUS=1
    
    if [[ $OVERALL_STATUS -eq 0 ]]; then
        log_message "🎉 ALL CHECKS PASSED - Tunnel is fully operational"
    else
        log_message "⚠️ SOME CHECKS FAILED - Tunnel needs attention"
    fi
    
    log_message "=== MONITORING COMPLETE ==="
    echo ""
    
    return $OVERALL_STATUS
}

# Run main function
main "$@"