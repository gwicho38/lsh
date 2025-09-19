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
    -H "apikey: REDACTED" \
    2>/dev/null)

if [[ $? -eq 0 && -n "$RESULT" ]]; then
    echo "✅ API Response: $RESULT"
    echo "📊 Checking disclosures since: $TIMESTAMP"
else
    echo "❌ API check failed - unable to connect to Supabase"
fi
