# LSH Feature Trace: Scheduled Secret Rotation via Daemon

This document traces the complete execution path for a feature that touches every major layer of LSH - from CLI entry to daemon execution to database persistence.

## Feature Overview

**Command sequence being traced:**
```bash
lsh daemon start
lsh cron add --name "rotate-secrets" --schedule "0 2 * * 0" --command "lsh push --env prod"
# Daemon executes at 2 AM every Sunday
```

**Layers touched:** CLI → Command Registration → IPC → Daemon → Job Manager → Shell Execution → Secrets Manager → Database Persistence

---

## Phase 1: Daemon Startup (`lsh daemon start`)

| Step | Function | File | What It Does |
|------|----------|------|--------------|
| 1 | `program.parse(process.argv)` | `src/cli.ts:259` | Commander.js routes to daemon start |
| 2 | `init_daemon(program)` | `src/services/daemon/daemon.ts:9-12` | Registers all daemon commands |
| 3 | `DaemonCommandRegistrar.register()` | `src/services/daemon/daemon-registrar.ts:27-33` | Sets up start/stop/status subcommands |
| 4 | `registerDaemonControlCommands()` | `src/services/daemon/daemon-registrar.ts:57-72` | Spawns detached daemon process |
| 5 | `LSHJobDaemon.start()` | `src/daemon/lshd.ts:96+` | Creates Unix socket, initializes JobManager |
| 6 | `JobManager constructor` | `src/lib/job-manager.ts:68-74` | Loads persisted jobs, starts scheduler |
| 7 | `JobManager.startScheduler()` | `src/lib/job-manager.ts:487-495` | 60-second interval to check scheduled jobs |

### Key Insights - Phase 1

- The daemon uses `spawn(..., { detached: true })` so the CLI can exit while the daemon continues running
- Unix sockets provide fast IPC without network overhead
- The 60-second scheduler interval is a balance between responsiveness and CPU usage

---

## Phase 2: Creating Scheduled Job (`lsh cron add ...`)

### CLI Side

| Step | Function | File | What It Does |
|------|----------|------|--------------|
| 8 | `init_cron(program)` | `src/services/cron/cron.ts:9-12` | Registers cron commands |
| 9 | `CronCommandRegistrar.register()` | `src/services/cron/cron-registrar.ts:21-27` | Creates cron command tree |
| 10 | `registerJobManagementCommands()` | `src/services/cron/cron-registrar.ts:90-196` | Handles `cron add` action |
| 11 | `BaseCommandRegistrar.withCronManager()` | `src/lib/base-command-registrar.ts:223-244` | Creates CronJobManager, manages lifecycle |
| 12 | `CronJobManager.connect()` | `src/lib/cron-job-manager.ts:124-131` | Establishes IPC socket to daemon |
| 13 | `CronJobManager.createCustomJob()` | `src/lib/cron-job-manager.ts:173-178` | Wraps job spec with database sync flag |
| 14 | `DaemonClient.createDatabaseCronJob()` | `src/lib/daemon-client.ts:540-560` | Creates job with persistence enabled |
| 15 | `DaemonClient.createCronJob()` | `src/lib/daemon-client.ts:346-374` | Transforms spec and sends IPC message |
| 16 | `DaemonClient.sendMessage()` | `src/lib/daemon-client.ts:~200` | JSON over Unix socket with request ID |

### Daemon Side (receives IPC)

| Step | Function | File | What It Does |
|------|----------|------|--------------|
| 17 | `LSHJobDaemon.setupIPC()` | `src/daemon/lshd.ts:90` | Routes incoming IPC by command type |
| 18 | `LSHJobDaemon.addJob()` | `src/daemon/lshd.ts:224-228` | IPC handler delegates to JobManager |
| 19 | `JobManager.createJob()` | `src/lib/job-manager.ts:86-90` | Creates job in memory, persists |
| 20 | `JobManager.persistJobs()` | `src/lib/job-manager.ts:473-485` | Writes to `/tmp/lsh-daemon-jobs-$USER.json` |
| 21 | `DatabasePersistence.saveJob()` | `src/lib/database-persistence.ts` | Saves to Supabase (if configured) |

### Key Insights - Phase 2

- The `withCronManager()` pattern ensures connections are cleaned up even if errors occur
- IPC messages include unique IDs so responses can be matched to requests (important for async)
- Jobs are stored in three places: memory (fast), filesystem (daemon restart), database (team sync)

---

## Phase 3: Daemon Executes Job (at 2 AM Sunday)

