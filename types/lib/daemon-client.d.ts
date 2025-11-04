/**
 * LSH Daemon Client
 * Provides communication interface between LSH and the job daemon
 */
import { EventEmitter } from 'events';
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
        cron?: string;
        interval?: number;
        timezone?: string;
    };
    environment?: Record<string, string>;
    workingDirectory?: string;
    user?: string;
    priority?: number;
    tags?: string[];
    enabled?: boolean;
    maxRetries?: number;
    timeout?: number;
    databaseSync?: boolean;
}
export declare class DaemonClient extends EventEmitter {
    private socketPath;
    private socket?;
    private connected;
    private messageId;
    private pendingMessages;
    private databasePersistence?;
    private userId?;
    private sessionId;
    private logger;
    constructor(socketPath?: string, userId?: string);
    /**
     * Connect to the daemon
     */
    connect(): Promise<boolean>;
    /**
     * Disconnect from the daemon
     */
    disconnect(): void;
    /**
     * Send a message to the daemon
     */
    private sendMessage;
    /**
     * Handle response from daemon
     */
    private handleResponse;
    /**
     * Get daemon status
     */
    getStatus(): Promise<DaemonStatus>;
    /**
     * Add a simple job to the daemon
     */
    addJob(jobSpec: Partial<JobSpec>): Promise<JobSpec>;
    /**
     * Create a cron job
     */
    createCronJob(jobSpec: CronJobSpec): Promise<JobSpec>;
    /**
     * Start a job
     */
    startJob(jobId: string): Promise<JobSpec>;
    /**
     * Trigger a job to run immediately (bypass schedule)
     */
    triggerJob(jobId: string): Promise<{
        success: boolean;
        output?: string;
        error?: string;
    }>;
    /**
     * Stop a job
     */
    stopJob(jobId: string, signal?: string): Promise<JobSpec>;
    /**
     * List all jobs
     */
    listJobs(filter?: JobFilter): Promise<JobSpec[]>;
    /**
     * Get job details
     */
    getJob(jobId: string): Promise<JobSpec>;
    /**
     * Remove a job
     */
    removeJob(jobId: string, force?: boolean): Promise<boolean>;
    /**
     * Restart the daemon
     */
    restartDaemon(): Promise<void>;
    /**
     * Stop the daemon
     */
    stopDaemon(): Promise<void>;
    /**
     * Sync job status to Supabase database
     */
    syncJobToDatabase(jobSpec: CronJobSpec, status: string): Promise<void>;
    /**
     * Create a database-backed cron job
     */
    createDatabaseCronJob(jobSpec: CronJobSpec): Promise<JobSpec>;
    /**
     * Get job execution history from database
     */
    getJobHistory(jobId?: string, limit?: number): Promise<ShellJob[]>;
    /**
     * Get job statistics from database
     */
    getJobStatistics(jobId?: string): Promise<JobStatistics>;
    /**
     * Calculate job statistics
     */
    private calculateJobStatistics;
    /**
     * Check if daemon is running
     */
    isDaemonRunning(): boolean;
    /**
     * Get connection status
     */
    isConnected(): boolean;
}
export default DaemonClient;
