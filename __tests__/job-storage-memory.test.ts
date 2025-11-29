/**
 * Memory Job Storage Tests
 * Tests for the in-memory job storage implementation
 */

import { describe, it, expect, beforeAll, beforeEach } from '@jest/globals';

describe('MemoryJobStorage', () => {
  let MemoryJobStorage: typeof import('../src/lib/job-storage-memory.js').MemoryJobStorage;
  let storage: InstanceType<typeof MemoryJobStorage>;

  beforeAll(async () => {
    const module = await import('../src/lib/job-storage-memory.js');
    MemoryJobStorage = module.MemoryJobStorage;
  });

  beforeEach(() => {
    storage = new MemoryJobStorage();
  });

  describe('Constructor', () => {
    it('should create instance with default max executions', () => {
      expect(storage).toBeDefined();
    });

    it('should create instance with custom max executions', () => {
      const customStorage = new MemoryJobStorage(50);
      expect(customStorage).toBeDefined();
    });
  });

  describe('save and get', () => {
    it('should save and retrieve a job', async () => {
      const job = {
        id: 'job-123',
        name: 'test-job',
        command: 'echo hello',
        status: 'created' as const,
        createdAt: new Date(),
      };

      await storage.save(job);
      const retrieved = await storage.get('job-123');

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe('job-123');
      expect(retrieved?.name).toBe('test-job');
    });

    it('should return null for non-existent job', async () => {
      const result = await storage.get('non-existent');
      expect(result).toBeNull();
    });

    it('should return a copy, not reference', async () => {
      const job = {
        id: 'job-456',
        name: 'original',
        command: 'echo test',
        status: 'created' as const,
        createdAt: new Date(),
      };

      await storage.save(job);
      const retrieved = await storage.get('job-456');

      retrieved!.name = 'modified';

      const retrievedAgain = await storage.get('job-456');
      expect(retrievedAgain?.name).toBe('original');
    });
  });

  describe('list', () => {
    beforeEach(async () => {
      await storage.save({ id: 'job-1', name: 'job1', command: 'echo 1', status: 'running' as const, createdAt: new Date() });
      await storage.save({ id: 'job-2', name: 'job2', command: 'echo 2', status: 'completed' as const, createdAt: new Date() });
      await storage.save({ id: 'job-3', name: 'job3', command: 'echo 3', status: 'running' as const, createdAt: new Date() });
    });

    it('should list all jobs', async () => {
      const jobs = await storage.list();
      expect(jobs).toHaveLength(3);
    });

    it('should filter by status', async () => {
      const runningJobs = await storage.list({ status: 'running' });
      expect(runningJobs).toHaveLength(2);
      expect(runningJobs.every(j => j.status === 'running')).toBe(true);
    });

    it('should filter by multiple statuses', async () => {
      const jobs = await storage.list({ status: ['running', 'completed'] });
      expect(jobs).toHaveLength(3);
    });
  });

  describe('update', () => {
    it('should update job fields', async () => {
      const job = {
        id: 'job-update',
        name: 'original-name',
        command: 'echo test',
        status: 'created' as const,
        createdAt: new Date(),
      };

      await storage.save(job);
      await storage.update('job-update', { name: 'updated-name', status: 'running' as const });

      const updated = await storage.get('job-update');
      expect(updated?.name).toBe('updated-name');
      expect(updated?.status).toBe('running');
    });

    it('should throw for non-existent job', async () => {
      await expect(storage.update('non-existent', { name: 'new' }))
        .rejects.toThrow('Job non-existent not found');
    });
  });

  describe('delete', () => {
    it('should delete a job', async () => {
      const job = {
        id: 'job-delete',
        name: 'to-delete',
        command: 'echo test',
        status: 'created' as const,
        createdAt: new Date(),
      };

      await storage.save(job);
      expect(await storage.get('job-delete')).not.toBeNull();

      await storage.delete('job-delete');
      expect(await storage.get('job-delete')).toBeNull();
    });

    it('should also delete executions when deleting job', async () => {
      const job = {
        id: 'job-with-execs',
        name: 'test',
        command: 'echo test',
        status: 'created' as const,
        createdAt: new Date(),
      };

      await storage.save(job);
      await storage.saveExecution({
        id: 'exec-1',
        jobId: 'job-with-execs',
        startTime: new Date(),
        status: 'completed',
      });

      await storage.delete('job-with-execs');

      const executions = await storage.getExecutions('job-with-execs');
      expect(executions).toHaveLength(0);
    });
  });

  describe('saveExecution and getExecutions', () => {
    it('should save and retrieve executions', async () => {
      const execution = {
        id: 'exec-123',
        jobId: 'job-123',
        startTime: new Date(),
        status: 'running' as const,
      };

      await storage.saveExecution(execution);
      const executions = await storage.getExecutions('job-123');

      expect(executions).toHaveLength(1);
      expect(executions[0].id).toBe('exec-123');
    });

    it('should store newest executions first', async () => {
      await storage.saveExecution({
        id: 'exec-1',
        jobId: 'job-order',
        startTime: new Date('2024-01-01'),
        status: 'completed' as const,
      });
      await storage.saveExecution({
        id: 'exec-2',
        jobId: 'job-order',
        startTime: new Date('2024-01-02'),
        status: 'completed' as const,
      });

      const executions = await storage.getExecutions('job-order');

      expect(executions[0].id).toBe('exec-2');
      expect(executions[1].id).toBe('exec-1');
    });

    it('should respect limit parameter', async () => {
      for (let i = 0; i < 5; i++) {
        await storage.saveExecution({
          id: `exec-${i}`,
          jobId: 'job-limit',
          startTime: new Date(),
          status: 'completed' as const,
        });
      }

      const executions = await storage.getExecutions('job-limit', 3);
      expect(executions).toHaveLength(3);
    });

    it('should limit executions to maxExecutionsPerJob', async () => {
      const limitedStorage = new MemoryJobStorage(3);

      for (let i = 0; i < 5; i++) {
        await limitedStorage.saveExecution({
          id: `exec-${i}`,
          jobId: 'job-max',
          startTime: new Date(),
          status: 'completed' as const,
        });
      }

      const executions = await limitedStorage.getExecutions('job-max');
      expect(executions).toHaveLength(3);
    });
  });

  describe('cleanup', () => {
    it('should clear all jobs and executions', async () => {
      await storage.save({ id: 'job-1', name: 'job1', command: 'echo', status: 'created' as const, createdAt: new Date() });
      await storage.save({ id: 'job-2', name: 'job2', command: 'echo', status: 'created' as const, createdAt: new Date() });
      await storage.saveExecution({ id: 'exec-1', jobId: 'job-1', startTime: new Date(), status: 'completed' as const });

      await storage.cleanup();

      expect(await storage.list()).toHaveLength(0);
      expect(storage.getJobCount()).toBe(0);
      expect(storage.getExecutionCount()).toBe(0);
    });
  });

  describe('getJobCount', () => {
    it('should return correct job count', async () => {
      expect(storage.getJobCount()).toBe(0);

      await storage.save({ id: 'job-1', name: 'job1', command: 'echo', status: 'created' as const, createdAt: new Date() });
      expect(storage.getJobCount()).toBe(1);

      await storage.save({ id: 'job-2', name: 'job2', command: 'echo', status: 'created' as const, createdAt: new Date() });
      expect(storage.getJobCount()).toBe(2);
    });
  });

  describe('getExecutionCount', () => {
    beforeEach(async () => {
      await storage.saveExecution({ id: 'exec-1', jobId: 'job-1', startTime: new Date(), status: 'completed' as const });
      await storage.saveExecution({ id: 'exec-2', jobId: 'job-1', startTime: new Date(), status: 'completed' as const });
      await storage.saveExecution({ id: 'exec-3', jobId: 'job-2', startTime: new Date(), status: 'completed' as const });
    });

    it('should return total execution count', () => {
      expect(storage.getExecutionCount()).toBe(3);
    });

    it('should return execution count for specific job', () => {
      expect(storage.getExecutionCount('job-1')).toBe(2);
      expect(storage.getExecutionCount('job-2')).toBe(1);
    });

    it('should return 0 for job with no executions', () => {
      expect(storage.getExecutionCount('non-existent')).toBe(0);
    });
  });
});
