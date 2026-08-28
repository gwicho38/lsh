# IPFS Immutable Sync Records

LSH automatically records all sync operations to a local IPFS-compatible storage, creating an immutable audit trail of your secrets management activity.

## Overview

Every time you run `lsh push`, `lsh pull`, or `lsh sync`, LSH creates an immutable record containing metadata about the operation. This provides:

- **Immutable Audit Trail** - Permanent record of when secrets were synced
- **Zero Configuration** - Works automatically, no setup required
- **Privacy-First** - Only metadata stored, never actual secret values
- **Content-Addressed** - IPFS-style CID (Content Identifier) for each record
- **Opt-Out** - Can be disabled if not needed

## What Gets Recorded

Each sync operation records:

```json
{
  "timestamp": "2025-11-20T21:00:00Z",
  "command": "lsh sync",
  "action": "push",
  "environment": "myproject_dev",
  "git_repo": "myproject",
  "git_branch": "main",
  "keys_count": 60,
  "key_fingerprint": "sha256:abc123...",
  "machine_id": "def456...",
  "user": "username",
  "lsh_version": "1.5.0"
}
```

### What's NOT Recorded

- ❌ Secret values (never stored)
- ❌ Secret keys (only fingerprints)
- ❌ File contents
- ❌ Environment variable values

## Usage

### Automatic Recording

Records are created automatically:

```bash
$ lsh push
ℹ️  Using local storage (Supabase not configured)
✅ Pushed 60 secrets from .env to Supabase
📝 Recorded on IPFS: ipfs://bafkreiabc123...
   View: https://ipfs.io/ipfs/bafkreiabc123...
```

### View History

`lsh sync --history` replaces every v3 `sync-history` subcommand — there is no separate `show`, `list`,
`--all`, or `--url` flag. One call prints recent local sync activity plus the full immutable record log:

```bash
$ lsh sync --history

Recent Sync Activity

bafkreiabc123...
  File: .env
  Size: 412 bytes
  Time: 11/20/2025, 9:00:00 PM

Immutable Sync Records

11/20/2025, 9:00:00 PM  push    60 keys     myproject/dev
11/20/2025, 8:45:00 PM  pull    60 keys     myproject/dev
11/20/2025, 8:30:00 PM  push    58 keys     myproject/dev

Total: 3 records
```

Records span every repo and environment LSH has synced from this machine — not just the current directory.

### Machine-Readable Output

```bash
$ lsh sync --history --format json
{
  "recent": [ ... ],
  "records": [ ... ],
  "unreadableRecords": 0
}
```

Where the v3 docs showed `--json`, use `--format json` in v4.

### Check a Specific Record

The v3 `sync-history get <cid>` command split into two v4 replacements depending on what you need:

```bash
# Confirm a CID is still retrievable from the local daemon or a public gateway
$ lsh sync --verify bafkreiabc123...
✓ CID is available
CID:    bafkreiabc123...
Source: local daemon

# Fetch full record detail for display (filter the JSON for one CID/timestamp)
$ lsh sync --history --format json | jq '.records[] | select(.cid == "bafkreiabc123...")'
```

## Storage Location

Records are stored locally in:

```
~/.lsh/
├── sync-log.json          # Index of all records
└── ipfs/
    ├── bafkreiabc123.json # Individual records
    ├── bafkreidef456.json
    └── bafkreighi789.json
```

### sync-log.json Format

```json
{
  "myproject_dev": [
    {
      "cid": "bafkreiabc123...",
      "timestamp": "2025-11-20T21:00:00Z",
      "url": "ipfs://bafkreiabc123...",
      "action": "push"
    }
  ],
  "otherproject_prod": [
    {
      "cid": "bafkreidef456...",
      "timestamp": "2025-11-20T19:30:00Z",
      "url": "ipfs://bafkreidef456...",
      "action": "pull"
    }
  ]
}
```

## Content-Addressed Storage

Each record gets a unique IPFS-style CID (Content Identifier):

- **Format**: `bafkreixxx...` (IPFS CIDv1 format)
- **Generation**: SHA-256 hash of record content
- **Immutable**: Same content = same CID
- **Verifiable**: Can verify record hasn't changed

### Why CIDs?

Content addressing ensures:
1. **Immutability** - Content cannot change without changing CID
2. **Deduplication** - Identical records have same CID
3. **Verification** - Can verify record integrity
4. **Future IPFS Upload** - CIDs are IPFS-compatible

## Privacy & Security

### Machine ID

Machine IDs are anonymized:
```typescript
const combined = `${username}@${hostname}`;
const machineId = sha256(combined).substring(0, 16);
// Result: "def456..." (16 chars)
```

### Key Fingerprint

Only hash of encryption key is stored:
```typescript
const keyFingerprint = `sha256:${sha256(LSH_SECRETS_KEY).substring(0, 16)}`;
// Result: "sha256:abc123..." (24 chars total)
```

### No Secrets Exposed

Records contain ONLY:
- ✅ Timestamps
- ✅ Command names
- ✅ Action types
- ✅ Key counts
- ✅ Hashes/fingerprints
- ✅ Git metadata

