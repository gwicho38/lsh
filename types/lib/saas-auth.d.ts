/**
 * LSH SaaS Authentication Service
 * Handles user signup, login, email verification, and session management
 */
import { type User, type LoginInput, type SignupInput, type AuthToken, type AuthSession, type Organization, type VerifiedTokenResult, type ValidateResetTokenResult } from './saas-types.js';
/**
 * Hash a password using bcrypt
 */
export declare function hashPassword(password: string): Promise<string>;
/**
 * Verify a password against a hash
 */
export declare function verifyPassword(password: string, hash: string): Promise<boolean>;
/**
 * Generate JWT access token
 */
export declare function generateAccessToken(userId: string, email: string): string;
/**
 * Generate JWT refresh token
 */
export declare function generateRefreshToken(userId: string): string;
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
export declare function verifyToken(token: string): VerifiedTokenResult;
/**
 * Authentication Service
 */
export declare class AuthService {
    private supabase;
    /**
     * Sign up a new user
     */
    signup(input: SignupInput): Promise<{
        user: User;
        verificationToken: string;
    }>;
    /**
     * Verify email address
     */
    verifyEmail(token: string): Promise<User>;
    /**
     * Resend email verification
     */
    resendVerificationEmail(email: string): Promise<string>;
    /**
     * Login with email and password
     */
    login(input: LoginInput, ipAddress?: string): Promise<AuthSession>;
    /**
     * Refresh access token
     */
    refreshAccessToken(refreshToken: string): Promise<AuthToken>;
    /**
     * Get user by ID
     */
    getUserById(userId: string): Promise<User | null>;
    /**
     * Get user by email
     */
    getUserByEmail(email: string): Promise<User | null>;
    /**
     * Get user's organizations
     */
    getUserOrganizations(userId: string): Promise<Organization[]>;
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
    requestPasswordReset(email: string, ipAddress?: string, userAgent?: string): Promise<string>;
    /**
     * Validate a password reset token.
     *
     * @param token - Plain reset token
     * @returns Validation result with user ID if valid
     */
    validateResetToken(token: string): Promise<ValidateResetTokenResult>;
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
    resetPassword(token: string, newPassword: string): Promise<void>;
    /**
     * Change password
     */
    changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void>;
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
    private mapDbUserToUser;
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
    private mapDbOrgToOrg;
}
/**
 * Singleton instance
 */
export declare const authService: AuthService;
