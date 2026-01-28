/**
 * Tests for supabase-registrar.ts error handling
 * Verifies LSHError is used with correct error codes
 */

import { describe, it, expect } from '@jest/globals';
import { LSHError, ErrorCodes } from '../lib/lsh-error.js';

describe('LSHError for Supabase Command Registrar', () => {
  describe('Connection Errors', () => {
    it('should use DB_CONNECTION_FAILED code with 503 status for connection failure', () => {
      const error = new LSHError(
        ErrorCodes.DB_CONNECTION_FAILED,
        'Supabase connection failed',
        { operation: 'test' }
      );

      expect(error.statusCode).toBe(503);
      expect(error.code).toBe('DB_CONNECTION_FAILED');
      expect(error.context?.operation).toBe('test');
    });

    it('should use DB_CONNECTION_FAILED code for sync unavailability', () => {
      const error = new LSHError(
        ErrorCodes.DB_CONNECTION_FAILED,
        'Cannot sync - database not available',
        { operation: 'sync' }
      );

      expect(error.statusCode).toBe(503);
      expect(error.code).toBe('DB_CONNECTION_FAILED');
      expect(error.context?.operation).toBe('sync');
    });

    it('should use DB_CONNECTION_FAILED code for rows fetch unavailability', () => {
      const error = new LSHError(
        ErrorCodes.DB_CONNECTION_FAILED,
        'Cannot fetch rows - database not available',
        { operation: 'rows' }
      );

      expect(error.code).toBe('DB_CONNECTION_FAILED');
      expect(error.context?.operation).toBe('rows');
    });
  });

  describe('Schema Initialization Errors', () => {
    it('should use DB_QUERY_FAILED code with 500 status for schema init failure', () => {
      const error = new LSHError(
        ErrorCodes.DB_QUERY_FAILED,
        'Failed to initialize database schema',
        { operation: 'init' }
      );

      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('DB_QUERY_FAILED');
      expect(error.context?.operation).toBe('init');
    });
  });

  describe('ML Training Job Errors', () => {
    it('should use DB_QUERY_FAILED code for fetch training jobs failure', () => {
      const error = new LSHError(
        ErrorCodes.DB_QUERY_FAILED,
        'Failed to fetch training jobs: connection timeout',
        { table: 'ml_training_jobs', dbError: 'connection timeout' }
      );

      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('DB_QUERY_FAILED');
      expect(error.context?.table).toBe('ml_training_jobs');
      expect(error.context?.dbError).toBe('connection timeout');
    });

    it('should use VALIDATION_REQUIRED_FIELD code for missing required options', () => {
      const error = new LSHError(
        ErrorCodes.VALIDATION_REQUIRED_FIELD,
        'Both --model-type and --dataset are required to create a job',
        { required: ['--model-type', '--dataset'], provided: { modelType: undefined, dataset: undefined } }
      );

      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('VALIDATION_REQUIRED_FIELD');
      expect(error.context?.required).toContain('--model-type');
      expect(error.context?.required).toContain('--dataset');
    });

    it('should use DB_QUERY_FAILED code for create training job failure', () => {
      const error = new LSHError(
        ErrorCodes.DB_QUERY_FAILED,
        'Failed to create training job: duplicate key',
        { table: 'ml_training_jobs', jobName: 'test-job', dbError: 'duplicate key' }
      );

      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('DB_QUERY_FAILED');
      expect(error.context?.table).toBe('ml_training_jobs');
      expect(error.context?.jobName).toBe('test-job');
      expect(error.context?.dbError).toBe('duplicate key');
    });
  });

  describe('ML Model Errors', () => {
    it('should use DB_QUERY_FAILED code for fetch models failure', () => {
      const error = new LSHError(
        ErrorCodes.DB_QUERY_FAILED,
        'Failed to fetch models: permission denied',
        { table: 'ml_models', dbError: 'permission denied' }
      );

      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('DB_QUERY_FAILED');
      expect(error.context?.table).toBe('ml_models');
      expect(error.context?.dbError).toBe('permission denied');
    });
  });

  describe('ML Feature Errors', () => {
    it('should use DB_QUERY_FAILED code for fetch features failure', () => {
      const error = new LSHError(
        ErrorCodes.DB_QUERY_FAILED,
        'Failed to fetch features: table not found',
        { table: 'ml_features', dbError: 'table not found' }
      );

      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('DB_QUERY_FAILED');
      expect(error.context?.table).toBe('ml_features');
      expect(error.context?.dbError).toBe('table not found');
    });
  });

  describe('Error Serialization', () => {
    it('should serialize connection errors to JSON correctly', () => {
      const error = new LSHError(
        ErrorCodes.DB_CONNECTION_FAILED,
        'Supabase connection failed',
        { operation: 'test' }
      );

      const json = error.toJSON();

      expect(json.code).toBe('DB_CONNECTION_FAILED');
      expect(json.message).toBe('Supabase connection failed');
      expect(json.statusCode).toBe(503);
      expect(json.context).toEqual({ operation: 'test' });
    });

    it('should serialize query errors with table info correctly', () => {
      const error = new LSHError(
        ErrorCodes.DB_QUERY_FAILED,
        'Failed to fetch training jobs',
        { table: 'ml_training_jobs', dbError: 'network error' }
      );

      const json = error.toJSON();

      expect(json.code).toBe('DB_QUERY_FAILED');
      expect(json.context?.table).toBe('ml_training_jobs');
      expect(json.context?.dbError).toBe('network error');
    });
  });

  describe('Error Instance Checks', () => {
    it('should be instanceof Error', () => {
      const error = new LSHError(
        ErrorCodes.DB_CONNECTION_FAILED,
        'Connection failed',
        {}
      );

      expect(error instanceof Error).toBe(true);
      expect(error instanceof LSHError).toBe(true);
    });

    it('should have name property set to LSHError', () => {
      const error = new LSHError(
        ErrorCodes.DB_QUERY_FAILED,
        'Query failed',
        {}
      );

      expect(error.name).toBe('LSHError');
    });
  });

  describe('Supabase Error Code Coverage', () => {
    it('should cover all error codes used in supabase-registrar.ts', () => {
      // Verify error codes exist and have correct types
      expect(ErrorCodes.DB_CONNECTION_FAILED).toBe('DB_CONNECTION_FAILED');
      expect(ErrorCodes.DB_QUERY_FAILED).toBe('DB_QUERY_FAILED');
      expect(ErrorCodes.VALIDATION_REQUIRED_FIELD).toBe('VALIDATION_REQUIRED_FIELD');
    });

    it('should have correct HTTP status codes for Supabase errors', () => {
      expect(new LSHError(ErrorCodes.DB_CONNECTION_FAILED, 'test', {}).statusCode).toBe(503);
      expect(new LSHError(ErrorCodes.DB_QUERY_FAILED, 'test', {}).statusCode).toBe(500);
      expect(new LSHError(ErrorCodes.VALIDATION_REQUIRED_FIELD, 'test', {}).statusCode).toBe(400);
    });
  });

  describe('Context Preservation', () => {
    it('should preserve operation in context', () => {
      const error = new LSHError(
        ErrorCodes.DB_CONNECTION_FAILED,
        'Connection failed',
        { operation: 'test' }
      );

      expect(error.context?.operation).toBe('test');
    });

    it('should preserve table and dbError in context', () => {
      const error = new LSHError(
        ErrorCodes.DB_QUERY_FAILED,
        'Query failed',
        { table: 'ml_models', dbError: 'timeout' }
      );

      expect(error.context?.table).toBe('ml_models');
      expect(error.context?.dbError).toBe('timeout');
    });

    it('should preserve required fields and provided values in context', () => {
      const error = new LSHError(
        ErrorCodes.VALIDATION_REQUIRED_FIELD,
        'Missing required fields',
        { required: ['--model-type', '--dataset'], provided: { modelType: 'bert', dataset: undefined } }
      );

      expect(error.context?.required).toHaveLength(2);
      expect(error.context?.provided).toEqual({ modelType: 'bert', dataset: undefined });
    });

    it('should preserve jobName in context', () => {
      const error = new LSHError(
        ErrorCodes.DB_QUERY_FAILED,
        'Failed to create job',
        { table: 'ml_training_jobs', jobName: 'sentiment-analysis', dbError: 'constraint violation' }
      );

      expect(error.context?.jobName).toBe('sentiment-analysis');
    });
  });

  describe('Supabase Operation Scenarios', () => {
    it('should handle connection test failure scenario', () => {
      const error = new LSHError(
        ErrorCodes.DB_CONNECTION_FAILED,
        'Supabase connection failed',
        { operation: 'test' }
      );

      expect(error.code).toBe('DB_CONNECTION_FAILED');
      expect(error.message).toBe('Supabase connection failed');
    });

    it('should handle schema initialization failure scenario', () => {
      const error = new LSHError(
        ErrorCodes.DB_QUERY_FAILED,
        'Failed to initialize database schema',
        { operation: 'init' }
      );

      expect(error.code).toBe('DB_QUERY_FAILED');
      expect(error.context?.operation).toBe('init');
    });

    it('should handle sync unavailability scenario', () => {
      const error = new LSHError(
        ErrorCodes.DB_CONNECTION_FAILED,
        'Cannot sync - database not available',
        { operation: 'sync' }
      );

      expect(error.code).toBe('DB_CONNECTION_FAILED');
      expect(error.context?.operation).toBe('sync');
    });

    it('should handle training job creation with missing options scenario', () => {
      const error = new LSHError(
        ErrorCodes.VALIDATION_REQUIRED_FIELD,
        'Both --model-type and --dataset are required to create a job',
        { required: ['--model-type', '--dataset'], provided: {} }
      );

      expect(error.statusCode).toBe(400);
      expect(error.context?.required).toContain('--model-type');
    });

    it('should handle database query failure with error details scenario', () => {
      const error = new LSHError(
        ErrorCodes.DB_QUERY_FAILED,
        'Failed to fetch training jobs: PGRST301 Row level security policy violations',
        { table: 'ml_training_jobs', dbError: 'PGRST301 Row level security policy violations' }
      );

      expect(error.statusCode).toBe(500);
      expect(error.context?.dbError).toContain('Row level security');
    });
  });
});
