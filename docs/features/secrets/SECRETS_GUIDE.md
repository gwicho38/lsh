# LSH Secrets Manager 🔐

Never copy .env files again! Sync your secrets across all development environments using encrypted IPFS content-addressed storage.

> **🆕 New in v0.8.2+:** [Smart Sync](./SMART_SYNC_GUIDE.md) is now available! It automatically handles setup, encryption keys, and synchronization with one command. This guide covers the traditional manual approach, which still works great if you need more control.

## Quick Start

### 1. Generate an Encryption Key

```bash
lsh key
```

This generates a key like:
```
LSH_SECRETS_KEY=45918bb30a8a34f7e34a171b4b3eee649cc6fc332517e42719c5dbad7de22bb8
```

**Add this to your .env file** (and share it securely with your team via 1Password, LastPass, etc.)

### 2. Fill Out Your .env File

You already have `.env` created from the template. Now fill it with your actual values:

```bash
# Edit your .env with your real credentials
nano .env

# Or use your preferred editor
code .env
```

### 3. Push Secrets to Local IPFS Storage

```bash
# Push your dev environment secrets
lsh push

# Or specify environment
lsh push --env staging
lsh push --env prod
```

This encrypts and stores your .env locally using IPFS content-addressed storage at `~/.lsh/secrets-cache/`.

### 4. Pull Secrets on Another Machine

On your other dev machines (laptop, desktop, server):

```bash
# First, make sure LSH is installed
# Then add the LSH_SECRETS_KEY to a minimal .env:
echo "LSH_SECRETS_KEY=your_key_here" > .env

# Pull your secrets from IPFS storage
lsh pull

# Boom! Your .env is now synced from encrypted local storage
```

## Usage

### Push Secrets
```bash
# Push current .env (defaults to 'dev' environment)
lsh push

# Push specific environment
lsh push --env prod

# Push different file
lsh push --file .env.staging --env staging
```

### Pull Secrets
```bash
# Pull dev secrets
lsh pull

# Pull prod secrets
lsh pull --env prod

# Pull to specific file
lsh pull --file .env.prod --env prod
```

### List Environments
```bash
lsh list

# Output:
# 📦 Available environments:
#   • dev
#   • staging
#   • prod
```

### Show Secrets (Masked)
```bash
lsh show

# Output:
# 📦 Secrets for dev (15 total):
#   SUPABASE_URL=http****
#   SUPABASE_ANON_KEY=eyJh****
#   DATABASE_URL=post****
#   ...
```

## How It Works

1. **Encryption**: Your .env is encrypted using AES-256-CBC with your `LSH_SECRETS_KEY`
2. **Storage**: Encrypted data is stored locally using IPFS content-addressed storage at `~/.lsh/secrets-cache/`
3. **Sync**: Copy the `~/.lsh/` directory (or share via network drive) to sync across machines
4. **Security**: Only you (and your team with the key) can decrypt
5. **Offline-first**: Works completely offline, no cloud dependencies

## Security Best Practices

### ✅ DO:
- Generate a unique key per project
- Share keys via 1Password/LastPass/secure channel
- Use different keys for personal vs team projects
- Rotate keys periodically
- Keep backups of your .env files

### ❌ DON'T:
- Commit `LSH_SECRETS_KEY` to git
- Share keys in plain text (Slack, email, etc.)
- Reuse keys across projects
- Store production secrets in dev environment

## Multiple Environments Workflow

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

## Team Collaboration

**Setup (One Time):**
1. Project lead generates key: `lsh key`
2. Lead pushes team secrets: `lsh push`
3. Lead shares `LSH_SECRETS_KEY` via 1Password shared vault

**Team Members:**
```bash
# 1. Get the key from 1Password
# 2. Add to .env
echo "LSH_SECRETS_KEY=<shared_key>" > .env

# 3. Pull secrets
lsh pull

# 4. Start coding!
npm start
```

## Comparison with Other Tools

| Feature | LSH Secrets | dotenv-vault | 1Password | Doppler |
|---------|-------------|--------------|-----------|---------|
| Cost | Free | Free tier | $3-8/mo | Free tier |
| Storage | Local IPFS | Their cloud | 1Password | Their cloud |
| Encryption | AES-256 | ✓ | ✓ | ✓ |
| Team Sharing | Shared key | Built-in | Built-in | Built-in |
| Offline Mode | ✓ | ✗ | ✗ | ✗ |
| Self-Hosted | ✓ (Local) | ✗ | ✗ | ✗ |
| Integration | LSH native | dotenv | CLI | CLI |
| Setup Time | 30 sec | 5 min | 10 min | 10 min |

## Troubleshooting

### "No secrets found"
```bash
# Make sure you pushed first
lsh push

# Check what's stored
lsh list
```

