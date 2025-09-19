#!/bin/bash
# Monitoring Job: politician-trading-monitor
# Schedule: */30 * * * *
# Description: Monitor politician trading data freshness and collection jobs
# Tags: monitoring,trading,politicians

echo "[$(date)] 🏛️ Trading Monitor: Checking for new disclosures..."

# Get timestamp for 30 minutes ago (macOS compatible)
if [[ "$OSTYPE" == "darwin"* ]]; then
    TIMESTAMP=$(date -j -v-30M -u '+%Y-%m-%dT%H:%M:%S')
else
    TIMESTAMP=$(date -u -d '30 minutes ago' '+%Y-%m-%dT%H:%M:%S')
fi

# Query Supabase for new trading disclosures
RESULT=$(curl -s "https://uljsqvwkomdrlnofmlad.supabase.co/rest/v1/trading_disclosures?select=count&created_at=gte.$TIMESTAMP" \
    -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVsanNxdndrb21kcmxub2ZtbGFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4MDIyNDQsImV4cCI6MjA3MjM3ODI0NH0.QCpfcEpxGX_5Wn8ljf_J2KWjJLGdF8zRsV_7OatxmHI" \
    2>/dev/null)

if [[ $? -eq 0 && -n "$RESULT" ]]; then
    echo "✅ API Response: $RESULT"
    echo "📊 Checking disclosures since: $TIMESTAMP"
else
    echo "❌ API check failed - unable to connect to Supabase"
fi
