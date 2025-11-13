/**
 * LSH Constants
 *
 * Centralized location for all hard-coded strings, configuration values,
 * and magic constants used throughout the LSH codebase.
 *
 * This file serves as the single source of truth for all constant values.
 * Import from this file or its submodules instead of using hard-coded strings.
 *
 * @example
 * ```typescript
 * import { PATHS, ERRORS, ENV_VARS } from './constants/index.js';
 *
 * // Use constants instead of hard-coded strings
 * const socketPath = PATHS.DAEMON_SOCKET_TEMPLATE.replace('${USER}', process.env.USER);
 * throw new Error(ERRORS.DAEMON_ALREADY_RUNNING);
 * const apiKey = process.env[ENV_VARS.LSH_API_KEY];
 * ```
 */
export * from './paths.js';
export * from './errors.js';
export * from './commands.js';
export * from './config.js';
export * from './api.js';
export * from './ui.js';
export * from './validation.js';
export * from './database.js';
