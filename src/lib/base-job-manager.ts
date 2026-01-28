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
import { createLogger, Logger } from './logger.js';
import { ENV_VARS } from '../constants/index.js';
import { LSHError, ErrorCodes } from './lsh-error.js';

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

  // Status
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

  // Timing
  /** When the job spec was created */
  createdAt: Date;
  /** When the job started executing (first run for scheduled jobs) */
  startedAt?: Date;
  /** When the job finished (most recent completion for scheduled jobs) */
  completedAt?: Date;

  // Configuration
  /** Environment variables to set for job execution */
  env?: Record<string, string>;
  /** Working directory for command execution (defaults to process.cwd()) */
  cwd?: string;
  /** User to run job as (defaults to current user) */
  user?: string;

  // Scheduling
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

  // Metadata
  /** Tags for filtering and grouping jobs */
  tags?: string[];
  /** Human-readable description of what the job does */
  description?: string;
  /** Priority for execution ordering (1-10, higher = more important, default: 5) */
  priority?: number;

  // Execution details
  /** Process ID when running */
  pid?: number;
  /** Exit code from most recent execution */
  exitCode?: number;

  // Output
  /** Captured stdout from most recent execution */
  stdout?: string;
  /** Captured stderr from most recent execution */
  stderr?: string;

  // Resource limits
  /** Maximum execution time in milliseconds before kill */
  timeout?: number;
  /** Maximum number of retry attempts on failure (default: 3) */
  maxRetries?: number;
  /** Current retry count for this execution */
  retryCount?: number;

  // Database sync
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
  // CRUD operations
  // TODO(@gwicho38): Review - save
  save(job: BaseJobSpec): Promise<void>;
  get(jobId: string): Promise<BaseJobSpec | null>;
  // TODO(@gwicho38): Review - list
  list(filter?: BaseJobFilter): Promise<BaseJobSpec[]>;
  // TODO(@gwicho38): Review - update
  update(jobId: string, updates: Partial<BaseJobSpec>): Promise<void>;
  // TODO(@gwicho38): Review - delete
  delete(jobId: string): Promise<void>;

  // Execution tracking
  // TODO(@gwicho38): Review - saveExecution
  saveExecution(execution: BaseJobExecution): Promise<void>;
  // TODO(@gwicho38): Review - getExecutions
  getExecutions(jobId: string, limit?: number): Promise<BaseJobExecution[]>;

  // Cleanup
  cleanup?(): Promise<void>;
}

/**
 * Abstract base class for job managers
 */
export abstract class BaseJobManager extends EventEmitter {
  protected logger: Logger;
  protected storage: JobStorage;
  protected jobs: Map<string, BaseJobSpec> = new Map();

  constructor(storage: JobStorage, loggerName: string = 'JobManager') {
    super();
    this.storage = storage;
    this.logger = createLogger(loggerName);
  }

  /**
   * Generate unique job ID
   */
  // TODO(@gwicho38): Review - generateJobId
  protected generateJobId(prefix: string = 'job'): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Validate job specification
   */
  // TODO(@gwicho38): Review - validateJobSpec
  protected validateJobSpec(spec: Partial<BaseJobSpec>): void {
    if (!spec.name) {
      throw new LSHError(
        ErrorCodes.VALIDATION_REQUIRED_FIELD,
        'Job name is required',
        { field: 'name', provided: spec }
      );
    }
    if (!spec.command) {
      throw new LSHError(
        ErrorCodes.VALIDATION_REQUIRED_FIELD,
        'Job command is required',
        { field: 'command', provided: spec }
      );
    }
  }

  /**
   * Create a new job
   */
  // TODO(@gwicho38): Review - createJob
  async createJob(spec: Partial<BaseJobSpec>): Promise<BaseJobSpec> {
    this.validateJobSpec(spec);

    const job: BaseJobSpec = {
      id: spec.id || this.generateJobId(),
      name: spec.name!,
      command: spec.command!,
      args: spec.args,
      status: 'created',
      createdAt: new Date(),
      env: spec.env,
      cwd: spec.cwd || process.cwd(),
      user: spec.user || process.env[ENV_VARS.USER],
      schedule: spec.schedule,
      tags: spec.tags || [],
      description: spec.description,
      priority: spec.priority ?? 5,
      timeout: spec.timeout,
      maxRetries: spec.maxRetries ?? 3,
      retryCount: 0,
      databaseSync: spec.databaseSync !== false,
    };

    await this.storage.save(job);
    this.jobs.set(job.id, job);
    this.emit('job:created', job);
    this.logger.info(`Job created: ${job.id} (${job.name})`);

    return job;
  }

