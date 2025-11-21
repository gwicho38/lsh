# IPFS Client Management Guide

LSH includes an integrated IPFS client manager that can automatically install and configure IPFS (Kubo) on your system.

## What is IPFS?

IPFS (InterPlanetary File System) is a distributed, content-addressed storage protocol. LSH uses IPFS-compatible storage for:

- **Local secrets storage** - Content-addressed encrypted secrets at `~/.lsh/secrets-cache/`
- **Audit logs** - Immutable audit trail storage
- **Future features** - Distributed backup and team sync via IPFS network

## Quick Start

### Check IPFS Status

```bash
lsh ipfs status
```

Output:
```
📦 IPFS Client Status
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ IPFS client installed
   Type: kubo
   Version: 0.26.0
   Path: /Users/username/.lsh/ipfs/bin/ipfs
```

### Install IPFS Client

```bash
lsh ipfs install
```

This will:
1. Detect your platform (macOS, Linux, Windows)
2. Download the latest Kubo (official IPFS implementation)
3. Install to `~/.lsh/ipfs/bin/`
4. Verify installation

**Platform Support:**
- ✅ macOS (Intel & Apple Silicon)
- ✅ Linux (amd64 & arm64)
- ✅ Windows (amd64)

### Initialize IPFS Repository

```bash
lsh ipfs init
```

This creates an IPFS repository at `~/.lsh/ipfs/repo/` with:
- IPFS configuration
- Local datastore
- Peer identity

### Start IPFS Daemon (Optional)

```bash
lsh ipfs start
```

This starts the IPFS daemon in the background, enabling:
- Local IPFS gateway at `http://localhost:8080`
- IPFS API at `http://localhost:5001`
- P2P network connectivity

**Note:** The daemon is optional. LSH uses local IPFS-compatible storage by default and doesn't require a running daemon.

### Stop IPFS Daemon

```bash
lsh ipfs stop
```

## Commands Reference

### `lsh ipfs status`

Check IPFS client installation status.

**Options:**
- `--json` - Output as JSON

**Example:**
```bash
lsh ipfs status --json
```

Output:
```json
{
  "installed": true,
  "version": "0.26.0",
  "path": "/Users/username/.lsh/ipfs/bin/ipfs",
  "type": "kubo"
}
```

### `lsh ipfs install`

Install IPFS client (Kubo).

**Options:**
- `-f, --force` - Force reinstall even if already installed
- `-v, --version <version>` - Install specific version

**Examples:**
```bash
# Install latest version
lsh ipfs install

# Install specific version
lsh ipfs install --version 0.26.0

# Force reinstall
lsh ipfs install --force
```

### `lsh ipfs uninstall`

Uninstall LSH-managed IPFS client.

**Note:** This only removes LSH-managed installations (installed via `lsh ipfs install`). System-wide IPFS installations are not affected.

**Example:**
```bash
lsh ipfs uninstall
```

### `lsh ipfs init`

Initialize IPFS repository.

**Example:**
```bash
lsh ipfs init
```

### `lsh ipfs start`

Start IPFS daemon in the background.

**Example:**
```bash
lsh ipfs start
```

**Daemon Details:**
- PID stored at `~/.lsh/ipfs/daemon.pid`
- Logs available via IPFS logs
- API: `http://localhost:5001`
- Gateway: `http://localhost:8080`

### `lsh ipfs stop`

Stop IPFS daemon.

**Example:**
```bash
lsh ipfs stop
```

## Installation Details

### Download Sources

LSH downloads official Kubo releases from:
```
https://dist.ipfs.tech/kubo/v{version}/kubo_v{version}_{platform}-{arch}.tar.gz
```

### Installation Paths

- **Binary:** `~/.lsh/ipfs/bin/ipfs`
- **Repository:** `~/.lsh/ipfs/repo/`
- **PID File:** `~/.lsh/ipfs/daemon.pid`

### Supported Versions

LSH automatically installs the latest stable Kubo version. You can check available versions at:
https://github.com/ipfs/kubo/releases

### Platform-Specific Notes

#### macOS
- Supports both Intel (amd64) and Apple Silicon (arm64)
- Downloads pre-built binaries from IPFS distributions
- Requires macOS 10.15+ (Catalina or later)

#### Linux
- Supports amd64 and arm64 architectures
- Requires glibc 2.28+ (Ubuntu 18.04+, Debian 10+, etc.)
- Uses `curl` for downloads

#### Windows
- Supports 64-bit Windows 10/11
- Downloads `.zip` archive
- Uses built-in `tar` command for extraction

## Integration with LSH Features

### Secrets Storage

LSH uses IPFS-compatible content-addressed storage (CIDs) for secrets:

```bash
# Push secrets (generates IPFS CID)
lsh push --env dev

# View metadata with CID
cat ~/.lsh/secrets-metadata.json
```

Example metadata:
```json
{
  "dev": {
    "environment": "dev",
    "cid": "bafkrei4h7xqnzqx7wlytgixvwfq6zjsjyv5iq2hvz5ej2qxg7gj3zxqx7m",
    "timestamp": "2025-11-21T10:30:00.000Z",
    "keys_count": 15,
    "encrypted": true
  }
}
```

### Audit Logs

