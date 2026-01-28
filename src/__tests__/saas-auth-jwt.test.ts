/**
 * Tests for JWT type safety in saas-auth.ts
 * Validates proper typing and runtime validation of JWT payloads
 */

import {
  isJwtPayloadBase,
  isJwtAccessTokenPayload,
  isJwtRefreshTokenPayload,
  validateJwtPayload,
  type JwtAccessTokenPayload,
  type JwtRefreshTokenPayload,
  type VerifiedTokenResult,
} from '../lib/saas-types.js';

describe('JWT Type Guards', () => {
  describe('isJwtPayloadBase', () => {
    it('should return true for valid base payload', () => {
      const payload = { sub: 'user-123', type: 'access' };
      expect(isJwtPayloadBase(payload)).toBe(true);
    });

    it('should return true for refresh type', () => {
      const payload = { sub: 'user-123', type: 'refresh' };
      expect(isJwtPayloadBase(payload)).toBe(true);
    });

    it('should return false for null', () => {
      expect(isJwtPayloadBase(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isJwtPayloadBase(undefined)).toBe(false);
    });

    it('should return false for string', () => {
      expect(isJwtPayloadBase('not-a-payload')).toBe(false);
    });

    it('should return false for number', () => {
      expect(isJwtPayloadBase(123)).toBe(false);
    });

    it('should return false for missing sub', () => {
      const payload = { type: 'access' };
      expect(isJwtPayloadBase(payload)).toBe(false);
    });

    it('should return false for missing type', () => {
      const payload = { sub: 'user-123' };
      expect(isJwtPayloadBase(payload)).toBe(false);
    });

    it('should return false for empty sub', () => {
      const payload = { sub: '', type: 'access' };
      expect(isJwtPayloadBase(payload)).toBe(false);
    });

    it('should return false for invalid type', () => {
      const payload = { sub: 'user-123', type: 'invalid' };
      expect(isJwtPayloadBase(payload)).toBe(false);
    });

    it('should return false for non-string sub', () => {
      const payload = { sub: 123, type: 'access' };
      expect(isJwtPayloadBase(payload)).toBe(false);
    });
  });

  describe('isJwtAccessTokenPayload', () => {
    it('should return true for valid access token payload', () => {
      const payload: JwtAccessTokenPayload = {
        sub: 'user-123',
        type: 'access',
        email: 'test@example.com',
      };
      expect(isJwtAccessTokenPayload(payload)).toBe(true);
    });

    it('should return true with optional standard claims', () => {
      const payload: JwtAccessTokenPayload = {
        sub: 'user-123',
        type: 'access',
        email: 'test@example.com',
        iss: 'lsh-saas',
        aud: 'lsh-api',
        iat: Date.now() / 1000,
        exp: Date.now() / 1000 + 3600,
      };
      expect(isJwtAccessTokenPayload(payload)).toBe(true);
    });

    it('should return false for refresh token type', () => {
      const payload = {
        sub: 'user-123',
        type: 'refresh',
        email: 'test@example.com',
      };
      expect(isJwtAccessTokenPayload(payload)).toBe(false);
    });

    it('should return false for missing email', () => {
      const payload = {
        sub: 'user-123',
        type: 'access',
      };
      expect(isJwtAccessTokenPayload(payload)).toBe(false);
    });

    it('should return false for empty email', () => {
      const payload = {
        sub: 'user-123',
        type: 'access',
        email: '',
      };
      expect(isJwtAccessTokenPayload(payload)).toBe(false);
    });

    it('should return false for non-string email', () => {
      const payload = {
        sub: 'user-123',
        type: 'access',
        email: 123,
      };
      expect(isJwtAccessTokenPayload(payload)).toBe(false);
    });

    it('should return false for invalid base payload', () => {
      const payload = {
        type: 'access',
        email: 'test@example.com',
      };
      expect(isJwtAccessTokenPayload(payload)).toBe(false);
    });
  });

  describe('isJwtRefreshTokenPayload', () => {
    it('should return true for valid refresh token payload', () => {
      const payload: JwtRefreshTokenPayload = {
        sub: 'user-123',
        type: 'refresh',
      };
      expect(isJwtRefreshTokenPayload(payload)).toBe(true);
    });

    it('should return true with optional standard claims', () => {
      const payload: JwtRefreshTokenPayload = {
        sub: 'user-123',
        type: 'refresh',
        iss: 'lsh-saas',
        aud: 'lsh-api',
        iat: Date.now() / 1000,
        exp: Date.now() / 1000 + 86400,
      };
      expect(isJwtRefreshTokenPayload(payload)).toBe(true);
    });

    it('should return false for access token type', () => {
      const payload = {
        sub: 'user-123',
        type: 'access',
        email: 'test@example.com',
      };
      expect(isJwtRefreshTokenPayload(payload)).toBe(false);
    });

    it('should return false for invalid base payload', () => {
      const payload = {
        type: 'refresh',
      };
      expect(isJwtRefreshTokenPayload(payload)).toBe(false);
    });
  });
});

describe('validateJwtPayload', () => {
  describe('access token validation', () => {
    it('should return VerifiedTokenResult for valid access token', () => {
      const payload: JwtAccessTokenPayload = {
        sub: 'user-abc-123',
        type: 'access',
        email: 'user@example.com',
      };

      const result = validateJwtPayload(payload);

      expect(result).toEqual<VerifiedTokenResult>({
        userId: 'user-abc-123',
        email: 'user@example.com',
        type: 'access',
      });
    });

    it('should extract userId from sub claim', () => {
      const payload: JwtAccessTokenPayload = {
        sub: 'uuid-1234-5678-abcd',
        type: 'access',
        email: 'test@test.com',
      };

      const result = validateJwtPayload(payload);
      expect(result.userId).toBe('uuid-1234-5678-abcd');
    });

    it('should include email for access tokens', () => {
      const payload: JwtAccessTokenPayload = {
        sub: 'user-123',
        type: 'access',
        email: 'admin@company.org',
      };

      const result = validateJwtPayload(payload);
      expect(result.email).toBe('admin@company.org');
    });

    it('should throw for access token missing email', () => {
      const payload = {
        sub: 'user-123',
        type: 'access',
      };

      expect(() => validateJwtPayload(payload)).toThrow(
        'Invalid access token payload: missing email field'
      );
    });
  });

  describe('refresh token validation', () => {
    it('should return VerifiedTokenResult for valid refresh token', () => {
      const payload: JwtRefreshTokenPayload = {
        sub: 'user-xyz-789',
        type: 'refresh',
      };

      const result = validateJwtPayload(payload);

      expect(result).toEqual<VerifiedTokenResult>({
        userId: 'user-xyz-789',
        type: 'refresh',
      });
    });

    it('should not include email for refresh tokens', () => {
      const payload: JwtRefreshTokenPayload = {
        sub: 'user-123',
        type: 'refresh',
      };

      const result = validateJwtPayload(payload);
      expect(result.email).toBeUndefined();
    });
  });

  describe('invalid payload handling', () => {
    it('should throw for null', () => {
      expect(() => validateJwtPayload(null)).toThrow(
        'Invalid token payload: missing required fields (sub, type)'
      );
    });

    it('should throw for undefined', () => {
      expect(() => validateJwtPayload(undefined)).toThrow(
        'Invalid token payload: missing required fields (sub, type)'
      );
    });

    it('should throw for string payload', () => {
      expect(() => validateJwtPayload('not-an-object')).toThrow(
        'Invalid token payload: missing required fields (sub, type)'
      );
    });

    it('should throw for empty object', () => {
      expect(() => validateJwtPayload({})).toThrow(
        'Invalid token payload: missing required fields (sub, type)'
      );
    });

    it('should throw for missing sub', () => {
      expect(() => validateJwtPayload({ type: 'access', email: 'test@test.com' })).toThrow(
        'Invalid token payload: missing required fields (sub, type)'
      );
    });

    it('should throw for missing type', () => {
      expect(() => validateJwtPayload({ sub: 'user-123' })).toThrow(
        'Invalid token payload: missing required fields (sub, type)'
      );
    });

    it('should throw for invalid type value', () => {
      expect(() => validateJwtPayload({ sub: 'user-123', type: 'bearer' })).toThrow(
        'Invalid token payload: missing required fields (sub, type)'
      );
    });

    it('should throw for non-string sub', () => {
      expect(() => validateJwtPayload({ sub: 12345, type: 'access' })).toThrow(
        'Invalid token payload: missing required fields (sub, type)'
      );
    });

    it('should throw for empty sub', () => {
      expect(() => validateJwtPayload({ sub: '', type: 'access' })).toThrow(
        'Invalid token payload: missing required fields (sub, type)'
      );
    });
  });

  describe('real-world scenarios', () => {
    it('should handle payload with extra standard JWT claims', () => {
      const payload = {
        sub: 'user-123',
        type: 'access',
        email: 'user@example.com',
        iss: 'lsh-saas',
        aud: 'lsh-api',
        iat: 1706400000,
        exp: 1707004800,
        nbf: 1706400000,
      };

      const result = validateJwtPayload(payload);

      expect(result).toEqual<VerifiedTokenResult>({
        userId: 'user-123',
        email: 'user@example.com',
        type: 'access',
      });
    });

    it('should handle payload with extra custom claims', () => {
      const payload = {
        sub: 'user-123',
        type: 'refresh',
        customClaim: 'some-value',
        role: 'admin',
      };

      const result = validateJwtPayload(payload);

      expect(result).toEqual<VerifiedTokenResult>({
        userId: 'user-123',
        type: 'refresh',
      });
    });

    it('should handle UUID-formatted user IDs', () => {
      const payload = {
        sub: '550e8400-e29b-41d4-a716-446655440000',
        type: 'access',
        email: 'user@example.com',
      };

      const result = validateJwtPayload(payload);
      expect(result.userId).toBe('550e8400-e29b-41d4-a716-446655440000');
    });

    it('should handle international email addresses', () => {
      const payload = {
        sub: 'user-123',
        type: 'access',
        email: 'user@例え.jp',
      };

      const result = validateJwtPayload(payload);
      expect(result.email).toBe('user@例え.jp');
    });
  });
});
