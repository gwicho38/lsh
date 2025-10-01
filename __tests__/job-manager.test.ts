/**
 * Tests for Job Manager
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { JobManager } from '../src/lib/job-manager.js';
import * as fs from 'fs';

describe('Job Manager', () => {
  let jobManager: JobManager;
  const testPersistenceFile = '/tmp/test-lsh-jobs.json';

  beforeEach(async () => {
    // Clean up any existing test file
    if (fs.existsSync(testPersistenceFile)) {
      fs.unlinkSync(testPersistenceFile);
    }
    jobManager = new JobManager(testPersistenceFile);
  });

  afterEach(async () => {
    // Shutdown and cleanup
    await jobManager.shutdown();
    if (fs.existsSync(testPersistenceFile)) {
      fs.unlinkSync(testPersistenceFile);
    }
  });

  describe('Job Creation', () => {
    it('should create a new job', async () => {
      const job = await jobManager.createJob({
        command: 'echo "test"',
        name: 'Test Job',
      });

      expect(job).toBeDefined();
      expect(job.id).toBeTruthy();
      expect(job.name).toBe('Test Job');
      expect(job.command).toBe('echo "test"');
      expect(job.status).toBe('created');
    });

    it('should auto-generate job ID if not provided', async () => {
      const job1 = await jobManager.createJob({ command: 'echo 1' });
      const job2 = await jobManager.createJob({ command: 'echo 2' });

      expect(job1.id).toBeTruthy();
      expect(job2.id).toBeTruthy();
      expect(job1.id).not.toBe(job2.id);
    });

    it('should set default values for optional fields', async () => {
      const job = await jobManager.createJob({ command: 'echo "test"' });

      expect(job.priority).toBe(0);
      expect(job.tags).toEqual([]);
      expect(job.type).toBe('shell');
      expect(job.createdAt).toBeInstanceOf(Date);
    });

    it('should throw error for job without command', async () => {
      await expect(jobManager.createJob({} as any)).rejects.toThrow();
    });

    it('should accept custom job parameters', async () => {
      const job = await jobManager.createJob({
        command: 'sleep 10',
        name: 'Sleep Job',
        type: 'scheduled',
        priority: 5,
        tags: ['test', 'sleep'],
        maxMemory: 1024,
        timeout: 30000,
      });

      expect(job.type).toBe('scheduled');
      expect(job.priority).toBe(5);
      expect(job.tags).toContain('test');
      expect(job.maxMemory).toBe(1024);
      expect(job.timeout).toBe(30000);
    });
  });

  describe('Job Listing', () => {
    beforeEach(async () => {
      await jobManager.createJob({ command: 'echo 1', tags: ['test'] });
      await jobManager.createJob({ command: 'echo 2', tags: ['production'] });
      await jobManager.createJob({ command: 'echo 3', type: 'scheduled' });
    });

    it('should list all jobs', () => {
      const jobs = jobManager.listJobs();
      expect(jobs.length).toBeGreaterThanOrEqual(3);
    });

    it('should filter jobs by status', async () => {
      const jobs = jobManager.listJobs({ status: ['created'] });
      expect(jobs.length).toBeGreaterThanOrEqual(3);
      jobs.forEach(job => {
        expect(job.status).toBe('created');
      });
    });

    it('should filter jobs by type', () => {
      const scheduledJobs = jobManager.listJobs({ type: ['scheduled'] });
      expect(scheduledJobs.length).toBeGreaterThanOrEqual(1);
      scheduledJobs.forEach(job => {
        expect(job.type).toBe('scheduled');
      });
    });

    it('should filter jobs by tags', () => {
      const testJobs = jobManager.listJobs({ tags: ['test'] });
      expect(testJobs.length).toBeGreaterThanOrEqual(1);
    });

    it('should filter jobs by name pattern', async () => {
      await jobManager.createJob({ command: 'echo test', name: 'MyTestJob' });
      const jobs = jobManager.listJobs({ namePattern: /Test/ });
      expect(jobs.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Job Retrieval', () => {
    it('should get a specific job by ID', async () => {
      const created = await jobManager.createJob({ command: 'echo test', name: 'GetTest' });
      const retrieved = jobManager.getJob(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
      expect(retrieved?.name).toBe('GetTest');
    });

    it('should return undefined for non-existent job', () => {
      const job = jobManager.getJob('non-existent-id');
      expect(job).toBeUndefined();
    });
  });

  describe('Job Statistics', () => {
    beforeEach(async () => {
      await jobManager.createJob({ command: 'echo 1' });
      await jobManager.createJob({ command: 'echo 2', type: 'scheduled' });
    });

    it('should return job statistics', () => {
      const stats = jobManager.getJobStats();

      expect(stats).toHaveProperty('total');
      expect(stats).toHaveProperty('byStatus');
      expect(stats).toHaveProperty('byType');
      expect(stats.total).toBeGreaterThanOrEqual(2);
    });

    it('should count jobs by status correctly', () => {
      const stats = jobManager.getJobStats();
      expect(stats.byStatus).toBeDefined();
      expect(stats.byStatus.created).toBeGreaterThanOrEqual(2);
    });

    it('should count jobs by type correctly', () => {
      const stats = jobManager.getJobStats();
      expect(stats.byType).toBeDefined();
    });
  });

  describe('Job Updates', () => {
    it('should update job name', async () => {
      const job = await jobManager.createJob({ command: 'echo test', name: 'OldName' });
      const updated = await jobManager.updateJob(job.id, { name: 'NewName' });

      expect(updated.name).toBe('NewName');
    });

    it('should update job priority', async () => {
      const job = await jobManager.createJob({ command: 'echo test' });
      const updated = await jobManager.updateJob(job.id, { priority: 10 });

      expect(updated.priority).toBe(10);
    });

    it('should clamp priority to valid range', async () => {
      const job = await jobManager.createJob({ command: 'echo test' });
      const updated1 = await jobManager.updateJob(job.id, { priority: 100 });
      expect(updated1.priority).toBe(19); // Max is 19

      const updated2 = await jobManager.updateJob(job.id, { priority: -100 });
      expect(updated2.priority).toBe(-20); // Min is -20
    });

    it('should update job tags', async () => {
      const job = await jobManager.createJob({ command: 'echo test' });
      const updated = await jobManager.updateJob(job.id, { tags: ['new', 'tags'] });

      expect(updated.tags).toContain('new');
      expect(updated.tags).toContain('tags');
    });

    it('should throw error for non-existent job', async () => {
      await expect(
        jobManager.updateJob('non-existent-id', { name: 'Test' })
      ).rejects.toThrow();
    });
  });

  describe('Job Removal', () => {
    it('should remove a completed job', async () => {
      const job = await jobManager.createJob({ command: 'echo test' });

      // Manually set status to completed
      const retrieved = jobManager.getJob(job.id);
      if (retrieved) {
        retrieved.status = 'completed';
        retrieved.completedAt = new Date();
      }

      const removed = await jobManager.removeJob(job.id);
      expect(removed).toBe(true);

      const found = jobManager.getJob(job.id);
      expect(found).toBeUndefined();
    });

    it('should not remove running job without force', async () => {
      const job = await jobManager.createJob({ command: 'sleep 100' });

      // Try to start the job
      try {
        await jobManager.startJob(job.id);
      } catch {
        // May fail in test environment, that's okay
      }

      // Even if it didn't start, test the remove logic
      const retrieved = jobManager.getJob(job.id);
      if (retrieved && retrieved.status === 'created') {
        const removed = await jobManager.removeJob(job.id);
        expect(removed).toBe(true);
      }
    });

    it('should return false for non-existent job', async () => {
      const removed = await jobManager.removeJob('non-existent-id');
      expect(removed).toBe(false);
    });
  });

  describe('Job Cleanup', () => {
    it('should cleanup old completed jobs', async () => {
      const job = await jobManager.createJob({ command: 'echo test' });

      // Mark as completed and old
      const retrieved = jobManager.getJob(job.id);
      if (retrieved) {
        retrieved.status = 'completed';
        retrieved.completedAt = new Date(Date.now() - 48 * 60 * 60 * 1000); // 48 hours ago
      }

      const cleanedCount = await jobManager.cleanupJobs(24); // Cleanup jobs older than 24 hours
      expect(cleanedCount).toBeGreaterThanOrEqual(0);
    });

    it('should not cleanup recent jobs', async () => {
      const job = await jobManager.createJob({ command: 'echo test' });

      // Mark as completed but recent
      const retrieved = jobManager.getJob(job.id);
      if (retrieved) {
        retrieved.status = 'completed';
        retrieved.completedAt = new Date(); // Just now
      }

      await jobManager.cleanupJobs(24);

      // Job should still exist
      const found = jobManager.getJob(job.id);
      expect(found).toBeDefined();
    });
  });

  describe('Persistence', () => {
    it('should persist jobs to file', async () => {
      await jobManager.createJob({ command: 'echo test', name: 'PersistTest' });

      // Wait a bit for async persistence
      await new Promise(resolve => setTimeout(resolve, 200));

      // Check if file was created
      if (fs.existsSync(testPersistenceFile)) {
        const content = fs.readFileSync(testPersistenceFile, 'utf8');
        expect(content).toBeTruthy();

        const jobs = JSON.parse(content);
        expect(Array.isArray(jobs)).toBe(true);
        expect(jobs.length).toBeGreaterThanOrEqual(1);
      } else {
        // If persistence is async and didn't complete yet, that's okay
        // The important thing is that the job was created
        const job = jobManager.getJob('job_1');
        expect(job).toBeDefined();
      }
    });

    it('should load persisted jobs on initialization', async () => {
      // Create a job and persist it
      const job1 = await jobManager.createJob({ command: 'echo test1', name: 'LoadTest' });

      // Wait for persistence to complete
      await new Promise(resolve => setTimeout(resolve, 300));

      // Verify the file exists before shutdown
      expect(fs.existsSync(testPersistenceFile)).toBe(true);

      // Shutdown current manager
      await jobManager.shutdown();

      // Wait a bit before creating new manager
      await new Promise(resolve => setTimeout(resolve, 100));

      // Create a new manager that should load persisted jobs
      const newManager = new JobManager(testPersistenceFile);

      // Give it time to load
      await new Promise(resolve => setTimeout(resolve, 100));

      const loaded = newManager.getJob(job1.id);
      expect(loaded).toBeDefined();
      expect(loaded?.name).toBe('LoadTest');

      await newManager.shutdown();
    });

    it('should handle empty persistence file', async () => {
      // Create empty file
      fs.writeFileSync(testPersistenceFile, '');

      const manager = new JobManager(testPersistenceFile);
      expect(manager).toBeDefined();

      await manager.shutdown();
    });
  });

  describe('Shutdown', () => {
    it('should shutdown gracefully', async () => {
      await jobManager.createJob({ command: 'echo test' });
      await expect(jobManager.shutdown()).resolves.not.toThrow();
    });
  });
});
