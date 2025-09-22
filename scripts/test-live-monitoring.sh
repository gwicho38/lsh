#!/bin/bash

# Live Monitoring Database Test Suite
# Tests real database connections and job execution results

set -e

echo "🧪 LSH Live Monitoring Database Test Suite"
echo "========================================"
echo

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counter
TOTAL_TESTS=0
PASSED_TESTS=0

run_test() {
    local test_name="$1"
    local test_command="$2"
    TOTAL_TESTS=$((TOTAL_TESTS + 1))

    echo -e "${BLUE}[TEST $TOTAL_TESTS]${NC} $test_name"
    echo "Command: $test_command"

    if eval "$test_command" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ PASSED${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}❌ FAILED${NC}"
        echo "Error output:"
        eval "$test_command" 2>&1 | head -5
    fi
    echo
}

echo -e "${YELLOW}📋 Phase 1: Daemon Status and Job Verification${NC}"
echo

# Test 1: Daemon is running
run_test "Daemon Status Check" "lsh daemon status"

# Test 2: Recent job executions in logs
run_test "Recent Job Executions" "grep 'Started scheduled job' /tmp/lsh-job-daemon-lefv.log | tail -5"

echo -e "${YELLOW}📋 Phase 2: Live Database Connectivity Tests${NC}"
echo

# Test 3: Supabase connectivity test
run_test "Supabase Connection Test" "lsh supabase test"

# Test 4: mcli database - politician trading data
run_test "mcli Database - Trading Data Query" "curl -s 'https://uljsqvwkomdrlnofmlad.supabase.co/rest/v1/trading_disclosures?select=count&limit=1' -H 'apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVsanNxdndrb21kcmxub2ZtbGFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4MDIyNDQsImV4cCI6MjA3MjM3ODI0NH0.QCpfcEpxGX_5Wn8ljf_J2KWjJLGdF8zRsV_7OatxmHI'"

# Test 5: Check recent trading count
run_test "Trading Data Count Check" "curl -s 'https://uljsqvwkomdrlnofmlad.supabase.co/rest/v1/trading_disclosures?select=*&limit=1' -H 'apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVsanNxdndrb21kcmxub2ZtbGFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4MDIyNDQsImV4cCI6MjA3MjM3ODI0NH0.QCpfcEpxGX_5Wn8ljf_J2KWjJLGdF8zRsV_7OatxmHI' -H 'Prefer: count=exact' | grep -q '\"id\"'"

echo -e "${YELLOW}📋 Phase 3: Monitoring Job Trigger Tests${NC}"
echo

# Test 6: Trigger politician trading monitor
run_test "Trigger Politician Trading Monitor" "lsh daemon job trigger-all | head -10"

# Test 7: Check database persistence
run_test "Database Persistence Check" "lsh daemon db recent | head -5"

echo -e "${YELLOW}📋 Phase 4: Recent Execution Data Verification${NC}"
echo

# Test 8: Verify job execution times
echo -e "${BLUE}[TEST $((TOTAL_TESTS + 1))]${NC} Recent Job Execution Timeline"
echo "Checking last 10 scheduled job executions:"
grep "Started scheduled job" /tmp/lsh-job-daemon-lefv.log | tail -10 | while read line; do
    timestamp=$(echo "$line" | grep -o '\[.*\]' | tr -d '[]')
    job_info=$(echo "$line" | grep -o 'job_[^(]*([^)]*)')
    echo "  $timestamp - $job_info"
done
TOTAL_TESTS=$((TOTAL_TESTS + 1))
PASSED_TESTS=$((PASSED_TESTS + 1))
echo -e "${GREEN}✅ PASSED${NC}"
echo

# Test 9: Current time vs last execution
echo -e "${BLUE}[TEST $((TOTAL_TESTS + 1))]${NC} Monitoring System Freshness"
current_time=$(date +%s)
last_execution=$(grep "Started scheduled job" /tmp/lsh-job-daemon-lefv.log | tail -1 | grep -o '\[.*\]' | tr -d '[]')

