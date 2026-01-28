/**
 * LSH Error Handling Utilities
 *
 * Provides standardized error handling across the LSH codebase:
 * - LSHError class for structured errors with codes and context
 * - Error extraction utilities for safe error handling in catch blocks
 * - Error code constants for consistent error identification
 *
 * @example
 * ```typescript
 * import { LSHError, ErrorCodes, extractErrorMessage } from './lsh-error.js';
 *
 * // Throw a structured error
 * throw new LSHError(
 *   ErrorCodes.SECRETS_ENCRYPTION_FAILED,
 *   'Failed to encrypt secret',
 *   { secretKey: 'DATABASE_URL', teamId: 'team_123' }
 * );
 *
 * // Safe error extraction in catch block
 * try {
 *   await doSomething();
 * } catch (error) {
 *   console.error(extractErrorMessage(error));
 * }
 * ```
 */

// ============================================================================
// ERROR CODES
// ============================================================================

/**
 * Standardized error codes for LSH operations.
 * Use these instead of magic strings for consistent error handling.
 *
 * Naming convention: CATEGORY_SPECIFIC_ERROR
 * - AUTH_* : Authentication errors
 * - SECRETS_* : Secrets management errors
 * - DB_* : Database errors
 * - DAEMON_* : Daemon/job errors
 * - API_* : API server errors
 * - CONFIG_* : Configuration errors
 * - VALIDATION_* : Input validation errors
 */
