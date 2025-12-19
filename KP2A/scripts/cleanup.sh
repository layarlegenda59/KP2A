#!/bin/bash

# SIDARSIH Cloudflare Tunnel System Cleanup Script
# This script performs log rotation, maintenance, and system cleanup tasks

# Configuration
PROJECT_DIR="/home/dell/KP2A-CIMAHI/KP2A"
SCRIPTS_DIR="$PROJECT_DIR/scripts"
LOGS_DIR="$PROJECT_DIR/logs"
PIDS_DIR="$PROJECT_DIR/pids"
BACKUP_DIR="$PROJECT_DIR/backups"
TEMP_DIR="$PROJECT_DIR/temp"

# Cleanup configuration
LOG_RETENTION_DAYS=7
REPORT_RETENTION_DAYS=3
BACKUP_RETENTION_DAYS=30
MAX_LOG_SIZE_MB=100
COMPRESS_LOGS_OLDER_THAN_DAYS=1
CLEANUP_LOG="$LOGS_DIR/cleanup.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Create necessary directories
mkdir -p "$LOGS_DIR" "$BACKUP_DIR" "$TEMP_DIR"

# Logging function
log() {
    local level=$1
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [$level] $message" >> "$CLEANUP_LOG"
    
    case $level in
        "ERROR")   echo -e "${RED}[ERROR]${NC} $message" ;;
        "WARN")    echo -e "${YELLOW}[WARN]${NC} $message" ;;
        "INFO")    echo -e "${GREEN}[INFO]${NC} $message" ;;
        "DEBUG")   echo -e "${BLUE}[DEBUG]${NC} $message" ;;
        "CLEANUP") echo -e "${PURPLE}[CLEANUP]${NC} $message" ;;
        *)         echo -e "${CYAN}[$level]${NC} $message" ;;
    esac
}

# Get file size in MB
get_file_size_mb() {
    local file=$1
    if [[ -f "$file" ]]; then
        local size_bytes=$(stat -c%s "$file" 2>/dev/null || echo 0)
        echo $((size_bytes / 1024 / 1024))
    else
        echo 0
    fi
}

# Rotate log file
rotate_log() {
    local log_file=$1
    local max_rotations=${2:-5}
    
    if [[ ! -f "$log_file" ]]; then
        return 0
    fi
    
    local base_name=$(basename "$log_file" .log)
    local dir_name=$(dirname "$log_file")
    
    # Rotate existing numbered logs
    for ((i=max_rotations; i>=1; i--)); do
        local current_log="$dir_name/${base_name}.log.$i"
        local next_log="$dir_name/${base_name}.log.$((i+1))"
        
        if [[ -f "$current_log" ]]; then
            if [[ $i -eq $max_rotations ]]; then
                log "DEBUG" "Removing oldest log rotation: $current_log"
                rm -f "$current_log"
            else
                log "DEBUG" "Rotating $current_log to $next_log"
                mv "$current_log" "$next_log"
            fi
        fi
    done
    
    # Move current log to .1
    local first_rotation="$dir_name/${base_name}.log.1"
    log "DEBUG" "Rotating current log $log_file to $first_rotation"
    mv "$log_file" "$first_rotation"
    
    # Create new empty log file
    touch "$log_file"
    chmod 644 "$log_file"
    
    log "INFO" "Log rotation completed for $log_file"
}

# Compress old log files
compress_old_logs() {
    log "CLEANUP" "Compressing old log files..."
    
    local compressed_count=0
    
    # Find log files older than specified days and not already compressed
    find "$LOGS_DIR" -name "*.log*" -type f -mtime +$COMPRESS_LOGS_OLDER_THAN_DAYS ! -name "*.gz" | while read -r log_file; do
        if [[ -f "$log_file" ]]; then
            log "DEBUG" "Compressing $log_file"
            gzip "$log_file"
            if [[ $? -eq 0 ]]; then
                compressed_count=$((compressed_count + 1))
                log "INFO" "Compressed: $log_file"
            else
                log "ERROR" "Failed to compress: $log_file"
            fi
        fi
    done
    
    log "INFO" "Compressed $compressed_count log files"
}

