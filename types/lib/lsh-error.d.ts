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
export declare const ErrorCodes: {
    readonly AUTH_UNAUTHORIZED: "AUTH_UNAUTHORIZED";
    readonly AUTH_INVALID_CREDENTIALS: "AUTH_INVALID_CREDENTIALS";
    readonly AUTH_EMAIL_NOT_VERIFIED: "AUTH_EMAIL_NOT_VERIFIED";
    readonly AUTH_EMAIL_ALREADY_EXISTS: "AUTH_EMAIL_ALREADY_EXISTS";
    readonly AUTH_INVALID_TOKEN: "AUTH_INVALID_TOKEN";
    readonly AUTH_TOKEN_EXPIRED: "AUTH_TOKEN_EXPIRED";
    readonly AUTH_TOKEN_ALREADY_USED: "AUTH_TOKEN_ALREADY_USED";
    readonly AUTH_FORBIDDEN: "AUTH_FORBIDDEN";
    readonly AUTH_INSUFFICIENT_PERMISSIONS: "AUTH_INSUFFICIENT_PERMISSIONS";
    readonly SECRETS_ENCRYPTION_FAILED: "SECRETS_ENCRYPTION_FAILED";
    readonly SECRETS_DECRYPTION_FAILED: "SECRETS_DECRYPTION_FAILED";
    readonly SECRETS_KEY_NOT_FOUND: "SECRETS_KEY_NOT_FOUND";
    readonly SECRETS_PUSH_FAILED: "SECRETS_PUSH_FAILED";
    readonly SECRETS_PULL_FAILED: "SECRETS_PULL_FAILED";
    readonly SECRETS_ROTATION_FAILED: "SECRETS_ROTATION_FAILED";
    readonly SECRETS_ENV_PARSE_FAILED: "SECRETS_ENV_PARSE_FAILED";
    readonly SECRETS_NOT_FOUND: "SECRETS_NOT_FOUND";
    readonly DB_CONNECTION_FAILED: "DB_CONNECTION_FAILED";
    readonly DB_QUERY_FAILED: "DB_QUERY_FAILED";
    readonly DB_NOT_FOUND: "DB_NOT_FOUND";
    readonly DB_ALREADY_EXISTS: "DB_ALREADY_EXISTS";
    readonly DB_CONSTRAINT_VIOLATION: "DB_CONSTRAINT_VIOLATION";
    readonly DB_TIMEOUT: "DB_TIMEOUT";
    readonly DAEMON_NOT_RUNNING: "DAEMON_NOT_RUNNING";
    readonly DAEMON_ALREADY_RUNNING: "DAEMON_ALREADY_RUNNING";
    readonly DAEMON_START_FAILED: "DAEMON_START_FAILED";
    readonly DAEMON_STOP_FAILED: "DAEMON_STOP_FAILED";
    readonly DAEMON_CONNECTION_FAILED: "DAEMON_CONNECTION_FAILED";
    readonly DAEMON_IPC_ERROR: "DAEMON_IPC_ERROR";
    readonly JOB_NOT_FOUND: "JOB_NOT_FOUND";
    readonly JOB_ALREADY_RUNNING: "JOB_ALREADY_RUNNING";
    readonly JOB_START_FAILED: "JOB_START_FAILED";
    readonly JOB_STOP_FAILED: "JOB_STOP_FAILED";
    readonly JOB_TIMEOUT: "JOB_TIMEOUT";
    readonly JOB_INVALID_SCHEDULE: "JOB_INVALID_SCHEDULE";
    readonly API_NOT_CONFIGURED: "API_NOT_CONFIGURED";
    readonly API_INVALID_REQUEST: "API_INVALID_REQUEST";
    readonly API_RATE_LIMITED: "API_RATE_LIMITED";
    readonly API_INTERNAL_ERROR: "API_INTERNAL_ERROR";
    readonly API_WEBHOOK_VERIFICATION_FAILED: "API_WEBHOOK_VERIFICATION_FAILED";
    readonly CONFIG_MISSING_ENV_VAR: "CONFIG_MISSING_ENV_VAR";
    readonly CONFIG_INVALID_VALUE: "CONFIG_INVALID_VALUE";
    readonly CONFIG_FILE_NOT_FOUND: "CONFIG_FILE_NOT_FOUND";
    readonly CONFIG_PARSE_ERROR: "CONFIG_PARSE_ERROR";
    readonly VALIDATION_REQUIRED_FIELD: "VALIDATION_REQUIRED_FIELD";
    readonly VALIDATION_INVALID_FORMAT: "VALIDATION_INVALID_FORMAT";
    readonly VALIDATION_OUT_OF_RANGE: "VALIDATION_OUT_OF_RANGE";
    readonly VALIDATION_COMMAND_INJECTION: "VALIDATION_COMMAND_INJECTION";
    readonly BILLING_TIER_LIMIT_EXCEEDED: "BILLING_TIER_LIMIT_EXCEEDED";
    readonly BILLING_SUBSCRIPTION_REQUIRED: "BILLING_SUBSCRIPTION_REQUIRED";
    readonly BILLING_PAYMENT_REQUIRED: "BILLING_PAYMENT_REQUIRED";
    readonly BILLING_STRIPE_ERROR: "BILLING_STRIPE_ERROR";
    readonly RESOURCE_NOT_FOUND: "RESOURCE_NOT_FOUND";
    readonly RESOURCE_ALREADY_EXISTS: "RESOURCE_ALREADY_EXISTS";
    readonly RESOURCE_CONFLICT: "RESOURCE_CONFLICT";
    readonly INTERNAL_ERROR: "INTERNAL_ERROR";
    readonly NOT_IMPLEMENTED: "NOT_IMPLEMENTED";
    readonly SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE";
};
export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];
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
export declare class LSHError extends Error {
    /** Error code for programmatic handling */
    readonly code: ErrorCode;
    /** Additional context for debugging */
    readonly context?: Record<string, unknown>;
    /** HTTP status code for API responses */
    readonly statusCode: number;
    /** Timestamp when error occurred */
    readonly timestamp: Date;
    constructor(code: ErrorCode, message: string, context?: Record<string, unknown>, statusCode?: number);
    /**
     * Serialize error for logging or API response.
     */
    toJSON(): Record<string, unknown>;
    /**
     * Create user-friendly string representation.
     */
    toString(): string;
}
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
export declare function extractErrorMessage(error: unknown): string;
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
export declare function extractErrorDetails(error: unknown): {
    message: string;
    stack?: string;
    code?: string;
    context?: Record<string, unknown>;
};
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
export declare function isLSHError(error: unknown, code?: ErrorCode): error is LSHError;
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
export declare function wrapAsLSHError(error: unknown, code?: ErrorCode, context?: Record<string, unknown>): LSHError;
/**
 * Create a not found error.
 */
export declare function notFoundError(resource: string, id?: string, context?: Record<string, unknown>): LSHError;
/**
 * Create an already exists error.
 */
export declare function alreadyExistsError(resource: string, identifier?: string, context?: Record<string, unknown>): LSHError;
/**
 * Create a validation error.
 */
export declare function validationError(message: string, field?: string, context?: Record<string, unknown>): LSHError;
/**
 * Create an unauthorized error.
 */
export declare function unauthorizedError(message?: string, context?: Record<string, unknown>): LSHError;
/**
 * Create a forbidden error.
 */
export declare function forbiddenError(message?: string, context?: Record<string, unknown>): LSHError;
