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
 * Unified job specification
 */
export interface BaseJobSpec {
    id: string;
    name: string;
    command: string;
    args?: string[];
    status: 'created' | 'running' | 'stopped' | 'paused' | 'completed' | 'failed' | 'killed';
    createdAt: Date;
    startedAt?: Date;
    completedAt?: Date;
    env?: Record<string, string>;
    cwd?: string;
    user?: string;
    schedule?: {
        cron?: string;
        interval?: number;
        nextRun?: Date;
    };
    tags?: string[];
    description?: string;
    priority?: number;
    pid?: number;
    exitCode?: number;
    stdout?: string;
    stderr?: string;
    timeout?: number;
    maxRetries?: number;
    retryCount?: number;
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
