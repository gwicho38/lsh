/**
 * Input Validation Utilities
 * Provides secure input validation for user-facing data
 */

// ============================================================================
// EMAIL VALIDATION
// ============================================================================

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
export type EmailValidationError =
  | 'EMPTY'
  | 'INVALID_FORMAT'
  | 'INVALID_LOCAL_PART'
  | 'INVALID_DOMAIN'
  | 'DOMAIN_TOO_SHORT'
  | 'TOO_LONG'
  | 'DISPOSABLE_DOMAIN';

/**
 * Common disposable email domains that should be blocked for signups.
 * This is a minimal list - consider using a more comprehensive service
 * for production use.
 */
const DISPOSABLE_EMAIL_DOMAINS = new Set([
  'mailinator.com',
  'guerrillamail.com',
  'guerrillamail.org',
  'tempmail.com',
  'temp-mail.org',
  '10minutemail.com',
  'throwaway.email',
  'fakeinbox.com',
  'trashmail.com',
  'yopmail.com',
  'maildrop.cc',
  'getnada.com',
  'sharklasers.com',
  'dispostable.com',
  'mailnesia.com',
]);

/**
 * RFC 5322 compliant email regex (simplified but comprehensive).
 * Allows most valid email formats while rejecting clearly invalid ones.
 */
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

/**
 * Maximum email length per RFC 5321
 */
const MAX_EMAIL_LENGTH = 254;

/**
 * Maximum local part length per RFC 5321
 */
const MAX_LOCAL_PART_LENGTH = 64;

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
export function validateEmail(
  email: string | null | undefined,
  options: {
    /** Block known disposable email domains */
    blockDisposable?: boolean;
    /** Require domain to have a TLD (dot in domain) */
    requireTld?: boolean;
  } = {}
): EmailValidationResult {
  const { blockDisposable = false, requireTld = true } = options;

  // Check for empty/null/undefined
  if (!email || typeof email !== 'string') {
    return {
      valid: false,
      error: 'EMPTY',
      message: 'Email address is required',
    };
  }

  // Trim whitespace
  const trimmed = email.trim();

  if (trimmed.length === 0) {
    return {
      valid: false,
      error: 'EMPTY',
      message: 'Email address is required',
    };
  }

  // Check total length
  if (trimmed.length > MAX_EMAIL_LENGTH) {
    return {
      valid: false,
      error: 'TOO_LONG',
      message: `Email address must be ${MAX_EMAIL_LENGTH} characters or less`,
    };
  }

  // Split into local and domain parts
  const atIndex = trimmed.lastIndexOf('@');
  if (atIndex === -1) {
    return {
      valid: false,
      error: 'INVALID_FORMAT',
      message: 'Email address must contain @',
    };
  }

  const localPart = trimmed.substring(0, atIndex);
  const domain = trimmed.substring(atIndex + 1);

  // Check local part length
  if (localPart.length === 0) {
    return {
      valid: false,
      error: 'INVALID_LOCAL_PART',
      message: 'Email local part (before @) is required',
    };
  }

  if (localPart.length > MAX_LOCAL_PART_LENGTH) {
    return {
      valid: false,
      error: 'INVALID_LOCAL_PART',
      message: `Email local part must be ${MAX_LOCAL_PART_LENGTH} characters or less`,
    };
  }

  // Check domain
  if (domain.length === 0) {
    return {
      valid: false,
      error: 'INVALID_DOMAIN',
      message: 'Email domain (after @) is required',
    };
  }

  // Require TLD (at least one dot in domain)
  if (requireTld && !domain.includes('.')) {
    return {
      valid: false,
      error: 'DOMAIN_TOO_SHORT',
      message: 'Email domain must include a valid TLD (e.g., .com, .org)',
    };
  }

  // Check domain TLD length (must be at least 2 chars)
  if (requireTld) {
    const lastDot = domain.lastIndexOf('.');
    const tld = domain.substring(lastDot + 1);
    if (tld.length < 2) {
      return {
        valid: false,
        error: 'DOMAIN_TOO_SHORT',
        message: 'Email domain TLD must be at least 2 characters',
      };
    }
  }

  // Validate format with regex
  if (!EMAIL_REGEX.test(trimmed)) {
    return {
      valid: false,
      error: 'INVALID_FORMAT',
      message: 'Email address format is invalid',
    };
  }

  // Normalize to lowercase
  const normalized = trimmed.toLowerCase();
  const normalizedDomain = domain.toLowerCase();

  // Check for disposable domains
  if (blockDisposable && DISPOSABLE_EMAIL_DOMAINS.has(normalizedDomain)) {
    return {
      valid: false,
      error: 'DISPOSABLE_DOMAIN',
      message: 'Disposable email addresses are not allowed',
    };
  }

  return {
    valid: true,
    normalized,
  };
}

