# LSH Quick Reference

Daily commands for managing secrets with LSH.

> **v4.0.0:** the CLI surface is four commands plus `help`: `push`, `pull`, `sync`, `edit`. See
> [docs/releases/4.0.0.md](../../releases/4.0.0.md) for the full v3→v4 command mapping.

## Installation

```bash
npm install -g lsh-framework
lsh sync --init
```

## Core Commands

| Command | Description |
|---------|-------------|
| `lsh sync --init` | Interactive setup wizard |
| `lsh push` | Push .env to cloud |
| `lsh pull` | Pull .env from cloud |
| `lsh sync` | Smart sync (auto) |
| `lsh edit --list` | List local secrets (masked) |
| `lsh sync --status` | Show current context |

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
# Get single secret (exact match only — no fuzzy matching in v4)
lsh edit --get API_KEY

# Get all secrets
lsh edit --get --all
lsh edit --get --all --format json

# Set secret
lsh edit --set API_KEY=my-api-key-value

# No batch/stdin import in v4 — one --set per key, or merge an environment:
lsh edit --env prod --copy-from staging
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
# Masked table, any format (--list always masks)
lsh edit --list --format json
lsh edit --list --format yaml
lsh edit --list --format toml

# Full values, no masking
lsh edit --get --all --format export

# Load into shell
eval "$(lsh sync --load)"
```

## IPFS Sync

Secrets are AES-256 encrypted locally, added to your local Kubo (IPFS) daemon
(pinned), and published to IPNS under a name derived from `LSH_SECRETS_KEY` +
repo + environment. A teammate with the same key resolves the IPNS name and
fetches the content over the swarm.

```bash
# One-time setup for this repo/environment
lsh sync --init

# Push / pull encrypted secrets over IPFS
lsh push
lsh pull

# Check sync status and view history
lsh sync --status
lsh sync --history
```

> **Durability:** by default the content is pinned only on the machine that
> pushed it. For "pull anywhere, anytime" durability, configure a kubo remote
> pinning service and set `LSH_PIN_SERVICE` (see below).

```bash
# Configure a remote pinning service (one time)
ipfs pin remote service add <name> <endpoint> <key>
export LSH_PIN_SERVICE=<name>
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
lsh sync --status

# List what's in your local .env
lsh edit --get --all --format env

# Clear metadata (global — no per-repo scoping in v4)
lsh sync --repair

# Diagnostics
lsh sync --doctor
```

## Key Management

```bash
# Generate a key (no standalone CLI command — the wizard does it)
lsh sync --init

# Or generate one yourself and import it
openssl rand -hex 32
lsh sync --key=<generated-key>

# Print the effective key
lsh sync --key

# Export format
echo "export LSH_SECRETS_KEY=$(lsh sync --key)"
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
LSH_PIN_SERVICE=<name>       # Kubo remote pinning service for durable sync (optional)
```

## New Machine Setup

```bash
# 1. Install
npm install -g lsh-framework

# 2. Add encryption key (get from 1Password)
echo "LSH_SECRETS_KEY=xxx" > .env

# 3. Pull secrets
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
lsh help
lsh push --help
lsh pull --help
lsh sync --help
lsh edit --help
```

**Full docs:** [SECRETS_GUIDE.md](./SECRETS_GUIDE.md)
