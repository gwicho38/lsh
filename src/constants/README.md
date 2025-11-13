# LSH Constants

This directory contains all hard-coded strings, configuration values, and magic constants used throughout the LSH codebase. Using constants instead of hard-coded strings improves maintainability, consistency, and type safety.

## Directory Structure

```
src/constants/
├── index.ts           # Main export file (import from here)
├── paths.ts           # File paths and system locations
├── errors.ts          # Error messages and risk levels
├── commands.ts        # Command names and CLI strings
├── config.ts          # Environment variables and defaults
├── api.ts             # API endpoints and HTTP headers
├── ui.ts              # User-facing messages and log messages
├── validation.ts      # Validation patterns and security rules
├── database.ts        # Database table names
└── README.md          # This file
```

## Usage

Always import from the main `index.ts` file:

```typescript
import { PATHS, ERRORS, ENV_VARS, COMMANDS } from './constants/index.js';
```

Or import specific categories if you prefer:

```typescript
import { PATHS } from './constants/paths.js';
import { ERRORS } from './constants/errors.js';
```

## Available Constants

### paths.ts

- **PATHS**: File paths and system locations
  - Example: `PATHS.DAEMON_SOCKET_TEMPLATE`, `PATHS.LSHRC_FILENAME`
- **PREFIXES**: String prefixes for IDs and seeds
  - Example: `PREFIXES.SESSION_ID`, `PREFIXES.SECRETS_SEED_SUFFIX`
- **SYSTEM**: System defaults
  - Example: `SYSTEM.UNKNOWN_USER`, `SYSTEM.DEFAULT_HOSTNAME`

### errors.ts

- **ERRORS**: All error messages with template variable support
  - Example: `ERRORS.JOB_NOT_FOUND`, `ERRORS.SOCKET_NOT_FOUND`
- **RISK_LEVELS**: Security risk level constants
  - Example: `RISK_LEVELS.CRITICAL`, `RISK_LEVELS.HIGH`

### commands.ts

- **CLI**: CLI name, description, banner
- **COMMANDS**: Command names (push, pull, list, etc.)
- **JOB_COMMANDS**: Job command types
- **JOB_STATUSES**: Job status values (created, running, completed, etc.)
- **JOB_TYPES**: Job types (shell, system, scheduled, service)
- **IPC_COMMANDS**: Daemon IPC command names
- **PLATFORMS**: CI/CD platform names

### config.ts

- **ENV_VARS**: Environment variable names
  - Example: `ENV_VARS.LSH_API_KEY`, `ENV_VARS.SUPABASE_URL`
- **DEFAULTS**: Default configuration values
  - Example: `DEFAULTS.API_PORT`, `DEFAULTS.MAX_COMMAND_LENGTH`

### api.ts

- **ENDPOINTS**: API endpoint paths
  - Example: `ENDPOINTS.HEALTH`, `ENDPOINTS.API_JOBS`
- **HTTP_HEADERS**: HTTP header names
  - Example: `HTTP_HEADERS.AUTHORIZATION`, `HTTP_HEADERS.CONTENT_TYPE`
- **CONTENT_TYPES**: Content-Type values
- **AUTH**: Authentication constants
- **SOCKET_EVENTS**: Socket.io event names
- **METRICS**: Metrics names

### ui.ts

- **UI_MESSAGES**: User-facing messages
  - Example: `UI_MESSAGES.CONFIG_CREATED`, `UI_MESSAGES.FAILED_PUSH_SECRETS`
- **LOG_MESSAGES**: Log messages for daemon and services
  - Example: `LOG_MESSAGES.DAEMON_STARTING`, `LOG_MESSAGES.API_SERVER_STARTED`
- **LOG_LEVELS**: Log level constants (INFO, WARN, ERROR, DEBUG)

### validation.ts

- **DANGEROUS_PATTERNS**: Array of security validation patterns
- **WARNING_PATTERNS**: Array of warning patterns

### database.ts

