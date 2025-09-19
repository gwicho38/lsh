#!/bin/bash
##
# Complete LSH Daemon Restart Script
# Fixes all conflicts and starts daemon properly with sudo
##

set -euo pipefail

echo "🔧 LSH Daemon Complete Restart"
echo "=============================="
echo

# 1. Kill ALL daemon processes (including root)
echo "🧹 Killing all daemon processes..."
sudo pkill -f "lshd.js" 2>/dev/null || echo "No processes to kill"
sleep 2

# 2. Clean up all socket and PID files
echo "🧹 Cleaning up all daemon files..."
sudo rm -f /tmp/lsh-*daemon*.sock /tmp/lsh-*daemon*.pid 2>/dev/null || true

# 3. Verify cleanup
remaining_processes=$(pgrep -f "lshd.js" 2>/dev/null || echo "")
if [[ -n "$remaining_processes" ]]; then
    echo "⚠️  Some processes still running: $remaining_processes"
    echo "💀 Force killing remaining processes..."
    sudo kill -9 $remaining_processes 2>/dev/null || true
    sleep 1
fi

echo "✅ Cleanup completed"
echo

# 4. Start daemon with sudo
echo "🚀 Starting daemon with sudo..."
sudo ./lsh daemon start

sleep 3

# 5. Check status
echo "📊 Checking daemon status..."
if sudo ./lsh daemon status; then
    echo
    echo "🎉 Daemon successfully started and running!"
    echo
    echo "📋 Available commands:"
    echo "  sudo ./lsh daemon status     # Check status"
    echo "  sudo ./lsh daemon stop       # Stop daemon"
    echo "  sudo ./lsh daemon cleanup    # Clean up issues"
    echo "  ./scripts/monitor-dashboard.sh --live  # View dashboard"
else
    echo
    echo "❌ Daemon failed to start properly"
    echo "📝 Check logs: tail -f /tmp/lsh-job-daemon-*.log"
fi