export const ErrorCodes = {
  // Authentication errors
  AUTH_UNAUTHORIZED: 'AUTH_UNAUTHORIZED',
  AUTH_INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
  AUTH_EMAIL_NOT_VERIFIED: 'AUTH_EMAIL_NOT_VERIFIED',
  AUTH_EMAIL_ALREADY_EXISTS: 'AUTH_EMAIL_ALREADY_EXISTS',
  AUTH_INVALID_TOKEN: 'AUTH_INVALID_TOKEN',
  AUTH_TOKEN_EXPIRED: 'AUTH_TOKEN_EXPIRED',
  AUTH_TOKEN_ALREADY_USED: 'AUTH_TOKEN_ALREADY_USED',
  AUTH_FORBIDDEN: 'AUTH_FORBIDDEN',
  AUTH_INSUFFICIENT_PERMISSIONS: 'AUTH_INSUFFICIENT_PERMISSIONS',

  // Secrets management errors
  SECRETS_ENCRYPTION_FAILED: 'SECRETS_ENCRYPTION_FAILED',
  SECRETS_DECRYPTION_FAILED: 'SECRETS_DECRYPTION_FAILED',
  SECRETS_KEY_NOT_FOUND: 'SECRETS_KEY_NOT_FOUND',
  SECRETS_PUSH_FAILED: 'SECRETS_PUSH_FAILED',
  SECRETS_PULL_FAILED: 'SECRETS_PULL_FAILED',
  SECRETS_ROTATION_FAILED: 'SECRETS_ROTATION_FAILED',
  SECRETS_ENV_PARSE_FAILED: 'SECRETS_ENV_PARSE_FAILED',
  SECRETS_NOT_FOUND: 'SECRETS_NOT_FOUND',

  // Database errors
  DB_CONNECTION_FAILED: 'DB_CONNECTION_FAILED',
  DB_QUERY_FAILED: 'DB_QUERY_FAILED',
  DB_NOT_FOUND: 'DB_NOT_FOUND',
  DB_ALREADY_EXISTS: 'DB_ALREADY_EXISTS',
  DB_CONSTRAINT_VIOLATION: 'DB_CONSTRAINT_VIOLATION',
  DB_TIMEOUT: 'DB_TIMEOUT',

  // Daemon errors
  DAEMON_NOT_RUNNING: 'DAEMON_NOT_RUNNING',
  DAEMON_ALREADY_RUNNING: 'DAEMON_ALREADY_RUNNING',
  DAEMON_START_FAILED: 'DAEMON_START_FAILED',
  DAEMON_STOP_FAILED: 'DAEMON_STOP_FAILED',
  DAEMON_CONNECTION_FAILED: 'DAEMON_CONNECTION_FAILED',
  DAEMON_IPC_ERROR: 'DAEMON_IPC_ERROR',

  // Job errors
  JOB_NOT_FOUND: 'JOB_NOT_FOUND',
  JOB_ALREADY_RUNNING: 'JOB_ALREADY_RUNNING',
  JOB_START_FAILED: 'JOB_START_FAILED',
  JOB_STOP_FAILED: 'JOB_STOP_FAILED',
  JOB_TIMEOUT: 'JOB_TIMEOUT',
  JOB_INVALID_SCHEDULE: 'JOB_INVALID_SCHEDULE',

  // API errors
  API_NOT_CONFIGURED: 'API_NOT_CONFIGURED',
  API_INVALID_REQUEST: 'API_INVALID_REQUEST',
  API_RATE_LIMITED: 'API_RATE_LIMITED',
  API_INTERNAL_ERROR: 'API_INTERNAL_ERROR',
  API_WEBHOOK_VERIFICATION_FAILED: 'API_WEBHOOK_VERIFICATION_FAILED',

  // Configuration errors
  CONFIG_MISSING_ENV_VAR: 'CONFIG_MISSING_ENV_VAR',
  CONFIG_INVALID_VALUE: 'CONFIG_INVALID_VALUE',
  CONFIG_FILE_NOT_FOUND: 'CONFIG_FILE_NOT_FOUND',
  CONFIG_PARSE_ERROR: 'CONFIG_PARSE_ERROR',

  // Validation errors
  VALIDATION_REQUIRED_FIELD: 'VALIDATION_REQUIRED_FIELD',
  VALIDATION_INVALID_FORMAT: 'VALIDATION_INVALID_FORMAT',
  VALIDATION_OUT_OF_RANGE: 'VALIDATION_OUT_OF_RANGE',
  VALIDATION_COMMAND_INJECTION: 'VALIDATION_COMMAND_INJECTION',

  // Billing errors
  BILLING_TIER_LIMIT_EXCEEDED: 'BILLING_TIER_LIMIT_EXCEEDED',
  BILLING_SUBSCRIPTION_REQUIRED: 'BILLING_SUBSCRIPTION_REQUIRED',
  BILLING_PAYMENT_REQUIRED: 'BILLING_PAYMENT_REQUIRED',
  BILLING_STRIPE_ERROR: 'BILLING_STRIPE_ERROR',

  // Resource errors
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  RESOURCE_ALREADY_EXISTS: 'RESOURCE_ALREADY_EXISTS',
  RESOURCE_CONFLICT: 'RESOURCE_CONFLICT',

  // General errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  NOT_IMPLEMENTED: 'NOT_IMPLEMENTED',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

// ============================================================================
// LSH ERROR CLASS
// ============================================================================

/**
 * Structured error class for LSH operations.
 *
 * Features:
 * - Error code for programmatic handling
 * - Context object for debugging information
 * - HTTP status code mapping for API responses
 * - Stack trace preservation
 * - Serialization support
 *
 * @example
 * ```typescript
 * throw new LSHError(
 *   ErrorCodes.SECRETS_NOT_FOUND,
 *   'Secret not found',
 *   { secretId: 'secret_123', environment: 'production' }
 * );
 * ```
 */
export class LSHError extends Error {
  /** Error code for programmatic handling */
  public readonly code: ErrorCode;

  /** Additional context for debugging */
  public readonly context?: Record<string, unknown>;

  /** HTTP status code for API responses */
  public readonly statusCode: number;

  /** Timestamp when error occurred */
  public readonly timestamp: Date;

  constructor(
    code: ErrorCode,
    message: string,
    context?: Record<string, unknown>,
    statusCode?: number
  ) {
    super(message);
    this.name = 'LSHError';
    this.code = code;
    this.context = context;
    this.statusCode = statusCode ?? getDefaultStatusCode(code);
    this.timestamp = new Date();

    // Maintain proper stack trace in V8 environments
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, LSHError);
    }
  }

  /**
   * Serialize error for logging or API response.
   */
  // TODO(@gwicho38): Review - toJSON
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      context: this.context,
      statusCode: this.statusCode,
      timestamp: this.timestamp.toISOString(),
      stack: this.stack,
    };
  }

  /**
   * Create user-friendly string representation.
   */
  // TODO(@gwicho38): Review - toString
  toString(): string {
    const contextStr = this.context ? ` (${JSON.stringify(this.context)})` : '';
    return `[${this.code}] ${this.message}${contextStr}`;
  }
}

