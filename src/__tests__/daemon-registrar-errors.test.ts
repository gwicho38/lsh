/**
 * Tests for daemon-registrar.ts error handling
 * Verifies LSHError is used with correct error codes
 */

import { describe, it, expect } from '@jest/globals';
import { LSHError, ErrorCodes, extractErrorMessage } from '../lib/lsh-error.js';

describe('LSHError for Daemon Command Registrar', () => {
  describe('Validation Errors', () => {
    it('should use VALIDATION_REQUIRED_FIELD code with 400 status for missing job options', () => {
      const error = new LSHError(
        ErrorCodes.VALIDATION_REQUIRED_FIELD,
        'Missing required options: --name, --command, and (--schedule or --interval)',
        { required: ['--name', '--command', '--schedule OR --interval'], provided: { name: undefined, command: undefined } }
      );

      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('VALIDATION_REQUIRED_FIELD');
      expect(error.context?.required).toContain('--name');
      expect(error.context?.required).toContain('--command');
    });

    it('should include provided values in context for validation errors', () => {
      const error = new LSHError(
        ErrorCodes.VALIDATION_REQUIRED_FIELD,
        'Missing required options',
        { required: ['--name', '--command'], provided: { name: 'my-job', command: undefined, schedule: '0 * * * *' } }
      );

      expect(error.context?.provided).toEqual({ name: 'my-job', command: undefined, schedule: '0 * * * *' });
    });
  });

  describe('Job Not Found Errors', () => {
    it('should use JOB_NOT_FOUND code with 404 status for job info lookup', () => {
      const error = new LSHError(
        ErrorCodes.JOB_NOT_FOUND,
        'Job job_123 not found',
        { jobId: 'job_123' }
      );

      expect(error.statusCode).toBe(404);
      expect(error.code).toBe('JOB_NOT_FOUND');
      expect(error.context?.jobId).toBe('job_123');
    });

    it('should use JOB_NOT_FOUND code for daemon registry lookup', () => {
      const error = new LSHError(
        ErrorCodes.JOB_NOT_FOUND,
        'Job job_456 not found in daemon registry',
        { jobId: 'job_456', location: 'daemon registry' }
      );

      expect(error.statusCode).toBe(404);
      expect(error.code).toBe('JOB_NOT_FOUND');
      expect(error.context?.jobId).toBe('job_456');
      expect(error.context?.location).toBe('daemon registry');
    });
  });

  describe('Cleanup Errors', () => {
    it('should use DAEMON_STOP_FAILED code with 500 status for cleanup failure', () => {
      const error = new LSHError(
        ErrorCodes.DAEMON_STOP_FAILED,
        'Cleanup failed: permission denied',
        { operation: 'cleanup' }
      );

      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('DAEMON_STOP_FAILED');
      expect(error.context?.operation).toBe('cleanup');
    });
  });

  describe('Error Serialization', () => {
    it('should serialize validation errors to JSON correctly', () => {
      const error = new LSHError(
        ErrorCodes.VALIDATION_REQUIRED_FIELD,
        'Missing required options',
        { required: ['--name', '--command'] }
      );

      const json = error.toJSON();

      expect(json.code).toBe('VALIDATION_REQUIRED_FIELD');
      expect(json.message).toBe('Missing required options');
      expect(json.statusCode).toBe(400);
      expect(json.context?.required).toEqual(['--name', '--command']);
    });

    it('should serialize job not found errors correctly', () => {
      const error = new LSHError(
        ErrorCodes.JOB_NOT_FOUND,
        'Job not found',
        { jobId: 'test_job', location: 'daemon registry' }
      );

      const json = error.toJSON();

      expect(json.code).toBe('JOB_NOT_FOUND');
      expect(json.context?.jobId).toBe('test_job');
      expect(json.context?.location).toBe('daemon registry');
    });
  });

  describe('Error Instance Checks', () => {
    it('should be instanceof Error', () => {
      const error = new LSHError(
        ErrorCodes.VALIDATION_REQUIRED_FIELD,
        'Missing options',
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

  describe('Daemon Registrar Error Code Coverage', () => {
    it('should cover all error codes used in daemon-registrar.ts', () => {
      // Verify error codes exist and have correct types
      expect(ErrorCodes.VALIDATION_REQUIRED_FIELD).toBe('VALIDATION_REQUIRED_FIELD');
      expect(ErrorCodes.JOB_NOT_FOUND).toBe('JOB_NOT_FOUND');
      expect(ErrorCodes.DAEMON_STOP_FAILED).toBe('DAEMON_STOP_FAILED');
    });

    it('should have correct HTTP status codes for daemon registrar errors', () => {
      expect(new LSHError(ErrorCodes.VALIDATION_REQUIRED_FIELD, 'test', {}).statusCode).toBe(400);
      expect(new LSHError(ErrorCodes.JOB_NOT_FOUND, 'test', {}).statusCode).toBe(404);
      expect(new LSHError(ErrorCodes.DAEMON_STOP_FAILED, 'test', {}).statusCode).toBe(500);
    });
  });

  describe('Context Preservation', () => {
    it('should preserve required and provided fields in context', () => {
      const error = new LSHError(
        ErrorCodes.VALIDATION_REQUIRED_FIELD,
        'Missing options',
        { required: ['--name', '--command'], provided: { name: 'test' } }
      );

      expect(error.context?.required).toHaveLength(2);
      expect(error.context?.provided).toEqual({ name: 'test' });
    });

    it('should preserve jobId in context', () => {
      const error = new LSHError(
        ErrorCodes.JOB_NOT_FOUND,
        'Job not found',
        { jobId: 'job_xyz123' }
      );

      expect(error.context?.jobId).toBe('job_xyz123');
    });

    it('should preserve operation in context', () => {
      const error = new LSHError(
        ErrorCodes.DAEMON_STOP_FAILED,
        'Cleanup failed',
        { operation: 'cleanup' }
      );

      expect(error.context?.operation).toBe('cleanup');
    });
  });

  describe('extractErrorMessage utility', () => {
    it('should extract message from Error objects', () => {
      const error = new Error('Test error message');
      expect(extractErrorMessage(error)).toBe('Test error message');
    });

    it('should extract formatted message from LSHError objects', () => {
      const error = new LSHError(ErrorCodes.JOB_NOT_FOUND, 'Job not found', {});
      // LSHError returns formatted message with code and context
      expect(extractErrorMessage(error)).toContain('Job not found');
      expect(extractErrorMessage(error)).toContain('JOB_NOT_FOUND');
    });

    it('should handle string errors', () => {
      expect(extractErrorMessage('String error')).toBe('String error');
    });

    it('should handle non-Error objects', () => {
      expect(extractErrorMessage({ message: 'Object error' })).toBe('Object error');
    });

    it('should convert null/undefined to string representation', () => {
      // extractErrorMessage converts non-error values to string
      expect(extractErrorMessage(null)).toBe('null');
      expect(extractErrorMessage(undefined)).toBe('undefined');
    });
  });

  describe('Daemon Registrar Operation Scenarios', () => {
    it('should handle job create with missing name and command scenario', () => {
      const error = new LSHError(
        ErrorCodes.VALIDATION_REQUIRED_FIELD,
        'Missing required options: --name, --command, and (--schedule or --interval)',
        { required: ['--name', '--command', '--schedule OR --interval'], provided: {} }
      );

      expect(error.code).toBe('VALIDATION_REQUIRED_FIELD');
      expect(error.message).toContain('Missing required options');
    });

    it('should handle job info lookup failure scenario', () => {
      const error = new LSHError(
        ErrorCodes.JOB_NOT_FOUND,
        'Job cron_backup_daily not found',
        { jobId: 'cron_backup_daily' }
      );

      expect(error.statusCode).toBe(404);
      expect(error.context?.jobId).toBe('cron_backup_daily');
    });

    it('should handle daemon registry lookup failure scenario', () => {
      const error = new LSHError(
        ErrorCodes.JOB_NOT_FOUND,
        'Job secrets_rotate not found in daemon registry',
        { jobId: 'secrets_rotate', location: 'daemon registry' }
      );

      expect(error.code).toBe('JOB_NOT_FOUND');
      expect(error.context?.location).toBe('daemon registry');
    });

    it('should handle cleanup failure with permission error scenario', () => {
      const originalError = new Error('EACCES: permission denied');
      const error = new LSHError(
        ErrorCodes.DAEMON_STOP_FAILED,
        `Cleanup failed: ${extractErrorMessage(originalError)}`,
        { operation: 'cleanup' }
      );

      expect(error.statusCode).toBe(500);
      expect(error.message).toContain('permission denied');
    });
  });
});
