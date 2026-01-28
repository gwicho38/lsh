/**
 * String Utilities
 *
 * Helper functions for working with strings, especially for formatting
 * constant template strings with dynamic values.
 */

import { LSHError, ErrorCodes } from './lsh-error.js';

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
// TODO(@gwicho38): Review - formatMessage
export function formatMessage(
  template: string,
  vars: Record<string, string | number | boolean>
): string {
  let result = template;
  // Sort keys by length (longest first) to prevent overlapping variable name issues
  // Example: if we have both 'id' and 'jobId', we want to replace 'jobId' first
  const sortedEntries = Object.entries(vars).sort((a, b) => b[0].length - a[0].length);

  for (const [key, value] of sortedEntries) {
    const placeholder = `\${${key}}`;
    // Use replaceAll with literal string to avoid regex escaping complexity
    result = result.replaceAll(placeholder, String(value));
  }
  return result;
}

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
// TODO(@gwicho38): Review - formatPath
export function formatPath(
  pathTemplate: string,
  fallbacks: Record<string, string> = {}
): string {
  let result = pathTemplate;
  const pattern = /\$\{([^}]+)\}/g;
  const matches = Array.from(pathTemplate.matchAll(pattern));

  // Process matches to collect unique variable names and their values
  const replacements = new Map<string, string>();
  for (const match of matches) {
    const varName = match[1];
    if (!replacements.has(match[0])) {
      const value = process.env[varName] || fallbacks[varName] || '';
      replacements.set(match[0], value);
    }
  }

  // Replace all occurrences of each placeholder
  for (const [placeholder, value] of replacements) {
    result = result.replaceAll(placeholder, value);
  }

  return result;
}

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
// TODO(@gwicho38): Review - truncate
export function truncate(str: string, maxLength: number = 50, ellipsis: string = '...'): string {
  // Validate that maxLength is greater than ellipsis length
  if (maxLength < ellipsis.length) {
    throw new LSHError(
      ErrorCodes.VALIDATION_INVALID_FORMAT,
      `maxLength (${maxLength}) must be greater than or equal to ellipsis length (${ellipsis.length})`,
      { maxLength, ellipsisLength: ellipsis.length, ellipsis }
    );
  }

  if (str.length <= maxLength) {
    return str;
  }
  return str.substring(0, maxLength - ellipsis.length) + ellipsis;
}

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
// TODO(@gwicho38): Review - escapeRegex
export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

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
// TODO(@gwicho38): Review - pluralize
export function pluralize(count: number, singular: string, plural?: string): string {
  const pluralForm = plural || `${singular}s`;
  return `${count} ${count === 1 ? singular : pluralForm}`;
}
