# Constants Usage Guide

## Overview

All hard-coded strings in LSH should be extracted into the centralized constants files located in `src/constants/`. This guide shows you how to use these constants and provides refactoring examples.

## Why Use Constants?

1. **Maintainability**: Change a string once, update everywhere
2. **Consistency**: Ensures the same strings are used across the codebase
3. **Type Safety**: TypeScript can help catch typos
4. **Searchability**: Easy to find all usages
5. **Internationalization**: Easier to add i18n support later

## Available Constants

All constants are available from `src/constants/index.ts`:

```typescript
import {
  PATHS,          // File paths and system locations
  PREFIXES,       // String prefixes
  SYSTEM,         // System defaults
  ERRORS,         // Error messages
  RISK_LEVELS,    // Security risk levels
  ENV_VARS,       // Environment variable names
  DEFAULTS,       // Default values
  CLI,            // CLI names and descriptions
  COMMANDS,       // Command names
  JOB_COMMANDS,   // Job command types
  JOB_STATUSES,   // Job status values
  JOB_TYPES,      // Job types
  IPC_COMMANDS,   // Daemon IPC commands
  PLATFORMS,      // CI/CD platforms
  ENDPOINTS,      // API endpoints
  HTTP_HEADERS,   // HTTP header names
  CONTENT_TYPES,  // Content-Type values
  AUTH,           // Authentication constants
  SOCKET_EVENTS,  // Socket.io event names
  METRICS,        // Metrics names
  UI_MESSAGES,    // User-facing messages
  LOG_MESSAGES,   // Log messages
  LOG_LEVELS,     // Log levels
  DANGEROUS_PATTERNS,  // Security validation patterns
  WARNING_PATTERNS,    // Warning patterns
  TABLES,         // Database table names
} from './constants/index.js';
```

## Examples: Before and After

### Example 1: File Paths

**Before:**
```typescript
// src/lib/daemon-client.ts
constructor(socketPath?: string, userId?: string) {
  super();
  this.socketPath = socketPath || `/tmp/lsh-job-daemon-${process.env.USER || 'default'}.sock`;
  this.userId = userId;
  this.sessionId = `lsh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
```

**After:**
```typescript
// src/lib/daemon-client.ts
import { PATHS, PREFIXES, SYSTEM } from '../constants/index.js';

