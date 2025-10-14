/**
 * Database Job Storage
 * Persistent storage for jobs and executions using DatabasePersistence
 * Used by CronJobManager and other database-backed managers
 */

import {
  JobStorage,
  BaseJobSpec,
  BaseJobFilter,
  BaseJobExecution,
} from './base-job-manager.js';
import DatabasePersistence from './database-persistence.js';

export class DatabaseJobStorage implements JobStorage {
  private persistence: DatabasePersistence;
  private userId?: string;

  constructor(userId?: string) {
    this.userId = userId;
    this.persistence = new DatabasePersistence(userId);
  }

  async save(job: BaseJobSpec): Promise<void> {
    // Map BaseJobSpec to database format
    const dbJob = {
      job_id: job.id,
      command: job.command,
      started_at: job.startedAt?.toISOString(),
      completed_at: job.completedAt?.toISOString(),
      status: job.status,
      exit_code: job.exitCode,
      output: job.stdout,
      error: job.stderr,
    };

    // Save using available method
    await this.persistence.saveJob(dbJob as any);
  }

  async get(jobId: string): Promise<BaseJobSpec | null> {
    // This would require adding a method to DatabasePersistence
    // For now, return null and rely on list() filtering
    return null;
  }

  async list(filter?: BaseJobFilter): Promise<BaseJobSpec[]> {
    // Get active jobs from database
    const dbJobs = await this.persistence.getActiveJobs();

    // Convert to BaseJobSpec format
    const jobs: BaseJobSpec[] = dbJobs.map(dbJob => ({
      id: dbJob.job_id,
      name: dbJob.job_id, // Using job_id as name since name field doesn't exist
      command: dbJob.command,
      status: this.mapDbStatusToJobStatus(dbJob.status),
      createdAt: new Date(dbJob.started_at),
      startedAt: new Date(dbJob.started_at),
      completedAt: dbJob.completed_at ? new Date(dbJob.completed_at) : undefined,
      user: this.userId,
      tags: [],
      priority: 5,
      maxRetries: 3,
      retryCount: 0,
      databaseSync: true,
      exitCode: dbJob.exit_code,
      stdout: dbJob.output,
      stderr: dbJob.error,
    }));

    return jobs;
  }

  private mapDbStatusToJobStatus(dbStatus: string): BaseJobSpec['status'] {
    switch (dbStatus) {
      case 'running':
        return 'running';
      case 'completed':
      case 'success':
        return 'completed';
      case 'stopped':
        return 'stopped';
      case 'paused':
        return 'paused';
      case 'failed':
      case 'timeout':
        return 'failed';
      case 'killed':
        return 'killed';
      default:
        return 'created';
    }
  }

  async update(jobId: string, updates: Partial<BaseJobSpec>): Promise<void> {
    // Update by saving again (upsert behavior)
    if (updates.command) {
      const dbJob = {
        job_id: jobId,
        command: updates.command,
        started_at: updates.startedAt?.toISOString(),
        completed_at: updates.completedAt?.toISOString(),
        status: updates.status || 'running',
        exit_code: updates.exitCode,
        output: updates.stdout,
        error: updates.stderr,
      };

      await this.persistence.saveJob(dbJob as any);
    }
  }

  async delete(jobId: string): Promise<void> {
    // DatabasePersistence doesn't have a delete method yet
    // This would need to be added
    console.warn(`Delete not implemented for job ${jobId}`);
  }

  async saveExecution(execution: BaseJobExecution): Promise<void> {
    // Map to database format and save as job
    const dbJob = {
      job_id: execution.jobId,
      command: execution.command,
      started_at: execution.startTime.toISOString(),
      completed_at: execution.endTime?.toISOString(),
      status: execution.status,
      exit_code: execution.exitCode,
      output: execution.stdout,
      error: execution.stderr || execution.errorMessage,
    };

    await this.persistence.saveJob(dbJob as any);
  }

  async getExecutions(jobId: string, limit: number = 50): Promise<BaseJobExecution[]> {
    // Get active jobs (no specific history method available yet)
    const dbJobs = await this.persistence.getActiveJobs();
    const jobExecutions = dbJobs.filter(job => job.job_id === jobId);

    return jobExecutions.slice(0, limit).map(dbExec => ({
      executionId: `exec_${dbExec.job_id}_${Date.now()}`,
      jobId: dbExec.job_id,
      jobName: dbExec.job_id,
      command: dbExec.command,
      startTime: new Date(dbExec.started_at),
      endTime: dbExec.completed_at ? new Date(dbExec.completed_at) : undefined,
      duration: dbExec.completed_at
        ? new Date(dbExec.completed_at).getTime() - new Date(dbExec.started_at).getTime()
        : undefined,
      status: this.mapDbStatus(dbExec.status),
      exitCode: dbExec.exit_code,
      stdout: dbExec.output,
      stderr: dbExec.error,
      errorMessage: dbExec.error,
    }));
  }

  private mapDbStatus(dbStatus: string): BaseJobExecution['status'] {
    switch (dbStatus) {
      case 'running':
        return 'running';
      case 'completed':
      case 'success':
        return 'completed';
      case 'failed':
        return 'failed';
      case 'killed':
        return 'killed';
      case 'timeout':
        return 'timeout';
      default:
        return 'failed';
    }
  }

  async cleanup(): Promise<void> {
    // DatabasePersistence maintains its own connections
    // No cleanup needed here
  }
}

export default DatabaseJobStorage;