# Clean up old log files
cleanup_old_logs() {
    log "CLEANUP" "Cleaning up old log files..."
    
    local deleted_count=0
    
    # Remove log files older than retention period
    find "$LOGS_DIR" -name "*.log*" -type f -mtime +$LOG_RETENTION_DAYS | while read -r old_log; do
        if [[ -f "$old_log" ]]; then
            log "DEBUG" "Removing old log: $old_log"
            rm -f "$old_log"
            if [[ $? -eq 0 ]]; then
                deleted_count=$((deleted_count + 1))
                log "INFO" "Deleted old log: $old_log"
            else
                log "ERROR" "Failed to delete: $old_log"
            fi
        fi
    done
    
    log "INFO" "Deleted $deleted_count old log files"
}

# Clean up large log files
cleanup_large_logs() {
    log "CLEANUP" "Checking for large log files..."
    
    find "$LOGS_DIR" -name "*.log" -type f | while read -r log_file; do
        local size_mb=$(get_file_size_mb "$log_file")
        
        if [[ $size_mb -gt $MAX_LOG_SIZE_MB ]]; then
            log "WARN" "Large log file detected: $log_file (${size_mb}MB)"
            
            # Backup large log before rotation
            local backup_name="$(basename "$log_file" .log)-large-$(date +%Y%m%d-%H%M%S).log"
            local backup_path="$BACKUP_DIR/$backup_name"
            
            log "INFO" "Backing up large log to: $backup_path"
            cp "$log_file" "$backup_path"
            
            if [[ $? -eq 0 ]]; then
                # Truncate the large log file
                log "INFO" "Truncating large log file: $log_file"
                echo "# Log truncated on $(date) due to size (${size_mb}MB)" > "$log_file"
                echo "# Backup saved to: $backup_path" >> "$log_file"
                echo "" >> "$log_file"
                
                # Compress the backup
                gzip "$backup_path"
                log "INFO" "Large log backed up and compressed: ${backup_path}.gz"
            else
                log "ERROR" "Failed to backup large log: $log_file"
            fi
        fi
    done
}

# Clean up old reports
cleanup_old_reports() {
    log "CLEANUP" "Cleaning up old reports..."
    
    local report_patterns=(
        "health-report-*.json"
        "security-report-*.txt"
        "performance-report-*.json"
        "tunnel-report-*.json"
    )
    
    local deleted_count=0
    
    for pattern in "${report_patterns[@]}"; do
        find "$LOGS_DIR" -name "$pattern" -type f -mtime +$REPORT_RETENTION_DAYS | while read -r old_report; do
            if [[ -f "$old_report" ]]; then
                log "DEBUG" "Removing old report: $old_report"
                rm -f "$old_report"
                if [[ $? -eq 0 ]]; then
                    deleted_count=$((deleted_count + 1))
                    log "INFO" "Deleted old report: $old_report"
                else
                    log "ERROR" "Failed to delete report: $old_report"
                fi
            fi
        done
    done
    
    log "INFO" "Deleted old reports"
}

# Clean up old backups
cleanup_old_backups() {
    log "CLEANUP" "Cleaning up old backups..."
    
    local deleted_count=0
    
    find "$BACKUP_DIR" -type f -mtime +$BACKUP_RETENTION_DAYS | while read -r old_backup; do
        if [[ -f "$old_backup" ]]; then
            log "DEBUG" "Removing old backup: $old_backup"
            rm -f "$old_backup"
            if [[ $? -eq 0 ]]; then
                deleted_count=$((deleted_count + 1))
                log "INFO" "Deleted old backup: $old_backup"
            else
                log "ERROR" "Failed to delete backup: $old_backup"
            fi
        fi
    done
    
    log "INFO" "Deleted old backups"
}

# Clean up temporary files
cleanup_temp_files() {
    log "CLEANUP" "Cleaning up temporary files..."
    
    local temp_patterns=(
        "$TEMP_DIR/*"
        "/tmp/cloudflared-*"
        "/tmp/pm2-*"
        "/tmp/tunnel-*"
        "$PROJECT_DIR/*.tmp"
        "$PROJECT_DIR/*.temp"
    )
    
    local deleted_count=0
    
    for pattern in "${temp_patterns[@]}"; do
        find $(dirname "$pattern") -name "$(basename "$pattern")" -type f -mtime +1 2>/dev/null | while read -r temp_file; do
            if [[ -f "$temp_file" ]]; then
                log "DEBUG" "Removing temp file: $temp_file"
                rm -f "$temp_file"
                if [[ $? -eq 0 ]]; then
                    deleted_count=$((deleted_count + 1))
                    log "INFO" "Deleted temp file: $temp_file"
                else
                    log "ERROR" "Failed to delete temp file: $temp_file"
                fi
            fi
        done
    done
    
    log "INFO" "Cleaned up temporary files"
}

