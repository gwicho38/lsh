# LSH - Encrypted Secrets Manager with Automated Rotation

`lsh` is a powerful **encrypted secrets manager** that syncs your `.env` files across all development environments with AES-256 encryption. Built on a robust shell framework with daemon scheduling, it enables **automatic secret rotation**, team collaboration, and seamless multi-environment management.

**Never copy .env files again.** Push once, pull anywhere, rotate automatically.

## Why LSH?

Traditional secret management tools are either too complex, too expensive, or require vendor lock-in. LSH gives you:

- **True multi-host sync** via IPFS network (Storacha) - enabled by default in v2.1.0!
- **Encrypted sync** with AES-256 encryption before upload
- **Automatic rotation** with built-in daemon scheduling
- **Team collaboration** with shared encryption keys
- **Multi-environment** support (dev/staging/prod)
- **Local-first** - works offline, graceful fallback to local cache
- **Free & Open Source** - no per-seat pricing, 5GB free tier on Storacha

**Plus, you get a complete shell automation platform as a bonus.**

## Quick Start

**New to LSH?** Choose your sync method:
- **Storacha (IPFS network)** - One-time email auth, automatic multi-host sync (NEW in v2.1.0!)
- **Local storage** - Zero config, works offline, encrypted at `~/.lsh/secrets-cache/`
- **Supabase** - Team collaboration with audit logs and role-based access

### Quick Install (Works Immediately!)

```bash
# Install LSH
npm install -g lsh-framework

# That's it! LSH works immediately with IPFS storage
# Config: ~/.config/lsh/lshrc (auto-created)
# Secrets: ~/.lsh/secrets-cache/ (encrypted IPFS storage)
# Metadata: ~/.lsh/secrets-metadata.json

# Start using it right away
lsh --version
lsh config  # Edit configuration (optional)
lsh daemon start
```

### Smart Sync (Easiest Way!)

```bash
# 1. Install
npm install -g lsh-framework

# 2. ONE command does everything!
cd ~/repos/your-project
lsh sync

# That's it! Smart Sync:
# ✅ Auto-generates encryption key
# ✅ Creates .env from .env.example
# ✅ Adds .env to .gitignore
# ✅ Stores encrypted secrets locally via IPFS
# ✅ Namespaces by repo name
# ✅ Works completely offline
```

### Sync AND Load in One Command

```bash
# Sync and load secrets into current shell
eval "$(lsh sync --load)"

# Your secrets are now available!
echo $DATABASE_URL
```

### Traditional Method (Manual Control)

```bash
# 1. Install
npm install -g lsh-framework

# 2. Generate encryption key (for team sharing)
lsh key
# Add the output to your .env:
# LSH_SECRETS_KEY=<your-key>

# 3. Push your secrets (encrypted locally via IPFS)
lsh push

# 4. Pull on any other machine (with same encryption key)
lsh pull

# Done! Your secrets are synced via encrypted IPFS storage.
# Share the LSH_SECRETS_KEY with team members for collaboration.
```

## Core Features

### 🚀 Smart Sync (New in v0.8.2!)

**One command. Zero configuration. Automatic everything.**

```bash
cd ~/repos/my-app
lsh sync              # Auto-setup and sync
eval "$(lsh sync --load)"  # Sync AND load into shell
```

What Smart Sync does automatically:
- ✅ **Detects git repos** - Namespaces secrets by project name
- ✅ **Generates keys** - Creates encryption key if missing
- ✅ **Creates .env** - From .env.example or template
- ✅ **Updates .gitignore** - Ensures .env is never committed
- ✅ **Intelligent sync** - Pushes/pulls based on what's newer
- ✅ **Load mode** - Sync and load with `eval` in one command
- ✅ **Immutable audit log** - Records all operations to IPFS (local) **(NEW in v1.5.0)**

