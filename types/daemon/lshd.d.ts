#!/usr/bin/env node
/**
 * LSH Job Daemon - Persistent job execution service
 * Runs independently of LSH shell processes to ensure reliable job execution
 */
import { EventEmitter } from 'events';
import { JobSpec } from '../lib/job-manager.js';
import { DaemonStatus, JobFilter } from '../lib/daemon-client.js';
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
    constructor(config?: Partial<DaemonConfig>);
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
    getStatus(): Promise<DaemonStatus>;
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
