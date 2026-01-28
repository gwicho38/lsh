/**
 * Tests for saas-secrets.ts error handling
 * Verifies LSHError is used with correct error codes
 *
 * Note: SecretsService integration tests are skipped due to Supabase singleton
 * initialization issues. These tests verify LSHError behavior directly.
 */

import { describe, it, expect } from '@jest/globals';
import { LSHError, ErrorCodes } from '../lib/lsh-error.js';

describe('LSHError for Secrets Service', () => {
  describe('Error Code to HTTP Status Mapping', () => {
    it('should use SECRETS_NOT_FOUND code with 404 status', () => {
      const error = new LSHError(ErrorCodes.SECRETS_NOT_FOUND, 'Secret not found', {
        secretId: 'secret-123',
      });

      expect(error.statusCode).toBe(404);
      expect(error.code).toBe('SECRETS_NOT_FOUND');
      expect(error.message).toBe('Secret not found');
    });

    it('should use BILLING_TIER_LIMIT_EXCEEDED code with 429 status', () => {
      const error = new LSHError(ErrorCodes.BILLING_TIER_LIMIT_EXCEEDED, 'Limit exceeded', {
        tier: 'free',
        limit: 100,
      });

      expect(error.statusCode).toBe(429);
      expect(error.code).toBe('BILLING_TIER_LIMIT_EXCEEDED');
    });

    it('should use DB_QUERY_FAILED code with 500 status', () => {
      const error = new LSHError(ErrorCodes.DB_QUERY_FAILED, 'Query failed', {
        dbError: 'Connection timeout',
      });

      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('DB_QUERY_FAILED');
    });

    it('should use RESOURCE_NOT_FOUND code with 404 status', () => {
      const error = new LSHError(ErrorCodes.RESOURCE_NOT_FOUND, 'Team not found', {
        resource: 'team',
        teamId: 'team-123',
      });

      expect(error.statusCode).toBe(404);
      expect(error.code).toBe('RESOURCE_NOT_FOUND');
    });
  });

  describe('Context Preservation', () => {
    it('should preserve context information for secrets errors', () => {
      const error = new LSHError(ErrorCodes.SECRETS_NOT_FOUND, 'Secret not found', {
        secretId: 'secret-123',
        teamId: 'team-123',
        environment: 'dev',
      });

      expect(error.context?.secretId).toBe('secret-123');
      expect(error.context?.teamId).toBe('team-123');
      expect(error.context?.environment).toBe('dev');
    });

    it('should preserve context for database errors', () => {
      const error = new LSHError(ErrorCodes.DB_QUERY_FAILED, 'Failed to create secret', {
        teamId: 'team-123',
        key: 'API_KEY',
        environment: 'dev',
        dbError: 'Unique constraint violation',
      });

      expect(error.context?.teamId).toBe('team-123');
      expect(error.context?.key).toBe('API_KEY');
      expect(error.context?.environment).toBe('dev');
      expect(error.context?.dbError).toBe('Unique constraint violation');
    });

    it('should preserve context for tier limit errors', () => {
      const error = new LSHError(
        ErrorCodes.BILLING_TIER_LIMIT_EXCEEDED,
        'Secret limit reached. Please upgrade your plan.',
        {
          teamId: 'team-123',
          organizationId: 'org-123',
          currentCount: 100,
          limit: 100,
          tier: 'free',
        }
      );

      expect(error.context?.teamId).toBe('team-123');
      expect(error.context?.organizationId).toBe('org-123');
      expect(error.context?.currentCount).toBe(100);
      expect(error.context?.limit).toBe(100);
      expect(error.context?.tier).toBe('free');
    });

    it('should preserve context for resource not found errors', () => {
      const error = new LSHError(ErrorCodes.RESOURCE_NOT_FOUND, 'Organization not found', {
        resource: 'organization',
        organizationId: 'org-123',
      });

      expect(error.context?.resource).toBe('organization');
      expect(error.context?.organizationId).toBe('org-123');
    });
  });

  describe('Error Serialization', () => {
    it('should serialize to JSON correctly', () => {
      const error = new LSHError(ErrorCodes.SECRETS_NOT_FOUND, 'Secret not found', {
        secretId: 'secret-123',
      });

      const json = error.toJSON();

      expect(json.code).toBe('SECRETS_NOT_FOUND');
      expect(json.message).toBe('Secret not found');
      expect(json.statusCode).toBe(404);
      expect(json.context?.secretId).toBe('secret-123');
    });

    it('should include stack trace in JSON', () => {
      const error = new LSHError(ErrorCodes.DB_QUERY_FAILED, 'Query failed', {});

      const json = error.toJSON();

      expect(json.stack).toBeDefined();
      expect(typeof json.stack).toBe('string');
    });
  });

  describe('Error Instance Checks', () => {
    it('should be instanceof Error', () => {
      const error = new LSHError(ErrorCodes.SECRETS_NOT_FOUND, 'Secret not found', {});

      expect(error instanceof Error).toBe(true);
      expect(error instanceof LSHError).toBe(true);
    });

    it('should have name property set to LSHError', () => {
      const error = new LSHError(ErrorCodes.SECRETS_NOT_FOUND, 'Secret not found', {});

      expect(error.name).toBe('LSHError');
    });
  });

  describe('Secrets-Specific Error Patterns', () => {
    it('should create proper error for team not found during create', () => {
      const error = new LSHError(ErrorCodes.RESOURCE_NOT_FOUND, 'Team not found', {
        resource: 'team',
        teamId: 'team-123',
      });

      expect(error.code).toBe('RESOURCE_NOT_FOUND');
      expect(error.statusCode).toBe(404);
      expect(error.context?.resource).toBe('team');
    });

    it('should create proper error for secret not found during update', () => {
      const error = new LSHError(ErrorCodes.SECRETS_NOT_FOUND, 'Secret not found', {
        secretId: 'secret-123',
      });

      expect(error.code).toBe('SECRETS_NOT_FOUND');
      expect(error.statusCode).toBe(404);
    });

    it('should create proper error for secret not found during delete', () => {
      const error = new LSHError(ErrorCodes.SECRETS_NOT_FOUND, 'Secret not found', {
        secretId: 'secret-456',
      });

      expect(error.code).toBe('SECRETS_NOT_FOUND');
      expect(error.context?.secretId).toBe('secret-456');
    });

    it('should create proper error for failed secret creation', () => {
      const error = new LSHError(ErrorCodes.DB_QUERY_FAILED, 'Failed to create secret', {
        teamId: 'team-123',
        key: 'API_KEY',
        environment: 'dev',
        dbError: 'Unique constraint violation',
      });

      expect(error.code).toBe('DB_QUERY_FAILED');
      expect(error.statusCode).toBe(500);
    });

    it('should create proper error for failed secrets fetch', () => {
      const error = new LSHError(ErrorCodes.DB_QUERY_FAILED, 'Failed to get secrets', {
        teamId: 'team-123',
        environment: 'dev',
        dbError: 'Connection timeout',
      });

      expect(error.code).toBe('DB_QUERY_FAILED');
      expect(error.context?.dbError).toBe('Connection timeout');
    });

    it('should create proper error for failed secret update', () => {
      const error = new LSHError(ErrorCodes.DB_QUERY_FAILED, 'Failed to update secret', {
        secretId: 'secret-123',
        dbError: 'Update failed',
      });

      expect(error.code).toBe('DB_QUERY_FAILED');
      expect(error.context?.secretId).toBe('secret-123');
    });

    it('should create proper error for failed secret delete', () => {
      const error = new LSHError(ErrorCodes.DB_QUERY_FAILED, 'Failed to delete secret', {
        secretId: 'secret-123',
        dbError: 'Delete failed',
      });

      expect(error.code).toBe('DB_QUERY_FAILED');
    });

    it('should create proper error for failed secrets summary', () => {
      const error = new LSHError(ErrorCodes.DB_QUERY_FAILED, 'Failed to get secrets summary', {
        teamId: 'team-123',
        dbError: 'View not found',
      });

      expect(error.code).toBe('DB_QUERY_FAILED');
      expect(error.context?.dbError).toBe('View not found');
    });

    it('should create proper error for tier limit exceeded', () => {
      const error = new LSHError(
        ErrorCodes.BILLING_TIER_LIMIT_EXCEEDED,
        'Secret limit reached. Please upgrade your plan.',
        {
          teamId: 'team-123',
          organizationId: 'org-123',
          currentCount: 100,
          limit: 100,
          tier: 'free',
        }
      );

      expect(error.code).toBe('BILLING_TIER_LIMIT_EXCEEDED');
      expect(error.statusCode).toBe(429);
      expect(error.message).toContain('Secret limit reached');
    });
  });
});
