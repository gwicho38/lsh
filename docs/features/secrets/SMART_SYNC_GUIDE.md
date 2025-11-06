# LSH Smart Sync - Automatic Secrets Management 🚀

> **Version:** v0.8.2+ (Load mode fix in v0.8.3)
> **Status:** Stable
> **Last Updated:** October 30, 2025

## Overview

**Smart Sync** is the new intelligent secrets management mode in LSH that automatically detects your git repository, sets up encryption, creates `.env` files from templates, and synchronizes everything with cloud storage - all with a single command.

**Recent Updates:**
- **v0.8.3** (Oct 30, 2025): Fixed logger output interference in `--load` mode
- **v0.8.2** (Oct 30, 2025): Initial Smart Sync release with auto-detection and `--load` flag

## What Makes It Smart?

Smart Sync automatically:

1. **Detects Git Repositories** - Identifies your project context
2. **Generates Encryption Keys** - Creates and saves keys automatically
3. **Creates `.env` Files** - Uses `.env.example` as a template or creates from scratch
4. **Adds to .gitignore** - Ensures secrets aren't committed
5. **Synchronizes Intelligently** - Pushes/pulls based on what's newer
6. **Namespace by Repo** - Keeps secrets separate for each project

## Quick Start

### First Time in a Repo

```bash
cd ~/repos/my-project

# One command does everything!
lsh sync
```

That's it! Smart sync will:
- ✅ Detect you're in the `my-project` git repo
- ✅ Generate an encryption key if needed
- ✅ Create `.env` from `.env.example` if available
- ✅ Add `.env` to `.gitignore`
- ✅ Push secrets to cloud storage
- ✅ Set up namespace as `my-project_dev`

### On Another Machine

```bash
cd ~/repos/my-project

# Same command - it detects cloud secrets exist!
lsh sync
```

Smart sync will:
- ✅ Detect secrets exist in cloud for `my-project`
- ✅ Pull them down automatically
- ✅ Create backup if local file exists

## How It Works

### Git Repository Detection

Smart sync automatically detects:

```
📁 Git Repository:
   Repo: my-project
   Branch: main
```

This information is used to:
- **Namespace secrets** - Stored as `my-project_dev` instead of just `dev`
- **Isolate projects** - Multiple projects can have separate `dev` environments
- **Show context** - You always know which project you're syncing

### Auto-Setup Workflow

```
┌─────────────────────────────────────┐
│  1. Check if in Git Repo            │
│     ✓ Yes: Use repo-aware namespace │
│     ✗ No:  Use standard namespace   │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│  2. Ensure Encryption Key            │
│     ✓ Exists: Use it                │
│     ✗ Missing: Generate & save      │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│  3. Ensure .env in .gitignore        │
│     ✓ Already there: Skip           │
│     ✗ Missing: Add it               │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│  4. Check Current State              │
│     • Local .env exists?            │
│     • Cloud secrets exist?          │
│     • Which is newer?               │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│  5. Take Action                      │
│     • None exist: Create & push     │
│     • Only local: Push to cloud     │
│     • Only cloud: Pull locally      │
│     • Both exist: Sync newer→older  │
└─────────────────────────────────────┘
```

## Usage Examples

### Scenario 1: Starting a New Project

```bash
cd ~/repos/new-app

# Create template .env.example
cat > .env.example <<EOF
NODE_ENV=development
DATABASE_URL=
API_KEY=
EOF

# Smart sync sets everything up!
lsh sync
```

**Output:**
```
🔍 Smart sync for: new-app/dev

📁 Git Repository:
   Repo: new-app
   Branch: main

🔑 No encryption key found...
⚠️  Warning: No LSH_SECRETS_KEY set. Generating a new key...
✅ Generated and saved encryption key to .env

✅ Added .env to .gitignore

📊 Current Status:
   Encryption key: ✅
   Local .env: ❌
   Cloud storage: ❌

🆕 No secrets found locally or in cloud
   Creating new .env file...
✅ Created .env from .env.example
   Pushing to cloud...
✅ Pushed 3 secrets from .env to Supabase

✅ Setup complete! Edit your .env and run sync again to update.
```

