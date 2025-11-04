/**
 * LSH Daemon Client
 * Provides communication interface between LSH and the job daemon
 */

import * as net from 'net';
import * as fs from 'fs';
import * as _path from 'path';
import { EventEmitter } from 'events';
import DatabasePersistence from './database-persistence.js';
import { createLogger } from './logger.js';
import { JobSpec } from './job-manager.js';
import { ShellJob } from './database-schema.js';

export interface DaemonMessage {
  command: string;
  args?: Record<string, unknown>;
  id?: string;
}

export interface DaemonResponse {
  success: boolean;
  data?: unknown;
  error?: string;
  id?: string;
}

export interface DaemonStatus {
  running: boolean;
  uptime: number;
  jobCount: number;
  pid?: number;
  memoryUsage?: {
    heapUsed: number;
    heapTotal: number;
    external: number;
    [key: string]: number;
  };
  jobs?: {
    total: number;
    running: number;
    completed?: number;
    failed?: number;
    [key: string]: number | undefined;
  };
  [key: string]: unknown;
}

export interface JobFilter {
  status?: string | string[];
  type?: string | string[];
  tags?: string[];
  [key: string]: unknown;
}

export interface JobStatistics {
  totalJobs: number;
  byStatus: Record<string, number>;
  successRate: number;
  lastExecution: string | null;
}

export interface CronJobSpec {
  id: string;
  name: string;
  description?: string;
  command: string;
  schedule: {
    cron?: string;        // Cron expression (e.g., "0 2 * * *" for daily at 2 AM)
    interval?: number;     // Interval in milliseconds
    timezone?: string;     // Timezone (default: system timezone)
  };
  environment?: Record<string, string>;
  workingDirectory?: string;
  user?: string;
  priority?: number;
  tags?: string[];
  enabled?: boolean;
  maxRetries?: number;
  timeout?: number;        // Timeout in milliseconds
  databaseSync?: boolean;  // Sync job status to Supabase
}

export class DaemonClient extends EventEmitter {
  private socketPath: string;
  private socket?: net.Socket;
  private connected: boolean = false;
  private messageId: number = 0;
  private pendingMessages: Map<string, { resolve: Function; reject: Function }> = new Map();
  private databasePersistence?: DatabasePersistence;
  private userId?: string;
  private sessionId: string;
  private logger = createLogger('DaemonClient');