| Step | Function | File | What It Does |
|------|----------|------|--------------|
| 22 | `JobManager.checkScheduledJobs()` | `src/lib/job-manager.ts:497-517` | Every 60s, checks if `nextRun <= now` |
| 23 | `JobManager.startJob()` | `src/lib/job-manager.ts:128-217` | Spawns subprocess for job command |
| 24 | `spawn('sh', ['-c', command])` | Node.js child_process | Executes `lsh push --env prod` |
| 25 | **[Subprocess]** `program.parse()` | `src/cli.ts:259` | New LSH process handles push |
| 26 | `SecretsManager.push()` | `src/lib/secrets-manager.ts` | Encrypts and uploads secrets |
| 27 | Process exit handler | `src/lib/job-manager.ts:177-191` | Captures exit code, updates status |
| 28 | `JobManager.persistJobs()` | `src/lib/job-manager.ts:473-485` | Saves completed status |
| 29 | `DaemonClient.syncJobToDatabase()` | `src/lib/daemon-client.ts:520-535` | Records execution to Supabase |

### Key Insights - Phase 3

- Each job runs in an isolated subprocess - if a job crashes, the daemon survives
- The secrets push runs as a completely separate LSH instance (not the daemon)
- Status transitions: `created` → `running` → `completed`/`failed`/`killed`

---

## Visual Call Graph

```
┌─────────────────────────────────────────────────────────────────────┐
│  PHASE 1: lsh daemon start                                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  cli.ts                                                             │
│    └── init_daemon()                                                │
│          └── DaemonCommandRegistrar.register()                      │
│                └── registerDaemonControlCommands()                  │
│                      └── spawn('node', ['dist/daemon/lshd.js'])     │
│                            │                                        │
│                            ▼  [DETACHED PROCESS]                    │
│                      LSHJobDaemon.start()                           │
│                        ├── setupLogging()                           │
│                        ├── setupIPC()  ←─────────┐                  │
│                        └── JobManager()          │                  │
│                              └── startScheduler()│                  │
│                                    │             │                  │
│                                    ▼             │                  │
│                            checkScheduledJobs()  │   (every 60s)    │
│                                                  │                  │
├──────────────────────────────────────────────────┼──────────────────┤
│  PHASE 2: lsh cron add                           │                  │
├──────────────────────────────────────────────────┼──────────────────┤
│                                                  │                  │
│  cli.ts                                          │                  │
│    └── init_cron()                               │                  │
│          └── CronCommandRegistrar.register()     │                  │
│                └── registerJobManagementCommands()                  │
│                      └── withCronManager()       │                  │
│                            └── CronJobManager    │                  │
│                                  └── connect()───┘                  │
│                                  └── createCustomJob()              │
│                                        └── DaemonClient             │
│                                              └── createCronJob()    │
│                                                    └── sendMessage()│
│                                                          │          │
│                                                          ▼  [IPC]   │
│                                        LSHJobDaemon.addJob()        │
│                                              └── JobManager.createJob()
│                                                    └── persistJobs()│
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│  PHASE 3: Daemon executes at scheduled time                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  [Scheduler tick at 2 AM Sunday]                                    │
│                                                                     │
│  JobManager.checkScheduledJobs()                                    │
│    └── startJob(jobId)                                              │
│          └── spawn('sh', ['-c', 'lsh push --env prod'])             │
│                │                                                    │
│                ▼  [SUBPROCESS - new LSH instance]                   │
│          cli.ts                                                     │
│            └── push command                                         │
│                  └── SecretsManager.push()                          │
│                        ├── readEnvFile()                            │
│                        ├── encryptSecrets()                         │
│                        └── uploadToSupabase()                       │
│                │                                                    │
│                ▼  [Process exits]                                   │
│          exit handler                                               │
│            └── updateJobStatus('completed')                         │
│                  └── persistJobs()                                  │
│                  └── syncJobToDatabase()                            │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow Diagram

```
User Input
   ↓
[1] CLI (cli.ts) parses "lsh daemon start"
   ↓
[2] DaemonCommandRegistrar.register()
   ↓
[3] spawn('node dist/daemon/lshd.js') - detached process
   ↓
[4] LSHJobDaemon.start()
   ├→ JobManager initialized
   ├→ setupIPC() - creates Unix socket
   ├→ startScheduler() - every 60s check loop
   └→ Daemon listening for messages
   ↓
   ════════════════════════════════
   ↓
User runs "lsh cron add --name rotate-secrets --schedule '0 2 * * 0' --command 'lsh push --env prod'"
   ↓
[5] CronCommandRegistrar routes to create-from-template
   ↓
[6] CronJobManager.createCustomJob()
   ↓
[7] DaemonClient.createDatabaseCronJob()
   ↓
[8] DaemonClient.sendMessage('addJob') via IPC socket
   ↓
[9] LSHJobDaemon receives IPC, calls addJob()
   ↓
[10] JobManager.createJob() - creates in-memory job
   ↓
[11] persistJobs() - writes to /tmp/lsh-daemon-jobs-${USER}.json
   ↓
[12] DatabasePersistence.saveJob() (if Supabase configured)
   ↓
