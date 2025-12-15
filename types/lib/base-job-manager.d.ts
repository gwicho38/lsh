/**
 * Base Job Manager
 * Abstract base class for all job management systems to eliminate duplication in:
 * - Job lifecycle management (create, start, stop, pause, resume, remove)
 * - Job status tracking and updates
 * - Event emission and handling
 * - Statistics and reporting
 * - Storage abstraction
 *
 * Subclasses implement storage-specific operations (memory, database, filesystem)
 */
import { EventEmitter } from 'events';
import { Logger } from './logger.js';
/**
 * Unified job specification for all LSH job types.
 *
 * Used by job managers, daemon, and cron system to define, track, and execute jobs.
 * Jobs can be one-shot commands or scheduled recurring tasks.
 *
 * @example
 * ```typescript
 * const job: Partial<BaseJobSpec> = {
 *   name: 'rotate-secrets',
 *   command: './scripts/rotate.sh',
 *   schedule: { cron: '0 2 * * 0' }, // Weekly at 2am Sunday
 *   tags: ['secrets', 'maintenance'],
 *   timeout: 300000, // 5 minutes
 * };
 * ```
 */
export interface BaseJobSpec {
    /** Unique job identifier (auto-generated if not provided) */
    id: string;
    /** Human-readable job name for display and logging */
    name: string;
    /** Command to execute (can be shell command or script path) */
    command: string;
    /** Arguments to pass to the command */
    args?: string[];
    /**
     * Current job lifecycle state:
     * - `created`: Job defined but never started
     * - `running`: Currently executing
     * - `stopped`: Manually stopped
     * - `paused`: Temporarily suspended (can be resumed)
     * - `completed`: Finished successfully (exitCode 0)
     * - `failed`: Finished with error (exitCode != 0)
     * - `killed`: Terminated by signal (SIGTERM/SIGKILL)
     */
    status: 'created' | 'running' | 'stopped' | 'paused' | 'completed' | 'failed' | 'killed';
    /** When the job spec was created */
    createdAt: Date;
    /** When the job started executing (first run for scheduled jobs) */
    startedAt?: Date;
    /** When the job finished (most recent completion for scheduled jobs) */
    completedAt?: Date;
    /** Environment variables to set for job execution */
    env?: Record<string, string>;
    /** Working directory for command execution (defaults to process.cwd()) */
    cwd?: string;
    /** User to run job as (defaults to current user) */
    user?: string;
    /**
     * Schedule configuration for recurring jobs.
     * Either `cron` OR `interval` should be set, not both.
     */
    schedule?: {
        /** Cron expression (e.g., "0 2 * * *" for daily at 2am) */
        cron?: string;
        /** Interval in milliseconds between runs */
        interval?: number;
        /** Next scheduled run time (computed by scheduler) */
        nextRun?: Date;
    };
    /** Tags for filtering and grouping jobs */
    tags?: string[];
    /** Human-readable description of what the job does */
    description?: string;
    /** Priority for execution ordering (1-10, higher = more important, default: 5) */
    priority?: number;
    /** Process ID when running */
    pid?: number;
    /** Exit code from most recent execution */
    exitCode?: number;
    /** Captured stdout from most recent execution */
    stdout?: string;
    /** Captured stderr from most recent execution */
    stderr?: string;
    /** Maximum execution time in milliseconds before kill */
    timeout?: number;
    /** Maximum number of retry attempts on failure (default: 3) */
    maxRetries?: number;
    /** Current retry count for this execution */
    retryCount?: number;
    /** Whether to persist job state to database (default: true) */
    databaseSync?: boolean;
}
/**
 * Job filter criteria
 */
export interface BaseJobFilter {
    status?: string | string[];
    type?: string | string[];
    tags?: string[];
    user?: string;
    namePattern?: string | RegExp;
    createdAfter?: Date;
    createdBefore?: Date;
}
/**
 * Job update specification
 */
