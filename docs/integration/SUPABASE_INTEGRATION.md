# LSH Supabase Integration

This document describes the Supabase PostgreSQL integration for LSH (Lightweight Shell), providing cloud-based persistence for shell history, configuration, jobs, and other shell data.

## Overview

The Supabase integration enables LSH to:
- Sync shell history across multiple devices
- Store configuration in the cloud
- Track shell jobs and sessions
- Manage aliases and functions remotely
- Provide multi-device shell state synchronization

## Database Schema

The integration uses the following PostgreSQL tables:

### Core Tables

1. **shell_history** - Command history entries
2. **shell_jobs** - Background job tracking
3. **shell_configuration** - User configuration settings
4. **shell_sessions** - Active shell sessions
5. **shell_aliases** - Command aliases
6. **shell_functions** - Shell functions
7. **shell_completions** - Command completion patterns

## Setup Instructions

### 1. Database Setup

Run the following SQL in your Supabase dashboard to create the required tables:

```sql
-- Run the SQL schema provided by: lsh supabase init
```

### 2. Environment Configuration

The integration uses the following Supabase credentials:
- **URL**: `https://uljsqvwkomdrlnofmlad.supabase.co`
- **Anonymous Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- **Database URL**: `postgresql://postgres:[YOUR-PASSWORD]@db.uljsqvwkomdrlnofmlad.supabase.co:5432/postgres`

### 3. Initialize Integration

```bash
# Test database connection
lsh supabase test

# Initialize database schema
lsh supabase init

# Sync existing data
lsh supabase sync
```

## CLI Commands

### Database Management

```bash
# Test connection
lsh supabase test

# Initialize schema
lsh supabase init

# Force synchronization
lsh supabase sync --force
```

### History Management

```bash
# List recent history
lsh supabase history --list --count 20

# Search history
lsh supabase history --search "git"

# Export history
lsh supabase history --export
```

### Configuration Management

```bash
# List all configuration
lsh supabase config --list

# Get specific configuration
lsh supabase config --get theme

# Set configuration
lsh supabase config --set theme dark

# Delete configuration
lsh supabase config --delete theme

# Export configuration
lsh supabase config --export
```

### Job Management

```bash
# List active jobs
lsh supabase jobs --list

# View job history
lsh supabase jobs --history
```

## Features

### 1. Enhanced History System

The `EnhancedHistorySystem` extends the base history system with:
- Automatic cloud synchronization
- Cross-device history sharing
- Search across local and cloud data
- History statistics and analytics

```typescript
import EnhancedHistorySystem from './lib/enhanced-history-system.js';

const historySystem = new EnhancedHistorySystem({
  userId: 'user123',
  enableCloudSync: true,
  syncInterval: 30000, // 30 seconds
});

// Add commands (automatically synced)
historySystem.addCommand('ls -la', 0);
historySystem.addCommand('git status', 0);

// Search across local and cloud
const results = await historySystem.searchHistoryCloud('git');
```

### 2. Cloud Configuration Manager

The `CloudConfigManager` provides:
- Automatic configuration synchronization
- Type-safe configuration values
- Import/export functionality
- Configuration versioning

```typescript
import CloudConfigManager from './lib/cloud-config-manager.js';

const configManager = new CloudConfigManager({
  userId: 'user123',
  enableCloudSync: true,
});

// Set configuration (automatically synced)
configManager.set('theme', 'dark', 'UI theme preference');
configManager.set('max_history', 1000, 'Maximum history entries');

// Get configuration
const theme = configManager.get('theme', 'light');
```

### 3. Database Persistence

The `DatabasePersistence` class handles:
- Session management
- Job tracking
- History storage
- Configuration persistence

```typescript
import DatabasePersistence from './lib/database-persistence.js';

const persistence = new DatabasePersistence('user123');

// Start session
await persistence.startSession('/home/user', {
  PATH: '/usr/bin:/bin',
  HOME: '/home/user',
});

// Save history entry
await persistence.saveHistoryEntry({
  session_id: persistence.getSessionId(),
  command: 'ls -la',
  working_directory: '/home/user',
  exit_code: 0,
  timestamp: new Date().toISOString(),
  hostname: 'my-machine',
});

// End session
await persistence.endSession();
```

## Integration Examples

### Basic Integration

```typescript
import { supabaseClient } from './lib/supabase-client.js';
import DatabasePersistence from './lib/database-persistence.js';
import CloudConfigManager from './lib/cloud-config-manager.js';

// Test connection
const isConnected = await supabaseClient.testConnection();
if (!isConnected) {
  console.log('Database not available');
  return;
}

// Initialize components
const persistence = new DatabasePersistence('user123');
const configManager = new CloudConfigManager({
  userId: 'user123',
  enableCloudSync: true,
});

// Use enhanced features
configManager.set('auto_sync', true);
await persistence.startSession(process.cwd(), process.env);
```

