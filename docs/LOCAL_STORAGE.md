# Local Storage Fallback

LSH automatically detects when no database is configured and falls back to local file storage.

## How It Works

When neither `SUPABASE_URL`/`SUPABASE_ANON_KEY` nor `DATABASE_URL` are set in environment variables:

1. LSH detects missing database configuration
2. Automatically initializes `LocalStorageAdapter`
3. Stores data in `~/.lsh/data/storage.json`
4. All features work normally

## Storage Location

```bash
~/.lsh/data/
├── storage.json          # Main data file
└── storage.json.bak      # Auto-backup (if enabled)
```

## Features Supported

✅ **Fully Supported:**
- Shell history tracking
- Job management
- Cron scheduling
- Configuration storage
- Aliases and functions
- Shell sessions
- Secrets encryption

❌ **Not Available (require database):**
- Team collaboration
- Cross-machine sync
- Real-time updates
- Advanced SQL queries
- Multi-user support

## Data Structure

The `storage.json` file contains:

```json
{
  "shell_history": [],
  "shell_jobs": [],
  "shell_configuration": [],
  "shell_sessions": [],
  "shell_aliases": [],
  "shell_functions": [],
  "shell_completions": []
}
```

## Performance

- **Write Performance:** Auto-flushes every 5 seconds (configurable)
- **Read Performance:** Instant (in-memory cache)
- **File Size:** Typically < 1MB for normal usage
- **Backups:** Manual backup recommended for production

## Configuration

```typescript
// In your code
import { LocalStorageAdapter } from './lib/local-storage-adapter.js';

const storage = new LocalStorageAdapter(userId, {
  dataDir: '~/.lsh/data',        // Custom location
  autoFlush: true,                // Auto-save (default: true)
  flushInterval: 5000             // Flush every 5s (default: 5000ms)
});

await storage.initialize();
```

## Migrating Between Storage Backends

### From Local Storage to PostgreSQL

```bash
# Start PostgreSQL
docker-compose up -d

# Add to .env
echo "DATABASE_URL=postgresql://lsh_user:lsh_password@localhost:5432/lsh" >> .env

# Restart LSH
lsh daemon restart

# Note: Data won't auto-migrate. Re-run commands to populate database.
```

### From Local Storage to Supabase

```bash
# Create Supabase project
# Add credentials to .env
echo "SUPABASE_URL=https://your-project.supabase.co" >> .env
echo "SUPABASE_ANON_KEY=your-key" >> .env

# Restart LSH
lsh daemon restart

# Re-push secrets to sync to cloud
lsh push --env dev
lsh push --env staging
lsh push --env production
```

## Backup and Restore

### Manual Backup

```bash
# Backup
cp ~/.lsh/data/storage.json ~/backups/lsh-$(date +%Y%m%d).json

# Restore
cp ~/backups/lsh-20250120.json ~/.lsh/data/storage.json
lsh daemon restart
```

### Automated Backup

```bash
# Add cron job
lsh cron add --name backup-lsh \
  --schedule "0 0 * * *" \
  --command "cp ~/.lsh/data/storage.json ~/backups/lsh-\$(date +\%Y\%m\%d).json"
```

## Troubleshooting

### Permission Errors

```bash
# Fix permissions
chmod -R 755 ~/.lsh
chown -R $USER ~/.lsh
```

### Corrupted Storage File

```bash
# Restore from backup
cp ~/backups/lsh-latest.json ~/.lsh/data/storage.json

# Or start fresh
rm ~/.lsh/data/storage.json
lsh daemon restart
```

### Storage File Too Large

```bash
# Check size
ls -lh ~/.lsh/data/storage.json

# Archive old data
mv ~/.lsh/data/storage.json ~/.lsh/data/storage-$(date +%Y%m%d).json.bak

# LSH will create new file
lsh daemon restart
```

## Security Considerations

- **File Permissions:** Storage file is readable only by owner (755)
- **Encryption:** Secrets are still AES-256 encrypted
- **Backups:** Backup files contain encrypted secrets (safe to store)
- **Network:** No network access required (fully offline)

## When to Use Each Mode

**Use Local Storage When:**
- ✅ Getting started with LSH
- ✅ Single-user, single-machine setup
- ✅ No network access required
- ✅ Testing/development
- ✅ Privacy-first (no cloud)

**Upgrade to PostgreSQL When:**
- ✅ Need database features (SQL queries, joins)
- ✅ Large data volumes (>100MB)
- ✅ Better performance for complex queries
- ✅ Want pgAdmin access

**Upgrade to Supabase When:**
- ✅ Team collaboration needed
- ✅ Multi-machine sync
- ✅ Cloud backup
- ✅ Real-time updates
- ✅ Remote access

## Implementation Details

See `src/lib/local-storage-adapter.ts` for full implementation.

Key classes:
- `LocalStorageAdapter` - Main storage implementation
- `DatabasePersistence` - Auto-detects and delegates to appropriate backend
- `SupabaseClient` - Made optional, gracefully fails if not configured

## Related Documentation

- [Quick Start Guide](QUICK_START.md) - Choose your deployment mode
- [Secrets Guide](features/secrets/SECRETS_GUIDE.md) - Secrets management
- [Database Schema](../src/lib/database-schema.ts) - Data structures
