/**
 * Daemon Client Helper
 * Provides wrapper utilities to eliminate repetitive daemon client connection boilerplate
 */
import DaemonClient from './daemon-client.js';
/**
 * Configuration for daemon client operations
 */
export interface DaemonClientConfig {
    socketPath?: string;
    userId?: string;
    requireRunning?: boolean;
    exitOnError?: boolean;
}
/**
 * Default socket path for the daemon (cross-platform)
 */
export declare function getDefaultSocketPath(): string;
/**
 * Get default user ID (cross-platform)
 */
export declare function getDefaultUserId(): string;
/**
 * Execute an operation with a daemon client, handling all connection boilerplate
 *
 * This wrapper eliminates the need to:
 * - Create DaemonClient instance
 * - Check if daemon is running
 * - Connect to daemon
 * - Handle errors
 * - Disconnect from daemon
 *
 * @param operation - Async function that receives a connected DaemonClient
 * @param config - Optional configuration
 * @returns Promise resolving to the operation result
 *
 * @example
 * ```typescript
 * const status = await withDaemonClient(async (client) => {
 *   return await client.getStatus();
 * });
 * ```
 */
export declare function withDaemonClient<T>(operation: (client: DaemonClient) => Promise<T>, config?: DaemonClientConfig): Promise<T>;
/**
 * Execute an operation with a daemon client that includes user ID
 *
 * @param operation - Async function that receives a connected DaemonClient
 * @param config - Optional configuration (userId will default to current user)
 * @returns Promise resolving to the operation result
 *
 * @example
 * ```typescript
 * const history = await withDaemonClientForUser(async (client) => {
 *   return await client.getJobHistory('job-123');
 * });
 * ```
 */
export declare function withDaemonClientForUser<T>(operation: (client: DaemonClient) => Promise<T>, config?: DaemonClientConfig): Promise<T>;
/**
 * Check if daemon is running without connecting
 *
 * @param socketPath - Optional custom socket path
 * @returns true if daemon is running
 */
export declare function isDaemonRunning(socketPath?: string): boolean;
/**
 * Create a new daemon client with default configuration
 *
 * @param config - Optional configuration
 * @returns Configured DaemonClient instance
 */
export declare function createDaemonClient(config?: DaemonClientConfig): DaemonClient;
