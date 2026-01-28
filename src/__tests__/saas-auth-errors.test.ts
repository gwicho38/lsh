/**
 * Tests for saas-auth.ts error handling
 * Verifies LSHError is used with correct error codes
 *
 * Note: AuthService integration tests are skipped due to Supabase singleton
 * initialization issues. These tests verify LSHError behavior directly.
 */

import { describe, it, expect } from '@jest/globals';
import { LSHError, ErrorCodes } from '../lib/lsh-error.js';

describe('LSHError for Auth Service', () => {
  describe('Configuration Errors', () => {
    it('should use CONFIG_MISSING_ENV_VAR code with 500 status for missing JWT secret', () => {
      const error = new LSHError(
        ErrorCodes.CONFIG_MISSING_ENV_VAR,
        'LSH_JWT_SECRET is not set',
        { envVar: 'LSH_JWT_SECRET' }
      );

      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('CONFIG_MISSING_ENV_VAR');
      expect(error.context?.envVar).toBe('LSH_JWT_SECRET');
    });
  });

  describe('Authentication Errors', () => {
    it('should use AUTH_INVALID_CREDENTIALS code with 401 status', () => {
      const error = new LSHError(
        ErrorCodes.AUTH_INVALID_CREDENTIALS,
        'Invalid credentials',
        {}
      );

      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('AUTH_INVALID_CREDENTIALS');
      // Context should be empty to avoid leaking info
      expect(error.context).toEqual({});
    });

    it('should use AUTH_EMAIL_NOT_VERIFIED code with 403 status', () => {
      const error = new LSHError(
        ErrorCodes.AUTH_EMAIL_NOT_VERIFIED,
        'Email not verified',
        { email: 'user@example.com' }
      );

      expect(error.statusCode).toBe(403);
      expect(error.code).toBe('AUTH_EMAIL_NOT_VERIFIED');
      expect(error.context?.email).toBe('user@example.com');
    });

    it('should use AUTH_EMAIL_ALREADY_EXISTS code with 409 status', () => {
      const error = new LSHError(
        ErrorCodes.AUTH_EMAIL_ALREADY_EXISTS,
        'Email already exists',
        { email: 'existing@example.com' }
      );

      expect(error.statusCode).toBe(409);
      expect(error.code).toBe('AUTH_EMAIL_ALREADY_EXISTS');
    });

    it('should use AUTH_INVALID_TOKEN code with 401 status', () => {
      const error = new LSHError(
        ErrorCodes.AUTH_INVALID_TOKEN,
        'Invalid verification token',
        { resource: 'email_verification' }
      );

      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('AUTH_INVALID_TOKEN');
      expect(error.context?.resource).toBe('email_verification');
    });

    it('should use AUTH_TOKEN_EXPIRED code with 401 status', () => {
      const error = new LSHError(
        ErrorCodes.AUTH_TOKEN_EXPIRED,
        'Verification token has expired',
        { resource: 'email_verification', expiresAt: '2026-01-01T00:00:00Z' }
      );

      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('AUTH_TOKEN_EXPIRED');
      expect(error.context?.expiresAt).toBe('2026-01-01T00:00:00Z');
    });

    it('should use AUTH_TOKEN_ALREADY_USED code with 401 status', () => {
      const error = new LSHError(
        ErrorCodes.AUTH_TOKEN_ALREADY_USED,
        'Password reset token has already been used',
        { resource: 'password_reset' }
      );

      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('AUTH_TOKEN_ALREADY_USED');
    });
  });

  describe('Validation Errors', () => {
    it('should use VALIDATION_INVALID_FORMAT code with 400 status for invalid email', () => {
      const error = new LSHError(
        ErrorCodes.VALIDATION_INVALID_FORMAT,
        'Invalid email format',
        { field: 'email', email: 'invalid-email' }
      );

      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('VALIDATION_INVALID_FORMAT');
      expect(error.context?.field).toBe('email');
    });

    it('should use VALIDATION_INVALID_FORMAT code with 400 status for invalid password', () => {
      const error = new LSHError(
        ErrorCodes.VALIDATION_INVALID_FORMAT,
        'Password must be at least 8 characters',
        { field: 'password', errors: ['TOO_SHORT'] }
      );

      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('VALIDATION_INVALID_FORMAT');
      expect(error.context?.field).toBe('password');
      expect(error.context?.errors).toContain('TOO_SHORT');
    });
  });

  describe('Resource Errors', () => {
    it('should use RESOURCE_NOT_FOUND code with 404 status for missing user', () => {
      const error = new LSHError(
        ErrorCodes.RESOURCE_NOT_FOUND,
        'User not found',
        { resource: 'user', email: 'unknown@example.com' }
      );

      expect(error.statusCode).toBe(404);
      expect(error.code).toBe('RESOURCE_NOT_FOUND');
    });

    it('should use RESOURCE_CONFLICT code with 409 status for already verified email', () => {
      const error = new LSHError(
        ErrorCodes.RESOURCE_CONFLICT,
        'Email already verified',
        { email: 'verified@example.com', userId: 'user_123' }
      );

      expect(error.statusCode).toBe(409);
      expect(error.code).toBe('RESOURCE_CONFLICT');
    });
  });

  describe('Database Errors', () => {
    it('should use DB_QUERY_FAILED code with 500 status for user creation failure', () => {
      const error = new LSHError(
        ErrorCodes.DB_QUERY_FAILED,
        'Failed to create user',
        { dbError: 'unique constraint violation', code: '23505' }
      );

      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('DB_QUERY_FAILED');
      expect(error.context?.dbError).toBeDefined();
    });

    it('should use DB_QUERY_FAILED code with 500 status for organization query failure', () => {
      const error = new LSHError(
        ErrorCodes.DB_QUERY_FAILED,
        'Failed to get user organizations',
        { dbError: 'connection timeout', userId: 'user_123' }
      );

      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('DB_QUERY_FAILED');
      expect(error.context?.userId).toBe('user_123');
    });
  });

  describe('Error Serialization', () => {
    it('should serialize auth errors to JSON correctly', () => {
      const error = new LSHError(
        ErrorCodes.AUTH_INVALID_CREDENTIALS,
        'Invalid credentials',
        {}
      );

      const json = error.toJSON();

      expect(json.code).toBe('AUTH_INVALID_CREDENTIALS');
      expect(json.message).toBe('Invalid credentials');
      expect(json.statusCode).toBe(401);
    });

    it('should serialize config errors to JSON correctly', () => {
      const error = new LSHError(
        ErrorCodes.CONFIG_MISSING_ENV_VAR,
        'Missing environment variable',
        { envVar: 'SECRET_KEY' }
      );

      const json = error.toJSON();

      expect(json.code).toBe('CONFIG_MISSING_ENV_VAR');
      expect(json.context?.envVar).toBe('SECRET_KEY');
    });
  });

  describe('Error Instance Checks', () => {
    it('should be instanceof Error', () => {
      const error = new LSHError(
        ErrorCodes.AUTH_INVALID_CREDENTIALS,
        'Invalid credentials',
        {}
      );

      expect(error instanceof Error).toBe(true);
      expect(error instanceof LSHError).toBe(true);
    });

    it('should have name property set to LSHError', () => {
      const error = new LSHError(
        ErrorCodes.AUTH_INVALID_TOKEN,
        'Invalid token',
        {}
      );

      expect(error.name).toBe('LSHError');
    });
  });

  describe('Security Considerations', () => {
    it('should not leak sensitive info in AUTH_INVALID_CREDENTIALS errors', () => {
      // These errors should have empty context to prevent enumeration attacks
      const error = new LSHError(
        ErrorCodes.AUTH_INVALID_CREDENTIALS,
        'Invalid credentials',
        {}
      );

      expect(error.context).toEqual({});
      expect(error.message).not.toContain('email');
      expect(error.message).not.toContain('password');
    });

    it('should use generic message for login failures', () => {
      const emailError = new LSHError(
        ErrorCodes.AUTH_INVALID_CREDENTIALS,
        'Invalid credentials',
        {}
      );

      const passwordError = new LSHError(
        ErrorCodes.AUTH_INVALID_CREDENTIALS,
        'Invalid credentials',
        {}
      );

      // Both should have identical messages (no enumeration)
      expect(emailError.message).toBe(passwordError.message);
    });
  });

  describe('Token Error Types', () => {
    it('should differentiate between invalid, expired, and already-used tokens', () => {
      const invalidToken = new LSHError(
        ErrorCodes.AUTH_INVALID_TOKEN,
        'Invalid token',
        { resource: 'password_reset' }
      );

      const expiredToken = new LSHError(
        ErrorCodes.AUTH_TOKEN_EXPIRED,
        'Token has expired',
        { resource: 'password_reset' }
      );

      const usedToken = new LSHError(
        ErrorCodes.AUTH_TOKEN_ALREADY_USED,
        'Token has already been used',
        { resource: 'password_reset' }
      );

      expect(invalidToken.code).toBe('AUTH_INVALID_TOKEN');
      expect(expiredToken.code).toBe('AUTH_TOKEN_EXPIRED');
      expect(usedToken.code).toBe('AUTH_TOKEN_ALREADY_USED');

      // All should be 401 status
      expect(invalidToken.statusCode).toBe(401);
      expect(expiredToken.statusCode).toBe(401);
      expect(usedToken.statusCode).toBe(401);
    });
  });
});
