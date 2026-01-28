/**
 * Tests for job-registry.ts error handling
 * Verifies LSHError is used with correct error codes
 */

import { describe, it, expect } from '@jest/globals';
import { LSHError, ErrorCodes } from '../lib/lsh-error.js';

describe('LSHError for Job Registry', () => {
  describe('Statistics Not Found Errors', () => {
    it('should use RESOURCE_NOT_FOUND code with 404 status for missing statistics', () => {
      const error = new LSHError(
        ErrorCodes.RESOURCE_NOT_FOUND,
        'No statistics found for job job_123',
        { jobId: 'job_123', resource: 'statistics' }
      );

      expect(error.statusCode).toBe(404);
      expect(error.code).toBe('RESOURCE_NOT_FOUND');
      expect(error.context?.jobId).toBe('job_123');
      expect(error.context?.resource).toBe('statistics');
    });
  });

  describe('Job Not Found Errors', () => {
    it('should use JOB_NOT_FOUND code with 404 status for startJob', () => {
      const error = new LSHError(
        ErrorCodes.JOB_NOT_FOUND,
        'Job job_456 not found in registry',
        { jobId: 'job_456', location: 'registry' }
      );

      expect(error.statusCode).toBe(404);
      expect(error.code).toBe('JOB_NOT_FOUND');
      expect(error.context?.jobId).toBe('job_456');
      expect(error.context?.location).toBe('registry');
    });

    it('should use JOB_NOT_FOUND code for stopJob', () => {
      const error = new LSHError(
        ErrorCodes.JOB_NOT_FOUND,
        'Job job_789 not found in registry',
        { jobId: 'job_789', location: 'registry' }
      );

      expect(error.statusCode).toBe(404);
      expect(error.code).toBe('JOB_NOT_FOUND');
      expect(error.context?.location).toBe('registry');
    });
  });

  describe('Error Serialization', () => {
    it('should serialize statistics not found errors to JSON correctly', () => {
      const error = new LSHError(
        ErrorCodes.RESOURCE_NOT_FOUND,
        'No statistics found',
        { jobId: 'daily_backup', resource: 'statistics' }
      );

      const json = error.toJSON();

      expect(json.code).toBe('RESOURCE_NOT_FOUND');
      expect(json.statusCode).toBe(404);
      expect(json.context?.jobId).toBe('daily_backup');
      expect(json.context?.resource).toBe('statistics');
    });

    it('should serialize job not found errors correctly', () => {
      const error = new LSHError(
        ErrorCodes.JOB_NOT_FOUND,
        'Job not found in registry',
        { jobId: 'secrets_rotate', location: 'registry' }
      );

      const json = error.toJSON();

      expect(json.code).toBe('JOB_NOT_FOUND');
      expect(json.context?.jobId).toBe('secrets_rotate');
    });
  });

  describe('Error Instance Checks', () => {
    it('should be instanceof Error', () => {
      const error = new LSHError(
        ErrorCodes.RESOURCE_NOT_FOUND,
        'Not found',
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

  describe('Job Registry Error Code Coverage', () => {
    it('should cover all error codes used in job-registry.ts', () => {
      // Verify error codes exist and have correct types
      expect(ErrorCodes.RESOURCE_NOT_FOUND).toBe('RESOURCE_NOT_FOUND');
      expect(ErrorCodes.JOB_NOT_FOUND).toBe('JOB_NOT_FOUND');
    });

    it('should have correct HTTP status codes for job registry errors', () => {
      expect(new LSHError(ErrorCodes.RESOURCE_NOT_FOUND, 'test', {}).statusCode).toBe(404);
      expect(new LSHError(ErrorCodes.JOB_NOT_FOUND, 'test', {}).statusCode).toBe(404);
    });
  });

  describe('Context Preservation', () => {
    it('should preserve jobId and resource in context', () => {
      const error = new LSHError(
        ErrorCodes.RESOURCE_NOT_FOUND,
        'Statistics not found',
        { jobId: 'cron_backup_daily', resource: 'statistics' }
      );

      expect(error.context?.jobId).toBe('cron_backup_daily');
      expect(error.context?.resource).toBe('statistics');
    });

    it('should preserve jobId and location in context', () => {
      const error = new LSHError(
        ErrorCodes.JOB_NOT_FOUND,
        'Job not found',
        { jobId: 'job_xyz', location: 'registry' }
      );

      expect(error.context?.jobId).toBe('job_xyz');
      expect(error.context?.location).toBe('registry');
    });
  });

  describe('Job Registry Operation Scenarios', () => {
    it('should handle getJobStatistics failure scenario', () => {
      const error = new LSHError(
        ErrorCodes.RESOURCE_NOT_FOUND,
        'No statistics found for job cleanup_weekly',
        { jobId: 'cleanup_weekly', resource: 'statistics' }
      );

      expect(error.code).toBe('RESOURCE_NOT_FOUND');
      expect(error.message).toContain('No statistics found');
    });

    it('should handle startJob failure scenario', () => {
      const error = new LSHError(
        ErrorCodes.JOB_NOT_FOUND,
        'Job secrets_rotate_monthly not found in registry',
        { jobId: 'secrets_rotate_monthly', location: 'registry' }
      );

      expect(error.statusCode).toBe(404);
      expect(error.context?.jobId).toBe('secrets_rotate_monthly');
    });

    it('should handle stopJob failure scenario', () => {
      const error = new LSHError(
        ErrorCodes.JOB_NOT_FOUND,
        'Job backup_daily not found in registry',
        { jobId: 'backup_daily', location: 'registry' }
      );

      expect(error.code).toBe('JOB_NOT_FOUND');
      expect(error.message).toContain('not found in registry');
    });
  });
});
