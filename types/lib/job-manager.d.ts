/**
 * Job Management System for LSH Shell
 * Supports CRUD operations on shell jobs and system processes
 *
 * REFACTORED: Now extends BaseJobManager to eliminate duplication
 */
import { ChildProcess } from 'child_process';
import { BaseJobManager, BaseJobSpec, BaseJobFilter } from './base-job-manager.js';
/**
 * Extended job specification with JobManager-specific fields
 */
export interface JobSpec extends BaseJobSpec {
    type: 'shell' | 'system' | 'scheduled' | 'service';
    ppid?: number;
    cpuUsage?: number;
    memoryUsage?: number;
    maxMemory?: number;
    maxCpu?: number;
    logFile?: string;
    process?: ChildProcess;
    timer?: NodeJS.Timeout;
}
export interface JobFilter extends BaseJobFilter {
    type?: string[];
}
export interface JobUpdate {
    name?: string;
    priority?: number;
    maxMemory?: number;
    maxCpu?: number;
    timeout?: number;
    tags?: string[];
    description?: string;
    schedule?: JobSpec['schedule'];
}
export interface SystemProcess {
    pid: number;
    ppid: number;
    name: string;
    command: string;
    user: string;
    cpu: number;
    memory: number;
    startTime: Date;
    status: string;
}
export declare class JobManager extends BaseJobManager {
    private nextJobId;
    private persistenceFile;
    private schedulerInterval?;
    private initPromise;
    constructor(persistenceFile?: string);
    /**
     * Wait for initialization to complete
     */
    ready(): Promise<void>;
    /**
     * Create a job and persist to filesystem
     */
    createJob(spec: Partial<JobSpec>): Promise<BaseJobSpec>;
    /**
     * Update a job and persist to filesystem
     */
    updateJob(jobId: string, updates: JobUpdate): Promise<BaseJobSpec>;
    /**
     * Remove a job and persist to filesystem
     */
    removeJob(jobId: string, force?: boolean): Promise<boolean>;
    /**
     * Update job status and persist to filesystem
     */
    protected updateJobStatus(jobId: string, status: BaseJobSpec['status'], additionalUpdates?: Partial<BaseJobSpec>): Promise<BaseJobSpec>;
    /**
     * Start a job (execute it as a process)
     */
    startJob(jobId: string): Promise<BaseJobSpec>;
    /**
     * Stop a running job
     */
    stopJob(jobId: string, signal?: string): Promise<BaseJobSpec>;
    /**
     * Create and immediately start a job
     */
    runJob(spec: Partial<JobSpec>): Promise<BaseJobSpec>;
    /**
     * Pause a job (stop it but keep for later resumption)
     */
    pauseJob(jobId: string): Promise<BaseJobSpec>;
    /**
     * Resume a paused job
     */
    resumeJob(jobId: string): Promise<BaseJobSpec>;
    /**
     * Kill a job forcefully
     */
    killJob(jobId: string, signal?: string): Promise<BaseJobSpec>;
    /**
     * Monitor a job's resource usage
     */
    monitorJob(jobId: string): Promise<any>;
    /**
     * Get system processes
     */
    getSystemProcesses(): Promise<SystemProcess[]>;
    /**
     * Get job statistics
     */
    getJobStats(): any;
    /**
     * Clean up old jobs
     */
    cleanupJobs(olderThanHours?: number): Promise<number>;
    private loadPersistedJobs;
    private persistJobs;
    private startScheduler;
    private checkScheduledJobs;
    private setupCleanupHandlers;
    /**
     * Override cleanup to include scheduler
     */
    cleanup(): Promise<void>;
}
export default JobManager;