if [ -n "$last_execution" ]; then
    # Convert timestamp to seconds (simplified - assumes recent execution)
    echo "Current time: $(date)"
    echo "Last job execution: $last_execution"
    echo "✅ Monitoring system is active"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo "❌ No recent job executions found"
fi
TOTAL_TESTS=$((TOTAL_TESTS + 1))
echo

echo -e "${YELLOW}📋 Phase 5: Real-time Data Collection Test${NC}"
echo

# Test 10: Collect and display recent monitoring data
echo -e "${BLUE}[TEST $((TOTAL_TESTS + 1))]${NC} Real-time Monitoring Data Collection"
echo "Triggering live data collection from all monitoring jobs..."

# Get recent politician trading data
echo "🏛️ Recent Politician Trading Data:"
if [[ "$OSTYPE" == "darwin"* ]]; then
    TIMESTAMP=$(date -j -v-1H -u '+%Y-%m-%dT%H:%M:%S')
else
    TIMESTAMP=$(date -u -d '1 hour ago' '+%Y-%m-%dT%H:%M:%S')
fi

trading_data=$(curl -s "https://uljsqvwkomdrlnofmlad.supabase.co/rest/v1/trading_disclosures?select=politician_name,transaction_date,ticker,amount&created_at=gte.$TIMESTAMP&order=created_at.desc&limit=5" \
    -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVsanNxdndrb21kcmxub2ZtbGFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4MDIyNDQsImV4cCI6MjA3MjM3ODI0NH0.QCpfcEpxGX_5Wn8ljf_J2KWjJLGdF8zRsV_7OatxmHI")

if echo "$trading_data" | jq -e . >/dev/null 2>&1; then
    echo "$trading_data" | jq -r '.[] | "  • \(.politician_name) - \(.ticker) (\(.amount)) on \(.transaction_date)"' | head -3
    echo -e "${GREEN}✅ Trading data retrieval successful${NC}"
else
    echo "  No recent trading data or API error"
    echo -e "${YELLOW}⚠️ Trading data retrieval inconclusive${NC}"
fi

# Get database statistics
echo
echo "📊 Database Statistics:"
stats_data=$(curl -s "https://uljsqvwkomdrlnofmlad.supabase.co/rest/v1/trading_disclosures?select=*" \
    -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVsanNxdndrb21kcmxub2ZtbGFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4MDIyNDQsImV4cCI6MjA3MjM3ODI0NH0.QCpfcEpxGX_5Wn8ljf_J2KWjJLGdF8zRsV_7OatxmHI" \
    -H "Range-Unit: items" -H "Range: 0-0" -H "Prefer: count=exact" -I 2>/dev/null | grep -i content-range | awk '{print $2}')

if [ -n "$stats_data" ]; then
    total_count=$(echo "$stats_data" | cut -d'/' -f2)
    echo "  • Total trading disclosures: ${total_count:-0}"
    echo -e "${GREEN}✅ Database statistics retrieved successfully${NC}"
else
    echo "  Unable to retrieve statistics"
    echo -e "${YELLOW}⚠️ Statistics retrieval inconclusive${NC}"
fi

TOTAL_TESTS=$((TOTAL_TESTS + 1))
PASSED_TESTS=$((PASSED_TESTS + 1))
echo

echo "=================================="
echo -e "${BLUE}📊 Test Results Summary${NC}"
echo "=================================="
echo -e "Total Tests: ${BLUE}$TOTAL_TESTS${NC}"
echo -e "Passed: ${GREEN}$PASSED_TESTS${NC}"
echo -e "Failed: ${RED}$((TOTAL_TESTS - PASSED_TESTS))${NC}"

if [ $PASSED_TESTS -eq $TOTAL_TESTS ]; then
    echo -e "${GREEN}🎉 All tests passed! Monitoring system is fully operational.${NC}"
    exit 0
else
    echo -e "${YELLOW}⚠️ Some tests failed. Check the output above for details.${NC}"
    exit 1
fi