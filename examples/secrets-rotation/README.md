# Automated Secret Rotation Examples

These examples demonstrate how to use LSH's built-in daemon and scheduling features to automate secret rotation and synchronization.

## Examples

### 1. API Key Rotation (`rotate-api-keys.sh`)

Automatically rotate API keys on a schedule (e.g., every 30 days).

**Use case:** Security policies require rotating credentials periodically.

**Setup:**

```bash
# 1. Make script executable
chmod +x examples/secrets-rotation/rotate-api-keys.sh

# 2. Test manually first
ENV_FILE=.env ENVIRONMENT=dev ./examples/secrets-rotation/rotate-api-keys.sh

# 3. Schedule monthly rotation (1st day of month at midnight)
lsh lib cron add \
  --name "rotate-api-keys" \
  --schedule "0 0 1 * *" \
  --command "cd ~/projects/myapp && ./examples/secrets-rotation/rotate-api-keys.sh"

# 4. Verify job is scheduled
lsh lib cron list
```

**Customize:**

Edit the script to integrate with your API provider:

```bash
# Replace this section with your provider's API
NEW_API_KEY=$(curl -X POST https://api.example.com/keys/rotate \
  -H "Authorization: Bearer $OLD_API_KEY" | jq -r '.new_key')
```

### 2. Auto-Sync Secrets (`auto-sync-secrets.sh`)

Automatically pull latest secrets from cloud and reload your application.

**Use case:** Keep all team members in sync with latest secrets without manual intervention.

**Setup:**

```bash
# 1. Make script executable
chmod +x examples/secrets-rotation/auto-sync-secrets.sh

# 2. Test manually first
ENV_FILE=.env ENVIRONMENT=dev APP_RELOAD_COMMAND="npm restart" \
  ./examples/secrets-rotation/auto-sync-secrets.sh

# 3. Schedule hourly sync
lsh lib cron add \
  --name "auto-sync-secrets" \
  --interval 3600 \
  --command "cd ~/projects/myapp && ENV_FILE=.env ENVIRONMENT=dev APP_RELOAD_COMMAND='npm restart' ./examples/secrets-rotation/auto-sync-secrets.sh"

# 4. Verify job is running
lsh lib cron list
```

**Environment Variables:**

- `ENV_FILE` - Path to .env file (default: `.env`)
- `ENVIRONMENT` - Environment name (default: `dev`)
- `APP_RELOAD_COMMAND` - Command to reload app (default: `npm restart`)

## Complete Workflow Example

Here's a complete workflow for a team using automated secret rotation:

### Initial Setup (Project Lead)

```bash
# 1. Install LSH
npm install -g gwicho38-lsh

# 2. Generate shared encryption key
lsh lib secrets key
# Output: LSH_SECRETS_KEY=abc123...

# 3. Add to team's shared password manager (1Password, LastPass, etc.)

# 4. Configure Supabase
# Add to .env:
# SUPABASE_URL=https://your-project.supabase.co
# SUPABASE_ANON_KEY=your-key
# LSH_SECRETS_KEY=abc123...

# 5. Push initial secrets
lsh lib secrets push --env production

# 6. Set up rotation script
cp examples/secrets-rotation/rotate-api-keys.sh ~/projects/production/
chmod +x ~/projects/production/rotate-api-keys.sh

# 7. Start daemon
lsh lib daemon start

# 8. Schedule monthly rotation
lsh lib cron add \
  --name "rotate-prod-keys" \
  --schedule "0 0 1 * *" \
  --command "cd ~/projects/production && ENVIRONMENT=production ./rotate-api-keys.sh"
```

### Team Member Setup

```bash
# 1. Install LSH
npm install -g gwicho38-lsh

# 2. Get encryption key from 1Password

# 3. Create .env with key
cat > ~/.lsh-config/.env <<EOF
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-key
LSH_SECRETS_KEY=abc123...
EOF

# 4. Pull production secrets
cd ~/projects/production
lsh lib secrets pull --env production

# 5. Set up auto-sync
cp examples/secrets-rotation/auto-sync-secrets.sh .
chmod +x auto-sync-secrets.sh

# 6. Start daemon
lsh lib daemon start

# 7. Schedule hourly sync
lsh lib cron add \
  --name "auto-sync-prod" \
  --interval 3600 \
  --command "cd ~/projects/production && ENVIRONMENT=production ./auto-sync-secrets.sh"
```

## Advanced: Multi-Environment Rotation

Rotate secrets across multiple environments:

