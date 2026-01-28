/**
 * Tests for saas-organizations.ts error handling
 * Verifies LSHError is used with correct error codes
 *
 * Note: OrganizationService/TeamService integration tests are skipped due to
 * Supabase singleton initialization issues. These tests verify LSHError behavior directly.
 */

import { describe, it, expect } from '@jest/globals';
import { LSHError, ErrorCodes } from '../lib/lsh-error.js';

describe('LSHError for Organization Service', () => {
  describe('Error Code to HTTP Status Mapping', () => {
    it('should use RESOURCE_ALREADY_EXISTS code with 409 status', () => {
      const error = new LSHError(
        ErrorCodes.RESOURCE_ALREADY_EXISTS,
        'Organization slug already taken',
        { slug: 'my-org', resource: 'organization' }
      );

      expect(error.statusCode).toBe(409);
      expect(error.code).toBe('RESOURCE_ALREADY_EXISTS');
      expect(error.message).toBe('Organization slug already taken');
    });

    it('should use RESOURCE_NOT_FOUND code with 404 status', () => {
      const error = new LSHError(ErrorCodes.RESOURCE_NOT_FOUND, 'Organization not found', {
        organizationId: 'org-123',
        resource: 'organization',
      });

      expect(error.statusCode).toBe(404);
      expect(error.code).toBe('RESOURCE_NOT_FOUND');
    });

    it('should use DB_QUERY_FAILED code with 500 status', () => {
      const error = new LSHError(ErrorCodes.DB_QUERY_FAILED, 'Failed to create organization', {
        name: 'My Org',
        slug: 'my-org',
        dbError: 'Connection timeout',
      });

      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('DB_QUERY_FAILED');
    });

    it('should use BILLING_TIER_LIMIT_EXCEEDED code with 429 status', () => {
      const error = new LSHError(
        ErrorCodes.BILLING_TIER_LIMIT_EXCEEDED,
        'Team member limit reached. Please upgrade your plan.',
        {
          organizationId: 'org-123',
          currentCount: 5,
          limit: 5,
          tier: 'free',
        }
      );

      expect(error.statusCode).toBe(429);
      expect(error.code).toBe('BILLING_TIER_LIMIT_EXCEEDED');
    });
  });

  describe('Context Preservation', () => {
    it('should preserve context for organization slug conflicts', () => {
      const error = new LSHError(
        ErrorCodes.RESOURCE_ALREADY_EXISTS,
        'Organization slug already taken',
        { slug: 'my-org', resource: 'organization' }
      );

      expect(error.context?.slug).toBe('my-org');
      expect(error.context?.resource).toBe('organization');
    });

    it('should preserve context for member already exists', () => {
      const error = new LSHError(ErrorCodes.RESOURCE_ALREADY_EXISTS, 'User is already a member', {
        organizationId: 'org-123',
        userId: 'user-456',
        resource: 'member',
      });

      expect(error.context?.organizationId).toBe('org-123');
      expect(error.context?.userId).toBe('user-456');
      expect(error.context?.resource).toBe('member');
    });

    it('should preserve context for database errors', () => {
      const error = new LSHError(ErrorCodes.DB_QUERY_FAILED, 'Failed to add member', {
        organizationId: 'org-123',
        userId: 'user-456',
        dbError: 'Foreign key constraint violation',
      });

      expect(error.context?.organizationId).toBe('org-123');
      expect(error.context?.userId).toBe('user-456');
      expect(error.context?.dbError).toBe('Foreign key constraint violation');
    });

    it('should preserve context for tier limit errors', () => {
      const error = new LSHError(
        ErrorCodes.BILLING_TIER_LIMIT_EXCEEDED,
        'Team member limit reached',
        {
          organizationId: 'org-123',
          currentCount: 5,
          limit: 5,
          tier: 'free',
        }
      );

      expect(error.context?.organizationId).toBe('org-123');
      expect(error.context?.currentCount).toBe(5);
      expect(error.context?.limit).toBe(5);
      expect(error.context?.tier).toBe('free');
    });
  });

  describe('Organization-Specific Error Patterns', () => {
    it('should create proper error for organization creation failure', () => {
      const error = new LSHError(ErrorCodes.DB_QUERY_FAILED, 'Failed to create organization', {
        name: 'Test Org',
        slug: 'test-org',
        dbError: 'Unique constraint violation',
      });

      expect(error.code).toBe('DB_QUERY_FAILED');
      expect(error.statusCode).toBe(500);
      expect(error.context?.name).toBe('Test Org');
      expect(error.context?.slug).toBe('test-org');
    });

    it('should create proper error for organization update failure', () => {
      const error = new LSHError(ErrorCodes.DB_QUERY_FAILED, 'Failed to update organization', {
        organizationId: 'org-123',
        dbError: 'Update failed',
      });

      expect(error.code).toBe('DB_QUERY_FAILED');
      expect(error.context?.organizationId).toBe('org-123');
    });

    it('should create proper error for organization delete failure', () => {
      const error = new LSHError(ErrorCodes.DB_QUERY_FAILED, 'Failed to delete organization', {
        organizationId: 'org-123',
        dbError: 'Delete failed',
      });

      expect(error.code).toBe('DB_QUERY_FAILED');
    });

    it('should create proper error for organization not found', () => {
      const error = new LSHError(ErrorCodes.RESOURCE_NOT_FOUND, 'Organization not found', {
        organizationId: 'org-123',
        resource: 'organization',
      });

      expect(error.code).toBe('RESOURCE_NOT_FOUND');
      expect(error.statusCode).toBe(404);
    });

    it('should create proper error for member add failure', () => {
      const error = new LSHError(ErrorCodes.DB_QUERY_FAILED, 'Failed to add member', {
        organizationId: 'org-123',
        userId: 'user-456',
        dbError: 'Insert failed',
      });

      expect(error.code).toBe('DB_QUERY_FAILED');
      expect(error.context?.userId).toBe('user-456');
    });

    it('should create proper error for member role update failure', () => {
      const error = new LSHError(ErrorCodes.DB_QUERY_FAILED, 'Failed to update member role', {
        organizationId: 'org-123',
        userId: 'user-456',
        newRole: 'admin',
        dbError: 'Update failed',
      });

      expect(error.code).toBe('DB_QUERY_FAILED');
      expect(error.context?.newRole).toBe('admin');
    });

    it('should create proper error for member remove failure', () => {
      const error = new LSHError(ErrorCodes.DB_QUERY_FAILED, 'Failed to remove member', {
        organizationId: 'org-123',
        userId: 'user-456',
        dbError: 'Delete failed',
      });

      expect(error.code).toBe('DB_QUERY_FAILED');
    });

    it('should create proper error for get members failure', () => {
      const error = new LSHError(ErrorCodes.DB_QUERY_FAILED, 'Failed to get members', {
        organizationId: 'org-123',
        dbError: 'Query failed',
      });

      expect(error.code).toBe('DB_QUERY_FAILED');
    });

    it('should create proper error for get usage summary failure', () => {
      const error = new LSHError(ErrorCodes.DB_QUERY_FAILED, 'Failed to get usage summary', {
        organizationId: 'org-123',
        dbError: 'View not found',
      });

      expect(error.code).toBe('DB_QUERY_FAILED');
      expect(error.context?.dbError).toBe('View not found');
    });
  });
});

