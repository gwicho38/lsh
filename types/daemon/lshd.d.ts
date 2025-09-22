#!/usr/bin/env node
/**
 * LSH Job Daemon - Persistent job execution service
 * Runs independently of LSH shell processes to ensure reliable job execution
 */
import { EventEmitter } from 'events';
import { JobSpec } from '../lib/job-manager.js';
export interface DaemonConfig {
    pidFile: string;
    logFile: string;
    jobsFile: string;
    socketPath: string;
    checkInterval: number;
    maxLogSize: number;
    autoRestart: boolean;
}
export declare class LSHJobDaemon extends EventEmitter {
    private config;
    private jobManager;
    private isRunning;
    private checkTimer?;
    private logStream?;
    private ipcServer?;
    private lastRunTimes;
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
    getStatus(): Promise<any>;
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
    }>;
    /**
     * Stop a job
     */
    stopJob(jobId: string, signal?: string): Promise<JobSpec>;
    /**
     * Get job information
     */
    getJob(jobId: string): JobSpec | undefined;
    /**
     * Sanitize job objects for safe JSON serialization
     */
    private sanitizeJobForSerialization;
    /**
     * List all jobs
     */
    listJobs(filter?: any, limit?: number): JobSpec[];
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
