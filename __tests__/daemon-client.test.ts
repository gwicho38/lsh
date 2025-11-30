/**
 * Daemon Client Tests
 * Tests for the DaemonClient class - unit tests without network connections
 */

import { describe, it, expect, beforeEach, beforeAll, jest } from '@jest/globals';
import { EventEmitter } from 'events';

describe('DaemonClient', () => {
  let DaemonClient: typeof import('../src/lib/daemon-client.js').DaemonClient;

  beforeAll(async () => {
    const module = await import('../src/lib/daemon-client.js');
    DaemonClient = module.DaemonClient;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should create instance with default socket path', () => {
      const client = new DaemonClient();
      expect(client).toBeDefined();
    });

    it('should create instance with custom socket path', () => {
      const client = new DaemonClient('/custom/socket.sock');
      expect(client).toBeDefined();
    });

    it('should create instance with user ID', () => {
      const client = new DaemonClient(undefined, 'test-user');
      expect(client).toBeDefined();
    });

    it('should create instance with both socket path and user ID', () => {
      const client = new DaemonClient('/custom/socket.sock', 'test-user');
      expect(client).toBeDefined();
    });
  });

  describe('Connection Status', () => {
    it('should return false for isConnected when not connected', () => {
      const client = new DaemonClient();
      expect(client.isConnected()).toBe(false);
    });

    it('should return false for isDaemonRunning when socket does not exist', () => {
      const client = new DaemonClient('/nonexistent/path/socket.sock');
      expect(client.isDaemonRunning()).toBe(false);
    });
  });

  describe('Connect', () => {
    it('should reject if socket does not exist', async () => {
      const client = new DaemonClient('/nonexistent/socket.sock');
      await expect(client.connect()).rejects.toThrow('Daemon socket not found');
    });
  });

  describe('Disconnect', () => {
    it('should disconnect without error when not connected', () => {
      const client = new DaemonClient();
      expect(() => client.disconnect()).not.toThrow();
      expect(client.isConnected()).toBe(false);
    });
  });

  describe('calculateJobStatistics (private method)', () => {
    it('should calculate statistics correctly', () => {
      const client = new DaemonClient(undefined, 'test-user');
      const privateClient = client as any;

      const jobs = [
        { status: 'completed', started_at: new Date().toISOString() },
        { status: 'completed', started_at: new Date().toISOString() },
        { status: 'failed', started_at: new Date().toISOString() },
        { status: 'running', started_at: new Date().toISOString() },
      ];

      const stats = privateClient.calculateJobStatistics(jobs);

      expect(stats.totalJobs).toBe(4);
      expect(stats.byStatus.completed).toBe(2);
      expect(stats.byStatus.failed).toBe(1);
      expect(stats.byStatus.running).toBe(1);
      expect(stats.successRate).toBe(50);
    });

    it('should handle empty job array', () => {
      const client = new DaemonClient(undefined, 'test-user');
      const privateClient = client as any;

      const stats = privateClient.calculateJobStatistics([]);

      expect(stats.totalJobs).toBe(0);
      expect(stats.byStatus).toEqual({});
      expect(stats.successRate).toBe(0);
      expect(stats.lastExecution).toBeNull();
    });

    it('should calculate 100% success rate when all completed', () => {
      const client = new DaemonClient(undefined, 'test-user');
      const privateClient = client as any;

      const jobs = [
        { status: 'completed', started_at: new Date().toISOString() },
        { status: 'completed', started_at: new Date().toISOString() },
      ];

      const stats = privateClient.calculateJobStatistics(jobs);

      expect(stats.totalJobs).toBe(2);
      expect(stats.successRate).toBe(100);
    });

    it('should return last execution timestamp', () => {
      const timestamp = new Date().toISOString();
      const client = new DaemonClient(undefined, 'test-user');
      const privateClient = client as any;

      const jobs = [{ status: 'completed', started_at: timestamp }];

      const stats = privateClient.calculateJobStatistics(jobs);

      expect(stats.lastExecution).toBe(timestamp);
    });
  });

  describe('Event Emitter', () => {
    it('should extend EventEmitter', () => {
      const client = new DaemonClient();
      expect(client).toBeInstanceOf(EventEmitter);
    });

    it('should emit events', () => {
      const client = new DaemonClient();
      const callback = jest.fn();
      client.on('test', callback);
      client.emit('test');
      expect(callback).toHaveBeenCalled();
    });

    it('should support multiple listeners', () => {
      const client = new DaemonClient();
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      client.on('test', callback1);
      client.on('test', callback2);
      client.emit('test', 'arg1');

      expect(callback1).toHaveBeenCalledWith('arg1');
      expect(callback2).toHaveBeenCalledWith('arg1');
    });
  });

  describe('Interface Exports', () => {
    it('should export DaemonMessage interface implicitly', async () => {
      const module = await import('../src/lib/daemon-client.js');
      // Interfaces are compile-time only, but we can verify the class is exported
      expect(module.DaemonClient).toBeDefined();
    });
  });

  describe('getJobHistory', () => {
    it('should throw error when database persistence not configured', async () => {
      const client = new DaemonClient('/nonexistent.sock'); // No userId = no databasePersistence
      await expect(client.getJobHistory()).rejects.toThrow('Database persistence not configured');
    });
  });

  describe('getJobStatistics', () => {
    it('should throw error when database persistence not configured', async () => {
      const client = new DaemonClient('/nonexistent.sock'); // No userId = no databasePersistence
      await expect(client.getJobStatistics()).rejects.toThrow('Database persistence not configured');
    });
  });

  describe('syncJobToDatabase', () => {
    it('should handle missing database persistence gracefully', async () => {
      const client = new DaemonClient('/nonexistent.sock'); // No userId = no databasePersistence

      // Should not throw when no databasePersistence configured
      await expect(client.syncJobToDatabase({ id: 'test', name: 'test', command: 'test', schedule: {} }, 'running')).resolves.toBeUndefined();
    });
  });
});
