/**
 * LSH SaaS Authentication Service
 * Handles user signup, login, email verification, and session management
 */

import { randomBytes, createHash } from 'crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import {
  type User,
  type LoginInput,
  type SignupInput,
  type AuthToken,
  type AuthSession,
  type Organization,
  type VerifiedTokenResult,
  type ValidateResetTokenResult,
  validateJwtPayload,
} from './saas-types.js';
import { getSupabaseClient } from './supabase-client.js';
import { ENV_VARS } from '../constants/index.js';
import { validateEmail, validatePassword } from './input-validator.js';

const BCRYPT_ROUNDS = 12;
const TOKEN_EXPIRY = 7 * 24 * 60 * 60; // 7 days in seconds
const REFRESH_TOKEN_EXPIRY = 30 * 24 * 60 * 60; // 30 days
const EMAIL_VERIFICATION_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours in ms
const PASSWORD_RESET_EXPIRY = 60 * 60 * 1000; // 1 hour in ms

/**
 * Generate a secure random token
 */
// TODO(@gwicho38): Review - generateToken
function generateToken(length = 32): string {
  return randomBytes(length).toString('hex');
}

/**
 * Hash a token using SHA-256.
 * Used for storing reset tokens securely (we only store the hash).
 */
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Hash a password using bcrypt
 */
// TODO(@gwicho38): Review - hashPassword
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

/**
 * Verify a password against a hash
 */
// TODO(@gwicho38): Review - verifyPassword
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate JWT access token
 */
// TODO(@gwicho38): Review - generateAccessToken
export function generateAccessToken(userId: string, email: string): string {
  const secret = process.env[ENV_VARS.LSH_JWT_SECRET];
  if (!secret) {
    throw new Error('LSH_JWT_SECRET is not set');
  }

  return jwt.sign(
    {
      sub: userId,
      email,
      type: 'access',
    },
    secret,
    {
      expiresIn: TOKEN_EXPIRY,
      issuer: 'lsh-saas',
      audience: 'lsh-api',
    }
  );
}

/**
 * Generate JWT refresh token
 */
// TODO(@gwicho38): Review - generateRefreshToken
export function generateRefreshToken(userId: string): string {
  const secret = process.env[ENV_VARS.LSH_JWT_SECRET];
  if (!secret) {
    throw new Error('LSH_JWT_SECRET is not set');
  }

  return jwt.sign(
    {
      sub: userId,
      type: 'refresh',
    },
    secret,
    {
      expiresIn: REFRESH_TOKEN_EXPIRY,
      issuer: 'lsh-saas',
      audience: 'lsh-api',
    }
  );
}

/**
 * Verify and decode JWT token with runtime validation.
 *
 * This function performs both cryptographic verification (via jsonwebtoken)
 * and structural validation (via validateJwtPayload) to ensure type safety.
 *
 * @param token - JWT string to verify
 * @returns Validated token payload with proper typing
 * @throws Error if token is invalid, expired, or has unexpected structure
 *
 * @example
 * ```typescript
 * const { userId, email, type } = verifyToken(bearerToken);
 * if (type === 'access' && email) {
 *   // Access token logic
 * }
 * ```
 */
// TODO(@gwicho38): Review - verifyToken
export function verifyToken(token: string): VerifiedTokenResult {
  const secret = process.env[ENV_VARS.LSH_JWT_SECRET];
  if (!secret) {
    throw new Error('LSH_JWT_SECRET is not set');
  }

  try {
    // jwt.verify returns JwtPayload | string, we need to validate the structure
    const decoded = jwt.verify(token, secret, {
      issuer: 'lsh-saas',
      audience: 'lsh-api',
    });

    // Validate payload structure and get properly typed result
    return validateJwtPayload(decoded);
  } catch (error) {
    // Re-throw validation errors with original message for debugging
    if (error instanceof Error && error.message.startsWith('Invalid')) {
      throw error;
    }
    // Generic error for JWT library errors (expired, bad signature, etc.)
    throw new Error('Invalid or expired token');
  }
}

/**
 * Authentication Service
 */
export class AuthService {
  private supabase = getSupabaseClient();

