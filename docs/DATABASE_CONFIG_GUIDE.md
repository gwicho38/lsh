# Database Configuration with lshrc

This guide shows how to configure database connections using LSH's configuration file at `~/.config/lsh/lshrc`.

## Quick Start

### Option 1: Local Storage (Default - No Config Needed)

```bash
npm install -g lsh-framework
# Works immediately - uses ~/.lsh/data/storage.json
lsh --version
```

No configuration required! LSH automatically uses local storage.

### Option 2: Configure Supabase (Cloud)

```bash
# Set Supabase credentials in lshrc
lsh config set SUPABASE_URL https://your-project.supabase.co
lsh config set SUPABASE_ANON_KEY eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Verify configuration
lsh config get SUPABASE_URL

# Test connection
lsh daemon status
```

Now all LSH commands will use Supabase automatically!

### Option 3: Configure Local PostgreSQL

```bash
# Start PostgreSQL with Docker
docker-compose up -d

# Set database URL in lshrc
lsh config set DATABASE_URL postgresql://lsh_user:lsh_password@localhost:5432/lsh

# Verify
lsh config get DATABASE_URL

# Test connection
lsh daemon status
```

## Why Use lshrc for Database Config?

### Before (using environment variables)

```bash
# Had to set in every shell session
export SUPABASE_URL=https://your-project.supabase.co
export SUPABASE_ANON_KEY=eyJh...

# Or add to ~/.bashrc / ~/.zshrc
echo 'export SUPABASE_URL=...' >> ~/.bashrc
```

**Problems:**
- ❌ Shell-specific configuration
- ❌ Scattered across multiple files
- ❌ Hard to manage and update
- ❌ Clutters shell profile

### After (using lshrc)

```bash
# Set once
lsh config set SUPABASE_URL https://your-project.supabase.co
lsh config set SUPABASE_ANON_KEY eyJh...

# Works in all shells, forever
```

**Benefits:**
- ✅ Single source of truth
- ✅ Shell-independent
- ✅ Easy to update (`lsh config set`)
- ✅ Easy to view (`lsh config list`)
- ✅ Easy to share team configs

## Configuration Examples

### Example 1: Development Team with Supabase

**Team Lead Setup:**
```bash
# Create Supabase project
# Share these credentials securely with team

lsh config set SUPABASE_URL https://team-project.supabase.co
lsh config set SUPABASE_ANON_KEY eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
lsh config set LSH_SECRETS_KEY $(lsh key)  # Generate and share

# Verify
lsh config list
```

**Team Member Setup:**
```bash
# Each team member runs:
lsh config set SUPABASE_URL https://team-project.supabase.co
lsh config set SUPABASE_ANON_KEY <shared-key>
lsh config set LSH_SECRETS_KEY <shared-encryption-key>

# Now everyone can sync
lsh pull --env production
```

### Example 2: Multiple Environments

**Production config in lshrc:**
```bash
lsh config set SUPABASE_URL https://prod.supabase.co
lsh config set SUPABASE_ANON_KEY prod-key-here
lsh config set LSH_SECRETS_KEY prod-encryption-key
```

**Override for staging temporarily:**
```bash
# Use environment variable for one-time override
SUPABASE_URL=https://staging.supabase.co lsh pull --env staging
```

### Example 3: Local Development + Production Supabase

```bash
# Default to local PostgreSQL in lshrc
lsh config set DATABASE_URL postgresql://lsh_user:lsh_password@localhost:5432/lsh

# Use Supabase for specific commands
SUPABASE_URL=https://prod.supabase.co \
SUPABASE_ANON_KEY=prod-key \
lsh push --env production
```

### Example 4: CI/CD Pipeline

**In CI environment:**
```bash
# CI uses local storage (no database needed)
- npm install -g lsh-framework
- lsh pull --env ci  # Falls back to local storage
- npm test
```

**In production deployment:**
```bash
# Set production database in lshrc
- lsh config set SUPABASE_URL $PROD_SUPABASE_URL
- lsh config set SUPABASE_ANON_KEY $PROD_SUPABASE_KEY
- lsh pull --env production
- npm start
```

## Viewing Database Configuration

### List all config (secrets masked)