export interface BaseJobUpdate {
    name?: string;
    description?: string;
    priority?: number;
    tags?: string[];
    schedule?: BaseJobSpec['schedule'];
    env?: Record<string, string>;
    timeout?: number;
    maxRetries?: number;
}
/**
 * Job execution record
 */
export interface BaseJobExecution {
    executionId: string;
    jobId: string;
    jobName: string;
    command: string;
    startTime: Date;
    endTime?: Date;
    duration?: number;
    status: 'running' | 'completed' | 'failed' | 'killed' | 'timeout';
    exitCode?: number;
    stdout?: string;
    stderr?: string;
    errorMessage?: string;
}
/**
 * Job statistics
 */
export interface BaseJobStatistics {
    jobId: string;
    jobName: string;
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    successRate: number;
    averageDuration: number;
    lastExecution?: Date;
    lastSuccess?: Date;
    lastFailure?: Date;
}
/**
 * Storage backend interface
 */
export interface JobStorage {
    save(job: BaseJobSpec): Promise<void>;
    get(jobId: string): Promise<BaseJobSpec | null>;
    list(filter?: BaseJobFilter): Promise<BaseJobSpec[]>;
    update(jobId: string, updates: Partial<BaseJobSpec>): Promise<void>;
    delete(jobId: string): Promise<void>;
    saveExecution(execution: BaseJobExecution): Promise<void>;
    getExecutions(jobId: string, limit?: number): Promise<BaseJobExecution[]>;
    cleanup?(): Promise<void>;
}
/**
 * Abstract base class for job managers
 */
export declare abstract class BaseJobManager extends EventEmitter {
    protected logger: Logger;
    protected storage: JobStorage;
    protected jobs: Map<string, BaseJobSpec>;
    constructor(storage: JobStorage, loggerName?: string);
    /**
     * Generate unique job ID
     */
    protected generateJobId(prefix?: string): string;
    /**
     * Validate job specification
     */
    protected validateJobSpec(spec: Partial<BaseJobSpec>): void;
    /**
     * Create a new job
     */
    createJob(spec: Partial<BaseJobSpec>): Promise<BaseJobSpec>;
    /**
     * Get job by ID
     */
    getJob(jobId: string): Promise<BaseJobSpec | null>;
    /**
     * List jobs with optional filtering
     */
    listJobs(filter?: BaseJobFilter): Promise<BaseJobSpec[]>;
    /**
     * Apply filters to job list
     */
    protected applyFilters(jobs: BaseJobSpec[], filter: BaseJobFilter): BaseJobSpec[];
    /**
     * Update job
     */
    updateJob(jobId: string, updates: BaseJobUpdate): Promise<BaseJobSpec>;
    /**
     * Update job status
     */
    protected updateJobStatus(jobId: string, status: BaseJobSpec['status'], additionalUpdates?: Partial<BaseJobSpec>): Promise<BaseJobSpec>;
    /**
     * Remove job
     */
    removeJob(jobId: string, force?: boolean): Promise<boolean>;
    /**
     * Get job execution history
     */
    getJobHistory(jobId: string, limit?: number): Promise<BaseJobExecution[]>;
    /**
     * Calculate job statistics
     */
    getJobStatistics(jobId: string): Promise<BaseJobStatistics>;
    /**
     * Record job execution
     */
    protected recordExecution(job: BaseJobSpec, status: BaseJobExecution['status'], details?: Partial<BaseJobExecution>): Promise<BaseJobExecution>;
    /**
     * Start job - must be implemented by subclasses
     */
    abstract startJob(jobId: string): Promise<BaseJobSpec>;
    /**
     * Stop job - must be implemented by subclasses
     */
    abstract stopJob(jobId: string, signal?: string): Promise<BaseJobSpec>;
    /**
     * Cleanup - optional override
     */
    cleanup(): Promise<void>;
}
export default BaseJobManager;