**Repository Isolation:**
```bash
cd ~/repos/app1
lsh sync  # Stored as: app1_dev

cd ~/repos/app2
lsh sync  # Stored as: app2_dev (separate!)

# See what's tracked in the current directory
lsh info
```

**Example `lsh info` output:**
```
📍 Current Directory Context

📁 Git Repository:
   Name: myapp
   Branch: main

🔐 Environment Tracking:
   Base environment: dev
   Cloud storage name: myapp_dev
   Namespace: myapp
   ℹ️  Repo-based isolation enabled

📄 Local .env File:
   Keys: 12
   Has encryption key: ✅

☁️  Cloud Storage:
   Environment: myapp_dev
   Keys stored: 12
   Last updated: 11/6/2025, 10:15:23 PM
   Key matches: ✅
```

No more conflicts between projects using the same environment names!

### 📝 Immutable Audit Log (New in v1.5.0!)

**Every sync operation is automatically recorded to an immutable IPFS-compatible audit log.**

```bash
# Push secrets - automatically creates audit record
lsh push
✅ Pushed 60 secrets from .env to Supabase
📝 Recorded on IPFS: ipfs://bafkreiabc123...
   View: https://ipfs.io/ipfs/bafkreiabc123...

# View sync history
lsh sync-history show

📊 Sync History for: myproject/dev

2025-11-20 21:00:00  push    60 keys  myproject/dev
2025-11-20 20:45:00  pull    60 keys  myproject/dev
2025-11-20 20:30:00  push    58 keys  myproject/dev

📦 Total: 3 records
🔒 All records are permanently stored on IPFS
```

**Features:**
- ✅ **Zero Config** - Works automatically, no setup required
- ✅ **Content-Addressed** - IPFS-style CIDs for each record
- ✅ **Privacy-First** - Only metadata, never secret values
- ✅ **Immutable** - Content cannot change without changing CID
- ✅ **Opt-Out** - Disable with `lsh config set DISABLE_IPFS_SYNC true`

**What's Recorded:**
- Timestamp, command, action type (push/pull)
- Number of keys synced
- Git repo, branch, environment name
- Key fingerprint (hash only, not actual key)
- Machine ID (anonymized hash)

**What's NOT Recorded:**
- ❌ Secret values (never stored)
- ❌ Encryption keys (only fingerprints)
- ❌ File contents or variable names

See [IPFS Sync Records Documentation](docs/features/IPFS_SYNC_RECORDS.md) for complete details.

### 🌐 Multi-Host IPFS Network Sync (New in v2.1.0!)

**True multi-host sync via Storacha (IPFS network) - enabled by default!**

LSH now syncs secrets across all your machines via the IPFS network with zero configuration after one-time email authentication.

```bash
# On Host A (MacBook) - One-time setup
lsh storacha login [email protected]
# ✅ Email verification → payment plan → space created automatically

# Push secrets (automatic network sync)
cd ~/repos/my-project
lsh push --env dev
# 📤 Uploaded to Storacha: bafkrei...
#    ☁️  Synced to IPFS network

# On Host B (Linux server) - One-time setup
lsh storacha login [email protected]

# Pull secrets (automatic network download)
cd ~/repos/my-project
lsh pull --env dev
# 📥 Downloading from Storacha: bafkrei...
# ✅ Downloaded from IPFS network
```

**Features:**
- ✅ **Default enabled** - Works automatically after authentication
- ✅ **One-time setup** - Just authenticate with email per machine
- ✅ **Encrypted before upload** - AES-256 encryption (secrets never leave your machine unencrypted)
- ✅ **Graceful fallback** - Uses local cache if network unavailable
- ✅ **Content-addressed** - IPFS CIDs ensure tamper-proof integrity
- ✅ **Free tier** - 5GB storage on Storacha's free plan

**How it works:**
1. Your secrets are encrypted locally with `LSH_SECRETS_KEY`
2. Encrypted data is uploaded to IPFS via Storacha
3. On another machine, LSH downloads from IPFS using the content ID (CID)
4. Secrets are decrypted locally with the same encryption key
5. Local cache speeds up offline access