IPFS is used for immutable audit trail storage:

```bash
# Audit logs stored with IPFS CIDs
ls ~/.lsh/ipfs/
```

### Future: Distributed Storage

Coming in v1.7.0:
- Upload secrets to IPFS network via Storacha
- Distributed team sync without central server
- Pinning service integration for redundancy

## Troubleshooting

### IPFS Client Not Found

**Symptom:**
```
⚠️  IPFS client not installed (optional for local storage)
   Install with: lsh ipfs install
```

**Solution:**
```bash
lsh ipfs install
```

### Installation Fails

**Symptom:**
```
❌ Installation failed: Failed to download
```

**Possible Causes:**
1. No internet connection
2. Firewall blocking downloads
3. Unsupported platform

**Solutions:**
```bash
# Check internet connection
curl -I https://dist.ipfs.tech

# Check platform
lsh doctor

# Try specific version
lsh ipfs install --version 0.25.0
```

### Daemon Won't Start

**Symptom:**
```
❌ Failed to start daemon: Address already in use
```

**Solution:**
```bash
# Check if IPFS is already running
ps aux | grep ipfs

# Stop existing daemon
lsh ipfs stop

# Or kill manually
pkill -f 'ipfs daemon'

# Try starting again
lsh ipfs start
```

### Permission Denied

**Symptom:**
```
❌ Permission denied: ~/.lsh/ipfs/bin/ipfs
```

**Solution:**
```bash
# Fix permissions
chmod +x ~/.lsh/ipfs/bin/ipfs

# Verify
ls -la ~/.lsh/ipfs/bin/ipfs
```

## Uninstallation

### Remove LSH-Managed IPFS

```bash
lsh ipfs uninstall
```

This removes:
- `~/.lsh/ipfs/` directory
- All downloaded binaries
- IPFS repository data

**Note:** Your secrets and metadata (`~/.lsh/secrets-cache/` and `~/.lsh/secrets-metadata.json`) are **not** affected.

### Complete Cleanup

To remove all LSH data including IPFS:

```bash
# Remove IPFS
lsh ipfs uninstall

# Remove entire LSH directory (⚠️ WARNING: This deletes all secrets!)
rm -rf ~/.lsh
```

## Advanced Usage

### Custom IPFS Binary

If you have IPFS installed system-wide, LSH will detect and use it automatically:

```bash
# Install IPFS via Homebrew (macOS)
brew install ipfs

# LSH will detect it
lsh ipfs status
```

Output:
```
✅ IPFS client installed
   Type: kubo
   Version: 0.26.0
   Path: /usr/local/bin/ipfs
```

### Manual IPFS Configuration

IPFS repository config: `~/.lsh/ipfs/repo/config`

You can customize:
- Bootstrap nodes
- Gateway settings
- Datastore configuration

Example:
```bash
# Edit IPFS config
nano ~/.lsh/ipfs/repo/config

# Restart daemon to apply changes
lsh ipfs stop
lsh ipfs start
```

### Environment Variables

Control IPFS behavior with environment variables:

```bash
# Use custom IPFS repository path
export IPFS_PATH=~/.lsh/ipfs/repo

# Run IPFS commands directly
ipfs version
ipfs id
```

## Security Considerations

### Local Installation

LSH installs IPFS locally in `~/.lsh/ipfs/`:
- ✅ No system-wide installation required
- ✅ No root/admin privileges needed
- ✅ Isolated from other IPFS installations

### Binary Verification

LSH downloads binaries from official IPFS distributions:
- Source: `https://dist.ipfs.tech/`
- Checksums: Available at download URLs
- Signatures: Verified by IPFS team

### Network Security

When running IPFS daemon:
- Daemon listens on `localhost` only (default)
- API requires authentication tokens
- Gateway is read-only by default

**Production Recommendation:** Don't expose IPFS API/gateway to public internet without additional authentication.

## FAQ

### Do I need IPFS to use LSH?

**No.** LSH works perfectly without a full IPFS installation. It uses IPFS-compatible local storage (content-addressed with CIDs) but doesn't require the IPFS daemon for basic secrets management.

### What's the difference between Kubo and IPFS?

Kubo is the official Go implementation of IPFS (formerly called `go-ipfs`). When we say "IPFS client," we mean Kubo.

### Can I use an existing IPFS installation?

**Yes.** LSH detects system-wide IPFS installations automatically. You don't need to install via `lsh ipfs install` if you already have IPFS.

### Does LSH upload secrets to the IPFS network?

**Not yet.** As of v1.6.0, LSH uses IPFS-compatible local storage only. Future versions (v1.7.0+) will support optional upload to IPFS network via Storacha.

### How much disk space does IPFS use?

Minimal:
- Binary: ~50 MB
- Repository: ~10 MB (initial)
- Secrets: ~5 KB per environment

Total: ~60 MB for basic usage.

## Next Steps

- [Secrets Management Guide](../secrets/SECRETS_GUIDE.md)
- [Team Collaboration](../secrets/TEAM_COLLABORATION.md)
- [IPFS Documentation](https://docs.ipfs.tech/)
- [Kubo GitHub](https://github.com/ipfs/kubo)

---

**Questions?** Open an issue at https://github.com/gwicho38/lsh/issues
