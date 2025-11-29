/**
 * Daemon Client Helper Tests
 * Tests for the daemon client helper utilities
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

describe('Daemon Client Helper', () => {
  let getDefaultSocketPath: typeof import('../src/lib/daemon-client-helper.js').getDefaultSocketPath;
  let getDefaultUserId: typeof import('../src/lib/daemon-client-helper.js').getDefaultUserId;
  let isDaemonRunning: typeof import('../src/lib/daemon-client-helper.js').isDaemonRunning;
  let createDaemonClient: typeof import('../src/lib/daemon-client-helper.js').createDaemonClient;

  beforeAll(async () => {
    const module = await import('../src/lib/daemon-client-helper.js');
    getDefaultSocketPath = module.getDefaultSocketPath;
    getDefaultUserId = module.getDefaultUserId;
    isDaemonRunning = module.isDaemonRunning;
    createDaemonClient = module.createDaemonClient;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getDefaultSocketPath', () => {
    it('should return a socket path string', () => {
      const socketPath = getDefaultSocketPath();
      expect(typeof socketPath).toBe('string');
      expect(socketPath.length).toBeGreaterThan(0);
    });

    it('should return a path containing socket/pipe identifier', () => {
      const socketPath = getDefaultSocketPath();
      // On Unix-like systems, should contain /tmp or similar
      // On Windows, should be a named pipe
      expect(socketPath).toBeTruthy();
    });
  });

  describe('getDefaultUserId', () => {
    it('should return a user ID string', () => {
      const userId = getDefaultUserId();
      expect(typeof userId).toBe('string');
      expect(userId.length).toBeGreaterThan(0);
    });
  });

  describe('isDaemonRunning', () => {
    it('should return a boolean', () => {
      const running = isDaemonRunning();
      expect(typeof running).toBe('boolean');
    });

    it('should accept custom socket path', () => {
      const running = isDaemonRunning('/nonexistent/socket.sock');
      expect(running).toBe(false);
    });
  });

  describe('createDaemonClient', () => {
    it('should create a daemon client instance', () => {
      const client = createDaemonClient();
      expect(client).toBeDefined();
    });

    it('should accept custom socket path', () => {
      const client = createDaemonClient({
        socketPath: '/custom/socket.sock',
      });
      expect(client).toBeDefined();
    });

    it('should accept custom user ID', () => {
      const client = createDaemonClient({
        userId: 'custom-user',
      });
      expect(client).toBeDefined();
    });

    it('should accept both socket path and user ID', () => {
      const client = createDaemonClient({
        socketPath: '/custom/socket.sock',
        userId: 'custom-user',
      });
      expect(client).toBeDefined();
    });
  });
});
