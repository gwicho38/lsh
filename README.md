# LSH — Encrypted Secrets Manager

**The simplest way to sync `.env` files across all your machines.**

`lsh` is an encrypted secrets manager that syncs your environment files across development machines with AES-256 encryption over the IPFS network. Secrets are encrypted locally, addressed by content (CID), and published under a deterministic IPNS name derived from your shared key — so a teammate with the same key can pull the latest version with no account or server.

> **Durability note:** by default the encrypted content is pinned **only on the machine that pushed it** and served peer-to-peer. Another machine can pull as long as a node that holds the content is online and the IPNS record is still live. For "pull anywhere, anytime" durability, configure a remote pinning service (see [Durable sync](#durable-sync-remote-pinning)).

[![npm version](https://badge.fury.io/js/lsh-framework.svg)](https://badge.fury.io/js/lsh-framework)
[![Node.js CI](https://github.com/gwicho38/lsh/actions/workflows/node.js.yml/badge.svg)](https://github.com/gwicho38/lsh/actions/workflows/node.js.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## What's New in v4.0.0

**Breaking change.** The CLI surface is now four commands plus `help`: `push`, `pull`, `sync`, `edit`. Every other
v3 top-level command was removed; `lsh --help` lists exactly these five entries. See
[Release Notes](docs/releases/4.0.0.md) for the full removal table and upgrade guide.

## Quick Start

```bash
# Install
npm install -g lsh-framework

# Interactive setup (recommended)
lsh sync --init

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

`lsh` has four commands. Each accepts `-f/--file`, `-e/--env`, and `-g/--global`.

```bash
# Setup, keys, config, and health all live under sync
lsh sync --init                # Interactive setup wizard (installs IPFS, generates a key)
lsh sync --key                 # Print the effective encryption key
lsh sync --doctor              # Health check

# Daily use
lsh push                       # Upload encrypted .env to cloud
lsh pull                       # Download .env from cloud
lsh sync                       # Two-way sync (push or pull, whichever is newer)

# Edit, read, or write local secrets
lsh edit --list                # Masked table of local keys
lsh edit --get API_KEY         # Print one value
lsh edit --set API_KEY=xxx     # Set one value

# Multi-environment
lsh push --env prod
lsh pull --env staging
```

Full flag reference: `lsh push --help`, `lsh pull --help`, `lsh sync --help`, `lsh edit --help`, or
[docs/releases/4.0.0.md](docs/releases/4.0.0.md).

## How It Works

```
Machine A (push)                Local Kubo (IPFS) node          IPFS DHT / swarm
┌─────────────┐   AES-256       ┌─────────────────────┐         ┌──────────────────┐
│   .env      │ ───encrypt───►  │ ipfs add (pin local)│ ──────► │ IPNS record:     │
│  (secrets)  │                 │  → CID              │ publish │  name → CID      │
└─────────────┘                 └─────────────────────┘         │ (key-derived)    │
                                                                 └──────────────────┘
                                                                          │ resolve
Machine B (pull)                                                          ▼
┌─────────────┐   AES-256       ┌─────────────────────┐  fetch   ┌──────────────────┐
│   .env      │ ◄──decrypt────  │ ipfs cat <CID>      │ ◄─────── │ a node holding   │
│  (secrets)  │                 └─────────────────────┘  swarm   │ the block (A or  │
└─────────────┘                                                  │ a pinning svc)   │
                                                                 └──────────────────┘
```

1. Your `.env` is encrypted locally with AES-256 (the key never leaves the machine).
2. The ciphertext is added to your **local Kubo (IPFS) daemon** and pinned there, producing a content ID (CID).
3. The CID is published to **IPNS** under a name derived deterministically from `LSH_SECRETS_KEY` + repo + environment (`HMAC-SHA256`), so teammates need only the shared key.
4. Another machine derives the same IPNS name, resolves it to the latest CID over the network, and fetches the ciphertext over the IPFS swarm.
5. Decryption happens locally with the shared key.

**What this means:** the encrypted block is only guaranteed to exist where it was pushed. Cross-machine pull works while a node holding the block is online (the publisher, a peer that cached it, or — recommended — a [remote pinning service](#durable-sync-remote-pinning)).

## Durable sync (remote pinning)

Out of the box, `lsh sync` is zero-config but **not durable**: the encrypted content lives only on the machine that pushed it. If that machine sleeps or goes offline before a teammate pulls — and no peer has cached the block — the pull will stall.

To make secrets available "anytime, anywhere", point `lsh` at any IPFS **remote pinning service** (Pinata, Filebase, 4EVERLAND, web3.storage, an IPFS Cluster, etc.). `lsh` uses your local Kubo daemon's remote-pinning support — no extra dependency, and your encryption key never leaves your machine (the service only ever stores ciphertext).

```bash
# 1. Register a pinning service with your local Kubo daemon (one-time)
ipfs pin remote service add pinata https://api.pinata.cloud/psa <YOUR_JWT>

# 2. Tell lsh which service to use (only needed if more than one is configured)
export LSH_SECRETS_KEY=<your-key>
export LSH_PIN_SERVICE=pinata

# 3. Push — content is now pinned remotely and survives this machine going offline
lsh push --env dev
```

If exactly one remote service is configured, `lsh` uses it automatically and `LSH_PIN_SERVICE` is optional.

### Quickest: bundled pinner (just a token)

Skip the manual `ipfs pin remote service add`. Set **`LSH_PIN_TOKEN`** and `lsh` auto-registers a
remote pinning service for you on first push — defaulting to **4EVERLAND** (free 5GB, standard
Pinning Service API):

```bash
# Get a free accessToken from the 4EVERLAND "4EVER Pin" page (https://4everland.org)
export LSH_PIN_TOKEN=<your-4everland-accessToken>
lsh push --env dev        # auto-registers "lsh-pin" → https://api.4everland.dev, then pins
```

Use a different provider by overriding the endpoint: `export LSH_PIN_ENDPOINT=<psa-endpoint>`.
(Note: Pinata's pin-by-CID PSA is paid-only; 4EVERLAND and Filebase offer it free.)

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
# Interactive setup (handles everything, including key generation)
lsh sync --init

# Or manual setup — already have a key from a teammate:
lsh sync --key=<shared-key>    # Import and persist it
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

# 2. Install + start a local IPFS (Kubo) daemon (one-time)
lsh sync --init

# 3. Add your encryption key (shared with your other machines / team)
echo "LSH_SECRETS_KEY=your-shared-key" > .env

# 4. Pull secrets (resolves the latest version via IPNS)
lsh pull
```

> Requires a local IPFS (Kubo) daemon — `lsh sync --init` installs and starts one. The pushing machine must be online (or a pinning service configured) for others to fetch the content.

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
lsh sync --init             # Generate team key (interactive)
lsh push --env prod         # Push team secrets
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

Schedule rotation with any external scheduler (system `cron`, a CI job, etc.) that
runs your rotation script and then pushes the updated secrets:

```bash
# Example: monthly rotation via crontab — `crontab -e`
0 0 1 * * cd /path/to/project && ./scripts/rotate.sh && lsh push
```

Or as a scheduled CI job (GitHub Actions, etc.) that runs the script and `lsh push`.
LSH focuses on encrypting and syncing the `.env`; the rotation policy/schedule is yours.

## Export Formats

Export secrets in multiple formats:

```bash
lsh edit --get --all --format json    # JSON
lsh edit --get --all --format yaml    # YAML
lsh edit --get --all --format toml    # TOML
lsh edit --get --all --format export  # Shell export statements

# Load into current shell
eval "$(lsh sync --load)"
```

## Security

- **AES-256** encryption for all secrets (the key never leaves your machine)
- **Content-addressed storage** - tamper-proof IPFS CIDs
- **Zero-knowledge** - the IPFS network (and any pinning service) only ever sees ciphertext
- **Local-first** - works offline with cached secrets

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
# Check what's in your local .env
lsh edit --get --all --format env

# Push if missing
lsh push --env dev
```

### "Decryption failed"

Wrong encryption key. Make sure `LSH_SECRETS_KEY` matches.

```bash
# Check current key
cat .env | grep LSH_SECRETS_KEY

# If lost, generate new key and re-push
lsh sync --init
lsh push --force
```

### Pull hangs or "Could not resolve secrets from network"

The IPNS name resolved but no online node is serving the content (or the IPNS record expired). Either:

```bash
# On the machine that pushed: make sure its daemon is running, then re-push
lsh sync --status
lsh push --env dev

# Better: configure a remote pinning service so content stays available
# even when the pushing machine is offline (see "Durable sync" below)
```

### "IPFS daemon not running"

```bash
lsh sync --init     # install + start a local Kubo daemon
lsh sync --status   # verify it is up
```

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

## Configuration

### Environment Variables

```bash
# Required
LSH_SECRETS_KEY=<your-encryption-key>

# Optional - name of a kubo remote pinning service for durable sync
# (configure once with: ipfs pin remote service add <name> <endpoint> <key>)
LSH_PIN_SERVICE=<service-name>

# Optional - pointer discovery backends, comma-separated in priority order.
# Default 'w3name,ipns': durable w3name (signed IPNS via name.web3.storage, no
# account, no DHT TTL) with IPNS-over-DHT fallback. Set 'ipns' for DHT-only.
LSH_DISCOVERY=w3name,ipns

# Optional - bundled pinner: with a token set, lsh auto-registers a remote pin
# service so pushed content is durable. Endpoint defaults to 4EVERLAND (free 5GB).
LSH_PIN_TOKEN=<psa-access-token>
LSH_PIN_ENDPOINT=https://api.4everland.dev   # override for another PSA provider
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
lsh sync --init
```
