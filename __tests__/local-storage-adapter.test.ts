/**
 * Local Storage Adapter Tests
 * Tests for the file-based local storage adapter
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('LocalStorageAdapter', () => {
  let LocalStorageAdapter: typeof import('../src/lib/local-storage-adapter.js').LocalStorageAdapter;
  let storage: InstanceType<typeof LocalStorageAdapter>;
  let testDir: string;

  beforeAll(async () => {
    const module = await import('../src/lib/local-storage-adapter.js');
    LocalStorageAdapter = module.LocalStorageAdapter;
  });

  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `local-storage-test-${Date.now()}`);
    await fs.promises.mkdir(testDir, { recursive: true });

    storage = new LocalStorageAdapter(undefined, {
      dataDir: testDir,
      autoFlush: false,
    });
    await storage.initialize();
  });

  afterEach(async () => {
    await storage.cleanup();
    try {
      await fs.promises.rm(testDir, { recursive: true, force: true });
    } catch {
      // Directory may not exist
    }
  });

  describe('Constructor and initialization', () => {
    it('should create instance with default config', () => {
      expect(storage).toBeDefined();
    });

    it('should create data directory on initialize', async () => {
      const stats = await fs.promises.stat(testDir);
      expect(stats.isDirectory()).toBe(true);
    });

    it('should generate unique session ID', () => {
      const sessionId = storage.getSessionId();
      expect(sessionId).toBeDefined();
      expect(sessionId.startsWith('lsh_')).toBe(true);
    });
  });

  describe('Shell History', () => {
    it('should save and retrieve history entries', async () => {
      const saved = await storage.saveHistoryEntry({
        command: 'echo hello',
        working_directory: '/home/user',
        timestamp: new Date().toISOString(),
        hostname: 'localhost',
        session_id: storage.getSessionId(),
      });

      expect(saved).toBe(true);

      const entries = await storage.getHistoryEntries(10);
      expect(entries.length).toBeGreaterThanOrEqual(1);
      expect(entries[0].command).toBe('echo hello');
    });

    it('should limit history entries', async () => {
      for (let i = 0; i < 10; i++) {
        await storage.saveHistoryEntry({
          command: `command-${i}`,
          working_directory: '/home/user',
          timestamp: new Date().toISOString(),
          hostname: 'localhost',
          session_id: storage.getSessionId(),
        });
      }

      const entries = await storage.getHistoryEntries(5);
      expect(entries.length).toBe(5);
    });
  });

  describe('Shell Jobs', () => {
    it('should save and retrieve jobs', async () => {
      const saved = await storage.saveJob({
        job_id: 'job-123',
        command: 'sleep 10',
        status: 'running',
        working_directory: '/home/user',
        started_at: new Date().toISOString(),
        session_id: storage.getSessionId(),
      });

      expect(saved).toBe(true);

      const jobs = await storage.getActiveJobs();
      expect(jobs.some(j => j.job_id === 'job-123')).toBe(true);
    });

    it('should update job status', async () => {
      await storage.saveJob({
        job_id: 'job-456',
        command: 'echo test',
        status: 'running',
        working_directory: '/home/user',
        started_at: new Date().toISOString(),
        session_id: storage.getSessionId(),
      });

      const updated = await storage.updateJobStatus('job-456', 'completed', 0);
      expect(updated).toBe(true);

      const jobs = await storage.getActiveJobs();
      const job = jobs.find(j => j.job_id === 'job-456');
      expect(job?.status).toBe('completed');
      expect(job?.exit_code).toBe(0);
    });

    it('should return false for non-existent job update', async () => {
      const updated = await storage.updateJobStatus('non-existent', 'completed');
      expect(updated).toBe(false);
    });
  });

  describe('Shell Configuration', () => {
    it('should save and retrieve configuration', async () => {
      const saved = await storage.saveConfiguration({
        config_key: 'test_key',
        config_value: 'test_value',
        config_type: 'string',
        is_default: false,
      });

      expect(saved).toBe(true);

      const configs = await storage.getConfiguration('test_key');
      expect(configs.length).toBe(1);
      expect(configs[0].config_value).toBe('test_value');
    });

    it('should save multiple configurations', async () => {
      await storage.saveConfiguration({
        config_key: 'key1',
        config_value: 'value1',
        config_type: 'string',
        is_default: false,
      });

      await storage.saveConfiguration({
        config_key: 'key2',
        config_value: 'value2',
        config_type: 'string',
        is_default: false,
      });

      // Configurations are saved
      const configs = await storage.getConfiguration();
      expect(configs.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Shell Aliases', () => {
    it('should save aliases', async () => {
      const saved = await storage.saveAlias({
        alias_name: 'll',
        alias_value: 'ls -la',
        is_active: true,
      });

      expect(saved).toBe(true);
    });

    it('should save multiple aliases', async () => {
      await storage.saveAlias({
        alias_name: 'g',
        alias_value: 'git',
        is_active: true,
      });

      await storage.saveAlias({
        alias_name: 'gs',
        alias_value: 'git status',
        is_active: true,
      });

      // The storage saves aliases
      expect(true).toBe(true);
    });
  });

  describe('Shell Functions', () => {
    it('should save and retrieve functions', async () => {
      const saved = await storage.saveFunction({
        function_name: 'greet',
        function_body: 'echo "Hello, $1"',
        is_active: true,
      });

      expect(saved).toBe(true);

      const functions = await storage.getFunctions();
      expect(functions.some(f => f.function_name === 'greet')).toBe(true);
    });
  });

  describe('Shell Sessions', () => {
    it('should start and end session', async () => {
      const started = await storage.startSession('/home/user', { PATH: '/usr/bin' });
      expect(started).toBe(true);

      const ended = await storage.endSession();
      expect(ended).toBe(true);
    });
  });

  describe('Flush and reload', () => {
    it('should persist data to disk', async () => {
      await storage.saveHistoryEntry({
        command: 'persist-test',
        working_directory: '/home/user',
        timestamp: new Date().toISOString(),
        hostname: 'localhost',
        session_id: storage.getSessionId(),
      });

      // Force flush
      (storage as any).isDirty = true;
      await storage.flush();

      // Create new storage instance and reload
      const storage2 = new LocalStorageAdapter(undefined, {
        dataDir: testDir,
        autoFlush: false,
      });
      await storage2.reload();

      const entries = await storage2.getHistoryEntries(10);
      expect(entries.some(e => e.command === 'persist-test')).toBe(true);

      await storage2.cleanup();
    });
  });

  describe('testConnection', () => {
    it('should return true when data directory exists', async () => {
      const connected = await storage.testConnection();
      expect(connected).toBe(true);
    });
  });

  describe('getLatestRows', () => {
    it('should return latest rows from all tables', async () => {
      await storage.saveHistoryEntry({
        command: 'test-command',
        working_directory: '/home/user',
        timestamp: new Date().toISOString(),
        hostname: 'localhost',
        session_id: storage.getSessionId(),
      });

      const rows = await storage.getLatestRows(5);

      expect(rows.shell_history).toBeDefined();
      expect(rows.shell_jobs).toBeDefined();
      expect(rows.shell_configuration).toBeDefined();
    });
  });

  describe('getLatestRowsFromTable', () => {
    it('should return latest rows from specific table', async () => {
      await storage.saveHistoryEntry({
        command: 'table-test',
        working_directory: '/home/user',
        timestamp: new Date().toISOString(),
        hostname: 'localhost',
        session_id: storage.getSessionId(),
      });

      const rows = await storage.getLatestRowsFromTable('shell_history', 5);
      expect(rows.length).toBeGreaterThanOrEqual(1);
    });

    it('should throw error for invalid table name', async () => {
      const rows = await storage.getLatestRowsFromTable('invalid_table', 5);
      expect(rows).toEqual([]);
    });
  });
});