  /**
   * Sign up a new user
   */
  // TODO(@gwicho38): Review - signup
  async signup(input: SignupInput): Promise<{ user: User; verificationToken: string }> {
    // Validate email format
    const emailValidation = validateEmail(input.email, { blockDisposable: true });
    if (!emailValidation.valid) {
      throw new Error(`INVALID_EMAIL: ${emailValidation.message}`);
    }

    // Validate password strength
    const passwordValidation = validatePassword(input.password);
    if (!passwordValidation.valid) {
      const errorMessages = passwordValidation.errors.map((e) => {
        switch (e) {
          case 'TOO_SHORT':
            return 'Password must be at least 8 characters';
          case 'TOO_LONG':
            return 'Password must be 72 characters or less';
          case 'NO_LOWERCASE':
            return 'Password must contain a lowercase letter';
          case 'NO_UPPERCASE':
            return 'Password must contain an uppercase letter';
          case 'NO_DIGIT':
            return 'Password must contain a digit';
          case 'NO_SPECIAL':
            return 'Password must contain a special character';
          case 'COMMON_PASSWORD':
            return 'Password is too common';
          default:
            return 'Invalid password';
        }
      });
      throw new Error(`INVALID_PASSWORD: ${errorMessages.join(', ')}`);
    }

    // Check if email already exists
    const { data: existingUser } = await this.supabase
      .from('users')
      .select('id')
      .eq('email', emailValidation.normalized!)
      .single();

    if (existingUser) {
      throw new Error('EMAIL_ALREADY_EXISTS');
    }

    // Hash password
    const passwordHash = await hashPassword(input.password);

    // Generate email verification token
    const verificationToken = generateToken();
    const verificationExpiresAt = new Date(Date.now() + EMAIL_VERIFICATION_EXPIRY);

    // Create user
    const { data: user, error } = await this.supabase
      .from('users')
      .insert({
        email: emailValidation.normalized!,
        password_hash: passwordHash,
        first_name: input.firstName || null,
        last_name: input.lastName || null,
        email_verified: false,
        email_verification_token: verificationToken,
        email_verification_expires_at: verificationExpiresAt.toISOString(),
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create user: ${error.message}`);
    }

    return {
      user: this.mapDbUserToUser(user),
      verificationToken,
    };
  }

  /**
   * Verify email address
   */
  // TODO(@gwicho38): Review - verifyEmail
  async verifyEmail(token: string): Promise<User> {
    const { data: user, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('email_verification_token', token)
      .single();

    if (error || !user) {
      throw new Error('INVALID_TOKEN');
    }

    // Check if token expired
    const expiresAt = new Date(user.email_verification_expires_at);
    if (expiresAt < new Date()) {
      throw new Error('INVALID_TOKEN');
    }

    // Mark email as verified
    const { data: updatedUser, error: updateError } = await this.supabase
      .from('users')
      .update({
        email_verified: true,
        email_verification_token: null,
        email_verification_expires_at: null,
      })
      .eq('id', user.id)
      .select()
      .single();

    if (updateError) {
      throw new Error('Failed to verify email');
    }

    return this.mapDbUserToUser(updatedUser);
  }

  /**
   * Resend email verification
   */
  // TODO(@gwicho38): Review - resendVerificationEmail
  async resendVerificationEmail(email: string): Promise<string> {
    const { data: user, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();

    if (error || !user) {
      throw new Error('NOT_FOUND');
    }

    if (user.email_verified) {
      throw new Error('Email already verified');
    }

    // Generate new token
    const verificationToken = generateToken();
    const verificationExpiresAt = new Date(Date.now() + EMAIL_VERIFICATION_EXPIRY);

    await this.supabase
      .from('users')
      .update({
        email_verification_token: verificationToken,
        email_verification_expires_at: verificationExpiresAt.toISOString(),
      })
      .eq('id', user.id);

    return verificationToken;
  }

  /**
   * Login with email and password
   */
  // TODO(@gwicho38): Review - login
  async login(input: LoginInput, ipAddress?: string): Promise<AuthSession> {
    // Validate email format (basic check - don't block disposable for login)
    const emailValidation = validateEmail(input.email, { blockDisposable: false });
    if (!emailValidation.valid) {
      // Don't reveal if email format was the issue - use generic error
      throw new Error('INVALID_CREDENTIALS');
    }

    // Find user
    const { data: user, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('email', emailValidation.normalized!)
      .is('deleted_at', null)
      .single();

    if (error || !user) {
      throw new Error('INVALID_CREDENTIALS');
    }

    // Verify password
    if (!user.password_hash) {
      throw new Error('INVALID_CREDENTIALS');
    }

    const isValidPassword = await verifyPassword(input.password, user.password_hash);
    if (!isValidPassword) {
      throw new Error('INVALID_CREDENTIALS');
    }

    // Check if email is verified
    if (!user.email_verified) {
      throw new Error('EMAIL_NOT_VERIFIED');
    }

    // Update last login
    await this.supabase
      .from('users')
      .update({
        last_login_at: new Date().toISOString(),
        last_login_ip: ipAddress || null,
      })
      .eq('id', user.id);

    // Get user's organizations
    const organizations = await this.getUserOrganizations(user.id);

    // Generate tokens
    const accessToken = generateAccessToken(user.id, user.email);
    const refreshToken = generateRefreshToken(user.id);

    return {
      user: this.mapDbUserToUser(user),
      organizations,
      currentOrganization: organizations[0],
      token: {
        accessToken,
        refreshToken,
        expiresIn: TOKEN_EXPIRY,
      },
    };
  }

  /**
   * Refresh access token
   */
  // TODO(@gwicho38): Review - refreshAccessToken
  async refreshAccessToken(refreshToken: string): Promise<AuthToken> {
    const { userId } = verifyToken(refreshToken);

    const { data: user, error } = await this.supabase
      .from('users')
      .select('email')
      .eq('id', userId)
      .is('deleted_at', null)
      .single();

    if (error || !user) {
      throw new Error('INVALID_TOKEN');
    }

    const accessToken = generateAccessToken(userId, user.email);
    const newRefreshToken = generateRefreshToken(userId);

    return {
      accessToken,
      refreshToken: newRefreshToken,
      expiresIn: TOKEN_EXPIRY,
    };
  }

  /**
   * Get user by ID
   */
  // TODO(@gwicho38): Review - getUserById
  async getUserById(userId: string): Promise<User | null> {
    const { data: user, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .is('deleted_at', null)
      .single();

    if (error || !user) {
      return null;
    }

    return this.mapDbUserToUser(user);
  }

  /**
   * Get user by email
   */
  // TODO(@gwicho38): Review - getUserByEmail
  async getUserByEmail(email: string): Promise<User | null> {
    const { data: user, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .is('deleted_at', null)
      .single();

    if (error || !user) {
      return null;
    }

    return this.mapDbUserToUser(user);
  }

  /**
   * Get user's organizations
   */
  // TODO(@gwicho38): Review - getUserOrganizations
  async getUserOrganizations(userId: string): Promise<Organization[]> {
    const { data, error } = await this.supabase
      .from('organization_members')
      .select(
        `
        organization_id,
        organizations (
          id,
          name,
          slug,
          created_at,
          updated_at,
          stripe_customer_id,
          subscription_tier,
          subscription_status,
          subscription_expires_at,
          settings,
          deleted_at
        )
      `
      )
      .eq('user_id', userId)
      .is('organizations.deleted_at', null);

    if (error) {
      throw new Error(`Failed to get user organizations: ${error.message}`);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- DB join result
    return (data || []).map((row: any) => this.mapDbOrgToOrg(row.organizations));
  }

  /**
   * Request password reset.
   *
   * Creates a secure reset token, stores its hash in the database,
   * and returns the plain token for sending via email.
   *
   * Security considerations:
   * - Only the token hash is stored (plain token never persisted)
   * - Returns a dummy token if email doesn't exist (timing-safe)
   * - Tokens expire after PASSWORD_RESET_EXPIRY (1 hour)
   * - Old unused tokens for the user are invalidated
   *
   * @param email - User's email address
   * @param ipAddress - Optional IP address of requester
   * @param userAgent - Optional user agent of requester
   * @returns Plain reset token to send via email
   */
  // TODO(@gwicho38): Review - requestPasswordReset
  async requestPasswordReset(
    email: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<string> {
    // Validate email format (don't block disposable - they might have signed up with one)
    const emailValidation = validateEmail(email, { blockDisposable: false });
    if (!emailValidation.valid) {
      // Return dummy token to prevent enumeration (same as non-existent email)
      return generateToken();
    }

    const { data: user, error } = await this.supabase
      .from('users')
      .select('id')
      .eq('email', emailValidation.normalized!)
      .is('deleted_at', null)
      .single();

    if (error || !user) {
      // Don't reveal if email exists - return dummy token
      // This prevents email enumeration attacks
      return generateToken();
    }

    // Generate secure token
    const resetToken = generateToken();
    const tokenHash = hashToken(resetToken);
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_EXPIRY);

    // Invalidate any existing unused tokens for this user
    await this.supabase
      .from('password_reset_tokens')
      .delete()
      .eq('user_id', user.id)
      .is('used_at', null);

    // Store the new token hash
    const { error: insertError } = await this.supabase
      .from('password_reset_tokens')
      .insert({
        user_id: user.id,
        token_hash: tokenHash,
        expires_at: expiresAt.toISOString(),
        requested_ip: ipAddress || null,
        requested_user_agent: userAgent || null,
      });

    if (insertError) {
      // Log error but don't reveal to user
      console.error('Failed to create password reset token:', insertError.message);
      // Return dummy token to maintain consistent behavior
      return generateToken();
    }

    return resetToken;
  }

  /**
   * Validate a password reset token.
   *
   * @param token - Plain reset token
   * @returns Validation result with user ID if valid
   */
  // TODO(@gwicho38): Review - validateResetToken
  async validateResetToken(token: string): Promise<ValidateResetTokenResult> {
    const tokenHash = hashToken(token);

    const { data: resetToken, error } = await this.supabase
      .from('password_reset_tokens')
      .select('id, user_id, expires_at, used_at')
      .eq('token_hash', tokenHash)
      .single();

    if (error || !resetToken) {
      return { valid: false, error: 'INVALID_TOKEN' };
    }

    // Check if already used
    if (resetToken.used_at) {
      return { valid: false, error: 'ALREADY_USED' };
    }

    // Check if expired
    const expiresAt = new Date(resetToken.expires_at);
    if (expiresAt < new Date()) {
      return { valid: false, error: 'EXPIRED_TOKEN' };
    }

    return { valid: true, userId: resetToken.user_id };
  }

  /**
   * Reset password using a valid reset token.
   *
   * Security considerations:
   * - Token is validated and marked as used atomically
   * - Password is hashed with bcrypt before storage
   * - Token can only be used once
   *
   * @param token - Plain reset token from email
   * @param newPassword - New password to set
   * @throws Error if token is invalid, expired, or already used
   */
  // TODO(@gwicho38): Review - resetPassword
  async resetPassword(token: string, newPassword: string): Promise<void> {
    // Validate password strength
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
      const errorMessages = passwordValidation.errors.map((e) => {
        switch (e) {
          case 'TOO_SHORT':
            return 'Password must be at least 8 characters';
          case 'TOO_LONG':
            return 'Password must be 72 characters or less';
          case 'NO_LOWERCASE':
            return 'Password must contain a lowercase letter';
          case 'NO_UPPERCASE':
            return 'Password must contain an uppercase letter';
          case 'NO_DIGIT':
            return 'Password must contain a digit';
          case 'NO_SPECIAL':
            return 'Password must contain a special character';
          case 'COMMON_PASSWORD':
            return 'Password is too common';
          default:
            return 'Invalid password';
        }
      });
      throw new Error(`INVALID_PASSWORD: ${errorMessages.join(', ')}`);
    }

    // Validate the token
    const validation = await this.validateResetToken(token);

    if (!validation.valid || !validation.userId) {
      switch (validation.error) {
        case 'EXPIRED_TOKEN':
          throw new Error('EXPIRED_TOKEN');
        case 'ALREADY_USED':
          throw new Error('ALREADY_USED');
        default:
          throw new Error('INVALID_TOKEN');
      }
    }

    const tokenHash = hashToken(token);

    // Mark token as used
    const { error: updateTokenError } = await this.supabase
      .from('password_reset_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('token_hash', tokenHash)
      .is('used_at', null); // Only update if not already used (race condition protection)

    if (updateTokenError) {
      throw new Error('Failed to process reset token');
    }

    // Hash the new password
    const newPasswordHash = await hashPassword(newPassword);

    // Update the user's password
    const { error: updateUserError } = await this.supabase
      .from('users')
      .update({ password_hash: newPasswordHash })
      .eq('id', validation.userId);

    if (updateUserError) {
      throw new Error('Failed to update password');
    }
  }

  /**
   * Change password
   */
  // TODO(@gwicho38): Review - changePassword
  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const { data: user, error } = await this.supabase
      .from('users')
      .select('password_hash')
      .eq('id', userId)
      .single();

    if (error || !user) {
      throw new Error('NOT_FOUND');
    }

    // Verify current password
    if (!user.password_hash) {
      throw new Error('No password set');
    }

    const isValid = await verifyPassword(currentPassword, user.password_hash);
    if (!isValid) {
      throw new Error('INVALID_CREDENTIALS');
    }

    // Hash new password
    const newHash = await hashPassword(newPassword);

    // Update password
    await this.supabase.from('users').update({ password_hash: newHash }).eq('id', userId);
  }

  /**
   * Transform Supabase user record to domain model.
   *
   * Maps database snake_case columns to TypeScript camelCase properties:
   * - `email_verified` → `emailVerified` (boolean)
   * - `email_verification_token` → `emailVerificationToken` (nullable string)
   * - `email_verification_expires_at` → `emailVerificationExpiresAt` (nullable Date)
   * - `password_hash` → `passwordHash` (nullable, null for OAuth-only users)
   * - `oauth_provider` → `oauthProvider` ('google' | 'github' | 'microsoft' | null)
   * - `oauth_provider_id` → `oauthProviderId` (nullable)
   * - `first_name` → `firstName` (nullable)
   * - `last_name` → `lastName` (nullable)
   * - `avatar_url` → `avatarUrl` (nullable)
   * - `last_login_at` → `lastLoginAt` (nullable Date)
   * - `last_login_ip` → `lastLoginIp` (nullable)
   * - `deleted_at` → `deletedAt` (nullable Date, for soft delete)
   *
   * Security note: passwordHash is included in domain model but should
   * never be exposed in API responses.
   *
   * @param dbUser - Supabase record from 'users' table
   * @returns Domain User object
   * @see DbUserRecord in database-types.ts for input shape
   * @see User in saas-types.ts for output shape
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- DB row type varies by schema
  // TODO(@gwicho38): Review - mapDbUserToUser
  private mapDbUserToUser(dbUser: any): User {
    return {
      id: dbUser.id,
      email: dbUser.email,
      emailVerified: dbUser.email_verified,
      emailVerificationToken: dbUser.email_verification_token,
      emailVerificationExpiresAt: dbUser.email_verification_expires_at
        ? new Date(dbUser.email_verification_expires_at)
        : null,
      passwordHash: dbUser.password_hash,
      oauthProvider: dbUser.oauth_provider,
      oauthProviderId: dbUser.oauth_provider_id,
      firstName: dbUser.first_name,
      lastName: dbUser.last_name,
      avatarUrl: dbUser.avatar_url,
      lastLoginAt: dbUser.last_login_at ? new Date(dbUser.last_login_at) : null,
      lastLoginIp: dbUser.last_login_ip,
      createdAt: new Date(dbUser.created_at),
      updatedAt: new Date(dbUser.updated_at),
      deletedAt: dbUser.deleted_at ? new Date(dbUser.deleted_at) : null,
    };
  }

  /**
   * Transform Supabase organization record to domain model.
   *
   * Used when fetching user's organizations via the organization_members join.
   * Identical mapping logic to OrganizationService.mapDbOrgToOrg().
   *
   * Maps database snake_case columns to TypeScript camelCase properties:
   * - `stripe_customer_id` → `stripeCustomerId`
   * - `subscription_tier` → `subscriptionTier` (SubscriptionTier type)
   * - `subscription_status` → `subscriptionStatus` (SubscriptionStatus type)
   * - `subscription_expires_at` → `subscriptionExpiresAt` (nullable Date)
   * - `deleted_at` → `deletedAt` (nullable Date)
   *
   * @param dbOrg - Supabase record from 'organizations' table (via join)
   * @returns Domain Organization object
   * @see DbOrganizationRecord in database-types.ts for input shape
   * @see Organization in saas-types.ts for output shape
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- DB row type varies by schema
  // TODO(@gwicho38): Review - mapDbOrgToOrg
  private mapDbOrgToOrg(dbOrg: any): Organization {
    return {
      id: dbOrg.id,
      name: dbOrg.name,
      slug: dbOrg.slug,
      createdAt: new Date(dbOrg.created_at),
      updatedAt: new Date(dbOrg.updated_at),
      stripeCustomerId: dbOrg.stripe_customer_id,
      subscriptionTier: dbOrg.subscription_tier,
      subscriptionStatus: dbOrg.subscription_status,
      subscriptionExpiresAt: dbOrg.subscription_expires_at
        ? new Date(dbOrg.subscription_expires_at)
        : null,
      settings: dbOrg.settings || {},
      deletedAt: dbOrg.deleted_at ? new Date(dbOrg.deleted_at) : null,
    };
  }
}

/**
 * Singleton instance
 */
export const authService = new AuthService();