  /**
   * Get job by ID
   */
  // TODO(@gwicho38): Review - getJob
  async getJob(jobId: string): Promise<BaseJobSpec | null> {
    // Check memory cache first
    const job = this.jobs.get(jobId);
    if (job) {
      return job;
    }

    // Check storage
    const storedJob = await this.storage.get(jobId);
    if (storedJob) {
      this.jobs.set(jobId, storedJob);
      return storedJob;
    }

    return null;
  }

  /**
   * List jobs with optional filtering
   */
  // TODO(@gwicho38): Review - listJobs
  async listJobs(filter?: BaseJobFilter): Promise<BaseJobSpec[]> {
    let jobs = await this.storage.list(filter);

    // Apply additional filters
    if (filter) {
      jobs = this.applyFilters(jobs, filter);
    }

    return jobs;
  }

  /**
   * Apply filters to job list
   */
  // TODO(@gwicho38): Review - applyFilters
  protected applyFilters(jobs: BaseJobSpec[], filter: BaseJobFilter): BaseJobSpec[] {
    return jobs.filter(job => {
      // Status filter
      if (filter.status) {
        const statuses = Array.isArray(filter.status) ? filter.status : [filter.status];
        if (!statuses.includes(job.status)) {
          return false;
        }
      }

      // Tags filter
      if (filter.tags && filter.tags.length > 0) {
        const hasTag = filter.tags.some(tag => job.tags?.includes(tag));
        if (!hasTag) {
          return false;
        }
      }

      // User filter
      if (filter.user && job.user !== filter.user) {
        return false;
      }

      // Name pattern filter
      if (filter.namePattern) {
        const pattern = typeof filter.namePattern === 'string'
          ? new RegExp(filter.namePattern)
          : filter.namePattern;
        if (!pattern.test(job.name)) {
          return false;
        }
      }

      // Date filters
      if (filter.createdAfter && job.createdAt < filter.createdAfter) {
        return false;
      }
      if (filter.createdBefore && job.createdAt > filter.createdBefore) {
        return false;
      }

      return true;
    });
  }

  /**
   * Update job
   */
  // TODO(@gwicho38): Review - updateJob
  async updateJob(jobId: string, updates: BaseJobUpdate): Promise<BaseJobSpec> {
    const job = await this.getJob(jobId);
    if (!job) {
      throw new LSHError(
        ErrorCodes.JOB_NOT_FOUND,
        `Job ${jobId} not found`,
        { jobId, operation: 'updateJob' }
      );
    }

    // Apply updates
    if (updates.name) job.name = updates.name;
    if (updates.description) job.description = updates.description;
    if (updates.priority !== undefined) job.priority = updates.priority;
    if (updates.tags) job.tags = updates.tags;
    if (updates.schedule) job.schedule = updates.schedule;
    if (updates.env) job.env = { ...job.env, ...updates.env };
    if (updates.timeout !== undefined) job.timeout = updates.timeout;
    if (updates.maxRetries !== undefined) job.maxRetries = updates.maxRetries;

    await this.storage.update(jobId, job);
    this.jobs.set(jobId, job);
    this.emit('job:updated', job);
    this.logger.info(`Job updated: ${jobId}`);

    return job;
  }

  /**
   * Update job status
   */
  // TODO(@gwicho38): Review - updateJobStatus
  protected async updateJobStatus(
    jobId: string,
    status: BaseJobSpec['status'],
    additionalUpdates?: Partial<BaseJobSpec>
  ): Promise<BaseJobSpec> {
    const job = await this.getJob(jobId);
    if (!job) {
      throw new LSHError(
        ErrorCodes.JOB_NOT_FOUND,
        `Job ${jobId} not found`,
        { jobId, operation: 'updateJobStatus', targetStatus: status }
      );
    }

    job.status = status;

    // Apply additional updates
    if (additionalUpdates) {
      Object.assign(job, additionalUpdates);
    }

    // Update timestamps
    if (status === 'running' && !job.startedAt) {
      job.startedAt = new Date();
    }
    if (status === 'completed' || status === 'failed' || status === 'killed') {
      job.completedAt = new Date();
    }

    await this.storage.update(jobId, job);
    this.jobs.set(jobId, job);
    this.emit(`job:${status}`, job);
    this.logger.info(`Job ${status}: ${jobId}`);

    return job;
  }

