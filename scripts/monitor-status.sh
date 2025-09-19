#!/bin/bash
##
# Quick monitoring status check
# Usage: ./scripts/monitor-status.sh
##

echo "🔍 LSH Monitoring System Status"
echo "==============================="
echo

# Check daemon
echo "📱 LSH Daemon:"
if lsh daemon status >/dev/null 2>&1; then
    echo "   ✅ Running"
    lsh daemon status | grep -E "(PID|Jobs)" | sed 's/^/   /'
else
    echo "   ❌ Not running"
fi
echo

# Check monitoring jobs
echo "🔄 Monitoring Jobs:"
JOBS=$(lsh daemon job list 2>/dev/null)
if [[ -n "$JOBS" ]]; then
    echo "   📊 Total jobs: $(echo "$JOBS" | wc -l)"
    echo "$JOBS" | grep -E "(monitor|analytics|check)" | head -5 | sed 's/^/   /'
else
    echo "   ⚠️  No monitoring jobs found"
fi
echo

# Check database connectivity
echo "🗄️  Database Connectivity:"
if lsh supabase test >/dev/null 2>&1; then
    echo "   ✅ mcli database: Connected"
else
    echo "   ❌ mcli database: Failed"
fi
echo

echo "📋 Quick Actions:"
echo "   View dashboard:     ./scripts/monitor-dashboard.sh"
echo "   Live dashboard:     ./scripts/monitor-dashboard.sh --live"
echo "   View job logs:      lsh daemon job list"
echo "   Restart monitoring: ./scripts/setup-monitoring-jobs.sh"
