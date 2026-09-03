# LSH Configuration Guide

LSH uses a centralized configuration file located at `~/.config/lsh/lshrc` to manage settings.

## Quick Start

```bash
# View the resolved configuration (read-only, masked)
lsh sync --config

# Edit the config file directly — it's a plain .env-format file
lsh edit --file ~/.config/lsh/lshrc --set LSH_SECRETS_KEY=<your-key>
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
# AES-256 encryption key — generate with: lsh sync --init
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

### `lsh sync --config`

Print the resolved configuration and its source path. Read-only, and values are masked.

```bash
lsh sync --config
lsh sync --config --format json
```

There is no dedicated `config get/set/delete/list` subcommand group in v4 — `~/.config/lsh/lshrc`
is a plain `.env`-format file. Edit it with any text editor, or with `lsh edit --file <path>`,
which understands the same `KEY=VALUE` format and offers `--get`, `--set`, and `--list`:

```bash
lsh edit --file ~/.config/lsh/lshrc --set LSH_SECRETS_KEY=<your-key>
lsh edit --file ~/.config/lsh/lshrc --get LSH_SECRETS_KEY
lsh edit --file ~/.config/lsh/lshrc --list
lsh edit --file ~/.config/lsh/lshrc            # open in $EDITOR
```

> `lsh edit`'s push-after-edit prompt applies to any file it targets — answer `n` (or pass
> `--no-push`) when prompted, since `~/.config/lsh/lshrc` is not something you push to IPFS.

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
lsh edit --file ~/.config/lsh/lshrc --set LSH_SECRETS_KEY=<your-key>
lsh edit --file ~/.config/lsh/lshrc --set LSH_PIN_TOKEN=<psa-token>
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
lsh edit --file ~/.config/lsh/lshrc --set LSH_SECRETS_KEY=<team-encryption-key>
lsh pull --env production
```

## Troubleshooting

### Config file not found

LSH doesn't require `lshrc` to exist — environment variables and `.env` work without it.
Create one manually if you want persistent settings:

```bash
mkdir -p ~/.config/lsh
touch ~/.config/lsh/lshrc
chmod 600 ~/.config/lsh/lshrc
```

### Changes not taking effect

Configuration is reloaded fresh on every `lsh` invocation — there is no cache to clear. If a
change still isn't showing up, confirm you edited the file LSH is actually reading:

```bash
lsh sync --config
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

`lsh sync --config` always masks. To see an unmasked value, use `lsh get`:

```bash
lsh get --file ~/.config/lsh/lshrc --all
```

## Examples

### Minimal local setup

```bash
# Install LSH
npm install -g lsh-framework

# Interactive setup — generates a key and installs/starts Kubo
lsh sync --init

# Start using LSH
lsh push --env dev
```

### Durable setup (survives node going offline)

```bash
lsh edit --file ~/.config/lsh/lshrc --set LSH_SECRETS_KEY=<generated-key>
lsh edit --file ~/.config/lsh/lshrc --set LSH_PIN_TOKEN=<4everland-psa-token>

# Pointer (w3name) and bytes (pin service) both persist
lsh push --env prod
```

## Related Documentation

- [Quick Start Guide](QUICK_START.md)
- [Secrets Management](features/secrets/SECRETS_GUIDE.md)
- [Architecture](ARCHITECTURE.md)
