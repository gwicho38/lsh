/**
 * LSH Validation Rules
 *
 * Provides a comprehensive library of reusable validation rules.
 * These rules can be composed using the Validator class from validation-framework.ts.
 *
 * Categories:
 * - String validations (required, length, patterns, formats)
 * - Number validations (range, integer, positive)
 * - Array validations (notEmpty, length, contains)
 * - Object validations (hasProperty, shape)
 * - Domain-specific validations (email, url, uuid, env vars)
 *
 * @example
 * ```typescript
 * import { Validator } from './validation-framework.js';
 * import { Rules } from './validation-rules.js';
 *
 * const apiKeyValidator = new Validator<string>()
 *   .addRule(Rules.required('API key is required'))
 *   .addRule(Rules.minLength(32, 'API key must be at least 32 characters'))
 *   .addRule(Rules.pattern(/^[a-zA-Z0-9_-]+$/, 'API key contains invalid characters'));
 * ```
 *
 * @module validation-rules
 */

import type { ValidationRule, ValidationRuleResult } from './validation-framework.js';

// ============================================================================
// STRING VALIDATIONS
// ============================================================================

/**
 * Validates that a value is present (not null, undefined, or empty string).
 */
export function required(message = 'This field is required'): ValidationRule<unknown> {
  return {
    name: 'required',
    validate: (value: unknown): ValidationRuleResult => {
      if (value === null || value === undefined) {
        return { passed: false, error: message };
      }
      if (typeof value === 'string' && value.trim().length === 0) {
        return { passed: false, error: message };
      }
      return { passed: true };
    },
  };
}

/**
 * Validates that a string has at least the specified length.
 */
export function minLength(min: number, message?: string): ValidationRule<string> {
  return {
    name: 'minLength',
    validate: (value: string): ValidationRuleResult => {
      if (typeof value !== 'string') {
        return { passed: false, error: 'Value must be a string' };
      }
      const passed = value.length >= min;
      return {
        passed,
        error: passed ? undefined : message || `Must be at least ${min} characters`,
      };
    },
  };
}

/**
 * Validates that a string is no longer than the specified length.
 */
export function maxLength(max: number, message?: string): ValidationRule<string> {
  return {
    name: 'maxLength',
    validate: (value: string): ValidationRuleResult => {
      if (typeof value !== 'string') {
        return { passed: false, error: 'Value must be a string' };
      }
      const passed = value.length <= max;
      return {
        passed,
        error: passed ? undefined : message || `Must be no more than ${max} characters`,
      };
    },
  };
}

/**
 * Validates that a string's length is within the specified range.
 */
export function lengthBetween(min: number, max: number, message?: string): ValidationRule<string> {
  return {
    name: 'lengthBetween',
    validate: (value: string): ValidationRuleResult => {
      if (typeof value !== 'string') {
        return { passed: false, error: 'Value must be a string' };
      }
      const passed = value.length >= min && value.length <= max;
      return {
        passed,
        error: passed ? undefined : message || `Must be between ${min} and ${max} characters`,
      };
    },
  };
}

/**
 * Validates that a string matches the specified pattern.
 */
export function pattern(regex: RegExp, message?: string): ValidationRule<string> {
  return {
    name: 'pattern',
    validate: (value: string): ValidationRuleResult => {
      if (typeof value !== 'string') {
        return { passed: false, error: 'Value must be a string' };
      }
      const passed = regex.test(value);
      return {
        passed,
        error: passed ? undefined : message || 'Invalid format',
      };
    },
  };
}

/**
 * Validates that a string is a valid email address.
 */
export function email(message = 'Invalid email address'): ValidationRule<string> {
  // RFC 5322 compliant email regex (simplified)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return {
    name: 'email',
    validate: (value: string): ValidationRuleResult => {
      if (typeof value !== 'string') {
        return { passed: false, error: 'Value must be a string' };
      }
      const passed = emailRegex.test(value);
      return { passed, error: passed ? undefined : message };
    },
  };
}

