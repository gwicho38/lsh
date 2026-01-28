/**
 * Tests for daemon-client.ts error handling
 * Verifies LSHError is used with correct error codes
 *
 * Note: DaemonClient integration tests require daemon running.
 * These tests verify LSHError behavior directly.
 */

import { describe, it, expect } from '@jest/globals';
import { LSHError, ErrorCodes } from '../lib/lsh-error.js';

describe('LSHError for Daemon Client', () => {
  describe('Daemon Not Running Errors', () => {
    it('should use DAEMON_NOT_RUNNING code with 500 status for missing socket', () => {
      const error = new LSHError(
        ErrorCodes.DAEMON_NOT_RUNNING,
        'Daemon socket not found at /tmp/lsh.sock. Is the daemon running?',
        { socketPath: '/tmp/lsh.sock' }
      );

      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('DAEMON_NOT_RUNNING');
      expect(error.context?.socketPath).toBe('/tmp/lsh.sock');
    });

    it('should use DAEMON_NOT_RUNNING code for not connected state', () => {
      const error = new LSHError(
        ErrorCodes.DAEMON_NOT_RUNNING,
        'Not connected to daemon',
        { connected: false, hasSocket: false }
      );

      expect(error.code).toBe('DAEMON_NOT_RUNNING');
      expect(error.context?.connected).toBe(false);
      expect(error.context?.hasSocket).toBe(false);
    });
  });

  describe('Daemon Connection Errors', () => {
    it('should use DAEMON_CONNECTION_FAILED code with 500 status for permission denied', () => {
      const error = new LSHError(
        ErrorCodes.DAEMON_CONNECTION_FAILED,
        'Permission denied to access socket at /tmp/lsh.sock. Socket is owned by another user.',
        { socketPath: '/tmp/lsh.sock', owner: 'another user' }
      );

      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('DAEMON_CONNECTION_FAILED');
      expect(error.context?.owner).toBe('another user');
    });
  });

  describe('Daemon IPC Errors', () => {
    it('should use DAEMON_IPC_ERROR code with 500 status for timeout', () => {
      const error = new LSHError(
        ErrorCodes.DAEMON_IPC_ERROR,
        'Request timeout after 10 seconds for command: listJobs',
        { command: 'listJobs', timeoutMs: 10000 }
      );

      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('DAEMON_IPC_ERROR');
      expect(error.context?.command).toBe('listJobs');
      expect(error.context?.timeoutMs).toBe(10000);
    });

    it('should use DAEMON_IPC_ERROR code for response errors', () => {
      const error = new LSHError(
        ErrorCodes.DAEMON_IPC_ERROR,
        'Job not found',
        { responseId: '123' }
      );

      expect(error.code).toBe('DAEMON_IPC_ERROR');
      expect(error.context?.responseId).toBe('123');
    });

    it('should use DAEMON_IPC_ERROR for unknown errors', () => {
      const error = new LSHError(
        ErrorCodes.DAEMON_IPC_ERROR,
        'Unknown error',
        { responseId: '456' }
      );

      expect(error.code).toBe('DAEMON_IPC_ERROR');
      expect(error.message).toBe('Unknown error');
    });
  });

  describe('Configuration Errors', () => {
    it('should use CONFIG_MISSING_ENV_VAR code for missing database persistence', () => {
      const error = new LSHError(
        ErrorCodes.CONFIG_MISSING_ENV_VAR,
        'Database persistence not configured',
        { required: 'userId', method: 'getJobHistory' }
      );

      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('CONFIG_MISSING_ENV_VAR');
      expect(error.context?.required).toBe('userId');
      expect(error.context?.method).toBe('getJobHistory');
    });

    it('should use CONFIG_MISSING_ENV_VAR for getJobStatistics without persistence', () => {
      const error = new LSHError(
        ErrorCodes.CONFIG_MISSING_ENV_VAR,
        'Database persistence not configured',
        { required: 'userId', method: 'getJobStatistics' }
      );

      expect(error.code).toBe('CONFIG_MISSING_ENV_VAR');
      expect(error.context?.method).toBe('getJobStatistics');
    });
  });

  describe('Error Serialization', () => {
    it('should serialize daemon errors to JSON correctly', () => {
      const error = new LSHError(
        ErrorCodes.DAEMON_NOT_RUNNING,
        'Daemon socket not found',
        { socketPath: '/tmp/lsh.sock' }
      );

      const json = error.toJSON();

      expect(json.code).toBe('DAEMON_NOT_RUNNING');
      expect(json.message).toBe('Daemon socket not found');
      expect(json.statusCode).toBe(500);
      expect(json.context?.socketPath).toBe('/tmp/lsh.sock');
    });

    it('should serialize IPC errors to JSON correctly', () => {
      const error = new LSHError(
        ErrorCodes.DAEMON_IPC_ERROR,
        'Request timeout',
        { command: 'getStatus', timeoutMs: 10000 }
      );

      const json = error.toJSON();

      expect(json.code).toBe('DAEMON_IPC_ERROR');
      expect(json.context?.command).toBe('getStatus');
    });
  });

  describe('Error Instance Checks', () => {
    it('should be instanceof Error', () => {
      const error = new LSHError(
        ErrorCodes.DAEMON_NOT_RUNNING,
        'Daemon not running',
        {}
      );

      expect(error instanceof Error).toBe(true);
      expect(error instanceof LSHError).toBe(true);
    });

    it('should have name property set to LSHError', () => {
      const error = new LSHError(
        ErrorCodes.DAEMON_CONNECTION_FAILED,
        'Connection failed',
        {}
      );

      expect(error.name).toBe('LSHError');
    });
  });

  describe('Daemon Error Code Coverage', () => {
    it('should cover all daemon-related error codes', () => {
      // Verify error codes exist and have correct types
      expect(ErrorCodes.DAEMON_NOT_RUNNING).toBe('DAEMON_NOT_RUNNING');
      expect(ErrorCodes.DAEMON_ALREADY_RUNNING).toBe('DAEMON_ALREADY_RUNNING');
      expect(ErrorCodes.DAEMON_START_FAILED).toBe('DAEMON_START_FAILED');
      expect(ErrorCodes.DAEMON_STOP_FAILED).toBe('DAEMON_STOP_FAILED');
      expect(ErrorCodes.DAEMON_CONNECTION_FAILED).toBe('DAEMON_CONNECTION_FAILED');
      expect(ErrorCodes.DAEMON_IPC_ERROR).toBe('DAEMON_IPC_ERROR');
    });

    it('should have consistent 5xx status codes for daemon errors', () => {
      const daemonErrors = [
        new LSHError(ErrorCodes.DAEMON_NOT_RUNNING, 'test', {}),
        new LSHError(ErrorCodes.DAEMON_ALREADY_RUNNING, 'test', {}),
        new LSHError(ErrorCodes.DAEMON_START_FAILED, 'test', {}),
        new LSHError(ErrorCodes.DAEMON_STOP_FAILED, 'test', {}),
        new LSHError(ErrorCodes.DAEMON_CONNECTION_FAILED, 'test', {}),
        new LSHError(ErrorCodes.DAEMON_IPC_ERROR, 'test', {}),
      ];

      daemonErrors.forEach(error => {
        expect(error.statusCode).toBe(500);
      });
    });
  });

  describe('Context Preservation', () => {
    it('should preserve socket path in context', () => {
      const error = new LSHError(
        ErrorCodes.DAEMON_NOT_RUNNING,
        'Socket not found',
        { socketPath: '/var/run/lsh/daemon.sock' }
      );

      expect(error.context?.socketPath).toBe('/var/run/lsh/daemon.sock');
    });

    it('should preserve command and timeout in context', () => {
      const error = new LSHError(
        ErrorCodes.DAEMON_IPC_ERROR,
        'Request timeout',
        { command: 'triggerJob', timeoutMs: 30000 }
      );

      expect(error.context?.command).toBe('triggerJob');
      expect(error.context?.timeoutMs).toBe(30000);
    });

    it('should preserve connection state in context', () => {
      const error = new LSHError(
        ErrorCodes.DAEMON_NOT_RUNNING,
        'Not connected',
        { connected: false, hasSocket: true }
      );

      expect(error.context?.connected).toBe(false);
      expect(error.context?.hasSocket).toBe(true);
    });
  });

  describe('Socket Path Error Scenarios', () => {
    it('should handle socket file not found', () => {
      const error = new LSHError(
        ErrorCodes.DAEMON_NOT_RUNNING,
        'Daemon socket not found at /tmp/lsh-job-daemon-user.sock. Is the daemon running?',
        { socketPath: '/tmp/lsh-job-daemon-user.sock' }
      );

      expect(error.code).toBe('DAEMON_NOT_RUNNING');
      expect(error.message).toContain('Is the daemon running?');
    });

    it('should handle socket permission denied', () => {
      const error = new LSHError(
        ErrorCodes.DAEMON_CONNECTION_FAILED,
        'Permission denied to access socket. You may need to start your own daemon.',
        { socketPath: '/tmp/lsh.sock', owner: 'root' }
      );

      expect(error.code).toBe('DAEMON_CONNECTION_FAILED');
      expect(error.context?.owner).toBe('root');
    });
  });
});
