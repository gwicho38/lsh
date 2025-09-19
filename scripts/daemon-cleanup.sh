#!/bin/bash
##
# LSH Daemon Cleanup Script
# Kills all daemon processes and cleans up socket/pid files
#
# Usage: ./scripts/daemon-cleanup.sh [--force]
##

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}ℹ️  INFO:${NC} $1"
}

log_success() {
    echo -e "${GREEN}✅ SUCCESS:${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}⚠️  WARNING:${NC} $1"
}

log_error() {
    echo -e "${RED}❌ ERROR:${NC} $1"
}

FORCE_MODE=false
if [[ "${1:-}" == "--force" ]]; then
    FORCE_MODE=true
fi

echo "🧹 LSH Daemon Cleanup"
echo "===================="
echo

# 1. Find all daemon processes
log_info "Finding LSH daemon processes..."
DAEMON_PIDS=$(pgrep -f "lshd.js" 2>/dev/null || echo "")

if [[ -n "$DAEMON_PIDS" ]]; then
    echo "Found daemon processes:"
    ps aux | grep lshd | grep -v grep | while read line; do
        echo "  $line"
    done
    echo

    if [[ "$FORCE_MODE" == "true" ]] || read -p "Kill all daemon processes? (y/N): " -n 1 -r && [[ $REPLY =~ ^[Yy]$ ]]; then
        echo
        log_info "Killing daemon processes..."

        # Kill user processes first
        pkill -f "lshd.js" 2>/dev/null || true
        sleep 2

        # Check if any processes remain (likely root processes)
        REMAINING_PIDS=$(pgrep -f "lshd.js" 2>/dev/null || echo "")
        if [[ -n "$REMAINING_PIDS" ]]; then
            log_warning "Some processes require sudo to kill (root-owned daemons)"
            if [[ "$FORCE_MODE" == "true" ]] || read -p "Kill root processes with sudo? (y/N): " -n 1 -r && [[ $REPLY =~ ^[Yy]$ ]]; then
                echo
                sudo pkill -f "lshd.js" 2>/dev/null || true
                sleep 2
            fi
        fi

        log_success "Daemon processes killed"
    else
        echo
        log_info "Skipping process cleanup"
    fi
else
    log_info "No daemon processes found"
fi

# 2. Clean up socket files
log_info "Cleaning up socket files..."
SOCKET_FILES=$(find /tmp -name "lsh-*daemon*.sock" 2>/dev/null || echo "")

if [[ -n "$SOCKET_FILES" ]]; then
    echo "Found socket files:"
    echo "$SOCKET_FILES" | sed 's/^/  /'
    echo

    for socket in $SOCKET_FILES; do
        if [[ -w "$socket" ]]; then
            rm -f "$socket"
            log_success "Removed: $socket"
        else
            log_warning "Need sudo to remove: $socket"
            if [[ "$FORCE_MODE" == "true" ]]; then
                sudo rm -f "$socket" 2>/dev/null || true
                log_success "Removed with sudo: $socket"
            else
                log_info "Run with --force or manually remove: sudo rm $socket"
            fi
        fi
    done
else
    log_info "No socket files found"
fi

# 3. Clean up PID files
log_info "Cleaning up PID files..."
PID_FILES=$(find /tmp -name "lsh-*daemon*.pid" 2>/dev/null || echo "")

if [[ -n "$PID_FILES" ]]; then
    echo "Found PID files:"
    echo "$PID_FILES" | sed 's/^/  /'
    echo

    for pidfile in $PID_FILES; do
        if [[ -w "$pidfile" ]]; then
            rm -f "$pidfile"
            log_success "Removed: $pidfile"
        else
            log_warning "Need sudo to remove: $pidfile"
            if [[ "$FORCE_MODE" == "true" ]]; then
                sudo rm -f "$pidfile" 2>/dev/null || true
                log_success "Removed with sudo: $pidfile"
            else
                log_info "Run with --force or manually remove: sudo rm $pidfile"
            fi
        fi
    done
else
    log_info "No PID files found"
fi

# 4. Verify cleanup
echo
log_info "Verifying cleanup..."

REMAINING_PROCESSES=$(pgrep -f "lshd.js" 2>/dev/null || echo "")
REMAINING_SOCKETS=$(find /tmp -name "lsh-*daemon*.sock" 2>/dev/null || echo "")

if [[ -z "$REMAINING_PROCESSES" && -z "$REMAINING_SOCKETS" ]]; then
    log_success "✅ Cleanup completed successfully!"
    echo
    echo "📋 Next steps:"
    echo "  1. Start fresh daemon:  lsh daemon start"
    echo "  2. Check status:        lsh daemon status"
    echo "  3. View dashboard:      ./scripts/monitor-dashboard.sh"
else
    log_warning "⚠️  Some items may still remain:"
    if [[ -n "$REMAINING_PROCESSES" ]]; then
        echo "  Processes: $(echo $REMAINING_PROCESSES | tr '\n' ' ')"
    fi
    if [[ -n "$REMAINING_SOCKETS" ]]; then
        echo "  Sockets: $REMAINING_SOCKETS"
    fi
    echo
    echo "💡 Try running with --force for complete cleanup:"
    echo "   sudo ./scripts/daemon-cleanup.sh --force"
fi