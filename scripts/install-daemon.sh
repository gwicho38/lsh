#!/bin/bash
# LSHD (LSH Daemon) Installation Script
# Installs and configures the LSH daemon as a system service

set -e

# Configuration
LSH_HOME="/opt/lsh"
SERVICE_USER="lsh"
LOG_DIR="/var/log/lsh"
DATA_DIR="/var/lib/lsh"

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
            error "Unsupported init system"
        fi
        OS="linux"
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        INIT_SYSTEM="launchd"
        OS="macos"
    else
        error "Unsupported operating system: $OSTYPE"
    fi

    log "Detected OS: $OS, Init system: $INIT_SYSTEM"
}

# Check if running as root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        error "This script must be run as root"
    fi
}

# Create system user
create_user() {
    # Check if user exists and is properly configured
    local user_exists=false
    local user_complete=false

    if id "$SERVICE_USER" &>/dev/null; then
        user_exists=true
        user_complete=true
    elif [[ "$OS" == "macos" ]] && dscl . -list /Users | grep -q "^$SERVICE_USER$"; then
        user_exists=true
        # Check if user has all required attributes
        if dscl . -read "/Users/$SERVICE_USER" UniqueID &>/dev/null && \
           dscl . -read "/Users/$SERVICE_USER" PrimaryGroupID &>/dev/null && \
           dscl . -read "/Users/$SERVICE_USER" NFSHomeDirectory &>/dev/null; then
            user_complete=true
        else
            log "User $SERVICE_USER exists but is incomplete - fixing..."
            user_complete=false
        fi
    fi

    if [[ "$user_exists" == "true" && "$user_complete" == "true" ]]; then
        log "User $SERVICE_USER already exists and is properly configured"
    elif [[ "$user_exists" == "true" && "$user_complete" == "false" && "$OS" == "macos" ]]; then
        # Fix incomplete user on macOS
        log "Repairing incomplete user $SERVICE_USER"

        # Find the next available UID starting from 501
        local next_uid=501
        while dscl . -list /Users UniqueID | grep -q " $next_uid$"; do
            ((next_uid++))
        done

        # Add missing attributes
        if ! dscl . -read "/Users/$SERVICE_USER" UniqueID &>/dev/null; then
            dscl . -create "/Users/$SERVICE_USER" UniqueID "$next_uid"
            log "Added UniqueID $next_uid"
        fi

        if ! dscl . -read "/Users/$SERVICE_USER" PrimaryGroupID &>/dev/null; then
            dscl . -create "/Users/$SERVICE_USER" PrimaryGroupID 20
            log "Added PrimaryGroupID 20 (staff)"
        fi

        if ! dscl . -read "/Users/$SERVICE_USER" NFSHomeDirectory &>/dev/null; then
            dscl . -create "/Users/$SERVICE_USER" NFSHomeDirectory "$LSH_HOME"
            log "Added NFSHomeDirectory $LSH_HOME"
        fi

        if ! dscl . -read "/Users/$SERVICE_USER" UserShell &>/dev/null; then
            dscl . -create "/Users/$SERVICE_USER" UserShell /usr/bin/false
            log "Added UserShell /usr/bin/false"
        fi

        # Flush directory service cache
        dscacheutil -flushcache

        # Verify user is now complete
        if id "$SERVICE_USER" &>/dev/null; then
            log "User $SERVICE_USER repaired successfully"
        else
            error "Failed to repair user $SERVICE_USER"
        fi
    else
        log "Creating user $SERVICE_USER"
        if [[ "$OS" == "linux" ]]; then
            useradd --system --home "$LSH_HOME" --shell /bin/false "$SERVICE_USER"
        elif [[ "$OS" == "macos" ]]; then
            # Find the next available UID starting from 501
            local next_uid=501
            while dscl . -list /Users UniqueID | grep -q " $next_uid$"; do
                ((next_uid++))
            done

            # macOS user creation
            dscl . -create "/Users/$SERVICE_USER"
            dscl . -create "/Users/$SERVICE_USER" UserShell /usr/bin/false
            dscl . -create "/Users/$SERVICE_USER" RealName "LSH Daemon"
            dscl . -create "/Users/$SERVICE_USER" UniqueID "$next_uid"
            dscl . -create "/Users/$SERVICE_USER" PrimaryGroupID 20
            dscl . -create "/Users/$SERVICE_USER" NFSHomeDirectory "$LSH_HOME"

            # Flush directory service cache
            dscacheutil -flushcache
        fi

        # Verify user was created
        if id "$SERVICE_USER" &>/dev/null; then
            log "User $SERVICE_USER created successfully"
        else
            error "Failed to create user $SERVICE_USER"
        fi
    fi
}