**Check status:**
```bash
lsh storacha status
# 🔐 Authentication: ✅ Authenticated
# 🌐 Network Sync: ✅ Enabled
# 📦 Spaces: lsh-secrets (current)
```

**Disable network sync (local cache only):**
```bash
lsh storacha disable
# Or set environment variable:
export LSH_STORACHA_ENABLED=false
```

### 🔐 Secrets Management

- **AES-256 Encryption** - Military-grade encryption for all secrets
- **Multi-Environment** - Separate configs for dev, staging, and production
- **Team Sync** - Share encryption keys securely with your team
- **Masked Viewing** - View secrets safely without exposing full values
- **Automatic Backup** - Never lose your `.env` files
- **Version Control** - Track changes to your secrets over time
- **Smart Sync** - Auto-setup with git repo detection (v0.8.2+)

### 🔄 Automatic Rotation (Unique Feature!)

Use the built-in daemon to automatically rotate secrets on a schedule:

```bash
# Schedule API key rotation every 30 days
lsh cron add \
  --name "rotate-api-keys" \
  --schedule "0 0 1 * *" \
  --command "./scripts/rotate-keys.sh && lsh push"

# Or use interval-based scheduling
lsh cron add \
  --name "sync-secrets" \
  --interval 3600 \
  --command "lsh pull && ./scripts/reload-app.sh"
```

**No other secrets manager has this built-in!** Most require complex integrations with cron or external tools.

### 👥 Team Collaboration

**Setup (One Time):**
```bash
# Project lead:
lsh key                    # Generate shared key
lsh push --env prod        # Push team secrets
# Share LSH_SECRETS_KEY via 1Password
```

**Team members:**
```bash
# 1. Get key from 1Password
# 2. Add to .env
echo "LSH_SECRETS_KEY=<shared-key>" > .env

# 3. Pull secrets
lsh pull --env prod

# 4. Start coding!
npm start
```

### 🌍 Multi-Environment Workflow

```bash
# Development
lsh push --env dev

# Staging (different values)
lsh push --file .env.staging --env staging

# Production (super secret)
lsh push --file .env.production --env prod

# Pull whatever you need
lsh pull --env dev      # for local dev
lsh pull --env staging  # for testing
lsh pull --env prod     # for production debugging
```

### 📝 Batch Upsert Secrets

**New in v1.1.0:** Pipe environment variables directly into your `.env` file!

```bash
# Copy all current environment variables
printenv | lsh set

# Import from another .env file
cat .env.backup | lsh set

# Import specific variables
printenv | grep "^AWS_" | lsh set

# Merge multiple sources
cat .env.base .env.local | lsh set

# From file with --stdin flag
lsh set --stdin < .env.production

# Single key-value still works
lsh set API_KEY sk_live_12345
lsh set DATABASE_URL postgres://localhost/db
```

**Features:**
- ✅ Automatic upsert (updates existing, adds new)
- ✅ Preserves comments and formatting
- ✅ Handles quoted values
- ✅ Validates key names
- ✅ Shows summary of changes

### 🔄 Multi-Format Export

**New in v1.2.1:** Export secrets in multiple formats for easy integration with other tools!

```bash
# JSON format (perfect for APIs and config files)
lsh list --format json

# YAML format (for Docker Compose, Kubernetes, etc.)
lsh list --format yaml

# TOML format (auto-detects namespaces!)
lsh list --format toml

# Shell export format (for sourcing in scripts)
lsh list --format export
eval "$(lsh list --format export)"

# Works with get command too
lsh get --all --format yaml > config.yaml

# And with env command for cloud secrets
lsh env prod --format json
```