```bash
#!/bin/bash
# rotate-all-environments.sh

for ENV in dev staging production; do
  echo "Rotating $ENV environment..."

  # Pull current secrets
  lsh lib secrets pull --env "$ENV" --file ".env.$ENV"

  # Rotate keys (customize per environment)
  NEW_KEY=$(openssl rand -hex 32)
  sed -i "s/^API_KEY=.*/API_KEY=$NEW_KEY/" ".env.$ENV"

  # Push updated secrets
  lsh lib secrets push --env "$ENV" --file ".env.$ENV"

  echo "✅ $ENV rotated"
done

# Schedule quarterly rotation
# lsh lib cron add \
#   --name "rotate-all-envs" \
#   --schedule "0 0 1 */3 *" \
#   --command "./rotate-all-environments.sh"
```

## Monitoring & Alerts

Add monitoring to your rotation scripts:

```bash
# At the end of rotate-api-keys.sh, add:

# Send notification (example using curl to Slack)
curl -X POST https://hooks.slack.com/services/YOUR/WEBHOOK/URL \
  -H 'Content-Type: application/json' \
  -d "{\"text\":\"🔑 API keys rotated for $ENVIRONMENT at $(date)\"}"

# Or send email
echo "API keys rotated at $(date)" | mail -s "Key Rotation Alert" team@company.com

# Or log to monitoring system
curl -X POST https://your-monitoring.com/events \
  -d "event=secret_rotation&env=$ENVIRONMENT&timestamp=$(date -u +%s)"
```

## Troubleshooting

### Job not running

```bash
# Check daemon status
lsh lib daemon status

# View daemon logs
cat /tmp/lsh-job-daemon-$USER.log

# Check scheduled jobs
lsh lib cron list

# Trigger manually to test
lsh lib cron trigger rotate-api-keys
```

### Secrets not syncing

```bash
# Verify encryption key is set
echo $LSH_SECRETS_KEY

# Check Supabase connection
lsh lib secrets list

# Pull with force to overwrite
lsh lib secrets pull --env production --force
```

### Application not reloading

```bash
# Check reload command
APP_RELOAD_COMMAND="npm restart" ./auto-sync-secrets.sh

# Use custom reload command
APP_RELOAD_COMMAND="systemctl restart myapp" ./auto-sync-secrets.sh
```

## Best Practices

1. **Test First**: Always test rotation scripts manually before scheduling
2. **Backup**: Keep backups before rotating (scripts do this automatically)
3. **Gradual Rollout**: Test in dev, then staging, then production
4. **Monitor**: Add logging/alerting to rotation scripts
5. **Document**: Keep track of rotation schedules in team documentation
6. **Audit**: Review rotation logs regularly
7. **Rollback Plan**: Know how to restore from backups if needed

## Security Considerations

- Store `LSH_SECRETS_KEY` in password manager, never in git
- Use separate keys for personal vs team projects
- Limit who can rotate production secrets
- Audit rotation logs for unauthorized changes
- Set appropriate cron schedule (not too frequent)
- Test rotation in non-production first
- Have rollback procedure ready

## Integration Examples

### With Docker

```bash
# Rotate and restart Docker container
lsh lib cron add \
  --name "rotate-docker-secrets" \
  --schedule "0 0 1 * *" \
  --command "cd ~/app && ./rotate-api-keys.sh && docker-compose restart"
```

### With systemd

```bash
# Rotate and reload systemd service
lsh lib cron add \
  --name "rotate-systemd-secrets" \
  --schedule "0 0 1 * *" \
  --command "cd ~/app && ENVIRONMENT=prod APP_RELOAD_COMMAND='sudo systemctl reload myapp' ./auto-sync-secrets.sh"
```

### With Kubernetes

```bash
# Rotate and update k8s secret
cat > rotate-k8s-secrets.sh <<'EOF'
#!/bin/bash
./rotate-api-keys.sh
kubectl delete secret myapp-secrets
kubectl create secret generic myapp-secrets --from-env-file=.env
kubectl rollout restart deployment/myapp
EOF

lsh lib cron add \
  --name "rotate-k8s" \
  --schedule "0 0 1 * *" \
  --command "./rotate-k8s-secrets.sh"
```

## Resources

- [LSH Secrets Guide](../../docs/features/secrets/SECRETS_GUIDE.md)
- [LSH Cron Documentation](../../docs/features/cron.md)
- [LSH Daemon Documentation](../../docs/features/daemon.md)

---

**No other secrets manager has built-in rotation scheduling!**

With LSH, you get secrets management + automation in one tool.
