#!/bin/bash

# Cron Job Automatic Execution Validator
# This script helps verify that cron jobs are executing automatically

set -e

echo "🔍 LSH Cron Job Automatic Execution Validator"
echo "=============================================="
echo
echo "This script will help you verify that your cron jobs are running automatically."
echo

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Check if daemon is running
echo -e "${BLUE}📊 Step 1: Checking Daemon Status${NC}"
if lsh daemon status >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Daemon is running${NC}"
    lsh daemon status | head -5
else
    echo -e "${RED}❌ Daemon is not running!${NC}"
    echo "Start it with: lsh daemon start"
    exit 1
fi
echo

# Show scheduled jobs and their cron expressions
echo -e "${BLUE}📋 Step 2: Scheduled Jobs Overview${NC}"
echo "Jobs with automatic schedules:"
echo

# Parse the daemon log for added jobs with schedules
grep "Adding job:" /tmp/lsh-job-daemon-lefv.log | tail -20 | while read -r line; do
    job_name=$(echo "$line" | grep -o 'Adding job: [^"]*' | cut -d':' -f2 | xargs)
    echo "  • $job_name"
done | sort -u

echo
echo -e "${BLUE}⏰ Step 3: Recent Automatic Executions${NC}"
echo "Last 10 automatic job executions:"
echo

# Show recent automatic executions with timestamps
grep "Started scheduled job:" /tmp/lsh-job-daemon-lefv.log 2>/dev/null | tail -10 | while read -r line; do
    timestamp=$(echo "$line" | grep -o '\[.*\]' | tr -d '[]')
    job_info=$(echo "$line" | sed 's/.*Started scheduled job: //')

    # Convert timestamp to human-readable format
    if [[ "$OSTYPE" == "darwin"* ]]; then
        human_time=$(date -j -f "%Y-%m-%dT%H:%M:%S" "${timestamp%%.*}" "+%Y-%m-%d %H:%M:%S" 2>/dev/null || echo "$timestamp")
    else
        human_time=$(date -d "${timestamp%%.*}" "+%Y-%m-%d %H:%M:%S" 2>/dev/null || echo "$timestamp")
    fi

    echo -e "  ${CYAN}$human_time${NC} - $job_info"
done

if ! grep -q "Started scheduled job:" /tmp/lsh-job-daemon-lefv.log 2>/dev/null; then
    echo -e "${YELLOW}⚠️ No automatic executions found yet${NC}"
    echo "Jobs may not have reached their scheduled time yet."
fi

echo
echo -e "${BLUE}📈 Step 4: Execution Frequency Analysis${NC}"
echo "Analyzing job execution patterns:"
echo

# Count executions per job (simplified for compatibility)
grep "Started scheduled job:" /tmp/lsh-job-daemon-lefv.log 2>/dev/null | \
    sed 's/.*Started scheduled job: .* (//' | sed 's/).*//' | \
    sort | uniq -c | while read count job; do
        echo -e "  • ${CYAN}$job${NC}: $count automatic executions"
    done

echo
echo -e "${BLUE}⏳ Step 5: Next Expected Executions${NC}"
echo "Based on current time and cron schedules:"
echo

current_minute=$(date '+%M')
current_hour=$(date '+%H')
echo -e "Current time: ${CYAN}$(date '+%Y-%m-%d %H:%M:%S')${NC}"
echo

# Calculate next executions for common patterns
echo "Expected next runs:"
echo "  • */1 * * * * jobs: Every minute at :00 seconds"
echo "  • */2 * * * * jobs: Next at $(( (current_minute/2 + 1) * 2 % 60 )) minutes"
echo "  • */5 * * * * jobs: Next at $(( (current_minute/5 + 1) * 5 % 60 )) minutes"
echo "  • */15 * * * * jobs: Next at $(( (current_minute/15 + 1) * 15 % 60 )) minutes"
echo "  • */30 * * * * jobs: Next at $(( (current_minute/30 + 1) * 30 % 60 )) minutes"
echo "  • 0 * * * * jobs: Next at top of the hour (:00)"

echo
echo -e "${BLUE}🔄 Step 6: Real-Time Monitoring${NC}"
echo "To watch jobs execute in real-time:"
echo
echo -e "${CYAN}Option 1: Watch the daemon log (recommended):${NC}"
echo "  tail -f /tmp/lsh-job-daemon-lefv.log | grep --line-buffered 'Started scheduled'"
echo
echo -e "${CYAN}Option 2: Monitor specific job patterns:${NC}"
echo "  # Watch alert-monitor (runs every 2 minutes)"
echo "  tail -f /tmp/lsh-job-daemon-lefv.log | grep --line-buffered 'alert-monitor'"
echo
echo -e "${CYAN}Option 3: Create a test job that runs every minute:${NC}"
echo "  lsh daemon job create --name \"cron-test\" --command \"echo 'Test at \$(date)'\" --schedule \"*/1 * * * *\""
echo

echo -e "${BLUE}✅ Step 7: Validation Summary${NC}"
echo

# Check if jobs have run recently
last_execution=$(grep "Started scheduled job:" /tmp/lsh-job-daemon-lefv.log 2>/dev/null | tail -1 | grep -o '\[.*\]' | tr -d '[]')

if [ -n "$last_execution" ]; then
    # Calculate time since last execution
    if [[ "$OSTYPE" == "darwin"* ]]; then
        last_epoch=$(date -j -f "%Y-%m-%dT%H:%M:%S" "${last_execution%%.*}" "+%s" 2>/dev/null || echo "0")
    else
        last_epoch=$(date -d "${last_execution%%.*}" "+%s" 2>/dev/null || echo "0")
    fi

    current_epoch=$(date +%s)
    diff_seconds=$((current_epoch - last_epoch))
    diff_minutes=$((diff_seconds / 60))

    if [ $diff_minutes -lt 5 ]; then
        echo -e "${GREEN}✅ WORKING: Jobs executed automatically within last 5 minutes${NC}"
    elif [ $diff_minutes -lt 30 ]; then
        echo -e "${YELLOW}⚠️ PARTIAL: Jobs executed within last 30 minutes${NC}"
        echo "Some jobs may have longer schedules (hourly, daily)"
    else
        echo -e "${RED}⚠️ STALE: No executions in last 30 minutes${NC}"
        echo "Check if daemon is healthy and jobs are properly scheduled"
    fi

    echo -e "Last automatic execution: ${CYAN}$diff_minutes minutes ago${NC}"
else
    echo -e "${YELLOW}⚠️ No automatic executions found yet${NC}"
    echo "Wait a few minutes for scheduled times to trigger"
fi

echo
echo -e "${BLUE}📝 Troubleshooting Tips:${NC}"
echo "1. Ensure daemon has been running for at least one full schedule cycle"
echo "2. Check that job schedules are valid cron expressions"
echo "3. Verify system time is correct: $(date)"
echo "4. Review full daemon log for errors: less /tmp/lsh-job-daemon-lefv.log"
echo "5. Restart daemon if needed: lsh daemon restart"

echo
echo -e "${GREEN}Script completed successfully!${NC}"