/**
 * LSH Daemon Client
 * Provides communication interface between LSH and the job daemon
 */
import { EventEmitter } from 'events';
export interface DaemonMessage {
    command: string;
    args?: any;
    id?: string;
}
export interface DaemonResponse {
    success: boolean;
    data?: any;
    error?: string;
    id?: string;
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
    getStatus(): Promise<any>;
    /**
     * Add a simple job to the daemon
     */
    addJob(jobSpec: any): Promise<any>;
    /**
     * Create a cron job
     */
    createCronJob(jobSpec: CronJobSpec): Promise<any>;
    /**
     * Start a job
     */
    startJob(jobId: string): Promise<any>;
    /**
     * Trigger a job to run immediately (bypass schedule)
     */
    triggerJob(jobId: string): Promise<any>;
    /**
     * Stop a job
     */
    stopJob(jobId: string, signal?: string): Promise<any>;
    /**
     * List all jobs
     */
    listJobs(filter?: any): Promise<any[]>;
    /**
     * Get job details
     */
    getJob(jobId: string): Promise<any>;
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
    createDatabaseCronJob(jobSpec: CronJobSpec): Promise<any>;
    /**
     * Get job execution history from database
     */
    getJobHistory(jobId?: string, limit?: number): Promise<any[]>;
    /**
     * Get job statistics from database
     */
    getJobStatistics(jobId?: string): Promise<any>;
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
