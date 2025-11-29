/**
 * LSH Job Daemon Tests
 * Tests for the LSHJobDaemon class - job scheduling and execution
 */

import { describe, it, expect, jest, beforeEach, afterEach, beforeAll } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Mock child_process exec to return test output
jest.mock('child_process', () => ({
  ...jest.requireActual('child_process') as object,
  exec: jest.fn((cmd: string, opts: unknown, callback?: (err: Error | null, stdout: string, stderr: string) => void) => {
    const cb = typeof opts === 'function' ? opts as (err: Error | null, stdout: string, stderr: string) => void : callback;
    if (cb) {
      setImmediate(() => cb(null, 'test output', ''));
    }
    return {
      kill: jest.fn(),
      on: jest.fn(),
      stdout: { on: jest.fn() },
      stderr: { on: jest.fn() }
    };
  }),
  spawn: jest.fn().mockReturnValue({
    pid: 12345,
    kill: jest.fn(),
    on: jest.fn(),
    stdout: { on: jest.fn(), pipe: jest.fn() },
    stderr: { on: jest.fn(), pipe: jest.fn() },
    stdin: { write: jest.fn(), end: jest.fn() }
  }),
  execSync: jest.fn().mockReturnValue(Buffer.from(''))
}));

// Dynamic import for LSHJobDaemon
let LSHJobDaemon: typeof import('../src/daemon/lshd.js').LSHJobDaemon;