### "Decryption failed"
```bash
# Wrong key! Make sure LSH_SECRETS_KEY matches
# the key used to encrypt

# Generate new key and re-push
lsh key
lsh push
```

### "Secrets not in cache"

**🆕 New in v2.1.0:** Use Storacha for automatic multi-host sync!

```bash
# Option 1: Use Storacha (IPFS network) - Automatic sync (v2.1.0+)
lsh storacha login [email protected]
lsh pull  # Automatically downloads from IPFS network

# Option 2: Local storage only (legacy)
# Copy ~/.lsh/ from another machine
# Or use network drive to share the directory

# Check what's in your local cache:
ls -la ~/.lsh/secrets-cache/
cat ~/.lsh/secrets-metadata.json
```

## Multi-Host Sync with Storacha (v2.1.0+)

**🆕 True multi-host sync via IPFS network - enabled by default!**

LSH now automatically syncs secrets across all your machines using Storacha (IPFS network).

### Quick Setup

```bash
# One-time setup per machine
lsh storacha login [email protected]
# ✅ Email verification → payment plan → space created

# Check status
lsh storacha status
# 🔐 Authentication: ✅ Authenticated
# 🌐 Network Sync: ✅ Enabled
# 📦 Spaces: lsh-secrets (current)
```

### How It Works

1. **Push** (Host A):
   ```bash
   cd ~/repos/my-project
   lsh push --env dev
   # ✅ Encrypted locally with LSH_SECRETS_KEY
   # ✅ Cached in ~/.lsh/secrets-cache/
   # 📤 Uploaded to IPFS network (Storacha)
   #    CID: bafkrei...
   ```

2. **Pull** (Host B):
   ```bash
   cd ~/repos/my-project
   lsh pull --env dev
   # ✅ Checks local cache first
   # 📥 Downloads from IPFS network if cache miss
   # ✅ Decrypts with LSH_SECRETS_KEY
   # ✅ Writes to .env
   ```

### Features

- **Default enabled**: Works automatically after one-time authentication
- **Encrypted before upload**: AES-256 encryption (secrets never leave your machine unencrypted)
- **Content-addressed**: IPFS CIDs ensure tamper-proof integrity
- **Graceful fallback**: Uses local cache if network unavailable
- **Free tier**: 5GB storage on Storacha

### Commands

```bash
# Authentication
lsh storacha login [email protected]
lsh storacha status

# Space management
lsh storacha space create my-project-secrets
lsh storacha space list

# Control sync
lsh storacha enable   # Enable network sync (default)
lsh storacha disable  # Local cache only
```

### Disable Network Sync

```bash
# Option 1: Via CLI
lsh storacha disable

# Option 2: Via environment variable
export LSH_STORACHA_ENABLED=false

# Verify
lsh storacha status
# 🌐 Network Sync: ❌ No
```

### Comparison: Storacha vs Supabase

| Feature | Storacha | Supabase |
|---------|----------|----------|
| **Setup** | One-time email auth | Manual DB + credentials |
| **Cost** | Free (5GB) → paid | Free → paid |
| **Network** | IPFS (decentralized) | PostgreSQL (centralized) |
| **Use Case** | Simple multi-host sync | Team collaboration + audit |

**Recommendation**:
- **Storacha**: Best for 2-5 machines, personal projects
- **Supabase**: Best for teams (10+ users), audit logs needed

## Advanced: Custom Encryption Key

By default, LSH generates a key from your machine + username. For better security:

```bash
# Generate a strong key
lsh key

# Add to .env
LSH_SECRETS_KEY=<your_key>

# Now push/pull will use this key
lsh push
```

## Pro Tips

1. **Git Ignore**: Make sure `.env*` is in your `.gitignore`
2. **Multi-Host Sync (v2.1.0+)**: Use `lsh storacha login` for automatic IPFS network sync across all machines
3. **Backup**: Keep encrypted backups of `~/.lsh/` directory or use `lsh show > secrets-backup.txt`
4. **Audit**: List environments regularly to see what's stored locally
5. **Clean**: Delete old environments with `lsh delete --env <env-name>` if needed
6. **Keys**: Use different keys for personal vs team projects
7. **Status**: Check Storacha sync status with `lsh storacha status`
8. **Offline Mode**: Disable network sync with `lsh storacha disable` if you prefer local cache only

## Example Workflow

```bash
# Monday morning on laptop
cd ~/project
lsh pull
npm start

# Tuesday on desktop
cd ~/project
lsh pull  # Gets latest from laptop!
npm start

# Friday deploy to prod
lsh pull --env prod
./deploy.sh
```

No more "wait, what was that env var again?" 🎉

## Next Steps

- Consider using this with `lsh daemon` for auto-sync
- Integrate with your CI/CD pipeline
- Set up alerts for secret changes (coming soon)

---

Made with ❤️ by the LSH team
