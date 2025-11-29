/**
 * SaaS Authentication Service Tests
 * Tests for the AuthService class and helper functions
 */

import { describe, it, expect, beforeEach, beforeAll, afterAll, jest } from '@jest/globals';
import { randomBytes } from 'crypto';

// Mock Supabase - create fresh instance for each test
let mockSingleFn: jest.Mock;
let mockEqFn: jest.Mock;
let mockIsFn: jest.Mock;
let mockFromFn: jest.Mock;

const createMockSupabase = () => {
  const defaultResponse = { data: null, error: null };

  // Create a thenable chain that can be awaited or chained
  const chain: any = {
    from: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    select: jest.fn(),
    eq: jest.fn(),
    is: jest.fn(),
    single: jest.fn(),
    // Make it thenable for await
    then: (resolve: any) => Promise.resolve(defaultResponse).then(resolve),
    catch: () => Promise.resolve(defaultResponse),
  };

  chain.from.mockReturnValue(chain);
  chain.insert.mockReturnValue(chain);
  chain.update.mockReturnValue(chain);
  chain.select.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);
  chain.is.mockReturnValue(chain);
  chain.single.mockReturnValue(chain);

  // Store references for test assertions
  mockSingleFn = chain.single;
  mockEqFn = chain.eq;
  mockIsFn = chain.is;
  mockFromFn = chain.from;

  return chain;
};

let mockSupabase = createMockSupabase();

// Use a getter to dynamically return the current mockSupabase
jest.mock('../src/lib/supabase-client.js', () => ({
  get getSupabaseClient() {
    return () => mockSupabase;
  },
}));

// Store original env
const originalEnv = { ...process.env };

