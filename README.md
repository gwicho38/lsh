# LSH - Encrypted Secrets Manager with Automated Rotation

`lsh` is a powerful **encrypted secrets manager** that syncs your `.env` files across all development environments with AES-256 encryption. Built on a robust shell framework with daemon scheduling, it enables **automatic secret rotation**, team collaboration, and seamless multi-environment management.

**Never copy .env files again.** Push once, pull anywhere, rotate automatically.

## Why LSH?

Traditional secret management tools are either too complex, too expensive, or require vendor lock-in. LSH gives you:

- **Encrypted sync** across all your machines using Supabase/PostgreSQL
- **Automatic rotation** with built-in daemon scheduling
- **Team collaboration** with shared encryption keys
- **Multi-environment** support (dev/staging/prod)
- **Self-hosted** - your data, your infrastructure
- **Free & Open Source** - no per-seat pricing

**Plus, you get a complete shell automation platform as a bonus.**

## Quick Start (30 seconds)

```bash
# 1. Install
npm install -g gwicho38-lsh

# 2. Generate encryption key
lsh lib secrets key
# Add the output to your .env:
# LSH_SECRETS_KEY=<your-key>

# 3. Configure Supabase (free tier works!)
# Add to .env:
# SUPABASE_URL=https://your-project.supabase.co
# SUPABASE_ANON_KEY=<your-anon-key>

# 4. Push your secrets
lsh lib secrets push

# 5. Pull on any other machine
lsh lib secrets pull

# Done! Your secrets are synced.
```

## Core Features

### 🔐 Secrets Management

- **AES-256 Encryption** - Military-grade encryption for all secrets
- **Multi-Environment** - Separate configs for dev, staging, and production
- **Team Sync** - Share encryption keys securely with your team
- **Masked Viewing** - View secrets safely without exposing full values
- **Automatic Backup** - Never lose your `.env` files
- **Version Control** - Track changes to your secrets over time

### 🔄 Automatic Rotation (Unique Feature!)

Use the built-in daemon to automatically rotate secrets on a schedule:

```bash
# Schedule API key rotation every 30 days
lsh lib cron add \
  --name "rotate-api-keys" \
  --schedule "0 0 1 * *" \
  --command "./scripts/rotate-keys.sh && lsh lib secrets push"

# Or use interval-based scheduling
lsh lib cron add \
  --name "sync-secrets" \
  --interval 3600 \
  --command "lsh lib secrets pull && ./scripts/reload-app.sh"
```

**No other secrets manager has this built-in!** Most require complex integrations with cron or external tools.

### 👥 Team Collaboration

**Setup (One Time):**
```bash
# Project lead:
lsh lib secrets key                    # Generate shared key
lsh lib secrets push --env prod        # Push team secrets
# Share LSH_SECRETS_KEY via 1Password
```

**Team members:**
```bash
# 1. Get key from 1Password
# 2. Add to .env
echo "LSH_SECRETS_KEY=<shared-key>" > .env

# 3. Pull secrets
lsh lib secrets pull --env prod

# 4. Start coding!
npm start
```

### 🌍 Multi-Environment Workflow

```bash
# Development
lsh lib secrets push --env dev

# Staging (different values)
lsh lib secrets push --file .env.staging --env staging

# Production (super secret)
lsh lib secrets push --file .env.production --env prod

# Pull whatever you need
lsh lib secrets pull --env dev      # for local dev
lsh lib secrets pull --env staging  # for testing
lsh lib secrets pull --env prod     # for production debugging
```

## Secrets Commands

| Command | Description |
|---------|-------------|
| `lsh lib secrets push` | Upload .env to encrypted cloud storage |
| `lsh lib secrets pull` | Download .env from cloud storage |
| `lsh lib secrets list` | List all stored environments |
| `lsh lib secrets show` | View secrets (masked) |
| `lsh lib secrets key` | Generate encryption key |
| `lsh lib secrets create` | Create new .env file |
| `lsh lib secrets delete` | Delete .env file (with confirmation) |

See the complete guide: [SECRETS_GUIDE.md](docs/features/secrets/SECRETS_GUIDE.md)

## Installation

### Prerequisites
- Node.js 20.18.0 or higher
- npm 10.0.0 or higher
- Supabase account (free tier works) OR PostgreSQL database

### Install from npm

```bash
npm install -g gwicho38-lsh
```

### Verify installation

