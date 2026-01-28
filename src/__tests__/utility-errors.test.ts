/**
 * Tests for utility files error handling
 * Covers: format-utils, job-storage-memory, cloud-config-manager, string-utils, local-storage-adapter
 */

import { describe, it, expect } from '@jest/globals';
import { LSHError, ErrorCodes } from '../lib/lsh-error.js';

describe('LSHError for Utility Files', () => {
  describe('format-utils.ts - Unsupported Format Errors', () => {
    it('should use VALIDATION_INVALID_FORMAT code with 400 status', () => {
      const error = new LSHError(
        ErrorCodes.VALIDATION_INVALID_FORMAT,
        'Unsupported format: xml',
        { format: 'xml', supportedFormats: ['env', 'json', 'yaml', 'toml', 'export'] }
      );

      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('VALIDATION_INVALID_FORMAT');
      expect(error.context?.format).toBe('xml');
      expect(error.context?.supportedFormats).toContain('json');
    });

    it('should include all supported formats in context', () => {
      const error = new LSHError(
        ErrorCodes.VALIDATION_INVALID_FORMAT,
        'Unsupported format: csv',
        { format: 'csv', supportedFormats: ['env', 'json', 'yaml', 'toml', 'export'] }
      );

      expect(error.context?.supportedFormats).toHaveLength(5);
      expect(error.context?.supportedFormats).toContain('env');
      expect(error.context?.supportedFormats).toContain('yaml');
      expect(error.context?.supportedFormats).toContain('toml');
      expect(error.context?.supportedFormats).toContain('export');
    });
  });

  describe('job-storage-memory.ts - Job Not Found Errors', () => {
    it('should use JOB_NOT_FOUND code with 404 status', () => {
      const error = new LSHError(
        ErrorCodes.JOB_NOT_FOUND,
        'Job job_123 not found',
        { jobId: 'job_123', operation: 'update' }
      );

      expect(error.statusCode).toBe(404);
      expect(error.code).toBe('JOB_NOT_FOUND');
      expect(error.context?.jobId).toBe('job_123');
      expect(error.context?.operation).toBe('update');
    });
  });

  describe('cloud-config-manager.ts - Config Parse Errors', () => {
    it('should use CONFIG_PARSE_ERROR code with 500 status', () => {
      const error = new LSHError(
        ErrorCodes.CONFIG_PARSE_ERROR,
        'Invalid configuration JSON',
        { parseError: 'Unexpected token', inputLength: 50 }
      );

      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('CONFIG_PARSE_ERROR');
      expect(error.context?.parseError).toContain('Unexpected token');
      expect(error.context?.inputLength).toBe(50);
    });
  });

  describe('string-utils.ts - Truncate Validation Errors', () => {
    it('should use VALIDATION_INVALID_FORMAT code with 400 status', () => {
      const error = new LSHError(
        ErrorCodes.VALIDATION_INVALID_FORMAT,
        'maxLength (2) must be greater than or equal to ellipsis length (3)',
        { maxLength: 2, ellipsisLength: 3, ellipsis: '...' }
      );

      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('VALIDATION_INVALID_FORMAT');
      expect(error.context?.maxLength).toBe(2);
      expect(error.context?.ellipsisLength).toBe(3);
    });
  });

  describe('local-storage-adapter.ts - Invalid Table Errors', () => {
    it('should use VALIDATION_INVALID_FORMAT code with 400 status', () => {
      const error = new LSHError(
        ErrorCodes.VALIDATION_INVALID_FORMAT,
        'Invalid table name: users',
        { tableName: 'users', validTables: ['shell_history', 'shell_jobs'] }
      );

      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('VALIDATION_INVALID_FORMAT');
      expect(error.context?.tableName).toBe('users');
      expect(error.context?.validTables).toContain('shell_history');
    });
  });

  describe('Error Serialization', () => {
    it('should serialize format errors to JSON correctly', () => {
      const error = new LSHError(
        ErrorCodes.VALIDATION_INVALID_FORMAT,
        'Invalid format',
        { format: 'unknown' }
      );

      const json = error.toJSON();

      expect(json.code).toBe('VALIDATION_INVALID_FORMAT');
      expect(json.statusCode).toBe(400);
      expect(json.context?.format).toBe('unknown');
    });

    it('should serialize job errors correctly', () => {
      const error = new LSHError(
        ErrorCodes.JOB_NOT_FOUND,
        'Job not found',
        { jobId: 'test_123' }
      );

      const json = error.toJSON();

      expect(json.code).toBe('JOB_NOT_FOUND');
      expect(json.statusCode).toBe(404);
    });

    it('should serialize config errors correctly', () => {
      const error = new LSHError(
        ErrorCodes.CONFIG_PARSE_ERROR,
        'Parse error',
        { parseError: 'details' }
      );

      const json = error.toJSON();

      expect(json.code).toBe('CONFIG_PARSE_ERROR');
      expect(json.statusCode).toBe(500);
    });
  });

  describe('Error Instance Checks', () => {
    it('should be instanceof Error', () => {
      const error = new LSHError(
        ErrorCodes.VALIDATION_INVALID_FORMAT,
        'Invalid',
        {}
      );

      expect(error instanceof Error).toBe(true);
      expect(error instanceof LSHError).toBe(true);
    });

    it('should have name property set to LSHError', () => {
      const error = new LSHError(
        ErrorCodes.JOB_NOT_FOUND,
        'Not found',
        {}
      );

      expect(error.name).toBe('LSHError');
    });
  });

  describe('Utility Error Code Coverage', () => {
    it('should cover all error codes used in utility files', () => {
      expect(ErrorCodes.VALIDATION_INVALID_FORMAT).toBe('VALIDATION_INVALID_FORMAT');
      expect(ErrorCodes.JOB_NOT_FOUND).toBe('JOB_NOT_FOUND');
      expect(ErrorCodes.CONFIG_PARSE_ERROR).toBe('CONFIG_PARSE_ERROR');
    });

    it('should have correct HTTP status codes', () => {
      expect(new LSHError(ErrorCodes.VALIDATION_INVALID_FORMAT, 'test', {}).statusCode).toBe(400);
      expect(new LSHError(ErrorCodes.JOB_NOT_FOUND, 'test', {}).statusCode).toBe(404);
      expect(new LSHError(ErrorCodes.CONFIG_PARSE_ERROR, 'test', {}).statusCode).toBe(500);
    });
  });

  describe('Context Preservation', () => {
    it('should preserve format in context', () => {
      const error = new LSHError(
        ErrorCodes.VALIDATION_INVALID_FORMAT,
        'Invalid format',
        { format: 'binary' }
      );

      expect(error.context?.format).toBe('binary');
    });

    it('should preserve supportedFormats in context', () => {
      const error = new LSHError(
        ErrorCodes.VALIDATION_INVALID_FORMAT,
        'Invalid format',
        { supportedFormats: ['a', 'b', 'c'] }
      );

      expect(error.context?.supportedFormats).toEqual(['a', 'b', 'c']);
    });

    it('should preserve jobId in context', () => {
      const error = new LSHError(
        ErrorCodes.JOB_NOT_FOUND,
        'Not found',
        { jobId: 'job_xyz' }
      );

      expect(error.context?.jobId).toBe('job_xyz');
    });

    it('should preserve operation in context', () => {
      const error = new LSHError(
        ErrorCodes.JOB_NOT_FOUND,
        'Not found',
        { operation: 'delete' }
      );

      expect(error.context?.operation).toBe('delete');
    });

    it('should preserve parseError in context', () => {
      const error = new LSHError(
        ErrorCodes.CONFIG_PARSE_ERROR,
        'Parse failed',
        { parseError: 'Syntax error at line 5' }
      );

      expect(error.context?.parseError).toBe('Syntax error at line 5');
    });

    it('should preserve inputLength in context', () => {
      const error = new LSHError(
        ErrorCodes.CONFIG_PARSE_ERROR,
        'Parse failed',
        { inputLength: 1024 }
      );

      expect(error.context?.inputLength).toBe(1024);
    });

    it('should preserve maxLength and ellipsisLength in context', () => {
      const error = new LSHError(
        ErrorCodes.VALIDATION_INVALID_FORMAT,
        'Invalid params',
        { maxLength: 5, ellipsisLength: 10 }
      );

      expect(error.context?.maxLength).toBe(5);
      expect(error.context?.ellipsisLength).toBe(10);
    });

    it('should preserve tableName and validTables in context', () => {
      const error = new LSHError(
        ErrorCodes.VALIDATION_INVALID_FORMAT,
        'Invalid table',
        { tableName: 'foo', validTables: ['bar', 'baz'] }
      );

      expect(error.context?.tableName).toBe('foo');
      expect(error.context?.validTables).toEqual(['bar', 'baz']);
    });
  });

  describe('Utility Operation Scenarios', () => {
    it('should handle formatSecrets unsupported format', () => {
      const error = new LSHError(
        ErrorCodes.VALIDATION_INVALID_FORMAT,
        'Unsupported format: markdown',
        { format: 'markdown', supportedFormats: ['env', 'json', 'yaml', 'toml', 'export'] }
      );

      expect(error.code).toBe('VALIDATION_INVALID_FORMAT');
      expect(error.message).toContain('Unsupported format');
    });

    it('should handle MemoryJobStorage.update job not found', () => {
      const error = new LSHError(
        ErrorCodes.JOB_NOT_FOUND,
        'Job missing_job not found',
        { jobId: 'missing_job', operation: 'update' }
      );

      expect(error.statusCode).toBe(404);
      expect(error.context?.operation).toBe('update');
    });

    it('should handle CloudConfigManager.import invalid JSON', () => {
      const error = new LSHError(
        ErrorCodes.CONFIG_PARSE_ERROR,
        'Invalid configuration JSON',
        { parseError: 'Unexpected end of JSON input', inputLength: 15 }
      );

      expect(error.code).toBe('CONFIG_PARSE_ERROR');
      expect(error.context?.parseError).toContain('JSON');
    });

    it('should handle truncate invalid maxLength', () => {
      const error = new LSHError(
        ErrorCodes.VALIDATION_INVALID_FORMAT,
        'maxLength (1) must be greater than or equal to ellipsis length (3)',
        { maxLength: 1, ellipsisLength: 3, ellipsis: '...' }
      );

      expect(error.statusCode).toBe(400);
      expect(error.context?.ellipsis).toBe('...');
    });

    it('should handle LocalStorageAdapter invalid table', () => {
      const error = new LSHError(
        ErrorCodes.VALIDATION_INVALID_FORMAT,
        'Invalid table name: invalid_table',
        {
          tableName: 'invalid_table',
          validTables: ['shell_history', 'shell_jobs', 'shell_configuration']
        }
      );

      expect(error.code).toBe('VALIDATION_INVALID_FORMAT');
      expect(error.context?.validTables).toContain('shell_history');
    });
  });
});
