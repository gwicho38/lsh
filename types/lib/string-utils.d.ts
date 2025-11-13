/**
 * String Utilities
 *
 * Helper functions for working with strings, especially for formatting
 * constant template strings with dynamic values.
 */
/**
 * Format a template string by replacing ${varName} placeholders with values
 *
 * @param template - Template string with ${varName} placeholders
 * @param vars - Object mapping variable names to values
 * @returns Formatted string
 *
 * @example
 * ```typescript
 * import { ERRORS } from '../constants/index.js';
 * import { formatMessage } from './string-utils.js';
 *
 * const error = formatMessage(ERRORS.JOB_NOT_FOUND, { jobId: '12345' });
 * // Returns: "Job 12345 not found"
 * ```
 */
export declare function formatMessage(template: string, vars: Record<string, string | number | boolean>): string;
/**
 * Format a path template by replacing ${VAR} placeholders with environment variables
 *
 * @param pathTemplate - Path template with ${VAR} placeholders
 * @param fallbacks - Optional fallback values for variables
 * @returns Formatted path
 *
 * @example
 * ```typescript
 * import { PATHS } from '../constants/index.js';
 * import { formatPath } from './string-utils.js';
 *
 * const socketPath = formatPath(PATHS.DAEMON_SOCKET_TEMPLATE, { USER: 'default' });
 * // Returns: "/tmp/lsh-job-daemon-johndoe.sock" (if USER env var is johndoe)
 * // Or: "/tmp/lsh-job-daemon-default.sock" (if USER env var is not set)
 * ```
 */
export declare function formatPath(pathTemplate: string, fallbacks?: Record<string, string>): string;
/**
 * Truncate a string to a maximum length, adding ellipsis if needed
 *
 * @param str - String to truncate
 * @param maxLength - Maximum length (default: 50)
 * @param ellipsis - Ellipsis to append (default: '...')
 * @returns Truncated string
 *
 * @example
 * ```typescript
 * truncate('This is a very long error message', 20);
 * // Returns: "This is a very lo..."
 * ```
 */
export declare function truncate(str: string, maxLength?: number, ellipsis?: string): string;
/**
 * Escape special characters in a string for use in a regular expression
 *
 * @param str - String to escape
 * @returns Escaped string
 *
 * @example
 * ```typescript
 * escapeRegex('test.file');
 * // Returns: "test\\.file"
 * ```
 */
export declare function escapeRegex(str: string): string;
/**
 * Pluralize a word based on count
 *
 * @param count - Count to check
 * @param singular - Singular form
 * @param plural - Plural form (default: singular + 's')
 * @returns Pluralized string with count
 *
 * @example
 * ```typescript
 * pluralize(1, 'job');  // "1 job"
 * pluralize(5, 'job');  // "5 jobs"
 * pluralize(2, 'query', 'queries');  // "2 queries"
 * ```
 */
export declare function pluralize(count: number, singular: string, plural?: string): string;