/**
 * Quick check if an email is valid (without detailed error info).
 *
 * @param email - Email to check
 * @returns true if valid, false otherwise
 */
export function isValidEmail(email: string | null | undefined): boolean {
  return validateEmail(email).valid;
}

/**
 * Normalize an email address (lowercase, trimmed).
 * Returns null if email is invalid.
 *
 * @param email - Email to normalize
 * @returns Normalized email or null if invalid
 */
export function normalizeEmail(email: string | null | undefined): string | null {
  const result = validateEmail(email);
  return result.valid ? result.normalized! : null;
}

// ============================================================================
// PASSWORD VALIDATION
// ============================================================================

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
export type PasswordValidationError =
  | 'TOO_SHORT'
  | 'TOO_LONG'
  | 'NO_LOWERCASE'
  | 'NO_UPPERCASE'
  | 'NO_DIGIT'
  | 'NO_SPECIAL'
  | 'COMMON_PASSWORD';

/**
 * Common passwords to reject (minimal list - use larger database in production)
 */
const COMMON_PASSWORDS = new Set([
  'password',
  'password1',
  'password123',
  '123456',
  '12345678',
  '123456789',
  '1234567890',
  'qwerty',
  'qwerty123',
  'letmein',
  'welcome',
  'admin',
  'login',
  'abc123',
  'monkey',
  'master',
  'dragon',
  'sunshine',
  'princess',
  'football',
  'baseball',
  'iloveyou',
  'trustno1',
  'superman',
  'batman',
]);

/**
 * Minimum password length
 */
const MIN_PASSWORD_LENGTH = 8;

/**
 * Maximum password length (bcrypt has a 72-byte limit)
 */
const MAX_PASSWORD_LENGTH = 72;

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
export function validatePassword(
  password: string | null | undefined,
  options: {
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
  } = {}
): PasswordValidationResult {
  const {
    minLength = MIN_PASSWORD_LENGTH,
    requireUppercase = true,
    requireLowercase = true,
    requireDigit = true,
    requireSpecial = true,
    checkCommon = true,
  } = options;

  const errors: PasswordValidationError[] = [];
  let strength = 0;

  // Handle null/undefined
  if (!password || typeof password !== 'string') {
    return {
      valid: false,
      errors: ['TOO_SHORT'],
      strength: 0,
      strengthLabel: 'very_weak',
    };
  }

  // Check length
  if (password.length < minLength) {
    errors.push('TOO_SHORT');
  } else {
    strength++;
  }

  if (password.length > MAX_PASSWORD_LENGTH) {
    errors.push('TOO_LONG');
  }

  // Check for lowercase
  if (requireLowercase && !/[a-z]/.test(password)) {
    errors.push('NO_LOWERCASE');
  } else if (/[a-z]/.test(password)) {
    strength++;
  }

  // Check for uppercase
  if (requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('NO_UPPERCASE');
  } else if (/[A-Z]/.test(password)) {
    strength++;
  }

  // Check for digit
  if (requireDigit && !/\d/.test(password)) {
    errors.push('NO_DIGIT');
  } else if (/\d/.test(password)) {
    strength++;
  }

  // Check for special character
  if (requireSpecial && !/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(password)) {
    errors.push('NO_SPECIAL');
  }

  // Check for common passwords
  if (checkCommon && COMMON_PASSWORDS.has(password.toLowerCase())) {
    errors.push('COMMON_PASSWORD');
  }

  // Cap strength at 4
  const cappedStrength = Math.min(strength, 4) as 0 | 1 | 2 | 3 | 4;

  const strengthLabels: Record<0 | 1 | 2 | 3 | 4, PasswordValidationResult['strengthLabel']> = {
    0: 'very_weak',
    1: 'weak',
    2: 'fair',
    3: 'strong',
    4: 'very_strong',
  };

  return {
    valid: errors.length === 0,
    errors,
    strength: cappedStrength,
    strengthLabel: strengthLabels[cappedStrength],
  };
}

/**
 * Quick check if a password meets minimum requirements.
 *
 * @param password - Password to check
 * @returns true if valid, false otherwise
 */
export function isValidPassword(password: string | null | undefined): boolean {
  return validatePassword(password).valid;
}