  constructor(socketPath?: string, userId?: string) {
    super();
    // Use user-specific socket path if not provided
    this.socketPath = socketPath || `/tmp/lsh-job-daemon-${process.env.USER || 'default'}.sock`;
    this.userId = userId;
    this.sessionId = `lsh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    if (userId) {
      this.databasePersistence = new DatabasePersistence(userId);
    }
  }

  /**
   * Connect to the daemon
   */
  public async connect(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (this.connected) {
        resolve(true);
        return;
      }

      // Check if socket file exists
      if (!fs.existsSync(this.socketPath)) {
        reject(new Error(`Daemon socket not found at ${this.socketPath}. Is the daemon running?`));
        return;
      }

      // Check socket permissions
      try {
        fs.accessSync(this.socketPath, fs.constants.R_OK | fs.constants.W_OK);
      } catch (_err) {
        const stats = fs.statSync(this.socketPath);
        const currentUid = process.getuid?.();
        const owner = currentUid !== undefined && stats.uid === currentUid ? 'you' : 'another user';
        reject(new Error(`Permission denied to access socket at ${this.socketPath}. Socket is owned by ${owner}. You may need to start your own daemon with: lsh daemon start`));
        return;
      }

      this.socket = new net.Socket();
      
      this.socket.on('connect', () => {
        this.connected = true;
        this.emit('connected');
        resolve(true);
      });

      let buffer = '';
      const MAX_BUFFER_SIZE = 1024 * 1024; // 1MB limit

      this.socket.on('data', (data: Buffer) => {
        try {
          buffer += data.toString();

          // Prevent buffer from growing too large
          if (buffer.length > MAX_BUFFER_SIZE) {
            this.logger.error('Daemon response too large, truncating buffer');
            buffer = buffer.substring(buffer.length - MAX_BUFFER_SIZE / 2);
          }

          // Try to parse complete JSON messages
          // Messages might be split across multiple data events
          while (buffer.length > 0) {
            try {
              // Try to find complete JSON message boundaries
              let jsonStart = -1;
              let braceCount = 0;
              let inString = false;
              let escaped = false;

              for (let i = 0; i < buffer.length; i++) {
                const char = buffer[i];

                if (escaped) {
                  escaped = false;
                  continue;
                }

                if (char === '\\') {
                  escaped = true;
                  continue;
                }

                if (char === '"' && !escaped) {
                  inString = !inString;
                  continue;
                }

                if (inString) continue;

                if (char === '{') {
                  if (jsonStart === -1) jsonStart = i;
                  braceCount++;
                } else if (char === '}') {
                  braceCount--;

                  if (braceCount === 0 && jsonStart !== -1) {
                    // Found complete JSON object
                    const jsonStr = buffer.substring(jsonStart, i + 1);
                    try {
                      const response: DaemonResponse = JSON.parse(jsonStr);
                      this.handleResponse(response);
                      buffer = buffer.substring(i + 1); // Remove processed part
                      break;
                    } catch (parseError) {
                      this.logger.error('Invalid JSON in daemon response', parseError as Error, { jsonContent: jsonStr.substring(0, 200) });
                      buffer = buffer.substring(i + 1); // Skip this invalid JSON
                      break;
                    }
                  }
                }
              }

              // If we didn't find a complete JSON object, wait for more data
              if (braceCount > 0 || jsonStart === -1) {
                break;
              }

            } catch (parseError) {
              this.logger.error('JSON parsing error', parseError as Error);
              // Try to find the start of the next JSON object
              const nextStart = buffer.indexOf('{', 1);
              if (nextStart > 0) {
                buffer = buffer.substring(nextStart);
              } else {
                buffer = '';
                break;
              }
            }
          }
        } catch (error) {
          this.logger.error('Failed to process daemon response', error as Error);
          buffer = ''; // Reset buffer on error
        }
      });

      this.socket.on('error', (error: Error & { code?: string }) => {
        this.connected = false;

        // Enhance error messages for common issues
        if (error.code === 'EACCES') {
          error.message = `Permission denied to access daemon socket at ${this.socketPath}. The socket may be owned by another user. Try starting your own daemon with: lsh daemon start`;
        } else if (error.code === 'ECONNREFUSED') {
          error.message = `Daemon is not responding at ${this.socketPath}. The daemon may have crashed. Try restarting with: lsh daemon restart`;
        } else if (error.code === 'ENOENT') {
          error.message = `Daemon socket not found at ${this.socketPath}. Start the daemon with: lsh daemon start`;
        }

        this.emit('error', error);
        reject(error);
      });

      this.socket.on('close', () => {
        this.connected = false;
        this.emit('disconnected');
      });

      this.socket.connect(this.socketPath);
    });
  }

  /**
   * Disconnect from the daemon
   */
  public disconnect(): void {
    if (this.socket) {
      this.socket.destroy();
      this.socket = undefined;
    }
    this.connected = false;
  }

  /**
   * Send a message to the daemon
   */
  private async sendMessage(message: DaemonMessage): Promise<unknown> {
    if (!this.connected || !this.socket) {
      throw new Error('Not connected to daemon');
    }

    const id = (++this.messageId).toString();
    message.id = id;

    return new Promise((resolve, reject) => {
      // Set timeout for response (reduced for faster failure detection)
      const timeoutId = setTimeout(() => {
        if (this.pendingMessages.has(id)) {
          this.pendingMessages.delete(id);
          reject(new Error(`Request timeout after 10 seconds for command: ${message.command}`));
        }
      }, 10000); // 10 second timeout

      // Store timeout ID for cleanup
      this.pendingMessages.set(id, {
        resolve: (data: unknown) => {
          clearTimeout(timeoutId);
          resolve(data);
        },
        reject: (error: Error) => {
          clearTimeout(timeoutId);
          reject(error);
        }
      });

      this.socket!.write(JSON.stringify(message));
    });
  }

  /**
   * Handle response from daemon
   */
  private handleResponse(response: DaemonResponse): void {
    if (response.id && this.pendingMessages.has(response.id)) {
      const { resolve, reject } = this.pendingMessages.get(response.id)!;
      this.pendingMessages.delete(response.id);

      if (response.success) {
        resolve(response.data);
      } else {
        reject(new Error(response.error || 'Unknown error'));
      }
    }
  }

  /**
   * Get daemon status
   */
  public async getStatus(): Promise<DaemonStatus> {
    return await this.sendMessage({ command: 'status' }) as Promise<DaemonStatus>;
  }

  /**
   * Add a simple job to the daemon
   */
  public async addJob(jobSpec: Partial<JobSpec>): Promise<JobSpec> {
    return await this.sendMessage({
      command: 'addJob',
      args: { jobSpec }
    }) as Promise<JobSpec>;
  }

  /**
   * Create a cron job
   */
  public async createCronJob(jobSpec: CronJobSpec): Promise<JobSpec> {
    const daemonJobSpec = {
      id: jobSpec.id,
      name: jobSpec.name,
      command: jobSpec.command,
      type: 'scheduled',
      schedule: jobSpec.schedule,
      env: jobSpec.environment || {},
      cwd: jobSpec.workingDirectory || process.cwd(),
      user: jobSpec.user || process.env.USER,
      priority: jobSpec.priority || 0,
      tags: jobSpec.tags || [],
      enabled: jobSpec.enabled !== false,
      maxRetries: jobSpec.maxRetries || 3,
      timeout: jobSpec.timeout || 0,
    };

    const result = await this.sendMessage({
      command: 'addJob',
      args: { jobSpec: daemonJobSpec }
    });

    // Sync to database if enabled
    if (jobSpec.databaseSync && this.databasePersistence) {
      await this.syncJobToDatabase(jobSpec, 'created');
    }

    return result as JobSpec;
  }

  /**
   * Start a job
   */
  public async startJob(jobId: string): Promise<JobSpec> {
    const result = await this.sendMessage({
      command: 'startJob',
      args: { jobId }
    });

    // Sync to database
    if (this.databasePersistence) {
      await this.syncJobToDatabase({ id: jobId } as CronJobSpec, 'running');
    }

    return result as JobSpec;
  }

  /**
   * Trigger a job to run immediately (bypass schedule)
   */
  public async triggerJob(jobId: string): Promise<{ success: boolean; output?: string; error?: string }> {
    const result = await this.sendMessage({
      command: 'triggerJob',
      args: { jobId }
    });

    // Record job execution in database
    if (this.databasePersistence) {
      try {
        const jobResult = result as { success: boolean; output?: string; error?: string };
        await this.databasePersistence.saveJob({
          user_id: this.userId,
          session_id: this.sessionId,
          job_id: jobId,
          command: `Triggered execution of ${jobId}`,
          status: jobResult.success ? 'completed' : 'failed',
          working_directory: process.cwd(),
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
          exit_code: jobResult.success ? 0 : 1,
          output: jobResult.output,
          error: jobResult.error
        });
      } catch (error) {
        // Don't fail the trigger if database save fails
        const err = error as Error;
        this.logger.warn(`Failed to save job execution to database: ${err.message}`);
      }
    }

    return result as { success: boolean; output?: string; error?: string };
  }

  /**
   * Stop a job
   */
  public async stopJob(jobId: string, signal: string = 'SIGTERM'): Promise<JobSpec> {
    const result = await this.sendMessage({
      command: 'stopJob',
      args: { jobId, signal }
    });

    // Sync to database
    if (this.databasePersistence) {
      await this.syncJobToDatabase({ id: jobId } as CronJobSpec, 'stopped');
    }

    return result as JobSpec;
  }

  /**
   * List all jobs
   */
  public async listJobs(filter?: JobFilter): Promise<JobSpec[]> {
    try {
      const result = await this.sendMessage({
        command: 'listJobs',
        args: {
          filter,
          limit: 50 // Limit results to prevent oversized responses
        }
      });

      // Ensure we return an array
      if (Array.isArray(result)) {
        return result as JobSpec[];
      } else if (result && typeof result === 'object' && 'jobs' in result && Array.isArray((result as Record<string, unknown>).jobs)) {
        return (result as { jobs: JobSpec[] }).jobs;
      } else {
        this.logger.warn('Unexpected job list format', { resultType: typeof result });
        return [];
      }
    } catch (error) {
      this.logger.error('Failed to list jobs', error as Error);
      // Return empty array instead of throwing to prevent crashes
      return [];
    }
  }

  /**
   * Get job details
   */
  public async getJob(jobId: string): Promise<JobSpec> {
    return await this.sendMessage({
      command: 'getJob',
      args: { jobId }
    }) as Promise<JobSpec>;
  }

  /**
   * Remove a job
   */
  public async removeJob(jobId: string, force: boolean = false): Promise<boolean> {
    const result = await this.sendMessage({
      command: 'removeJob',
      args: { jobId, force }
    });

    // Remove from database
    if (this.databasePersistence) {
      // Note: DatabasePersistence doesn't have a removeJob method yet
      // This would need to be implemented
    }

    return result as boolean;
  }

  /**
   * Restart the daemon
   */
  public async restartDaemon(): Promise<void> {
    await this.sendMessage({ command: 'restart' });
  }

  /**
   * Stop the daemon
   */
  public async stopDaemon(): Promise<void> {
    await this.sendMessage({ command: 'stop' });
  }

  /**
   * Sync job status to Supabase database
   */
  public async syncJobToDatabase(jobSpec: CronJobSpec, status: string): Promise<void> {
    if (!this.databasePersistence) return;

    try {
      await this.databasePersistence.saveJob({
        session_id: this.databasePersistence.getSessionId(),
        job_id: jobSpec.id,
        command: jobSpec.command,
        status: status as 'running' | 'completed' | 'failed' | 'stopped',
        working_directory: jobSpec.workingDirectory || process.cwd(),
        started_at: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error('Failed to sync job to database', error as Error);
    }
  }

  /**
   * Create a database-backed cron job
   */
  public async createDatabaseCronJob(jobSpec: CronJobSpec): Promise<JobSpec> {
    // Create job in daemon
    const daemonResult = await this.createCronJob({
      ...jobSpec,
      databaseSync: true
    });

    // Create initial database record
    if (this.databasePersistence) {
      await this.databasePersistence.saveJob({
        session_id: this.databasePersistence.getSessionId(),
        job_id: jobSpec.id,
        command: jobSpec.command,
        status: 'running',
        working_directory: jobSpec.workingDirectory || process.cwd(),
        started_at: new Date().toISOString(),
      });
    }

    return daemonResult;
  }

  /**
   * Get job execution history from database
   */
  public async getJobHistory(jobId?: string, limit: number = 100): Promise<ShellJob[]> {
    if (!this.databasePersistence) {
      throw new Error('Database persistence not configured');
    }

    const jobs = await this.databasePersistence.getActiveJobs();

    if (jobId) {
      return jobs.filter(job => job.job_id === jobId);
    }

    return jobs.slice(0, limit);
  }

  /**
   * Get job statistics from database
   */
  public async getJobStatistics(jobId?: string): Promise<JobStatistics> {
    if (!this.databasePersistence) {
      throw new Error('Database persistence not configured');
    }

    const jobs = await this.databasePersistence.getActiveJobs();

    if (jobId) {
      const jobJobs = jobs.filter(job => job.job_id === jobId);
      return this.calculateJobStatistics(jobJobs);
    }

    return this.calculateJobStatistics(jobs);
  }

  /**
   * Calculate job statistics
   */
  private calculateJobStatistics(jobs: ShellJob[]): JobStatistics {
    const total = jobs.length;
    const byStatus = jobs.reduce((acc, job) => {
      const status = String(job.status);
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const completedCount = byStatus.completed || 0;
    const successRate = total > 0 ? (completedCount / total) * 100 : 0;

    return {
      totalJobs: total,
      byStatus,
      successRate,
      lastExecution: jobs.length > 0 ? (jobs[0].started_at || null) : null,
    };
  }

  /**
   * Check if daemon is running
   */
  public isDaemonRunning(): boolean {
    if (!fs.existsSync(this.socketPath)) {
      return false;
    }

    try {
      // Try to access the socket to verify it's working
      fs.accessSync(this.socketPath, fs.constants.R_OK | fs.constants.W_OK);
      return true;
    } catch (_error) {
      return false;
    }
  }

  /**
   * Get connection status
   */
  public isConnected(): boolean {
    return this.connected;
  }
}

export default DaemonClient;