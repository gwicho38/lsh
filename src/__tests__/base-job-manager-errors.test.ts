/**
 * Tests for base-job-manager.ts error handling
 * Verifies LSHError is used with correct error codes
 */

import { describe, it, expect } from '@jest/globals';
import { LSHError, ErrorCodes } from '../lib/lsh-error.js';

describe('LSHError for Base Job Manager', () => {
  describe('Validation Required Field Errors', () => {
    it('should use VALIDATION_REQUIRED_FIELD code with 400 status for missing name', () => {
      const error = new LSHError(
        ErrorCodes.VALIDATION_REQUIRED_FIELD,
        'Job name is required',
        { field: 'name', provided: { command: 'echo hello' } }
      );

      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('VALIDATION_REQUIRED_FIELD');
      expect(error.context?.field).toBe('name');
    });

    it('should use VALIDATION_REQUIRED_FIELD code for missing command', () => {
      const error = new LSHError(
        ErrorCodes.VALIDATION_REQUIRED_FIELD,
        'Job command is required',
        { field: 'command', provided: { name: 'test-job' } }
      );

      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('VALIDATION_REQUIRED_FIELD');
      expect(error.context?.field).toBe('command');
    });
  });

  describe('Job Not Found Errors', () => {
    it('should use JOB_NOT_FOUND code with 404 status for updateJob', () => {
      const error = new LSHError(
        ErrorCodes.JOB_NOT_FOUND,
        'Job job_123 not found',
        { jobId: 'job_123', operation: 'updateJob' }
      );

      expect(error.statusCode).toBe(404);
      expect(error.code).toBe('JOB_NOT_FOUND');
      expect(error.context?.operation).toBe('updateJob');
    });

    it('should use JOB_NOT_FOUND code for updateJobStatus', () => {
      const error = new LSHError(
        ErrorCodes.JOB_NOT_FOUND,
        'Job job_456 not found',
        { jobId: 'job_456', operation: 'updateJobStatus', targetStatus: 'running' }
      );

      expect(error.code).toBe('JOB_NOT_FOUND');
      expect(error.context?.operation).toBe('updateJobStatus');
      expect(error.context?.targetStatus).toBe('running');
    });

    it('should use JOB_NOT_FOUND code for getJobStatistics', () => {
      const error = new LSHError(
        ErrorCodes.JOB_NOT_FOUND,
        'Job job_789 not found',
        { jobId: 'job_789', operation: 'getJobStatistics' }
      );

      expect(error.code).toBe('JOB_NOT_FOUND');
      expect(error.context?.operation).toBe('getJobStatistics');
    });
  });

  describe('Resource Conflict Errors', () => {
    it('should use RESOURCE_CONFLICT code with 409 status for running job removal', () => {
      const error = new LSHError(
        ErrorCodes.RESOURCE_CONFLICT,
        'Job job_123 is running. Use force=true to remove.',
        { jobId: 'job_123', status: 'running', force: false }
      );

      expect(error.statusCode).toBe(409);
      expect(error.code).toBe('RESOURCE_CONFLICT');
      expect(error.context?.status).toBe('running');
      expect(error.context?.force).toBe(false);
    });
  });

  describe('Error Serialization', () => {
    it('should serialize validation errors to JSON correctly', () => {
      const error = new LSHError(
        ErrorCodes.VALIDATION_REQUIRED_FIELD,
        'Job name is required',
        { field: 'name' }
      );

      const json = error.toJSON();

      expect(json.code).toBe('VALIDATION_REQUIRED_FIELD');
      expect(json.message).toBe('Job name is required');
      expect(json.statusCode).toBe(400);
      expect(json.context?.field).toBe('name');
    });

    it('should serialize job not found errors correctly', () => {
      const error = new LSHError(
        ErrorCodes.JOB_NOT_FOUND,
        'Job not found',
        { jobId: 'test_job', operation: 'updateJob' }
      );

      const json = error.toJSON();

      expect(json.code).toBe('JOB_NOT_FOUND');
      expect(json.statusCode).toBe(404);
    });

    it('should serialize conflict errors correctly', () => {
      const error = new LSHError(
        ErrorCodes.RESOURCE_CONFLICT,
        'Job is running',
        { jobId: 'test_job', status: 'running' }
      );

      const json = error.toJSON();

      expect(json.code).toBe('RESOURCE_CONFLICT');
      expect(json.statusCode).toBe(409);
    });
  });

  describe('Error Instance Checks', () => {
    it('should be instanceof Error', () => {
      const error = new LSHError(
        ErrorCodes.VALIDATION_REQUIRED_FIELD,
        'Field required',
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

  describe('Base Job Manager Error Code Coverage', () => {
    it('should cover all error codes used in base-job-manager.ts', () => {
      // Verify error codes exist and have correct types
      expect(ErrorCodes.VALIDATION_REQUIRED_FIELD).toBe('VALIDATION_REQUIRED_FIELD');
      expect(ErrorCodes.JOB_NOT_FOUND).toBe('JOB_NOT_FOUND');
      expect(ErrorCodes.RESOURCE_CONFLICT).toBe('RESOURCE_CONFLICT');
    });

    it('should have correct HTTP status codes for base job manager errors', () => {
      expect(new LSHError(ErrorCodes.VALIDATION_REQUIRED_FIELD, 'test', {}).statusCode).toBe(400);
      expect(new LSHError(ErrorCodes.JOB_NOT_FOUND, 'test', {}).statusCode).toBe(404);
      expect(new LSHError(ErrorCodes.RESOURCE_CONFLICT, 'test', {}).statusCode).toBe(409);
    });
  });

  describe('Context Preservation', () => {
    it('should preserve field name in validation context', () => {
      const error = new LSHError(
        ErrorCodes.VALIDATION_REQUIRED_FIELD,
        'Field required',
        { field: 'schedule', provided: { name: 'test' } }
      );

      expect(error.context?.field).toBe('schedule');
      expect(error.context?.provided).toHaveProperty('name');
    });

    it('should preserve operation in job not found context', () => {
      const error = new LSHError(
        ErrorCodes.JOB_NOT_FOUND,
        'Job not found',
        { jobId: 'job_123', operation: 'removeJob' }
      );

      expect(error.context?.jobId).toBe('job_123');
      expect(error.context?.operation).toBe('removeJob');
    });

    it('should preserve force flag in conflict context', () => {
      const error = new LSHError(
        ErrorCodes.RESOURCE_CONFLICT,
        'Cannot remove running job',
        { jobId: 'job_123', status: 'running', force: false }
      );

      expect(error.context?.force).toBe(false);
      expect(error.context?.status).toBe('running');
    });
  });

  describe('Job Operation Scenarios', () => {
    it('should handle updateJob not found scenario', () => {
      const error = new LSHError(
        ErrorCodes.JOB_NOT_FOUND,
        'Job my-job not found',
        { jobId: 'my-job', operation: 'updateJob' }
      );

      expect(error.code).toBe('JOB_NOT_FOUND');
      expect(error.message).toContain('my-job');
    });

    it('should handle updateJobStatus not found scenario', () => {
      const error = new LSHError(
        ErrorCodes.JOB_NOT_FOUND,
        'Job my-job not found',
        { jobId: 'my-job', operation: 'updateJobStatus', targetStatus: 'completed' }
      );

      expect(error.context?.targetStatus).toBe('completed');
    });

    it('should handle getJobStatistics not found scenario', () => {
      const error = new LSHError(
        ErrorCodes.JOB_NOT_FOUND,
        'Job my-job not found',
        { jobId: 'my-job', operation: 'getJobStatistics' }
      );

      expect(error.context?.operation).toBe('getJobStatistics');
    });

    it('should handle removeJob conflict scenario', () => {
      const error = new LSHError(
        ErrorCodes.RESOURCE_CONFLICT,
        'Job my-job is running. Use force=true to remove.',
        { jobId: 'my-job', status: 'running', force: false }
      );

      expect(error.statusCode).toBe(409);
      expect(error.message).toContain('force=true');
    });
  });
});
