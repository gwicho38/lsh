# IPFS Client Management Guide

LSH includes an integrated IPFS client manager that can automatically install and configure IPFS (Kubo) on your system.

## What is IPFS?

IPFS (InterPlanetary File System) is a distributed, content-addressed storage protocol. LSH uses IPFS-compatible storage for:

- **Local secrets storage** - Content-addressed encrypted secrets at `~/.lsh/secrets-cache/`
- **Audit logs** - Immutable audit trail storage
- **Team sync** - Encrypted secrets published to IPNS and retrieved peer-to-peer over the IPFS swarm/DHT (with public gateway fallback for downloads)

## The IPFS lifecycle is automatic (v4.0.0)

There is no `lsh ipfs` command in v4. `push`, `pull`, and `sync` each call
`IPFSClientManager.ensureDaemonRunning()` before they touch the network — this detects an
existing installation (including a system-wide one), installs the latest Kubo if missing,
initializes the repository if needed, and starts the daemon if it isn't already running. There
is no separate install, init, or start step to run yourself, and no CLI flag to pin a specific
Kubo version or force a reinstall — `ensureDaemonRunning()` always resolves to the latest stable
release.

```bash
# Just use the four commands — IPFS comes up automatically on first use
lsh push --env dev
```

For a health check that includes IPFS client status, use:

```bash
lsh sync --doctor
```

Example output (abridged):
```
🏥 LSH Health Check
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ IPFS Client - kubo v0.26.0 installed
✅ IPFS Daemon - running
...

🎉 All checks passed!
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

View them with:

```bash
lsh sync --history
```

### Distributed Storage & Team Sync

LSH shells out to your local Kubo (IPFS) daemon for cross-machine secrets sync:
- `ipfs add` writes the encrypted payload to the local datastore (pinned locally) and returns a CID
- The CID is published to IPNS, with the name derived deterministically from `LSH_SECRETS_KEY` + repo + environment
- Other machines retrieve the content peer-to-peer over the IPFS swarm/DHT, with a public gateway used as a download fallback

By default, content is pinned only on the pushing machine. For durable availability, configure a Kubo remote pinning service (any provider, e.g. Pinata, Filebase, 4EVERLAND, web3.storage, or IPFS Cluster):

```bash
# Register a remote pinning service with your local daemon
ipfs pin remote service add <name> <endpoint> <key>

# Tell LSH to use it
export LSH_PIN_SERVICE=<name>
```

LSH then calls the daemon's `/pin/remote/add` on push. No extra dependency is required, and the service only ever stores ciphertext.

## Troubleshooting

### IPFS Client Not Found

**Symptom:** `lsh sync --doctor` reports the IPFS client as missing.

**Solution:** Nothing to run manually — the next `push`, `pull`, or `sync` installs it
automatically. To trigger installation immediately without touching secrets:

```bash
lsh sync --doctor
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

# Check platform + client status
lsh sync --doctor
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

# Stop it manually — there is no `lsh ipfs stop` in v4
pkill -f 'ipfs daemon'

# Try again — the next push/pull/sync restarts it
lsh sync --doctor
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

There is no `lsh ipfs uninstall` command in v4. Remove the managed installation directly:

```bash
rm -rf ~/.lsh/ipfs
```

This removes:
- `~/.lsh/ipfs/` directory
- All downloaded binaries
- IPFS repository data

**Note:** Your secrets and metadata (`~/.lsh/secrets-cache/` and `~/.lsh/secrets-metadata.json`) are **not** affected. The next `push`, `pull`, or `sync` reinstalls Kubo from scratch.

### Complete Cleanup

To remove all LSH data including IPFS:

```bash
# ⚠️ WARNING: This deletes all secrets and the IPFS installation!
rm -rf ~/.lsh
```

## Advanced Usage

### Custom IPFS Binary

If you have IPFS installed system-wide, LSH will detect and use it automatically:

```bash
# Install IPFS via Homebrew (macOS)
brew install ipfs

# LSH will detect it on the next push/pull/sync
lsh sync --doctor
```

Output (abridged):
```
✅ IPFS Client - kubo v0.26.0 installed
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

# Restart the daemon to apply changes — there is no `lsh ipfs stop`/`start` in v4
pkill -f 'ipfs daemon'
lsh sync --doctor
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

**No, not manually.** `push`, `pull`, and `sync` install and manage Kubo for you the first time
you run them. There is no separate installation step.

### What's the difference between Kubo and IPFS?

Kubo is the official Go implementation of IPFS (formerly called `go-ipfs`). When we say "IPFS client," we mean Kubo.

### Can I use an existing IPFS installation?

**Yes.** LSH detects system-wide IPFS installations automatically and uses them instead of
installing its own copy.

### Does LSH upload secrets to the IPFS network?

**Yes, for team sync.** LSH shells out to your local Kubo daemon: `ipfs add` stores the encrypted payload (pinned locally) and returns a CID, which is then published to IPNS. Other machines retrieve it peer-to-peer over the IPFS swarm/DHT, with a public gateway fallback for downloads. Only ciphertext is ever uploaded. By default content is pinned only on the pushing machine; for durable availability, configure a Kubo remote pinning service and set `export LSH_PIN_SERVICE=<name>` (see [Distributed Storage & Team Sync](#distributed-storage--team-sync)).

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
