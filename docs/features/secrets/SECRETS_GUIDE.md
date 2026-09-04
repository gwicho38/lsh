# LSH Secrets Manager

Sync your `.env` files across all development machines with AES-256 encryption via the IPFS network.

> **v4.0.0:** the CLI surface is seven commands plus `help`: `push`, `pull`, `sync`, `edit`, `list`, `get`, `set`. See
> [docs/releases/4.0.0.md](../../releases/4.0.0.md) for the full v3→v4 command mapping.

## Quick Start

```bash
# Install
npm install -g lsh-framework

# Interactive setup (recommended)
lsh sync --init

# Or manual setup — already have a key from a teammate
lsh sync --key=<shared-key>
lsh push                     # Push to cloud
```

## Commands Reference

| Command | Description |
|---------|-------------|
| `lsh sync --init` | Interactive setup wizard |
| `lsh push` | Upload encrypted .env to cloud |
| `lsh pull` | Download .env from cloud |
| `lsh sync` | Smart sync (auto push/pull) |
| `lsh list` | List secrets in local .env (masked) |
| `lsh get --all --format env` | List secrets in local .env (unmasked) |
| `lsh sync --key` | Print the effective encryption key |
| `lsh get <key>` | Get a specific secret |
| `lsh set <key> <value>` | Set a specific secret (local only) |
| `lsh sync --status` | Show current context and sync state |
| `lsh sync --repair` | Clear local sync history and metadata |

Every other v3 top-level command (`init`, `key`, `env`, `info`, `status`, `clear`, `doctor`,
`config`, `sync-history`, `ipfs`, `self`, `context`, `completion`, `create`, `delete`, `cp`,
`load`) is gone — running it prints its exact v4 replacement.

## Setup Options

### Option 1: Interactive Setup (Recommended)

```bash
lsh sync --init
```

This wizard will:
1. Install and start a local Kubo (IPFS) daemon for sync
2. Generate or import an encryption key
3. Pull existing secrets if found

### Option 2: Manual Setup

There's no standalone "generate a key" command outside the wizard — generate one yourself and
set it directly:

```bash
# 1. Generate an encryption key
openssl rand -hex 32
# Output: abc123...

# 2. Add to your .env
echo "LSH_SECRETS_KEY=abc123..." >> .env

# 3. Push your secrets
lsh push
```

Importing a key a teammate already generated uses `sync --key` instead:

```bash
lsh sync --key=abc123...
lsh push
```

## Push and Pull

### Push Secrets

```bash
# Push current .env (default environment: dev)
lsh push

# Push specific environment
lsh push --env prod
lsh push --env staging

# Push different file
lsh push --file .env.staging --env staging

# Force push (skip safety checks)
lsh push --force
```

### Pull Secrets

```bash
# Pull dev secrets
lsh pull

# Pull specific environment
lsh pull --env prod

# Pull to specific file
lsh pull --file .env.prod --env prod

# Force overwrite (skip backup)
lsh pull --force
```

### IPNS Recovery

Pull can recover even when local metadata is missing. The IPNS name is derived
deterministically from your `LSH_SECRETS_KEY`, repo, and environment, so pull
re-resolves the latest CID over the network:

```bash
# Even after clearing metadata, pull re-resolves via IPNS
lsh sync --repair
lsh pull  # Re-derives the IPNS name and resolves the latest CID
```

## Multi-Environment Workflow

```bash
# Development
lsh push --env dev

# Staging
lsh push --file .env.staging --env staging

# Production
lsh push --file .env.prod --env prod

# Pull any environment
lsh pull --env staging
```

### Repository Isolation

LSH automatically namespaces secrets by git repository:

```bash
cd ~/repos/app1
lsh push  # Stored as: app1_dev

cd ~/repos/app2
lsh push  # Stored as: app2_dev (separate!)

# Check current context
lsh sync --status
```

## Managing Individual Secrets

### Get a Secret

```bash
# Get by exact name; an exact key always wins over any fuzzy candidate
lsh get API_KEY

# Fuzzy search when no key matches exactly
lsh get "stripe api"          # resolves STRIPE_API_KEY
lsh get API_KEY --exact       # refuse to fuzzy-match

# Get all secrets
lsh get --all
lsh get --all --format json
```

### Set a Secret

```bash
# Set single value — writes locally only; publish with lsh push
lsh set API_KEY my-api-key-value

# Batch upsert from stdin (tolerates an `export ` prefix)
printenv | lsh set
lsh set --stdin < .env.backup

# Merge another environment's values into this one instead
lsh edit --env prod --copy-from staging
```

## Export Formats

