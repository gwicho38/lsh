# LSH v3.1.19 - Encrypted Secrets Manager

**The simplest way to sync `.env` files across all your machines.**

`lsh` is an encrypted secrets manager that syncs your environment files across development machines with AES-256 encryption via the IPFS network. Push once, pull anywhere.

[![npm version](https://badge.fury.io/js/lsh-framework.svg)](https://badge.fury.io/js/lsh-framework)
[![Node.js CI](https://github.com/gwicho38/lsh/actions/workflows/node.js.yml/badge.svg)](https://github.com/gwicho38/lsh/actions/workflows/node.js.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## What's New in v3.1.19

- **Type Safety Milestone** - All `@typescript-eslint/no-explicit-any` warnings eliminated (51+ → 0)
- **Constants Centralization** - Hardcoded strings moved to constants modules
- **API Response Builder** - Standardized API responses with `sendSuccess`, `sendError`, `ApiErrors`
- **Test Coverage** - 59 new tests for constants modules (142 total constants tests)
- **Code Quality** - Lint warnings reduced from 744 to 550 (26.1% reduction)

See [Release Notes](docs/releases/3.1.19.md) for full details.

## Quick Start

```bash
# Install
npm install -g lsh-framework

# Interactive setup (recommended)
lsh init

# Or quick start
cd ~/your-project
lsh sync
```

That's it! Your secrets are now encrypted and synced.

## Why LSH?

| Feature | LSH | dotenv-vault | 1Password | Doppler |
|---------|-----|--------------|-----------|---------|
| **Free** | Yes | Limited | No | No |
| **Self-Hosted** | Yes | No | No | No |
| **Auto Rotation** | Built-in | No | No | No |
| **IPFS Storage** | Yes | No | No | No |
| **Setup Time** | 2 min | 5 min | 10 min | 10 min |

## Core Commands

```bash
# Setup
lsh init              # Interactive setup wizard
lsh key               # Generate encryption key

# Daily use
lsh push              # Upload encrypted .env to cloud
lsh pull              # Download .env from cloud
lsh sync              # Smart sync (auto push/pull)
lsh list              # List local secrets
lsh env               # List cloud environments

# Get/Set individual secrets
lsh get API_KEY       # Get a secret value
lsh set API_KEY xxx   # Set a secret value
printenv | lsh set    # Batch import from stdin

# Multi-environment
lsh push --env prod
lsh pull --env staging
```

## How It Works

```
Your Machine                    Storacha (IPFS Network)
┌─────────────┐                 ┌─────────────────────┐
│   .env      │   AES-256       │  Encrypted Blob     │
│  (secrets)  │ ───encrypt───►  │  (content-addressed)│
└─────────────┘                 └─────────────────────┘
                                         │
                                         ▼
Another Machine                 ┌─────────────────────┐
┌─────────────┐   AES-256       │  Registry           │
│   .env      │ ◄──decrypt────  │  (points to blob)   │
│  (secrets)  │                 └─────────────────────┘
└─────────────┘
```

1. Your `.env` is encrypted locally with AES-256
2. Encrypted data uploads to IPFS via Storacha
3. A registry tracks the latest version per repository
4. Other machines pull via the content ID (CID)
5. Decryption happens locally with your shared key

## Installation

### Prerequisites
- Node.js 20.18.0+
- npm 10.0.0+

### Install from npm

```bash
npm install -g lsh-framework
lsh --version
```

### First-Time Setup

```bash
# Interactive setup (handles everything)
lsh init

# Or manual setup:
lsh key                        # Generate encryption key
echo "LSH_SECRETS_KEY=..." >> .env
lsh push                       # Push to cloud
```

## Multi-Host Sync

**The killer feature.** Sync secrets across all your machines:

```bash
# Machine 1: Push secrets
cd ~/repos/my-project
lsh push

# Machine 2: Pull secrets (same encryption key)
cd ~/repos/my-project
lsh pull

# That's it - your .env is synced!
```

### First-Time on New Machine

```bash
# 1. Install LSH
npm install -g lsh-framework

# 2. Authenticate with Storacha (one-time)
lsh storacha login your@email.com

# 3. Add your encryption key
echo "LSH_SECRETS_KEY=your-shared-key" > .env

# 4. Pull secrets
lsh pull
```

## Multi-Environment Support

```bash
# Development
lsh push --env dev

# Staging
lsh push --file .env.staging --env staging

# Production
lsh push --file .env.prod --env prod

# Pull any environment
lsh pull --env prod
```

## Team Collaboration

**Setup (Team Lead):**
```bash
lsh key                    # Generate team key
lsh push --env prod        # Push team secrets
# Share LSH_SECRETS_KEY via 1Password/LastPass
```

**Team Members:**
```bash
# Get key from 1Password
echo "LSH_SECRETS_KEY=shared-key" > .env
lsh pull --env prod
# Done!
```

## Automatic Secret Rotation

Use the built-in daemon for automated rotation:

```bash
# Start daemon
lsh daemon start

# Schedule monthly key rotation
lsh cron add \
  --name "rotate-keys" \
  --schedule "0 0 1 * *" \
  --command "./scripts/rotate.sh && lsh push"

# List scheduled jobs
lsh cron list
```

## Export Formats

Export secrets in multiple formats:

```bash
lsh list --format json    # JSON
lsh list --format yaml    # YAML
lsh list --format toml    # TOML
lsh list --format export  # Shell export statements

# Load into current shell
eval "$(lsh list --format export)"
```

## Security

- **AES-256-CBC** encryption for all secrets
- **Content-addressed storage** - tamper-proof IPFS CIDs
- **Zero-knowledge** - Storacha never sees your unencrypted data
- **Local-first** - Works offline with cached secrets

### Best Practices

**DO:**
- Store `LSH_SECRETS_KEY` in shell profile (`~/.zshrc`)
- Share keys via password manager (1Password, etc.)
- Use different keys per project/team
- Rotate keys periodically

**DON'T:**
- Commit `LSH_SECRETS_KEY` to git
- Share keys in plain text (Slack, email)
- Store production secrets in dev environment

## Troubleshooting

### "No secrets found for environment"

```bash
# Check what environments exist
lsh env

# Push if missing
lsh push --env dev
```

### "Decryption failed"

Wrong encryption key. Make sure `LSH_SECRETS_KEY` matches.

```bash
# Check current key
cat .env | grep LSH_SECRETS_KEY

# If lost, generate new key and re-push
lsh key
lsh push --force
```

### "Storacha authentication required"

```bash
lsh storacha login your@email.com
# Check email for verification
```

### Pull fails after clearing metadata

v3.0.0 fix: Pull now automatically checks the Storacha registry when local metadata is missing.

```bash
# If secrets were pushed before, pull should auto-recover
lsh pull

# If truly no secrets exist, push first
lsh push
```

## Documentation

- **[Secrets Guide](docs/features/secrets/SECRETS_GUIDE.md)** - Complete secrets management guide
- **[Smart Sync Guide](docs/features/secrets/SMART_SYNC_GUIDE.md)** - One-command sync guide
- **[Quick Reference](docs/features/secrets/SECRETS_QUICK_REFERENCE.md)** - Daily use cheatsheet
- **[Installation](docs/deployment/INSTALL.md)** - Detailed installation
- **[Developer Guide](CLAUDE.md)** - Contributing to LSH

## Advanced Features

LSH includes a full automation platform:

- **Persistent Daemon** - Background job execution
- **Cron Scheduling** - Time-based job scheduling
- **REST API** - HTTP API for integration
- **CI/CD Webhooks** - GitHub/GitLab webhook support
- **POSIX Shell** - Interactive shell with ZSH features

```bash
# Start daemon
lsh daemon start

# API server
LSH_API_KEY=xxx lsh api start --port 3030

# Interactive shell
lsh -i
```

## Configuration

### Environment Variables

```bash
# Required
LSH_SECRETS_KEY=<your-encryption-key>

# Optional - Storacha (default enabled)
LSH_STORACHA_ENABLED=true

# Optional - Supabase backend
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=<key>

# Optional - API server
LSH_API_ENABLED=true
LSH_API_PORT=3030
LSH_API_KEY=<key>
```

### Configuration Files

```
~/.config/lsh/lshrc     # LSH configuration
~/.lsh/secrets-cache/   # Encrypted secrets cache
~/.lsh/secrets-metadata.json  # Metadata index
```

## Contributing

```bash
git clone https://github.com/gwicho38/lsh.git
cd lsh
npm install
npm run build
npm test
npm link
```

See [CLAUDE.md](CLAUDE.md) for development guidelines.

## License

MIT

## Support

- **Issues**: https://github.com/gwicho38/lsh/issues
- **Discussions**: https://github.com/gwicho38/lsh/discussions

---

**Stop copying `.env` files. Start syncing.**

```bash
npm install -g lsh-framework
lsh init
```