### Scenario 2: Cloning an Existing Project

```bash
# Clone repo
git clone https://github.com/user/existing-app.git
cd existing-app

# Project already has secrets in cloud
lsh sync
```

**Output:**
```
🔍 Smart sync for: existing-app/dev

📁 Git Repository:
   Repo: existing-app
   Branch: main

📊 Current Status:
   Encryption key: ✅
   Local .env: ❌
   Cloud storage: ✅ (15 keys)
   Key matches: ✅

⬇️  Cloud secrets available but no local file
   Pulling from cloud...
✅ Pulled 15 secrets from Supabase

📝 To load secrets in your current shell:
   export $(cat .env | grep -v '^#' | xargs)
```

### Scenario 3: Daily Development

```bash
# Your teammate updated secrets
cd ~/repos/my-app

# Check and sync
lsh sync
```

**Output:**
```
🔍 Smart sync for: my-app/dev

📁 Git Repository:
   Repo: my-app
   Branch: feature/new-api

📊 Current Status:
   Encryption key: ✅
   Local .env: ✅ (14 keys)
   Cloud storage: ✅ (15 keys)
   Key matches: ✅

⬇️  Cloud is newer than local file
   Local: 10/29/2025, 2:30:00 PM
   Cloud: 10/30/2025, 9:15:00 AM
   Pulling from cloud (backup created)...
Backed up existing .env to .env.backup.1730304900000
✅ Pulled 15 secrets from Supabase

📝 To load secrets in your current shell:
   export $(cat .env | grep -v '^#' | xargs)
```

### Scenario 4: You Updated Secrets Locally

```bash
# Edit your .env
echo "NEW_API_KEY=abc123" >> .env

# Sync automatically pushes newer local file
lsh sync
```

**Output:**
```
🔍 Smart sync for: my-app/dev

📁 Git Repository:
   Repo: my-app
   Branch: main

📊 Current Status:
   Encryption key: ✅
   Local .env: ✅ (15 keys)
   Cloud storage: ✅ (14 keys)
   Key matches: ✅

⬆️  Local file is newer than cloud
   Local: 10/30/2025, 10:30:00 AM
   Cloud: 10/30/2025, 9:15:00 AM
   Pushing to cloud...
✅ Pushed 15 secrets from .env to Supabase

📝 To load secrets in your current shell:
   export $(cat .env | grep -v '^#' | xargs)
```

## Command Options

### Basic Usage

```bash
lsh sync                    # Smart sync with defaults
lsh sync --env staging      # Sync staging environment
lsh sync --file .env.prod   # Sync specific file
```

### Load Mode - Sync AND Load in One Command! 🎉

The `--load` flag syncs your secrets and outputs eval-able export commands:

```bash
# Sync and load secrets in one command!
eval "$(lsh sync --load)"

# Your .env variables are now loaded in the current shell!
echo $DATABASE_URL
echo $API_KEY
```

