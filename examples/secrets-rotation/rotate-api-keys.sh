#!/bin/bash
#
# Example: Automated API Key Rotation
#
# This script rotates API keys and pushes the updated secrets over IPFS.
# Schedule it with your system scheduler, e.g. a monthly crontab entry:
#   0 0 1 * * cd /path/to/project && ENVIRONMENT=production ./rotate-api-keys.sh
#

set -e

ENV_FILE="${ENV_FILE:-.env}"
ENVIRONMENT="${ENVIRONMENT:-production}"

echo "🔄 Starting API key rotation..."

# Backup current .env
BACKUP_FILE="${ENV_FILE}.backup.$(date +%Y%m%d_%H%M%S)"
cp "$ENV_FILE" "$BACKUP_FILE"
echo "✅ Backed up current .env to $BACKUP_FILE"

# Example: Rotate API key (replace with your provider's API)
# NEW_API_KEY=$(curl -X POST https://api.example.com/keys/rotate \
#   -H "Authorization: Bearer $OLD_API_KEY" | jq -r '.new_key')

# For demo purposes, generate a random key
NEW_API_KEY=$(openssl rand -hex 32)

# Update .env file
if grep -q "^API_KEY=" "$ENV_FILE"; then
  # Replace existing key
  sed -i.tmp "s/^API_KEY=.*/API_KEY=$NEW_API_KEY/" "$ENV_FILE"
  rm -f "${ENV_FILE}.tmp"
  echo "✅ Updated API_KEY in $ENV_FILE"
else
  # Add new key
  echo "API_KEY=$NEW_API_KEY" >> "$ENV_FILE"
  echo "✅ Added API_KEY to $ENV_FILE"
fi

# Push updated secrets over IPFS
echo "📤 Pushing updated secrets..."
lsh push --env "$ENVIRONMENT"

echo ""
echo "✅ API key rotation complete!"
echo "📅 Rotated at: $(date)"
echo "🔑 New key: ${NEW_API_KEY:0:8}***"
echo ""
echo "💡 Next steps:"
echo "   1. Pull updated secrets on other machines:"
echo "      lsh pull --env $ENVIRONMENT"
echo "   2. Restart your application to use new keys"
echo "   3. Verify new key works before removing old backup"