- **TABLES**: Database table names
  - Example: `TABLES.SHELL_JOBS`, `TABLES.PIPELINE_EVENTS`

## Template Variables

Many constants support template variables using the `${varName}` syntax:

```typescript
// Error message with variable
ERRORS.JOB_NOT_FOUND  // "Job ${jobId} not found"

// Usage:
import { formatMessage } from '../lib/string-utils.js';
const error = formatMessage(ERRORS.JOB_NOT_FOUND, { jobId: '12345' });
// Returns: "Job 12345 not found"
```

For paths with environment variables:

```typescript
// Path template
PATHS.DAEMON_SOCKET_TEMPLATE  // "/tmp/lsh-job-daemon-${USER}.sock"

// Usage:
import { formatPath } from '../lib/string-utils.js';
const socketPath = formatPath(PATHS.DAEMON_SOCKET_TEMPLATE, { USER: 'default' });
// Returns: "/tmp/lsh-job-daemon-johndoe.sock" (using process.env.USER)
```

## Adding New Constants

When adding a new constant:

1. **Choose the right file** based on the constant's category
2. **Use SCREAMING_SNAKE_CASE** for constant names
3. **Add to the appropriate object** (PATHS, ERRORS, etc.)
4. **Use descriptive names** that indicate what the constant represents
5. **Use template variables** (`${varName}`) for dynamic parts
6. **Add comments** for complex or non-obvious constants
7. **Mark as const** using `as const` to ensure type safety

Example:

```typescript
// errors.ts
export const ERRORS = {
  // ...existing errors
  NEW_FEATURE_ERROR: 'Failed to execute new feature: ${reason}',
} as const;
```

## Type Safety

All constants are typed as `const` assertions, which provides:

- **Literal types**: TypeScript knows the exact string value
- **Autocomplete**: IDE can suggest available constants
- **Typo detection**: TypeScript catches typos in constant names
- **Immutability**: Constants cannot be modified at runtime

```typescript
// TypeScript knows this is exactly the string "/health"
const endpoint: typeof ENDPOINTS.HEALTH = ENDPOINTS.HEALTH;
```

## ESLint Integration

The custom ESLint rule `lsh/no-hardcoded-strings` enforces the use of constants:

- ❌ Blocks hard-coded strings in source files
- ✅ Allows strings in this directory (`src/constants/`)
- ✅ Allows strings in test files
- ✅ Allows short strings (< 3 chars) and separators

See `docs/development/CONSTANTS_USAGE_GUIDE.md` for detailed usage examples.

## Best Practices

### DO ✅

- Import from `./constants/index.js`
- Use `formatMessage()` helper for template variables
- Use `formatPath()` helper for path templates
- Add constants before using them in code
- Group related constants together
- Use template variables for dynamic parts

### DON'T ❌

- Don't hard-code strings directly in source files
- Don't create duplicate constants
- Don't import from individual constant files (use index.ts)
- Don't over-engineer (single chars like `,` or ` ` are OK inline)

## Migration

To migrate existing code to use constants:

1. Find hard-coded strings in your file
2. Check if a constant already exists in this directory
3. If not, add the constant to the appropriate file
4. Import the constant
5. Replace the hard-coded string with the constant

See examples in `docs/development/CONSTANTS_USAGE_GUIDE.md`.

## Related Files

- **Helper utilities**: `src/lib/string-utils.ts` - String formatting helpers
- **Usage guide**: `docs/development/CONSTANTS_USAGE_GUIDE.md` - Comprehensive examples
- **ESLint plugin**: `eslint-plugin-lsh/` - Custom linter rules
- **Audit report**: See initial audit documentation

## Questions?

If you're unsure about:
- Where to put a constant → Check the category descriptions above
- Whether something should be a constant → If it appears more than once or is part of an API contract, make it a constant
- How to use template variables → See `src/lib/string-utils.ts` and the usage guide

For more help, see `docs/development/CONSTANTS_USAGE_GUIDE.md`.
