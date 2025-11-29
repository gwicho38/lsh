/**
 * Job Registry Tests
 * Tests for the JobRegistry class
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('JobRegistry', () => {
  let JobRegistry: typeof import('../src/daemon/job-registry.js').JobRegistry;

  let testDir: string;
  let testRegistryFile: string;
  let testLogDir: string;

  beforeAll(async () => {
    const module = await import('../src/daemon/job-registry.js');
    JobRegistry = module.JobRegistry;
  });

  beforeEach(async () => {
    // Create temporary directories
    testDir = path.join(os.tmpdir(), `lsh-job-registry-test-${Date.now()}`);
    testRegistryFile = path.join(testDir, 'registry.json');
    testLogDir = path.join(testDir, 'logs');

    await fs.promises.mkdir(testDir, { recursive: true });
    await fs.promises.mkdir(testLogDir, { recursive: true });
  });

  afterEach(async () => {
    // Clean up test directories
    try {
      await fs.promises.rm(testDir, { recursive: true, force: true });
    } catch {
      // Directory may not exist
    }
  });

  describe('Constructor', () => {
    it('should create instance with default config', () => {
      const registry = new JobRegistry({
        registryFile: testRegistryFile,
        outputLogDir: testLogDir,
      });
      expect(registry).toBeDefined();
    });

    it('should use custom configuration', () => {
      const registry = new JobRegistry({
        registryFile: testRegistryFile,
        outputLogDir: testLogDir,
        maxRecordsPerJob: 500,
        maxTotalRecords: 10000,
        metricsRetentionDays: 30,
      });
      expect(registry).toBeDefined();
    });
  });

  describe('recordJobStart', () => {
    it('should record job execution start', () => {
      const registry = new JobRegistry({
        registryFile: testRegistryFile,
        outputLogDir: testLogDir,
      });

      const mockJob = {
        id: 'job-123',
        name: 'test-job',
        command: 'echo hello',
        status: 'created' as const,
        createdAt: new Date(),
        type: 'shell' as const,
      };

      const record = registry.recordJobStart(mockJob);

      expect(record.jobId).toBe('job-123');
      expect(record.jobName).toBe('test-job');
      expect(record.command).toBe('echo hello');
      expect(record.status).toBe('running');
      expect(record.startTime).toBeInstanceOf(Date);
    });

    it('should generate execution ID if not provided', () => {
      const registry = new JobRegistry({
        registryFile: testRegistryFile,
        outputLogDir: testLogDir,
      });

      const mockJob = {
        id: 'job-456',
        name: 'another-job',
        command: 'ls -la',
        status: 'created' as const,
        createdAt: new Date(),
        type: 'shell' as const,
      };

      const record = registry.recordJobStart(mockJob);

      expect(record.executionId).toBeDefined();
      expect(record.executionId.startsWith('exec_')).toBe(true);
    });

    it('should use provided execution ID', () => {
      const registry = new JobRegistry({
        registryFile: testRegistryFile,
        outputLogDir: testLogDir,
      });

      const mockJob = {
        id: 'job-789',
        name: 'custom-exec-job',
        command: 'pwd',
        status: 'created' as const,
        createdAt: new Date(),
        type: 'shell' as const,
      };

      const record = registry.recordJobStart(mockJob, 'custom-exec-id');

      expect(record.executionId).toBe('custom-exec-id');
    });
  });

  describe('recordJobOutput', () => {
    it('should record stdout output', () => {
      const registry = new JobRegistry({
        registryFile: testRegistryFile,
        outputLogDir: testLogDir,
      });

      const mockJob = {
        id: 'output-job',
        name: 'output-test',
        command: 'echo test',
        status: 'created' as const,
        createdAt: new Date(),
        type: 'shell' as const,
      };

      const record = registry.recordJobStart(mockJob);
      registry.recordJobOutput(record.executionId, 'stdout', 'Hello World\n');

      // The record should be updated with output
      expect(record.stdout).toContain('Hello World');
    });

    it('should record stderr output', () => {
      const registry = new JobRegistry({
        registryFile: testRegistryFile,
        outputLogDir: testLogDir,
      });

      const mockJob = {
        id: 'stderr-job',
        name: 'stderr-test',
        command: 'echo error >&2',
        status: 'created' as const,
        createdAt: new Date(),
        type: 'shell' as const,
      };

      const record = registry.recordJobStart(mockJob);
      registry.recordJobOutput(record.executionId, 'stderr', 'Error message\n');

      expect(record.stderr).toContain('Error message');
    });
  });

  describe('recordJobCompletion', () => {
    it('should record successful completion', () => {
      const registry = new JobRegistry({
        registryFile: testRegistryFile,
        outputLogDir: testLogDir,
      });

      const mockJob = {
        id: 'complete-job',
        name: 'completion-test',
        command: 'exit 0',
        status: 'created' as const,
        createdAt: new Date(),
        type: 'shell' as const,
      };

      const record = registry.recordJobStart(mockJob);
      registry.recordJobCompletion(record.executionId, 'completed', 0);

      expect(record.status).toBe('completed');
      expect(record.exitCode).toBe(0);
      expect(record.endTime).toBeInstanceOf(Date);
      expect(record.duration).toBeGreaterThanOrEqual(0);
    });

    it('should record failed completion with error', () => {
      const registry = new JobRegistry({
        registryFile: testRegistryFile,
        outputLogDir: testLogDir,
      });

      const mockJob = {
        id: 'fail-job',
        name: 'failure-test',
        command: 'exit 1',
        status: 'created' as const,
        createdAt: new Date(),
        type: 'shell' as const,
      };

      const record = registry.recordJobStart(mockJob);
      const error = new Error('Command failed');
      registry.recordJobCompletion(record.executionId, 'failed', 1, undefined, error);

      expect(record.status).toBe('failed');
      expect(record.exitCode).toBe(1);
      expect(record.errorMessage).toBe('Command failed');
    });

    it('should record killed job with signal', () => {
      const registry = new JobRegistry({
        registryFile: testRegistryFile,
        outputLogDir: testLogDir,
      });

      const mockJob = {
        id: 'killed-job',
        name: 'killed-test',
        command: 'sleep 1000',
        status: 'created' as const,
        createdAt: new Date(),
        type: 'shell' as const,
      };

      const record = registry.recordJobStart(mockJob);
      registry.recordJobCompletion(record.executionId, 'killed', undefined, 'SIGTERM');

      expect(record.status).toBe('killed');
      expect(record.signal).toBe('SIGTERM');
    });
  });

  describe('getJobHistory', () => {
    it('should return empty array for unknown job', async () => {
      const registry = new JobRegistry({
        registryFile: testRegistryFile,
        outputLogDir: testLogDir,
      });

      const history = await registry.getJobHistory('unknown-job');
      expect(history).toEqual([]);
    });

    it('should return execution history for job', async () => {
      const registry = new JobRegistry({
        registryFile: testRegistryFile,
        outputLogDir: testLogDir,
      });

      const mockJob = {
        id: 'history-job',
        name: 'history-test',
        command: 'echo test',
        status: 'created' as const,
        createdAt: new Date(),
        type: 'shell' as const,
      };

      registry.recordJobStart(mockJob);
      registry.recordJobStart(mockJob);
      registry.recordJobStart(mockJob);

      const history = await registry.getJobHistory('history-job');
      expect(history).toHaveLength(3);
    });

    it('should respect limit parameter', async () => {
      const registry = new JobRegistry({
        registryFile: testRegistryFile,
        outputLogDir: testLogDir,
      });

      const mockJob = {
        id: 'limit-job',
        name: 'limit-test',
        command: 'echo test',
        status: 'created' as const,
        createdAt: new Date(),
        type: 'shell' as const,
      };

      for (let i = 0; i < 10; i++) {
        registry.recordJobStart(mockJob);
      }

      const history = await registry.getJobHistory('limit-job', 5);
      expect(history).toHaveLength(5);
    });
  });

  describe('searchExecutions', () => {
    it('should search by job ID', () => {
      const registry = new JobRegistry({
        registryFile: testRegistryFile,
        outputLogDir: testLogDir,
      });

      const job1 = { id: 'search-job-1', name: 'search-1', command: 'echo 1', status: 'created' as const, createdAt: new Date(), type: 'shell' as const };
      const job2 = { id: 'search-job-2', name: 'search-2', command: 'echo 2', status: 'created' as const, createdAt: new Date(), type: 'shell' as const };

      registry.recordJobStart(job1);
      registry.recordJobStart(job2);

      const results = registry.searchExecutions({ jobId: 'search-job-1' });
      expect(results).toHaveLength(1);
      expect(results[0].jobId).toBe('search-job-1');
    });

    it('should search by status', () => {
      const registry = new JobRegistry({
        registryFile: testRegistryFile,
        outputLogDir: testLogDir,
      });

      const mockJob = { id: 'status-job', name: 'status-test', command: 'echo test', status: 'created' as const, createdAt: new Date(), type: 'shell' as const };

      const record1 = registry.recordJobStart(mockJob);
      registry.recordJobCompletion(record1.executionId, 'completed', 0);

      const record2 = registry.recordJobStart(mockJob);
      registry.recordJobCompletion(record2.executionId, 'failed', 1);

      const completedResults = registry.searchExecutions({ status: ['completed'] });
      expect(completedResults).toHaveLength(1);
      expect(completedResults[0].status).toBe('completed');
    });

    it('should search by user', () => {
      const registry = new JobRegistry({
        registryFile: testRegistryFile,
        outputLogDir: testLogDir,
      });

      const job = { id: 'user-job', name: 'user-test', command: 'echo test', status: 'created' as const, createdAt: new Date(), type: 'shell' as const, user: 'testuser' };
      registry.recordJobStart(job);

      const results = registry.searchExecutions({ user: 'testuser' });
      expect(results.length).toBeGreaterThanOrEqual(1);
    });

    it('should respect limit in search', () => {
      const registry = new JobRegistry({
        registryFile: testRegistryFile,
        outputLogDir: testLogDir,
      });

      const mockJob = { id: 'limit-search-job', name: 'limit-search', command: 'echo test', status: 'created' as const, createdAt: new Date(), type: 'shell' as const };

      for (let i = 0; i < 10; i++) {
        registry.recordJobStart(mockJob);
      }

      const results = registry.searchExecutions({ limit: 3 });
      expect(results).toHaveLength(3);
    });
  });

  describe('generateReport', () => {
    it('should generate text report', async () => {
      const registry = new JobRegistry({
        registryFile: testRegistryFile,
        outputLogDir: testLogDir,
      });

      const mockJob = { id: 'report-job', name: 'report-test', command: 'echo test', status: 'created' as const, createdAt: new Date(), type: 'shell' as const };

      const record = registry.recordJobStart(mockJob);
      registry.recordJobCompletion(record.executionId, 'completed', 0);

      const report = await registry.generateReport({ format: 'text' });

      expect(report).toContain('Job Execution Report');
      expect(report).toContain('Total Executions');
    });

    it('should generate JSON report', async () => {
      const registry = new JobRegistry({
        registryFile: testRegistryFile,
        outputLogDir: testLogDir,
      });

      const mockJob = { id: 'json-report-job', name: 'json-report', command: 'echo test', status: 'created' as const, createdAt: new Date(), type: 'shell' as const };

      registry.recordJobStart(mockJob);

      const report = await registry.generateReport({ format: 'json' });
      const parsed = JSON.parse(report);

      expect(Array.isArray(parsed)).toBe(true);
    });

    it('should generate CSV report', async () => {
      const registry = new JobRegistry({
        registryFile: testRegistryFile,
        outputLogDir: testLogDir,
      });

      const mockJob = { id: 'csv-report-job', name: 'csv-report', command: 'echo test', status: 'created' as const, createdAt: new Date(), type: 'shell' as const };

      registry.recordJobStart(mockJob);

      const report = await registry.generateReport({ format: 'csv' });

      expect(report).toContain('executionId');
      expect(report).toContain('jobId');
      expect(report).toContain('csv-report-job');
    });
  });

  describe('getAllStatistics', () => {
    it('should return all job statistics', () => {
      const registry = new JobRegistry({
        registryFile: testRegistryFile,
        outputLogDir: testLogDir,
      });

      const job1 = { id: 'stats-job-1', name: 'stats-1', command: 'echo 1', status: 'created' as const, createdAt: new Date(), type: 'shell' as const };
      const job2 = { id: 'stats-job-2', name: 'stats-2', command: 'echo 2', status: 'created' as const, createdAt: new Date(), type: 'shell' as const };

      const record1 = registry.recordJobStart(job1);
      registry.recordJobCompletion(record1.executionId, 'completed', 0);

      const record2 = registry.recordJobStart(job2);
      registry.recordJobCompletion(record2.executionId, 'failed', 1);

      const allStats = registry.getAllStatistics();
      expect(allStats).toHaveLength(2);
    });
  });

  describe('export', () => {
    it('should export registry to JSON file', () => {
      const registry = new JobRegistry({
        registryFile: testRegistryFile,
        outputLogDir: testLogDir,
      });

      const mockJob = { id: 'export-job', name: 'export-test', command: 'echo test', status: 'created' as const, createdAt: new Date(), type: 'shell' as const };
      registry.recordJobStart(mockJob);

      const exportFile = path.join(testDir, 'export.json');
      registry.export(exportFile, 'json');

      const content = fs.readFileSync(exportFile, 'utf-8');
      const parsed = JSON.parse(content);

      expect(parsed.records).toBeDefined();
      expect(parsed.exportedAt).toBeDefined();
    });

    it('should export registry to CSV file', () => {
      const registry = new JobRegistry({
        registryFile: testRegistryFile,
        outputLogDir: testLogDir,
      });

      const mockJob = { id: 'csv-export-job', name: 'csv-export', command: 'echo test', status: 'created' as const, createdAt: new Date(), type: 'shell' as const };
      registry.recordJobStart(mockJob);

      const exportFile = path.join(testDir, 'export.csv');
      registry.export(exportFile, 'csv');

      const content = fs.readFileSync(exportFile, 'utf-8');
      expect(content).toContain('executionId');
      expect(content).toContain('csv-export-job');
    });
  });
});
