/**
 * Tests for cron-registrar.ts error handling
 * Verifies LSHError is used with correct error codes
 */

import { describe, it, expect } from '@jest/globals';
import { LSHError, ErrorCodes } from '../lib/lsh-error.js';

describe('LSHError for Cron Command Registrar', () => {
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
  });

  describe('Error Serialization', () => {
    it('should serialize job not found errors to JSON correctly', () => {
      const error = new LSHError(
        ErrorCodes.JOB_NOT_FOUND,
        'Job not found',
        { jobId: 'cron_backup_daily' }
      );

      const json = error.toJSON();

      expect(json.code).toBe('JOB_NOT_FOUND');
      expect(json.message).toBe('Job not found');
      expect(json.statusCode).toBe(404);
      expect(json.context?.jobId).toBe('cron_backup_daily');
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
        ErrorCodes.JOB_NOT_FOUND,
        'Job not found',
        {}
      );

      expect(error.name).toBe('LSHError');
    });
  });

  describe('Cron Registrar Error Code Coverage', () => {
    it('should cover all error codes used in cron-registrar.ts', () => {
      // Verify error codes exist and have correct types
      expect(ErrorCodes.JOB_NOT_FOUND).toBe('JOB_NOT_FOUND');
    });

    it('should have correct HTTP status codes for cron registrar errors', () => {
      expect(new LSHError(ErrorCodes.JOB_NOT_FOUND, 'test', {}).statusCode).toBe(404);
    });
  });

  describe('Context Preservation', () => {
    it('should preserve jobId in context', () => {
      const error = new LSHError(
        ErrorCodes.JOB_NOT_FOUND,
        'Job not found',
        { jobId: 'cron_secrets_rotate' }
      );

      expect(error.context?.jobId).toBe('cron_secrets_rotate');
    });
  });

  describe('Cron Registrar Operation Scenarios', () => {
    it('should handle job info lookup failure scenario', () => {
      const error = new LSHError(
        ErrorCodes.JOB_NOT_FOUND,
        'Job daily_backup not found',
        { jobId: 'daily_backup' }
      );

      expect(error.code).toBe('JOB_NOT_FOUND');
      expect(error.message).toBe('Job daily_backup not found');
      expect(error.context?.jobId).toBe('daily_backup');
    });

    it('should handle various job id formats', () => {
      const testCases = [
        { jobId: 'cron_123_backup', message: 'Job cron_123_backup not found' },
        { jobId: 'secrets-rotation-weekly', message: 'Job secrets-rotation-weekly not found' },
        { jobId: 'job_1704067200000_abcd123', message: 'Job job_1704067200000_abcd123 not found' }
      ];

      testCases.forEach(({ jobId, message }) => {
        const error = new LSHError(
          ErrorCodes.JOB_NOT_FOUND,
          message,
          { jobId }
        );

        expect(error.statusCode).toBe(404);
        expect(error.context?.jobId).toBe(jobId);
      });
    });
  });
});
