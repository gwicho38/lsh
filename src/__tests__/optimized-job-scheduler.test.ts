/**
 * OptimizedJobScheduler Unit Tests
 *
 * Tests for the priority queue-based job scheduler (Issue #108).
 */

import { OptimizedJobScheduler } from '../lib/optimized-job-scheduler.js';
import { BaseJobSpec } from '../lib/base-job-manager.js';

// Helper to create mock jobs
function createMockJob(overrides: Partial<BaseJobSpec> = {}): BaseJobSpec {
  const id = overrides.id || `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  return {
    id,
    name: overrides.name || `Test Job ${id}`,
    command: overrides.command || 'echo "test"',
    status: overrides.status || 'created',
    createdAt: overrides.createdAt || new Date(),
    schedule: overrides.schedule,
    ...overrides,
  };
}

describe('OptimizedJobScheduler', () => {
  let scheduler: OptimizedJobScheduler;

  beforeEach(() => {
    scheduler = new OptimizedJobScheduler({ debug: false });
  });

  afterEach(() => {
    scheduler.stop();
  });

  describe('initialization', () => {
    it('should create with default config', () => {
      const metrics = scheduler.getMetrics();
      expect(metrics.totalJobs).toBe(0);
      expect(metrics.totalChecks).toBe(0);
    });

    it('should accept custom config', () => {
      const customScheduler = new OptimizedJobScheduler({
        minCheckInterval: 50,
        maxCheckInterval: 30000,
        dueBuffer: 100,
        debug: true,
      });

      expect(customScheduler).toBeDefined();
      customScheduler.stop();
    });
  });

  describe('job management', () => {
    it('should add a scheduled job', () => {
      const job = createMockJob({
        schedule: { interval: 60000, nextRun: new Date(Date.now() + 60000) },
      });

      scheduler.addJob(job);

      const metrics = scheduler.getMetrics();
      expect(metrics.totalJobs).toBe(1);
    });

    it('should not add a job without schedule', () => {
      const job = createMockJob(); // No schedule

      scheduler.addJob(job);

      const metrics = scheduler.getMetrics();
      expect(metrics.totalJobs).toBe(0);
    });

    it('should remove a job', () => {
      const job = createMockJob({
        schedule: { interval: 60000, nextRun: new Date(Date.now() + 60000) },
      });

      scheduler.addJob(job);
      expect(scheduler.getMetrics().totalJobs).toBe(1);

      const removed = scheduler.removeJob(job.id);
      expect(removed).toBe(true);
      expect(scheduler.getMetrics().totalJobs).toBe(0);
    });

    it('should return false when removing non-existent job', () => {
      const removed = scheduler.removeJob('nonexistent-id');
      expect(removed).toBe(false);
    });

    it('should update a job', () => {
      const job = createMockJob({
        schedule: { interval: 60000, nextRun: new Date(Date.now() + 60000) },
      });

      scheduler.addJob(job);

      // Update with new next run
      job.schedule = { interval: 30000, nextRun: new Date(Date.now() + 30000) };
      scheduler.updateJob(job);

      expect(scheduler.getMetrics().totalJobs).toBe(1);
    });

    it('should get all scheduled jobs', () => {
      const job1 = createMockJob({
        id: 'job1',
        schedule: { interval: 60000, nextRun: new Date(Date.now() + 60000) },
      });
      const job2 = createMockJob({
        id: 'job2',
        schedule: { interval: 30000, nextRun: new Date(Date.now() + 30000) },
      });

      scheduler.addJob(job1);
      scheduler.addJob(job2);

      const allJobs = scheduler.getAllJobs();
      expect(allJobs).toHaveLength(2);
    });
  });

  describe('interval scheduling', () => {
    it('should calculate next run for interval jobs', () => {
      const nextRun = new Date(Date.now() + 5000); // 5 seconds from now
      const job = createMockJob({
        schedule: { interval: 60000, nextRun },
      });

      scheduler.addJob(job);

      const timeUntilNext = scheduler.getTimeUntilNextJob();
      expect(timeUntilNext).toBeLessThanOrEqual(5000);
      expect(timeUntilNext).toBeGreaterThan(0);
    });

    it('should return null for time until next when no jobs', () => {
      const timeUntilNext = scheduler.getTimeUntilNextJob();
      expect(timeUntilNext).toBeNull();
    });

    it('should identify due jobs', () => {
      // Create a job that is due now
      const job = createMockJob({
        schedule: { interval: 60000, nextRun: new Date(Date.now() - 1000) }, // 1 second ago
      });

      scheduler.addJob(job);

      const dueJobs = scheduler.getDueJobs();
      expect(dueJobs).toHaveLength(1);
      expect(dueJobs[0].id).toBe(job.id);
    });

    it('should not return jobs that are not due', () => {
      const job = createMockJob({
        schedule: { interval: 60000, nextRun: new Date(Date.now() + 60000) }, // 1 minute from now
      });

      scheduler.addJob(job);

      const dueJobs = scheduler.getDueJobs();
      expect(dueJobs).toHaveLength(0);
    });

    it('should reschedule interval jobs after due', () => {
      const job = createMockJob({
        schedule: { interval: 60000, nextRun: new Date(Date.now() - 1000) },
      });

      scheduler.addJob(job);
      const dueJobs = scheduler.getDueJobs();

      expect(dueJobs).toHaveLength(1);
      // Job should be rescheduled
      expect(scheduler.getMetrics().totalJobs).toBe(1);
    });
  });

  describe('cron scheduling', () => {
    it('should add a cron job', () => {
      const job = createMockJob({
        schedule: { cron: '* * * * *' }, // Every minute
      });

      scheduler.addJob(job);

      expect(scheduler.getMetrics().totalJobs).toBe(1);
    });

    it('should parse valid cron expressions', () => {
      // These should all be valid cron expressions
      const cronExpressions = [
        '* * * * *',     // Every minute
        '0 * * * *',     // Every hour
        '0 0 * * *',     // Every day at midnight
        '0 0 1 * *',     // First of every month
        '0 0 * * 0',     // Every Sunday
        '*/5 * * * *',   // Every 5 minutes
        '0 9-17 * * 1-5', // 9am-5pm weekdays
      ];

      for (const cron of cronExpressions) {
        const job = createMockJob({
          id: `cron-${cron.replace(/\W/g, '-')}`,
          schedule: { cron },
        });
        scheduler.addJob(job);
      }

      expect(scheduler.getMetrics().totalJobs).toBe(cronExpressions.length);
    });

    it('should handle cron with specific values', () => {
      // Job that runs at minute 30 of every hour
      const job = createMockJob({
        schedule: { cron: '30 * * * *' },
      });

      scheduler.addJob(job);
      expect(scheduler.getMetrics().totalJobs).toBe(1);
    });

    it('should handle cron with intervals', () => {
      // Job that runs every 15 minutes
      const job = createMockJob({
        schedule: { cron: '*/15 * * * *' },
      });

      scheduler.addJob(job);
      expect(scheduler.getMetrics().totalJobs).toBe(1);
    });

    it('should handle cron with ranges', () => {
      // Job that runs between 9am and 5pm
      const job = createMockJob({
        schedule: { cron: '0 9-17 * * *' },
      });

      scheduler.addJob(job);
      expect(scheduler.getMetrics().totalJobs).toBe(1);
    });

    it('should handle cron with lists', () => {
      // Job that runs at minutes 0, 15, 30, 45
      const job = createMockJob({
        schedule: { cron: '0,15,30,45 * * * *' },
      });

      scheduler.addJob(job);
      expect(scheduler.getMetrics().totalJobs).toBe(1);
    });
  });

  describe('scheduler lifecycle', () => {
    it('should start and stop cleanly', () => {
      scheduler.start();
      // Should be able to add jobs while running
      const job = createMockJob({
        schedule: { interval: 60000, nextRun: new Date(Date.now() + 60000) },
      });
      scheduler.addJob(job);

      scheduler.stop();
      // Verify it stopped cleanly
    });

    it('should not error when starting twice', () => {
      scheduler.start();
      scheduler.start(); // Should be idempotent
      scheduler.stop();
    });

    it('should emit jobDue event for due jobs', (done) => {
      const job = createMockJob({
        schedule: { interval: 60000, nextRun: new Date(Date.now() - 1000) },
      });

      scheduler.on('jobDue', (dueJob: BaseJobSpec) => {
        expect(dueJob.id).toBe(job.id);
        done();
      });

      scheduler.addJob(job);
      scheduler.checkScheduledJobs();
    });
  });

  describe('metrics', () => {
    it('should track total checks', () => {
      scheduler.checkScheduledJobs();
      scheduler.checkScheduledJobs();

      const metrics = scheduler.getMetrics();
      expect(metrics.totalChecks).toBe(2);
    });

    it('should track total executed', () => {
      const job1 = createMockJob({
        id: 'job1',
        schedule: { interval: 60000, nextRun: new Date(Date.now() - 1000) },
      });
      const job2 = createMockJob({
        id: 'job2',
        schedule: { interval: 60000, nextRun: new Date(Date.now() - 1000) },
      });

      scheduler.addJob(job1);
      scheduler.addJob(job2);
      scheduler.checkScheduledJobs();

      const metrics = scheduler.getMetrics();
      expect(metrics.totalExecuted).toBe(2);
    });

    it('should estimate memory usage', () => {
      for (let i = 0; i < 100; i++) {
        scheduler.addJob(createMockJob({
          id: `job-${i}`,
          schedule: { interval: 60000, nextRun: new Date(Date.now() + 60000 * i) },
        }));
      }

      const metrics = scheduler.getMetrics();
      expect(metrics.memoryUsage).toBeGreaterThan(0);
      expect(metrics.totalJobs).toBe(100);
    });

    it('should calculate average check time', () => {
      // Run several checks
      for (let i = 0; i < 10; i++) {
        scheduler.checkScheduledJobs();
      }

      const metrics = scheduler.getMetrics();
      expect(metrics.averageCheckTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('concurrent job handling', () => {
    it('should handle multiple jobs becoming due at the same time', () => {
      const now = Date.now();
      const jobs = Array.from({ length: 10 }, (_, i) =>
        createMockJob({
          id: `concurrent-${i}`,
          schedule: { interval: 60000, nextRun: new Date(now - 100) }, // All due
        })
      );

      jobs.forEach(job => scheduler.addJob(job));
      const dueJobs = scheduler.getDueJobs();

      expect(dueJobs).toHaveLength(10);
    });

    it('should return jobs in priority order (earliest first)', () => {
      const now = Date.now();
      scheduler.addJob(createMockJob({
        id: 'third',
        schedule: { interval: 60000, nextRun: new Date(now - 100) },
      }));
      scheduler.addJob(createMockJob({
        id: 'first',
        schedule: { interval: 60000, nextRun: new Date(now - 300) }, // Oldest
      }));
      scheduler.addJob(createMockJob({
        id: 'second',
        schedule: { interval: 60000, nextRun: new Date(now - 200) },
      }));

      const dueJobs = scheduler.getDueJobs();

      expect(dueJobs[0].id).toBe('first');
      expect(dueJobs[1].id).toBe('second');
      expect(dueJobs[2].id).toBe('third');
    });
  });

  describe('edge cases', () => {
    it('should handle jobs with invalid cron expressions gracefully', () => {
      const job = createMockJob({
        schedule: { cron: 'invalid cron' },
      });

      // Should not throw
      scheduler.addJob(job);
      // Job might not be added due to invalid schedule
    });

    it('should handle removing job that was already removed', () => {
      const job = createMockJob({
        schedule: { interval: 60000, nextRun: new Date(Date.now() + 60000) },
      });

      scheduler.addJob(job);
      scheduler.removeJob(job.id);
      const secondRemove = scheduler.removeJob(job.id);

      expect(secondRemove).toBe(false);
    });

    it('should handle check when scheduler is stopped', () => {
      scheduler.start();
      scheduler.stop();

      // Should not error
      const dueJobs = scheduler.checkScheduledJobs();
      expect(Array.isArray(dueJobs)).toBe(true);
    });
  });

  describe('performance', () => {
    it('should handle 1000 jobs efficiently', () => {
      const startAdd = globalThis.performance.now();
      const now = Date.now();

      // Add 1000 jobs with varying next run times
      for (let i = 0; i < 1000; i++) {
        scheduler.addJob(createMockJob({
          id: `perf-${i}`,
          schedule: {
            interval: 60000,
            nextRun: new Date(now + Math.random() * 3600000), // Random time in next hour
          },
        }));
      }

      const addTime = globalThis.performance.now() - startAdd;
      expect(addTime).toBeLessThan(1000); // Should be fast

      // Check time should also be fast
      const startCheck = globalThis.performance.now();
      scheduler.checkScheduledJobs();
      const checkTime = globalThis.performance.now() - startCheck;
      expect(checkTime).toBeLessThan(100); // O(log n) should be very fast
    });

    it('should have consistent check performance regardless of total jobs', () => {
      const checkTimes: number[] = [];
      const now = Date.now();

      // Run with increasing job counts
      for (const count of [10, 100, 500, 1000]) {
        // Clear scheduler
        scheduler.stop();
        scheduler = new OptimizedJobScheduler({ debug: false });

        // Add jobs (none due)
        for (let i = 0; i < count; i++) {
          scheduler.addJob(createMockJob({
            id: `scale-${count}-${i}`,
            schedule: {
              interval: 60000,
              nextRun: new Date(now + 3600000), // 1 hour from now
            },
          }));
        }

        // Measure check time
        const start = globalThis.performance.now();
        scheduler.checkScheduledJobs();
        checkTimes.push(globalThis.performance.now() - start);
      }

      // Check times should not grow linearly with job count
      // The ratio between 1000 jobs and 10 jobs should be much less than 100x
      const ratio = checkTimes[3] / Math.max(checkTimes[0], 0.01);
      expect(ratio).toBeLessThan(50); // Should be O(log n), not O(n)
    });
  });
});
