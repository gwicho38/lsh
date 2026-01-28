/**
 * Tests for saas-types.ts error handling
 * Verifies LSHError is used with correct error codes
 */

import { describe, it, expect } from '@jest/globals';
import { LSHError, ErrorCodes } from '../lib/lsh-error.js';

describe('LSHError for SaaS Types', () => {
  describe('JWT Validation Errors', () => {
    it('should use AUTH_INVALID_TOKEN code with 401 status for missing required fields', () => {
      const error = new LSHError(
        ErrorCodes.AUTH_INVALID_TOKEN,
        'Invalid token payload: missing required fields (sub, type)',
        { decodedType: 'object' }
      );

      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('AUTH_INVALID_TOKEN');
      expect(error.context?.decodedType).toBe('object');
    });

    it('should use AUTH_INVALID_TOKEN code for missing email in access token', () => {
      const error = new LSHError(
        ErrorCodes.AUTH_INVALID_TOKEN,
        'Invalid access token payload: missing email field',
        { tokenType: 'access', userId: 'user_123' }
      );

      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('AUTH_INVALID_TOKEN');
      expect(error.context?.tokenType).toBe('access');
      expect(error.context?.userId).toBe('user_123');
    });

    it('should use AUTH_INVALID_TOKEN code for invalid token type', () => {
      const error = new LSHError(
        ErrorCodes.AUTH_INVALID_TOKEN,
        'Invalid token type: unknown',
        { tokenType: 'unknown', expectedTypes: ['access', 'refresh'] }
      );

      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('AUTH_INVALID_TOKEN');
      expect(error.context?.tokenType).toBe('unknown');
      expect(error.context?.expectedTypes).toContain('access');
      expect(error.context?.expectedTypes).toContain('refresh');
    });
  });

  describe('Authentication Errors', () => {
    it('should use AUTH_UNAUTHORIZED code with 401 status for unauthenticated user', () => {
      const error = new LSHError(
        ErrorCodes.AUTH_UNAUTHORIZED,
        'User not authenticated',
        { hint: 'Request must pass through authenticateUser middleware first' }
      );

      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('AUTH_UNAUTHORIZED');
      expect(error.context?.hint).toContain('middleware');
    });
  });

  describe('Error Serialization', () => {
    it('should serialize JWT errors to JSON correctly', () => {
      const error = new LSHError(
        ErrorCodes.AUTH_INVALID_TOKEN,
        'Invalid token',
        { tokenType: 'access' }
      );

      const json = error.toJSON();

      expect(json.code).toBe('AUTH_INVALID_TOKEN');
      expect(json.message).toBe('Invalid token');
      expect(json.statusCode).toBe(401);
      expect(json.context?.tokenType).toBe('access');
    });

    it('should serialize auth errors correctly', () => {
      const error = new LSHError(
        ErrorCodes.AUTH_UNAUTHORIZED,
        'Not authenticated',
        { hint: 'Use middleware' }
      );

      const json = error.toJSON();

      expect(json.code).toBe('AUTH_UNAUTHORIZED');
      expect(json.statusCode).toBe(401);
    });
  });

  describe('Error Instance Checks', () => {
    it('should be instanceof Error', () => {
      const error = new LSHError(
        ErrorCodes.AUTH_INVALID_TOKEN,
        'Invalid token',
        {}
      );

      expect(error instanceof Error).toBe(true);
      expect(error instanceof LSHError).toBe(true);
    });

    it('should have name property set to LSHError', () => {
      const error = new LSHError(
        ErrorCodes.AUTH_UNAUTHORIZED,
        'Unauthorized',
        {}
      );

      expect(error.name).toBe('LSHError');
    });
  });

  describe('SaaS Types Error Code Coverage', () => {
    it('should cover all error codes used in saas-types.ts', () => {
      expect(ErrorCodes.AUTH_INVALID_TOKEN).toBe('AUTH_INVALID_TOKEN');
      expect(ErrorCodes.AUTH_UNAUTHORIZED).toBe('AUTH_UNAUTHORIZED');
    });

    it('should have correct HTTP status codes for auth errors', () => {
      expect(new LSHError(ErrorCodes.AUTH_INVALID_TOKEN, 'test', {}).statusCode).toBe(401);
      expect(new LSHError(ErrorCodes.AUTH_UNAUTHORIZED, 'test', {}).statusCode).toBe(401);
    });
  });

  describe('Context Preservation', () => {
    it('should preserve decodedType in context', () => {
      const error = new LSHError(
        ErrorCodes.AUTH_INVALID_TOKEN,
        'Invalid payload',
        { decodedType: 'undefined' }
      );

      expect(error.context?.decodedType).toBe('undefined');
    });

    it('should preserve tokenType in context', () => {
      const error = new LSHError(
        ErrorCodes.AUTH_INVALID_TOKEN,
        'Invalid token',
        { tokenType: 'refresh' }
      );

      expect(error.context?.tokenType).toBe('refresh');
    });

    it('should preserve userId in context', () => {
      const error = new LSHError(
        ErrorCodes.AUTH_INVALID_TOKEN,
        'Invalid token',
        { userId: 'user_abc123' }
      );

      expect(error.context?.userId).toBe('user_abc123');
    });

    it('should preserve expectedTypes in context', () => {
      const error = new LSHError(
        ErrorCodes.AUTH_INVALID_TOKEN,
        'Invalid type',
        { expectedTypes: ['access', 'refresh'] }
      );

      expect(error.context?.expectedTypes).toEqual(['access', 'refresh']);
    });

    it('should preserve hint in context', () => {
      const error = new LSHError(
        ErrorCodes.AUTH_UNAUTHORIZED,
        'Not authenticated',
        { hint: 'Check middleware configuration' }
      );

      expect(error.context?.hint).toBe('Check middleware configuration');
    });
  });

  describe('SaaS Types Operation Scenarios', () => {
    it('should handle validateJwtPayload - missing base fields', () => {
      const error = new LSHError(
        ErrorCodes.AUTH_INVALID_TOKEN,
        'Invalid token payload: missing required fields (sub, type)',
        { decodedType: 'object' }
      );

      expect(error.code).toBe('AUTH_INVALID_TOKEN');
      expect(error.message).toContain('missing required fields');
    });

    it('should handle validateJwtPayload - missing email in access token', () => {
      const error = new LSHError(
        ErrorCodes.AUTH_INVALID_TOKEN,
        'Invalid access token payload: missing email field',
        { tokenType: 'access', userId: 'user_xyz' }
      );

      expect(error.statusCode).toBe(401);
      expect(error.context?.tokenType).toBe('access');
    });

    it('should handle validateJwtPayload - invalid token type', () => {
      const error = new LSHError(
        ErrorCodes.AUTH_INVALID_TOKEN,
        'Invalid token type: invalid',
        { tokenType: 'invalid', expectedTypes: ['access', 'refresh'] }
      );

      expect(error.code).toBe('AUTH_INVALID_TOKEN');
      expect(error.context?.expectedTypes).toHaveLength(2);
    });

    it('should handle getAuthenticatedUser - no user on request', () => {
      const error = new LSHError(
        ErrorCodes.AUTH_UNAUTHORIZED,
        'User not authenticated',
        { hint: 'Request must pass through authenticateUser middleware first' }
      );

      expect(error.statusCode).toBe(401);
      expect(error.context?.hint).toContain('authenticateUser');
    });
  });
});