# Create directories
create_directories() {
    log "Creating directories"

    # Create main directory
    mkdir -p "$LSH_HOME"
    mkdir -p "$LOG_DIR"
    mkdir -p "$DATA_DIR"

    # Determine appropriate group for the OS
    local service_group="$SERVICE_USER"
    if [[ "$OS" == "macos" ]]; then
        # On macOS, use the staff group (GID 20) which is standard
        service_group="staff"
    fi

    # Set permissions
    chown -R "$SERVICE_USER:$service_group" "$LSH_HOME"
    chown -R "$SERVICE_USER:$service_group" "$LOG_DIR"
    chown -R "$SERVICE_USER:$service_group" "$DATA_DIR"

    chmod 755 "$LSH_HOME"
    chmod 755 "$LOG_DIR"
    chmod 755 "$DATA_DIR"
}

# Install Node.js if not present
install_nodejs() {
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        log "Node.js is already installed: $NODE_VERSION"
    else
        log "Installing Node.js"
        if [[ "$OS" == "linux" ]]; then
            # Install Node.js on Linux
            curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
            apt-get install -y nodejs
        elif [[ "$OS" == "macos" ]]; then
            # Install Node.js on macOS
            if command -v brew &> /dev/null; then
                brew install node
            else
                error "Homebrew is required to install Node.js on macOS"
            fi
        fi
    fi
}

# Copy LSH files
install_lsh() {
    log "Installing LSH files"

    # Store original directory
    local original_dir="$(pwd)"

    # Copy compiled JavaScript files
    if [[ -d "./dist" ]]; then
        cp -r ./dist "$LSH_HOME/"
    else
        error "LSH distribution files not found. Please run 'npm run compile-ts' first."
    fi

    # Copy package files
    if [[ -f "./package.json" ]]; then
        cp ./package.json "$LSH_HOME/"
    fi

    # Install dependencies
    cd "$LSH_HOME"
    npm install --production

    # Set permissions
    local service_group="$SERVICE_USER"
    if [[ "$OS" == "macos" ]]; then
        service_group="staff"
    fi
    chown -R "$SERVICE_USER:$service_group" "$LSH_HOME"

    # Return to original directory
    cd "$original_dir"
}

# Install systemd service
install_systemd() {
    log "Installing systemd service"

    # Update service file paths
    sed -e "s|/opt/lsh|$LSH_HOME|g" \
        -e "s|/usr/local/bin/node|$(which node)|g" \
        ./service/systemd/lshd.service > /etc/systemd/system/lshd.service

    # Reload systemd
    systemctl daemon-reload
    systemctl enable lshd

    log "Systemd service installed and enabled"
}

# Install launchd service (macOS)
install_launchd() {
    log "Installing launchd service"

    # Update plist file paths
    sed -e "s|/usr/local/lib/lsh|$LSH_HOME|g" \
        -e "s|/usr/local/bin/node|$(which node)|g" \
        ./service/launchd/com.lshd.plist > /Library/LaunchDaemons/com.lshd.plist

    # Load service
    launchctl load /Library/LaunchDaemons/com.lshd.plist

    log "Launchd service installed and loaded"
}

# Install SysV init script
install_sysv() {
    log "Installing SysV init script"

    # Update init script paths
    sed -e "s|/opt/lsh|$LSH_HOME|g" \
        ./service/init.d/lshd > /etc/init.d/lshd

    chmod +x /etc/init.d/lshd

    # Enable service
    if command -v chkconfig &> /dev/null; then
        chkconfig --add lshd
        chkconfig lshd on
    elif command -v update-rc.d &> /dev/null; then
        update-rc.d lshd defaults
    fi

    log "SysV init script installed and enabled"
}

# Install service based on init system
install_service() {
    case "$INIT_SYSTEM" in
        systemd)
            install_systemd
            ;;
        launchd)
            install_launchd
            ;;
        sysv)
            install_sysv
            ;;
        *)
            error "Unsupported init system: $INIT_SYSTEM"
            ;;
    esac
}

