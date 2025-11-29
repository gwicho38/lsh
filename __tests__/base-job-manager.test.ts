/**
 * Base Job Manager Tests
 * Tests for the abstract base class for job management systems
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach } from '@jest/globals';

// Mock storage implementation
class MockStorage {
  private jobs: Map<string, any> = new Map();
  private executions: Map<string, any[]> = new Map();

  async save(job: any): Promise<void> {
    this.jobs.set(job.id, job);
  }

  async get(jobId: string): Promise<any | null> {
    return this.jobs.get(jobId) || null;
  }

  async list(): Promise<any[]> {
    return Array.from(this.jobs.values());
  }

  async update(jobId: string, updates: any): Promise<void> {
    const job = this.jobs.get(jobId);
    if (job) {
      Object.assign(job, updates);
      this.jobs.set(jobId, job);
    }
  }

  async delete(jobId: string): Promise<void> {
    this.jobs.delete(jobId);
  }

  async saveExecution(execution: any): Promise<void> {
    const execList = this.executions.get(execution.jobId) || [];
    execList.push(execution);
    this.executions.set(execution.jobId, execList);
  }

  async getExecutions(jobId: string, limit?: number): Promise<any[]> {
    const execList = this.executions.get(jobId) || [];
    return limit ? execList.slice(-limit) : execList;
  }

  async cleanup(): Promise<void> {
    this.jobs.clear();
    this.executions.clear();
  }
}

describe('BaseJobManager', () => {
  let BaseJobManager: any;
  let TestJobManager: any;
  let storage: MockStorage;
  let manager: any;

  beforeAll(async () => {
    const module = await import('../src/lib/base-job-manager.js');
    BaseJobManager = module.BaseJobManager;

    // Create concrete implementation for testing
    TestJobManager = class extends BaseJobManager {
      async startJob(jobId: string) {
        const job = await this.getJob(jobId);
        if (!job) throw new Error(`Job ${jobId} not found`);
        return await this.updateJobStatus(jobId, 'running');
      }

      async stopJob(jobId: string, _signal?: string) {
        const job = await this.getJob(jobId);
        if (!job) throw new Error(`Job ${jobId} not found`);
        return await this.updateJobStatus(jobId, 'stopped');
      }

      // Expose protected methods for testing
      public testGenerateJobId(prefix?: string): string {
        return this.generateJobId(prefix);
      }

      public testApplyFilters(jobs: any[], filter: any): any[] {
        return this.applyFilters(jobs, filter);
      }

      public async testRecordExecution(job: any, status: any, details?: any) {
        return await this.recordExecution(job, status, details);
      }
    };
  });

  beforeEach(() => {
    storage = new MockStorage();
    manager = new TestJobManager(storage, 'TestManager');
  });

  afterEach(async () => {
    if (manager) {
      await manager.cleanup();
    }
  });

  describe('generateJobId', () => {
    it('should generate unique IDs', () => {
      const id1 = manager.testGenerateJobId();
      const id2 = manager.testGenerateJobId();
      expect(id1).not.toBe(id2);
    });

    it('should use prefix', () => {
      const id = manager.testGenerateJobId('custom');
      expect(id.startsWith('custom_')).toBe(true);
    });

    it('should default to job prefix', () => {
      const id = manager.testGenerateJobId();
      expect(id.startsWith('job_')).toBe(true);
    });
  });

  describe('createJob', () => {
    it('should create job with required fields', async () => {
      const job = await manager.createJob({
        name: 'test-job',
        command: 'echo hello'
      });

      expect(job.id).toBeDefined();
      expect(job.name).toBe('test-job');
      expect(job.command).toBe('echo hello');
      expect(job.status).toBe('created');
      expect(job.createdAt).toBeInstanceOf(Date);
    });

    it('should throw if name is missing', async () => {
      await expect(manager.createJob({
        command: 'echo hello'
      })).rejects.toThrow('Job name is required');
    });

    it('should throw if command is missing', async () => {
      await expect(manager.createJob({
        name: 'test-job'
      })).rejects.toThrow('Job command is required');
    });

    it('should accept custom ID', async () => {
      const job = await manager.createJob({
        id: 'custom-id',
        name: 'test',
        command: 'echo'
      });
      expect(job.id).toBe('custom-id');
    });

    it('should set default values', async () => {
      const job = await manager.createJob({
        name: 'test',
        command: 'echo'
      });

      expect(job.priority).toBe(5);
      expect(job.maxRetries).toBe(3);
      expect(job.retryCount).toBe(0);
      expect(job.tags).toEqual([]);
      expect(job.databaseSync).toBe(true);
    });

    it('should emit job:created event', async () => {
      let emittedJob: any = null;
      manager.on('job:created', (job: any) => {
        emittedJob = job;
      });

      const job = await manager.createJob({
        name: 'test',
        command: 'echo'
      });

      expect(emittedJob).toEqual(job);
    });
  });

  describe('getJob', () => {
    it('should return job by ID', async () => {
      const created = await manager.createJob({
        name: 'test',
        command: 'echo'
      });

      const job = await manager.getJob(created.id);
      expect(job).toEqual(created);
    });

    it('should return null for non-existent job', async () => {
      const job = await manager.getJob('non-existent');
      expect(job).toBeNull();
    });

    it('should cache jobs in memory', async () => {
      const created = await manager.createJob({
        name: 'test',
        command: 'echo'
      });

      // First call retrieves from memory cache
      const job1 = await manager.getJob(created.id);
      const job2 = await manager.getJob(created.id);

      expect(job1).toBe(job2); // Same reference
    });
  });

  describe('listJobs', () => {
    beforeEach(async () => {
      await manager.createJob({ name: 'job1', command: 'echo 1', tags: ['test', 'important'] });
      await manager.createJob({ name: 'job2', command: 'echo 2', tags: ['test'] });
      await manager.createJob({ name: 'other', command: 'echo 3', tags: ['other'] });
    });

    it('should list all jobs', async () => {
      const jobs = await manager.listJobs();
      expect(jobs.length).toBe(3);
    });

    it('should filter by status', async () => {
      const jobs = await manager.listJobs({ status: 'created' });
      expect(jobs.length).toBe(3);
    });

    it('should filter by multiple statuses', async () => {
      // Start one job
      const allJobs = await manager.listJobs();
      await manager.startJob(allJobs[0].id);

      const jobs = await manager.listJobs({ status: ['created', 'running'] });
      expect(jobs.length).toBe(3);
    });

    it('should filter by tags', async () => {
      const jobs = await manager.listJobs({ tags: ['important'] });
      expect(jobs.length).toBe(1);
      expect(jobs[0].name).toBe('job1');
    });

    it('should filter by name pattern (string)', async () => {
      const jobs = await manager.listJobs({ namePattern: 'job' });
      expect(jobs.length).toBe(2);
    });

    it('should filter by name pattern (regex)', async () => {
      const jobs = await manager.listJobs({ namePattern: /^job\d$/ });
      expect(jobs.length).toBe(2);
    });
  });

  describe('updateJob', () => {
    it('should update job properties', async () => {
      const job = await manager.createJob({
        name: 'test',
        command: 'echo'
      });

      const updated = await manager.updateJob(job.id, {
        name: 'updated-name',
        priority: 10,
        tags: ['new-tag']
      });

      expect(updated.name).toBe('updated-name');
      expect(updated.priority).toBe(10);
      expect(updated.tags).toEqual(['new-tag']);
    });

    it('should throw for non-existent job', async () => {
      await expect(manager.updateJob('non-existent', {
        name: 'test'
      })).rejects.toThrow('Job non-existent not found');
    });

    it('should emit job:updated event', async () => {
      const job = await manager.createJob({
        name: 'test',
        command: 'echo'
      });

      let emittedJob: any = null;
      manager.on('job:updated', (j: any) => {
        emittedJob = j;
      });

      await manager.updateJob(job.id, { name: 'new-name' });
      expect(emittedJob.name).toBe('new-name');
    });

    it('should merge env variables', async () => {
      const job = await manager.createJob({
        name: 'test',
        command: 'echo',
        env: { VAR1: 'value1' }
      });

      const updated = await manager.updateJob(job.id, {
        env: { VAR2: 'value2' }
      });

      expect(updated.env).toEqual({ VAR1: 'value1', VAR2: 'value2' });
    });
  });

  describe('startJob', () => {
    it('should update job status to running', async () => {
      const job = await manager.createJob({
        name: 'test',
        command: 'echo'
      });

      const started = await manager.startJob(job.id);
      expect(started.status).toBe('running');
    });

    it('should set startedAt timestamp', async () => {
      const job = await manager.createJob({
        name: 'test',
        command: 'echo'
      });

      const started = await manager.startJob(job.id);
      expect(started.startedAt).toBeInstanceOf(Date);
    });

    it('should throw for non-existent job', async () => {
      await expect(manager.startJob('non-existent')).rejects.toThrow();
    });
  });

  describe('stopJob', () => {
    it('should update job status to stopped', async () => {
      const job = await manager.createJob({
        name: 'test',
        command: 'echo'
      });

      await manager.startJob(job.id);
      const stopped = await manager.stopJob(job.id);
      expect(stopped.status).toBe('stopped');
    });

    it('should throw for non-existent job', async () => {
      await expect(manager.stopJob('non-existent')).rejects.toThrow();
    });
  });

  describe('removeJob', () => {
    it('should remove job', async () => {
      const job = await manager.createJob({
        name: 'test',
        command: 'echo'
      });

      const result = await manager.removeJob(job.id);
      expect(result).toBe(true);

      const retrieved = await manager.getJob(job.id);
      expect(retrieved).toBeNull();
    });

    it('should return false for non-existent job', async () => {
      const result = await manager.removeJob('non-existent');
      expect(result).toBe(false);
    });

    it('should throw if running and not forced', async () => {
      const job = await manager.createJob({
        name: 'test',
        command: 'echo'
      });

      await manager.startJob(job.id);

      await expect(manager.removeJob(job.id, false)).rejects.toThrow('is running');
    });

    it('should remove running job with force', async () => {
      const job = await manager.createJob({
        name: 'test',
        command: 'echo'
      });

      await manager.startJob(job.id);
      const result = await manager.removeJob(job.id, true);
      expect(result).toBe(true);
    });

    it('should emit job:removed event', async () => {
      const job = await manager.createJob({
        name: 'test',
        command: 'echo'
      });

      let emittedJob: any = null;
      manager.on('job:removed', (j: any) => {
        emittedJob = j;
      });

      await manager.removeJob(job.id);
      expect(emittedJob).toBeDefined();
    });
  });

  describe('getJobHistory', () => {
    it('should return execution history', async () => {
      const job = await manager.createJob({
        name: 'test',
        command: 'echo'
      });

      await manager.testRecordExecution(job, 'completed', { duration: 100 });
      await manager.testRecordExecution(job, 'completed', { duration: 150 });

      const history = await manager.getJobHistory(job.id);
      expect(history.length).toBe(2);
    });

    it('should respect limit', async () => {
      const job = await manager.createJob({
        name: 'test',
        command: 'echo'
      });

      for (let i = 0; i < 10; i++) {
        await manager.testRecordExecution(job, 'completed');
      }

      const history = await manager.getJobHistory(job.id, 5);
      expect(history.length).toBe(5);
    });
  });

  describe('getJobStatistics', () => {
    it('should calculate statistics', async () => {
      const job = await manager.createJob({
        name: 'test',
        command: 'echo'
      });

      await manager.testRecordExecution(job, 'completed', { duration: 100 });
      await manager.testRecordExecution(job, 'completed', { duration: 200 });
      await manager.testRecordExecution(job, 'failed', { duration: 50 });

      const stats = await manager.getJobStatistics(job.id);

      expect(stats.totalExecutions).toBe(3);
      expect(stats.successfulExecutions).toBe(2);
      expect(stats.failedExecutions).toBe(1);
      expect(stats.successRate).toBeCloseTo(66.67, 1);
      expect(stats.averageDuration).toBeCloseTo(116.67, 1);
    });

    it('should throw for non-existent job', async () => {
      await expect(manager.getJobStatistics('non-existent')).rejects.toThrow();
    });

    it('should handle job with no executions', async () => {
      const job = await manager.createJob({
        name: 'test',
        command: 'echo'
      });

      const stats = await manager.getJobStatistics(job.id);
      expect(stats.totalExecutions).toBe(0);
      expect(stats.successRate).toBe(0);
      expect(stats.averageDuration).toBe(0);
    });
  });

  describe('applyFilters', () => {
    it('should filter by user', () => {
      const jobs = [
        { id: '1', name: 'job1', status: 'created', user: 'alice', createdAt: new Date() },
        { id: '2', name: 'job2', status: 'created', user: 'bob', createdAt: new Date() }
      ];

      const filtered = manager.testApplyFilters(jobs, { user: 'alice' });
      expect(filtered.length).toBe(1);
      expect(filtered[0].user).toBe('alice');
    });

    it('should filter by date range', () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 86400000);

      const jobs = [
        { id: '1', name: 'old', status: 'created', createdAt: yesterday },
        { id: '2', name: 'new', status: 'created', createdAt: now }
      ];

      const filteredAfter = manager.testApplyFilters(jobs, { createdAfter: now });
      expect(filteredAfter.length).toBe(1);
      expect(filteredAfter[0].name).toBe('new');

      const filteredBefore = manager.testApplyFilters(jobs, { createdBefore: yesterday });
      expect(filteredBefore.length).toBe(1);
      expect(filteredBefore[0].name).toBe('old');
    });
  });

  describe('cleanup', () => {
    it('should clear all jobs and listeners', async () => {
      await manager.createJob({ name: 'test', command: 'echo' });

      await manager.cleanup();

      // Jobs should be cleared
      const jobs = await manager.listJobs();
      expect(jobs.length).toBe(0);
    });
  });
});