  /**
   * Remove job
   */
  // TODO(@gwicho38): Review - removeJob
  async removeJob(jobId: string, force: boolean = false): Promise<boolean> {
    const job = await this.getJob(jobId);
    if (!job) {
      // Return false instead of throwing when job doesn't exist
      return false;
    }

    // Check if job is running
    if (job.status === 'running' && !force) {
      throw new LSHError(
        ErrorCodes.RESOURCE_CONFLICT,
        `Job ${jobId} is running. Use force=true to remove.`,
        { jobId, status: job.status, force }
      );
    }

    // Stop job if running
    if (job.status === 'running') {
      await this.stopJob(jobId);
    }

    await this.storage.delete(jobId);
    this.jobs.delete(jobId);
    this.emit('job:removed', job);
    this.logger.info(`Job removed: ${jobId}`);

    return true;
  }

  /**
   * Get job execution history
   */
  // TODO(@gwicho38): Review - getJobHistory
  async getJobHistory(jobId: string, limit: number = 50): Promise<BaseJobExecution[]> {
    return await this.storage.getExecutions(jobId, limit);
  }

  /**
   * Calculate job statistics
   */
  // TODO(@gwicho38): Review - getJobStatistics
  async getJobStatistics(jobId: string): Promise<BaseJobStatistics> {
    const executions = await this.getJobHistory(jobId);
    const job = await this.getJob(jobId);

    if (!job) {
      throw new LSHError(
        ErrorCodes.JOB_NOT_FOUND,
        `Job ${jobId} not found`,
        { jobId, operation: 'getJobStatistics' }
      );
    }

    const totalExecutions = executions.length;
    const successfulExecutions = executions.filter(e => e.status === 'completed').length;
    const failedExecutions = executions.filter(e => e.status === 'failed').length;

    const completedExecutions = executions.filter(e => e.duration);
    const averageDuration = completedExecutions.length > 0
      ? completedExecutions.reduce((sum, e) => sum + (e.duration || 0), 0) / completedExecutions.length
      : 0;

    const lastExecution = executions[0]?.startTime;
    const lastSuccess = executions.find(e => e.status === 'completed')?.startTime;
    const lastFailure = executions.find(e => e.status === 'failed')?.startTime;

    return {
      jobId: job.id,
      jobName: job.name,
      totalExecutions,
      successfulExecutions,
      failedExecutions,
      successRate: totalExecutions > 0 ? (successfulExecutions / totalExecutions) * 100 : 0,
      averageDuration,
      lastExecution,
      lastSuccess,
      lastFailure,
    };
  }

  /**
   * Record job execution
   */
  // TODO(@gwicho38): Review - recordExecution
  protected async recordExecution(
    job: BaseJobSpec,
    status: BaseJobExecution['status'],
    details: Partial<BaseJobExecution> = {}
  ): Promise<BaseJobExecution> {
    const execution: BaseJobExecution = {
      executionId: this.generateJobId('exec'),
      jobId: job.id,
      jobName: job.name,
      command: job.command,
      startTime: details.startTime || new Date(),
      endTime: details.endTime,
      duration: details.duration,
      status,
      exitCode: details.exitCode,
      stdout: details.stdout,
      stderr: details.stderr,
      errorMessage: details.errorMessage,
    };

    await this.storage.saveExecution(execution);
    this.emit('job:execution', execution);

    return execution;
  }

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
  // TODO(@gwicho38): Review - cleanup
  async cleanup(): Promise<void> {
    if (this.storage.cleanup) {
      await this.storage.cleanup();
    }
    this.jobs.clear();
    this.removeAllListeners();
  }
}

export default BaseJobManager;
