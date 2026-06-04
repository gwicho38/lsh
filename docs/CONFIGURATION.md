# LSH Configuration Guide

LSH uses a centralized configuration file located at `~/.config/lsh/lshrc` to manage settings.

## Quick Start

```bash
# Edit configuration
lsh config

# Or use specific commands
lsh config set LSH_SECRETS_KEY <your-key>
lsh config get LSH_SECRETS_KEY
lsh config list
```

## Configuration File Location

**Default:** `~/.config/lsh/lshrc`

This file is in `.env` format and is automatically loaded when LSH starts.

## File Format

The configuration file uses standard `.env` format:

```bash
# Comments start with #
KEY=value
ANOTHER_KEY="value with spaces"
```

## Available Configuration Options

LSH is an encrypted secrets manager. It encrypts your `.env` with AES-256, stores
the ciphertext on **IPFS** (addressed by CID), and publishes the `key→CID` pointer
so a teammate with the same key can pull it back — no account, no central server.

### Secrets (required)

```bash
# AES-256 encryption key — generate with: lsh key
LSH_SECRETS_KEY=<64-char-hex>
```

`LSH_SECRETS_KEY` is the only required value. Everyone who needs to pull your
secrets must share this same key; the IPNS/w3name pointer is derived from it.

### Discovery (optional)

The `key→CID` pointer is published and resolved through pluggable discovery
backends (see [ARCHITECTURE.md](ARCHITECTURE.md)).

```bash
# Pointer discovery backends, in priority order.
# Default: durable w3name (name.web3.storage) + DHT-IPNS fallback.
LSH_DISCOVERY=w3name,ipns
```

### Durability / Pinning (optional)

Discovery durability (can you *find* the CID) is separate from byte durability
(does the content still *exist*). For the bytes to survive after your local Kubo
node goes offline, pin them to a remote pinning service.

```bash
# Auto-register a remote pinning service on first push (recommended).
# Endpoint defaults to 4EVERLAND's free 5 GB tier.
LSH_PIN_TOKEN=<psa-token>
LSH_PIN_ENDPOINT=https://api.4everland.dev   # optional override

# Or point at a pin service you already configured in Kubo:
LSH_PIN_SERVICE=<service-name>
```

> **Note:** Pinata's pin-by-CID PSA requires a paid plan; 4EVERLAND and Filebase
> offer it on their free tiers.

### Advanced (optional)

```bash
# Override the LSH data/cache directory (default: ~/.lsh)
LSH_DATA_DIR=/custom/path/to/data

# Logging
LSH_LOG_LEVEL=info        # debug | info | warn | error
LSH_LOG_FORMAT=text       # text | json
```

## Command Reference

### `lsh config`

Open the configuration file in `$EDITOR` (defaults to `$VISUAL`, then `$EDITOR`, then `vi`).

```bash
lsh config
```

### `lsh config init`

Initialize the configuration file with a default template.

```bash
lsh config init

# Overwrite existing config
lsh config init --force
```

### `lsh config path`

Show the configuration file path.

```bash
lsh config path
# Output: /Users/username/.config/lsh/lshrc
```

### `lsh config get <key>`

Get a specific configuration value.

```bash
lsh config get LSH_SECRETS_KEY
```

### `lsh config set <key> <value>`

Set a specific configuration value.

```bash
lsh config set LSH_SECRETS_KEY <your-key>
# Output: ✓ Set LSH_SECRETS_KEY=<redacted>
```

### `lsh config delete <key>`

Delete a specific configuration value.

```bash
lsh config delete LSH_PIN_TOKEN
# Output: ✓ Deleted LSH_PIN_TOKEN
```

Alias: `lsh config rm <key>`

### `lsh config list`

List all configuration values.

```bash
lsh config list

# Show secret values (default: masked)
lsh config list --show-secrets
```

Alias: `lsh config ls`

### `lsh config show`

Show raw configuration file contents.

```bash
lsh config show
```

### `lsh config reload`

Reload configuration into the current environment.

```bash
lsh config reload
# Output: ✓ Reloaded N config values into environment
```

## Configuration Priority

LSH loads configuration in this order (later sources override earlier ones):

1. **Built-in defaults** (hardcoded in LSH)
2. **`~/.config/lsh/lshrc`** (configuration file) ← **Recommended for LSH config**
3. **Environment variables** (current shell) ← **Highest priority**
4. **`.env` file** (project-specific — application secrets only)

This means:
- `lshrc` provides persistent defaults for LSH configuration.
- Environment variables override `lshrc` (useful for temporary overrides).
- `.env` holds the application secrets managed by `lsh push/pull`, **not** LSH configuration.

### Example: temporary override

```bash
# Use a different discovery backend for one command
LSH_DISCOVERY=ipns lsh pull --env dev
```

## Best Practices

### 1. Separate LSH config from application secrets

**Good:**
- LSH configuration → `~/.config/lsh/lshrc`
- Application secrets → `.env` (managed by `lsh push/pull`)

**Bad:**
- Mixing LSH config with app secrets in `.env`

### 2. Use the config file for persistent settings

```bash
# Set once, use everywhere
lsh config set LSH_SECRETS_KEY <your-key>
lsh config set LSH_PIN_TOKEN <psa-token>
```

### 3. Keep your key safe

```bash
# Never commit lshrc to git
echo "~/.config/lsh/lshrc" >> ~/.gitignore_global

# Set proper permissions
chmod 600 ~/.config/lsh/lshrc
```

### 4. Team collaboration

The encryption key is the only thing teammates must share — distribute it through
a password manager, never in plain text. Each member sets it in their own `lshrc`:

```bash
lsh config set LSH_SECRETS_KEY <team-encryption-key>
lsh pull --env production
```

## Troubleshooting

### Config file not found

```bash
lsh config init
```

### Changes not taking effect

```bash
lsh config reload
```

### Permission denied

```bash
chmod 600 ~/.config/lsh/lshrc
chown $USER ~/.config/lsh/lshrc
```

### Can't find `$EDITOR`

```bash
export EDITOR=nano   # or vim, emacs, code, etc.
# Or edit directly
nano ~/.config/lsh/lshrc
```

### Secrets still masked

```bash
lsh config list --show-secrets
```

## Examples

### Minimal local setup

```bash
# Install LSH
npm install -g lsh-framework

# Generate encryption key
lsh key

# Set it in config
lsh config set LSH_SECRETS_KEY <generated-key>

# Start using LSH
lsh push --env dev
```

### Durable setup (survives node going offline)

```bash
lsh config set LSH_SECRETS_KEY <generated-key>
lsh config set LSH_PIN_TOKEN <4everland-psa-token>

# Pointer (w3name) and bytes (pin service) both persist
lsh push --env prod
```

## Related Documentation

- [Quick Start Guide](QUICK_START.md)
- [Secrets Management](features/secrets/SECRETS_GUIDE.md)
- [Architecture](ARCHITECTURE.md)