/**
 * Validates that a string is a valid URL.
 */
export function url(message = 'Invalid URL', requireHttps = false): ValidationRule<string> {
  return {
    name: 'url',
    validate: (value: string): ValidationRuleResult => {
      if (typeof value !== 'string') {
        return { passed: false, error: 'Value must be a string' };
      }
      try {
        const parsed = new URL(value);
        if (requireHttps && parsed.protocol !== 'https:') {
          return { passed: false, error: 'URL must use HTTPS' };
        }
        if (!['http:', 'https:'].includes(parsed.protocol)) {
          return { passed: false, error: message };
        }
        return { passed: true };
      } catch {
        return { passed: false, error: message };
      }
    },
  };
}

/**
 * Validates that a string is a valid UUID (v4).
 */
export function uuid(message = 'Invalid UUID'): ValidationRule<string> {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return {
    name: 'uuid',
    validate: (value: string): ValidationRuleResult => {
      if (typeof value !== 'string') {
        return { passed: false, error: 'Value must be a string' };
      }
      const passed = uuidRegex.test(value);
      return { passed, error: passed ? undefined : message };
    },
  };
}

/**
 * Validates that a string does not contain certain characters.
 */
export function noCharacters(chars: string, message?: string): ValidationRule<string> {
  return {
    name: 'noCharacters',
    validate: (value: string): ValidationRuleResult => {
      if (typeof value !== 'string') {
        return { passed: false, error: 'Value must be a string' };
      }
      const hasDisallowed = [...chars].some(c => value.includes(c));
      return {
        passed: !hasDisallowed,
        error: hasDisallowed ? message || `Cannot contain: ${chars}` : undefined,
      };
    },
  };
}

/**
 * Validates that a string starts with the specified prefix.
 */
export function startsWith(prefix: string, message?: string): ValidationRule<string> {
  return {
    name: 'startsWith',
    validate: (value: string): ValidationRuleResult => {
      if (typeof value !== 'string') {
        return { passed: false, error: 'Value must be a string' };
      }
      const passed = value.startsWith(prefix);
      return {
        passed,
        error: passed ? undefined : message || `Must start with '${prefix}'`,
      };
    },
  };
}

/**
 * Validates that a string ends with the specified suffix.
 */
export function endsWith(suffix: string, message?: string): ValidationRule<string> {
  return {
    name: 'endsWith',
    validate: (value: string): ValidationRuleResult => {
      if (typeof value !== 'string') {
        return { passed: false, error: 'Value must be a string' };
      }
      const passed = value.endsWith(suffix);
      return {
        passed,
        error: passed ? undefined : message || `Must end with '${suffix}'`,
      };
    },
  };
}

/**
 * Validates that a string is one of the allowed values.
 */
export function oneOf<T extends string>(
  allowedValues: readonly T[],
  message?: string
): ValidationRule<string> {
  return {
    name: 'oneOf',
    validate: (value: string): ValidationRuleResult => {
      const passed = allowedValues.includes(value as T);
      return {
        passed,
        error: passed ? undefined : message || `Must be one of: ${allowedValues.join(', ')}`,
      };
    },
  };
}

// ============================================================================
// NUMBER VALIDATIONS
// ============================================================================

/**
 * Validates that a value is a number.
 */
export function isNumber(message = 'Must be a number'): ValidationRule<unknown> {
  return {
    name: 'isNumber',
    validate: (value: unknown): ValidationRuleResult => {
      const passed = typeof value === 'number' && !isNaN(value);
      return { passed, error: passed ? undefined : message };
    },
  };
}

/**
 * Validates that a number is within the specified range.
 */
export function range(min: number, max: number, message?: string): ValidationRule<number> {
  return {
    name: 'range',
    validate: (value: number): ValidationRuleResult => {
      const passed = typeof value === 'number' && value >= min && value <= max;
      return {
        passed,
        error: passed ? undefined : message || `Must be between ${min} and ${max}`,
      };
    },
  };
}

