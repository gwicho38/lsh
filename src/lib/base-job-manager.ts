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

/**
 * Unified job specification
 */
export interface BaseJobSpec {
  id: string;
  name: string;
  command: string;
  args?: string[];

  // Status
  status: 'created' | 'running' | 'stopped' | 'paused' | 'completed' | 'failed' | 'killed';

  // Timing
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;

  // Configuration
  env?: Record<string, string>;
  cwd?: string;
  user?: string;

  // Scheduling
  schedule?: {
    cron?: string;
    interval?: number;
    nextRun?: Date;
  };

  // Metadata
  tags?: string[];
  description?: string;
  priority?: number;

  // Execution details
  pid?: number;
  exitCode?: number;

  // Output
  stdout?: string;
  stderr?: string;

  // Resource limits
  timeout?: number;
  maxRetries?: number;
  retryCount?: number;

  // Database sync
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
  save(job: BaseJobSpec): Promise<void>;
  get(jobId: string): Promise<BaseJobSpec | null>;
  list(filter?: BaseJobFilter): Promise<BaseJobSpec[]>;
  update(jobId: string, updates: Partial<BaseJobSpec>): Promise<void>;
  delete(jobId: string): Promise<void>;

  // Execution tracking
  saveExecution(execution: BaseJobExecution): Promise<void>;
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
  protected generateJobId(prefix: string = 'job'): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Validate job specification
   */
  protected validateJobSpec(spec: Partial<BaseJobSpec>): void {
    if (!spec.name) {
      throw new Error('Job name is required');
    }
    if (!spec.command) {
      throw new Error('Job command is required');
    }
  }

  /**
   * Create a new job
   */
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
      user: spec.user || process.env.USER,
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
  async updateJob(jobId: string, updates: BaseJobUpdate): Promise<BaseJobSpec> {
    const job = await this.getJob(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
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
  protected async updateJobStatus(
    jobId: string,
    status: BaseJobSpec['status'],
    additionalUpdates?: Partial<BaseJobSpec>
  ): Promise<BaseJobSpec> {
    const job = await this.getJob(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
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
  async removeJob(jobId: string, force: boolean = false): Promise<boolean> {
    const job = await this.getJob(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    // Check if job is running
    if (job.status === 'running' && !force) {
      throw new Error(`Job ${jobId} is running. Use force=true to remove.`);
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
  async getJobHistory(jobId: string, limit: number = 50): Promise<BaseJobExecution[]> {
    return await this.storage.getExecutions(jobId, limit);
  }

  /**
   * Calculate job statistics
   */
  async getJobStatistics(jobId: string): Promise<BaseJobStatistics> {
    const executions = await this.getJobHistory(jobId);
    const job = await this.getJob(jobId);

    if (!job) {
      throw new Error(`Job ${jobId} not found`);
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
  async cleanup(): Promise<void> {
    if (this.storage.cleanup) {
      await this.storage.cleanup();
    }
    this.jobs.clear();
    this.removeAllListeners();
  }
}

export default BaseJobManager;
