/**
 * Tests for job-manager.ts error handling
 * Verifies LSHError is used with correct error codes
 *
 * Note: JobManager integration tests require process spawning.
 * These tests verify LSHError behavior directly.
 */

import { describe, it, expect } from '@jest/globals';
import { LSHError, ErrorCodes } from '../lib/lsh-error.js';

describe('LSHError for Job Manager', () => {
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

    it('should use JOB_NOT_FOUND for start job with missing job', () => {
      const error = new LSHError(
        ErrorCodes.JOB_NOT_FOUND,
        'Job job_abc not found',
        { jobId: 'job_abc' }
      );

      expect(error.code).toBe('JOB_NOT_FOUND');
      expect(error.context?.jobId).toBe('job_abc');
    });

    it('should use JOB_NOT_FOUND for stop job with missing job', () => {
      const error = new LSHError(
        ErrorCodes.JOB_NOT_FOUND,
        'Job job_xyz not found',
        { jobId: 'job_xyz' }
      );

      expect(error.code).toBe('JOB_NOT_FOUND');
    });

    it('should use JOB_NOT_FOUND for monitor job with missing job', () => {
      const error = new LSHError(
        ErrorCodes.JOB_NOT_FOUND,
        'Job job_monitor not found',
        { jobId: 'job_monitor' }
      );

      expect(error.code).toBe('JOB_NOT_FOUND');
    });
  });

  describe('Job Already Running Errors', () => {
    it('should use JOB_ALREADY_RUNNING code with 500 status', () => {
      const error = new LSHError(
        ErrorCodes.JOB_ALREADY_RUNNING,
        'Job job_123 is already running',
        { jobId: 'job_123', status: 'running' }
      );

      // JOB_ALREADY_RUNNING falls to default 500 (not 409 like _ALREADY_EXISTS)
      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('JOB_ALREADY_RUNNING');
      expect(error.context?.status).toBe('running');
    });
  });

  describe('Job Stop Failed Errors', () => {
    it('should use JOB_STOP_FAILED code with 500 status for not running job', () => {
      const error = new LSHError(
        ErrorCodes.JOB_STOP_FAILED,
        'Job job_123 is not running',
        { jobId: 'job_123', status: 'stopped' }
      );

      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('JOB_STOP_FAILED');
      expect(error.context?.status).toBe('stopped');
    });

    it('should use JOB_STOP_FAILED code for job without process', () => {
      const error = new LSHError(
        ErrorCodes.JOB_STOP_FAILED,
        'Job job_123 has no associated process',
        { jobId: 'job_123', hasPid: false, hasProcess: false }
      );

      expect(error.code).toBe('JOB_STOP_FAILED');
      expect(error.context?.hasPid).toBe(false);
    });
  });

  describe('Job Start Failed Errors', () => {
    it('should use JOB_START_FAILED code with 500 status for resume failure', () => {
      const error = new LSHError(
        ErrorCodes.JOB_START_FAILED,
        'Failed to resume job job_123',
        { jobId: 'job_123', originalError: 'ESRCH' }
      );

      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('JOB_START_FAILED');
      expect(error.context?.originalError).toBe('ESRCH');
    });

    it('should use JOB_START_FAILED code for non-paused job', () => {
      const error = new LSHError(
        ErrorCodes.JOB_START_FAILED,
        'Job job_123 is not paused',
        { jobId: 'job_123', status: 'running' }
      );

      expect(error.code).toBe('JOB_START_FAILED');
      expect(error.context?.status).toBe('running');
    });

    it('should use JOB_START_FAILED code for job without process during resume', () => {
      const error = new LSHError(
        ErrorCodes.JOB_START_FAILED,
        'Job job_123 has no associated process',
        { jobId: 'job_123', hasPid: false, hasProcess: false }
      );

      expect(error.code).toBe('JOB_START_FAILED');
    });
  });

  describe('Error Serialization', () => {
    it('should serialize job errors to JSON correctly', () => {
      const error = new LSHError(
        ErrorCodes.JOB_NOT_FOUND,
        'Job not found',
        { jobId: 'job_test' }
      );

      const json = error.toJSON();

      expect(json.code).toBe('JOB_NOT_FOUND');
      expect(json.message).toBe('Job not found');
      expect(json.statusCode).toBe(404);
      expect(json.context?.jobId).toBe('job_test');
    });

    it('should serialize job running errors correctly', () => {
      const error = new LSHError(
        ErrorCodes.JOB_ALREADY_RUNNING,
        'Already running',
        { jobId: 'job_123' }
      );

      const json = error.toJSON();

      expect(json.code).toBe('JOB_ALREADY_RUNNING');
      // JOB_ALREADY_RUNNING falls to default 500 (not 409 like _ALREADY_EXISTS)
      expect(json.statusCode).toBe(500);
    });
  });

  describe('Error Instance Checks', () => {
    it('should be instanceof Error', () => {
      const error = new LSHError(
        ErrorCodes.JOB_NOT_FOUND,
        'Job not found',
        {}
      );

      expect(error instanceof Error).toBe(true);
      expect(error instanceof LSHError).toBe(true);
    });

    it('should have name property set to LSHError', () => {
      const error = new LSHError(
        ErrorCodes.JOB_STOP_FAILED,
        'Stop failed',
        {}
      );

      expect(error.name).toBe('LSHError');
    });
  });

  describe('Job Error Code Coverage', () => {
    it('should cover all job-related error codes', () => {
      // Verify error codes exist and have correct types
      expect(ErrorCodes.JOB_NOT_FOUND).toBe('JOB_NOT_FOUND');
      expect(ErrorCodes.JOB_ALREADY_RUNNING).toBe('JOB_ALREADY_RUNNING');
      expect(ErrorCodes.JOB_START_FAILED).toBe('JOB_START_FAILED');
      expect(ErrorCodes.JOB_STOP_FAILED).toBe('JOB_STOP_FAILED');
      expect(ErrorCodes.JOB_TIMEOUT).toBe('JOB_TIMEOUT');
      expect(ErrorCodes.JOB_INVALID_SCHEDULE).toBe('JOB_INVALID_SCHEDULE');
    });

    it('should have correct HTTP status codes for job errors', () => {
      // 404 for not found (matches _NOT_FOUND pattern)
      expect(new LSHError(ErrorCodes.JOB_NOT_FOUND, 'test', {}).statusCode).toBe(404);

      // 500 for already running (JOB_ALREADY_RUNNING != _ALREADY_EXISTS pattern)
      expect(new LSHError(ErrorCodes.JOB_ALREADY_RUNNING, 'test', {}).statusCode).toBe(500);

      // 500 for start/stop failures
      expect(new LSHError(ErrorCodes.JOB_START_FAILED, 'test', {}).statusCode).toBe(500);
      expect(new LSHError(ErrorCodes.JOB_STOP_FAILED, 'test', {}).statusCode).toBe(500);

      // 504 for timeout (specific match in getDefaultStatusCode)
      expect(new LSHError(ErrorCodes.JOB_TIMEOUT, 'test', {}).statusCode).toBe(504);
    });
  });

  describe('Context Preservation', () => {
    it('should preserve job ID in context', () => {
      const error = new LSHError(
        ErrorCodes.JOB_NOT_FOUND,
        'Job not found',
        { jobId: 'job_12345' }
      );

      expect(error.context?.jobId).toBe('job_12345');
    });

    it('should preserve job status in context', () => {
      const error = new LSHError(
        ErrorCodes.JOB_STOP_FAILED,
        'Job is not running',
        { jobId: 'job_abc', status: 'completed' }
      );

      expect(error.context?.jobId).toBe('job_abc');
      expect(error.context?.status).toBe('completed');
    });

    it('should preserve original error in context', () => {
      const error = new LSHError(
        ErrorCodes.JOB_START_FAILED,
        'Failed to resume',
        { jobId: 'job_xyz', originalError: 'Process not found' }
      );

      expect(error.context?.originalError).toBe('Process not found');
    });
  });
});
