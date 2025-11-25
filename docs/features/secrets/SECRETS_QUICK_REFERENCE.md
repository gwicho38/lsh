# LSH Quick Reference v3.0.0

Daily commands for managing secrets with LSH.

## Installation

```bash
npm install -g lsh-framework
lsh init
```

## Core Commands

| Command | Description |
|---------|-------------|
| `lsh init` | Interactive setup wizard |
| `lsh push` | Push .env to cloud |
| `lsh pull` | Pull .env from cloud |
| `lsh sync` | Smart sync (auto) |
| `lsh list` | List local secrets |
| `lsh env` | List cloud environments |
| `lsh info` | Show current context |

## Push & Pull

```bash
# Push current .env
lsh push

# Push specific environment
lsh push --env prod

# Pull secrets
lsh pull
lsh pull --env staging
```

## Get & Set

```bash
# Get single secret
lsh get API_KEY

# Get all secrets
lsh get --all
lsh get --all --format json

# Set secret
lsh set API_KEY sk_live_xxx

# Batch import
printenv | lsh set
```

## Multi-Environment

```bash
lsh push --env dev
lsh push --env staging
lsh push --env prod

lsh pull --env prod
```

## Export Formats

```bash
lsh list --format json
lsh list --format yaml
lsh list --format toml
lsh list --format export

# Load into shell
eval "$(lsh list --format export)"
```

## Storacha (IPFS Sync)

```bash
# One-time auth
lsh storacha login you@email.com

# Check status
lsh storacha status

# Disable network sync
lsh storacha disable
```

## Smart Sync

```bash
# Auto push/pull
lsh sync

# Sync and load
eval "$(lsh sync --load)"
```

## Troubleshooting

```bash
# Check context
lsh info

# List environments
lsh env

# Clear metadata
lsh clear --all

# Diagnostics
lsh doctor
```

## Key Management

```bash
# Generate key
lsh key

# Export format
lsh key --export
```

## Daemon & Cron

```bash
lsh daemon start
lsh daemon status
lsh cron list
lsh cron add --name "job" --schedule "0 * * * *" --command "cmd"
```

## Configuration Files

```
~/.lsh/secrets-cache/        # Encrypted cache
~/.lsh/secrets-metadata.json # Metadata
~/.config/lsh/lshrc          # Config
```

## Environment Variables

```bash
LSH_SECRETS_KEY=xxx          # Encryption key (required)
LSH_STORACHA_ENABLED=true    # Enable IPFS sync
```

## New Machine Setup

```bash
# 1. Install
npm install -g lsh-framework

# 2. Auth with Storacha
lsh storacha login you@email.com

# 3. Add encryption key (get from 1Password)
echo "LSH_SECRETS_KEY=xxx" > .env

# 4. Pull secrets
cd ~/repos/my-project
lsh pull
```

## Security Checklist

- [ ] `LSH_SECRETS_KEY` stored in shell profile
- [ ] Key shared via password manager only
- [ ] `.env` in `.gitignore`
- [ ] Different keys per project

## Help

```bash
lsh --help
lsh push --help
lsh pull --help
```

**Full docs:** [SECRETS_GUIDE.md](./SECRETS_GUIDE.md)
