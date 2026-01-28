#!/usr/bin/env node
/**
 * LSH Job Daemon - Persistent job execution service
 * Runs independently of LSH shell processes to ensure reliable job execution
 */
import { EventEmitter } from 'events';
import { JobSpec } from '../lib/job-manager.js';
import { DaemonStatus, JobFilter } from '../lib/daemon-client.js';
import { SchedulerMetrics } from '../lib/optimized-job-scheduler.js';
/**
 * IPC Message structure for daemon communication
 */
export interface IPCMessage {
    id?: string;
    command: string;
    args?: Record<string, unknown>;
}
/**
 * IPC Response structure
 */
export interface IPCResponse {
    message?: string;
    [key: string]: unknown;
}
export interface DaemonConfig {
    pidFile: string;
    logFile: string;
    jobsFile: string;
    socketPath: string;
    checkInterval: number;
    maxLogSize: number;
    autoRestart: boolean;
    apiEnabled?: boolean;
    apiPort?: number;
    apiKey?: string;
    enableWebhooks?: boolean;
    webhookEndpoints?: string[];
    useOptimizedScheduler?: boolean;
}
export declare class LSHJobDaemon extends EventEmitter {
    private config;
    private jobManager;
    private isRunning;
    private checkTimer?;
    private logStream?;
    private ipcServer?;
    private lastRunTimes;
    private logger;
    private optimizedScheduler?;
    constructor(config?: Partial<DaemonConfig>);
    /**
     * Initialize the optimized job scheduler (Issue #108)
     * Uses a priority queue-based approach for O(log n) scheduling vs O(n) linear scan
     */
    private initializeOptimizedScheduler;
    /**
     * Execute a scheduled job (used by optimized scheduler)
     */
    private executeScheduledJob;
    /**
     * Start the daemon
     */
    start(): Promise<void>;
    /**
     * Stop the daemon gracefully
     */
    stop(): Promise<void>;
    /**
     * Restart the daemon
     */
    restart(): Promise<void>;
    /**
     * Get daemon status
     */
    getStatus(): Promise<DaemonStatus & {
        scheduler?: SchedulerMetrics;
    }>;
    /**
     * Add a job to the daemon
     */
    addJob(jobSpec: Partial<JobSpec>): Promise<JobSpec>;
    /**
     * Start a job
     */
    startJob(jobId: string): Promise<JobSpec>;
    /**
     * Trigger a job to run immediately (returns sanitized result with output)
     */
    triggerJob(jobId: string): Promise<{
        success: boolean;
        output?: string;
        error?: string;
        warnings?: string[];
    }>;
    /**
     * Stop a job
     */
    stopJob(jobId: string, signal?: string): Promise<JobSpec>;
    /**
     * Get job information
     */
    getJob(jobId: string): Promise<Record<string, unknown> | undefined>;
    /**
     * Sanitize job objects for safe JSON serialization
     */
    private sanitizeJobForSerialization;
    /**
     * List all jobs
     */
    listJobs(filter?: JobFilter, limit?: number): Promise<Array<Record<string, unknown>>>;
    /**
     * Remove a job
     */
    removeJob(jobId: string, force?: boolean): Promise<boolean>;
    private isDaemonRunning;
    private killExistingDaemons;
    private startJobScheduler;
    /**
     * Start the optimized priority queue-based scheduler (Issue #108)
     * Uses O(log n) operations instead of O(n) linear scans
     */
    private startOptimizedScheduler;
    /**
     * Start the legacy interval-based scheduler
     * Uses O(n) linear scan every checkInterval milliseconds
     */
    private startLegacyScheduler;
    private checkScheduledJobs;
    private shouldRunByCron;
    private matchesCronField;
    /**
     * Reset job status for recurring cron jobs after completion
     */
    private resetRecurringJobStatus;
    private cleanupCompletedJobs;
    private stopAllJobs;
    private setupLogging;
    private setupIPC;
    private startIPCServer;
    private handleIPCMessage;
    private log;
    private rotateLogs;
    private setupSignalHandlers;
}
export default LSHJobDaemon;
