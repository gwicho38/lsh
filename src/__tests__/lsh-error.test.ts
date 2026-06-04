/**
 * LSHError Unit Tests
 *
 * Tests for the standardized error-handling utilities used across the codebase:
 * the LSHError class, safe error-extraction helpers, the HTTP status-code
 * mapping (exercised through the constructor), and the factory functions.
 *
 * This module is pure (no IO/network), so it runs in CI and contributes to the
 * real coverage number — see issue #149.
 */

import {
  ErrorCodes,
  LSHError,
  extractErrorMessage,
  extractErrorDetails,
  isLSHError,
  wrapAsLSHError,
  notFoundError,
  alreadyExistsError,
  validationError,
  unauthorizedError,
  forbiddenError,
} from '../lib/lsh-error.js';

describe('LSHError', () => {
  describe('construction', () => {
    it('should set code, message, and context', () => {
      const err = new LSHError(ErrorCodes.SECRETS_NOT_FOUND, 'missing', { secretId: 's_1' });
      expect(err).toBeInstanceOf(Error);
      expect(err).toBeInstanceOf(LSHError);
      expect(err.name).toBe('LSHError');
      expect(err.code).toBe(ErrorCodes.SECRETS_NOT_FOUND);
      expect(err.message).toBe('missing');
      expect(err.context).toEqual({ secretId: 's_1' });
    });

    it('should default context to undefined', () => {
      const err = new LSHError(ErrorCodes.INTERNAL_ERROR, 'boom');
      expect(err.context).toBeUndefined();
    });

    it('should capture a timestamp', () => {
      const before = Date.now();
      const err = new LSHError(ErrorCodes.INTERNAL_ERROR, 'boom');
      const after = Date.now();
      expect(err.timestamp).toBeInstanceOf(Date);
      expect(err.timestamp.getTime()).toBeGreaterThanOrEqual(before);
      expect(err.timestamp.getTime()).toBeLessThanOrEqual(after);
    });

    it('should preserve a stack trace', () => {
      const err = new LSHError(ErrorCodes.INTERNAL_ERROR, 'boom');
      expect(typeof err.stack).toBe('string');
      expect(err.stack).toContain('LSHError');
    });

    it('should honor an explicit statusCode over the default', () => {
      const err = new LSHError(ErrorCodes.INTERNAL_ERROR, 'boom', undefined, 418);
      expect(err.statusCode).toBe(418);
    });
  });

  describe('default status-code mapping', () => {
    const cases: Array<[string, number]> = [
      [ErrorCodes.VALIDATION_REQUIRED_FIELD, 400],
      [ErrorCodes.VALIDATION_INVALID_FORMAT, 400],
      [ErrorCodes.API_INVALID_REQUEST, 400],
      [ErrorCodes.CONFIG_INVALID_VALUE, 400],
      [ErrorCodes.AUTH_UNAUTHORIZED, 401],
      [ErrorCodes.AUTH_INVALID_CREDENTIALS, 401],
      [ErrorCodes.AUTH_INVALID_TOKEN, 401],
      [ErrorCodes.AUTH_TOKEN_EXPIRED, 401],
      [ErrorCodes.BILLING_PAYMENT_REQUIRED, 402],
      [ErrorCodes.BILLING_SUBSCRIPTION_REQUIRED, 402],
      [ErrorCodes.AUTH_FORBIDDEN, 403],
      [ErrorCodes.AUTH_INSUFFICIENT_PERMISSIONS, 403],
      [ErrorCodes.AUTH_EMAIL_NOT_VERIFIED, 403],
      [ErrorCodes.RESOURCE_NOT_FOUND, 404],
      [ErrorCodes.SECRETS_NOT_FOUND, 404],
      [ErrorCodes.DB_NOT_FOUND, 404],
      [ErrorCodes.JOB_NOT_FOUND, 404],
      [ErrorCodes.RESOURCE_ALREADY_EXISTS, 409],
      [ErrorCodes.DB_ALREADY_EXISTS, 409],
      [ErrorCodes.RESOURCE_CONFLICT, 409],
      [ErrorCodes.DB_CONSTRAINT_VIOLATION, 409],
      [ErrorCodes.API_RATE_LIMITED, 429],
      [ErrorCodes.BILLING_TIER_LIMIT_EXCEEDED, 429],
      [ErrorCodes.NOT_IMPLEMENTED, 501],
      [ErrorCodes.SERVICE_UNAVAILABLE, 503],
      [ErrorCodes.DB_CONNECTION_FAILED, 503],
      [ErrorCodes.DB_TIMEOUT, 504],
      [ErrorCodes.JOB_TIMEOUT, 504],
      [ErrorCodes.INTERNAL_ERROR, 500],
      [ErrorCodes.AUTH_EMAIL_ALREADY_EXISTS, 409],
    ];

    it.each(cases)('maps %s -> %i', (code, expected) => {
      expect(new LSHError(code as never, 'm').statusCode).toBe(expected);
    });
  });

  describe('toJSON', () => {
    it('should serialize all fields', () => {
      const err = new LSHError(ErrorCodes.SECRETS_PUSH_FAILED, 'nope', { env: 'dev' });
      const json = err.toJSON();
      expect(json).toMatchObject({
        name: 'LSHError',
        code: ErrorCodes.SECRETS_PUSH_FAILED,
        message: 'nope',
        context: { env: 'dev' },
        statusCode: 500,
      });
      expect(typeof json.timestamp).toBe('string');
      expect(json.timestamp).toBe(err.timestamp.toISOString());
      expect(typeof json.stack).toBe('string');
    });
  });

  describe('toString', () => {
    it('should include code and message', () => {
      const err = new LSHError(ErrorCodes.SECRETS_NOT_FOUND, 'missing');
      expect(err.toString()).toBe('[SECRETS_NOT_FOUND] missing');
    });

    it('should append serialized context when present', () => {
      const err = new LSHError(ErrorCodes.SECRETS_NOT_FOUND, 'missing', { id: 'x' });
      expect(err.toString()).toBe('[SECRETS_NOT_FOUND] missing ({"id":"x"})');
    });
  });
});

