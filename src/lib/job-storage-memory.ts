/**
 * In-Memory Job Storage
 * Fast, volatile storage for jobs and executions
 * Used by JobManager for runtime job tracking
 */

import {
  JobStorage,
  BaseJobSpec,
  BaseJobFilter,
  BaseJobExecution,
} from './base-job-manager.js';
import { LSHError, ErrorCodes } from './lsh-error.js';

export class MemoryJobStorage implements JobStorage {
  private jobs: Map<string, BaseJobSpec> = new Map();
  private executions: Map<string, BaseJobExecution[]> = new Map();
  private maxExecutionsPerJob: number;

  constructor(maxExecutionsPerJob: number = 100) {
    this.maxExecutionsPerJob = maxExecutionsPerJob;
  }

  // TODO(@gwicho38): Review - save

  // TODO(@gwicho38): Review - save
  async save(job: BaseJobSpec): Promise<void> {
    this.jobs.set(job.id, { ...job });
  }

  async get(jobId: string): Promise<BaseJobSpec | null> {
    const job = this.jobs.get(jobId);
    return job ? { ...job } : null;
  }

  // TODO(@gwicho38): Review - list

  // TODO(@gwicho38): Review - list
  async list(filter?: BaseJobFilter): Promise<BaseJobSpec[]> {
    let jobs = Array.from(this.jobs.values()).map(job => ({ ...job }));

    // Basic filtering (additional filters applied by BaseJobManager)
    if (filter?.status) {
      const statuses = Array.isArray(filter.status) ? filter.status : [filter.status];
      jobs = jobs.filter(job => statuses.includes(job.status));
    }

    return jobs;
  }

  // TODO(@gwicho38): Review - update

  // TODO(@gwicho38): Review - update
  async update(jobId: string, updates: Partial<BaseJobSpec>): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new LSHError(
        ErrorCodes.JOB_NOT_FOUND,
        `Job ${jobId} not found`,
        { jobId, operation: 'update' }
      );
    }

    Object.assign(job, updates);
    this.jobs.set(jobId, job);
  }

  // TODO(@gwicho38): Review - delete

  async delete(jobId: string): Promise<void> {
    this.jobs.delete(jobId);
    this.executions.delete(jobId);
  }

  // TODO(@gwicho38): Review - saveExecution

  // TODO(@gwicho38): Review - saveExecution
  async saveExecution(execution: BaseJobExecution): Promise<void> {
    const jobExecutions = this.executions.get(execution.jobId) || [];

    // Add new execution at the beginning
    jobExecutions.unshift(execution);

    // Limit number of executions stored
    if (jobExecutions.length > this.maxExecutionsPerJob) {
      jobExecutions.length = this.maxExecutionsPerJob;
    }

    this.executions.set(execution.jobId, jobExecutions);
  }

  // TODO(@gwicho38): Review - getExecutions

  // TODO(@gwicho38): Review - getExecutions
  async getExecutions(jobId: string, limit?: number): Promise<BaseJobExecution[]> {
    const jobExecutions = this.executions.get(jobId) || [];

    if (limit && limit < jobExecutions.length) {
      return jobExecutions.slice(0, limit);
    }

    return jobExecutions.map(e => ({ ...e }));
  }

  // TODO(@gwicho38): Review - cleanup

  // TODO(@gwicho38): Review - cleanup
  async cleanup(): Promise<void> {
    this.jobs.clear();
    this.executions.clear();
  }

  // Additional utility methods
  // TODO(@gwicho38): Review - getJobCount
  getJobCount(): number {
    return this.jobs.size;
  }

  // TODO(@gwicho38): Review - getExecutionCount

  // TODO(@gwicho38): Review - getExecutionCount
  getExecutionCount(jobId?: string): number {
    if (jobId) {
      return this.executions.get(jobId)?.length || 0;
    }
    return Array.from(this.executions.values()).reduce((sum, execs) => sum + execs.length, 0);
  }
}

export default MemoryJobStorage;
