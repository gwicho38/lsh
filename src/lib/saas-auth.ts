/**
 * LSH SaaS Authentication Service
 * Handles user signup, login, email verification, and session management
 */

import { randomBytes } from 'crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import type {
  User,
  LoginInput,
  SignupInput,
  AuthToken,
  AuthSession,
  Organization,
} from './saas-types.js';
import { getSupabaseClient } from './supabase-client.js';
import { ENV_VARS } from '../constants/index.js';

const BCRYPT_ROUNDS = 12;
const TOKEN_EXPIRY = 7 * 24 * 60 * 60; // 7 days in seconds
const REFRESH_TOKEN_EXPIRY = 30 * 24 * 60 * 60; // 30 days
const EMAIL_VERIFICATION_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours in ms

/**
 * Generate a secure random token
 */
function generateToken(length = 32): string {
  return randomBytes(length).toString('hex');
}

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate JWT access token
 */
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
 * Verify and decode JWT token
 */
export function verifyToken(token: string): { userId: string; email?: string; type: string } {
  const secret = process.env[ENV_VARS.LSH_JWT_SECRET];
  if (!secret) {
    throw new Error('LSH_JWT_SECRET is not set');
  }

  try {
    const decoded = jwt.verify(token, secret, {
      issuer: 'lsh-saas',
      audience: 'lsh-api',
    }) as any;

    return {
      userId: decoded.sub,
      email: decoded.email,
      type: decoded.type,
    };
  } catch (_error) {
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
  async signup(input: SignupInput): Promise<{ user: User; verificationToken: string }> {
    // Check if email already exists
    const { data: existingUser } = await this.supabase
      .from('users')
      .select('id')
      .eq('email', input.email.toLowerCase())
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
        email: input.email.toLowerCase(),
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
  async login(input: LoginInput, ipAddress?: string): Promise<AuthSession> {
    // Find user
    const { data: user, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('email', input.email.toLowerCase())
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
   * Request password reset
   */
  async requestPasswordReset(email: string): Promise<string> {
    const { data: user, error } = await this.supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .is('deleted_at', null)
      .single();

    if (error || !user) {
      // Don't reveal if email exists
      return generateToken();
    }

    const resetToken = generateToken();
    const _expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour (for future use)

    // Store reset token (we'll need a password_reset_tokens table)
    // For now, just return the token
    return resetToken;
  }

  /**
   * Reset password
   */
  async resetPassword(_token: string, _newPassword: string): Promise<void> {
    // TODO: Implement password reset
    // Need to create password_reset_tokens table
    throw new Error('Not implemented');
  }

  /**
   * Change password
   */
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