### Advanced Usage

```typescript
import EnhancedHistorySystem from './lib/enhanced-history-system.js';

// Create enhanced history system
const historySystem = new EnhancedHistorySystem({
  userId: 'user123',
  enableCloudSync: true,
  maxSize: 10000,
  syncInterval: 30000,
});

// Add commands with automatic sync
historySystem.addCommand('npm install', 0);
historySystem.addCommand('git commit -m "feat: add supabase integration"', 0);

// Get statistics
const stats = await historySystem.getHistoryStats();
console.log(`Total commands: ${stats.totalCommands}`);
console.log(`Most used: ${stats.mostUsedCommand}`);

// Search across devices
const gitCommands = await historySystem.searchHistoryCloud('git', 10);
```

## Security Considerations

1. **Authentication**: Currently uses anonymous access. For production, implement proper user authentication.

2. **Data Privacy**: All data is stored in Supabase. Ensure compliance with privacy requirements.

3. **Access Control**: Implement Row Level Security (RLS) policies in Supabase for multi-user scenarios.

4. **Encryption**: Sensitive data should be encrypted before storage.

## Performance Considerations

1. **Sync Intervals**: Adjust sync intervals based on usage patterns.
2. **Batch Operations**: Use batch operations for large data transfers.
3. **Caching**: Implement local caching to reduce database calls.
4. **Indexing**: Ensure proper database indexes for query performance.

## Troubleshooting

### Connection Issues

```bash
# Test connection
lsh supabase test

# Check configuration
lsh supabase config --list
```

### Sync Issues

```bash
# Force sync
lsh supabase sync --force

# Check history
lsh supabase history --list
```

### Schema Issues

```bash
# Reinitialize schema
lsh supabase init
```

## Future Enhancements

1. **Real-time Sync**: Implement real-time synchronization using Supabase subscriptions
2. **Conflict Resolution**: Handle conflicts when multiple devices modify the same data
3. **Backup/Restore**: Implement backup and restore functionality
4. **Analytics**: Add usage analytics and insights
5. **Multi-user Support**: Support for multiple users with proper access control

## API Reference

### SupabaseClient

```typescript
class SupabaseClient {
  constructor(config?: Partial<SupabaseConfig>);
  getClient(): any;
  testConnection(): Promise<boolean>;
  getConnectionInfo(): ConnectionInfo;
}
```

### DatabasePersistence

```typescript
class DatabasePersistence {
  constructor(userId?: string);
  saveHistoryEntry(entry: HistoryEntry): Promise<boolean>;
  getHistoryEntries(limit?: number, offset?: number): Promise<HistoryEntry[]>;
  saveJob(job: Job): Promise<boolean>;
  updateJobStatus(jobId: string, status: JobStatus): Promise<boolean>;
  getActiveJobs(): Promise<Job[]>;
  saveConfiguration(config: Configuration): Promise<boolean>;
  getConfiguration(key?: string): Promise<Configuration[]>;
  startSession(workingDir: string, envVars: Record<string, string>): Promise<boolean>;
  endSession(): Promise<boolean>;
  testConnection(): Promise<boolean>;
  getSessionId(): string;
}
```

### CloudConfigManager

```typescript
class CloudConfigManager {
  constructor(options?: Partial<CloudConfigOptions>);
  get(key: string, defaultValue?: any): any;
  set(key: string, value: any, description?: string): void;
  getKeys(): string[];
  getAll(): ConfigValue[];
  has(key: string): boolean;
  delete(key: string): void;
  reset(): void;
  export(): string;
  import(configJson: string): void;
  getStats(): ConfigStats;
  setCloudSyncEnabled(enabled: boolean): void;
  destroy(): void;
}
```

### EnhancedHistorySystem

```typescript
class EnhancedHistorySystem extends HistorySystem {
  constructor(config?: Partial<EnhancedHistoryConfig>);
  addCommand(command: string, exitCode?: number): void;
  searchHistoryCloud(query: string, limit?: number): Promise<HistoryEntry[]>;
  getHistoryStats(): Promise<HistoryStats>;
  setCloudSyncEnabled(enabled: boolean): void;
  destroy(): void;
}
```

## Conclusion

The Supabase integration provides LSH with powerful cloud-based features for multi-device shell management. The implementation is designed to be secure, performant, and easy to use, while maintaining compatibility with existing LSH functionality.

For more information, see the source code in the `src/lib/` directory and the example implementations in `src/examples/`.