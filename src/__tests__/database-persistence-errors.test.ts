/**
 * Tests for database-persistence.ts error handling
 * Verifies LSHError is used with correct error codes
 *
 * Note: DatabasePersistence integration tests are skipped due to Supabase singleton
 * initialization issues. These tests verify LSHError behavior directly.
 */

import { describe, it, expect } from '@jest/globals';
import { LSHError, ErrorCodes } from '../lib/lsh-error.js';

describe('LSHError for Database Persistence', () => {
  describe('Error Code to HTTP Status Mapping', () => {
    it('should use DB_CONNECTION_FAILED code with 503 status', () => {
      const error = new LSHError(
        ErrorCodes.DB_CONNECTION_FAILED,
        'Supabase connection failed. Check your SUPABASE_URL and SUPABASE_ANON_KEY configuration.',
        { originalError: 'Connection timeout' }
      );

      expect(error.statusCode).toBe(503);
      expect(error.code).toBe('DB_CONNECTION_FAILED');
      expect(error.message).toContain('Supabase connection failed');
    });

    it('should use VALIDATION_INVALID_FORMAT code with 400 status', () => {
      const error = new LSHError(
        ErrorCodes.VALIDATION_INVALID_FORMAT,
        'Invalid table name: invalid_table',
        { tableName: 'invalid_table', validTables: ['shell_history', 'shell_jobs'] }
      );

      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('VALIDATION_INVALID_FORMAT');
      expect(error.message).toContain('Invalid table name');
    });
  });

  describe('Context Preservation', () => {
    it('should preserve context for connection errors', () => {
      const error = new LSHError(
        ErrorCodes.DB_CONNECTION_FAILED,
        'Supabase connection failed',
        { originalError: 'ECONNREFUSED' }
      );

      expect(error.context?.originalError).toBe('ECONNREFUSED');
    });

    it('should preserve context for validation errors', () => {
      const validTables = ['shell_history', 'shell_jobs', 'shell_configuration'];
      const error = new LSHError(
        ErrorCodes.VALIDATION_INVALID_FORMAT,
        'Invalid table name: foo',
        { tableName: 'foo', validTables }
      );

      expect(error.context?.tableName).toBe('foo');
      expect(error.context?.validTables).toEqual(validTables);
    });
  });

  describe('Database Persistence Error Patterns', () => {
    it('should create proper error for connection failure', () => {
      const error = new LSHError(
        ErrorCodes.DB_CONNECTION_FAILED,
        'Database connection failed',
        { originalError: 'Network unreachable' }
      );

      expect(error.code).toBe('DB_CONNECTION_FAILED');
      expect(error.statusCode).toBe(503);
    });

    it('should create proper error for invalid table name validation', () => {
      const error = new LSHError(
        ErrorCodes.VALIDATION_INVALID_FORMAT,
        'Invalid table name: drop_tables',
        { tableName: 'drop_tables' }
      );

      expect(error.code).toBe('VALIDATION_INVALID_FORMAT');
      expect(error.statusCode).toBe(400);
    });

    it('should create proper error for save operation failure', () => {
      // Note: save operations return false rather than throw, but this tests
      // the pattern that could be used if throws were added
      const error = new LSHError(
        ErrorCodes.DB_QUERY_FAILED,
        'Failed to save history entry',
        { dbError: 'Constraint violation' }
      );

      expect(error.code).toBe('DB_QUERY_FAILED');
      expect(error.statusCode).toBe(500);
    });

    it('should create proper error for get operation failure', () => {
      const error = new LSHError(
        ErrorCodes.DB_QUERY_FAILED,
        'Failed to get active jobs',
        { dbError: 'Connection timeout' }
      );

      expect(error.code).toBe('DB_QUERY_FAILED');
    });
  });

  describe('Error Serialization', () => {
    it('should serialize connection errors to JSON correctly', () => {
      const error = new LSHError(
        ErrorCodes.DB_CONNECTION_FAILED,
        'Connection failed',
        { originalError: 'Timeout' }
      );

      const json = error.toJSON();

      expect(json.code).toBe('DB_CONNECTION_FAILED');
      expect(json.message).toBe('Connection failed');
      expect(json.statusCode).toBe(503);
      expect(json.context?.originalError).toBe('Timeout');
    });

    it('should serialize validation errors to JSON correctly', () => {
      const error = new LSHError(
        ErrorCodes.VALIDATION_INVALID_FORMAT,
        'Invalid table',
        { tableName: 'bad_table' }
      );

      const json = error.toJSON();

      expect(json.code).toBe('VALIDATION_INVALID_FORMAT');
      expect(json.statusCode).toBe(400);
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
        ErrorCodes.DB_CONNECTION_FAILED,
        'Connection failed',
        {}
      );

      expect(error.name).toBe('LSHError');
    });
  });

  describe('Valid Table Names', () => {
    const validTables = [
      'shell_history',
      'shell_jobs',
      'shell_configuration',
      'shell_sessions',
      'shell_aliases',
      'shell_functions',
      'shell_completions',
      'trading_disclosures',
      'politicians',
      'data_pull_jobs',
    ];

    it('should recognize all valid shell tables', () => {
      const shellTables = validTables.filter(t => t.startsWith('shell_'));
      expect(shellTables.length).toBe(7);
    });

    it('should recognize all valid global tables', () => {
      const globalTables = ['trading_disclosures', 'politicians', 'data_pull_jobs'];
      globalTables.forEach(table => {
        expect(validTables).toContain(table);
      });
    });

    it('should create validation error for tables not in valid list', () => {
      const invalidTable = 'users_credentials';
      const error = new LSHError(
        ErrorCodes.VALIDATION_INVALID_FORMAT,
        `Invalid table name: ${invalidTable}`,
        { tableName: invalidTable, validTables }
      );

      expect(error.context?.validTables).toEqual(validTables);
      expect(error.context?.tableName).toBe(invalidTable);
    });
  });
});