Job stored, IPC response sent back to CLI
   ↓
   ════════════════════════════════
   ↓
[Daemon continues running. Every 60 seconds:]
   ↓
[13] checkScheduledJobs() runs
   ↓
[IF schedule time reached at 2 AM Sunday:]
   ↓
[14] startJob(jobId)
   ↓
[15] spawn('sh', ['-c', 'lsh push --env prod'])
   ↓
[16] Subprocess executes secrets push
   ↓
[17] Process exit handler captures output
   ↓
[18] persistJobs() + syncJobToDatabase() (if enabled)
   ↓
Job execution complete, next run scheduled for next week
```

---

## Module Dependency Graph

```
cli.ts (entry point)
├── init_daemon() → daemon.ts
│   └── DaemonCommandRegistrar
│       └── registers "daemon start" command
│           └── spawn() → lshd.ts (separate process)
│
├── init_cron() → cron.ts
│   └── CronCommandRegistrar
│       └── registers "cron add/create-from-template" command
│           └── withCronManager()
│               └── CronJobManager
│                   ├── connect() → DaemonClient
│                   │   └── Unix socket IPC
│                   └── createDatabaseCronJob()
│                       └── DaemonClient.sendMessage()
│                           ↓ (IPC to daemon)
│
lshd.ts (daemon process - running continuously)
├── LSHJobDaemon
│   ├── setupIPC() - Unix socket server
│   ├── addJob() handler
│   └── startJob() handler
│       └── JobManager (in-memory job execution)
│           ├── createJob() → storage
│           ├── persistJobs() → filesystem
│           ├── startJob() → spawn subprocess
│           ├── checkScheduledJobs() → scheduler loop
│           └── stopJob() / killJob()
│
Database Layer (optional)
├── DatabasePersistence
│   └── saveJob() → Supabase PostgreSQL
└── DaemonClient
    └── syncJobToDatabase() → DatabasePersistence