/**
 * Validates that a number is at least the specified minimum.
 */
export function min(minValue: number, message?: string): ValidationRule<number> {
  return {
    name: 'min',
    validate: (value: number): ValidationRuleResult => {
      const passed = typeof value === 'number' && value >= minValue;
      return {
        passed,
        error: passed ? undefined : message || `Must be at least ${minValue}`,
      };
    },
  };
}

/**
 * Validates that a number is at most the specified maximum.
 */
export function max(maxValue: number, message?: string): ValidationRule<number> {
  return {
    name: 'max',
    validate: (value: number): ValidationRuleResult => {
      const passed = typeof value === 'number' && value <= maxValue;
      return {
        passed,
        error: passed ? undefined : message || `Must be no more than ${maxValue}`,
      };
    },
  };
}

/**
 * Validates that a number is an integer.
 */
export function integer(message = 'Must be an integer'): ValidationRule<number> {
  return {
    name: 'integer',
    validate: (value: number): ValidationRuleResult => {
      const passed = typeof value === 'number' && Number.isInteger(value);
      return { passed, error: passed ? undefined : message };
    },
  };
}

/**
 * Validates that a number is positive (greater than 0).
 */
export function positive(message = 'Must be positive'): ValidationRule<number> {
  return {
    name: 'positive',
    validate: (value: number): ValidationRuleResult => {
      const passed = typeof value === 'number' && value > 0;
      return { passed, error: passed ? undefined : message };
    },
  };
}

/**
 * Validates that a number is non-negative (>= 0).
 */
export function nonNegative(message = 'Must be non-negative'): ValidationRule<number> {
  return {
    name: 'nonNegative',
    validate: (value: number): ValidationRuleResult => {
      const passed = typeof value === 'number' && value >= 0;
      return { passed, error: passed ? undefined : message };
    },
  };
}

/**
 * Validates a port number (1-65535).
 */
export function port(message = 'Invalid port number'): ValidationRule<number> {
  return {
    name: 'port',
    validate: (value: number): ValidationRuleResult => {
      const passed = typeof value === 'number' && value >= 1 && value <= 65535 && Number.isInteger(value);
      return { passed, error: passed ? undefined : message };
    },
  };
}

// ============================================================================
// ARRAY VALIDATIONS
// ============================================================================

/**
 * Validates that an array is not empty.
 */
export function notEmpty<T>(message = 'Array cannot be empty'): ValidationRule<T[]> {
  return {
    name: 'notEmpty',
    validate: (value: T[]): ValidationRuleResult => {
      const passed = Array.isArray(value) && value.length > 0;
      return { passed, error: passed ? undefined : message };
    },
  };
}

/**
 * Validates that an array has at least the specified number of elements.
 */
export function minItems<T>(count: number, message?: string): ValidationRule<T[]> {
  return {
    name: 'minItems',
    validate: (value: T[]): ValidationRuleResult => {
      const passed = Array.isArray(value) && value.length >= count;
      return {
        passed,
        error: passed ? undefined : message || `Must have at least ${count} items`,
      };
    },
  };
}

/**
 * Validates that an array has at most the specified number of elements.
 */
export function maxItems<T>(count: number, message?: string): ValidationRule<T[]> {
  return {
    name: 'maxItems',
    validate: (value: T[]): ValidationRuleResult => {
      const passed = Array.isArray(value) && value.length <= count;
      return {
        passed,
        error: passed ? undefined : message || `Must have no more than ${count} items`,
      };
    },
  };
}

/**
 * Validates that all array items pass a predicate.
 */
export function allItems<T>(
  predicate: (item: T, index: number) => boolean,
  message = 'One or more items are invalid'
): ValidationRule<T[]> {
  return {
    name: 'allItems',
    validate: (value: T[]): ValidationRuleResult => {
      if (!Array.isArray(value)) {
        return { passed: false, error: 'Value must be an array' };
      }
      const passed = value.every(predicate);
      return { passed, error: passed ? undefined : message };
    },
  };
}

