# LSH Architecture

This document describes the high-level architecture and module dependencies of the LSH framework.

## Overview

LSH is an encrypted secrets manager with automatic rotation, built on a shell framework with daemon scheduling capabilities.

```
┌─────────────────────────────────────────────────────────────────────┐
│                           CLI Layer                                  │
│  src/cli.ts - Command registration and option parsing               │
└─────────────────────────────────────────────────────────────────────┘
                                    │
          ┌─────────────────────────┼─────────────────────────┐
          ▼                         ▼                         ▼
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│   Commands       │    │    Services      │    │     Daemon       │
│  src/commands/   │    │  src/services/   │    │   src/daemon/    │
└──────────────────┘    └──────────────────┘    └──────────────────┘
          │                         │                         │
          └─────────────────────────┼─────────────────────────┘
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         Core Library                                 │
│                        src/lib/                                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │  Secrets    │  │   Shell     │  │    Jobs     │  │    SaaS     │ │
│  │  Manager    │  │  Executor   │  │   Manager   │  │  Platform   │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                                    │
          ┌─────────────────────────┼─────────────────────────┐
          ▼                         ▼                         ▼
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│   Persistence    │    │    Constants     │    │    Utilities     │
│  Supabase/Local  │    │  src/constants/  │    │  Logger, Crypto  │
└──────────────────┘    └──────────────────┘    └──────────────────┘
```

## Module Dependency Graph

### Entry Points

| File | Purpose |
|------|---------|
| `src/cli.ts` | Main CLI entry, registers all commands |
| `src/app.tsx` | React/Ink terminal UI (interactive features) |
| `src/daemon/lshd.ts` | Daemon entry point |

### Core Library (`src/lib/`)

#### Secrets Management (Primary Feature)
```
secrets-manager.ts
├── supabase-client.ts (cloud storage)
├── database-persistence.ts (local storage)
└── Uses: AES-256 encryption
```

#### Shell Components
```
shell-executor.ts (AST execution)
├── shell-parser.ts (command parsing → AST)
├── builtin-commands.ts (cd, echo, export, etc.)
├── variable-expansion.ts ($VAR expansion)
├── pathname-expansion.ts (glob patterns)
└── brace-expansion.ts ({a,b,c})
```

#### ZSH Compatibility
```
zsh-compatibility.ts (coordinator)
├── extended-globbing.ts (**, ^pattern)
├── extended-parameter-expansion.ts
├── associative-arrays.ts
├── zsh-options.ts
├── zsh-import-manager.ts
└── theme-manager.ts (Oh-My-Zsh)
```

#### Job Management
```
base-job-manager.ts (abstract base)
├── job-manager.ts (concrete implementation)
├── cron-job-manager.ts (scheduling)
└── daemon/job-registry.ts (execution tracking)
```

#### SaaS Platform
```
saas-types.ts (type definitions)
├── saas-auth.ts (authentication)
├── saas-organizations.ts (orgs & teams)
├── saas-secrets.ts (multi-tenant secrets)
├── saas-billing.ts (Stripe integration)
├── saas-encryption.ts (per-team keys)
└── saas-audit.ts (audit logging)
```

#### Database Layer
```
database-types.ts (Supabase record types)
├── supabase-client.ts (client config)
├── database-persistence.ts (PostgreSQL ops)
├── local-storage-adapter.ts (JSON fallback)
└── database-schema.ts (schema definitions)
```

#### Security
```
command-validator.ts (injection prevention)
└── env-validator.ts (startup validation)
```

#### Error Handling
```
lsh-error.ts
├── LSHError class
├── ErrorCodes constants
└── extractErrorMessage/Details utilities
```

### Services (`src/services/`)

| Service | Purpose | Key File |
|---------|---------|----------|
| `daemon/` | Daemon start/stop/status | `daemon.ts` |
| `cron/` | Cron job management | `cron.ts` |
| `api/` | API server commands | `api.ts` |
| `secrets/` | Push/pull secrets | `secrets.ts` |
| `supabase/` | Supabase commands | `supabase.ts` |

### Daemon (`src/daemon/`)

```
lshd.ts (LSHJobDaemon class)
├── api-server.ts (REST API)
├── job-registry.ts (execution tracking)
└── Uses: Unix socket for IPC
```

### CI/CD (`src/cicd/`)

```
webhook-receiver.ts (GitHub/GitLab/Jenkins)
├── analytics.ts (build trends)
├── cache-manager.ts (build cache)
├── auth.ts (JWT verification)
├── performance-monitor.ts
└── dashboard/ (HTML monitoring UI)
```

### Constants (`src/constants/`)