**Supported Formats:**
- ✅ `env` - Standard KEY=value format (default, masked)
- ✅ `json` - JSON object format
- ✅ `yaml` - YAML format
- ✅ `toml` - TOML with smart namespace detection
- ✅ `export` - Shell export statements

**Smart Features:**
- Auto-detects namespaces in TOML (e.g., `DATABASE_*` → `[database]`)
- Auto-disables masking for structured formats (JSON/YAML/TOML)
- Use `--no-mask` to show full values in any format

## Secrets Commands

| Command | Description |
|---------|-------------|
| `lsh push` | Upload .env to encrypted cloud storage |
| `lsh pull` | Download .env from cloud storage |
| `lsh list` | List secrets in current .env file |
| `lsh env` | List all stored environments |
| `lsh key` | Generate encryption key |
| `lsh create` | Create new .env file |
| `lsh delete` | Delete .env file (with confirmation) |
| `lsh sync` | Smart sync (auto-setup and sync) |
| `lsh status` | Get detailed secrets status (JSON) |
| `lsh info` | Show current context and tracked environment |
| `lsh get <key>` | Get a specific secret value |
| `lsh set <key> <value>` | Set a single secret value |
| `printenv \| lsh set` | Batch upsert from stdin (pipe) |
| `lsh set --stdin < file` | Batch upsert from file |

See the complete guide: [SECRETS_GUIDE.md](docs/features/secrets/SECRETS_GUIDE.md)

## Installation

### Prerequisites
- Node.js 20.18.0 or higher
- npm 10.0.0 or higher
- Supabase account (free tier works) OR PostgreSQL database

### Install from npm

```bash
npm install -g lsh-framework
```

### Verify installation

```bash
lsh --version
lsh self version
```

### Shell Completion (Optional but Recommended)

**New in v1.3.2:** Enable intelligent Tab completion for bash/zsh!

**Bash:**
```bash
# Add to ~/.bashrc
echo 'source <(lsh completion bash)' >> ~/.bashrc
source ~/.bashrc
```

**Zsh:**
```bash
# Quick setup
mkdir -p ~/.zsh/completions
lsh completion zsh > ~/.zsh/completions/_lsh
echo 'fpath=(~/.zsh/completions $fpath)' >> ~/.zshrc
echo 'autoload -Uz compinit && compinit' >> ~/.zshrc
source ~/.zshrc
```

Now you can use Tab to:
- Complete command names: `lsh pu<Tab>` → `lsh push`
- Discover options: `lsh push <Tab>` → `-f --file -e --env --force -h --help`
- Complete environments: `lsh push --env <Tab>` → `dev staging production`
- Complete formats: `lsh list --format <Tab>` → `env json yaml toml export`

See [Shell Completion Guide](docs/features/SHELL_COMPLETION.md) for more details.

### Initial Setup

```bash
# 1. Generate encryption key
lsh key

# 2. Create .env file
cat > .env <<EOF
# Supabase (for encrypted storage)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key

# Encryption key (generated above)
LSH_SECRETS_KEY=your-key-here

# Your application secrets
DATABASE_URL=postgresql://localhost/mydb
API_KEY=your-api-key
EOF

# 3. Push to cloud
lsh push --env dev
```

## Advanced Features (Bonus!)

Because LSH is built on a complete shell framework, you also get powerful automation capabilities:

### Persistent Daemon

Run jobs reliably in the background:

```bash
# Start daemon
lsh daemon start

# Check status
lsh daemon status

# Stop daemon
lsh daemon stop
```

### Cron-Style Scheduling

Schedule any task with cron expressions:

```bash
# Daily backup at midnight
lsh cron add --name "backup" \
  --schedule "0 0 * * *" \
  --command "./backup.sh"

# Every 6 hours
lsh cron add --name "sync" \
  --schedule "0 */6 * * *" \
  --command "lsh pull && ./reload.sh"

# List all jobs
lsh cron list

# Trigger manually
lsh cron trigger backup
```

### RESTful API

Control everything via HTTP API:

