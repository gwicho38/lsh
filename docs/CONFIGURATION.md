# LSH Configuration Guide

LSH uses a centralized configuration file located at `~/.config/lsh/lshrc` to manage all settings.

## Quick Start

```bash
# Edit configuration
lsh config

# Or use specific commands
lsh config get SUPABASE_URL
lsh config set LSH_SECRETS_KEY <your-key>
lsh config list
```

## Configuration File Location

**Default:** `~/.config/lsh/lshrc`

This file is in `.env` format and is automatically loaded when LSH starts.

## File Format

The configuration file uses standard `.env` format:

```bash
# Comments start with #
KEY=value
ANOTHER_KEY="value with spaces"
```

## Available Configuration Options

### Storage Backend

Choose one of the following:

```bash
# Option 1: Local Storage (Default - no configuration needed)
# Data stored in ~/.lsh/data/storage.json

# Option 2: Supabase Cloud (Team collaboration)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here

# Option 3: PostgreSQL (Local or remote)
DATABASE_URL=postgresql://user:password@host:port/database
```

### Secrets Management

```bash
# Encryption key for secrets (generate with: lsh key)
LSH_SECRETS_KEY=your-32-byte-hex-key

# Master encryption key (for SaaS platform)
LSH_MASTER_KEY=your-master-key
```

### API Server

```bash
# Enable API server
LSH_API_ENABLED=true
LSH_API_PORT=3030

# API authentication (generate with: openssl rand -hex 32)
LSH_API_KEY=your-api-key
LSH_JWT_SECRET=your-jwt-secret
```

### Webhooks

```bash
# Enable webhooks
LSH_ENABLE_WEBHOOKS=true
WEBHOOK_PORT=3033

# Webhook secrets
GITHUB_WEBHOOK_SECRET=your-github-secret
GITLAB_WEBHOOK_SECRET=your-gitlab-secret
JENKINS_WEBHOOK_SECRET=your-jenkins-secret
```

### Security

```bash
# WARNING: Only enable if you fully trust all job sources
LSH_ALLOW_DANGEROUS_COMMANDS=false
```

### Advanced Options

```bash
# Custom data directory
LSH_DATA_DIR=/custom/path/to/data

# Node environment
NODE_ENV=development

# Redis caching
REDIS_URL=redis://localhost:6379

# SaaS Platform
LSH_SAAS_API_PORT=3031
LSH_SAAS_API_HOST=0.0.0.0
LSH_CORS_ORIGINS=http://localhost:3000

# Email (Resend)
RESEND_API_KEY=your-resend-key
EMAIL_FROM=noreply@yourdomain.com
BASE_URL=https://app.yourdomain.com

# Stripe Billing
STRIPE_SECRET_KEY=your-stripe-secret
STRIPE_WEBHOOK_SECRET=your-stripe-webhook-secret
```

## Command Reference

### `lsh config`

Open configuration file in `$EDITOR` (defaults to `$VISUAL`, then `$EDITOR`, then `vi`).

```bash
lsh config
```

### `lsh config init`

Initialize configuration file with default template.

```bash
lsh config init

# Overwrite existing config
lsh config init --force
```

### `lsh config path`

Show configuration file path.

```bash
lsh config path
# Output: /Users/username/.config/lsh/lshrc
```

### `lsh config get <key>`

Get a specific configuration value.

```bash
lsh config get SUPABASE_URL
# Output: https://your-project.supabase.co
```

### `lsh config set <key> <value>`

Set a specific configuration value.

```bash
lsh config set LSH_SECRETS_KEY abc123def456
# Output: ✓ Set LSH_SECRETS_KEY=abc123def456
```

### `lsh config delete <key>`

Delete a specific configuration value.

```bash
lsh config delete LSH_API_KEY
# Output: ✓ Deleted LSH_API_KEY
```

Aliases: `lsh config rm <key>`

### `lsh config list`

List all configuration values.

```bash
lsh config list

# Show secret values (default: masked)
lsh config list --show-secrets
```

### `lsh config show`

Show raw configuration file contents.

```bash
lsh config show
```

### `lsh config reload`

Reload configuration into current environment.

```bash
lsh config reload
# Output: ✓ Reloaded 12 config values into environment
```

## Configuration Priority

LSH loads configuration in this order (later sources override earlier ones):

1. **Built-in defaults** (hardcoded in LSH)
2. **`~/.config/lsh/lshrc`** (configuration file) ← **Recommended for LSH config**
3. **Environment variables** (current shell) ← **Highest priority**
4. **`.env` file** (project-specific, for secrets only)