describe('extractErrorMessage', () => {
  it('should use LSHError.toString for LSHError', () => {
    const err = new LSHError(ErrorCodes.SECRETS_NOT_FOUND, 'missing');
    expect(extractErrorMessage(err)).toBe('[SECRETS_NOT_FOUND] missing');
  });

  it('should use .message for a plain Error', () => {
    expect(extractErrorMessage(new Error('plain boom'))).toBe('plain boom');
  });

  it('should return a string as-is', () => {
    expect(extractErrorMessage('just a string')).toBe('just a string');
  });

  it('should read .message off a message-bearing object', () => {
    expect(extractErrorMessage({ message: 'objy' })).toBe('objy');
    expect(extractErrorMessage({ message: 42 })).toBe('42');
  });

  it('should stringify anything else', () => {
    expect(extractErrorMessage(null)).toBe('null');
    expect(extractErrorMessage(undefined)).toBe('undefined');
    expect(extractErrorMessage(123)).toBe('123');
  });
});

describe('extractErrorDetails', () => {
  it('should expose code and context for LSHError', () => {
    const err = new LSHError(ErrorCodes.DB_QUERY_FAILED, 'bad query', { table: 't' });
    const details = extractErrorDetails(err);
    expect(details).toMatchObject({
      message: 'bad query',
      code: ErrorCodes.DB_QUERY_FAILED,
      context: { table: 't' },
    });
    expect(typeof details.stack).toBe('string');
  });

  it('should pull message/stack/code from a plain Error', () => {
    const err = new Error('plain') as Error & { code?: string };
    err.code = 'ENOENT';
    const details = extractErrorDetails(err);
    expect(details.message).toBe('plain');
    expect(details.code).toBe('ENOENT');
    expect(typeof details.stack).toBe('string');
  });

  it('should fall back to extractErrorMessage for non-errors', () => {
    expect(extractErrorDetails('oops')).toEqual({ message: 'oops' });
    expect(extractErrorDetails(7)).toEqual({ message: '7' });
  });
});

