/**
 * Tests for lsh-error.ts
 * Core error handling utilities for the LSH framework
 */

import {
  LSHError,
  ErrorCodes,
  extractErrorMessage,
  extractErrorDetails,
  isLSHError,
  wrapAsLSHError,
  notFoundError,
  alreadyExistsError,
  validationError,
  unauthorizedError,
  forbiddenError,
  type ErrorCode,
} from '../lib/lsh-error.js';

describe('LSH Error Handling', () => {
  describe('ErrorCodes', () => {
    it('should have authentication error codes', () => {
      expect(ErrorCodes.AUTH_UNAUTHORIZED).toBe('AUTH_UNAUTHORIZED');
      expect(ErrorCodes.AUTH_INVALID_CREDENTIALS).toBe('AUTH_INVALID_CREDENTIALS');
      expect(ErrorCodes.AUTH_EMAIL_NOT_VERIFIED).toBe('AUTH_EMAIL_NOT_VERIFIED');
      expect(ErrorCodes.AUTH_EMAIL_ALREADY_EXISTS).toBe('AUTH_EMAIL_ALREADY_EXISTS');
      expect(ErrorCodes.AUTH_INVALID_TOKEN).toBe('AUTH_INVALID_TOKEN');
      expect(ErrorCodes.AUTH_TOKEN_EXPIRED).toBe('AUTH_TOKEN_EXPIRED');
      expect(ErrorCodes.AUTH_TOKEN_ALREADY_USED).toBe('AUTH_TOKEN_ALREADY_USED');
      expect(ErrorCodes.AUTH_FORBIDDEN).toBe('AUTH_FORBIDDEN');
      expect(ErrorCodes.AUTH_INSUFFICIENT_PERMISSIONS).toBe('AUTH_INSUFFICIENT_PERMISSIONS');
    });

    it('should have secrets error codes', () => {
      expect(ErrorCodes.SECRETS_ENCRYPTION_FAILED).toBe('SECRETS_ENCRYPTION_FAILED');
      expect(ErrorCodes.SECRETS_DECRYPTION_FAILED).toBe('SECRETS_DECRYPTION_FAILED');
      expect(ErrorCodes.SECRETS_KEY_NOT_FOUND).toBe('SECRETS_KEY_NOT_FOUND');
      expect(ErrorCodes.SECRETS_PUSH_FAILED).toBe('SECRETS_PUSH_FAILED');
      expect(ErrorCodes.SECRETS_PULL_FAILED).toBe('SECRETS_PULL_FAILED');
      expect(ErrorCodes.SECRETS_ROTATION_FAILED).toBe('SECRETS_ROTATION_FAILED');
      expect(ErrorCodes.SECRETS_NOT_FOUND).toBe('SECRETS_NOT_FOUND');
    });

    it('should have database error codes', () => {
      expect(ErrorCodes.DB_CONNECTION_FAILED).toBe('DB_CONNECTION_FAILED');
      expect(ErrorCodes.DB_QUERY_FAILED).toBe('DB_QUERY_FAILED');
      expect(ErrorCodes.DB_NOT_FOUND).toBe('DB_NOT_FOUND');
      expect(ErrorCodes.DB_ALREADY_EXISTS).toBe('DB_ALREADY_EXISTS');
      expect(ErrorCodes.DB_CONSTRAINT_VIOLATION).toBe('DB_CONSTRAINT_VIOLATION');
      expect(ErrorCodes.DB_TIMEOUT).toBe('DB_TIMEOUT');
    });

    it('should have daemon error codes', () => {
      expect(ErrorCodes.DAEMON_NOT_RUNNING).toBe('DAEMON_NOT_RUNNING');
      expect(ErrorCodes.DAEMON_ALREADY_RUNNING).toBe('DAEMON_ALREADY_RUNNING');
      expect(ErrorCodes.DAEMON_START_FAILED).toBe('DAEMON_START_FAILED');
      expect(ErrorCodes.DAEMON_STOP_FAILED).toBe('DAEMON_STOP_FAILED');
      expect(ErrorCodes.DAEMON_CONNECTION_FAILED).toBe('DAEMON_CONNECTION_FAILED');
      expect(ErrorCodes.DAEMON_IPC_ERROR).toBe('DAEMON_IPC_ERROR');
    });

    it('should have job error codes', () => {
      expect(ErrorCodes.JOB_NOT_FOUND).toBe('JOB_NOT_FOUND');
      expect(ErrorCodes.JOB_ALREADY_RUNNING).toBe('JOB_ALREADY_RUNNING');
      expect(ErrorCodes.JOB_START_FAILED).toBe('JOB_START_FAILED');
      expect(ErrorCodes.JOB_STOP_FAILED).toBe('JOB_STOP_FAILED');
      expect(ErrorCodes.JOB_TIMEOUT).toBe('JOB_TIMEOUT');
    });

    it('should have API error codes', () => {
      expect(ErrorCodes.API_NOT_CONFIGURED).toBe('API_NOT_CONFIGURED');
      expect(ErrorCodes.API_INVALID_REQUEST).toBe('API_INVALID_REQUEST');
      expect(ErrorCodes.API_RATE_LIMITED).toBe('API_RATE_LIMITED');
      expect(ErrorCodes.API_INTERNAL_ERROR).toBe('API_INTERNAL_ERROR');
    });

    it('should have config error codes', () => {
      expect(ErrorCodes.CONFIG_MISSING_ENV_VAR).toBe('CONFIG_MISSING_ENV_VAR');
      expect(ErrorCodes.CONFIG_INVALID_VALUE).toBe('CONFIG_INVALID_VALUE');
      expect(ErrorCodes.CONFIG_FILE_NOT_FOUND).toBe('CONFIG_FILE_NOT_FOUND');
      expect(ErrorCodes.CONFIG_PARSE_ERROR).toBe('CONFIG_PARSE_ERROR');
    });

    it('should have validation error codes', () => {
      expect(ErrorCodes.VALIDATION_REQUIRED_FIELD).toBe('VALIDATION_REQUIRED_FIELD');
      expect(ErrorCodes.VALIDATION_INVALID_FORMAT).toBe('VALIDATION_INVALID_FORMAT');
      expect(ErrorCodes.VALIDATION_OUT_OF_RANGE).toBe('VALIDATION_OUT_OF_RANGE');
      expect(ErrorCodes.VALIDATION_COMMAND_INJECTION).toBe('VALIDATION_COMMAND_INJECTION');
    });

    it('should have billing error codes', () => {
      expect(ErrorCodes.BILLING_TIER_LIMIT_EXCEEDED).toBe('BILLING_TIER_LIMIT_EXCEEDED');
      expect(ErrorCodes.BILLING_SUBSCRIPTION_REQUIRED).toBe('BILLING_SUBSCRIPTION_REQUIRED');
      expect(ErrorCodes.BILLING_PAYMENT_REQUIRED).toBe('BILLING_PAYMENT_REQUIRED');
      expect(ErrorCodes.BILLING_STRIPE_ERROR).toBe('BILLING_STRIPE_ERROR');
    });

    it('should have resource error codes', () => {
      expect(ErrorCodes.RESOURCE_NOT_FOUND).toBe('RESOURCE_NOT_FOUND');
      expect(ErrorCodes.RESOURCE_ALREADY_EXISTS).toBe('RESOURCE_ALREADY_EXISTS');
      expect(ErrorCodes.RESOURCE_CONFLICT).toBe('RESOURCE_CONFLICT');
    });

    it('should have general error codes', () => {
      expect(ErrorCodes.INTERNAL_ERROR).toBe('INTERNAL_ERROR');
      expect(ErrorCodes.NOT_IMPLEMENTED).toBe('NOT_IMPLEMENTED');
      expect(ErrorCodes.SERVICE_UNAVAILABLE).toBe('SERVICE_UNAVAILABLE');
    });
  });

  describe('LSHError class', () => {
    describe('construction', () => {
      it('should create error with code and message', () => {
        const error = new LSHError(ErrorCodes.SECRETS_NOT_FOUND, 'Secret not found');
        expect(error.code).toBe(ErrorCodes.SECRETS_NOT_FOUND);
        expect(error.message).toBe('Secret not found');
        expect(error.name).toBe('LSHError');
      });

      it('should create error with context', () => {
        const context = { secretId: 'secret_123', environment: 'production' };
        const error = new LSHError(ErrorCodes.SECRETS_NOT_FOUND, 'Secret not found', context);
        expect(error.context).toEqual(context);
      });

      it('should have timestamp', () => {
        const before = new Date();
        const error = new LSHError(ErrorCodes.INTERNAL_ERROR, 'Test');
        const after = new Date();

        expect(error.timestamp).toBeInstanceOf(Date);
        expect(error.timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
        expect(error.timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
      });

      it('should be instanceof Error', () => {
        const error = new LSHError(ErrorCodes.INTERNAL_ERROR, 'Test');
        expect(error).toBeInstanceOf(Error);
        expect(error).toBeInstanceOf(LSHError);
      });

      it('should have stack trace', () => {
        const error = new LSHError(ErrorCodes.INTERNAL_ERROR, 'Test');
        expect(error.stack).toBeDefined();
        expect(error.stack).toContain('LSHError');
      });
    });

    describe('status codes', () => {
      it('should return 400 for validation errors', () => {
        const error = new LSHError(ErrorCodes.VALIDATION_REQUIRED_FIELD, 'Field required');
        expect(error.statusCode).toBe(400);
      });

      it('should return 400 for invalid format', () => {
        const error = new LSHError(ErrorCodes.VALIDATION_INVALID_FORMAT, 'Invalid format');
        expect(error.statusCode).toBe(400);
      });

      it('should return 400 for API invalid request', () => {
        const error = new LSHError(ErrorCodes.API_INVALID_REQUEST, 'Bad request');
        expect(error.statusCode).toBe(400);
      });

      it('should return 401 for auth unauthorized', () => {
        const error = new LSHError(ErrorCodes.AUTH_UNAUTHORIZED, 'Unauthorized');
        expect(error.statusCode).toBe(401);
      });

      it('should return 401 for invalid credentials', () => {
        const error = new LSHError(ErrorCodes.AUTH_INVALID_CREDENTIALS, 'Wrong password');
        expect(error.statusCode).toBe(401);
      });

      it('should return 401 for invalid token', () => {
        const error = new LSHError(ErrorCodes.AUTH_INVALID_TOKEN, 'Invalid token');
        expect(error.statusCode).toBe(401);
      });

      it('should return 401 for expired token', () => {
        const error = new LSHError(ErrorCodes.AUTH_TOKEN_EXPIRED, 'Token expired');
        expect(error.statusCode).toBe(401);
      });

      it('should return 401 for already used token', () => {
        const error = new LSHError(ErrorCodes.AUTH_TOKEN_ALREADY_USED, 'Token used');
        expect(error.statusCode).toBe(401);
      });

      it('should return 402 for payment required', () => {
        const error = new LSHError(ErrorCodes.BILLING_PAYMENT_REQUIRED, 'Payment required');
        expect(error.statusCode).toBe(402);
      });

      it('should return 402 for subscription required', () => {
        const error = new LSHError(ErrorCodes.BILLING_SUBSCRIPTION_REQUIRED, 'Subscribe');
        expect(error.statusCode).toBe(402);
      });

      it('should return 403 for forbidden', () => {
        const error = new LSHError(ErrorCodes.AUTH_FORBIDDEN, 'Forbidden');
        expect(error.statusCode).toBe(403);
      });

      it('should return 403 for insufficient permissions', () => {
        const error = new LSHError(ErrorCodes.AUTH_INSUFFICIENT_PERMISSIONS, 'No access');
        expect(error.statusCode).toBe(403);
      });

      it('should return 403 for email not verified', () => {
        const error = new LSHError(ErrorCodes.AUTH_EMAIL_NOT_VERIFIED, 'Verify email');
        expect(error.statusCode).toBe(403);
      });

      it('should return 404 for not found errors', () => {
        expect(new LSHError(ErrorCodes.RESOURCE_NOT_FOUND, 'Not found').statusCode).toBe(404);
        expect(new LSHError(ErrorCodes.JOB_NOT_FOUND, 'Job missing').statusCode).toBe(404);
        expect(new LSHError(ErrorCodes.SECRETS_NOT_FOUND, 'Secret missing').statusCode).toBe(404);
        expect(new LSHError(ErrorCodes.DB_NOT_FOUND, 'Row missing').statusCode).toBe(404);
        expect(new LSHError(ErrorCodes.CONFIG_FILE_NOT_FOUND, 'File missing').statusCode).toBe(404);
        expect(new LSHError(ErrorCodes.SECRETS_KEY_NOT_FOUND, 'Key missing').statusCode).toBe(404);
      });

      it('should return 409 for conflict errors', () => {
        expect(new LSHError(ErrorCodes.RESOURCE_ALREADY_EXISTS, 'Exists').statusCode).toBe(409);
        expect(new LSHError(ErrorCodes.DB_ALREADY_EXISTS, 'Duplicate').statusCode).toBe(409);
        expect(new LSHError(ErrorCodes.RESOURCE_CONFLICT, 'Conflict').statusCode).toBe(409);
        expect(new LSHError(ErrorCodes.DB_CONSTRAINT_VIOLATION, 'Violation').statusCode).toBe(409);
        expect(new LSHError(ErrorCodes.AUTH_EMAIL_ALREADY_EXISTS, 'Email taken').statusCode).toBe(409);
      });

      it('should return 429 for rate limiting', () => {
        const error = new LSHError(ErrorCodes.API_RATE_LIMITED, 'Rate limited');
        expect(error.statusCode).toBe(429);
      });

      it('should return 429 for tier limit exceeded', () => {
        const error = new LSHError(ErrorCodes.BILLING_TIER_LIMIT_EXCEEDED, 'Limit exceeded');
        expect(error.statusCode).toBe(429);
      });

      it('should return 501 for not implemented', () => {
        const error = new LSHError(ErrorCodes.NOT_IMPLEMENTED, 'Not implemented');
        expect(error.statusCode).toBe(501);
      });

      it('should return 503 for service unavailable', () => {
        expect(new LSHError(ErrorCodes.SERVICE_UNAVAILABLE, 'Down').statusCode).toBe(503);
        expect(new LSHError(ErrorCodes.DB_CONNECTION_FAILED, 'No DB').statusCode).toBe(503);
      });

      it('should return 504 for timeout errors', () => {
        expect(new LSHError(ErrorCodes.DB_TIMEOUT, 'DB timeout').statusCode).toBe(504);
        expect(new LSHError(ErrorCodes.JOB_TIMEOUT, 'Job timeout').statusCode).toBe(504);
      });

      it('should return 500 for general errors', () => {
        expect(new LSHError(ErrorCodes.INTERNAL_ERROR, 'Error').statusCode).toBe(500);
        expect(new LSHError(ErrorCodes.SECRETS_ENCRYPTION_FAILED, 'Fail').statusCode).toBe(500);
        expect(new LSHError(ErrorCodes.DAEMON_START_FAILED, 'Fail').statusCode).toBe(500);
      });

      it('should allow custom status code override', () => {
        const error = new LSHError(ErrorCodes.INTERNAL_ERROR, 'Custom', undefined, 418);
        expect(error.statusCode).toBe(418);
      });
    });

    describe('toJSON', () => {
      it('should serialize error to JSON', () => {
        const context = { key: 'value' };
        const error = new LSHError(ErrorCodes.SECRETS_NOT_FOUND, 'Not found', context);
        const json = error.toJSON();

        expect(json.name).toBe('LSHError');
        expect(json.code).toBe(ErrorCodes.SECRETS_NOT_FOUND);
        expect(json.message).toBe('Not found');
        expect(json.context).toEqual(context);
        expect(json.statusCode).toBe(404);
        expect(typeof json.timestamp).toBe('string');
        expect(json.stack).toBeDefined();
      });

      it('should produce valid JSON string', () => {
        const error = new LSHError(ErrorCodes.INTERNAL_ERROR, 'Test', { foo: 'bar' });
        const jsonString = JSON.stringify(error.toJSON());
        const parsed = JSON.parse(jsonString);

        expect(parsed.code).toBe(ErrorCodes.INTERNAL_ERROR);
        expect(parsed.message).toBe('Test');
      });
    });

    describe('toString', () => {
      it('should format error without context', () => {
        const error = new LSHError(ErrorCodes.INTERNAL_ERROR, 'Something went wrong');
        expect(error.toString()).toBe('[INTERNAL_ERROR] Something went wrong');
      });

      it('should format error with context', () => {
        const error = new LSHError(ErrorCodes.JOB_NOT_FOUND, 'Job missing', { jobId: '123' });
        expect(error.toString()).toBe('[JOB_NOT_FOUND] Job missing ({"jobId":"123"})');
      });
    });
  });

  describe('extractErrorMessage', () => {
    it('should extract message from LSHError', () => {
      const error = new LSHError(ErrorCodes.INTERNAL_ERROR, 'Test error', { ctx: 'val' });
      const message = extractErrorMessage(error);
      expect(message).toBe('[INTERNAL_ERROR] Test error ({"ctx":"val"})');
    });

    it('should extract message from standard Error', () => {
      const error = new Error('Standard error');
      expect(extractErrorMessage(error)).toBe('Standard error');
    });

    it('should handle string errors', () => {
      expect(extractErrorMessage('String error')).toBe('String error');
    });

    it('should handle objects with message property', () => {
      const error = { message: 'Object error' };
      expect(extractErrorMessage(error)).toBe('Object error');
    });

    it('should convert other types to string', () => {
      expect(extractErrorMessage(123)).toBe('123');
      expect(extractErrorMessage(null)).toBe('null');
      expect(extractErrorMessage(undefined)).toBe('undefined');
      expect(extractErrorMessage({ foo: 'bar' })).toBe('[object Object]');
    });
  });

  describe('extractErrorDetails', () => {
    it('should extract full details from LSHError', () => {
      const context = { jobId: '123' };
      const error = new LSHError(ErrorCodes.JOB_NOT_FOUND, 'Job not found', context);
      const details = extractErrorDetails(error);

      expect(details.message).toBe('Job not found');
      expect(details.code).toBe(ErrorCodes.JOB_NOT_FOUND);
      expect(details.context).toEqual(context);
      expect(details.stack).toBeDefined();
    });

    it('should extract details from standard Error', () => {
      const error = new Error('Standard error');
      const details = extractErrorDetails(error);

      expect(details.message).toBe('Standard error');
      expect(details.stack).toBeDefined();
      expect(details.code).toBeUndefined();
      expect(details.context).toBeUndefined();
    });

    it('should extract code from Error with code property', () => {
      const error = new Error('ENOENT error') as Error & { code: string };
      error.code = 'ENOENT';
      const details = extractErrorDetails(error);

      expect(details.message).toBe('ENOENT error');
      expect(details.code).toBe('ENOENT');
    });

    it('should handle non-Error objects', () => {
      const details = extractErrorDetails('String error');
      expect(details.message).toBe('String error');
      expect(details.stack).toBeUndefined();
    });

    it('should handle null', () => {
      const details = extractErrorDetails(null);
      expect(details.message).toBe('null');
    });
  });

  describe('isLSHError', () => {
    it('should return true for LSHError', () => {
      const error = new LSHError(ErrorCodes.INTERNAL_ERROR, 'Test');
      expect(isLSHError(error)).toBe(true);
    });

    it('should return true for LSHError with matching code', () => {
      const error = new LSHError(ErrorCodes.JOB_NOT_FOUND, 'Not found');
      expect(isLSHError(error, ErrorCodes.JOB_NOT_FOUND)).toBe(true);
    });

    it('should return false for LSHError with non-matching code', () => {
      const error = new LSHError(ErrorCodes.JOB_NOT_FOUND, 'Not found');
      expect(isLSHError(error, ErrorCodes.SECRETS_NOT_FOUND)).toBe(false);
    });

    it('should return false for standard Error', () => {
      const error = new Error('Standard');
      expect(isLSHError(error)).toBe(false);
    });

    it('should return false for non-Error types', () => {
      expect(isLSHError('string')).toBe(false);
      expect(isLSHError(null)).toBe(false);
      expect(isLSHError(undefined)).toBe(false);
      expect(isLSHError({ message: 'object' })).toBe(false);
    });

    it('should work as type guard', () => {
      const error: unknown = new LSHError(ErrorCodes.INTERNAL_ERROR, 'Test');
      if (isLSHError(error)) {
        // TypeScript should allow accessing LSHError properties
        expect(error.code).toBe(ErrorCodes.INTERNAL_ERROR);
        expect(error.statusCode).toBeDefined();
      }
    });
  });

  describe('wrapAsLSHError', () => {
    it('should return existing LSHError unchanged', () => {
      const original = new LSHError(ErrorCodes.JOB_NOT_FOUND, 'Not found');
      const wrapped = wrapAsLSHError(original);
      expect(wrapped).toBe(original);
    });

    it('should add context to existing LSHError', () => {
      const original = new LSHError(ErrorCodes.JOB_NOT_FOUND, 'Not found', { a: 1 });
      const wrapped = wrapAsLSHError(original, ErrorCodes.INTERNAL_ERROR, { b: 2 });

      expect(wrapped.code).toBe(ErrorCodes.JOB_NOT_FOUND); // Keeps original code
      expect(wrapped.context).toEqual({ a: 1, b: 2 }); // Merges context
    });

    it('should wrap standard Error', () => {
      const original = new Error('Standard error');
      const wrapped = wrapAsLSHError(original, ErrorCodes.INTERNAL_ERROR);

      expect(wrapped).toBeInstanceOf(LSHError);
      expect(wrapped.code).toBe(ErrorCodes.INTERNAL_ERROR);
      expect(wrapped.message).toBe('Standard error');
      expect(wrapped.context?.originalStack).toBeDefined();
    });

    it('should wrap string error', () => {
      const wrapped = wrapAsLSHError('String error', ErrorCodes.API_INTERNAL_ERROR);

      expect(wrapped).toBeInstanceOf(LSHError);
      expect(wrapped.code).toBe(ErrorCodes.API_INTERNAL_ERROR);
      expect(wrapped.message).toBe('String error');
    });

    it('should wrap with context', () => {
      const wrapped = wrapAsLSHError('Error', ErrorCodes.INTERNAL_ERROR, { extra: 'info' });
      expect(wrapped.context?.extra).toBe('info');
    });

    it('should preserve original code from Error', () => {
      const original = new Error('ENOENT') as Error & { code: string };
      original.code = 'ENOENT';
      const wrapped = wrapAsLSHError(original);

      expect(wrapped.context?.originalCode).toBe('ENOENT');
    });

    it('should use INTERNAL_ERROR as default code', () => {
      const wrapped = wrapAsLSHError(new Error('Test'));
      expect(wrapped.code).toBe(ErrorCodes.INTERNAL_ERROR);
    });
  });

  describe('Factory Functions', () => {
    describe('notFoundError', () => {
      it('should create not found error with resource', () => {
        const error = notFoundError('User');
        expect(error.code).toBe(ErrorCodes.RESOURCE_NOT_FOUND);
        expect(error.message).toBe('User not found');
        expect(error.statusCode).toBe(404);
        expect(error.context?.resource).toBe('User');
      });

      it('should create not found error with resource and id', () => {
        const error = notFoundError('User', 'user_123');
        expect(error.message).toBe("User 'user_123' not found");
        expect(error.context?.id).toBe('user_123');
      });

      it('should accept additional context', () => {
        const error = notFoundError('Job', 'job_1', { lookup: 'database' });
        expect(error.context?.lookup).toBe('database');
      });
    });

    describe('alreadyExistsError', () => {
      it('should create already exists error with resource', () => {
        const error = alreadyExistsError('Email');
        expect(error.code).toBe(ErrorCodes.RESOURCE_ALREADY_EXISTS);
        expect(error.message).toBe('Email already exists');
        expect(error.statusCode).toBe(409);
      });

      it('should create error with identifier', () => {
        const error = alreadyExistsError('User', 'john@example.com');
        expect(error.message).toBe("User 'john@example.com' already exists");
        expect(error.context?.identifier).toBe('john@example.com');
      });

      it('should accept additional context', () => {
        const error = alreadyExistsError('Slug', 'my-org', { orgId: 'org_1' });
        expect(error.context?.orgId).toBe('org_1');
      });
    });

    describe('validationError', () => {
      it('should create validation error', () => {
        const error = validationError('Email is required');
        expect(error.code).toBe(ErrorCodes.VALIDATION_REQUIRED_FIELD);
        expect(error.message).toBe('Email is required');
        expect(error.statusCode).toBe(400);
      });

      it('should include field name', () => {
        const error = validationError('Invalid format', 'email');
        expect(error.context?.field).toBe('email');
      });

      it('should accept additional context', () => {
        const error = validationError('Too short', 'password', { minLength: 8 });
        expect(error.context?.minLength).toBe(8);
      });
    });

    describe('unauthorizedError', () => {
      it('should create unauthorized error with default message', () => {
        const error = unauthorizedError();
        expect(error.code).toBe(ErrorCodes.AUTH_UNAUTHORIZED);
        expect(error.message).toBe('Unauthorized');
        expect(error.statusCode).toBe(401);
      });

      it('should accept custom message', () => {
        const error = unauthorizedError('Authentication required');
        expect(error.message).toBe('Authentication required');
      });

      it('should accept context', () => {
        const error = unauthorizedError('Invalid token', { tokenType: 'access' });
        expect(error.context?.tokenType).toBe('access');
      });
    });

    describe('forbiddenError', () => {
      it('should create forbidden error with default message', () => {
        const error = forbiddenError();
        expect(error.code).toBe(ErrorCodes.AUTH_FORBIDDEN);
        expect(error.message).toBe('Insufficient permissions');
        expect(error.statusCode).toBe(403);
      });

      it('should accept custom message', () => {
        const error = forbiddenError('Admin access required');
        expect(error.message).toBe('Admin access required');
      });

      it('should accept context', () => {
        const error = forbiddenError('Cannot delete', { resourceId: 'res_1' });
        expect(error.context?.resourceId).toBe('res_1');
      });
    });
  });

  describe('Error Code Type', () => {
    it('should accept valid error codes', () => {
      // Type checking - these should compile
      const code1: ErrorCode = ErrorCodes.INTERNAL_ERROR;
      const code2: ErrorCode = ErrorCodes.AUTH_UNAUTHORIZED;
      const code3: ErrorCode = ErrorCodes.SECRETS_NOT_FOUND;

      expect(code1).toBeDefined();
      expect(code2).toBeDefined();
      expect(code3).toBeDefined();
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle try-catch with proper typing', () => {
      try {
        throw new LSHError(ErrorCodes.SECRETS_NOT_FOUND, 'Secret missing', {
          secretId: 'secret_123',
          environment: 'production',
        });
      } catch (error) {
        if (isLSHError(error, ErrorCodes.SECRETS_NOT_FOUND)) {
          expect(error.statusCode).toBe(404);
          expect(error.context?.secretId).toBe('secret_123');
        } else {
          throw new Error('Should have been an LSHError');
        }
      }
    });

    it('should wrap external API errors', () => {
      const externalError = {
        message: 'Stripe API error',
        code: 'card_declined',
        statusCode: 402,
      };

      const wrapped = wrapAsLSHError(
        externalError as unknown,
        ErrorCodes.BILLING_STRIPE_ERROR,
        { provider: 'stripe' }
      );

      expect(wrapped.code).toBe(ErrorCodes.BILLING_STRIPE_ERROR);
      expect(wrapped.context?.provider).toBe('stripe');
    });

    it('should chain error handling correctly', () => {
      function innerOperation(): never {
        throw new LSHError(ErrorCodes.DB_QUERY_FAILED, 'Query failed', { table: 'users' });
      }

      function outerOperation(): void {
        try {
          innerOperation();
        } catch (error) {
          const wrapped = wrapAsLSHError(error, ErrorCodes.INTERNAL_ERROR, {
            operation: 'outerOperation',
          });
          throw wrapped;
        }
      }

      try {
        outerOperation();
        throw new Error('Should have thrown');
      } catch (error) {
        if (isLSHError(error)) {
          // Should keep original code (DB_QUERY_FAILED)
          expect(error.code).toBe(ErrorCodes.DB_QUERY_FAILED);
          // Should merge contexts
          expect(error.context?.table).toBe('users');
          expect(error.context?.operation).toBe('outerOperation');
        } else if (error instanceof Error && error.message === 'Should have thrown') {
          throw error;
        } else {
          throw new Error('Should be LSHError');
        }
      }
    });
  });
});