# Clean up stale PID files
cleanup_stale_pids() {
    log "CLEANUP" "Cleaning up stale PID files..."
    
    if [[ ! -d "$PIDS_DIR" ]]; then
        return 0
    fi
    
    local cleaned_count=0
    
    find "$PIDS_DIR" -name "*.pid" -type f | while read -r pid_file; do
        if [[ -f "$pid_file" ]]; then
            local pid=$(cat "$pid_file" 2>/dev/null)
            
            if [[ -n "$pid" ]]; then
                # Check if process is still running
                if ! kill -0 "$pid" 2>/dev/null; then
                    log "DEBUG" "Removing stale PID file: $pid_file (PID: $pid)"
                    rm -f "$pid_file"
                    if [[ $? -eq 0 ]]; then
                        cleaned_count=$((cleaned_count + 1))
                        log "INFO" "Removed stale PID file: $pid_file"
                    else
                        log "ERROR" "Failed to remove PID file: $pid_file"
                    fi
                else
                    log "DEBUG" "PID file is valid: $pid_file (PID: $pid)"
                fi
            else
                log "WARN" "Empty PID file: $pid_file"
                rm -f "$pid_file"
            fi
        fi
    done
    
    log "INFO" "Cleaned up stale PID files"
}

# Clean up PM2 logs
cleanup_pm2_logs() {
    log "CLEANUP" "Cleaning up PM2 logs..."
    
    if ! command -v pm2 >/dev/null 2>&1; then
        log "WARN" "PM2 not available, skipping PM2 log cleanup"
        return 0
    fi
    
    # Flush PM2 logs
    pm2 flush >/dev/null 2>&1
    if [[ $? -eq 0 ]]; then
        log "INFO" "PM2 logs flushed successfully"
    else
        log "WARN" "Failed to flush PM2 logs"
    fi
    
    # Clean up old PM2 log files in ~/.pm2/logs
    local pm2_logs_dir="$HOME/.pm2/logs"
    if [[ -d "$pm2_logs_dir" ]]; then
        find "$pm2_logs_dir" -name "*.log" -type f -mtime +$LOG_RETENTION_DAYS -delete 2>/dev/null
        log "INFO" "Cleaned up old PM2 log files"
    fi
}

# Optimize log files (remove empty lines, etc.)
optimize_log_files() {
    log "CLEANUP" "Optimizing log files..."
    
    find "$LOGS_DIR" -name "*.log" -type f | while read -r log_file; do
        if [[ -f "$log_file" ]]; then
            local original_size=$(get_file_size_mb "$log_file")
            
            # Create temporary optimized file
            local temp_file="$TEMP_DIR/$(basename "$log_file").tmp"
            
            # Remove empty lines and compress whitespace
            grep -v '^[[:space:]]*$' "$log_file" | sed 's/[[:space:]]\+/ /g' > "$temp_file"
            
            if [[ $? -eq 0 ]]; then
                local new_size=$(get_file_size_mb "$temp_file")
                local saved_mb=$((original_size - new_size))
                
                if [[ $saved_mb -gt 0 ]]; then
                    mv "$temp_file" "$log_file"
                    log "INFO" "Optimized $log_file (saved ${saved_mb}MB)"
                else
                    rm -f "$temp_file"
                    log "DEBUG" "No optimization needed for $log_file"
                fi
            else
                log "ERROR" "Failed to optimize $log_file"
                rm -f "$temp_file"
            fi
        fi
    done
}