```bash
# Start API server
LSH_API_KEY=your-key lsh api start --port 3030

# Use the API
curl -H "X-API-Key: your-key" http://localhost:3030/api/jobs
```

### CI/CD Integration

- **Webhook Receiver** - GitHub, GitLab, Jenkins webhook support
- **Build Analytics** - Track build metrics and performance
- **Pipeline Orchestration** - Workflow engine for complex pipelines

### POSIX Shell Features

LSH is also a full POSIX-compatible shell with ZSH enhancements:

- Extended globbing patterns
- Parameter expansion
- Associative arrays
- Command history and tab completion
- Interactive mode

```bash
# Use as interactive shell
lsh -i

# Execute commands
lsh -c "echo 'Hello World'"

# Run scripts
lsh -s script.sh
```

## Security

> **⚠️ CRITICAL: Read [SECURITY.md](SECURITY.md) for complete security guidelines**
>
> The security of your secrets depends entirely on how you store your `LSH_SECRETS_KEY`.
> **Never store it in your project's `.env` file** - use your shell profile instead.

### Encryption

- **Algorithm**: AES-256-CBC
- **Key Management**: User-controlled encryption keys
- **Storage**: Encrypted at rest in Supabase/PostgreSQL
- **Transport**: HTTPS for all API calls

### Best Practices

**✅ DO:**
- Store `LSH_SECRETS_KEY` in your shell profile (`~/.zshrc`, `~/.bashrc`)
- Generate unique keys per project/team
- Share keys securely via 1Password/LastPass/Bitwarden
- Use different keys for dev/staging/production environments
- Rotate keys periodically
- Keep encrypted backups of your encryption key

**❌ DON'T:**
- Store `LSH_SECRETS_KEY` in your project's `.env` file
- Commit `LSH_SECRETS_KEY` to git
- Share keys in plain text (Slack, email, etc.)
- Reuse keys across different teams/projects
- Store production secrets in dev environment

### Command Validation

All commands are validated to prevent injection attacks:

```typescript
import { validateCommand } from './lib/command-validator.js';

// Automatically validates and sanitizes
const result = await validateCommand(userInput);
```

### Environment Validation

LSH validates all environment variables at startup and fails fast if:
- Required secrets are missing or too short
- Invalid URL formats
- Dangerous commands enabled in production

## Use Cases

### 1. Multi-Machine Development

**Problem:** You develop on a laptop, desktop, and cloud server. Copying .env files manually is tedious.

**Solution:**
```bash
# Laptop
lsh push --env dev

# Desktop
lsh pull --env dev

# Cloud server
lsh pull --env dev

# All synced!
```

### 2. Team Onboarding

**Problem:** New team member needs to set up 5 microservices with different env vars.

**Solution:**
```bash
# New team member (after getting LSH_SECRETS_KEY from 1Password)
cd ~/projects/service-1 && lsh pull --env dev
cd ~/projects/service-2 && lsh pull --env dev
cd ~/projects/service-3 && lsh pull --env dev
cd ~/projects/service-4 && lsh pull --env dev
cd ~/projects/service-5 && lsh pull --env dev

# Done in 30 seconds instead of 30 minutes
```

### 3. Automated Secret Rotation

**Problem:** Security policy requires API keys to be rotated every 30 days.

**Solution:**
```bash
# Create rotation script
cat > rotate-keys.sh <<'EOF'
#!/bin/bash
# Generate new API key from provider
NEW_KEY=$(curl -X POST https://api.provider.com/keys/rotate)

# Update .env
sed -i "s/API_KEY=.*/API_KEY=$NEW_KEY/" .env

# Push to cloud
lsh push --env prod

# Notify team
echo "API keys rotated at $(date)" | mail -s "Key Rotation" team@company.com
EOF

# Schedule it
lsh cron add --name "rotate-keys" \
  --schedule "0 0 1 * *" \
  --command "./rotate-keys.sh"
```