```

---

## Critical Functions Summary

| Function | File | Lines | Purpose |
|----------|------|-------|---------|
| `program.parse()` | cli.ts | 259 | CLI entry point, parses args |
| `init_daemon()` | services/daemon/daemon.ts | 9-12 | Register daemon commands |
| `init_cron()` | services/cron/cron.ts | 9-12 | Register cron commands |
| `DaemonCommandRegistrar.register()` | services/daemon/daemon-registrar.ts | 27-33 | Register daemon subcommands |
| `CronCommandRegistrar.register()` | services/cron/cron-registrar.ts | 21-27 | Register cron subcommands |
| `LSHJobDaemon.start()` | daemon/lshd.ts | 96+ | Start daemon process |
| `LSHJobDaemon.setupIPC()` | daemon/lshd.ts | 90 (call) | Setup Unix socket server |
| `JobManager.constructor()` | lib/job-manager.ts | 68-74 | Initialize job manager |
| `JobManager.startScheduler()` | lib/job-manager.ts | 487-495 | Start 60s scheduler loop |
| `DaemonClient.createDatabaseCronJob()` | lib/daemon-client.ts | 540-560 | Create database-backed job |
| `DaemonClient.createCronJob()` | lib/daemon-client.ts | 346-374 | Create cron job in daemon |
| `DaemonClient.sendMessage()` | lib/daemon-client.ts | ~200+ | Send IPC message to daemon |
| `LSHJobDaemon.addJob()` | daemon/lshd.ts | 224-228 | IPC handler for job creation |
| `BaseJobManager.createJob()` | lib/base-job-manager.ts | - | Create job in storage |
| `JobManager.persistJobs()` | lib/job-manager.ts | 473-485 | Persist jobs to JSON file |
| `JobManager.checkScheduledJobs()` | lib/job-manager.ts | 497-517 | Check and trigger scheduled jobs |
| `JobManager.startJob()` | lib/job-manager.ts | 128-217 | Execute job as subprocess |
| `DatabasePersistence.saveJob()` | lib/database-persistence.ts | - | Save to Supabase (optional) |

---

## Service Layer Breakdown

### CLI Layer
- **Entry:** cli.ts
- **Responsibility:** Parse arguments, register commands, dispatch to handlers
- **Exits:** After command execution (daemon runs detached)

### Command Registrar Layer
- **Files:** daemon-registrar.ts, cron-registrar.ts, base-command-registrar.ts
- **Responsibility:** Register CLI subcommands, handle options, coordinate with services
- **Calls:** Service managers via `withDaemonAction()` / `withCronManager()`

### IPC Communication Layer
- **Files:** daemon-client.ts, daemon-client-helper.ts
- **Responsibility:** Send/receive messages over Unix socket
- **Protocol:** JSON messages with unique IDs for request-response pairing

### Daemon Layer
- **File:** daemon/lshd.ts
- **Responsibility:** Long-running process that manages jobs
- **Operations:** IPC server, job execution, signal handling

### Job Management Layer
- **Files:** job-manager.ts, base-job-manager.ts, cron-job-manager.ts
- **Responsibility:** CRUD for jobs, scheduling, execution, persistence
- **Storage:** Memory + filesystem + database (optional)

### Persistence Layer
- **Files:** database-persistence.ts, database-schema.ts
- **Responsibility:** Optional integration with Supabase PostgreSQL
- **Uses:** Supabase client for cloud storage

---

## Security Checkpoints

1. **Command Validation** (lib/command-validator.ts)
   - Called in `LSHJobDaemon.triggerJob()` before execution
   - Prevents injection attacks
   - Configurable via `LSH_ALLOW_DANGEROUS_COMMANDS`

2. **Environment Validation** (lib/env-validator.ts)
   - Validates environment at daemon startup
   - Ensures production secrets are configured

3. **File Permissions**
   - Jobs file: 0o600 (read-write owner only)
   - Socket file: Unix socket permissions

4. **IPC Socket Access**
   - Socket file owned by daemon user
   - Client must have read-write permissions

---

## Files to Study (Recommended Order)

For hands-on tracing, read these files in sequence:

```
1. src/cli.ts                              # Entry point - see how commands are registered
2. src/services/daemon/daemon.ts           # How daemon commands are initialized
3. src/services/daemon/daemon-registrar.ts # How daemon start spawns process
4. src/daemon/lshd.ts                      # The daemon process itself
5. src/lib/job-manager.ts                  # Core job CRUD and scheduling
6. src/services/cron/cron-registrar.ts     # How cron add creates jobs
7. src/lib/cron-job-manager.ts             # Cron-specific job logic
8. src/lib/daemon-client.ts                # IPC communication with daemon
9. src/lib/database-persistence.ts         # Supabase integration
10. src/lib/secrets-manager.ts             # The actual secrets push logic
```

---

## Key Patterns to Notice

### 1. Command Registrar Pattern

All commands use `*-registrar.ts` classes that extend `BaseCommandRegistrar`:

```typescript
export class DaemonCommandRegistrar extends BaseCommandRegistrar {
  register(program: Command): void {
    const daemonCmd = program.command('daemon').description('...');
    this.registerDaemonControlCommands(daemonCmd);
  }
}
```

### 2. withManager Pattern

Resource lifecycle management ensures cleanup:

```typescript
await withCronManager(async (manager) => {
  // manager.connect() called automatically
  await manager.createCustomJob(spec);
  // manager.disconnect() called automatically, even on error
});
```

### 3. IPC Request-Response

Messages include unique IDs for async matching:

```typescript
const messageId = crypto.randomUUID();
const message = { id: messageId, command: 'addJob', payload: jobSpec };
// Send and wait for response with matching ID
```

### 4. Three-Tier Persistence

Jobs are stored at multiple levels for different purposes:

```
Memory (this.jobs Map)     → Fast access during runtime
   ↓
Filesystem (JSON file)     → Survives daemon restart
   ↓
Database (Supabase)        → Team sync, audit trail, history
```

---

## Execution Timing

**Phase 1 (Daemon Startup):** ~200ms
- CLI initialization → Daemon spawn (detached)

**Phase 2 (Job Creation):** ~50-100ms
- CLI command → IPC message → Daemon creates job → Response back

**Phase 3 (Execution at scheduled time):**
- Scheduler checks every 60 seconds
- When schedule time matches: ~500-1500ms for job execution
  - Process spawn: ~50ms
  - Secrets push command: ~300-1000ms (depends on network)
  - Process cleanup: ~50ms

---

## Extension Points

### Adding New Job Types

1. Modify `JobSpec.type` in job-manager.ts
2. Extend `startJob()` logic in job-manager.ts (lines 142-155)

### Custom Scheduling

1. Modify `checkScheduledJobs()` in job-manager.ts
2. Implement different schedule evaluation logic

### Database Integration

1. DatabasePersistence already supports Supabase
2. Enable via environment variables (SUPABASE_URL, SUPABASE_ANON_KEY)

### Job Retry Logic

1. Already implemented via `maxRetries` field
2. Retry handler can be enhanced in job completion logic

---

## Summary

The feature trace shows a sophisticated multi-process architecture:

1. **CLI process** handles user commands and exits immediately
2. **Daemon process** runs continuously in background
3. **IPC communication** allows safe job creation without daemon restart
4. **In-memory scheduler** checks jobs every 60 seconds
5. **Subprocess execution** isolates job execution from daemon
6. **Optional database persistence** provides audit trail and history

The design ensures:
- Daemon resilience (detached from CLI)
- Job isolation (subprocess execution)
- Secure communication (Unix socket + validation)
- Flexible scheduling (cron expressions)
- Optional cloud persistence (Supabase integration)