describe('LSH Job Daemon', () => {
  let daemon: InstanceType<typeof LSHJobDaemon>;
  let testDir: string;
  let testConfig: {
    pidFile: string;
    logFile: string;
    jobsFile: string;
    socketPath: string;
    checkInterval: number;
    maxLogSize: number;
    autoRestart: boolean;
  };

  beforeAll(async () => {
    // Dynamic import of the daemon module
    const module = await import('../src/daemon/lshd.js');
    LSHJobDaemon = module.LSHJobDaemon;
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Create unique temp directory for each test
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lsh-daemon-test-'));

    testConfig = {
      pidFile: path.join(testDir, 'daemon.pid'),
      logFile: path.join(testDir, 'daemon.log'),
      jobsFile: path.join(testDir, 'jobs.json'),
      socketPath: path.join(testDir, 'daemon.sock'),
      checkInterval: 100, // Fast for testing
      maxLogSize: 1024 * 1024,
      autoRestart: false
    };

    daemon = new LSHJobDaemon(testConfig);
  });

  afterEach(async () => {
    // Give time for any pending operations to complete
    await new Promise(resolve => setTimeout(resolve, 50));

    try {
      if (daemon) {
        await daemon.stop().catch(() => {});
      }
    } catch (_e) {
      // Ignore stop errors in cleanup
    }

    // Wait for cleanup
    await new Promise(resolve => setTimeout(resolve, 50));

    // Cleanup test directory
    try {
      fs.rmSync(testDir, { recursive: true, force: true });
    } catch (_e) {
      // Ignore cleanup errors
    }
  });

  describe('Daemon Lifecycle', () => {
    it('should create daemon instance with config', () => {
      expect(daemon).toBeDefined();
    });

    it('should start successfully', async () => {
      await daemon.start();
      const status = await daemon.getStatus();
      expect(status.running).toBe(true);
    });

    it('should prevent multiple starts', async () => {
      await daemon.start();
      await expect(daemon.start()).rejects.toThrow(/already running/i);
    });

    it('should stop successfully', async () => {
      await daemon.start();
      await daemon.stop();
      const status = await daemon.getStatus();
      expect(status.running).toBe(false);
    });

    it('should restart successfully', async () => {
      await daemon.start();
      await daemon.restart();
      const status = await daemon.getStatus();
      expect(status.running).toBe(true);
    });
  });

  describe('Job Management', () => {
    beforeEach(async () => {
      await daemon.start();
    });

    describe('addJob', () => {
      it('should add a new job', async () => {
        const jobSpec = {
          name: 'test-job',
          command: 'echo test',
          type: 'shell' as const,
          description: 'Test job'
        };

        const job = await daemon.addJob(jobSpec);

        expect(job).toMatchObject({
          id: expect.any(String),
          name: 'test-job',
          command: 'echo test'
        });
      });

      it('should add job with schedule', async () => {
        const jobSpec = {
          name: 'scheduled-job',
          command: 'echo scheduled',
          type: 'shell' as const,
          schedule: { cron: '0 0 * * *' }
        };

        const job = await daemon.addJob(jobSpec);

        expect(job.schedule).toEqual({ cron: '0 0 * * *' });
      });

      it('should add job with timeout', async () => {
        const jobSpec = {
          name: 'timeout-job',
          command: 'sleep 10',
          type: 'shell' as const,
          timeout: 5000
        };

        const job = await daemon.addJob(jobSpec);
        expect(job.timeout).toBe(5000);
      });
    });

    describe('getJob', () => {
      it('should return job details', async () => {
        const created = await daemon.addJob({
          name: 'test-job',
          command: 'echo test',
          type: 'shell'
        });

        const retrieved = await daemon.getJob(created.id);
        expect(retrieved).toBeDefined();
        expect(retrieved?.name).toBe('test-job');
      });

      it('should return undefined for non-existent job', async () => {
        const result = await daemon.getJob('non-existent-id');
        expect(result).toBeUndefined();
      });
    });

    describe('listJobs', () => {
      it('should return all jobs', async () => {
        await daemon.addJob({ name: 'job1', command: 'echo 1', type: 'shell' });
        await daemon.addJob({ name: 'job2', command: 'echo 2', type: 'shell' });

        const jobs = await daemon.listJobs();
        expect(jobs.length).toBeGreaterThanOrEqual(2);
      });

      it('should apply limit to results', async () => {
        await daemon.addJob({ name: 'job1', command: 'echo 1', type: 'shell' });
        await daemon.addJob({ name: 'job2', command: 'echo 2', type: 'shell' });
        await daemon.addJob({ name: 'job3', command: 'echo 3', type: 'shell' });

        const jobs = await daemon.listJobs(undefined, 2);
        expect(jobs.length).toBeLessThanOrEqual(2);
      });
    });

    describe('removeJob', () => {
      it('should remove a job', async () => {
        const job = await daemon.addJob({
          name: 'to-remove',
          command: 'echo remove',
          type: 'shell'
        });

        const result = await daemon.removeJob(job.id);
        expect(result).toBe(true);

        const retrieved = await daemon.getJob(job.id);
        expect(retrieved).toBeUndefined();
      });

      it('should return false for non-existent job', async () => {
        const result = await daemon.removeJob('non-existent-id');
        expect(result).toBe(false);
      });
    });

    describe('triggerJob', () => {
      it('should trigger a job and return result', async () => {
        const job = await daemon.addJob({
          name: 'trigger-test',
          command: 'echo hello',
          type: 'shell'
        });

        const result = await daemon.triggerJob(job.id);

        // triggerJob returns { success, output, error }
        expect(result).toHaveProperty('success');
      });

      it('should return error for non-existent job', async () => {
        const result = await daemon.triggerJob('non-existent-id');

        expect(result.success).toBe(false);
        expect(result.error).toContain('not found');
      });
    });
  });

  describe('Status', () => {
    it('should return daemon status when running', async () => {
      await daemon.start();

      const status = await daemon.getStatus();

      expect(status).toMatchObject({
        running: true,
        pid: expect.any(Number),
        uptime: expect.any(Number),
        jobCount: expect.any(Number),
        memoryUsage: expect.objectContaining({
          heapUsed: expect.any(Number),
          heapTotal: expect.any(Number)
        })
      });
    });

    it('should return correct job counts', async () => {
      await daemon.start();

      await daemon.addJob({ name: 'job1', command: 'echo 1', type: 'shell' });
      await daemon.addJob({ name: 'job2', command: 'echo 2', type: 'shell' });

      const status = await daemon.getStatus();
      expect(status.jobs.total).toBeGreaterThanOrEqual(2);
    });

    it('should track uptime correctly', async () => {
      await daemon.start();

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 100));

      const status = await daemon.getStatus();
      expect(status.uptime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Job Serialization', () => {
    it('should sanitize jobs for safe serialization', async () => {
      await daemon.start();

      const job = await daemon.addJob({
        name: 'serialize-test',
        command: 'echo test',
        type: 'shell',
        description: 'Test serialization'
      });

      // Get the job back (which goes through sanitization)
      const retrieved = await daemon.getJob(job.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('serialize-test');
      expect(retrieved?.command).toBe('echo test');
      // Should not have circular references or process objects
      expect(() => JSON.stringify(retrieved)).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should reject job with empty command', async () => {
      await daemon.start();

      // Empty command should be rejected by validation
      await expect(daemon.addJob({
        name: 'empty-command',
        command: '',
        type: 'shell'
      })).rejects.toThrow(/command.*required/i);
    });

    it('should not crash when stopping a non-running daemon', async () => {
      // Create a fresh daemon that hasn't been started
      const freshDaemon = new LSHJobDaemon({
        ...testConfig,
        jobsFile: path.join(testDir, 'fresh-jobs.json'),
        pidFile: path.join(testDir, 'fresh-daemon.pid'),
        logFile: path.join(testDir, 'fresh-daemon.log'),
        socketPath: path.join(testDir, 'fresh-daemon.sock')
      });
      // Stop without starting - should not throw
      await expect(freshDaemon.stop()).resolves.not.toThrow();
    });
  });
});
