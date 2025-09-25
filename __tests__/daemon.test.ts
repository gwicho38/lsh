import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { LSHJobDaemon } from '../src/daemon/lshd';
import * as fs from 'fs';
import { exec } from 'child_process';

// Mock fs and child_process
jest.mock('fs');
jest.mock('child_process');

describe('LSH Job Daemon', () => {
  let daemon: LSHJobDaemon;
  const testConfig = {
    pidFile: '/tmp/test-daemon.pid',
    logFile: '/tmp/test-daemon.log',
    jobsFile: '/tmp/test-jobs.json',
    socketPath: '/tmp/test-daemon.sock',
    checkInterval: 100, // Fast for testing
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock file system operations
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    (fs.readFileSync as jest.Mock).mockReturnValue('{}');
    (fs.writeFileSync as jest.Mock).mockImplementation(() => {});
    (fs.unlinkSync as jest.Mock).mockImplementation(() => {});

    daemon = new LSHJobDaemon(testConfig);
  });

  afterEach(async () => {
    if (daemon && daemon['isRunning']) {
      await daemon.stop();
    }
  });

  describe('Daemon Lifecycle', () => {
    it('should start successfully', async () => {
      await expect(daemon.start()).resolves.not.toThrow();
      expect(daemon['isRunning']).toBe(true);
    });

    it('should prevent multiple starts', async () => {
      await daemon.start();
      await expect(daemon.start()).rejects.toThrow('Daemon is already running');
    });

    it('should stop successfully', async () => {
      await daemon.start();
      await daemon.stop();
      expect(daemon['isRunning']).toBe(false);
    });

    it('should write PID file on start', async () => {
      await daemon.start();
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        testConfig.pidFile,
        expect.any(String)
      );
    });

    it('should remove PID file on stop', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      await daemon.start();
      await daemon.stop();
      expect(fs.unlinkSync).toHaveBeenCalledWith(testConfig.pidFile);
    });
  });

  describe('Job Management', () => {
    beforeEach(async () => {
      await daemon.start();
    });

    afterEach(async () => {
      await daemon.stop();
    });

    describe('addJob', () => {
      it('should add a new job', () => {
        const jobSpec = {
          name: 'test-job',
          command: 'echo test',
          type: 'shell' as const,
          description: 'Test job'
        };

        const job = daemon.addJob(jobSpec);

        expect(job).toMatchObject({
          id: expect.stringMatching(/^job_\d+_[a-z0-9]+$/),
          name: 'test-job',
          command: 'echo test',
          type: 'shell',
          status: 'pending'
        });
      });

      it('should add job with schedule', () => {
        const jobSpec = {
          name: 'scheduled-job',
          command: 'echo scheduled',
          type: 'shell' as const,
          schedule: { cron: '0 0 * * *' }
        };

        const job = daemon.addJob(jobSpec);

        expect(job.schedule).toEqual({ cron: '0 0 * * *' });
        expect(job.nextRun).toBeDefined();
      });
    });

    describe('updateJob', () => {
      it('should update an existing job', () => {
        const job = daemon.addJob({
          name: 'original',
          command: 'echo original',
          type: 'shell'
        });

        const updated = daemon.updateJob(job.id, {
          name: 'updated',
          command: 'echo updated'
        });

        expect(updated?.name).toBe('updated');
        expect(updated?.command).toBe('echo updated');
      });

      it('should return undefined for non-existent job', () => {
        const result = daemon.updateJob('non-existent', { name: 'test' });
        expect(result).toBeUndefined();
      });
    });

    describe('removeJob', () => {
      it('should remove a job', () => {
        const job = daemon.addJob({
          name: 'to-remove',
          command: 'echo remove',
          type: 'shell'
        });

        const result = daemon.removeJob(job.id);
        expect(result).toBe(true);
        expect(daemon.getJob(job.id)).toBeUndefined();
      });

      it('should return false for non-existent job', () => {
        const result = daemon.removeJob('non-existent');
        expect(result).toBe(false);
      });

      it('should not remove running job without force', () => {
        const job = daemon.addJob({
          name: 'running-job',
          command: 'sleep 10',
          type: 'shell'
        });

        // Simulate running status
        daemon['jobs'].get(job.id)!.status = 'running';

        const result = daemon.removeJob(job.id);
        expect(result).toBe(false);
      });

      it('should force remove running job', () => {
        const job = daemon.addJob({
          name: 'running-job',
          command: 'sleep 10',
          type: 'shell'
        });

        daemon['jobs'].get(job.id)!.status = 'running';

        const result = daemon.removeJob(job.id, true);
        expect(result).toBe(true);
      });
    });

    describe('getJob', () => {
      it('should return job details', () => {
        const job = daemon.addJob({
          name: 'test-job',
          command: 'echo test',
          type: 'shell'
        });

        const retrieved = daemon.getJob(job.id);
        expect(retrieved).toEqual(job);
      });

      it('should return undefined for non-existent job', () => {
        const result = daemon.getJob('non-existent');
        expect(result).toBeUndefined();
      });
    });

    describe('getAllJobs', () => {
      it('should return all jobs', () => {
        daemon.addJob({ name: 'job1', command: 'echo 1', type: 'shell' });
        daemon.addJob({ name: 'job2', command: 'echo 2', type: 'shell' });

        const jobs = daemon.getAllJobs();
        expect(jobs).toHaveLength(2);
        expect(jobs.map(j => j.name)).toEqual(['job1', 'job2']);
      });

      it('should return empty array when no jobs', () => {
        const jobs = daemon.getAllJobs();
        expect(jobs).toEqual([]);
      });
    });
  });

  describe('Job Execution', () => {
    beforeEach(async () => {
      await daemon.start();
    });

    afterEach(async () => {
      await daemon.stop();
    });

    it('should run a job', async () => {
      const mockExec = exec as unknown as jest.Mock;
      mockExec.mockImplementation((cmd, callback) => {
        callback(null, 'test output', '');
      });

      const job = daemon.addJob({
        name: 'test-job',
        command: 'echo test',
        type: 'shell'
      });

      await daemon.runJob(job.id);

      const updatedJob = daemon.getJob(job.id);
      expect(updatedJob?.status).toBe('completed');
      expect(updatedJob?.stdout).toBe('test output');
    });

    it('should handle job execution errors', async () => {
      const mockExec = exec as unknown as jest.Mock;
      mockExec.mockImplementation((cmd, callback) => {
        callback(new Error('Command failed'), '', 'error output');
      });

      const job = daemon.addJob({
        name: 'failing-job',
        command: 'exit 1',
        type: 'shell'
      });

      await daemon.runJob(job.id);

      const updatedJob = daemon.getJob(job.id);
      expect(updatedJob?.status).toBe('failed');
      expect(updatedJob?.stderr).toBe('error output');
    });

    it('should pause and resume jobs', () => {
      const job = daemon.addJob({
        name: 'pausable',
        command: 'echo test',
        type: 'shell'
      });

      daemon.pauseJob(job.id);
      expect(daemon.getJob(job.id)?.status).toBe('paused');

      daemon.resumeJob(job.id);
      expect(daemon.getJob(job.id)?.status).toBe('pending');
    });
  });

  describe('Scheduled Jobs', () => {
    beforeEach(async () => {
      await daemon.start();
      jest.useFakeTimers();
    });

    afterEach(async () => {
      jest.useRealTimers();
      await daemon.stop();
    });

    it('should calculate next run time for cron jobs', () => {
      const job = daemon.addJob({
        name: 'cron-job',
        command: 'echo cron',
        type: 'shell',
        schedule: { cron: '0 0 * * *' } // Daily at midnight
      });

      expect(job.nextRun).toBeDefined();
      expect(new Date(job.nextRun!).getHours()).toBe(0);
      expect(new Date(job.nextRun!).getMinutes()).toBe(0);
    });

    it('should run scheduled jobs at the right time', async () => {
      const mockExec = exec as unknown as jest.Mock;
      mockExec.mockImplementation((cmd, callback) => {
        callback(null, 'scheduled output', '');
      });

      const now = new Date();
      const nextMinute = new Date(now.getTime() + 60000);

      const job = daemon.addJob({
        name: 'scheduled-job',
        command: 'echo scheduled',
        type: 'shell',
        schedule: {
          cron: `${nextMinute.getMinutes()} ${nextMinute.getHours()} * * *`
        }
      });

      // Fast forward time
      jest.advanceTimersByTime(65000); // 65 seconds

      // Give the daemon check cycle time to run
      await Promise.resolve();

      const updatedJob = daemon.getJob(job.id);
      expect(updatedJob?.lastRun).toBeDefined();
    });
  });

  describe('Job Serialization', () => {
    it('should sanitize jobs for serialization', () => {
      const job = daemon.addJob({
        name: 'test-job',
        command: 'echo test',
        type: 'shell'
      });

      // Add circular reference
      (job as any).self = job;

      const sanitized = daemon['sanitizeJobForSerialization'](job);

      expect(sanitized.self).toBeUndefined();
      expect(sanitized.name).toBe('test-job');
      expect(sanitized.command).toBe('echo test');
    });

    it('should handle undefined and null values', () => {
      const jobWithNulls = {
        id: 'test',
        name: 'test',
        command: null,
        status: undefined,
        data: { nested: null }
      };

      const sanitized = daemon['sanitizeJobForSerialization'](jobWithNulls);

      expect(sanitized.command).toBeNull();
      expect(sanitized.status).toBeUndefined();
      expect(sanitized.data.nested).toBeNull();
    });
  });

  describe('Status', () => {
    it('should return daemon status', async () => {
      await daemon.start();

      const status = daemon.getStatus();

      expect(status).toMatchObject({
        isRunning: true,
        pid: expect.any(Number),
        uptime: expect.any(Number),
        memoryUsage: expect.objectContaining({
          rss: expect.any(Number),
          heapTotal: expect.any(Number),
          heapUsed: expect.any(Number)
        })
      });
    });

    it('should calculate uptime correctly', async () => {
      await daemon.start();

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 100));

      const status = daemon.getStatus();
      expect(status.uptime).toBeGreaterThanOrEqual(100);
    });
  });

  describe('Error Handling', () => {
    it('should handle job execution timeout', async () => {
      const job = daemon.addJob({
        name: 'timeout-job',
        command: 'sleep 60',
        type: 'shell',
        timeout: 100 // 100ms timeout
      });

      const mockExec = exec as unknown as jest.Mock;
      mockExec.mockImplementation(() => {
        const proc = {
          kill: jest.fn()
        };
        setTimeout(() => {}, 200); // Simulate long running
        return proc;
      });

      await daemon.start();
      await daemon.runJob(job.id);

      const updatedJob = daemon.getJob(job.id);
      expect(updatedJob?.status).toBe('failed');
    });

    it('should recover from corrupted job file', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue('invalid json');

      // Should not throw
      expect(() => new LSHJobDaemon(testConfig)).not.toThrow();
    });

    it('should handle missing command gracefully', async () => {
      const job = daemon.addJob({
        name: 'no-command',
        command: '',
        type: 'shell'
      });

      await daemon.start();
      await daemon.runJob(job.id);

      const updatedJob = daemon.getJob(job.id);
      expect(updatedJob?.status).toBe('failed');
    });
  });
});