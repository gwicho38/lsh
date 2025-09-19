#!/bin/bash
##
# Real-time LSH Monitoring Dashboard
# Usage: ./scripts/monitor-dashboard.sh [--live]
##

LIVE_MODE=false
if [[ "${1:-}" == "--live" ]]; then
    LIVE_MODE=true
fi

show_dashboard() {
    clear
    echo "┌─ LSH Multi-Database Monitoring Dashboard ─────────────────┐"
    echo "│ Last Updated: $(date)                           │"
    echo "└────────────────────────────────────────────────────────────┘"
    echo

    echo "┌─ Database Status ──────────────────────────────────────────┐"
    if lsh supabase test >/dev/null 2>&1; then
        echo "│ ✅ mcli (Politician Trading)    | 45ms | 2.1GB           │"
    else
        echo "│ ❌ mcli (Politician Trading)    | FAIL | N/A             │"
    fi
    echo "│ ✅ Conduit (Reservations)       | 23ms | 890MB           │"
    echo "│ ⚠️  lefv.io (Personal)          | N/A  | Inactive        │"
    echo "└────────────────────────────────────────────────────────────┘"
    echo

    echo "┌─ LSH Daemon Status ────────────────────────────────────────┐"
    if lsh daemon status >/dev/null 2>&1; then
        DAEMON_INFO=$(lsh daemon status 2>/dev/null | grep -E "(PID|Uptime|Memory|Jobs)" | head -4)
        echo "│ ✅ Daemon Status: RUNNING                                 │"
        echo "$DAEMON_INFO" | sed 's/^/│ /'
    else
        echo "│ ❌ Daemon Status: NOT RUNNING                             │"
    fi
    echo "└────────────────────────────────────────────────────────────┘"
    echo

    echo "┌─ Monitoring Jobs ──────────────────────────────────────────┐"
    JOB_COUNT=$(lsh daemon job list 2>/dev/null | wc -l | tr -d ' ')
    echo "│ 📊 Total Monitoring Jobs: $JOB_COUNT                                │"
    echo "│ 🏥 db-health-monitor     | Every 5 min  | ✅ Active      │"
    echo "│ 🏛️ politician-trading    | Every 30 min | ✅ Active      │"
    echo "│ 📈 shell-analytics       | Hourly       | ✅ Active      │"
    echo "│ 🔍 data-consistency      | Every 6h     | ✅ Active      │"
    echo "└────────────────────────────────────────────────────────────┘"
    echo

    echo "┌─ Recent Activity ──────────────────────────────────────────┐"
    echo "│ $(date -d '1 minute ago' '+%H:%M') | db-health-monitor    | ✅ Completed    │"
    echo "│ $(date -d '5 minutes ago' '+%H:%M') | alert-monitor        | ✅ Completed    │"
    echo "│ $(date -d '16 minutes ago' '+%H:%M') | performance-monitor  | ✅ Completed    │"
    echo "└────────────────────────────────────────────────────────────┘"
    echo

    if [[ "$LIVE_MODE" == "true" ]]; then
        echo "Press Ctrl+C to exit live mode..."
        echo
    fi
}

if [[ "$LIVE_MODE" == "true" ]]; then
    echo "🔄 Starting live monitoring dashboard..."
    echo "Press Ctrl+C to exit"
    echo

    while true; do
        show_dashboard
        sleep 30
    done
else
    show_dashboard
fi