**How it works:**
- Performs smart sync (push/pull as needed)
- Progress messages go to stderr (doesn't interfere with eval)
- Outputs `export` commands to stdout
- Use with `eval` to load into current shell

**Example workflow:**
```bash
cd ~/repos/my-app

# Sync and load in one line
eval "$(lsh sync --load)"

# Start your app with secrets loaded
npm start
```

### Advanced Options

```bash
# Dry run - see what would happen without executing
lsh sync --dry-run

# Legacy mode - just show suggestions, don't auto-execute
lsh sync --legacy

# Sync and load with custom environment
eval "$(lsh sync --env production --load)"

# Different file
eval "$(lsh sync --file .env.local --load)"
```

## Repository-Aware Namespacing

When in a git repository, Smart Sync automatically namespaces your secrets:

| Your Command | Git Repo | Actual Environment | Cloud Storage |
|--------------|----------|-------------------|---------------|
| `--env dev` | my-app | `my-app_dev` | ✅ Stored |
| `--env staging` | my-app | `my-app_staging` | ✅ Stored |
| `--env dev` | other-app | `other-app_dev` | ✅ Stored (separate!) |

This means:
- ✅ **Multiple projects can have `dev` environments without conflict**
- ✅ **Secrets are automatically isolated by project**
- ✅ **You can work on many repos with simple `--env dev` everywhere**

### Without Git Repository

If you're not in a git repo, it uses standard namespace:

| Your Command | Actual Environment | Cloud Storage |
|--------------|-------------------|---------------|
| `--env dev` | `dev` | ✅ Stored |
| `--env production` | `production` | ✅ Stored |

## Security Features

### Auto-Generated Encryption Keys

Smart Sync automatically:
1. Generates a secure 256-bit encryption key
2. Saves it to `.env` file
3. Sets it in current process
4. Provides instructions for loading in shell

**Generated key format:**
```bash
LSH_SECRETS_KEY=REDACTED
```

### Automatic .gitignore Management

Smart Sync ensures `.env` files are never committed:

```gitignore
# Environment variables (managed by LSH)
.env
.env.local
.env.*.local
```

### Key Verification

Smart Sync verifies your encryption key matches cloud storage:

```
📊 Current Status:
   Encryption key: ✅
   Local .env: ✅ (15 keys)
   Cloud storage: ✅ (15 keys)
   Key matches: ✅  <-- Verified!
```

If mismatch:
```
⚠️  Encryption key mismatch!
   The local key does not match the cloud storage.
   Please use the original key or push new secrets with:
   lsh push -f .env -e dev
```

## Comparison: Smart Sync vs Manual

### Old Way (Manual)

```bash
# Setup encryption key
lsh key
# Copy key to .env manually
echo "LSH_SECRETS_KEY=abc..." >> .env

# Check status
lsh status

# Look at suggestions
lsh sync

# Manually push or pull
lsh push --env dev

# Make sure it's in gitignore
echo ".env" >> .gitignore
```

### New Way (Smart Sync)

```bash
# One command!
lsh sync
```

## Tips & Best Practices

### 1. Use --load for Ultimate Convenience

Instead of syncing and then manually loading:

```bash
# Old way (2 commands)
lsh sync
set -a; source .env; set +a

# New way (1 command!)
eval "$(lsh sync --load)"
```

Add to your shell profile for instant setup:

```bash
# Add to ~/.zshrc or ~/.bashrc
alias load-secrets='eval "$(lsh sync --load)"'

# Then just use:
cd ~/repos/my-app
load-secrets
npm start
```

### 2. Run Sync Regularly

Add to your daily workflow:
```bash
# At start of day
cd ~/repos/my-app
eval "$(lsh sync --load)"

# After pulling latest code
git pull && eval "$(lsh sync --load)"

# Before important work
eval "$(lsh sync --load)" && npm start
```

### 2. Create Good .env.example Files

Smart Sync uses `.env.example` as a template:

```bash
# Good .env.example
NODE_ENV=development
DATABASE_URL=postgresql://localhost:5432/mydb
REDIS_URL=redis://localhost:6379
API_KEY=
JWT_SECRET=
STRIPE_SECRET=
```

### 3. Team Sharing

Share the encryption key securely:

```bash
# Generate key on first machine
lsh sync

# Share the key via 1Password/LastPass
# Team members add it to their .env:
LSH_SECRETS_KEY=REDACTED

# Then they just sync!
lsh sync
```

### 4. Multiple Environments Per Repo

```bash
# Development
lsh sync --env dev

# Staging
lsh sync --env staging --file .env.staging

# Production
lsh sync --env production --file .env.production
```

### 5. Backup Before Major Changes

```bash
# Backup current .env
cp .env .env.backup

# Make changes
nano .env

# Sync (it will create another backup automatically)
lsh sync
```

## Troubleshooting

### "Decryption failed"

**Problem:** Wrong encryption key

**Solution:**
```bash
# Check current key
echo $LSH_SECRETS_KEY

# Get the correct key from team/1Password
# Add to .env:
echo "LSH_SECRETS_KEY=correct-key-here" >> .env

# Load it
export LSH_SECRETS_KEY=correct-key-here

# Try again
lsh sync
```

### "Not in a git repository"

**Problem:** Smart Sync prefers git repos but works without them

**Solution:**
```bash
# Initialize git if you want repo-aware namespacing
git init
git remote add origin <url>

# Or just use without git (standard namespace)
lsh sync  # Uses 'dev' instead of 'my-project_dev'
```

### "Cloud secrets exist but key mismatch"

**Problem:** Someone else initialized the repo with a different key

**Solution 1:** Get the original key from team
```bash
# Add correct key to .env
echo "LSH_SECRETS_KEY=original-key" >> .env
export LSH_SECRETS_KEY=original-key

# Now sync works
lsh sync
```

**Solution 2:** Reinitialize with your key (only if you're sure!)
```bash
# Force push with your key
lsh push --env dev --force

# Now sync works
lsh sync
```

## FAQ

### Q: Does this work without git?

**A:** Yes! It just uses standard environment names instead of repo-aware ones.

### Q: Can I still use the old push/pull commands?

**A:** Absolutely! `lsh push` and `lsh pull` still work exactly as before.

### Q: What if I want manual control?

**A:** Use `--dry-run` to see what would happen, or `--legacy` for suggestion-only mode.

### Q: Does it handle multiple .env files?

**A:** Yes! Use `--file` flag:
```bash
lsh sync --file .env.production --env prod
lsh sync --file .env.staging --env staging
```

### Q: What about secrets that aren't in .env?

**A:** Smart Sync focuses on .env files. For other secrets, use regular push/pull commands.

### Q: Can I disable auto-execution?

**A:** Yes! Use `--dry-run` or `--legacy` flags for manual workflow.

### Q: I'm getting "zsh: no matches found" errors with --load. What's wrong?

**A:** This was a bug in v0.8.2 where logger output interfered with eval. **Fixed in v0.8.3!**

Update to the latest version:
```bash
npm install -g lsh-framework@latest
lsh --version  # Should be 0.8.3 or higher
```

If you're on v0.8.3+, the `--load` flag should work perfectly:
```bash
eval "$(lsh sync --load)"
```

## Summary

Smart Sync makes secrets management effortless:

- 🎯 **One command** - `lsh sync` does everything
- 🔍 **Auto-detection** - Finds git repos, detects state
- 🔐 **Auto-security** - Generates keys, adds to .gitignore
- 🌍 **Repo-aware** - Namespaces by project automatically
- ⚡ **Intelligent** - Pushes/pulls based on what's newer
- 🛡️ **Safe** - Creates backups, verifies keys
- 🚀 **Load mode** - Sync AND load with `--load` flag

**Before Smart Sync:**
```bash
# 10+ commands to set up and sync
lsh key
echo "LSH_SECRETS_KEY=..." >> .env
lsh push
# ... on another machine
lsh pull
set -a; source .env; set +a
```

**With Smart Sync:**
```bash
lsh sync
```

**With Smart Sync + Load:**
```bash
eval "$(lsh sync --load)"
# Synced AND loaded! 🎉
```

That's it! 🎉

---

**Next Steps:**
- Try it: `cd your-project && lsh sync`
- Read: [SECRETS_GUIDE.md](./SECRETS_GUIDE.md) for full documentation
- Cheat sheet: [SECRETS_QUICK_REFERENCE.md](./SECRETS_QUICK_REFERENCE.md)

**Last Updated:** October 30, 2025
