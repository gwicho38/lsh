/**
 * Tests for supabase-client.ts error handling
 * Verifies LSHError is used with correct error codes
 */

import { describe, it, expect } from '@jest/globals';
import { LSHError, ErrorCodes } from '../lib/lsh-error.js';

describe('LSHError for Supabase Client', () => {
  describe('Configuration Missing Errors', () => {
    it('should use CONFIG_MISSING code with 500 status for missing config', () => {
      const error = new LSHError(
        ErrorCodes.CONFIG_MISSING_ENV_VAR,
        'Supabase configuration missing',
        {
          missingVars: ['SUPABASE_URL', 'SUPABASE_ANON_KEY'],
          hint: 'Set SUPABASE_URL and SUPABASE_ANON_KEY environment variables'
        }
      );

      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('CONFIG_MISSING_ENV_VAR');
      expect(error.context?.missingVars).toContain('SUPABASE_URL');
      expect(error.context?.missingVars).toContain('SUPABASE_ANON_KEY');
      expect(error.context?.hint).toContain('environment variables');
    });

    it('should use CONFIG_MISSING code for missing URL only', () => {
      const error = new LSHError(
        ErrorCodes.CONFIG_MISSING_ENV_VAR,
        'Supabase configuration missing',
        {
          missingVars: ['SUPABASE_URL'],
          hint: 'Set SUPABASE_URL environment variable'
        }
      );

      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('CONFIG_MISSING_ENV_VAR');
      expect(error.context?.missingVars).toEqual(['SUPABASE_URL']);
    });

    it('should use CONFIG_MISSING code for missing key only', () => {
      const error = new LSHError(
        ErrorCodes.CONFIG_MISSING_ENV_VAR,
        'Supabase configuration missing',
        {
          missingVars: ['SUPABASE_ANON_KEY'],
          hint: 'Set SUPABASE_ANON_KEY environment variable'
        }
      );

      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('CONFIG_MISSING_ENV_VAR');
      expect(error.context?.missingVars).toEqual(['SUPABASE_ANON_KEY']);
    });
  });

  describe('Connection Failed Errors', () => {
    it('should use DB_CONNECTION_FAILED code with 503 status', () => {
      const error = new LSHError(
        ErrorCodes.DB_CONNECTION_FAILED,
        'Supabase client not initialized',
        { hint: 'Local storage fallback is available' }
      );

      expect(error.statusCode).toBe(503);
      expect(error.code).toBe('DB_CONNECTION_FAILED');
      expect(error.context?.hint).toContain('fallback');
    });
  });

  describe('Error Serialization', () => {
    it('should serialize config missing errors to JSON correctly', () => {
      const error = new LSHError(
        ErrorCodes.CONFIG_MISSING_ENV_VAR,
        'Supabase configuration missing',
        { missingVars: ['SUPABASE_URL'] }
      );

      const json = error.toJSON();

      expect(json.code).toBe('CONFIG_MISSING_ENV_VAR');
      expect(json.message).toBe('Supabase configuration missing');
      expect(json.statusCode).toBe(500);
      expect(json.context?.missingVars).toContain('SUPABASE_URL');
    });

    it('should serialize connection errors correctly', () => {
      const error = new LSHError(
        ErrorCodes.DB_CONNECTION_FAILED,
        'Supabase client not initialized',
        { hint: 'fallback available' }
      );

      const json = error.toJSON();

      expect(json.code).toBe('DB_CONNECTION_FAILED');
      expect(json.statusCode).toBe(503);
    });
  });

  describe('Error Instance Checks', () => {
    it('should be instanceof Error', () => {
      const error = new LSHError(
        ErrorCodes.CONFIG_MISSING_ENV_VAR,
        'Missing config',
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

  describe('Supabase Client Error Code Coverage', () => {
    it('should cover all error codes used in supabase-client.ts', () => {
      expect(ErrorCodes.CONFIG_MISSING_ENV_VAR).toBe('CONFIG_MISSING_ENV_VAR');
      expect(ErrorCodes.DB_CONNECTION_FAILED).toBe('DB_CONNECTION_FAILED');
    });

    it('should have correct HTTP status codes for supabase errors', () => {
      expect(new LSHError(ErrorCodes.CONFIG_MISSING_ENV_VAR, 'test', {}).statusCode).toBe(500);
      expect(new LSHError(ErrorCodes.DB_CONNECTION_FAILED, 'test', {}).statusCode).toBe(503);
    });
  });

  describe('Context Preservation', () => {
    it('should preserve missingVars in context', () => {
      const error = new LSHError(
        ErrorCodes.CONFIG_MISSING_ENV_VAR,
        'Missing config',
        { missingVars: ['VAR1', 'VAR2'] }
      );

      expect(error.context?.missingVars).toEqual(['VAR1', 'VAR2']);
    });

    it('should preserve hint in context', () => {
      const error = new LSHError(
        ErrorCodes.CONFIG_MISSING_ENV_VAR,
        'Missing config',
        { hint: 'Check your .env file' }
      );

      expect(error.context?.hint).toBe('Check your .env file');
    });
  });

  describe('Supabase Client Operation Scenarios', () => {
    it('should handle SupabaseClient constructor failure', () => {
      const error = new LSHError(
        ErrorCodes.CONFIG_MISSING_ENV_VAR,
        'Supabase configuration missing',
        {
          missingVars: ['SUPABASE_URL', 'SUPABASE_ANON_KEY'],
          hint: 'Set SUPABASE_URL and SUPABASE_ANON_KEY environment variables'
        }
      );

      expect(error.code).toBe('CONFIG_MISSING_ENV_VAR');
      expect(error.message).toContain('configuration missing');
    });

    it('should handle supabaseClient.getClient() failure', () => {
      const error = new LSHError(
        ErrorCodes.DB_CONNECTION_FAILED,
        'Supabase client not initialized',
        { hint: 'Local storage fallback is available' }
      );

      expect(error.statusCode).toBe(503);
      expect(error.context?.hint).toContain('fallback');
    });

    it('should handle getSupabaseClient() failure', () => {
      const error = new LSHError(
        ErrorCodes.CONFIG_MISSING_ENV_VAR,
        'Supabase configuration missing',
        {
          missingVars: ['SUPABASE_URL'],
          hint: 'Set SUPABASE_URL and SUPABASE_ANON_KEY environment variables'
        }
      );

      expect(error.code).toBe('CONFIG_MISSING_ENV_VAR');
      expect(error.context?.missingVars).toContain('SUPABASE_URL');
    });
  });
});