This means:
- `lshrc` provides persistent defaults for LSH configuration
- Environment variables override lshrc (useful for temporary overrides)
- `.env` is only used for application secrets managed by `lsh push/pull`, NOT for LSH configuration

### Example: Database Configuration

**Recommended approach (use lshrc):**
```bash
lsh config set SUPABASE_URL https://myproject.supabase.co
lsh config set SUPABASE_ANON_KEY eyJhbG...
# Now works everywhere without setting env vars
```

**Override temporarily:**
```bash
# Use different database for one command
SUPABASE_URL=https://test-project.supabase.co lsh push
```

**Not recommended:**
```bash
# DON'T put LSH config in .env - use lshrc instead!
# .env should only contain application secrets
```

## Migration from .env

If you've been using `.env` for LSH configuration, migrate to `lshrc`:

```bash
# Initialize lshrc
lsh config init

# Copy relevant values from .env to lshrc
lsh config set SUPABASE_URL "$(grep SUPABASE_URL .env | cut -d= -f2)"
lsh config set SUPABASE_ANON_KEY "$(grep SUPABASE_ANON_KEY .env | cut -d= -f2)"
lsh config set LSH_SECRETS_KEY "$(grep LSH_SECRETS_KEY .env | cut -d= -f2)"

# Verify
lsh config list

# Remove LSH-specific variables from .env (keep application secrets only)
```

**Note:** `.env` files should now only contain application secrets, not LSH configuration.

## Best Practices

### 1. Separate LSH Config from Application Secrets

**Good:**
- LSH configuration → `~/.config/lsh/lshrc`
- Application secrets → `.env` (managed by `lsh push/pull`)

**Bad:**
- Mixing LSH config with app secrets in `.env`

### 2. Use Config File for Persistent Settings

```bash
# Set once, use everywhere
lsh config set SUPABASE_URL https://your-project.supabase.co
lsh config set LSH_SECRETS_KEY your-key

# No need to set environment variables in every shell
```

### 3. Use Environment Variables for Overrides

```bash
# Temporarily use a different Supabase project
SUPABASE_URL=https://test-project.supabase.co lsh push
```

### 4. Keep Secrets Safe

```bash
# Never commit lshrc to git
echo "~/.config/lsh/lshrc" >> ~/.gitignore_global

# Set proper permissions
chmod 600 ~/.config/lsh/lshrc
```

### 5. Team Collaboration

For teams, share these values securely:

```bash
# Share with team (via secure channel)
SUPABASE_URL=https://team-project.supabase.co
SUPABASE_ANON_KEY=team-shared-key
LSH_SECRETS_KEY=team-encryption-key

# Each team member sets in their lshrc
lsh config set SUPABASE_URL ...
lsh config set SUPABASE_ANON_KEY ...
lsh config set LSH_SECRETS_KEY ...
```

## Troubleshooting

### Config File Not Found

```bash
# Initialize it
lsh config init
```

### Changes Not Taking Effect

```bash
# Reload configuration
lsh config reload

# Or restart daemon
lsh daemon restart
```

### Permission Denied

```bash
# Fix permissions
chmod 600 ~/.config/lsh/lshrc
chown $USER ~/.config/lsh/lshrc
```

### Can't Find $EDITOR

```bash
# Set your editor
export EDITOR=nano  # or vim, emacs, code, etc.

# Or edit directly
nano ~/.config/lsh/lshrc
```

### Secrets Still Showing

```bash
# Use --show-secrets flag
lsh config list --show-secrets
```

## Examples

### Minimal Local Setup

```bash
# Install LSH
npm install -g lsh-framework

# Generate encryption key
lsh key

# Set it in config
lsh config set LSH_SECRETS_KEY <generated-key>

# Start using LSH
lsh push
```

### Team Setup with Supabase

```bash
# Team admin: Create Supabase project and share credentials
lsh config set SUPABASE_URL https://team-project.supabase.co
lsh config set SUPABASE_ANON_KEY abc123...
lsh config set LSH_SECRETS_KEY def456...

# Team members: Set same credentials
lsh config set SUPABASE_URL https://team-project.supabase.co
lsh config set SUPABASE_ANON_KEY abc123...
lsh config set LSH_SECRETS_KEY def456...

# Now everyone can sync
lsh pull --env production
```

### Multi-Environment Setup

```bash
# Production config in lshrc
lsh config set SUPABASE_URL https://prod.supabase.co
lsh config set LSH_SECRETS_KEY prod-key

# Use different environment temporarily
SUPABASE_URL=https://staging.supabase.co lsh pull --env staging
```

## Related Documentation

- [Quick Start Guide](QUICK_START.md)
- [Secrets Management](features/secrets/SECRETS_GUIDE.md)
- [Local Storage](LOCAL_STORAGE.md)