| File | Purpose |
|------|---------|
| `index.ts` | Re-exports all constants |
| `paths.ts` | File paths, socket paths |
| `errors.ts` | Error messages |
| `commands.ts` | CLI command names |
| `config.ts` | Default configuration |
| `env-vars.ts` | Environment variable names |
| `tables.ts` | Database table names |
| `api.ts` | API endpoints, headers |
| `regex.ts` | Validation patterns |

## Data Flow

### Secrets Push Flow
```
CLI (lsh push)
    │
    ▼
secrets/secrets.ts (command handler)
    │
    ▼
secrets-manager.ts
    ├── Read .env file
    ├── Encrypt with AES-256
    │
    ▼
supabase-client.ts
    │
    ▼
Supabase PostgreSQL
```

### Secrets Pull Flow
```
CLI (lsh pull)
    │
    ▼
secrets/secrets.ts
    │
    ▼
secrets-manager.ts
    │
    ▼
supabase-client.ts
    │
    ▼
Decrypt
    │
    ▼
Write .env file
```

### Daemon Job Execution
```
CLI (lsh cron add)
    │
    ▼
cron/cron.ts
    │
    ▼
daemon-client.ts ──IPC──► lshd.ts (daemon)
                              │
                              ▼
                         cron-job-manager.ts
                              │
                              ▼
                         shell-executor.ts
                              │
                              ▼
                         job-registry.ts (track result)
```

## Type System

### Domain Types vs Database Types

```
saas-types.ts (Domain)          database-types.ts (Database)
─────────────────────           ──────────────────────────
Organization                    DbOrganizationRecord
  .createdAt: Date                .created_at: string
  .subscriptionTier: enum         .subscription_tier: string
                    ▲
                    │
              mapDbOrgToOrg()
                    │
                    ▼
            Supabase Query Result
```

### Error Types

```
lsh-error.ts
├── LSHError (structured error class)
│   ├── code: ErrorCode
│   ├── message: string
│   ├── context?: Record<string, unknown>
│   └── statusCode: number
│
├── ErrorCodes (constant strings)
│   ├── AUTH_*
│   ├── SECRETS_*
│   ├── DB_*
│   └── ...
│
└── Utilities
    ├── extractErrorMessage(unknown): string
    ├── extractErrorDetails(unknown): object
    └── isLSHError(unknown, code?): boolean
```

## Key Patterns

### 1. Database Response Handling
```typescript
// Always check error first
const { data, error } = await supabase.from('table').select();
if (error) throw new LSHError(ErrorCodes.DB_QUERY_FAILED, error.message);

// Map to domain type
return this.mapDbRecordToDomainObject(data);
```

### 2. Error Handling in Catch Blocks
```typescript
try {
  await riskyOperation();
} catch (error) {
  // Use utility instead of type assertion
  console.error('Failed:', extractErrorMessage(error));
  throw wrapAsLSHError(error, ErrorCodes.INTERNAL_ERROR);
}
```

### 3. Command Registration
```typescript
// In src/services/myfeature/myfeature.ts
export function init_myfeature(program: Command) {
  program
    .command('myfeature <arg>')
    .description('Description')
    .option('-f, --flag', 'Flag description')
    .action(async (arg, options) => {
      // Implementation
    });
}

// In src/cli.ts
import { init_myfeature } from './services/myfeature/myfeature.js';
init_myfeature(program);
```

### 4. Job Specification
```typescript
const job: Partial<BaseJobSpec> = {
  name: 'my-job',
  command: 'echo "hello"',
  schedule: {
    cron: '0 2 * * *', // Daily at 2am
  },
  tags: ['secrets', 'rotation'],
  timeout: 60000, // 1 minute
};
await jobManager.createJob(job);
```

## Testing Strategy

### Unit Tests
- Located in `src/__tests__/` and adjacent to source files
- Use Jest with ts-jest preset
- Mock Supabase for SaaS tests

### Integration Tests
- Test CLI commands end-to-end
- Test daemon IPC communication
- Test secrets encryption/decryption round-trip

### Test Coverage Targets
- Security modules: 100% (command-validator, env-validator)
- Core library: 70%+
- Services: 60%+

## Security Considerations

1. **Command Validation**: All user commands pass through `command-validator.ts`
2. **Environment Validation**: Startup checks via `env-validator.ts`
3. **Webhook Verification**: HMAC signatures for CI/CD webhooks
4. **Secrets Encryption**: AES-256-CBC for all stored secrets
5. **JWT Authentication**: Signed tokens for API access

## Adding New Features

### Checklist

1. [ ] Create types in appropriate file (`saas-types.ts` or new)
2. [ ] Add database types to `database-types.ts` if needed
3. [ ] Implement in `src/lib/` with proper error handling
4. [ ] Create service in `src/services/` for CLI integration
5. [ ] Register command in `src/cli.ts`
6. [ ] Add constants to `src/constants/`
7. [ ] Write tests
8. [ ] Update this document if architecture changes
