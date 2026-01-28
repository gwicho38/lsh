/**
 * Input Validation Utilities
 * Provides secure input validation for user-facing data
 */
/**
 * Result of email validation
 */
export interface EmailValidationResult {
    /** Whether the email is valid */
    valid: boolean;
    /** Normalized email (lowercase, trimmed) */
    normalized?: string;
    /** Error code if invalid */
    error?: EmailValidationError;
    /** Human-readable error message */
    message?: string;
}
/**
 * Email validation error codes
 */
export type EmailValidationError = 'EMPTY' | 'INVALID_FORMAT' | 'INVALID_LOCAL_PART' | 'INVALID_DOMAIN' | 'DOMAIN_TOO_SHORT' | 'TOO_LONG' | 'DISPOSABLE_DOMAIN';
/**
 * Validate an email address.
 *
 * Performs the following checks:
 * 1. Not empty or whitespace-only
 * 2. Within length limits (254 chars total, 64 chars local part)
 * 3. Matches RFC 5322 email format
 * 4. Domain has at least one dot (e.g., rejects "user@localhost")
 * 5. Optionally blocks disposable email domains
 *
 * @param email - Email address to validate
 * @param options - Validation options
 * @returns Validation result with normalized email if valid
 *
 * @example
 * ```typescript
 * const result = validateEmail('User@Example.COM');
 * if (result.valid) {
 *   console.log(result.normalized); // 'user@example.com'
 * } else {
 *   console.error(result.message);
 * }
 * ```
 */
export declare function validateEmail(email: string | null | undefined, options?: {
    /** Block known disposable email domains */
    blockDisposable?: boolean;
    /** Require domain to have a TLD (dot in domain) */
    requireTld?: boolean;
}): EmailValidationResult;
/**
 * Quick check if an email is valid (without detailed error info).
 *
 * @param email - Email to check
 * @returns true if valid, false otherwise
 */
export declare function isValidEmail(email: string | null | undefined): boolean;
/**
 * Normalize an email address (lowercase, trimmed).
 * Returns null if email is invalid.
 *
 * @param email - Email to normalize
 * @returns Normalized email or null if invalid
 */
export declare function normalizeEmail(email: string | null | undefined): string | null;
/**
 * Result of password validation
 */
export interface PasswordValidationResult {
    /** Whether the password meets requirements */
    valid: boolean;
    /** Specific validation failures */
    errors: PasswordValidationError[];
    /** Password strength score (0-4) */
    strength: 0 | 1 | 2 | 3 | 4;
    /** Human-readable strength label */
    strengthLabel: 'very_weak' | 'weak' | 'fair' | 'strong' | 'very_strong';
}
/**
 * Password validation error codes
 */
export type PasswordValidationError = 'TOO_SHORT' | 'TOO_LONG' | 'NO_LOWERCASE' | 'NO_UPPERCASE' | 'NO_DIGIT' | 'NO_SPECIAL' | 'COMMON_PASSWORD';
/**
 * Validate a password against security requirements.
 *
 * Requirements:
 * - 8-72 characters
 * - At least one lowercase letter
 * - At least one uppercase letter
 * - At least one digit
 * - At least one special character
 * - Not a common password
 *
 * @param password - Password to validate
 * @param options - Validation options
 * @returns Validation result with strength score
 */
export declare function validatePassword(password: string | null | undefined, options?: {
    /** Minimum length (default: 8) */
    minLength?: number;
    /** Require uppercase letter */
    requireUppercase?: boolean;
    /** Require lowercase letter */
    requireLowercase?: boolean;
    /** Require digit */
    requireDigit?: boolean;
    /** Require special character */
    requireSpecial?: boolean;
    /** Check against common passwords */
    checkCommon?: boolean;
}): PasswordValidationResult;
/**
 * Quick check if a password meets minimum requirements.
 *
 * @param password - Password to check
 * @returns true if valid, false otherwise
 */
export declare function isValidPassword(password: string | null | undefined): boolean;