Records NEVER contain:
- ❌ Secret values
- ❌ Encryption keys
- ❌ File contents
- ❌ Variable names

## Disabling IPFS Sync

There is no CLI command to write config in v4 — `lsh sync --config` only reads `~/.config/lsh/lshrc`. Set
`DISABLE_IPFS_SYNC` directly, either as a shell environment variable or as a line in `lshrc`:

```bash
# Disable IPFS sync for one shell session
export DISABLE_IPFS_SYNC=true

# Or persist it by adding a line to ~/.config/lsh/lshrc
echo "DISABLE_IPFS_SYNC=true" >> ~/.config/lsh/lshrc

# Re-enable: unset the shell var, or remove/edit the lshrc line
```

When disabled:
- No records are created
- Existing records remain accessible
- `lsh sync --history` still works for existing records

## Use Cases

### Compliance & Auditing

```bash
# Generate an audit report
lsh sync --history --format json > audit-report.json

# Verify when secrets were last updated
lsh sync --history | grep "11/20/2025"
```

### Team Coordination

```bash
# Check who last synced, filtering the JSON for one environment
lsh sync --history --format json | jq '.records[] | select(.environment | contains("prod"))'

# Verify secrets are up-to-date
lsh sync --history --format json | jq '.records[0]'
```

### Debugging

```bash
# View full details of a problematic sync
lsh sync --history --format json | jq '.records[] | select(.cid == "bafkreiabc123...")'

# Check key fingerprint matches (fingerprints are only in the JSON output)
lsh sync --history --format json | jq -r '.records[].key_fingerprint'
```

## Future Enhancements

### Planned Features

1. **Upload Records to IPFS** - Publish audit records via the local Kubo daemon, the same path `lsh sync` already uses for secrets (`ipfs add` → CID → IPNS)
2. **Public Gateways** - View records via public IPFS gateways
3. **Blockchain Anchoring** - Optional Ethereum anchoring
4. **Record Sharing** - Share audit logs via IPFS CID

> Note: secrets sync itself already shells out to a local Kubo (IPFS) daemon — `ipfs add` (pinned locally) produces a CID that is published to IPNS, and other machines retrieve it peer-to-peer over the swarm/DHT (with public gateway fallback). For durable availability, configure a Kubo remote pinning service and set `export LSH_PIN_SERVICE=<name>`. The enhancements above would extend that same mechanism to these audit records, which are currently stored locally only.

### Migration Path

Current implementation stores records locally with IPFS-compatible CIDs. When record upload via the local Kubo daemon is implemented:

1. Existing CIDs remain valid
2. Records can be uploaded retroactively
3. No breaking changes to data format
4. Optional: automatic upload to IPFS

## Technical Details

### CID Generation

```typescript
function generateContentId(record: SyncRecord): string {
  const content = JSON.stringify(record);
  const hash = crypto.createHash('sha256').update(content).digest('hex');
  return `bafkrei${hash.substring(0, 52)}`; // IPFS CIDv1 format
}
```

### Record Storage

```typescript
const recordPath = `~/.lsh/ipfs/${cid}.json`;
fs.writeFileSync(recordPath, JSON.stringify(record, null, 2));
```

### Index Management

```typescript
const syncLog = {
  [repoEnv]: [
    { cid, timestamp, url, action }
  ]
};
fs.writeFileSync('~/.lsh/sync-log.json', JSON.stringify(syncLog, null, 2));
```

## Comparison with Alternatives

| Feature | LSH IPFS Sync | GitHub Gists | Blockchain | Database Logs |
|---------|---------------|--------------|------------|---------------|
| Cost | Free | Free | $$ | Free |
| Setup | Zero | GitHub account | Wallet + Gas | Database config |
| Immutable | Yes (CID) | Yes (Git) | Yes | No |
| Privacy | Local-first | Public/Private | Public | Private |
| Offline | Yes | No | No | Depends |
| Content-Addressed | Yes | No | Partial | No |

## FAQ

**Q: Does this upload my secrets to IPFS?**
A: No! Only metadata is recorded locally. No secrets are ever uploaded anywhere.

**Q: Why IPFS if it's local storage?**
A: Uses IPFS-compatible CIDs for future real IPFS upload capability. Records are forward-compatible.

**Q: Can I delete records?**
A: Yes, delete files in `~/.lsh/ipfs/` or entire directory. Edit `sync-log.json` to remove index entries.

**Q: Does this slow down sync operations?**
A: No measurable impact. Record creation is <1ms and happens asynchronously.

**Q: Can others see my records?**
A: No. Records are stored locally only. No uploads to any service.

**Q: What if I lose my ~/.lsh directory?**
A: Records are lost, but no secrets are lost. Only audit trail is affected.

## Related Documentation

- [Secrets Management Guide](secrets/SECRETS_GUIDE.md)
- [Configuration Guide](../CONFIGURATION.md)

## Support

For issues or questions about IPFS sync records:
- GitHub Issues: https://github.com/gwicho38/lsh/issues
- Disable if problematic: `export DISABLE_IPFS_SYNC=true` (or add that line to `~/.config/lsh/lshrc`)
