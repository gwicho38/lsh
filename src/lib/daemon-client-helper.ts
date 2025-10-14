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
 * Default socket path for the daemon
 */
export function getDefaultSocketPath(): string {
  return `/tmp/lsh-job-daemon-${process.env.USER || 'user'}.sock`;
}

/**
 * Get default user ID
 */
export function getDefaultUserId(): string {
  return process.env.USER || 'user';
}

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
export async function withDaemonClient<T>(
  operation: (client: DaemonClient) => Promise<T>,
  config: DaemonClientConfig = {}
): Promise<T> {
  const {
    socketPath = getDefaultSocketPath(),
    userId,
    requireRunning = true,
    exitOnError = true
  } = config;

  const client = new DaemonClient(socketPath, userId);

  try {
    // Check if daemon is running (if required)
    if (requireRunning && !client.isDaemonRunning()) {
      const error = new Error('Daemon is not running. Start it with: lsh daemon start');
      if (exitOnError) {
        console.error('❌', error.message);
        process.exit(1);
      }
      throw error;
    }

    // Connect to daemon
    await client.connect();

    // Execute the operation
    const result = await operation(client);

    // Disconnect
    client.disconnect();

    return result;

  } catch (error: any) {
    // Always disconnect on error
    client.disconnect();

    // Handle errors with helpful messages
    if (error.message.includes('Permission denied')) {
      const enhancedError = new Error(
        `❌ ${error.message}\n` +
        `The daemon socket may be owned by another user.\n` +
        `Try starting your own daemon with: lsh daemon start`
      );
      if (exitOnError) {
        console.error(enhancedError.message);
        process.exit(1);
      }
      throw enhancedError;
    } else if (error.message.includes('not found') || error.message.includes('ENOENT')) {
      const enhancedError = new Error(
        `❌ Daemon socket not found.\n` +
        `Start the daemon with: lsh daemon start`
      );
      if (exitOnError) {
        console.error(enhancedError.message);
        process.exit(1);
      }
      throw enhancedError;
    } else if (error.message.includes('ECONNREFUSED')) {
      const enhancedError = new Error(
        `❌ Daemon is not responding.\n` +
        `The daemon may have crashed. Try restarting with: lsh daemon restart`
      );
      if (exitOnError) {
        console.error(enhancedError.message);
        process.exit(1);
      }
      throw enhancedError;
    } else {
      if (exitOnError) {
        console.error('❌ Error:', error.message);
        process.exit(1);
      }
      throw error;
    }
  }
}

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
export async function withDaemonClientForUser<T>(
  operation: (client: DaemonClient) => Promise<T>,
  config: DaemonClientConfig = {}
): Promise<T> {
  return withDaemonClient(operation, {
    ...config,
    userId: config.userId || getDefaultUserId()
  });
}

/**
 * Check if daemon is running without connecting
 *
 * @param socketPath - Optional custom socket path
 * @returns true if daemon is running
 */
export function isDaemonRunning(socketPath?: string): boolean {
  const client = new DaemonClient(socketPath || getDefaultSocketPath());
  return client.isDaemonRunning();
}

/**
 * Create a new daemon client with default configuration
 *
 * @param config - Optional configuration
 * @returns Configured DaemonClient instance
 */
export function createDaemonClient(config: DaemonClientConfig = {}): DaemonClient {
  const socketPath = config.socketPath || getDefaultSocketPath();
  const userId = config.userId;
  return new DaemonClient(socketPath, userId);
}
