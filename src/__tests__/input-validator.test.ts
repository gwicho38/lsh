/**
 * Tests for input-validator.ts
 * Tests email and password validation utilities
 */

import {
  validateEmail,
  isValidEmail,
  normalizeEmail,
  validatePassword,
  isValidPassword,
  type EmailValidationResult,
  type PasswordValidationResult,
} from '../lib/input-validator.js';

describe('Email Validation', () => {
  describe('validateEmail', () => {
    describe('valid emails', () => {
      const validEmails = [
        'test@example.com',
        'user.name@example.com',
        'user+tag@example.com',
        'user@subdomain.example.com',
        'user@example.co.uk',
        'a@b.co',
        'user123@example.org',
        'USER@EXAMPLE.COM', // Should normalize to lowercase
        '  test@example.com  ', // Should trim whitespace
        "user.name+tag@example.com",
        'user_name@example.com',
        'user-name@example.com',
      ];

      test.each(validEmails)('should accept valid email: %s', (email) => {
        const result = validateEmail(email);
        expect(result.valid).toBe(true);
        expect(result.normalized).toBeDefined();
        expect(result.error).toBeUndefined();
      });

      it('should normalize email to lowercase', () => {
        const result = validateEmail('User@Example.COM');
        expect(result.valid).toBe(true);
        expect(result.normalized).toBe('user@example.com');
      });

      it('should trim whitespace', () => {
        const result = validateEmail('  test@example.com  ');
        expect(result.valid).toBe(true);
        expect(result.normalized).toBe('test@example.com');
      });
    });

    describe('invalid emails', () => {
      it('should reject empty string', () => {
        const result = validateEmail('');
        expect(result.valid).toBe(false);
        expect(result.error).toBe('EMPTY');
      });

      it('should reject null', () => {
        const result = validateEmail(null);
        expect(result.valid).toBe(false);
        expect(result.error).toBe('EMPTY');
      });

      it('should reject undefined', () => {
        const result = validateEmail(undefined);
        expect(result.valid).toBe(false);
        expect(result.error).toBe('EMPTY');
      });

      it('should reject whitespace-only string', () => {
        const result = validateEmail('   ');
        expect(result.valid).toBe(false);
        expect(result.error).toBe('EMPTY');
      });

      it('should reject email without @', () => {
        const result = validateEmail('testexample.com');
        expect(result.valid).toBe(false);
        expect(result.error).toBe('INVALID_FORMAT');
      });

      it('should reject email without local part', () => {
        const result = validateEmail('@example.com');
        expect(result.valid).toBe(false);
        expect(result.error).toBe('INVALID_LOCAL_PART');
      });

      it('should reject email without domain', () => {
        const result = validateEmail('test@');
        expect(result.valid).toBe(false);
        expect(result.error).toBe('INVALID_DOMAIN');
      });

      it('should reject email without TLD by default', () => {
        const result = validateEmail('test@localhost');
        expect(result.valid).toBe(false);
        expect(result.error).toBe('DOMAIN_TOO_SHORT');
      });

      it('should accept email without TLD when requireTld is false', () => {
        const result = validateEmail('test@localhost', { requireTld: false });
        expect(result.valid).toBe(true);
      });

      it('should reject email with single-char TLD', () => {
        const result = validateEmail('test@example.c');
        expect(result.valid).toBe(false);
        expect(result.error).toBe('DOMAIN_TOO_SHORT');
      });

      it('should reject email exceeding 254 characters', () => {
        const longLocal = 'a'.repeat(64);
        const longDomain = 'b'.repeat(186) + '.com'; // Total > 254
        const result = validateEmail(`${longLocal}@${longDomain}`);
        expect(result.valid).toBe(false);
        expect(result.error).toBe('TOO_LONG');
      });

      it('should reject local part exceeding 64 characters', () => {
        const longLocal = 'a'.repeat(65);
        const result = validateEmail(`${longLocal}@example.com`);
        expect(result.valid).toBe(false);
        expect(result.error).toBe('INVALID_LOCAL_PART');
      });
    });

    describe('disposable email blocking', () => {
      const disposableEmails = [
        'test@mailinator.com',
        'user@guerrillamail.com',
        'temp@10minutemail.com',
        'fake@yopmail.com',
      ];

      test.each(disposableEmails)(
        'should reject disposable email when blocking enabled: %s',
        (email) => {
          const result = validateEmail(email, { blockDisposable: true });
          expect(result.valid).toBe(false);
          expect(result.error).toBe('DISPOSABLE_DOMAIN');
        }
      );

      test.each(disposableEmails)(
        'should accept disposable email when blocking disabled: %s',
        (email) => {
          const result = validateEmail(email, { blockDisposable: false });
          expect(result.valid).toBe(true);
        }
      );

      it('should not block disposable by default', () => {
        const result = validateEmail('test@mailinator.com');
        expect(result.valid).toBe(true);
      });
    });
  });

  describe('isValidEmail', () => {
    it('should return true for valid email', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
    });

    it('should return false for invalid email', () => {
      expect(isValidEmail('')).toBe(false);
      expect(isValidEmail('invalid')).toBe(false);
      expect(isValidEmail(null)).toBe(false);
    });
  });

  describe('normalizeEmail', () => {
    it('should return normalized email for valid input', () => {
      expect(normalizeEmail('User@Example.COM')).toBe('user@example.com');
    });

    it('should return null for invalid input', () => {
      expect(normalizeEmail('')).toBeNull();
      expect(normalizeEmail('invalid')).toBeNull();
      expect(normalizeEmail(null)).toBeNull();
    });
  });
});