/**
 * Validates that an array contains unique items.
 */
export function uniqueItems<T>(message = 'Array contains duplicate items'): ValidationRule<T[]> {
  return {
    name: 'uniqueItems',
    validate: (value: T[]): ValidationRuleResult => {
      if (!Array.isArray(value)) {
        return { passed: false, error: 'Value must be an array' };
      }
      const unique = new Set(value.map(v => JSON.stringify(v)));
      const passed = unique.size === value.length;
      return { passed, error: passed ? undefined : message };
    },
  };
}

// ============================================================================
// OBJECT VALIDATIONS
// ============================================================================

/**
 * Validates that an object has the specified property.
 */
export function hasProperty(
  propertyName: string,
  message?: string
): ValidationRule<Record<string, unknown>> {
  return {
    name: 'hasProperty',
    validate: (value: Record<string, unknown>): ValidationRuleResult => {
      if (typeof value !== 'object' || value === null) {
        return { passed: false, error: 'Value must be an object' };
      }
      const passed = propertyName in value;
      return {
        passed,
        error: passed ? undefined : message || `Missing required property: ${propertyName}`,
      };
    },
  };
}

/**
 * Validates that a value is a non-null object.
 */
export function isObject(message = 'Must be an object'): ValidationRule<unknown> {
  return {
    name: 'isObject',
    validate: (value: unknown): ValidationRuleResult => {
      const passed = typeof value === 'object' && value !== null && !Array.isArray(value);
      return { passed, error: passed ? undefined : message };
    },
  };
}

// ============================================================================
// DOMAIN-SPECIFIC VALIDATIONS
// ============================================================================

/**
 * Validates that a string is a valid PostgreSQL connection URL.
 */
export function postgresUrl(message = 'Invalid PostgreSQL URL'): ValidationRule<string> {
  return {
    name: 'postgresUrl',
    validate: (value: string): ValidationRuleResult => {
      if (typeof value !== 'string') {
        return { passed: false, error: 'Value must be a string' };
      }
      const passed = value.startsWith('postgresql://') || value.startsWith('postgres://');
      return { passed, error: passed ? undefined : message };
    },
  };
}

/**
 * Validates that a string is a valid Redis connection URL.
 */
export function redisUrl(message = 'Invalid Redis URL'): ValidationRule<string> {
  return {
    name: 'redisUrl',
    validate: (value: string): ValidationRuleResult => {
      if (typeof value !== 'string') {
        return { passed: false, error: 'Value must be a string' };
      }
      const passed = value.startsWith('redis://') || value.startsWith('rediss://');
      return { passed, error: passed ? undefined : message };
    },
  };
}

/**
 * Validates that a string is a valid boolean string.
 */
export function booleanString(message = 'Must be "true" or "false"'): ValidationRule<string> {
  return {
    name: 'booleanString',
    validate: (value: string): ValidationRuleResult => {
      if (typeof value !== 'string') {
        return { passed: false, error: 'Value must be a string' };
      }
      const passed = ['true', 'false'].includes(value.toLowerCase());
      return { passed, error: passed ? undefined : message };
    },
  };
}

/**
 * Validates that a string is a valid JSON.
 */
export function json(message = 'Invalid JSON'): ValidationRule<string> {
  return {
    name: 'json',
    validate: (value: string): ValidationRuleResult => {
      if (typeof value !== 'string') {
        return { passed: false, error: 'Value must be a string' };
      }
      try {
        JSON.parse(value);
        return { passed: true };
      } catch {
        return { passed: false, error: message };
      }
    },
  };
}

/**
 * Validates a cron expression (basic validation).
 */
