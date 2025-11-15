/**
 * LSH SaaS Authentication Service
 * Handles user signup, login, email verification, and session management
 */
import type { User, LoginInput, SignupInput, AuthToken, AuthSession, Organization } from './saas-types.js';
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
 * Verify and decode JWT token
 */
export declare function verifyToken(token: string): {
    userId: string;
    email?: string;
    type: string;
};
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
     * Request password reset
     */
    requestPasswordReset(email: string): Promise<string>;
    /**
     * Reset password
     */
    resetPassword(token: string, newPassword: string): Promise<void>;
    /**
     * Change password
     */
    changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void>;
    /**
     * Map database user to User type
     */
    private mapDbUserToUser;
    /**
     * Map database organization to Organization type
     */
    private mapDbOrgToOrg;
}
/**
 * Singleton instance
 */
export declare const authService: AuthService;