constructor(socketPath?: string, userId?: string) {
  super();
  const user = process.env.USER || SYSTEM.UNKNOWN_USER;
  this.socketPath = socketPath || PATHS.DAEMON_SOCKET_TEMPLATE.replace('${USER}', user);
  this.userId = userId;
  this.sessionId = `${PREFIXES.SESSION_ID}${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
```

### Example 2: Error Messages

**Before:**
```typescript
// src/lib/daemon-client.ts
if (!fs.existsSync(this.socketPath)) {
  reject(new Error(`Daemon socket not found at ${this.socketPath}. Is the daemon running?`));
  return;
}
```

**After:**
```typescript
// src/lib/daemon-client.ts
import { ERRORS } from '../constants/index.js';

if (!fs.existsSync(this.socketPath)) {
  const error = ERRORS.SOCKET_NOT_FOUND.replace('${socketPath}', this.socketPath);
  reject(new Error(error));
  return;
}
```

### Example 3: Environment Variables

**Before:**
```typescript
// src/lib/secrets-manager.ts
const secretsKey = process.env['LSH_SECRETS_KEY'];
const hostname = process.env['HOSTNAME'] || 'localhost';
const user = process.env['USER'] || 'unknown';
```

**After:**
```typescript
// src/lib/secrets-manager.ts
import { ENV_VARS, SYSTEM } from '../constants/index.js';

const secretsKey = process.env[ENV_VARS.LSH_SECRETS_KEY];
const hostname = process.env[ENV_VARS.HOSTNAME] || SYSTEM.DEFAULT_HOSTNAME;
const user = process.env[ENV_VARS.USER] || SYSTEM.UNKNOWN_USER;
```

### Example 4: API Endpoints

**Before:**
```typescript
// src/daemon/api-server.ts
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.post('/api/auth', authenticateRequest, (req, res) => {
  // ...
});
```

**After:**
```typescript
// src/daemon/api-server.ts
import { ENDPOINTS } from '../constants/index.js';

app.get(ENDPOINTS.HEALTH, (req, res) => {
  res.json({ status: 'ok' });
});

app.post(ENDPOINTS.AUTH, authenticateRequest, (req, res) => {
  // ...
});
```

### Example 5: HTTP Headers

**Before:**
```typescript
// src/daemon/api-server.ts
res.setHeader('Content-Type', 'text/event-stream');
res.setHeader('Cache-Control', 'no-cache');
res.setHeader('Connection', 'keep-alive');

const apiKey = req.headers['x-api-key'];
const authHeader = req.headers['authorization'];
```

**After:**
```typescript
// src/daemon/api-server.ts
import { HTTP_HEADERS, CONTENT_TYPES, CACHE_CONTROL_VALUES, CONNECTION_VALUES } from '../constants/index.js';

res.setHeader(HTTP_HEADERS.CONTENT_TYPE, CONTENT_TYPES.EVENT_STREAM);
res.setHeader(HTTP_HEADERS.CACHE_CONTROL, CACHE_CONTROL_VALUES.NO_CACHE);
res.setHeader(HTTP_HEADERS.CONNECTION, CONNECTION_VALUES.KEEP_ALIVE);

const apiKey = req.headers[HTTP_HEADERS.X_API_KEY];
const authHeader = req.headers[HTTP_HEADERS.AUTHORIZATION];
```

### Example 6: UI Messages

**Before:**
```typescript
// src/services/secrets/secrets.ts
console.log('✅ Pushed secrets to Supabase');
console.log('❌ Failed to push secrets:', error.message);
console.log('💡 Tip: Pull from cloud with: lsh pull --env <environment>');
```

**After:**
```typescript
// src/services/secrets/secrets.ts
import { UI_MESSAGES } from '../constants/index.js';

console.log(UI_MESSAGES.SECRETS_PUSHED);
console.log(UI_MESSAGES.FAILED_PUSH_SECRETS, error.message);
console.log(UI_MESSAGES.TIP_PULL_FROM_CLOUD);
```

### Example 7: Log Messages

**Before:**
```typescript
// src/daemon/lshd.ts
logger.log('INFO', 'Starting LSH Job Daemon');
logger.log('INFO', `Daemon started with PID ${process.pid}`);
logger.log('ERROR', 'Environment validation failed in production');
```

**After:**
```typescript
// src/daemon/lshd.ts
import { LOG_MESSAGES, LOG_LEVELS } from '../constants/index.js';

logger.log(LOG_LEVELS.INFO, LOG_MESSAGES.DAEMON_STARTING);
const msg = LOG_MESSAGES.DAEMON_STARTED.replace('${pid}', String(process.pid));
logger.log(LOG_LEVELS.INFO, msg);
logger.log(LOG_LEVELS.ERROR, LOG_MESSAGES.ENV_VALIDATION_FAILED);
```

### Example 8: Command Names

**Before:**
```typescript
// src/services/secrets/secrets.ts
program
  .command('push')
  .description('Push secrets to cloud')
  .action(async () => { /* ... */ });

program
  .command('pull')
  .description('Pull secrets from cloud')
  .action(async () => { /* ... */ });
```

**After:**
```typescript
// src/services/secrets/secrets.ts
import { COMMANDS } from '../constants/index.js';

program
  .command(COMMANDS.PUSH)
  .description('Push secrets to cloud')
  .action(async () => { /* ... */ });

program
  .command(COMMANDS.PULL)
  .description('Pull secrets from cloud')
  .action(async () => { /* ... */ });
```

### Example 9: Database Tables

**Before:**
```typescript
// src/lib/database-persistence.ts
const result = await this.client
  .from('shell_history')
  .select('*')
  .eq('user_id', userId);

await this.client
  .from('shell_jobs')
  .insert({ id, name, command });
```

**After:**
```typescript
// src/lib/database-persistence.ts
import { TABLES } from '../constants/index.js';

const result = await this.client
  .from(TABLES.SHELL_HISTORY)
  .select('*')
  .eq('user_id', userId);

await this.client
  .from(TABLES.SHELL_JOBS)
  .insert({ id, name, command });
```

### Example 10: Template Strings with Multiple Variables

**Before:**
```typescript
// src/lib/secrets-manager.ts
console.log(`Pushing ${envFilePath} to Supabase (${environment})...`);
console.log(`✅ Pushed ${Object.keys(env).length} secrets from ${filename} to Supabase`);
```

**After:**
```typescript
// src/lib/secrets-manager.ts
import { LOG_MESSAGES } from '../constants/index.js';

const msg1 = LOG_MESSAGES.PUSHING_SECRETS
  .replace('${envFilePath}', envFilePath)
  .replace('${environment}', environment);
console.log(msg1);

const msg2 = LOG_MESSAGES.SECRETS_PUSHED
  .replace('${count}', String(Object.keys(env).length))
  .replace('${filename}', filename);
console.log(msg2);
```

**Alternative (Helper Function):**
```typescript
// src/lib/string-utils.ts
export function formatMessage(template: string, vars: Record<string, string | number>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(`\${${key}}`, String(value));
  }
  return result;
}

// Usage:
import { formatMessage } from '../lib/string-utils.js';
import { LOG_MESSAGES } from '../constants/index.js';

console.log(formatMessage(LOG_MESSAGES.PUSHING_SECRETS, {
  envFilePath,
  environment
}));

console.log(formatMessage(LOG_MESSAGES.SECRETS_PUSHED, {
  count: Object.keys(env).length,
  filename
}));
```

## ESLint Rule

The custom ESLint rule `lsh/no-hardcoded-strings` will catch hard-coded strings and enforce the use of constants.

### Rule Configuration

```javascript
// eslint.config.js
'lsh/no-hardcoded-strings': ['error', {
  minLength: 3,                    // Minimum string length to enforce
  allowTemplateStrings: true,      // Allow template strings with expressions
  constantsPaths: ['/constants/'], // Paths to constants files
  allowedStrings: [                // Exceptions
    'GET', 'POST', 'PUT', 'DELETE',
    'utf8', 'localhost',
    '.js', '.ts', '.json',
  ]
}]
```

### Exceptions

The following are automatically allowed:
- Strings in test files (`*.test.ts`, `*.spec.ts`, `__tests__/`)
- Strings in constants files (`src/constants/`)
- Import/export paths
- Type annotations
- Very short strings (< 3 characters by default)
- Template strings with variables
- Property keys in objects

### Example Lint Errors

❌ **Will trigger error:**
```typescript
throw new Error('Daemon is already running');
const path = '/tmp/lsh-job-daemon.sock';
console.log('Starting LSH Job Daemon');
```

✅ **Won't trigger error:**
```typescript
import { ERRORS } from '../constants/index.js';
throw new Error(ERRORS.DAEMON_ALREADY_RUNNING);

import { PATHS } from '../constants/index.js';
const path = PATHS.DAEMON_SOCKET_TEMPLATE;

import { LOG_MESSAGES } from '../constants/index.js';
console.log(LOG_MESSAGES.DAEMON_STARTING);
```

## Migration Strategy

1. **Phase 1: Add Imports** - Add constant imports to files
2. **Phase 2: Replace Strings** - Replace hard-coded strings with constants
3. **Phase 3: Test** - Run tests to ensure nothing broke
4. **Phase 4: Enable Linter** - Enforce the rule in CI/CD

### Recommended Refactoring Order

1. Error messages (high impact on maintainability)
2. File paths and system locations (critical for portability)
3. Environment variable names (prevents typos)
4. API endpoints and HTTP headers (prevents API bugs)
5. Command names (consistency in CLI)
6. UI messages (easier i18n in future)
7. Database table names (prevents SQL errors)
8. Log messages (lower priority)

## Best Practices

### DO ✅

- Always import from `src/constants/index.js`
- Use descriptive constant names in SCREAMING_SNAKE_CASE
- Group related constants together
- Use template variable syntax `${varName}` for dynamic parts
- Add comments for complex or non-obvious constants

### DON'T ❌

- Don't hard-code strings directly in the code
- Don't create duplicate constants in multiple files
- Don't use constants for truly one-off strings (e.g., debug logs during development)
- Don't over-engineer - single-character separators can be inline

### When NOT to Use Constants

It's OK to use hard-coded strings for:
- Single characters: `','`, `' '`, `'\n'`
- Debug/development logs that won't be in production
- Very short separators: `' - '`, `': '`
- Property keys in small, local objects
- Test assertions and mock data

## Adding New Constants

When adding new constants:

1. Choose the appropriate constants file:
   - `paths.ts` - File paths, directories
   - `errors.ts` - Error messages
   - `commands.ts` - Command names, CLI strings
   - `config.ts` - Environment variables, defaults
   - `api.ts` - API endpoints, HTTP headers
   - `ui.ts` - User-facing messages
   - `validation.ts` - Validation patterns
   - `database.ts` - Database tables, columns

2. Add the constant with a descriptive name:
   ```typescript
   export const ERRORS = {
     // ...existing errors
     NEW_ERROR_MESSAGE: 'Description of the error',
   } as const;
   ```

3. Export from `index.ts` (should already be done)

4. Update documentation if needed

## Troubleshooting

### "Cannot find module 'constants'"

Make sure you're importing from the correct path:
```typescript
// ✅ Correct
import { ERRORS } from '../constants/index.js';

// ❌ Wrong
import { ERRORS } from 'constants';
```

### "Property does not exist on type"

The constant might not be exported. Check:
1. Is the constant defined in the appropriate file?
2. Is the file exported from `src/constants/index.ts`?
3. Is TypeScript compilation up to date? Run `npm run build`

### Circular Dependencies

If you get circular dependency errors:
- Constants files should NOT import from other source files
- Other source files CAN import from constants
- If you need to share types, create a separate `types.ts` file

## Resources

- **Constants Location**: `src/constants/`
- **ESLint Plugin**: `eslint-plugin-lsh/`
- **Audit Report**: See comprehensive audit in docs/development/
- **Issue Tracker**: Report issues with constants on GitHub

## Questions?

If you're unsure whether something should be a constant:
1. Will this string be used in multiple places? → **Yes, use a constant**
2. Is this string part of an API contract? → **Yes, use a constant**
3. Is this string user-facing? → **Yes, use a constant**
4. Could this string need to change? → **Yes, use a constant**
5. Is this a magic number or string? → **Yes, use a constant**

When in doubt, make it a constant! It's easier to remove later than to refactor later.