```bash
# Default (env format, masked table)
lsh list

# JSON / YAML / TOML / export are unmasked by default — they're meant for jq/eval/other tools,
# not for reading, so a masked value would silently be the wrong value fed downstream
lsh list --format json
lsh list --format yaml
lsh list --format toml
lsh list --format export
lsh get --all --format export
eval "$(lsh sync --load)"   # load straight into the current shell
```

## Multi-Host Sync

### First Machine (Push)

```bash
cd ~/repos/my-project
lsh push
# Secrets encrypted and uploaded to IPFS network
```

### New Machine (Pull)

```bash
# 1. Install LSH
npm install -g lsh-framework

# 2. Install and start a local Kubo (IPFS) daemon
lsh sync --init

# 3. Add encryption key
echo "LSH_SECRETS_KEY=same-key-as-first-machine" > .env

# 4. Pull
cd ~/repos/my-project
lsh pull
```

## How Sync Works

LSH syncs over IPFS using a local Kubo daemon. There is no central server and no
account to log into.

On `lsh push`:
1. Secrets are AES-256 encrypted locally (the key never leaves your machine).
2. The ciphertext is added to your local Kubo (IPFS) daemon and pinned there,
   producing a content ID (CID).
3. The CID is published to IPNS under a name derived deterministically from your
   `LSH_SECRETS_KEY` + repo + environment.

On `lsh pull` from another machine:
1. The same `LSH_SECRETS_KEY` derives the same IPNS name.
2. That name resolves over the network to the latest CID.
3. The ciphertext is fetched over the IPFS swarm and decrypted locally.

One-time setup (installs and starts the local Kubo daemon):

```bash
lsh sync --init
```

### Durability caveat

By default, content is pinned **only on the pushing machine** and served
peer-to-peer. A cross-machine `lsh pull` works only while a node holding the
block is online (the publisher, a peer that has cached it, or a remote pinning
service) and the IPNS record is still live.

For durable "anytime" sync, configure a Kubo remote pinning service so a CID
stays available even when your machine is offline:

```bash
# One-time: register a remote pinning service with Kubo
ipfs pin remote service add <name> <endpoint> <key>

# Tell LSH to pin pushes to that service
export LSH_PIN_SERVICE=<name>
```

Pinning services only ever see ciphertext. See the README section
"Durable sync (remote pinning)" for details.

## Troubleshooting

### No secrets found

```bash
# Check what's in your local .env
lsh get --all --format env

# Push if missing
lsh push

# Check current context
lsh sync --status
```

### Decryption failed

Wrong encryption key:

```bash
# Check key
cat .env | grep LSH_SECRETS_KEY

# Generate new and re-push
lsh sync --init
lsh push --force
```

### Secrets not found on another machine

The local Kubo daemon may not be running, or no online node holds the content:

```bash
# Ensure the local Kubo (IPFS) daemon is installed and running
lsh sync --init

# Check sync status
lsh sync --status
```

If the pushing machine is offline and no remote pinning service is configured,
the content may be unreachable. See the "Durability caveat" section above.

### Clear stale metadata

`--repair` clears local sync history and secrets metadata **globally** — there is no per-repo
scoping in v4:

```bash
lsh sync --repair

# Pull re-resolves the latest CID via IPNS
lsh pull
```

## Security Best Practices

**DO:**
- Store `LSH_SECRETS_KEY` in shell profile (`~/.zshrc`)
- Share keys via password manager (1Password, LastPass)
- Use different keys per project
- Rotate keys periodically

**DON'T:**
- Commit `LSH_SECRETS_KEY` to git
- Share keys in plain text
- Store production secrets in dev environment

## Smart Sync

One command that does everything:

```bash
cd ~/repos/my-project
lsh sync
```

What it does:
1. Detects git repo (namespaces by project)
2. Generates key if missing
3. Creates .env from template
4. Updates .gitignore
5. Pushes or pulls based on what's newer

### Load and Sync

```bash
# Sync AND load into current shell
eval "$(lsh sync --load)"

# Your secrets are now environment variables
echo $DATABASE_URL
```

## API Usage

```typescript
import SecretsManager from 'lsh-framework/dist/lib/secrets-manager.js';

const manager = new SecretsManager();

// Push secrets
await manager.push('.env', 'production');

// Pull secrets
await manager.pull('.env', 'production');

// List environments
const envs = await manager.listEnvironments();
```

## Related Documentation

- [Smart Sync Guide](./SMART_SYNC_GUIDE.md) - Detailed smart sync documentation
- [Quick Reference](./SECRETS_QUICK_REFERENCE.md) - Daily use cheatsheet
- [Main README](../../../README.md) - Project overview
