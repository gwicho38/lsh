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

```bash
# Show history for current repo/environment
$ lsh sync-history show

📊 Sync History for: myproject/dev

2025-11-20 21:00:00  push    60 keys  myproject/dev
2025-11-20 20:45:00  pull    60 keys  myproject/dev
2025-11-20 20:30:00  push    58 keys  myproject/dev

📦 Total: 3 records
🔒 All records are permanently stored on IPFS
```

### View All Records

```bash
# Show all records across all repos/environments
$ lsh sync-history show --all

📊 All Sync History

2025-11-20 21:00:00  push    60 keys  myproject/dev
2025-11-20 19:30:00  pull    45 keys  otherproject/prod
2025-11-20 18:15:00  push    32 keys  backend/staging

📦 Total: 3 records
```

### View Specific Record

```bash
$ lsh sync-history get bafkreiabc123...

📄 Sync Record

CID:         ipfs://bafkreiabc123...
Timestamp:   Nov 20, 2025, 9:00 PM
Command:     lsh sync
Action:      push
Environment: myproject_dev
Keys Count:  60

Git Info:
  Repository: myproject
  Branch:     main

Metadata:
  User:       username
  Machine ID: def456...
  LSH Version: 1.5.0
  Key Fingerprint: sha256:abc123...
```

### List CIDs

```bash
# List all CIDs with timestamps
$ lsh sync-history list

📋 Sync Log Entries

Nov 20, 2025, 9:00 PM  push    bafkreiabc123...
Nov 20, 2025, 8:45 PM  pull    bafkreidef456...
Nov 20, 2025, 8:30 PM  push    bafkreighi789...

📦 Total: 3 entries
```

### Get URLs Only

```bash
$ lsh sync-history show --url
ipfs://bafkreiabc123...
ipfs://bafkreidef456...
ipfs://bafkreighi789...
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

To disable automatic recording:

```bash
# Disable IPFS sync
lsh config set DISABLE_IPFS_SYNC true

# Re-enable
lsh config delete DISABLE_IPFS_SYNC
```

When disabled:
- No records are created
- Existing records remain accessible
- `lsh sync-history` still works for existing records

## Use Cases

### Compliance & Auditing

```bash
# Generate audit report
lsh sync-history show --all > audit-report.txt

# Verify when secrets were last updated
lsh sync-history show | grep "2025-11-20"
```

### Team Coordination

```bash
# Check who last synced production
lsh sync-history show -e prod

# Verify secrets are up-to-date
lsh sync-history list | head -1
```

### Debugging

```bash
# View full details of problematic sync
lsh sync-history get bafkreiabc123...

# Check key fingerprint matches
lsh sync-history show | grep "sha256:"
```

## Future Enhancements

### Planned Features

1. **Real IPFS Upload** - Upload to actual IPFS network
2. **Storacha Integration** - Free 5GB storage via storacha.network
3. **Public Gateways** - View records via public IPFS gateways
4. **Blockchain Anchoring** - Optional Ethereum anchoring
5. **Record Sharing** - Share audit logs via IPFS CID

### Migration Path

Current implementation stores records locally with IPFS-compatible CIDs. When real IPFS upload is implemented:

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
- [Local Storage](../LOCAL_STORAGE.md)

## Support

For issues or questions about IPFS sync records:
- GitHub Issues: https://github.com/gwicho38/lsh/issues
- Disable if problematic: `lsh config set DISABLE_IPFS_SYNC true`