# Generate cleanup report
generate_cleanup_report() {
    local report_file="$LOGS_DIR/cleanup-report-$(date +%Y%m%d-%H%M%S).json"
    
    log "INFO" "Generating cleanup report: $report_file"
    
    # Collect statistics
    local total_logs=$(find "$LOGS_DIR" -name "*.log*" -type f | wc -l)
    local compressed_logs=$(find "$LOGS_DIR" -name "*.gz" -type f | wc -l)
    local total_log_size=$(du -sm "$LOGS_DIR" 2>/dev/null | cut -f1)
    local total_backups=$(find "$BACKUP_DIR" -type f 2>/dev/null | wc -l)
    local total_backup_size=$(du -sm "$BACKUP_DIR" 2>/dev/null | cut -f1)
    local disk_usage=$(df -h "$PROJECT_DIR" | tail -1 | awk '{print $5}' | cut -d'%' -f1)
    local available_space=$(df -h "$PROJECT_DIR" | tail -1 | awk '{print $4}')
    
    cat > "$report_file" << EOF
{
  "timestamp": "$(date -Iseconds)",
  "cleanup_summary": {
    "logs": {
      "total_files": $total_logs,
      "compressed_files": $compressed_logs,
      "total_size_mb": $total_log_size,
      "retention_days": $LOG_RETENTION_DAYS
    },
    "backups": {
      "total_files": $total_backups,
      "total_size_mb": $total_backup_size,
      "retention_days": $BACKUP_RETENTION_DAYS
    },
    "disk": {
      "usage_percent": $disk_usage,
      "available_space": "$available_space",
      "project_directory": "$PROJECT_DIR"
    }
  },
  "configuration": {
    "log_retention_days": $LOG_RETENTION_DAYS,
    "report_retention_days": $REPORT_RETENTION_DAYS,
    "backup_retention_days": $BACKUP_RETENTION_DAYS,
    "max_log_size_mb": $MAX_LOG_SIZE_MB,
    "compress_logs_older_than_days": $COMPRESS_LOGS_OLDER_THAN_DAYS
  },
  "directories": {
    "logs": "$LOGS_DIR",
    "backups": "$BACKUP_DIR",
    "temp": "$TEMP_DIR",
    "pids": "$PIDS_DIR"
  }
}
EOF

    log "INFO" "Cleanup report generated: $report_file"
}

# Main cleanup function
main_cleanup() {
    log "CLEANUP" "Starting SIDARSIH Cloudflare Tunnel system cleanup..."
    log "INFO" "Cleanup started at $(date)"
    
    # Run all cleanup tasks
    cleanup_large_logs
    compress_old_logs
    cleanup_old_logs
    cleanup_old_reports
    cleanup_old_backups
    cleanup_temp_files
    cleanup_stale_pids
    cleanup_pm2_logs
    optimize_log_files
    
    # Generate cleanup report
    generate_cleanup_report
    
    log "CLEANUP" "System cleanup completed successfully!"
    log "INFO" "Cleanup finished at $(date)"
}

# Quick cleanup (minimal operations)
quick_cleanup() {
    log "CLEANUP" "Starting quick cleanup..."
    
    cleanup_temp_files
    cleanup_stale_pids
    cleanup_pm2_logs
    
    log "CLEANUP" "Quick cleanup completed"
}

# Deep cleanup (comprehensive operations)
deep_cleanup() {
    log "CLEANUP" "Starting deep cleanup..."
    
    # Backup current logs before deep cleanup
    local backup_timestamp=$(date +%Y%m%d-%H%M%S)
    local backup_archive="$BACKUP_DIR/logs-backup-$backup_timestamp.tar.gz"
    
    log "INFO" "Creating backup archive: $backup_archive"
    tar -czf "$backup_archive" -C "$LOGS_DIR" . 2>/dev/null
    
    if [[ $? -eq 0 ]]; then
        log "INFO" "Backup archive created successfully"
        
        # Run comprehensive cleanup
        main_cleanup
        
        # Additional deep cleanup tasks
        log "INFO" "Running additional deep cleanup tasks..."
        
        # Clean up system logs (if accessible)
        if [[ -w /var/log ]]; then
            find /var/log -name "*cloudflared*" -type f -mtime +7 -delete 2>/dev/null
            find /var/log -name "*pm2*" -type f -mtime +7 -delete 2>/dev/null
        fi
        
        # Clean up user temp directories
        find "$HOME/tmp" -type f -mtime +1 -delete 2>/dev/null
        find "$HOME/.cache" -name "*cloudflared*" -type f -mtime +7 -delete 2>/dev/null
        
        log "CLEANUP" "Deep cleanup completed"
    else
        log "ERROR" "Failed to create backup archive, skipping deep cleanup"
        return 1
    fi
}

