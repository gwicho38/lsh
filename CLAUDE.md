# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

LSH is an **encrypted secrets manager** with automatic rotation, team sync, and multi-environment support. Built on a powerful shell framework with daemon scheduling, it enables secure credential management across development teams.

**Primary Feature: Secrets Management**
- AES-256 encrypted storage of .env files in Supabase/PostgreSQL
- Multi-environment support (dev/staging/production)
- Team collaboration with shared encryption keys
- Automatic secret rotation with scheduled jobs
- Push/pull sync across all development machines
- Masked viewing and audit capabilities

**Bonus Features (Built-in Shell Framework):**
- POSIX/ZSH-compatible shell with extended features
- Persistent job daemon with cron-style scheduling
- CI/CD webhook receiver (GitHub, GitLab, Jenkins)
- RESTful API with JWT authentication
- Electron-based dashboard for monitoring
- Command validation and security controls

**Positioning:** While LSH is a full-featured shell and automation platform, its primary focus is making secrets management simple, secure, and automated. The built-in daemon and scheduling features uniquely enable automatic secret rotation - something no other secrets manager has built-in.

## ML/Agent Context

For ML models and automation agents needing to understand and use this CLI:

- **`llms.txt`** - Machine-readable context file at repository root (standard format like robots.txt)
- **`lsh context`** - Runtime command that outputs comprehensive, structured usage documentation
- **`lsh context --json`** - JSON output for programmatic parsing

Quick context for agents:
```bash
# Get full context as text
lsh context

# Get context as JSON for parsing
lsh context --json

# Or read the static file
cat llms.txt
```

## Build & Development Commands

### Building
```bash
npm run build              # Compile TypeScript to dist/
npm run watch              # Watch mode for development
npm run typecheck          # Type checking without emit
npm run clean              # Remove dist/, build/, bin/ directories
```

### Testing
```bash
npm test                   # Run all tests with Jest
npm run test:coverage      # Run tests with coverage report
npm run test:integration   # Run integration tests only
npm test -- --clearCache   # Clear Jest cache if tests fail unexpectedly
```

**Test Location:** Tests are in `src/__tests__/` and adjacent to source files. Some tests are currently disabled in `jest.config.js` due to strict mode migration (see `testPathIgnorePatterns`).

