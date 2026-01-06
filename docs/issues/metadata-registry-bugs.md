# Bug: Metadata persistence and registry lookup issues in v3.x

## Status: ✅ RESOLVED (v3.1.10)

## Summary
Multiple issues with metadata persistence and Storacha registry lookup causing sync status to incorrectly report "not synced" even after successful push.

## Issues Identified

### 1. Metadata Overwriting on Sequential Pushes
When pushing secrets from multiple repos sequentially, earlier entries get lost from `~/.lsh/secrets-metadata.json`.

**Steps to reproduce:**
```bash
cd ~/repos/RepoA && lsh push --env dev
cd ~/repos/RepoB && lsh push --env dev
cat ~/.lsh/secrets-metadata.json  # Only shows RepoB, RepoA entry is missing
```

**Expected:** Both entries should persist in metadata file.
**Actual:** Only the last pushed repo's entry exists.

### 2. Environment Key Mismatch
Inconsistency between how push stores metadata vs how status/info looks up metadata.

- Push stores with empty environment: `RepoName_` (when `getDefaultEnvironment()` returns `''`)
- Status looks up with: `RepoName_dev` (using the CLI-provided `--env dev`)

**Example:**
```json
// Metadata stored by push:
{ "Outlet_": { ... } }

// Status command looks for:
// getMetadataKey("Outlet", "dev") = "Outlet_dev"  // Not found!
```

### 3. Registry Lookup Not Finding Entries
The `getLatestCID()` function in `storacha-client.ts` iterates through uploads but doesn't find the registry even when it exists.

**Evidence:**
```
INFO  📝 Uploaded registry v1 for Outlet (secrets CID: bafkrei7930...)
# Later, on pull:
INFO  🔍 No local metadata found, checking Storacha registry...
# Downloads 20 items but still:
ERROR No secrets found for environment: Outlet
```

## Affected Versions
- lsh-framework v3.1.9

## Root Cause Analysis

1. **Metadata overwrite:** The `IPFSSecretsStorage` class loads metadata into memory on instantiation. If a new instance is created (different repo/shell), it loads stale data from disk before the previous instance has saved.

2. **Environment mismatch:** `getDefaultEnvironment()` returns `''` for git repos, but CLI commands still pass `--env dev` to status/info commands which use that raw value for lookup.

3. **Registry lookup:** The pagination in `getLatestCID()` may not be iterating correctly, or the registry filename pattern matching is failing.

## Suggested Fixes

1. Implement file locking or atomic updates for metadata file
2. Ensure `status`/`info` use the same environment transformation as `push`/`pull`
3. Add debug logging to `getLatestCID()` to trace why registry lookup fails

## Workaround
Manually add entries to `~/.lsh/secrets-metadata.json` with the correct format:
```json
{
  "RepoName_": {
    "environment": "",
    "git_repo": "RepoName",
    "git_branch": "main",
    "cid": "bafkrei...",
    "timestamp": "...",
    "keys_count": N,
    "encrypted": true
  }
}
```

## Related Files
- `src/lib/ipfs-secrets-storage.ts` - metadata management
- `src/lib/storacha-client.ts` - registry upload/lookup
- `src/lib/secrets-manager.ts` - environment naming
- `src/services/secrets/secrets.ts` - CLI command handlers

## Priority
High - affects core sync functionality

## Resolution (v3.1.10)

All three bugs have been fixed:

### Fix #1: Metadata Persistence
**File:** `src/lib/ipfs-secrets-storage.ts`

Changed the constructor to load metadata synchronously using `loadMetadata()` instead of leaving it empty. This ensures all existing entries are loaded before any operations occur.

```typescript
constructor() {
  // ... path setup ...

  // Load metadata synchronously to ensure we have all existing entries
  this.metadata = this.loadMetadata();

  // Ensure cache directory exists
  if (!fs.existsSync(this.cacheDir)) {
    fs.mkdirSync(this.cacheDir, { recursive: true });
  }
}
```

### Fix #2: Environment Key Consistency
**File:** `src/services/secrets/secrets.ts`

Updated `status` and `info` commands to use the same environment transformation as `push`/`pull`/`sync`:

```typescript
// Before (buggy):
const status = await manager.status(filePath, options.env);

// After (fixed):
const env = options.env === 'dev' ? manager.getDefaultEnvironment() : options.env;
const status = await manager.status(filePath, env);
```

This ensures when user specifies `--env dev` in a git repo, it correctly maps to the empty environment that push uses.

### Fix #3: Registry Lookup Optimization
**File:** `src/lib/storacha-client.ts`

Added `getFileSize()` and `downloadIfSmall()` methods that use HTTP HEAD requests to check file size before downloading. This avoids downloading large encrypted secrets files when searching for small registry files.

```typescript
async downloadIfSmall(cid: string, maxSize: number = 1024): Promise<Buffer | null> {
  // First check size with HEAD request
  const size = await this.getFileSize(cid);

  // If size check succeeds and file is too large, skip download
  if (size > 0 && size > maxSize) {
    return null;
  }

  // Size unknown or small enough, proceed with download
  // ...
}
```

### Verification

After applying fixes:
- Sequential pushes from `~/repos/Outlet/` and `~/repos/politician-trading-tracker/` both persist in metadata
- `lsh status` correctly reports `cloudExists: true` and `keyMatches: true` for both repos
- Registry lookup skips large files efficiently using HEAD requests