# Show cleanup status
show_status() {
    echo "SIDARSIH Cloudflare Tunnel Cleanup Status"
    echo "========================================"
    echo ""
    
    # Directory sizes
    echo "Directory Sizes:"
    echo "  Logs: $(du -sh "$LOGS_DIR" 2>/dev/null | cut -f1)"
    echo "  Backups: $(du -sh "$BACKUP_DIR" 2>/dev/null | cut -f1)"
    echo "  Temp: $(du -sh "$TEMP_DIR" 2>/dev/null | cut -f1)"
    echo ""
    
    # File counts
    echo "File Counts:"
    echo "  Log files: $(find "$LOGS_DIR" -name "*.log*" -type f 2>/dev/null | wc -l)"
    echo "  Compressed logs: $(find "$LOGS_DIR" -name "*.gz" -type f 2>/dev/null | wc -l)"
    echo "  Backup files: $(find "$BACKUP_DIR" -type f 2>/dev/null | wc -l)"
    echo "  PID files: $(find "$PIDS_DIR" -name "*.pid" -type f 2>/dev/null | wc -l)"
    echo ""
    
    # Disk usage
    echo "Disk Usage:"
    df -h "$PROJECT_DIR" | tail -1 | awk '{print "  Used: " $3 " (" $5 ") Available: " $4}'
    echo ""
    
    # Configuration
    echo "Cleanup Configuration:"
    echo "  Log retention: $LOG_RETENTION_DAYS days"
    echo "  Report retention: $REPORT_RETENTION_DAYS days"
    echo "  Backup retention: $BACKUP_RETENTION_DAYS days"
    echo "  Max log size: ${MAX_LOG_SIZE_MB}MB"
    echo "  Compress logs older than: $COMPRESS_LOGS_OLDER_THAN_DAYS days"
}

# Handle script arguments
case "${1:-}" in
    --help|-h)
        echo "SIDARSIH Cloudflare Tunnel System Cleanup Script"
        echo ""
        echo "Usage: $0 [OPTIONS]"
        echo ""
        echo "Options:"
        echo "  --help, -h        Show this help message"
        echo "  --quick, -q       Run quick cleanup (temp files, PIDs, PM2 logs)"
        echo "  --deep, -d        Run deep cleanup with backup"
        echo "  --status, -s      Show cleanup status and statistics"
        echo "  --logs, -l        Clean up log files only"
        echo "  --reports, -r     Clean up report files only"
        echo "  --backups, -b     Clean up old backups only"
        echo "  --temp, -t        Clean up temporary files only"
        echo "  --pids, -p        Clean up stale PID files only"
        echo "  --pm2, -m         Clean up PM2 logs only"
        echo ""
        echo "Configuration:"
        echo "  Log retention: $LOG_RETENTION_DAYS days"
        echo "  Report retention: $REPORT_RETENTION_DAYS days"
        echo "  Backup retention: $BACKUP_RETENTION_DAYS days"
        echo "  Max log size: ${MAX_LOG_SIZE_MB}MB"
        exit 0
        ;;
    --quick|-q)
        quick_cleanup
        ;;
    --deep|-d)
        deep_cleanup
        ;;
    --status|-s)
        show_status
        ;;
    --logs|-l)
        log "CLEANUP" "Cleaning up log files only..."
        cleanup_large_logs
        compress_old_logs
        cleanup_old_logs
        optimize_log_files
        ;;
    --reports|-r)
        log "CLEANUP" "Cleaning up report files only..."
        cleanup_old_reports
        ;;
    --backups|-b)
        log "CLEANUP" "Cleaning up old backups only..."
        cleanup_old_backups
        ;;
    --temp|-t)
        log "CLEANUP" "Cleaning up temporary files only..."
        cleanup_temp_files
        ;;
    --pids|-p)
        log "CLEANUP" "Cleaning up stale PID files only..."
        cleanup_stale_pids
        ;;
    --pm2|-m)
        log "CLEANUP" "Cleaning up PM2 logs only..."
        cleanup_pm2_logs
        ;;
    "")
        main_cleanup
        ;;
    *)
        log "ERROR" "Unknown option: $1"
        log "INFO" "Use --help for usage information"
        exit 1
        ;;
esac