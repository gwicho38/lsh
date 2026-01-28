# ADR-0005: Error Handling Pattern

## Status

Accepted

## Date

2026-01-27

## Context

LSH is a CLI tool that needs robust error handling for:
- User-facing error messages (clear, actionable)
- Programmatic error identification (by code)
- Debugging information (stack traces, context)
- Consistent error behavior across modules

Challenges:
- Different error sources (database, crypto, network, validation)
- Need to distinguish recoverable vs fatal errors
- CLI needs exit codes, API needs HTTP status codes
- TypeScript lacks good built-in error types

Requirements:
- Consistent error structure across all modules
- Error codes for programmatic handling
- Human-readable messages
- Contextual information for debugging
- Type-safe error creation

## Decision

We created a **custom LSHError class** with standardized error codes.

Key characteristics:
- Custom Error subclass: `LSHError`
- Numeric error codes: `ErrorCodes` enum
- Contextual data: optional `context` object
- Utility functions: `extractErrorMessage()`, `wrapAsLSHError()`

Error structure:
```typescript
class LSHError extends Error {
  code: number;       // Numeric code from ErrorCodes enum
  context?: object;   // Additional debugging information
}
```

## Consequences

### Positive

- **Consistency**: All modules throw same error type
- **Type safety**: TypeScript knows error shape
- **Debugging**: Context carries relevant information
- **Programmatic handling**: Error codes enable switch/case
- **CLI integration**: Error codes map to exit codes

### Negative

- **Boilerplate**: Must create error for every failure
- **Learning curve**: Team must learn error code meanings
- **Maintenance**: Error codes list grows over time

### Neutral

- Stack traces still available via standard `Error.stack`
- Can wrap native errors in LSHError

## Alternatives Considered

### Option 1: Plain Error Objects

- **Description**: Use native JavaScript `Error` class
- **Pros**: No custom code, familiar to all
- **Cons**: No type safety, inconsistent structure, no error codes
- **Why rejected**: Need more structure for CLI error handling

### Option 2: Result Types (Rust-style)

- **Description**: Return `{ ok, error }` or `Result<T, E>` from functions
- **Pros**: Explicit error handling, no try/catch
- **Cons**: Verbose, unfamiliar to JS developers, major refactor
- **Why rejected**: Too different from JS conventions, migration cost

### Option 3: Error Factory Functions

- **Description**: Functions that create specific error types
- **Pros**: Flexible, can have many error types
- **Cons**: Many error classes to maintain, complex hierarchy
- **Why rejected**: Single LSHError class simpler to maintain

### Option 4: String Error Codes

- **Description**: Use strings like "DB_QUERY_FAILED" instead of numbers
- **Pros**: Self-documenting, no enum needed
- **Cons**: Typos possible, no type checking, larger payloads
- **Why rejected**: Numeric codes more efficient, TypeScript enum provides safety

## Implementation Notes

### Error Codes Definition

```typescript
// src/lib/lsh-error.ts
export enum ErrorCodes {
  // General errors (1-99)
  UNKNOWN_ERROR = 1,
  INTERNAL_ERROR = 2,
  INVALID_INPUT = 3,
  NOT_FOUND = 4,
  ALREADY_EXISTS = 5,

  // Configuration errors (100-199)
  CONFIG_MISSING = 100,
  CONFIG_INVALID = 101,
  ENV_VAR_MISSING = 102,

  // Database errors (200-299)
  DB_CONNECTION_FAILED = 200,
  DB_QUERY_FAILED = 201,
  DB_CONSTRAINT_VIOLATION = 202,

  // Crypto errors (300-399)
  ENCRYPTION_FAILED = 300,
  DECRYPTION_FAILED = 301,
  INVALID_KEY = 302,
  KEY_NOT_FOUND = 303,

  // Authentication errors (400-499)
  AUTH_REQUIRED = 400,
  INVALID_TOKEN = 401,
  TOKEN_EXPIRED = 402,
  INSUFFICIENT_PERMISSIONS = 403,

  // Job errors (500-599)
  JOB_NOT_FOUND = 500,
  JOB_ALREADY_RUNNING = 501,
  JOB_EXECUTION_FAILED = 502,

  // Network errors (600-699)
  NETWORK_ERROR = 600,
  TIMEOUT = 601,
  WEBHOOK_VERIFICATION_FAILED = 602,
}
```

### LSHError Class

```typescript
export class LSHError extends Error {
  public readonly code: number;
  public readonly context?: Record<string, unknown>;

  constructor(code: number, message: string, context?: Record<string, unknown>) {
    super(message);
    this.name = 'LSHError';
    this.code = code;
    this.context = context;

    // Maintains proper stack trace
    Error.captureStackTrace(this, LSHError);
  }
}
```

### Error Utilities

```typescript
// Extract message safely from any error type
export function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'Unknown error occurred';
}

// Wrap any error as LSHError
export function wrapAsLSHError(
  error: unknown,
  code: number,
  context?: Record<string, unknown>
): LSHError {
  const message = extractErrorMessage(error);
  return new LSHError(code, message, {
    ...context,
    originalError: error instanceof Error ? error.name : typeof error,
  });
}
```

### Usage Pattern

```typescript
// Throwing errors
throw new LSHError(
  ErrorCodes.DB_QUERY_FAILED,
  'Failed to fetch jobs',
  { table: 'shell_jobs', query: 'SELECT * FROM shell_jobs' }
);

// Catching and wrapping
try {
  await riskyOperation();
} catch (error) {
  throw wrapAsLSHError(error, ErrorCodes.INTERNAL_ERROR, {
    operation: 'riskyOperation',
    timestamp: new Date().toISOString()
  });
}

// Safe error logging
console.error('Operation failed:', extractErrorMessage(error));
```

### CLI Exit Codes

```typescript
// src/cli.ts
function handleError(error: unknown): never {
  if (error instanceof LSHError) {
    console.error(`Error [${error.code}]: ${error.message}`);
    if (process.env.DEBUG && error.context) {
      console.error('Context:', JSON.stringify(error.context, null, 2));
    }
    process.exit(error.code % 256); // Exit codes are 0-255
  }

  console.error('Unexpected error:', extractErrorMessage(error));
  process.exit(1);
}
```

### API Error Responses

```typescript
// src/daemon/api-server.ts
function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  if (err instanceof LSHError) {
    const status = errorCodeToHttpStatus(err.code);
    return res.status(status).json({
      error: {
        code: err.code,
        message: err.message,
        ...(process.env.DEBUG && { context: err.context })
      }
    });
  }

  return res.status(500).json({
    error: {
      code: ErrorCodes.INTERNAL_ERROR,
      message: 'Internal server error'
    }
  });
}
```

## Related Decisions

- [ADR-0001](./0001-database-persistence-strategy.md) - Database errors use this pattern
- [ADR-0002](./0002-secret-encryption-standards.md) - Crypto errors use this pattern

## References

- [src/lib/lsh-error.ts](../../../src/lib/lsh-error.ts)
- [Error Handling in TypeScript](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-0.html#unknown-on-catch-clause-bindings)