// ============================================================================
// ERROR UTILITIES
// ============================================================================

/**
 * Safely extract error message from unknown error type.
 * Use this in catch blocks instead of (error as Error).message.
 *
 * @example
 * ```typescript
 * try {
 *   await riskyOperation();
 * } catch (error) {
 *   console.error('Failed:', extractErrorMessage(error));
 * }
 * ```
 */
// TODO(@gwicho38): Review - extractErrorMessage
export function extractErrorMessage(error: unknown): string {
  if (error instanceof LSHError) {
    return error.toString();
  }
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return String(error);
}

/**
 * Safely extract error details for logging.
 * Returns structured object with message, stack, and code if available.
 *
 * @example
 * ```typescript
 * try {
 *   await riskyOperation();
 * } catch (error) {
 *   logger.error('Operation failed', extractErrorDetails(error));
 * }
 * ```
 */
// TODO(@gwicho38): Review - extractErrorDetails
export function extractErrorDetails(error: unknown): {
  message: string;
  stack?: string;
  code?: string;
  context?: Record<string, unknown>;
} {
  if (error instanceof LSHError) {
    return {
      message: error.message,
      stack: error.stack,
      code: error.code,
      context: error.context,
    };
  }
  if (error instanceof Error) {
    return {
      message: error.message,
      stack: error.stack,
      code: (error as { code?: string }).code,
    };
  }
  return {
    message: extractErrorMessage(error),
  };
}

/**
 * Check if an error is an LSHError with a specific code.
 *
 * @example
 * ```typescript
 * try {
 *   await getSecret();
 * } catch (error) {
 *   if (isLSHError(error, ErrorCodes.SECRETS_NOT_FOUND)) {
 *     // Handle not found case
 *   }
 *   throw error;
 * }
 * ```
 */
// TODO(@gwicho38): Review - isLSHError
export function isLSHError(error: unknown, code?: ErrorCode): error is LSHError {
  if (!(error instanceof LSHError)) return false;
  if (code && error.code !== code) return false;
  return true;
}

/**
 * Wrap an unknown error as an LSHError.
 * Useful for ensuring consistent error types in APIs.
 *
 * @example
 * ```typescript
 * try {
 *   await externalApi.call();
 * } catch (error) {
 *   throw wrapAsLSHError(error, ErrorCodes.API_INTERNAL_ERROR);
 * }
 * ```
 */
// TODO(@gwicho38): Review - wrapAsLSHError
export function wrapAsLSHError(
  error: unknown,
  code: ErrorCode = ErrorCodes.INTERNAL_ERROR,
  context?: Record<string, unknown>
): LSHError {
  if (error instanceof LSHError) {
    // Add additional context if provided
    if (context) {
      return new LSHError(error.code, error.message, {
        ...error.context,
        ...context,
      });
    }
    return error;
  }

  const message = extractErrorMessage(error);
  const details = extractErrorDetails(error);

  return new LSHError(code, message, {
    ...context,
    originalStack: details.stack,
    originalCode: details.code,
  });
}

// ============================================================================
// HTTP STATUS CODE MAPPING
// ============================================================================

/**
 * Get default HTTP status code for an error code.
 * Used by LSHError constructor and API responses.
 */
