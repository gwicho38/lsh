#!/bin/bash
# LSH Uninstall Script
# Removes LSH binary, daemon service, and all associated files

set -e

# Configuration
LSH_HOME="/opt/lsh"
SERVICE_USER="lsh"
LOG_DIR="/var/log/lsh"
DATA_DIR="/var/lib/lsh"
SYS_BIN_DIR="/usr/local/bin"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
    exit 1
}

# Detect OS and init system
detect_os() {
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        if command -v systemctl &> /dev/null; then
            INIT_SYSTEM="systemd"
        elif command -v service &> /dev/null; then
            INIT_SYSTEM="sysv"
        else
            INIT_SYSTEM="unknown"
        fi
        OS="linux"
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        INIT_SYSTEM="launchd"
        OS="macos"
    else
        INIT_SYSTEM="unknown"
        OS="unknown"
    fi

    log "Detected OS: $OS, Init system: $INIT_SYSTEM"
}

# Check if running as root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        error "This script must be run as root"
    fi
}

# Stop and remove daemon service
remove_daemon_service() {
    log "Stopping and removing daemon service"
    
    # Stop the daemon if it's running
    if command -v lshd &> /dev/null; then
        log "Stopping LSHD daemon"
        lshd stop 2>/dev/null || true
    fi
    
    # Remove service based on init system
    case "$INIT_SYSTEM" in
        systemd)
            if systemctl is-active lshd &>/dev/null; then
                systemctl stop lshd
                log "Stopped systemd service"
            fi
            if systemctl is-enabled lshd &>/dev/null; then
                systemctl disable lshd
                log "Disabled systemd service"
            fi
            if [[ -f "/etc/systemd/system/lshd.service" ]]; then
                rm -f /etc/systemd/system/lshd.service
                systemctl daemon-reload
                log "Removed systemd service file"
            fi
            ;;
        launchd)
            if [[ -f "/Library/LaunchDaemons/com.lshd.plist" ]]; then
                launchctl unload /Library/LaunchDaemons/com.lshd.plist 2>/dev/null || true
                rm -f /Library/LaunchDaemons/com.lshd.plist
                log "Removed launchd service"
            fi
            ;;
        sysv)
            if [[ -f "/etc/init.d/lshd" ]]; then
                if command -v chkconfig &> /dev/null; then
                    chkconfig --del lshd 2>/dev/null || true
                elif command -v update-rc.d &> /dev/null; then
                    update-rc.d -f lshd remove 2>/dev/null || true
                fi
                rm -f /etc/init.d/lshd
                log "Removed SysV init script"
            fi
            ;;
        *)
            warn "Unknown init system - manual cleanup may be required"
            ;;
    esac
}

# Remove daemon client command
remove_daemon_command() {
    if [[ -f "$SYS_BIN_DIR/lshd" ]]; then
        rm -f "$SYS_BIN_DIR/lshd"
        log "Removed daemon client command"
    fi
}

# Remove LSH system binary
remove_system_binary() {
    if [[ -f "$SYS_BIN_DIR/lsh" ]]; then
        rm -f "$SYS_BIN_DIR/lsh"
        log "Removed LSH system binary"
    fi
}

# Remove LSH library files
remove_library_files() {
    if [[ -d "/usr/local/lib/lsh" ]]; then
        rm -rf /usr/local/lib/lsh
        log "Removed LSH library files"
    fi
}

# Remove LSH installation directory
remove_installation_directory() {
    if [[ -d "$LSH_HOME" ]]; then
        rm -rf "$LSH_HOME"
        log "Removed LSH installation directory: $LSH_HOME"
    fi
}

# Remove log directory
remove_log_directory() {
    if [[ -d "$LOG_DIR" ]]; then
        rm -rf "$LOG_DIR"
        log "Removed log directory: $LOG_DIR"
    fi
}

# Remove data directory
remove_data_directory() {
    if [[ -d "$DATA_DIR" ]]; then
        rm -rf "$DATA_DIR"
        log "Removed data directory: $DATA_DIR"
    fi
}

