# LSH Quick Start Guide

Get up and running with LSH in minutes! This guide covers three deployment options, from simplest to most feature-rich.

## Table of Contents

- [Option 1: Local-Only Mode (Simplest)](#option-1-local-only-mode-simplest)
- [Option 2: Local PostgreSQL (Recommended for Development)](#option-2-local-postgresql-recommended-for-development)
- [Option 3: Supabase Cloud (Full Features + Team Collaboration)](#option-3-supabase-cloud-full-features--team-collaboration)
- [Verifying Your Installation](#verifying-your-installation)
- [Next Steps](#next-steps)

---

## Option 1: Local-Only Mode (Simplest)

**Perfect for:** Trying out LSH, single-user setups, no database required

### Installation

```bash
# Install LSH globally
npm install -g lsh-framework

# That's it! No database setup needed
# LSH stores configuration in ~/.config/lsh/lshrc
```

### Configuration (Optional)

```bash
# Edit configuration file
lsh config

# Or manually edit
$EDITOR ~/.config/lsh/lshrc
```

### How It Works

LSH automatically falls back to local file storage when no database is configured:
- Data stored in: `~/.lsh/data/storage.json`
- Secrets stored in: `~/.lsh/secrets/`
- No external dependencies
- Perfect for getting started quickly

### Limitations

- ❌ No team collaboration
- ❌ No cross-machine sync
- ❌ No advanced query capabilities
- ✅ All core LSH features work
- ✅ Secrets encryption works
- ✅ Job scheduling works

### Start Using LSH

```bash
# Interactive shell
lsh -i

# Execute a command
lsh -c "echo Hello LSH"

# Store a secret
echo "API_KEY=my-secret-key" > .env
lsh push --env dev

# Pull secrets on another machine (local storage only)
lsh pull --env dev
```

---

## Option 2: Local PostgreSQL (Recommended for Development)

**Perfect for:** Local development, testing, single-user with database features

### Prerequisites

- Docker and Docker Compose installed

### Quick Setup

```bash
# Clone or navigate to LSH repository
cd lsh

# Start PostgreSQL
docker-compose up -d

# Verify database is running
docker-compose ps

# Install LSH
npm install -g lsh-framework

# Configure database connection
cat > .env <<EOF
DATABASE_URL=postgresql://lsh_user:lsh_password@localhost:5432/lsh
NODE_ENV=development
EOF
```

### What You Get

- ✅ Full database features
- ✅ Fast local queries
- ✅ SQL interface via pgAdmin (http://localhost:5050)
- ✅ Easy backup/restore
- ❌ Still single-user (no team sync)

### Database Management

```bash
# Access pgAdmin (if you started it)
docker-compose --profile tools up -d
# Visit http://localhost:5050
# Login: admin@lsh.local / admin

# Backup database
docker exec lsh-postgres pg_dump -U lsh_user lsh > backup.sql

# Restore database
cat backup.sql | docker exec -i lsh-postgres psql -U lsh_user -d lsh

# Stop database (preserves data)
docker-compose stop

# Remove database and volumes
docker-compose down -v
```

### Switching from Local-Only to PostgreSQL

Your data in `~/.lsh/data/storage.json` won't automatically migrate. To migrate:

```bash
# Option 1: Manual import (small datasets)
# Re-run commands to repopulate database

# Option 2: Migration script (coming in v1.4)
# Will be available soon
```

---

## Option 3: Supabase Cloud (Full Features + Team Collaboration)

**Perfect for:** Team collaboration, production deployments, multi-machine sync

### Prerequisites

- Supabase account (free tier available at https://supabase.com)

### Setup Steps

#### 1. Create Supabase Project

1. Go to https://app.supabase.com
2. Click "New Project"
3. Choose organization and project name
4. Wait for database provisioning (~2 minutes)

#### 2. Run Database Schema

```bash
# Copy schema from scripts/init-db.sql
# In Supabase Dashboard:
# 1. Go to SQL Editor
# 2. Click "New Query"
# 3. Paste contents of scripts/init-db.sql
# 4. Click "Run"
```

#### 3. Get API Credentials

1. In Supabase Dashboard, go to Settings → API
2. Copy:
   - Project URL → `SUPABASE_URL`
   - `anon` `public` key → `SUPABASE_ANON_KEY`

#### 4. Configure LSH

```bash
# Install LSH
npm install -g lsh-framework

# Create .env file
cat > .env <<EOF
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here

# Secrets Encryption (generate with: openssl rand -hex 32)
LSH_SECRETS_KEY=your-32-byte-hex-key

# Optional: API and webhooks
LSH_API_ENABLED=true
LSH_API_PORT=3030
LSH_API_KEY=$(openssl rand -hex 32)
LSH_JWT_SECRET=$(openssl rand -hex 32)
EOF
```

### Team Collaboration Setup

Share these with your team:

1. **Supabase Credentials** (secure channel)
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`

2. **Shared Secrets Encryption Key** (secure channel)
   - `LSH_SECRETS_KEY` - Same key for all team members

Each team member:

```bash
# Install LSH
npm install -g lsh-framework

# Create .env with shared credentials
cat > .env <<EOF
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=shared-anon-key
LSH_SECRETS_KEY=shared-encryption-key
EOF

# Pull latest secrets
lsh pull --env production
```

### What You Get

- ✅ Team collaboration
- ✅ Multi-machine sync
- ✅ Cloud backup
- ✅ Real-time sync
- ✅ Advanced queries
- ✅ Automatic secret rotation
- ✅ Audit logs

---

## Verifying Your Installation

Test that LSH is working correctly:

```bash
# Check version
lsh --version

# Test connection (shows which backend is active)
lsh daemon status

# Create a test secret
echo "TEST_KEY=hello-world" > test.env
lsh push test.env --env dev

# Retrieve it
lsh pull --env dev
cat .env  # Should contain TEST_KEY=hello-world

# Test job scheduling
lsh daemon start
lsh cron add --name test-job --schedule "* * * * *" --command "echo test"
lsh cron list

# Cleanup
lsh daemon stop
rm test.env .env
```

### Expected Outputs

**Local-Only Mode:**
```
⚠️  Supabase not configured - using local storage fallback
✓ Data will be stored in ~/.lsh/data/storage.json
```

**PostgreSQL Mode:**
```
✓ Connected to PostgreSQL at localhost:5432/lsh
✓ Database schema initialized
```

**Supabase Mode:**
```
✓ Connected to Supabase at https://your-project.supabase.co
✓ Team sync enabled
```

---

## Next Steps

### Learn Core Features

- **Secrets Management:** See [SECRETS_GUIDE.md](features/secrets/SECRETS_GUIDE.md)
- **Job Scheduling:** See [README.md](../README.md#job-scheduling)
- **Shell Features:** See [README.md](../README.md#shell-features)

### Common Workflows

```bash
# Manage secrets across environments
lsh push --env production
lsh push --env staging
lsh pull --env dev

# Schedule automatic secret rotation
lsh cron add --name rotate-keys \
  --schedule "0 0 1 * *" \
  --command "./scripts/rotate-api-keys.sh"

# Start daemon for background jobs
lsh daemon start
lsh daemon status

# View job logs
lsh cron list
cat /tmp/lsh-job-daemon-$USER.log
```

### Troubleshooting

**Problem: "Supabase configuration missing"**
```bash
# You're in local-only mode (this is fine!)
# To use database, configure SUPABASE_URL and SUPABASE_ANON_KEY
# Or use docker-compose for local PostgreSQL
```

**Problem: "Failed to initialize local storage"**
```bash
# Check permissions
ls -la ~/.lsh/data/
chmod -R 755 ~/.lsh

# Or specify custom location
export LSH_DATA_DIR=~/my-lsh-data
```

**Problem: Docker database won't start**
```bash
# Check if port 5432 is available
lsof -i :5432

# Use different port
# Edit docker-compose.yml: "5433:5432"
# Update DATABASE_URL: postgresql://...@localhost:5433/lsh
```

### Getting Help

- **Documentation:** `/docs` folder in this repository
- **GitHub Issues:** https://github.com/YOUR_USERNAME/lsh-framework/issues
- **Quick Reference:** [SECRETS_QUICK_REFERENCE.md](features/secrets/SECRETS_QUICK_REFERENCE.md)

### Upgrading Between Modes

You can switch modes anytime:

```bash
# Local-Only → PostgreSQL
docker-compose up -d
# Add DATABASE_URL to .env

# PostgreSQL → Supabase
# Create Supabase project
# Add SUPABASE_URL and SUPABASE_ANON_KEY to .env
# Remove DATABASE_URL

# Supabase → Local-Only
# Remove SUPABASE_URL and SUPABASE_ANON_KEY from .env
# LSH automatically falls back to local storage
```

**Note:** Data doesn't auto-migrate between modes. You'll need to manually re-push secrets and recreate cron jobs after switching.

---

## Security Reminders

- 🔒 Never commit `.env` file to git
- 🔒 Use separate `LSH_SECRETS_KEY` per environment
- 🔒 Rotate API keys regularly
- 🔒 Use `.gitignore` for sensitive files
- 🔒 Share team credentials via secure channels only

---

**Ready to dive deeper?** Check out the [full documentation](../README.md) and [secrets management guide](features/secrets/SECRETS_GUIDE.md).