describe('isLSHError', () => {
  it('should be true for any LSHError when no code given', () => {
    expect(isLSHError(new LSHError(ErrorCodes.INTERNAL_ERROR, 'm'))).toBe(true);
  });

  it('should match a specific code', () => {
    const err = new LSHError(ErrorCodes.SECRETS_NOT_FOUND, 'm');
    expect(isLSHError(err, ErrorCodes.SECRETS_NOT_FOUND)).toBe(true);
    expect(isLSHError(err, ErrorCodes.DB_NOT_FOUND)).toBe(false);
  });

  it('should be false for non-LSHError values', () => {
    expect(isLSHError(new Error('x'))).toBe(false);
    expect(isLSHError('x')).toBe(false);
    expect(isLSHError(null)).toBe(false);
  });
});

describe('wrapAsLSHError', () => {
  it('should return the same LSHError unchanged when no extra context', () => {
    const err = new LSHError(ErrorCodes.SECRETS_PULL_FAILED, 'pull');
    expect(wrapAsLSHError(err)).toBe(err);
  });

  it('should merge extra context onto an existing LSHError (new instance)', () => {
    const err = new LSHError(ErrorCodes.SECRETS_PULL_FAILED, 'pull', { a: 1 });
    const wrapped = wrapAsLSHError(err, ErrorCodes.INTERNAL_ERROR, { b: 2 });
    expect(wrapped).not.toBe(err);
    expect(wrapped.code).toBe(ErrorCodes.SECRETS_PULL_FAILED); // preserves original code
    expect(wrapped.context).toEqual({ a: 1, b: 2 });
  });

  it('should wrap a plain Error with the default code', () => {
    const wrapped = wrapAsLSHError(new Error('raw'));
    expect(wrapped).toBeInstanceOf(LSHError);
    expect(wrapped.code).toBe(ErrorCodes.INTERNAL_ERROR);
    expect(wrapped.message).toBe('raw');
    expect(wrapped.context).toMatchObject({ originalStack: expect.any(String) });
  });

  it('should wrap a non-error value with the supplied code and context', () => {
    const wrapped = wrapAsLSHError('string failure', ErrorCodes.API_INTERNAL_ERROR, { route: '/x' });
    expect(wrapped.code).toBe(ErrorCodes.API_INTERNAL_ERROR);
    expect(wrapped.message).toBe('string failure');
    expect(wrapped.context).toMatchObject({ route: '/x' });
  });
});

describe('factory functions', () => {
  it('notFoundError builds a 404 with/without id', () => {
    const withId = notFoundError('Secret', 's_1', { env: 'dev' });
    expect(withId.code).toBe(ErrorCodes.RESOURCE_NOT_FOUND);
    expect(withId.statusCode).toBe(404);
    expect(withId.message).toBe("Secret 's_1' not found");
    expect(withId.context).toMatchObject({ resource: 'Secret', id: 's_1', env: 'dev' });

    const noId = notFoundError('Secret');
    expect(noId.message).toBe('Secret not found');
  });

  it('alreadyExistsError builds a 409 with/without identifier', () => {
    const withId = alreadyExistsError('Team', 't_1');
    expect(withId.code).toBe(ErrorCodes.RESOURCE_ALREADY_EXISTS);
    expect(withId.statusCode).toBe(409);
    expect(withId.message).toBe("Team 't_1' already exists");

    const noId = alreadyExistsError('Team');
    expect(noId.message).toBe('Team already exists');
  });

  it('validationError builds a 400 carrying the field', () => {
    const err = validationError('required', 'email', { form: 'signup' });
    expect(err.code).toBe(ErrorCodes.VALIDATION_REQUIRED_FIELD);
    expect(err.statusCode).toBe(400);
    expect(err.context).toMatchObject({ field: 'email', form: 'signup' });
  });

  it('unauthorizedError defaults message and maps to 401', () => {
    const err = unauthorizedError();
    expect(err.code).toBe(ErrorCodes.AUTH_UNAUTHORIZED);
    expect(err.statusCode).toBe(401);
    expect(err.message).toBe('Unauthorized');
  });

  it('forbiddenError defaults message and maps to 403', () => {
    const err = forbiddenError();
    expect(err.code).toBe(ErrorCodes.AUTH_FORBIDDEN);
    expect(err.statusCode).toBe(403);
    expect(err.message).toBe('Insufficient permissions');
  });
});