describe('SaaS Authentication Service', () => {
  let AuthService: typeof import('../src/lib/saas-auth.js').AuthService;
  let authService: InstanceType<typeof AuthService>;
  let hashPassword: typeof import('../src/lib/saas-auth.js').hashPassword;
  let verifyPassword: typeof import('../src/lib/saas-auth.js').verifyPassword;
  let generateAccessToken: typeof import('../src/lib/saas-auth.js').generateAccessToken;
  let generateRefreshToken: typeof import('../src/lib/saas-auth.js').generateRefreshToken;
  let verifyToken: typeof import('../src/lib/saas-auth.js').verifyToken;

  beforeAll(async () => {
    // Reset modules to ensure our mock is applied fresh
    jest.resetModules();

    // Re-establish the mock after reset
    jest.doMock('../src/lib/supabase-client.js', () => ({
      getSupabaseClient: () => mockSupabase,
    }));

    process.env.LSH_JWT_SECRET = randomBytes(32).toString('hex');

    const module = await import('../src/lib/saas-auth.js');
    AuthService = module.AuthService;
    hashPassword = module.hashPassword;
    verifyPassword = module.verifyPassword;
    generateAccessToken = module.generateAccessToken;
    generateRefreshToken = module.generateRefreshToken;
    verifyToken = module.verifyToken;
  });

  beforeEach(() => {
    // Create fresh mock for each test
    mockSupabase = createMockSupabase();
    process.env.LSH_JWT_SECRET = randomBytes(32).toString('hex');
    authService = new AuthService();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('Password Hashing', () => {
    it('should hash password correctly', async () => {
      const password = 'mySecurePassword123!';
      const hash = await hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash).toMatch(/^\$2[aby]\$/); // bcrypt hash pattern
    });

    it('should verify correct password', async () => {
      const password = 'testPassword456!';
      const hash = await hashPassword(password);

      const isValid = await verifyPassword(password, hash);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'correctPassword';
      const hash = await hashPassword(password);

      const isValid = await verifyPassword('wrongPassword', hash);
      expect(isValid).toBe(false);
    });
  });

  describe('JWT Token Generation', () => {
    it('should generate access token', () => {
      const userId = 'user-123';
      const email = 'test@example.com';

      const token = generateAccessToken(userId, email);

      expect(token).toBeDefined();
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('should generate refresh token', () => {
      const userId = 'user-123';

      const token = generateRefreshToken(userId);

      expect(token).toBeDefined();
      expect(token.split('.')).toHaveLength(3);
    });

    it('should throw error if JWT secret not set', () => {
      delete process.env.LSH_JWT_SECRET;

      expect(() => generateAccessToken('user-123', 'test@example.com')).toThrow(
        'LSH_JWT_SECRET is not set'
      );

      // Restore for other tests
      process.env.LSH_JWT_SECRET = randomBytes(32).toString('hex');
    });
  });

  describe('JWT Token Verification', () => {
    it('should verify valid access token', () => {
      const userId = 'user-123';
      const email = 'test@example.com';

      const token = generateAccessToken(userId, email);
      const decoded = verifyToken(token);

      expect(decoded.userId).toBe(userId);
      expect(decoded.email).toBe(email);
      expect(decoded.type).toBe('access');
    });

    it('should verify valid refresh token', () => {
      const userId = 'user-456';

      const token = generateRefreshToken(userId);
      const decoded = verifyToken(token);

      expect(decoded.userId).toBe(userId);
      expect(decoded.type).toBe('refresh');
    });

    it('should throw error for invalid token', () => {
      expect(() => verifyToken('invalid-token')).toThrow('Invalid or expired token');
    });

    it('should throw error for tampered token', () => {
      const token = generateAccessToken('user-123', 'test@example.com');
      const tamperedToken = token.slice(0, -5) + 'xxxxx';

      expect(() => verifyToken(tamperedToken)).toThrow('Invalid or expired token');
    });
  });

  describe('User Signup', () => {
    it('should create new user successfully', async () => {
      const input = {
        email: 'newuser@example.com',
        password: 'SecurePass123!',
        firstName: 'John',
        lastName: 'Doe',
      };

      // Mock: check for existing user returns none
      mockSingleFn.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116' },
      });

      // Mock: user creation succeeds
      mockSingleFn.mockResolvedValueOnce({
        data: {
          id: 'user-new',
          email: input.email.toLowerCase(),
          first_name: input.firstName,
          last_name: input.lastName,
          email_verified: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        error: null,
      });

      const result = await authService.signup(input);

      expect(result.user).toBeDefined();
      expect(result.user.email).toBe(input.email.toLowerCase());
      expect(result.verificationToken).toBeDefined();
      expect(result.verificationToken.length).toBeGreaterThan(0);
    });

    it('should throw error if email already exists', async () => {
      mockSingleFn.mockResolvedValueOnce({
        data: { id: 'existing-user' },
        error: null,
      });

      await expect(
        authService.signup({
          email: 'existing@example.com',
          password: 'Password123!',
        })
      ).rejects.toThrow('EMAIL_ALREADY_EXISTS');
    });
  });

  describe('Email Verification', () => {
    it('should verify email with valid token', async () => {
      const userId = 'user-123';
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);

      // Mock: find user with token
      mockSingleFn.mockResolvedValueOnce({
        data: {
          id: userId,
          email: 'test@example.com',
          email_verification_expires_at: futureDate.toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        error: null,
      });

      // Mock: update user
      mockSingleFn.mockResolvedValueOnce({
        data: {
          id: userId,
          email: 'test@example.com',
          email_verified: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        error: null,
      });

      const user = await authService.verifyEmail('valid-token');

      expect(user).toBeDefined();
      expect(user.emailVerified).toBe(true);
    });

    it('should throw error for invalid token', async () => {
      mockSingleFn.mockResolvedValueOnce({
        data: null,
        error: { message: 'Not found' },
      });

      await expect(authService.verifyEmail('invalid-token')).rejects.toThrow('INVALID_TOKEN');
    });

    it('should throw error for expired token', async () => {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000);

      mockSingleFn.mockResolvedValueOnce({
        data: {
          id: 'user-123',
          email_verification_expires_at: pastDate.toISOString(),
        },
        error: null,
      });

      await expect(authService.verifyEmail('expired-token')).rejects.toThrow('INVALID_TOKEN');
    });
  });

  describe('User Login', () => {
    it('should login with valid credentials', async () => {
      const password = 'ValidPassword123!';
      const passwordHash = await hashPassword(password);

      // Mock: find user (first .single() call)
      mockSingleFn.mockResolvedValueOnce({
        data: {
          id: 'user-123',
          email: 'test@example.com',
          password_hash: passwordHash,
          email_verified: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        error: null,
      });

      // Mock: getUserOrganizations returns empty (calls .is() which returns directly)
      // The is() call should return a promise-like object with data
      const originalIs = mockSupabase.is;
      let isCallCount = 0;
      mockSupabase.is = jest.fn().mockImplementation(() => {
        isCallCount++;
        // First .is() call is for login query - should return chain for .single()
        if (isCallCount === 1) {
          return mockSupabase;
        }
        // Second .is() call is for organizations - returns result directly
        return Promise.resolve({ data: [], error: null });
      }) as jest.Mock;

      const session = await authService.login({
        email: 'test@example.com',
        password: password,
      });

      expect(session.user).toBeDefined();
      expect(session.token.accessToken).toBeDefined();
      expect(session.token.refreshToken).toBeDefined();

      // Restore
      mockSupabase.is = originalIs;
    });

    it('should throw error for non-existent user', async () => {
      mockSingleFn.mockResolvedValueOnce({
        data: null,
        error: { message: 'Not found' },
      });

      await expect(
        authService.login({
          email: 'nonexistent@example.com',
          password: 'password',
        })
      ).rejects.toThrow('INVALID_CREDENTIALS');
    });

    it('should throw error for wrong password', async () => {
      const correctHash = await hashPassword('correct-password');

      mockSingleFn.mockResolvedValueOnce({
        data: {
          id: 'user-123',
          email: 'test@example.com',
          password_hash: correctHash,
          email_verified: true,
        },
        error: null,
      });

      await expect(
        authService.login({
          email: 'test@example.com',
          password: 'wrong-password',
        })
      ).rejects.toThrow('INVALID_CREDENTIALS');
    });

    it('should throw error for unverified email', async () => {
      const passwordHash = await hashPassword('password');

      mockSingleFn.mockResolvedValueOnce({
        data: {
          id: 'user-123',
          email: 'test@example.com',
          password_hash: passwordHash,
          email_verified: false,
        },
        error: null,
      });

      await expect(
        authService.login({
          email: 'test@example.com',
          password: 'password',
        })
      ).rejects.toThrow('EMAIL_NOT_VERIFIED');
    });
  });

  describe('Get User', () => {
    it('should get user by ID', async () => {
      mockSingleFn.mockResolvedValueOnce({
        data: {
          id: 'user-123',
          email: 'test@example.com',
          email_verified: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        error: null,
      });

      const user = await authService.getUserById('user-123');

      expect(user).toBeDefined();
      expect(user?.id).toBe('user-123');
    });

    it('should return null for non-existent user', async () => {
      mockSingleFn.mockResolvedValueOnce({
        data: null,
        error: { message: 'Not found' },
      });

      const user = await authService.getUserById('nonexistent');

      expect(user).toBeNull();
    });

    it('should get user by email', async () => {
      mockSingleFn.mockResolvedValueOnce({
        data: {
          id: 'user-123',
          email: 'test@example.com',
          email_verified: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        error: null,
      });

      const user = await authService.getUserByEmail('test@example.com');

      expect(user).toBeDefined();
      expect(user?.email).toBe('test@example.com');
    });
  });

  describe('Refresh Token', () => {
    it('should refresh access token with valid refresh token', async () => {
      const userId = 'user-123';
      const refreshToken = generateRefreshToken(userId);

      mockSingleFn.mockResolvedValueOnce({
        data: {
          email: 'test@example.com',
        },
        error: null,
      });

      const tokens = await authService.refreshAccessToken(refreshToken);

      expect(tokens.accessToken).toBeDefined();
      expect(tokens.refreshToken).toBeDefined();
      expect(tokens.expiresIn).toBeDefined();
    });

    it('should throw error for invalid refresh token', async () => {
      await expect(authService.refreshAccessToken('invalid-token')).rejects.toThrow(
        'Invalid or expired token'
      );
    });
  });

  describe('Password Management', () => {
    it('should change password with correct current password', async () => {
      const currentPassword = 'CurrentPass123!';
      const currentHash = await hashPassword(currentPassword);

      mockSingleFn.mockResolvedValueOnce({
        data: {
          password_hash: currentHash,
        },
        error: null,
      });

      await expect(
        authService.changePassword('user-123', currentPassword, 'NewPass456!')
      ).resolves.not.toThrow();
    });

    it('should throw error for wrong current password', async () => {
      const currentHash = await hashPassword('correct-password');

      mockSingleFn.mockResolvedValueOnce({
        data: {
          password_hash: currentHash,
        },
        error: null,
      });

      await expect(
        authService.changePassword('user-123', 'wrong-password', 'NewPass456!')
      ).rejects.toThrow('INVALID_CREDENTIALS');
    });

    it('should throw NOT_FOUND for non-existent user', async () => {
      mockSingleFn.mockResolvedValueOnce({
        data: null,
        error: { message: 'Not found' },
      });

      await expect(
        authService.changePassword('nonexistent', 'password', 'newPassword')
      ).rejects.toThrow('NOT_FOUND');
    });
  });

  describe('Resend Verification Email', () => {
    it('should generate new verification token', async () => {
      mockSingleFn.mockResolvedValueOnce({
        data: {
          id: 'user-123',
          email: 'test@example.com',
          email_verified: false,
        },
        error: null,
      });

      const token = await authService.resendVerificationEmail('test@example.com');

      expect(token).toBeDefined();
      expect(token.length).toBeGreaterThan(0);
    });

    it('should throw error if user not found', async () => {
      mockSingleFn.mockResolvedValueOnce({
        data: null,
        error: { message: 'Not found' },
      });

      await expect(authService.resendVerificationEmail('nonexistent@example.com')).rejects.toThrow(
        'NOT_FOUND'
      );
    });

    it('should throw error if already verified', async () => {
      mockSingleFn.mockResolvedValueOnce({
        data: {
          id: 'user-123',
          email: 'test@example.com',
          email_verified: true,
        },
        error: null,
      });

      await expect(authService.resendVerificationEmail('test@example.com')).rejects.toThrow(
        'Email already verified'
      );
    });
  });

  describe('Password Reset', () => {
    it('should request password reset and return token', async () => {
      mockSingleFn.mockResolvedValueOnce({
        data: { id: 'user-123' },
        error: null,
      });

      const token = await authService.requestPasswordReset('test@example.com');

      expect(token).toBeDefined();
      expect(token.length).toBeGreaterThan(0);
    });

    it('should return token even for non-existent email (security)', async () => {
      mockSingleFn.mockResolvedValueOnce({
        data: null,
        error: { message: 'Not found' },
      });

      // Should not reveal if email exists
      const token = await authService.requestPasswordReset('nonexistent@example.com');

      expect(token).toBeDefined();
    });

    it('should throw not implemented for resetPassword', async () => {
      await expect(authService.resetPassword('token', 'newPassword')).rejects.toThrow(
        'Not implemented'
      );
    });
  });
});
