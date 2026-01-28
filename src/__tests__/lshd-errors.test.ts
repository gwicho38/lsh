/**
 * Tests for lshd.ts error handling
 * Verifies LSHError is used with correct error codes
 *
 * Note: LSHJobDaemon integration tests require process-level setup.
 * These tests verify LSHError behavior directly.
 */

import { describe, it, expect } from '@jest/globals';
import { LSHError, ErrorCodes } from '../lib/lsh-error.js';

describe('LSHError for LSH Job Daemon', () => {
  describe('Daemon Already Running Errors', () => {
    it('should use DAEMON_ALREADY_RUNNING code with 500 status', () => {
      const error = new LSHError(
        ErrorCodes.DAEMON_ALREADY_RUNNING,
        'Daemon is already running',
        { pid: 12345 }
      );

      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('DAEMON_ALREADY_RUNNING');
      expect(error.context?.pid).toBe(12345);
    });

    it('should use DAEMON_ALREADY_RUNNING for another instance', () => {
      const error = new LSHError(
        ErrorCodes.DAEMON_ALREADY_RUNNING,
        'Another daemon instance is already running',
        { pidFile: '/tmp/lsh.pid' }
      );

      expect(error.code).toBe('DAEMON_ALREADY_RUNNING');
      expect(error.context?.pidFile).toBe('/tmp/lsh.pid');
    });
  });

  describe('Configuration Errors', () => {
    it('should use CONFIG_INVALID_VALUE code for environment validation failure', () => {
      const error = new LSHError(
        ErrorCodes.CONFIG_INVALID_VALUE,
        'Invalid environment configuration',
        { errors: ['Missing LSH_API_KEY'], environment: 'production' }
      );

      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('CONFIG_INVALID_VALUE');
      expect(error.context?.environment).toBe('production');
      expect(error.context?.errors).toContain('Missing LSH_API_KEY');
    });
  });

  describe('Job Not Found Errors', () => {
    it('should use JOB_NOT_FOUND code with 404 status', () => {
      const error = new LSHError(
        ErrorCodes.JOB_NOT_FOUND,
        'Job job_123 not found',
        { jobId: 'job_123' }
      );

      expect(error.statusCode).toBe(404);
      expect(error.code).toBe('JOB_NOT_FOUND');
      expect(error.context?.jobId).toBe('job_123');
    });
  });

  describe('Command Validation Errors', () => {
    it('should use VALIDATION_COMMAND_INJECTION code with 400 status', () => {
      const error = new LSHError(
        ErrorCodes.VALIDATION_COMMAND_INJECTION,
        'Command validation failed: potential command injection detected',
        {
          jobId: 'job_456',
          command: 'rm -rf /',
          riskLevel: 'high',
          errors: ['Dangerous command detected']
        }
      );

      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('VALIDATION_COMMAND_INJECTION');
      expect(error.context?.riskLevel).toBe('high');
      expect(error.context?.errors).toContain('Dangerous command detected');
    });
  });

  describe('API Invalid Request Errors', () => {
    it('should use API_INVALID_REQUEST code for unknown commands', () => {
      const error = new LSHError(
        ErrorCodes.API_INVALID_REQUEST,
        'Unknown command: invalidCommand',
        {
          command: 'invalidCommand',
          validCommands: ['status', 'addJob', 'startJob', 'triggerJob', 'stopJob', 'listJobs', 'getJob', 'removeJob', 'restart', 'stop']
        }
      );

      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('API_INVALID_REQUEST');
      expect(error.context?.command).toBe('invalidCommand');
      expect(error.context?.validCommands).toContain('status');
    });
  });

  describe('Error Serialization', () => {
    it('should serialize daemon errors to JSON correctly', () => {
      const error = new LSHError(
        ErrorCodes.DAEMON_ALREADY_RUNNING,
        'Daemon is already running',
        { pid: 99999 }
      );

      const json = error.toJSON();

      expect(json.code).toBe('DAEMON_ALREADY_RUNNING');
      expect(json.message).toBe('Daemon is already running');
      expect(json.statusCode).toBe(500);
      expect(json.context?.pid).toBe(99999);
    });

    it('should serialize validation errors with context', () => {
      const error = new LSHError(
        ErrorCodes.VALIDATION_COMMAND_INJECTION,
        'Command validation failed',
        { jobId: 'test_job', errors: ['error1', 'error2'] }
      );

      const json = error.toJSON();

      expect(json.code).toBe('VALIDATION_COMMAND_INJECTION');
      expect(json.context?.errors).toHaveLength(2);
    });
  });

  describe('Error Instance Checks', () => {
    it('should be instanceof Error', () => {
      const error = new LSHError(
        ErrorCodes.DAEMON_ALREADY_RUNNING,
        'Daemon running',
        {}
      );

      expect(error instanceof Error).toBe(true);
      expect(error instanceof LSHError).toBe(true);
    });

    it('should have name property set to LSHError', () => {
      const error = new LSHError(
        ErrorCodes.JOB_NOT_FOUND,
        'Job not found',
        {}
      );

      expect(error.name).toBe('LSHError');
    });
  });

  describe('Daemon Error Code Coverage', () => {
    it('should cover all daemon-related error codes used in lshd.ts', () => {
      // Verify error codes exist and have correct types
      expect(ErrorCodes.DAEMON_ALREADY_RUNNING).toBe('DAEMON_ALREADY_RUNNING');
      expect(ErrorCodes.CONFIG_INVALID_VALUE).toBe('CONFIG_INVALID_VALUE');
      expect(ErrorCodes.JOB_NOT_FOUND).toBe('JOB_NOT_FOUND');
      expect(ErrorCodes.VALIDATION_COMMAND_INJECTION).toBe('VALIDATION_COMMAND_INJECTION');
      expect(ErrorCodes.API_INVALID_REQUEST).toBe('API_INVALID_REQUEST');
    });

    it('should have correct HTTP status codes', () => {
      expect(new LSHError(ErrorCodes.DAEMON_ALREADY_RUNNING, 'test', {}).statusCode).toBe(500);
      expect(new LSHError(ErrorCodes.CONFIG_INVALID_VALUE, 'test', {}).statusCode).toBe(400);
      expect(new LSHError(ErrorCodes.JOB_NOT_FOUND, 'test', {}).statusCode).toBe(404);
      expect(new LSHError(ErrorCodes.VALIDATION_COMMAND_INJECTION, 'test', {}).statusCode).toBe(400);
      expect(new LSHError(ErrorCodes.API_INVALID_REQUEST, 'test', {}).statusCode).toBe(400);
    });
  });

  describe('Context Preservation', () => {
    it('should preserve pid in context', () => {
      const error = new LSHError(
        ErrorCodes.DAEMON_ALREADY_RUNNING,
        'Daemon running',
        { pid: 12345 }
      );

      expect(error.context?.pid).toBe(12345);
    });

    it('should preserve pidFile in context', () => {
      const error = new LSHError(
        ErrorCodes.DAEMON_ALREADY_RUNNING,
        'Another daemon running',
        { pidFile: '/var/run/lsh.pid' }
      );

      expect(error.context?.pidFile).toBe('/var/run/lsh.pid');
    });

    it('should preserve job details in context', () => {
      const error = new LSHError(
        ErrorCodes.VALIDATION_COMMAND_INJECTION,
        'Validation failed',
        {
          jobId: 'job_test',
          command: 'echo hello',
          riskLevel: 'low',
          errors: []
        }
      );

      expect(error.context?.jobId).toBe('job_test');
      expect(error.context?.command).toBe('echo hello');
      expect(error.context?.riskLevel).toBe('low');
    });

    it('should preserve valid commands list in context', () => {
      const validCommands = ['status', 'addJob', 'startJob'];
      const error = new LSHError(
        ErrorCodes.API_INVALID_REQUEST,
        'Unknown command',
        { command: 'invalid', validCommands }
      );

      expect(error.context?.validCommands).toEqual(validCommands);
    });
  });

  describe('Environment Validation Errors', () => {
    it('should include environment and errors in context', () => {
      const error = new LSHError(
        ErrorCodes.CONFIG_INVALID_VALUE,
        'Environment validation failed',
        {
          errors: ['Missing API key', 'Invalid port'],
          environment: 'production'
        }
      );

      expect(error.context?.errors).toHaveLength(2);
      expect(error.context?.environment).toBe('production');
    });
  });
});