### 4. Multi-Environment Deployment

**Problem:** Managing different configs for dev, staging, and production.

**Solution:**
```bash
# Push from local dev
lsh push --file .env.development --env dev

# Push staging config
lsh push --file .env.staging --env staging

# Push production config (from secure machine only)
lsh push --file .env.production --env prod

# CI/CD pulls the right one
# In .github/workflows/deploy.yml:
- name: Get secrets
  run: lsh pull --env ${{ github.ref == 'refs/heads/main' && 'prod' || 'staging' }}
```

## Comparison with Other Tools

| Feature | LSH | dotenv-vault | 1Password | Doppler | HashiCorp Vault |
|---------|-----|--------------|-----------|---------|-----------------|
| **Cost** | Free | Free tier | $3-8/mo/user | $5-10/user | Free (complex) |
| **Encryption** | AES-256 | ✓ | ✓ | ✓ | ✓ |
| **Self-Hosted** | ✓ (Supabase) | ✗ | ✗ | ✗ | ✓ (complex) |
| **Auto Rotation** | ✓ Built-in | ✗ | Manual | ✗ | ✓ (complex) |
| **Team Sync** | ✓ | ✓ | ✓ | ✓ | ✓ |
| **CLI Native** | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Setup Time** | 2 min | 5 min | 10 min | 10 min | 30+ min |
| **Daemon/Cron** | ✓ Built-in | ✗ | ✗ | ✗ | ✗ |
| **Learning Curve** | Easy | Easy | Medium | Medium | Hard |

**LSH is the only tool that combines:**
- Simple, fast setup
- Built-in scheduling for rotation
- Self-hosted option (no vendor lock-in)
- Completely free

## Configuration

### Environment Variables

Copy `.env.example` to `.env`:

```bash
# Secrets Management (Required)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=<your-anon-key>
LSH_SECRETS_KEY=<generate-with-lsh-lib-secrets-key>

# Optional: Advanced Features

# API Server
LSH_API_ENABLED=true
LSH_API_PORT=3030
LSH_API_KEY=<generate-32-char-key>
LSH_JWT_SECRET=<generate-32-char-secret>

# Webhooks (for CI/CD integration)
LSH_ENABLE_WEBHOOKS=true
WEBHOOK_PORT=3033
GITHUB_WEBHOOK_SECRET=<your-secret>
GITLAB_WEBHOOK_SECRET=<your-secret>

# Database (alternative to Supabase)
DATABASE_URL=postgresql://localhost:5432/lsh

# Caching
REDIS_URL=redis://localhost:6379

# Security
LSH_ALLOW_DANGEROUS_COMMANDS=false  # Keep false in production
```

### Generate Secrets

```bash
# Encryption key for secrets
lsh key

# API key for HTTP API
openssl rand -hex 32

# JWT secret
openssl rand -hex 32
```

## Development

### Building

```bash
# Build TypeScript
npm run build

# Watch mode
npm run watch

# Type checking
npm run typecheck
```

### Testing

```bash
# Run tests
npm test

# With coverage
npm run test:coverage

# Lint
npm run lint

# Auto-fix
npm run lint:fix
```

### Git Hooks

Install git hooks for automatic linting before commits:

```bash
# Install hooks
./scripts/install-git-hooks.sh

# Hooks will run automatically on git commit
# To skip hooks on a specific commit:
git commit --no-verify
```

The pre-commit hook runs `npm run lint` and blocks commits if linting fails.

### From Source

```bash
git clone https://github.com/gwicho38/lsh.git
cd lsh
npm install
npm run build
npm link
lsh --version
```

## Troubleshooting

### "No secrets found"

```bash
# Check stored environments
lsh list

# Push if missing
lsh push --env dev
```

### "Decryption failed"

```bash
# Wrong encryption key!
# Make sure LSH_SECRETS_KEY matches the one used to encrypt

# Generate new key and re-push
lsh key
lsh push
```