```bash
lsh --version
lsh self version
```

### Initial Setup

```bash
# 1. Generate encryption key
lsh lib secrets key

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
lsh lib secrets push --env dev
```

## Advanced Features (Bonus!)

Because LSH is built on a complete shell framework, you also get powerful automation capabilities:

### Persistent Daemon

Run jobs reliably in the background:

```bash
# Start daemon
lsh lib daemon start

# Check status
lsh lib daemon status

# Stop daemon
lsh lib daemon stop
```

### Cron-Style Scheduling

Schedule any task with cron expressions:

```bash
# Daily backup at midnight
lsh lib cron add --name "backup" \
  --schedule "0 0 * * *" \
  --command "./backup.sh"

# Every 6 hours
lsh lib cron add --name "sync" \
  --schedule "0 */6 * * *" \
  --command "lsh lib secrets pull && ./reload.sh"

# List all jobs
lsh lib cron list

# Trigger manually
lsh lib cron trigger backup
```

### RESTful API

Control everything via HTTP API:

```bash
# Start API server
LSH_API_KEY=your-key lsh lib api start --port 3030

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

### Encryption

- **Algorithm**: AES-256-CBC
- **Key Management**: User-controlled encryption keys
- **Storage**: Encrypted at rest in Supabase/PostgreSQL
- **Transport**: HTTPS for all API calls

### Best Practices

**✅ DO:**
- Generate unique keys per project
- Share keys via 1Password/LastPass
- Use different keys for personal vs team projects
- Rotate keys periodically
- Keep backups of your .env files

**❌ DON'T:**
- Commit `LSH_SECRETS_KEY` to git
- Share keys in plain text (Slack, email, etc.)
- Reuse keys across projects
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
lsh lib secrets push --env dev

# Desktop
lsh lib secrets pull --env dev

# Cloud server
lsh lib secrets pull --env dev

# All synced!
```

### 2. Team Onboarding

**Problem:** New team member needs to set up 5 microservices with different env vars.

**Solution:**
```bash
# New team member (after getting LSH_SECRETS_KEY from 1Password)
cd ~/projects/service-1 && lsh lib secrets pull --env dev
cd ~/projects/service-2 && lsh lib secrets pull --env dev
cd ~/projects/service-3 && lsh lib secrets pull --env dev
cd ~/projects/service-4 && lsh lib secrets pull --env dev
cd ~/projects/service-5 && lsh lib secrets pull --env dev

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
lsh lib secrets push --env prod

# Notify team
echo "API keys rotated at $(date)" | mail -s "Key Rotation" team@company.com
EOF

# Schedule it
lsh lib cron add --name "rotate-keys" \
  --schedule "0 0 1 * *" \
  --command "./rotate-keys.sh"
```

### 4. Multi-Environment Deployment

**Problem:** Managing different configs for dev, staging, and production.

**Solution:**
```bash
# Push from local dev
lsh lib secrets push --file .env.development --env dev

# Push staging config
lsh lib secrets push --file .env.staging --env staging

# Push production config (from secure machine only)
lsh lib secrets push --file .env.production --env prod

# CI/CD pulls the right one
# In .github/workflows/deploy.yml:
- name: Get secrets
  run: lsh lib secrets pull --env ${{ github.ref == 'refs/heads/main' && 'prod' || 'staging' }}
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
lsh lib secrets key

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
lsh lib secrets list

# Push if missing
lsh lib secrets push --env dev
```

### "Decryption failed"

```bash
# Wrong encryption key!
# Make sure LSH_SECRETS_KEY matches the one used to encrypt

# Generate new key and re-push
lsh lib secrets key
lsh lib secrets push
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
lsh lib daemon start
```

## Documentation

- **[SECRETS_GUIDE.md](docs/features/secrets/SECRETS_GUIDE.md)** - Complete secrets management guide
- **[SECRETS_QUICK_REFERENCE.md](docs/features/secrets/SECRETS_QUICK_REFERENCE.md)** - Quick reference for daily use
- **[SECRETS_CHEATSHEET.txt](SECRETS_CHEATSHEET.txt)** - Command cheatsheet
- **[INSTALL.md](docs/deployment/INSTALL.md)** - Detailed installation instructions
- **[CLAUDE.md](CLAUDE.md)** - Developer guide for contributors

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

- [ ] CLI command shortcuts (`lsh push` instead of `lsh lib secrets push`)
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
