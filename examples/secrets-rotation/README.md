# Automated Secret Rotation Examples

These examples show how to automate secret rotation and synchronization with LSH.

LSH itself has **no built-in scheduler** — it is a CLI secrets manager. To run
these on a schedule, use your operating system's scheduler (`cron`, `systemd`
timers, a CI job, etc.) to invoke the scripts, which call `lsh push` / `lsh pull`.

## Scripts

### 1. API Key Rotation (`rotate-api-keys.sh`)

Rotates an API key in your `.env` and pushes the updated secrets.

```bash
# Make executable
chmod +x examples/secrets-rotation/rotate-api-keys.sh

# Test manually first
ENV_FILE=.env ENVIRONMENT=dev ./examples/secrets-rotation/rotate-api-keys.sh

# Schedule monthly with system cron (crontab -e):
0 0 1 * * cd ~/projects/myapp && ENVIRONMENT=production ./rotate-api-keys.sh
```

**Customize** — edit the script to call your provider's rotation API:

```bash
NEW_API_KEY=$(curl -X POST https://api.example.com/keys/rotate \
  -H "Authorization: Bearer $OLD_API_KEY" | jq -r '.new_key')
```

### 2. Auto-Sync Secrets (`auto-sync-secrets.sh`)

Pulls the latest secrets and reloads your application.

```bash
chmod +x examples/secrets-rotation/auto-sync-secrets.sh

# Test manually first
ENV_FILE=.env ENVIRONMENT=dev APP_RELOAD_COMMAND="npm restart" \
  ./examples/secrets-rotation/auto-sync-secrets.sh

# Schedule hourly with system cron (crontab -e):
0 * * * * cd ~/projects/myapp && ENVIRONMENT=dev APP_RELOAD_COMMAND='npm restart' ./auto-sync-secrets.sh
```

**Environment variables:**

- `ENV_FILE` — path to `.env` file (default: `.env`)
- `ENVIRONMENT` — environment name (default: `dev` for sync, `production` for rotation)
- `APP_RELOAD_COMMAND` — command to reload the app (default: `npm restart`)

## Team Workflow

```bash
# Project lead — one-time setup
npm install -g lsh-framework
lsh key                                   # generate shared encryption key
# Store LSH_SECRETS_KEY in the team password manager
lsh config set LSH_SECRETS_KEY <key>
lsh config set LSH_PIN_TOKEN <psa-token>  # durable bytes (optional but recommended)
lsh push --env production

# Schedule monthly rotation (crontab -e):
0 0 1 * * cd ~/projects/production && ENVIRONMENT=production ./rotate-api-keys.sh
```

```bash
# Team member
npm install -g lsh-framework
lsh config set LSH_SECRETS_KEY <key-from-password-manager>
lsh pull --env production

# Schedule hourly auto-sync (crontab -e):
0 * * * * cd ~/projects/production && ENVIRONMENT=production ./auto-sync-secrets.sh
```

## Multi-Environment Rotation

```bash
#!/bin/bash
# rotate-all-environments.sh
for ENV in dev staging production; do
  echo "Rotating $ENV..."
  lsh pull --env "$ENV" --file ".env.$ENV"
  NEW_KEY=$(openssl rand -hex 32)
  sed -i.bak "s/^API_KEY=.*/API_KEY=$NEW_KEY/" ".env.$ENV" && rm -f ".env.$ENV.bak"
  lsh push --env "$ENV" --file ".env.$ENV"
  echo "✅ $ENV rotated"
done

# Schedule quarterly (crontab -e):
# 0 0 1 */3 * cd /path/to/project && ./rotate-all-environments.sh
```

## Monitoring & Alerts

Append a notification to the end of `rotate-api-keys.sh`:

```bash
curl -X POST "$SLACK_WEBHOOK_URL" \
  -H 'Content-Type: application/json' \
  -d "{\"text\":\"🔑 API keys rotated for $ENVIRONMENT at $(date)\"}"
```

## Troubleshooting

**Secrets not syncing**
```bash
lsh config get LSH_SECRETS_KEY   # same key on every machine?
lsh list                         # inspect local .env
lsh pull --env production --force
```

**Application not reloading**
```bash
APP_RELOAD_COMMAND="systemctl restart myapp" ./auto-sync-secrets.sh
```

## Best Practices

1. **Test first** — run rotation scripts manually before scheduling.
2. **Backup** — the scripts snapshot `.env` before changing it.
3. **Gradual rollout** — dev → staging → production.
4. **Monitor** — add logging/alerting to the scripts.
5. **Set `LSH_PIN_TOKEN`** so rotated secrets stay durable when your node is offline.

## Security Considerations

- Store `LSH_SECRETS_KEY` in a password manager, never in git.
- Use separate keys for personal vs team projects.
- Limit who can rotate production secrets.
- Don't schedule rotation too frequently.

## Resources

- [LSH Secrets Guide](../../docs/features/secrets/SECRETS_GUIDE.md)
- [Configuration Guide](../../docs/CONFIGURATION.md)
- [Quick Start](../../docs/QUICK_START.md)