### "Supabase not configured"

```bash
# Add to .env:
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
```

### Daemon won't start

```bash
# Check if already running
ps aux | grep lshd

# Remove stale PID file
rm /tmp/lsh-job-daemon-$USER.pid

# Restart
lsh daemon start
```

## Documentation

### Secrets Management
- **[SMART_SYNC_GUIDE.md](docs/features/secrets/SMART_SYNC_GUIDE.md)** - 🆕 Smart Sync complete guide (v0.8.2+)
- **[SECRETS_GUIDE.md](docs/features/secrets/SECRETS_GUIDE.md)** - Complete secrets management guide
- **[SECRETS_QUICK_REFERENCE.md](docs/features/secrets/SECRETS_QUICK_REFERENCE.md)** - Quick reference for daily use
- **[SECRETS_CHEATSHEET.txt](SECRETS_CHEATSHEET.txt)** - Command cheatsheet

### IPFS Integration
- **[IPFS_CLIENT_GUIDE.md](docs/features/ipfs/IPFS_CLIENT_GUIDE.md)** - 🆕 IPFS client installation and management (v1.6.0+)

### Installation & Development
- **[INSTALL.md](docs/deployment/INSTALL.md)** - Detailed installation instructions
- **[CLAUDE.md](CLAUDE.md)** - Developer guide for contributors

### Release Notes
- **[v0.8.3](docs/releases/0.8.3.md)** - Hotfix: Logger output in load mode
- **[v0.8.2](docs/releases/0.8.2.md)** - Smart Sync feature release
- **[v0.8.1](docs/releases/0.8.1.md)** - Previous releases

## Architecture

### Secrets Flow

```
Local .env → Encrypt (AES-256) → Supabase/PostgreSQL
                                       ↓
                                  Pull on any machine
                                       ↓
                            Decrypt → Local .env
```

### Rotation Flow

```
Cron Schedule → Daemon → Rotation Script → Update .env → Push to cloud
                                                              ↓
                                                    Notify team/reload apps
```

### Security Architecture

```
API Request → JWT Validation → Command Validation → Execution
Webhook → HMAC Verification → Event Processing → Job Trigger
Daemon Startup → Env Validation → Fail Fast if Invalid
Secrets → AES-256 Encryption → Encrypted Storage
```

## API Reference

### Secrets API

All secrets commands are available programmatically:

```typescript
import SecretsManager from 'lsh-framework/dist/lib/secrets-manager.js';

const manager = new SecretsManager();

// Push secrets
await manager.push('.env', 'production');

// Pull secrets
await manager.pull('.env', 'production');

// List environments
const envs = await manager.listEnvironments();

// Show secrets (masked)
await manager.show('production');
```

### REST API

See API endpoints documentation in the Advanced Features section.

## Roadmap

- [ ] CLI command shortcuts (`lsh push` instead of `lsh push`)
- [ ] Built-in secret rotation templates (AWS, GCP, Azure)
- [ ] Web dashboard for team secret management
- [ ] Audit logging for secret access
- [ ] Integration with cloud secret managers (AWS Secrets Manager, etc.)
- [ ] Automatic secret expiration warnings
- [ ] Git hooks for secret validation

## Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make your changes
4. Add tests: `npm test`
5. Lint: `npm run lint:fix`
6. Commit and push
7. Create a Pull Request

## License

MIT

## Support

- **Issues**: https://github.com/gwicho38/lsh/issues
- **Discussions**: https://github.com/gwicho38/lsh/discussions
- **Documentation**: See docs/ folder

## Credits

Built with:
- TypeScript for type safety
- Supabase for encrypted storage
- Node.js crypto for AES-256 encryption
- Commander.js for CLI framework
- React/Ink for terminal UI

---

**Made with ❤️ for developers tired of copying .env files**

**Stop copying. Start syncing. Automate rotation.**