**Current Coverage:** ~11% baseline (target: 70% per Issue #68). Well-tested modules include `command-validator.ts` (100%) and `env-validator.ts` (74%).

### Linting
```bash
npm run lint               # Lint with ESLint
npm run lint:fix           # Auto-fix lint issues
```

**Lint Configuration:** Uses flat config (`eslint.config.js`). Prefix unused variables with `_` to avoid lint errors.

### Running LSH
```bash
# After building
node dist/cli.js                              # Run shell
node dist/cli.js -i                           # Interactive mode
node dist/cli.js -c "echo hello"              # Execute command
node dist/cli.js -s script.sh                 # Execute script

# Or if globally linked
lsh                                           # Show help
lsh -i                                        # Interactive shell
lsh daemon start                              # Start persistent daemon
lsh cron list                                 # List scheduled jobs
lsh api start --port 3030                     # Start API server
```

### Daemon Operations
```bash
# Start/stop daemon
lsh daemon start
lsh daemon status
lsh daemon stop

# API server (requires LSH_API_ENABLED=true)
LSH_API_ENABLED=true LSH_API_PORT=3030 node dist/daemon/lshd.js start

# Check daemon logs
cat /tmp/lsh-job-daemon-$USER.log
```

## Secrets Management (Primary Feature)

LSH's primary focus is encrypted secrets management. When working on features, always consider how they relate to or enhance the secrets workflow.

### Quick Start with Secrets

```bash
# Generate encryption key
lsh key

# Push secrets to cloud
lsh push --env dev

# Pull on another machine
lsh pull --env dev

# Schedule automatic rotation
lsh cron add --name "rotate-keys" \
  --schedule "0 0 1 * *" \
  --command "./examples/secrets-rotation/rotate-api-keys.sh"
```

### Secrets Architecture

- **`src/lib/secrets-manager.ts`** - Core secrets management, AES-256 encryption
- **`src/services/secrets/secrets.ts`** - CLI commands for secrets operations
- **`examples/secrets-rotation/`** - Example scripts for automated rotation

### Key Implementation Details

1. **Encryption**: Uses AES-256-CBC with user-provided or machine-derived keys
2. **Storage**: Leverages existing `DatabasePersistence` layer (stores as jobs with command='secrets_sync')
3. **Multi-environment**: Separate storage by environment name (dev/staging/prod)
4. **Team Collaboration**: Shared `LSH_SECRETS_KEY` enables team sync
5. **Automatic Rotation**: Combines cron scheduling + daemon + secrets push/pull

### Integration Points

When adding features, consider secrets integration:
- Can this feature help with secret rotation?
- Should this feature respect secret environment variables?
- Could this feature expose secrets unintentionally?

### Secrets Documentation

- **[SECRETS_GUIDE.md](docs/features/secrets/SECRETS_GUIDE.md)** - Complete user guide
- **[SECRETS_QUICK_REFERENCE.md](docs/features/secrets/SECRETS_QUICK_REFERENCE.md)** - Quick reference for daily use
- **[SECRETS_CHEATSHEET.txt](SECRETS_CHEATSHEET.txt)** - Command cheatsheet
- **[examples/secrets-rotation/](examples/secrets-rotation/)** - Rotation examples and tutorials

## Architecture

### Entry Points
- **`src/cli.ts`** - Main CLI entry point, command registration, option parsing
- **`src/app.tsx`** - React/Ink terminal UI application (for interactive features)

### Core Shell Components
- **`src/lib/shell-executor.ts`** - AST execution engine, implements POSIX semantics
- **`src/lib/shell-parser.ts`** - Shell command parser, produces AST nodes
- **`src/lib/interactive-shell.ts`** - Interactive REPL with history and completion
- **`src/lib/builtin-commands.ts`** - POSIX builtin commands (cd, echo, export, etc.)
- **`src/lib/variable-expansion.ts`** - Variable and parameter expansion
- **`src/lib/pathname-expansion.ts`** - Glob pattern matching (*, ?, [])
- **`src/lib/brace-expansion.ts`** - Brace expansion ({a,b,c})

### ZSH Compatibility Features
- **`src/lib/zsh-compatibility.ts`** - ZSH-specific features coordination
- **`src/lib/extended-globbing.ts`** - Extended glob patterns (**, ^pattern, etc.)
- **`src/lib/extended-parameter-expansion.ts`** - Advanced parameter expansion
- **`src/lib/associative-arrays.ts`** - Associative array support
- **`src/lib/zsh-options.ts`** - ZSH option management
- **`src/lib/zsh-import-manager.ts`** - Import ZSH configs/themes
- **`src/lib/theme-manager.ts`** - Oh-My-Zsh theme support

### Job Management & Daemon
- **`src/lib/job-manager.ts`** - Job lifecycle management, CRUD operations for `JobSpec`
- **`src/lib/cron-job-manager.ts`** - Cron-style job scheduling with templates
- **`src/daemon/lshd.ts`** - Persistent daemon (`LSHJobDaemon` class), IPC via Unix socket
- **`src/daemon/api-server.ts`** - RESTful API (`LSHApiServer` class) with JWT auth
- **`src/lib/daemon-client.ts`** - Client for daemon IPC communication

### CI/CD & Webhooks
- **`src/cicd/webhook-receiver.ts`** - Webhook endpoint server, HMAC verification
- **`src/cicd/analytics.ts`** - Build analytics and trend analysis
- **`src/cicd/cache-manager.ts`** - Build cache management
- **`src/cicd/auth.ts`** - JWT authentication and authorization
- **`src/cicd/performance-monitor.ts`** - Performance metrics collection
- **`src/cicd/dashboard/`** - HTML/JS dashboards for monitoring

### Database & Persistence
- **`src/lib/database-persistence.ts`** - PostgreSQL persistence layer
- **`src/lib/supabase-client.ts`** - Supabase client configuration
- **`src/lib/database-schema.ts`** - Database schema definitions
- **`src/services/supabase/supabase.ts`** - Supabase command registration

### Security
- **`src/lib/command-validator.ts`** - Validates commands, prevents injection attacks
- **`src/lib/env-validator.ts`** - Environment variable validation at startup
- Both modules have comprehensive test coverage and should be used for all command execution

### Commands Registration
Commands are registered in `src/cli.ts` by importing service initializers:
- **`src/services/daemon/daemon.ts`** - `init_daemon()` registers daemon commands
- **`src/services/cron/cron.ts`** - `init_cron()` registers cron commands
- **`src/services/api/api.ts`** - `registerApiCommands()` registers API commands
- **`src/commands/self.ts`** - Self-management commands (version, update)
- **`src/commands/zsh-import.ts`** - `registerZshImportCommands()` for ZSH import
- **`src/commands/theme.ts`** - `registerThemeCommands()` for theme management

### Electron Desktop App
- **`src/electron/main.cjs`** - Electron main process
- Run with: `npm run electron` or `npm run dashboard`

## Environment Configuration

Copy `.env.example` to `.env` and configure:

**Required for Production:**
- `LSH_API_KEY` - API authentication (generate with `openssl rand -hex 32`)
- `LSH_JWT_SECRET` - JWT signing secret (generate with `openssl rand -hex 32`)
- `GITHUB_WEBHOOK_SECRET`, `GITLAB_WEBHOOK_SECRET`, `JENKINS_WEBHOOK_SECRET` (if webhooks enabled)

**Optional:**
- `SUPABASE_URL`, `SUPABASE_ANON_KEY` - For cloud persistence
- `DATABASE_URL` - PostgreSQL connection
- `REDIS_URL` - For caching
- `LSH_ALLOW_DANGEROUS_COMMANDS=false` - Security control (keep false in production)

**Startup Validation:** LSH validates environment variables at startup using `env-validator.ts` and fails fast if production secrets are missing or malformed.

## Key Development Patterns

### TypeScript Configuration
- **Target:** ES2022, Node.js 20.18.0+ required
- **Module System:** ES modules (`.js` extensions in imports required)
- **Strict Mode:** Partially enabled (see `tsconfig.json` comments for migration status)
- `noImplicitAny` is disabled (~150+ errors to fix in future)
- Prefix unused vars/args with `_` to satisfy linter

### Test Execution
- **Framework:** Jest with ts-jest preset
- **Import Mapping:** `moduleNameMapper` maps `.js` imports to `.ts` for testing
- **Run Command:** `node --experimental-vm-modules ./node_modules/.bin/jest`
- Some tests disabled in `jest.config.js` (see `testPathIgnorePatterns`) pending refactoring

### Adding New Commands
1. Create command module in `src/commands/` or `src/services/<feature>/`
2. Export initialization function that registers commands with `commander.Command`
3. Import and call init function in `src/cli.ts`
4. Example pattern:
   ```typescript
   export function init_myfeature(program: Command) {
     program
       .command('myfeature <arg>')
       .description('Description')
       .action(async (arg) => { /* implementation */ });
   }
   ```

### Job Management
- **Job Spec Interface:** `JobSpec` defined in `src/lib/job-manager.ts`
- **Job Types:** 'shell' | 'system' | 'scheduled' | 'service'
- **Job Status:** 'created' | 'running' | 'stopped' | 'completed' | 'failed' | 'killed'
- **Scheduling:** Jobs support cron expressions or interval-based scheduling
- **Persistence:** Jobs can be persisted to PostgreSQL/Supabase or local JSON file

### Security Best Practices
- **Always use `validateCommand()`** from `command-validator.ts` before executing user input
- **Always validate environment** with `validateEnvironment()` on daemon/API startup
- **Never bypass webhook HMAC verification** in production
- **Keep `LSH_ALLOW_DANGEROUS_COMMANDS=false`** in production
- See `README.md` Security Best Practices section for production deployment checklist

## Common Issues & Solutions

### Daemon Won't Start
```bash
# Check if already running
ps aux | grep lshd

# Remove stale PID file
rm /tmp/lsh-job-daemon-$USER.pid
```

### Tests Failing
```bash
# Clear Jest cache
npm test -- --clearCache

# Verify Node version
node --version  # Should be >= 20.18.0
```

### Import Errors in Tests
- Ensure `.js` extensions in imports (required for ES modules)
- Check `moduleNameMapper` in `jest.config.js` is mapping correctly

### TypeScript Errors
- Check `tsconfig.json` strict mode flags - some are disabled during migration
- Prefix unused variables with `_` to satisfy both TSC and ESLint

## CI/CD

### CRITICAL: CI Must Pass Before Work is Complete
**NEVER declare work complete until CI passes on GitHub.** This is a hard requirement.

### CI/CD Workflow
1. **Before starting work**: Check current CI status with `gh run list --limit 3`
2. **After pushing changes**: Monitor CI with `gh run watch` or `gh run list`
3. **If CI fails**: Fix immediately, push fix, wait for green CI
4. **Only after CI passes**: Declare the task complete

### CI Commands
```bash
gh run list --limit 5              # Check recent CI runs
gh run view <run-id> --log-failed  # View failure logs
gh run watch <run-id>              # Watch run in real-time
```

**GitHub Actions:** Workflows in `.github/workflows/`
- `node.js.yml` - Build and test
- `publish.yml` - Publish to npm
- `codacy.yml`, `njsscan.yml` - Security scanning

**Pre-commit:** Always run `npm run lint:fix` and `npm test` before committing.

## Release Process

```bash
# Build and publish (automated script)
./scripts/build-and-publish.sh

# Manual steps
npm run build
npm version patch|minor|major
npm publish --access public
git push && git push --tags
```

**Versioning:** M.m.s (Major.minor.patch)

## Documentation

- **README.md** - Main documentation, installation, quick start
- **INSTALL.md** - Installation instructions
- **docs/** - Feature-specific documentation organized by topic
  - `docs/features/` - Feature documentation
  - `docs/integration/` - Integration guides
  - `docs/development/` - Development guides
  - `docs/releases/` - Release notes with diffs (M.m.s.md format)

## Scripts

Located in `scripts/`:
- **`install-daemon.sh`** - Install daemon as system service
- **`setup-monitoring-jobs.sh`** - Setup monitoring cron jobs
- **`daemon-cleanup.sh`** - Clean up daemon processes/files
- **`build-and-publish.sh`** - Build and publish to npm
- **`release.sh`** - Create new release
- **`monitoring-jobs/`** - Monitoring job scripts

## Additional Notes

- **Electron Dashboards:** Access dashboards at `http://localhost:3034/dashboard/` when monitoring API is running
- **API Testing:** Use `test-api.js` to test API endpoints
- **ML Integration:** Supports integration with ML workflows (MCLI) - see `.env` for config
- **Data Archival:** Optional S3 or local archival (see `.env.example`)
- **Redis Caching:** Optional Redis integration for performance

## External Dependencies

Key libraries:
- **commander** - CLI framework
- **ink/react** - Terminal UI
- **@supabase/supabase-js** - Database client
- **express** - API server
- **node-cron** - Cron scheduling
- **jsonwebtoken** - JWT auth
- **zx** - Shell scripting utilities

For full dependency list see `package.json`.

## Common Code Patterns

This section documents patterns that AI assistants should follow when working with this codebase.

### Database Response Handling

All Supabase queries return `{ data, error }`. Always check error first:

```typescript
const { data, error } = await supabase.from('table').select('*').eq('id', id).single();

if (error) {
  throw new LSHError(ErrorCodes.DB_QUERY_FAILED, error.message, { table: 'table', id });
}

// Map to domain type
return this.mapDbRecordToDomainObject(data);
```

### Error Handling in Catch Blocks

Never use `(error as Error).message`. Use the error utilities from `lsh-error.ts`:

```typescript
import { extractErrorMessage, extractErrorDetails, LSHError, ErrorCodes } from './lsh-error.js';

try {
  await riskyOperation();
} catch (error) {
  // For logging
  console.error('Failed:', extractErrorMessage(error));

  // For structured logging
  this.logger.error('Operation failed', extractErrorDetails(error));

  // For re-throwing with context
  throw wrapAsLSHError(error, ErrorCodes.INTERNAL_ERROR, { operation: 'riskyOperation' });
}
```

### Type Mapping (Database → Domain)

Use types from `database-types.ts` for Supabase records and types from `saas-types.ts` for domain models:

```typescript
import type { DbOrganizationRecord } from './database-types.js';
import type { Organization } from './saas-types.js';

// Mapper function with proper types
private mapDbOrgToOrg(dbOrg: DbOrganizationRecord): Organization {
  return {
    id: dbOrg.id,
    name: dbOrg.name,
    createdAt: new Date(dbOrg.created_at),  // ISO string → Date
    subscriptionTier: dbOrg.subscription_tier,  // snake_case → camelCase
    // ... other fields
  };
}
```

### Adding New SaaS Features

1. Define domain types in `saas-types.ts`
2. Add database record types in `database-types.ts`
3. Implement service class in `saas-<feature>.ts`
4. Add mapper function with JSDoc explaining transformations
5. Register commands in `cli.ts`
6. Add constants to `src/constants/`
7. Write tests using fixtures from `src/__tests__/fixtures/`

### Using Test Fixtures

Test fixtures are in `src/__tests__/fixtures/`. Use factory functions for test data:

```typescript
import { mockOrganization, mockUser, createMockSupabase } from '../fixtures/supabase-mocks';
import { createTestJob, SAMPLE_JOBS } from '../fixtures/job-fixtures';

describe('MyService', () => {
  const mockSupabase = createMockSupabase({
    organizations: [mockOrganization({ name: 'Test Org' })],
    users: [mockUser({ email: 'test@example.com' })],
  });

  beforeEach(() => {
    jest.mock('../../lib/supabase-client', () => ({
      getSupabaseClient: () => mockSupabase,
    }));
  });

  it('should handle jobs', () => {
    const job = createTestJob({ name: 'my-job', command: 'echo test' });
    // ... test
  });
});
```

### Job Specification

Use `BaseJobSpec` for defining jobs:

```typescript
const job: Partial<BaseJobSpec> = {
  name: 'rotate-secrets',
  command: './scripts/rotate.sh',
  schedule: { cron: '0 2 * * 0' },  // Weekly at 2am Sunday
  tags: ['secrets', 'maintenance'],
  timeout: 300000,  // 5 minutes
  maxRetries: 3,
};

await jobManager.createJob(job);
```

### Constants Usage

Never hardcode strings. Use constants from `src/constants/`:

```typescript
import { ERROR_MESSAGES, ENV_VARS, TABLES, API_ENDPOINTS } from '../constants/index.js';

// Good
throw new Error(ERROR_MESSAGES.NOT_FOUND);
const apiKey = process.env[ENV_VARS.LSH_API_KEY];
await supabase.from(TABLES.ORGANIZATIONS).select();

// Bad - triggers eslint lsh/no-hardcoded-strings
throw new Error('Resource not found');
```

## Additional Documentation

- **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** - Module dependency graph and data flows
- **[docs/TYPE_SAFETY_TODO.md](docs/TYPE_SAFETY_TODO.md)** - TypeScript strict mode migration status
- **[src/__tests__/fixtures/README.md](src/__tests__/fixtures/README.md)** - Test fixture usage guide

## Release Notes

Every time you push a new release it should be a new release in GitHub and a new version published to npm.