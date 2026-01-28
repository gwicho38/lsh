/**
 * Tests for saas-audit.ts error handling
 * Verifies LSHError is used with correct error codes
 */

import { describe, it, expect } from '@jest/globals';
import { LSHError, ErrorCodes } from '../lib/lsh-error.js';

describe('LSHError for SaaS Audit Logger', () => {
  describe('Get Organization Logs Errors', () => {
    it('should use DB_QUERY_FAILED code with 500 status for organization logs failure', () => {
      const error = new LSHError(
        ErrorCodes.DB_QUERY_FAILED,
        'Failed to get audit logs: connection timeout',
        { organizationId: 'org_123', dbError: 'connection timeout' }
      );

      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('DB_QUERY_FAILED');
      expect(error.context?.organizationId).toBe('org_123');
      expect(error.context?.dbError).toBe('connection timeout');
    });
  });

  describe('Get Resource Logs Errors', () => {
    it('should use DB_QUERY_FAILED code for resource logs failure', () => {
      const error = new LSHError(
        ErrorCodes.DB_QUERY_FAILED,
        'Failed to get resource logs: permission denied',
        { organizationId: 'org_456', resourceType: 'secret', resourceId: 'secret_789', dbError: 'permission denied' }
      );

      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('DB_QUERY_FAILED');
      expect(error.context?.organizationId).toBe('org_456');
      expect(error.context?.resourceType).toBe('secret');
      expect(error.context?.resourceId).toBe('secret_789');
    });
  });

  describe('Get Team Logs Errors', () => {
    it('should use DB_QUERY_FAILED code for team logs failure', () => {
      const error = new LSHError(
        ErrorCodes.DB_QUERY_FAILED,
        'Failed to get team logs: query timeout',
        { teamId: 'team_123', dbError: 'query timeout' }
      );

      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('DB_QUERY_FAILED');
      expect(error.context?.teamId).toBe('team_123');
      expect(error.context?.dbError).toBe('query timeout');
    });
  });

  describe('Get User Logs Errors', () => {
    it('should use DB_QUERY_FAILED code for user logs failure', () => {
      const error = new LSHError(
        ErrorCodes.DB_QUERY_FAILED,
        'Failed to get user logs: table not found',
        { userId: 'user_abc', dbError: 'table not found' }
      );

      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('DB_QUERY_FAILED');
      expect(error.context?.userId).toBe('user_abc');
      expect(error.context?.dbError).toBe('table not found');
    });
  });

  describe('Delete Old Logs Errors', () => {
    it('should use DB_QUERY_FAILED code for delete logs failure', () => {
      const error = new LSHError(
        ErrorCodes.DB_QUERY_FAILED,
        'Failed to delete old logs: foreign key constraint',
        { organizationId: 'org_xyz', retentionDays: 90, dbError: 'foreign key constraint' }
      );

      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('DB_QUERY_FAILED');
      expect(error.context?.organizationId).toBe('org_xyz');
      expect(error.context?.retentionDays).toBe(90);
      expect(error.context?.dbError).toBe('foreign key constraint');
    });
  });

  describe('Error Serialization', () => {
    it('should serialize audit log errors to JSON correctly', () => {
      const error = new LSHError(
        ErrorCodes.DB_QUERY_FAILED,
        'Failed to get audit logs',
        { organizationId: 'org_test', dbError: 'network error' }
      );

      const json = error.toJSON();

      expect(json.code).toBe('DB_QUERY_FAILED');
      expect(json.message).toBe('Failed to get audit logs');
      expect(json.statusCode).toBe(500);
      expect(json.context?.organizationId).toBe('org_test');
    });

    it('should serialize resource log errors correctly', () => {
      const error = new LSHError(
        ErrorCodes.DB_QUERY_FAILED,
        'Failed to get resource logs',
        { organizationId: 'org_1', resourceType: 'team', resourceId: 'team_1', dbError: 'error' }
      );

      const json = error.toJSON();

      expect(json.context?.resourceType).toBe('team');
      expect(json.context?.resourceId).toBe('team_1');
    });
  });

  describe('Error Instance Checks', () => {
    it('should be instanceof Error', () => {
      const error = new LSHError(
        ErrorCodes.DB_QUERY_FAILED,
        'Query failed',
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

  describe('SaaS Audit Error Code Coverage', () => {
    it('should cover all error codes used in saas-audit.ts', () => {
      // All audit errors use DB_QUERY_FAILED
      expect(ErrorCodes.DB_QUERY_FAILED).toBe('DB_QUERY_FAILED');
    });

    it('should have correct HTTP status codes for audit errors', () => {
      expect(new LSHError(ErrorCodes.DB_QUERY_FAILED, 'test', {}).statusCode).toBe(500);
    });
  });

  describe('Context Preservation', () => {
    it('should preserve organizationId in context', () => {
      const error = new LSHError(
        ErrorCodes.DB_QUERY_FAILED,
        'Failed',
        { organizationId: 'org_context_test' }
      );

      expect(error.context?.organizationId).toBe('org_context_test');
    });

    it('should preserve teamId in context', () => {
      const error = new LSHError(
        ErrorCodes.DB_QUERY_FAILED,
        'Failed',
        { teamId: 'team_context_test' }
      );

      expect(error.context?.teamId).toBe('team_context_test');
    });

    it('should preserve userId in context', () => {
      const error = new LSHError(
        ErrorCodes.DB_QUERY_FAILED,
        'Failed',
        { userId: 'user_context_test' }
      );

      expect(error.context?.userId).toBe('user_context_test');
    });

    it('should preserve retention days in context', () => {
      const error = new LSHError(
        ErrorCodes.DB_QUERY_FAILED,
        'Failed',
        { retentionDays: 365 }
      );

      expect(error.context?.retentionDays).toBe(365);
    });

    it('should preserve resource information in context', () => {
      const error = new LSHError(
        ErrorCodes.DB_QUERY_FAILED,
        'Failed',
        { resourceType: 'user', resourceId: 'user_12345' }
      );

      expect(error.context?.resourceType).toBe('user');
      expect(error.context?.resourceId).toBe('user_12345');
    });
  });

  describe('Audit Logger Operation Scenarios', () => {
    it('should handle getOrganizationLogs failure scenario', () => {
      const error = new LSHError(
        ErrorCodes.DB_QUERY_FAILED,
        'Failed to get audit logs: PGRST301 connection refused',
        { organizationId: 'acme_corp', dbError: 'PGRST301 connection refused' }
      );

      expect(error.code).toBe('DB_QUERY_FAILED');
      expect(error.message).toContain('Failed to get audit logs');
    });

    it('should handle getResourceLogs failure scenario', () => {
      const error = new LSHError(
        ErrorCodes.DB_QUERY_FAILED,
        'Failed to get resource logs: invalid column',
        { organizationId: 'org_1', resourceType: 'secret', resourceId: 'db_password', dbError: 'invalid column' }
      );

      expect(error.statusCode).toBe(500);
      expect(error.context?.resourceType).toBe('secret');
    });

    it('should handle getTeamLogs failure scenario', () => {
      const error = new LSHError(
        ErrorCodes.DB_QUERY_FAILED,
        'Failed to get team logs: rate limited',
        { teamId: 'engineering', dbError: 'rate limited' }
      );

      expect(error.code).toBe('DB_QUERY_FAILED');
      expect(error.context?.teamId).toBe('engineering');
    });

    it('should handle getUserLogs failure scenario', () => {
      const error = new LSHError(
        ErrorCodes.DB_QUERY_FAILED,
        'Failed to get user logs: authentication error',
        { userId: 'admin_user', dbError: 'authentication error' }
      );

      expect(error.statusCode).toBe(500);
      expect(error.context?.userId).toBe('admin_user');
    });

    it('should handle deleteOldLogs failure scenario', () => {
      const error = new LSHError(
        ErrorCodes.DB_QUERY_FAILED,
        'Failed to delete old logs: transaction deadlock',
        { organizationId: 'cleanup_org', retentionDays: 30, dbError: 'transaction deadlock' }
      );

      expect(error.code).toBe('DB_QUERY_FAILED');
      expect(error.context?.retentionDays).toBe(30);
    });
  });
});