# Remove service user
remove_service_user() {
    if id "$SERVICE_USER" &>/dev/null; then
        log "Removing service user: $SERVICE_USER"
        
        if [[ "$OS" == "linux" ]]; then
            userdel "$SERVICE_USER" 2>/dev/null || true
        elif [[ "$OS" == "macos" ]]; then
            dscl . -delete "/Users/$SERVICE_USER" 2>/dev/null || true
            dscacheutil -flushcache 2>/dev/null || true
        fi
        
        log "Service user removed"
    else
        log "Service user $SERVICE_USER not found"
    fi
}

# Remove temporary files
remove_temp_files() {
    log "Cleaning up temporary files"
    
    # Remove daemon socket and PID files
    rm -f /tmp/lsh-job-daemon.*
    rm -f /tmp/lshd.sock
    
    # Remove any other LSH temporary files
    find /tmp -name "*lsh*" -type f -delete 2>/dev/null || true
    
    log "Temporary files cleaned up"
}

# Verify removal
verify_removal() {
    log "Verifying removal"
    
    local issues=0
    
    # Check if binaries are still accessible
    if command -v lsh &> /dev/null; then
        warn "LSH binary still accessible in PATH"
        issues=$((issues + 1))
    fi
    
    if command -v lshd &> /dev/null; then
        warn "LSHD command still accessible in PATH"
        issues=$((issues + 1))
    fi
    
    # Check if directories still exist
    if [[ -d "$LSH_HOME" ]]; then
        warn "LSH installation directory still exists: $LSH_HOME"
        issues=$((issues + 1))
    fi
    
    if [[ -d "$LOG_DIR" ]]; then
        warn "Log directory still exists: $LOG_DIR"
        issues=$((issues + 1))
    fi
    
    if [[ -d "$DATA_DIR" ]]; then
        warn "Data directory still exists: $DATA_DIR"
        issues=$((issues + 1))
    fi
    
    # Check if service user still exists
    if id "$SERVICE_USER" &>/dev/null; then
        warn "Service user still exists: $SERVICE_USER"
        issues=$((issues + 1))
    fi
    
    if [[ $issues -eq 0 ]]; then
        log "✅ All LSH components successfully removed"
    else
        warn "⚠️  $issues issues found - manual cleanup may be required"
    fi
}

# Show removal summary
show_summary() {
    echo ""
    echo -e "${BLUE}LSH Uninstall Summary${NC}"
    echo "======================="
    echo -e "${GREEN}✅ Daemon service stopped and removed${NC}"
    echo -e "${GREEN}✅ System binaries removed${NC}"
    echo -e "${GREEN}✅ Library files removed${NC}"
    echo -e "${GREEN}✅ Installation directory removed${NC}"
    echo -e "${GREEN}✅ Log and data directories removed${NC}"
    echo -e "${GREEN}✅ Service user removed${NC}"
    echo -e "${GREEN}✅ Temporary files cleaned up${NC}"
    echo ""
    echo -e "${BLUE}LSH has been completely removed from your system.${NC}"
    echo ""
    echo -e "${YELLOW}Note:${NC} If you installed LSH from source or used other"
    echo "installation methods, you may need to manually remove"
    echo "additional files or directories."
}

# Main uninstall process
main() {
    echo -e "${BLUE}LSH Uninstall${NC}"
    echo "=============="
    echo ""
    echo -e "${YELLOW}This will completely remove LSH from your system:${NC}"
    echo "  • Stop and remove daemon service"
    echo "  • Remove system binaries (lsh, lshd)"
    echo "  • Remove library files"
    echo "  • Remove installation directory"
    echo "  • Remove log and data directories"
    echo "  • Remove service user"
    echo "  • Clean up temporary files"
    echo ""
    
    # Ask for confirmation
    read -p "Are you sure you want to continue? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Uninstall cancelled."
        exit 0
    fi
    
    detect_os
    check_root
    
    remove_daemon_service
    remove_daemon_command
    remove_system_binary
    remove_library_files
    remove_installation_directory
    remove_log_directory
    remove_data_directory
    remove_service_user
    remove_temp_files
    verify_removal
    show_summary
}

# Run main function
main "$@"