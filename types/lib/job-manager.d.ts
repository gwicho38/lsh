/**
 * Comprehensive Job Management System for LSH Shell
 * Supports CRUD operations on shell jobs and system processes
 */
import { ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
export interface JobSpec {
    id: string;
    name: string;
    command: string;
    args?: string[];
    type: 'shell' | 'system' | 'scheduled' | 'service';
    status: 'created' | 'running' | 'stopped' | 'completed' | 'failed' | 'killed';
    priority: number;
    pid?: number;
    ppid?: number;
    createdAt: Date;
    startedAt?: Date;
    completedAt?: Date;
    cpuUsage?: number;
    memoryUsage?: number;
    env?: Record<string, string>;
    cwd?: string;
    user?: string;
    maxMemory?: number;
    maxCpu?: number;
    timeout?: number;
    schedule?: {
        cron?: string;
        interval?: number;
        nextRun?: Date;
    };
    stdout?: string;
    stderr?: string;
    logFile?: string;
    tags: string[];
    description?: string;
    process?: ChildProcess;
    timer?: NodeJS.Timeout;
}
export interface JobFilter {
    status?: string[];
    type?: string[];
    tags?: string[];
    user?: string;
    namePattern?: RegExp;
    createdAfter?: Date;
    createdBefore?: Date;
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
export declare class JobManager extends EventEmitter {
    private jobs;
    private nextJobId;
    private persistenceFile;
    private schedulerInterval?;
    constructor(persistenceFile?: string);
    /**
     * Create a new job
     */
    createJob(spec: Partial<JobSpec>): Promise<JobSpec>;
    /**
     * Start a job (execute it)
     */
    startJob(jobId: string): Promise<JobSpec>;
    /**
     * Create and immediately start a job
     */
    runJob(spec: Partial<JobSpec>): Promise<JobSpec>;
    /**
     * Get a specific job
     */
    getJob(jobId: string): JobSpec | undefined;
    /**
     * List all jobs with optional filtering
     */
    listJobs(filter?: JobFilter): JobSpec[];
    /**
     * Get job statistics
     */
    getJobStats(): any;
    /**
     * Get system processes
     */
    getSystemProcesses(): Promise<SystemProcess[]>;
    /**
     * Monitor a job's resource usage
     */
    monitorJob(jobId: string): Promise<any>;
    /**
     * Update job properties
     */
    updateJob(jobId: string, updates: JobUpdate): Promise<JobSpec>;
    /**
     * Pause a running job
     */
    pauseJob(jobId: string): Promise<JobSpec>;
    /**
     * Resume a paused job
     */
    resumeJob(jobId: string): Promise<JobSpec>;
    /**
     * Kill a running job
     */
    killJob(jobId: string, signal?: string): Promise<JobSpec>;
    /**
     * Remove a job from the job list
     */
    removeJob(jobId: string, force?: boolean): Promise<boolean>;
    /**
     * Clean up completed/failed jobs
     */
    cleanupJobs(olderThanHours?: number): Promise<number>;
    /**
     * Kill system process by PID
     */
    killSystemProcess(pid: number, signal?: string): Promise<boolean>;
    private startScheduler;
    private checkScheduledJobs;
    private loadPersistedJobs;
    private persistJobs;
    private setupCleanupHandlers;
    /**
     * Shutdown the job manager
     */
    shutdown(): Promise<void>;
}
export default JobManager;