describe('Password Validation', () => {
  describe('validatePassword', () => {
    describe('valid passwords', () => {
      const validPasswords = [
        'Password1!',
        'Str0ng@Pass',
        'MyP@ssw0rd',
        'Complex#123',
        'V3ry$ecure',
      ];

      test.each(validPasswords)('should accept valid password: %s', (password) => {
        const result = validatePassword(password);
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    describe('invalid passwords', () => {
      it('should reject null', () => {
        const result = validatePassword(null);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('TOO_SHORT');
      });

      it('should reject undefined', () => {
        const result = validatePassword(undefined);
        expect(result.valid).toBe(false);
      });

      it('should reject empty string', () => {
        const result = validatePassword('');
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('TOO_SHORT');
      });

      it('should reject password shorter than 8 chars', () => {
        const result = validatePassword('Pass1!');
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('TOO_SHORT');
      });

      it('should reject password without lowercase', () => {
        const result = validatePassword('PASSWORD1!');
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('NO_LOWERCASE');
      });

      it('should reject password without uppercase', () => {
        const result = validatePassword('password1!');
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('NO_UPPERCASE');
      });

      it('should reject password without digit', () => {
        const result = validatePassword('Password!');
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('NO_DIGIT');
      });

      it('should reject password without special character', () => {
        const result = validatePassword('Password1');
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('NO_SPECIAL');
      });

      it('should reject common passwords', () => {
        // "password" is in our minimal common list
        const result = validatePassword('password');
        expect(result.errors).toContain('COMMON_PASSWORD');
      });

      it('should reject password exceeding 72 chars', () => {
        const longPassword = 'Aa1!' + 'a'.repeat(70);
        const result = validatePassword(longPassword);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('TOO_LONG');
      });
    });

    describe('password strength', () => {
      it('should return very_weak for password with only length', () => {
        const result = validatePassword('aaaaaaaaaaaa', {
          requireUppercase: false,
          requireLowercase: false,
          requireDigit: false,
          requireSpecial: false,
        });
        expect(result.strength).toBeLessThanOrEqual(2);
      });

      it('should return higher strength for complex passwords', () => {
        const result = validatePassword('MyStr0ng!Pass');
        expect(result.strength).toBeGreaterThanOrEqual(3);
      });

      it('should have valid strength label', () => {
        const validLabels = ['very_weak', 'weak', 'fair', 'strong', 'very_strong'];
        const result = validatePassword('Password1!');
        expect(validLabels).toContain(result.strengthLabel);
      });
    });

    describe('custom requirements', () => {
      it('should allow disabling uppercase requirement', () => {
        const result = validatePassword('password1!', { requireUppercase: false });
        expect(result.errors).not.toContain('NO_UPPERCASE');
      });

      it('should allow disabling lowercase requirement', () => {
        const result = validatePassword('PASSWORD1!', { requireLowercase: false });
        expect(result.errors).not.toContain('NO_LOWERCASE');
      });

      it('should allow disabling digit requirement', () => {
        const result = validatePassword('Password!', { requireDigit: false });
        expect(result.errors).not.toContain('NO_DIGIT');
      });

      it('should allow disabling special char requirement', () => {
        const result = validatePassword('Password1', { requireSpecial: false });
        expect(result.errors).not.toContain('NO_SPECIAL');
      });

      it('should allow custom minimum length', () => {
        const result = validatePassword('Pass1!', { minLength: 6 });
        expect(result.errors).not.toContain('TOO_SHORT');
      });

      it('should allow disabling common password check', () => {
        const result = validatePassword('password', { checkCommon: false });
        expect(result.errors).not.toContain('COMMON_PASSWORD');
      });
    });
  });

  describe('isValidPassword', () => {
    it('should return true for valid password', () => {
      expect(isValidPassword('Password1!')).toBe(true);
    });

    it('should return false for invalid password', () => {
      expect(isValidPassword('')).toBe(false);
      expect(isValidPassword('weak')).toBe(false);
      expect(isValidPassword(null)).toBe(false);
    });
  });
});

describe('Validation Result Types', () => {
  it('EmailValidationResult should have correct structure for valid result', () => {
    const result: EmailValidationResult = {
      valid: true,
      normalized: 'test@example.com',
    };
    expect(result.valid).toBe(true);
    expect(result.normalized).toBeDefined();
    expect(result.error).toBeUndefined();
  });

  it('EmailValidationResult should have correct structure for invalid result', () => {
    const result: EmailValidationResult = {
      valid: false,
      error: 'INVALID_FORMAT',
      message: 'Invalid email format',
    };
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.message).toBeDefined();
    expect(result.normalized).toBeUndefined();
  });

  it('PasswordValidationResult should have correct structure', () => {
    const result: PasswordValidationResult = {
      valid: true,
      errors: [],
      strength: 4,
      strengthLabel: 'very_strong',
    };
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.strength).toBe(4);
    expect(result.strengthLabel).toBe('very_strong');
  });
});