describe('LSHError for Team Service', () => {
  describe('Team-Specific Error Patterns', () => {
    it('should create proper error for team slug conflict', () => {
      const error = new LSHError(
        ErrorCodes.RESOURCE_ALREADY_EXISTS,
        'Team slug already taken in this organization',
        { organizationId: 'org-123', slug: 'dev-team', resource: 'team' }
      );

      expect(error.code).toBe('RESOURCE_ALREADY_EXISTS');
      expect(error.statusCode).toBe(409);
      expect(error.context?.organizationId).toBe('org-123');
      expect(error.context?.slug).toBe('dev-team');
    });

    it('should create proper error for team creation failure', () => {
      const error = new LSHError(ErrorCodes.DB_QUERY_FAILED, 'Failed to create team', {
        organizationId: 'org-123',
        name: 'Dev Team',
        slug: 'dev-team',
        dbError: 'Insert failed',
      });

      expect(error.code).toBe('DB_QUERY_FAILED');
      expect(error.context?.name).toBe('Dev Team');
    });

    it('should create proper error for get teams failure', () => {
      const error = new LSHError(ErrorCodes.DB_QUERY_FAILED, 'Failed to get teams', {
        organizationId: 'org-123',
        dbError: 'Query timeout',
      });

      expect(error.code).toBe('DB_QUERY_FAILED');
    });

    it('should create proper error for team update failure', () => {
      const error = new LSHError(ErrorCodes.DB_QUERY_FAILED, 'Failed to update team', {
        teamId: 'team-123',
        dbError: 'Update failed',
      });

      expect(error.code).toBe('DB_QUERY_FAILED');
      expect(error.context?.teamId).toBe('team-123');
    });

    it('should create proper error for team not found', () => {
      const error = new LSHError(ErrorCodes.RESOURCE_NOT_FOUND, 'Team not found', {
        teamId: 'team-123',
        resource: 'team',
      });

      expect(error.code).toBe('RESOURCE_NOT_FOUND');
      expect(error.statusCode).toBe(404);
      expect(error.context?.teamId).toBe('team-123');
    });

    it('should create proper error for team delete failure', () => {
      const error = new LSHError(ErrorCodes.DB_QUERY_FAILED, 'Failed to delete team', {
        teamId: 'team-123',
        dbError: 'Delete failed',
      });

      expect(error.code).toBe('DB_QUERY_FAILED');
    });

    it('should create proper error for add team member failure', () => {
      const error = new LSHError(ErrorCodes.DB_QUERY_FAILED, 'Failed to add team member', {
        teamId: 'team-123',
        userId: 'user-456',
        role: 'member',
        dbError: 'Insert failed',
      });

      expect(error.code).toBe('DB_QUERY_FAILED');
      expect(error.context?.role).toBe('member');
    });

    it('should create proper error for remove team member failure', () => {
      const error = new LSHError(ErrorCodes.DB_QUERY_FAILED, 'Failed to remove team member', {
        teamId: 'team-123',
        userId: 'user-456',
        dbError: 'Delete failed',
      });

      expect(error.code).toBe('DB_QUERY_FAILED');
    });

    it('should create proper error for get team members failure', () => {
      const error = new LSHError(ErrorCodes.DB_QUERY_FAILED, 'Failed to get team members', {
        teamId: 'team-123',
        dbError: 'Query failed',
      });

      expect(error.code).toBe('DB_QUERY_FAILED');
      expect(error.context?.teamId).toBe('team-123');
    });
  });

  describe('Error Serialization', () => {
    it('should serialize organization errors to JSON correctly', () => {
      const error = new LSHError(
        ErrorCodes.RESOURCE_ALREADY_EXISTS,
        'Organization slug already taken',
        { slug: 'my-org' }
      );

      const json = error.toJSON();

      expect(json.code).toBe('RESOURCE_ALREADY_EXISTS');
      expect(json.message).toBe('Organization slug already taken');
      expect(json.statusCode).toBe(409);
      expect(json.context?.slug).toBe('my-org');
    });

    it('should serialize team errors to JSON correctly', () => {
      const error = new LSHError(ErrorCodes.RESOURCE_NOT_FOUND, 'Team not found', {
        teamId: 'team-123',
      });

      const json = error.toJSON();

      expect(json.code).toBe('RESOURCE_NOT_FOUND');
      expect(json.statusCode).toBe(404);
    });
  });

  describe('Error Instance Checks', () => {
    it('should be instanceof Error', () => {
      const error = new LSHError(
        ErrorCodes.RESOURCE_ALREADY_EXISTS,
        'Organization slug already taken',
        {}
      );

      expect(error instanceof Error).toBe(true);
      expect(error instanceof LSHError).toBe(true);
    });

    it('should have name property set to LSHError', () => {
      const error = new LSHError(ErrorCodes.DB_QUERY_FAILED, 'Failed to create organization', {});

      expect(error.name).toBe('LSHError');
    });
  });
});