export function cronExpression(message = 'Invalid cron expression'): ValidationRule<string> {
  return {
    name: 'cronExpression',
    validate: (value: string): ValidationRuleResult => {
      if (typeof value !== 'string') {
        return { passed: false, error: 'Value must be a string' };
      }
      // Basic cron validation: 5 or 6 space-separated fields
      const parts = value.trim().split(/\s+/);
      const passed = parts.length >= 5 && parts.length <= 6;
      return { passed, error: passed ? undefined : message };
    },
  };
}

/**
 * Validates that a string is a valid slug (URL-friendly identifier).
 */
export function slug(message = 'Invalid slug format'): ValidationRule<string> {
  return {
    name: 'slug',
    validate: (value: string): ValidationRuleResult => {
      if (typeof value !== 'string') {
        return { passed: false, error: 'Value must be a string' };
      }
      const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
      const passed = slugRegex.test(value);
      return { passed, error: passed ? undefined : message };
    },
  };
}

/**
 * Validates a secret/API key has sufficient length and entropy.
 */
export function secretKey(
  minLength = 32,
  message?: string
): ValidationRule<string> {
  return {
    name: 'secretKey',
    validate: (value: string): ValidationRuleResult => {
      if (typeof value !== 'string') {
        return { passed: false, error: 'Value must be a string' };
      }
      if (value.length < minLength) {
        return {
          passed: false,
          error: message || `Secret key must be at least ${minLength} characters`,
        };
      }
      // Basic entropy check: not all same character
      const uniqueChars = new Set(value).size;
      if (uniqueChars < 4) {
        return {
          passed: false,
          error: 'Secret key has insufficient complexity',
          warning: 'Consider using a cryptographically random key',
        };
      }
      return { passed: true };
    },
  };
}

// ============================================================================
// CONDITIONAL VALIDATIONS
// ============================================================================

/**
 * Creates a conditional validation rule that only runs if a condition is met.
 */
export function when<T>(
  condition: (value: T) => boolean,
  rule: ValidationRule<T>,
  otherwiseRule?: ValidationRule<T>
): ValidationRule<T> {
  return {
    name: `when(${rule.name})`,
    validate: (value: T): ValidationRuleResult => {
      if (condition(value)) {
        return rule.validate(value);
      }
      if (otherwiseRule) {
        return otherwiseRule.validate(value);
      }
      return { passed: true };
    },
  };
}

/**
 * Creates a rule that passes if value is null/undefined, otherwise validates.
 */
export function optional<T>(rule: ValidationRule<T>): ValidationRule<T | null | undefined> {
  return {
    name: `optional(${rule.name})`,
    validate: (value: T | null | undefined): ValidationRuleResult => {
      if (value === null || value === undefined) {
        return { passed: true };
      }
      return rule.validate(value as T);
    },
  };
}

/**
 * Creates a rule that passes if any of the provided rules pass.
 */
export function anyOf<T>(rules: ValidationRule<T>[], message?: string): ValidationRule<T> {
  return {
    name: 'anyOf',
    validate: (value: T): ValidationRuleResult => {
      for (const rule of rules) {
        const result = rule.validate(value);
        if (result.passed) {
          return result;
        }
      }
      return {
        passed: false,
        error: message || 'None of the validation rules passed',
      };
    },
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

/**
 * Collection of all validation rules for easy importing.
 */
export const Rules = {
  // String
  required,
  minLength,
  maxLength,
  lengthBetween,
  pattern,
  email,
  url,
  uuid,
  noCharacters,
  startsWith,
  endsWith,
  oneOf,

  // Number
  isNumber,
  range,
  min,
  max,
  integer,
  positive,
  nonNegative,
  port,

  // Array
  notEmpty,
  minItems,
  maxItems,
  allItems,
  uniqueItems,

  // Object
  hasProperty,
  isObject,

  // Domain-specific
  postgresUrl,
  redisUrl,
  booleanString,
  json,
  cronExpression,
  slug,
  secretKey,

  // Conditional
  when,
  optional,
  anyOf,
} as const;

export default Rules;
