# LSH Secrets Manager 🔐

Never copy .env files again! Sync your secrets across all development environments using encrypted Supabase storage.

> **🆕 New in v0.8.2+:** [Smart Sync](./SMART_SYNC_GUIDE.md) is now available! It automatically handles setup, encryption keys, and synchronization with one command. This guide covers the traditional manual approach, which still works great if you need more control.

## Quick Start

### 1. Generate an Encryption Key

```bash
lsh secrets key
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

### 3. Push Secrets to Cloud

```bash
# Push your dev environment secrets
lsh secrets push

# Or specify environment
lsh secrets push --env staging
lsh secrets push --env prod
```

This encrypts and uploads your .env to Supabase.

### 4. Pull Secrets on Another Machine

On your other dev machines (laptop, desktop, server):

```bash
# First, make sure LSH is installed and Supabase is configured
# Then add the LSH_SECRETS_KEY to a minimal .env:
echo "LSH_SECRETS_KEY=your_key_here" > .env

# Pull your secrets
lsh secrets pull

# Boom! Your .env is now synced
```

## Usage

### Push Secrets
```bash
# Push current .env (defaults to 'dev' environment)
lsh secrets push

# Push specific environment
lsh secrets push --env prod

# Push different file
lsh secrets push --file .env.staging --env staging
```

### Pull Secrets
```bash
# Pull dev secrets
lsh secrets pull

# Pull prod secrets
lsh secrets pull --env prod

# Pull to specific file
lsh secrets pull --file .env.prod --env prod
```

### List Environments
```bash
lsh secrets list

# Output:
# 📦 Available environments:
#   • dev
#   • staging
#   • prod
```

### Show Secrets (Masked)
```bash
lsh secrets show

# Output:
# 📦 Secrets for dev (15 total):
#   SUPABASE_URL=http****
#   SUPABASE_ANON_KEY=eyJh****
#   DATABASE_URL=post****
#   ...
```

## How It Works

1. **Encryption**: Your .env is encrypted using AES-256-CBC with your `LSH_SECRETS_KEY`
2. **Storage**: Encrypted data is stored in your Supabase database
3. **Sync**: Pull from any machine that has the encryption key
4. **Security**: Only you (and your team with the key) can decrypt

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
lsh secrets push --env dev

# Staging (different values)
lsh secrets push --file .env.staging --env staging

# Production (super secret)
lsh secrets push --file .env.production --env prod

# Pull whatever you need
lsh secrets pull --env dev      # for local dev
lsh secrets pull --env staging  # for testing
lsh secrets pull --env prod     # for production debugging
```

## Team Collaboration

**Setup (One Time):**
1. Project lead generates key: `lsh secrets key`
2. Lead pushes team secrets: `lsh secrets push`
3. Lead shares `LSH_SECRETS_KEY` via 1Password shared vault

**Team Members:**
```bash
# 1. Get the key from 1Password
# 2. Add to .env
echo "LSH_SECRETS_KEY=<shared_key>" > .env

# 3. Pull secrets
lsh secrets pull

# 4. Start coding!
npm start
```

## Comparison with Other Tools

| Feature | LSH Secrets | dotenv-vault | 1Password | Doppler |
|---------|-------------|--------------|-----------|---------|
| Cost | Free | Free tier | $3-8/mo | Free tier |
| Cloud Storage | Supabase | Their cloud | 1Password | Their cloud |
| Encryption | AES-256 | ✓ | ✓ | ✓ |
| Team Sharing | Manual key | Built-in | Built-in | Built-in |
| Self-Hosted | ✓ (Supabase) | ✗ | ✗ | ✗ |
| Integration | LSH native | dotenv | CLI | CLI |
| Setup Time | 2 min | 5 min | 10 min | 10 min |

## Troubleshooting

### "No secrets found"
```bash
# Make sure you pushed first
lsh secrets push

# Check what's stored
lsh secrets list
```

### "Decryption failed"
```bash
# Wrong key! Make sure LSH_SECRETS_KEY matches
# the key used to encrypt

# Generate new key and re-push
lsh secrets key
lsh secrets push
```

### "Supabase not configured"
```bash
# Add to your .env:
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
```

## Advanced: Custom Encryption Key

By default, LSH generates a key from your machine + username. For better security:

```bash
# Generate a strong key
lsh secrets key

# Add to .env
LSH_SECRETS_KEY=<your_key>

# Now push/pull will use this key
lsh secrets push
```

## Pro Tips

1. **Git Ignore**: Make sure `.env*` is in your `.gitignore`
2. **Backup**: Keep encrypted backups: `lsh secrets show > secrets-backup.txt`
3. **Audit**: List environments regularly to see what's stored
4. **Clean**: Delete old environments from Supabase manually if needed
5. **Keys**: Use different keys for personal vs team projects

## Example Workflow

```bash
# Monday morning on laptop
cd ~/project
lsh secrets pull
npm start

# Tuesday on desktop
cd ~/project
lsh secrets pull  # Gets latest from laptop!
npm start

# Friday deploy to prod
lsh secrets pull --env prod
./deploy.sh
```

No more "wait, what was that env var again?" 🎉

## Next Steps

- Consider using this with `lsh daemon` for auto-sync
- Integrate with your CI/CD pipeline
- Set up alerts for secret changes (coming soon)

---

Made with ❤️ by the LSH team