// TODO(@gwicho38): Review - getDefaultStatusCode
function getDefaultStatusCode(code: ErrorCode): number {
  // 400 Bad Request
  if (code.startsWith('VALIDATION_')) return 400;
  if (code === ErrorCodes.API_INVALID_REQUEST) return 400;
  if (code === ErrorCodes.CONFIG_INVALID_VALUE) return 400;

  // 401 Unauthorized
  if (code === ErrorCodes.AUTH_UNAUTHORIZED) return 401;
  if (code === ErrorCodes.AUTH_INVALID_CREDENTIALS) return 401;
  if (code === ErrorCodes.AUTH_INVALID_TOKEN) return 401;
  if (code === ErrorCodes.AUTH_TOKEN_EXPIRED) return 401;
  if (code === ErrorCodes.AUTH_TOKEN_ALREADY_USED) return 401;

  // 402 Payment Required
  if (code === ErrorCodes.BILLING_PAYMENT_REQUIRED) return 402;
  if (code === ErrorCodes.BILLING_SUBSCRIPTION_REQUIRED) return 402;

  // 403 Forbidden
  if (code === ErrorCodes.AUTH_FORBIDDEN) return 403;
  if (code === ErrorCodes.AUTH_INSUFFICIENT_PERMISSIONS) return 403;
  if (code === ErrorCodes.AUTH_EMAIL_NOT_VERIFIED) return 403;

  // 404 Not Found
  if (code.endsWith('_NOT_FOUND')) return 404;
  if (code === ErrorCodes.DB_NOT_FOUND) return 404;

  // 409 Conflict
  if (code.endsWith('_ALREADY_EXISTS')) return 409;
  if (code === ErrorCodes.RESOURCE_CONFLICT) return 409;
  if (code === ErrorCodes.DB_CONSTRAINT_VIOLATION) return 409;

  // 429 Too Many Requests
  if (code === ErrorCodes.API_RATE_LIMITED) return 429;
  if (code === ErrorCodes.BILLING_TIER_LIMIT_EXCEEDED) return 429;

  // 501 Not Implemented
  if (code === ErrorCodes.NOT_IMPLEMENTED) return 501;

  // 503 Service Unavailable
  if (code === ErrorCodes.SERVICE_UNAVAILABLE) return 503;
  if (code === ErrorCodes.DB_CONNECTION_FAILED) return 503;

  // 504 Gateway Timeout
  if (code === ErrorCodes.DB_TIMEOUT) return 504;
  if (code === ErrorCodes.JOB_TIMEOUT) return 504;

  // Default to 500 Internal Server Error
  return 500;
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Create a not found error.
 */
// TODO(@gwicho38): Review - notFoundError
export function notFoundError(
  resource: string,
  id?: string,
  context?: Record<string, unknown>
): LSHError {
  const message = id ? `${resource} '${id}' not found` : `${resource} not found`;
  return new LSHError(ErrorCodes.RESOURCE_NOT_FOUND, message, { resource, id, ...context });
}

/**
 * Create an already exists error.
 */
// TODO(@gwicho38): Review - alreadyExistsError
export function alreadyExistsError(
  resource: string,
  identifier?: string,
  context?: Record<string, unknown>
): LSHError {
  const message = identifier
    ? `${resource} '${identifier}' already exists`
    : `${resource} already exists`;
  return new LSHError(ErrorCodes.RESOURCE_ALREADY_EXISTS, message, {
    resource,
    identifier,
    ...context,
  });
}

/**
 * Create a validation error.
 */
// TODO(@gwicho38): Review - validationError
export function validationError(
  message: string,
  field?: string,
  context?: Record<string, unknown>
): LSHError {
  return new LSHError(ErrorCodes.VALIDATION_REQUIRED_FIELD, message, { field, ...context });
}

/**
 * Create an unauthorized error.
 */
// TODO(@gwicho38): Review - unauthorizedError
export function unauthorizedError(message = 'Unauthorized', context?: Record<string, unknown>): LSHError {
  return new LSHError(ErrorCodes.AUTH_UNAUTHORIZED, message, context);
}

/**
 * Create a forbidden error.
 */
// TODO(@gwicho38): Review - forbiddenError
export function forbiddenError(
  message = 'Insufficient permissions',
  context?: Record<string, unknown>
): LSHError {
  return new LSHError(ErrorCodes.AUTH_FORBIDDEN, message, context);
}
