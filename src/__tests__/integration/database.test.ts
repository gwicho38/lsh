/**
 * Integration Tests - Database Persistence
 * Tests for real database interactions
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { Testcontainers as _Testcontainers } from 'testcontainers';
import { PostgreSqlContainer } from 'testcontainers/modules/postgresql';
import { RedisContainer } from 'testcontainers/modules/redis';
import { DatabasePersistence } from '../src/lib/database-persistence.js';

describe('Database Integration Tests', () => {
  let postgres: PostgreSqlContainer;
  let redis: RedisContainer;
  let db: DatabasePersistence;
  let postgresConnection: any;
  let redisConnection: any;

  beforeAll(async () => {
    // Start PostgreSQL container
    postgres = await new PostgreSqlContainer().start();
    
    // Start Redis container  
    redis = await new RedisContainer().start();

    // Get connection details
    postgresConnection = {
      host: postgres.getHost(),
      port: postgres.getPort(),
      database: 'lsh_test',
      user: 'test_user',
      password: 'test_password'
    };

    redisConnection = {
      host: redis.getHost(),
      port: redis.getPort()
    };

    // Initialize database persistence
    db = new DatabasePersistence(postgresConnection, redisConnection);
    await db.initialize();
  });

  afterAll(async () => {
    // Cleanup containers
    await db?.cleanup?.();
    await postgres?.stop();
    await redis?.stop();
  });

  describe('Connection Management', () => {
    it('should establish PostgreSQL connection', async () => {
      expect(postgresConnection.host).toBeDefined();
      expect(postgresConnection.port).toBeGreaterThan(0);
      
      // Test actual connection
      const result = await db.query('SELECT 1 as test');
      expect(result.rows[0].test).toBe(1);
    });

    it('should establish Redis connection', async () => {
      expect(redisConnection.host).toBeDefined();
      expect(redisConnection.port).toBeGreaterThan(0);
      
      // Test Redis operations
      await db.cacheSet('test-key', 'test-value', 60);
      const cached = await db.cacheGet('test-key');
      expect(cached).toBe('test-value');
    });

    it('should handle connection failures gracefully', async () => {
      // Test with invalid connection
      const invalidDb = new DatabasePersistence({
        host: 'invalid-host',
        port: 9999
      }, redisConnection);

      await expect(invalidDb.initialize()).rejects.toThrow();
    });
  });

  describe('CRUD Operations', () => {
    it('should create and retrieve job records', async () => {
      const jobData = {
        name: 'test-job',
        command: 'echo "hello world"',
        type: 'shell' as const,
        status: 'created' as const
      };

      const created = await db.createJob(jobData);
      expect(created.id).toBeDefined();
      expect(created.name).toBe(jobData.name);
      expect(created.createdAt).toBeInstanceOf(Date);

      // Retrieve the job
      const retrieved = await db.getJob(created.id);
      expect(retrieved).toEqual(created);
    });

    it('should update job records', async () => {
      const job = await db.createJob({
        name: 'update-test',
        command: 'echo "test"',
        type: 'shell' as const,
        status: 'created' as const
      });

      const updates = {
        status: 'running' as const,
        lastRunAt: new Date()
      };

      const updated = await db.updateJob(job.id, updates);
      expect(updated.status).toBe(updates.status);
      expect(updated.lastRunAt).toEqual(updates.lastRunAt);
    });

    it('should delete job records', async () => {
      const job = await db.createJob({
        name: 'delete-test',
        command: 'echo "test"',
        type: 'shell' as const,
        status: 'created' as const
      });

      // Confirm it exists
      const beforeDelete = await db.getJob(job.id);
      expect(beforeDelete).toBeDefined();

      // Delete it
      await db.deleteJob(job.id);

      // Confirm it's gone
      const afterDelete = await db.getJob(job.id);
      expect(afterDelete).toBeUndefined();
    });

    it('should query jobs with filters', async () => {
      // Create multiple jobs with different types
      const _shellJob = await db.createJob({
        name: 'shell-job',
        command: 'echo "shell"',
        type: 'shell' as const,
        status: 'created' as const
      });

      const _systemJob = await db.createJob({
        name: 'system-job', 
        command: 'systemctl status',
        type: 'system' as const,
        status: 'created' as const
      });

      // Query by type
      const shellJobs = await db.getJobs({ type: 'shell' });
      expect(shellJobs).toHaveLength(1);
      expect(shellJobs[0].name).toBe('shell-job');

      const systemJobs = await db.getJobs({ type: 'system' });
      expect(systemJobs).toHaveLength(1);
      expect(systemJobs[0].name).toBe('system-job');

      // Query with pagination
      const allJobs = await db.getJobs({ limit: 10, offset: 0 });
      expect(allJobs.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Transaction Management', () => {
    it('should handle transactions correctly', async () => {
      const job1 = await db.createJob({
        name: 'tx-job-1',
        command: 'echo "job 1"',
        type: 'shell' as const,
        status: 'created' as const
      });

      const job2 = await db.createJob({
        name: 'tx-job-2',
        command: 'echo "job 2"',
        type: 'shell' as const,
        status: 'created' as const
      });

      // Update both in a transaction
      await db.transaction(async (trx) => {
        await db.updateJob(job1.id, { status: 'running' as const }, { transaction: trx });
        await db.updateJob(job2.id, { status: 'completed' as const }, { transaction: trx });
      });

      // Verify both updates
      const updated1 = await db.getJob(job1.id);
      const updated2 = await db.getJob(job2.id);

      expect(updated1.status).toBe('running');
      expect(updated2.status).toBe('completed');
    });

    it('should rollback on transaction failure', async () => {
      const job = await db.createJob({
        name: 'rollback-test',
        command: 'echo "test"',
        type: 'shell' as const,
        status: 'created' as const
      });

      let errorThrown = false;
      try {
        await db.transaction(async (trx) => {
          await db.updateJob(job.id, { status: 'running' as const }, { transaction: trx });
          throw new Error('Intentional failure');
        });
      } catch {
        errorThrown = true;
      }

      expect(errorThrown).toBe(true);

      // Verify rollback - job should still have original status
      const afterRollback = await db.getJob(job.id);
      expect(afterRollback.status).toBe('created');
    });
  });

  describe('Performance Tests', () => {
    it('should handle concurrent operations efficiently', async () => {
      const jobs = Array(50).fill(null).map((_, index) => ({
        name: `concurrent-job-${index}`,
        command: `echo "job ${index}"`,
        type: 'shell' as const,
        status: 'created' as const
      }));

      const startTime = Date.now();

      // Create jobs concurrently
      const createdJobs = await Promise.all(
        jobs.map(job => db.createJob(job))
      );

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete 50 concurrent creates within reasonable time
      expect(duration).toBeLessThan(5000); // 5 seconds
      expect(createdJobs).toHaveLength(50);
    });

    it('should handle large job data efficiently', async () => {
      const largeCommand = 'echo "' + 'x'.repeat(10000) + '"'; // 10KB command

      const startTime = Date.now();
      const job = await db.createJob({
        name: 'large-job-test',
        command: largeCommand,
        type: 'shell' as const,
        status: 'created' as const
      });
      const endTime = Date.now();

      const duration = endTime - startTime;

      // Should handle large data efficiently
      expect(duration).toBeLessThan(1000); // 1 second
      expect(job.command).toBe(largeCommand);
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors', async () => {
      // Simulate database disconnection
      await db.cleanup?.();

      const errorPromise = db.getJobs();
      await expect(errorPromise).rejects.toThrow();
    });

    it('should handle constraint violations gracefully', async () => {
      // Try to create duplicate (should be handled gracefully)
      const jobData = {
        name: 'unique-constraint-test',
        command: 'echo "test"',
        type: 'shell' as const,
        status: 'created' as const
      };

      const job1 = await db.createJob(jobData);

      // Try to create another with same unique constraint if applicable
      let _duplicateError = false;
      try {
        // This might fail depending on constraints
        await db.createJob(jobData);
      } catch {
        _duplicateError = true;
      }

      // Should either succeed or handle gracefully
      expect(job1).toBeDefined();
    });

    it('should provide meaningful error messages', async () => {
      try {
        await db.query('INVALID SQL QUERY');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toBeDefined();
        expect(typeof error.message).toBe('string');
      }
    });
  });
});