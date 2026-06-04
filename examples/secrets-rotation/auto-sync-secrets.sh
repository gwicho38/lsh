#!/bin/bash
#
# Example: Auto-Sync Secrets Across Team
#
# This script automatically pulls the latest secrets and reloads your application.
# Schedule it with your system scheduler, e.g. an hourly crontab entry:
#   0 * * * * cd /path/to/project && ENVIRONMENT=dev APP_RELOAD_COMMAND='npm restart' ./auto-sync-secrets.sh
#

set -e

ENV_FILE="${ENV_FILE:-.env}"
ENVIRONMENT="${ENVIRONMENT:-dev}"
APP_RELOAD_COMMAND="${APP_RELOAD_COMMAND:-npm restart}"

echo "🔄 Auto-syncing secrets from cloud..."

# Backup current .env before pulling
if [ -f "$ENV_FILE" ]; then
  BACKUP_FILE="${ENV_FILE}.pre-sync.$(date +%Y%m%d_%H%M%S)"
  cp "$ENV_FILE" "$BACKUP_FILE"
  echo "✅ Backed up current .env to $BACKUP_FILE"
fi

# Pull latest secrets
echo "📥 Pulling latest secrets..."
lsh pull --env "$ENVIRONMENT" --force

# Check if .env changed
if diff "$ENV_FILE" "$BACKUP_FILE" > /dev/null 2>&1; then
  echo "ℹ️  No changes detected in secrets"
  rm -f "$BACKUP_FILE"
else
  echo "✅ Secrets updated!"

  # Show what changed (masked)
  echo ""
  echo "📊 Changes detected:"
  diff "$BACKUP_FILE" "$ENV_FILE" | grep "^[<>]" | head -5 || true
  echo ""

  # Reload application if configured
  if [ -n "$APP_RELOAD_COMMAND" ]; then
    echo "🔄 Reloading application..."
    eval "$APP_RELOAD_COMMAND" || echo "⚠️  Failed to reload app, please restart manually"
  fi

  echo ""
  echo "💡 Keep backup file for rollback if needed: $BACKUP_FILE"
fi

echo ""
echo "✅ Auto-sync complete at $(date)"