```bash
lsh config list

# Output:
# Current Configuration:
#   SUPABASE_URL=https://your-project.supabase.co
#   SUPABASE_ANON_KEY=***iJIUzI1NiIsInR5cCI6IkpXVCJ9
#   DATABASE_URL=***assword@localhost:5432/lsh
```

### Show full config (unmasked)

```bash
lsh config list --show-secrets

# Output:
# Current Configuration:
#   SUPABASE_URL=https://your-project.supabase.co
#   SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
#   DATABASE_URL=postgresql://lsh_user:lsh_password@localhost:5432/lsh
```

### Get specific value

```bash
lsh config get SUPABASE_URL
# Output: https://your-project.supabase.co

lsh config get DATABASE_URL
# Output: postgresql://lsh_user:lsh_password@localhost:5432/lsh
```

## Switching Between Databases

### Switch from Local to Supabase

```bash
# Currently using local storage
lsh daemon status
# Output: ⚠️  Supabase not configured - using local storage fallback

# Configure Supabase
lsh config set SUPABASE_URL https://your-project.supabase.co
lsh config set SUPABASE_ANON_KEY eyJh...

# Restart daemon to use new config
lsh daemon restart

# Now using Supabase
lsh daemon status
# Output: ✓ Connected to Supabase
```

### Switch from Supabase to Local

```bash
# Remove Supabase config
lsh config delete SUPABASE_URL
lsh config delete SUPABASE_ANON_KEY

# Restart daemon
lsh daemon restart

# Now using local storage
lsh daemon status
# Output: ⚠️  Supabase not configured - using local storage fallback
```

### Switch from Supabase to PostgreSQL

```bash
# Add PostgreSQL config (takes precedence if both are set)
lsh config set DATABASE_URL postgresql://localhost:5432/lsh

# Supabase config still exists but PostgreSQL is used
lsh daemon restart
```

## Security Best Practices

### 1. Protect lshrc File

```bash
# Set proper permissions (owner-only)
chmod 600 ~/.config/lsh/lshrc
```

### 2. Never Commit lshrc

```bash
# Add to global gitignore
echo "~/.config/lsh/lshrc" >> ~/.gitignore_global
```

### 3. Use Different Keys Per Environment

```bash
# Development
lsh config set LSH_SECRETS_KEY dev-key-xxx

# Production (set separately in prod environment)
lsh config set LSH_SECRETS_KEY prod-key-yyy
```

### 4. Rotate Database Credentials Regularly

```bash
# Update Supabase key
lsh config set SUPABASE_ANON_KEY new-key-here

# Restart daemon to apply
lsh daemon restart
```

## Troubleshooting

### Config Not Loading

```bash
# Check if config file exists
lsh config path
ls -la ~/.config/lsh/lshrc

# Initialize if missing
lsh config init

# Verify config is loaded
lsh config list
```

### Database Connection Fails

```bash
# Test connection
lsh daemon status

# Check config values
lsh config get SUPABASE_URL
lsh config get SUPABASE_ANON_KEY

# Verify format
# Correct: https://xxx.supabase.co
# Wrong: http://... or missing https://
```

### Environment Variable Takes Precedence

```bash
# Check if env var is set
echo $SUPABASE_URL

# If set, it overrides lshrc
# Unset to use lshrc value
unset SUPABASE_URL

# Or edit shell profile to remove export
```

### Changes Not Applied

```bash
# Reload config into current process
lsh config reload

# Or restart daemon
lsh daemon restart

# Or start new shell session
exec $SHELL
```

## Advanced: Configuration Priority

LSH loads configuration in this order (highest priority last):

1. **Built-in defaults**
2. **`~/.config/lsh/lshrc`** ← Recommended for database config
3. **Environment variables** ← Overrides lshrc
4. **Command-line arguments** ← Highest priority (for some commands)

**Example:**
```bash
# lshrc has: SUPABASE_URL=https://prod.supabase.co
# Environment variable overrides it temporarily:
SUPABASE_URL=https://dev.supabase.co lsh push

# After command finishes, lshrc value is used again
```

## Related Documentation

- [Configuration Guide](CONFIGURATION.md) - Complete config system reference
- [Quick Start Guide](QUICK_START.md) - Setup instructions
- [Local Storage Guide](LOCAL_STORAGE.md) - Local storage details