# Create daemon client command
create_daemon_command() {
    log "Creating daemon client command"

    cat > /usr/local/bin/lshd << 'EOF'
#!/bin/bash
# LSHD Client Command
# Provides easy interface to control the LSH daemon

DAEMON_SOCKET="/tmp/lshd.sock"
LSH_HOME="/opt/lsh"

# Check if daemon is running
is_daemon_running() {
    if [[ -S "$DAEMON_SOCKET" ]]; then
        return 0
    else
        return 1
    fi
}

# Send command to daemon via socket
send_command() {
    local cmd="$1"
    local args="$2"

    if ! is_daemon_running; then
        echo "Error: LSHD is not running"
        exit 1
    fi

    # Use netcat or socat to communicate with daemon
    if command -v nc &> /dev/null; then
        echo "{\"command\":\"$cmd\",\"args\":$args}" | nc -U "$DAEMON_SOCKET"
    elif command -v socat &> /dev/null; then
        echo "{\"command\":\"$cmd\",\"args\":$args}" | socat - UNIX-CONNECT:"$DAEMON_SOCKET"
    else
        echo "Error: netcat or socat is required for daemon communication"
        exit 1
    fi
}

case "$1" in
    start)
        sudo systemctl start lshd 2>/dev/null || sudo service lshd start 2>/dev/null || sudo launchctl load /Library/LaunchDaemons/com.lshd.plist 2>/dev/null
        ;;
    stop)
        sudo systemctl stop lshd 2>/dev/null || sudo service lshd stop 2>/dev/null || sudo launchctl unload /Library/LaunchDaemons/com.lshd.plist 2>/dev/null
        ;;
    status)
        if is_daemon_running; then
            send_command "status" "{}"
        else
            echo "LSHD is not running"
        fi
        ;;
    restart)
        sudo systemctl restart lshd 2>/dev/null || sudo service lshd restart 2>/dev/null || (sudo launchctl unload /Library/LaunchDaemons/com.lshd.plist && sudo launchctl load /Library/LaunchDaemons/com.lshd.plist) 2>/dev/null
        ;;
    job-list|jlist)
        send_command "listJobs" "{}"
        ;;
    job-add)
        if [[ -z "$2" ]]; then
            echo "Usage: lsh-daemon job-add <command>"
            exit 1
        fi
        send_command "addJob" "{\"jobSpec\":{\"command\":\"$2\",\"name\":\"CLI Job\"}}"
        ;;
    job-start)
        if [[ -z "$2" ]]; then
            echo "Usage: lsh-daemon job-start <job-id>"
            exit 1
        fi
        send_command "startJob" "{\"jobId\":\"$2\"}"
        ;;
    job-stop)
        if [[ -z "$2" ]]; then
            echo "Usage: lsh-daemon job-stop <job-id>"
            exit 1
        fi
        send_command "stopJob" "{\"jobId\":\"$2\"}"
        ;;
    *)
        echo "Usage: lshd {start|stop|status|restart|job-list|job-add|job-start|job-stop}"
        echo ""
        echo "Daemon Control:"
        echo "  start       Start LSHD"
        echo "  stop        Stop LSHD"
        echo "  status      Show daemon status"
        echo "  restart     Restart the daemon"
        echo ""
        echo "Job Management:"
        echo "  job-list    List all jobs"
        echo "  job-add     Add a new job"
        echo "  job-start   Start a job"
        echo "  job-stop    Stop a job"
        exit 1
        ;;
esac
EOF

    chmod +x /usr/local/bin/lshd
    log "Created daemon client command at /usr/local/bin/lshd"
}

# Start daemon
start_daemon() {
    log "Starting LSHD"

    case "$INIT_SYSTEM" in
        systemd)
            systemctl start lshd
            ;;
        launchd)
            launchctl start com.lshd
            ;;
        sysv)
            service lshd start
            ;;
    esac

    # Wait a moment and check if it started
    sleep 2
    if lshd status &>/dev/null; then
        log "LSHD started successfully"
    else
        warn "LSHD may not have started properly. Check logs."
    fi
}

# Main installation process
main() {
    echo -e "${BLUE}LSHD (LSH Daemon) Installation${NC}"
    echo "================================="

    detect_os
    check_root
    create_user
    create_directories
    install_nodejs
    install_lsh
    install_service
    create_daemon_command
    start_daemon

    echo ""
    log "Installation completed successfully!"
    echo ""
    echo -e "${GREEN}Next steps:${NC}"
    echo "1. Use 'lshd status' to check daemon status"
    echo "2. Use 'lshd job-list' to see jobs"
    echo "3. Use 'lshd job-add \"your-command\"' to add jobs"
    echo "4. Check logs in $LOG_DIR"
    echo ""
    echo -e "${BLUE}LSHD will now run automatically and persist jobs across reboots!${NC}"
}

# Run main function
main "$@"