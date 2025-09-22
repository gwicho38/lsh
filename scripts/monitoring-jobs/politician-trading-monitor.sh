#!/bin/bash
# Monitoring Job: politician-trading-monitor
# Schedule: */30 * * * *
# Description: Monitor politician trading data freshness and collection jobs
# Tags: monitoring,trading,politicians

echo '[Mon Sep 22 21:54:45 CEST 2025] 🏛️ Trading Monitor: Checking for new disclosures...' && if [[ "$OSTYPE" == "darwin"* ]]; then TIMESTAMP=$(date -j -v-30M -u '+%Y-%m-%dT%H:%M:%S'); else TIMESTAMP=$(date -u -d '30 minutes ago' '+%Y-%m-%dT%H:%M:%S'); fi && curl -s "https://uljsqvwkomdrlnofmlad.supabase.co/rest/v1/trading_disclosures?select=count&created_at=gte.$TIMESTAMP" -H "apikey: REDACTED" || echo 'API check failed'
