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
import type { ValidationRule } from './validation-framework.js';
/**
 * Validates that a value is present (not null, undefined, or empty string).
 */
export declare function required(message?: string): ValidationRule<unknown>;
/**
 * Validates that a string has at least the specified length.
 */
export declare function minLength(min: number, message?: string): ValidationRule<string>;
/**
 * Validates that a string is no longer than the specified length.
 */
export declare function maxLength(max: number, message?: string): ValidationRule<string>;
/**
 * Validates that a string's length is within the specified range.
 */
export declare function lengthBetween(min: number, max: number, message?: string): ValidationRule<string>;
/**
 * Validates that a string matches the specified pattern.
 */
export declare function pattern(regex: RegExp, message?: string): ValidationRule<string>;
/**
 * Validates that a string is a valid email address.
 */
export declare function email(message?: string): ValidationRule<string>;
/**
 * Validates that a string is a valid URL.
 */
export declare function url(message?: string, requireHttps?: boolean): ValidationRule<string>;
/**
 * Validates that a string is a valid UUID (v4).
 */
export declare function uuid(message?: string): ValidationRule<string>;
/**
 * Validates that a string does not contain certain characters.
 */
export declare function noCharacters(chars: string, message?: string): ValidationRule<string>;
/**
 * Validates that a string starts with the specified prefix.
 */
export declare function startsWith(prefix: string, message?: string): ValidationRule<string>;
/**
 * Validates that a string ends with the specified suffix.
 */
export declare function endsWith(suffix: string, message?: string): ValidationRule<string>;
/**
 * Validates that a string is one of the allowed values.
 */
export declare function oneOf<T extends string>(allowedValues: readonly T[], message?: string): ValidationRule<string>;
/**
 * Validates that a value is a number.
 */
export declare function isNumber(message?: string): ValidationRule<unknown>;
/**
 * Validates that a number is within the specified range.
 */
export declare function range(min: number, max: number, message?: string): ValidationRule<number>;
/**
 * Validates that a number is at least the specified minimum.
 */
export declare function min(minValue: number, message?: string): ValidationRule<number>;
/**
 * Validates that a number is at most the specified maximum.
 */
export declare function max(maxValue: number, message?: string): ValidationRule<number>;
/**
 * Validates that a number is an integer.
 */
export declare function integer(message?: string): ValidationRule<number>;
/**
 * Validates that a number is positive (greater than 0).
 */
export declare function positive(message?: string): ValidationRule<number>;
/**
 * Validates that a number is non-negative (>= 0).
 */
export declare function nonNegative(message?: string): ValidationRule<number>;
/**
 * Validates a port number (1-65535).
 */
export declare function port(message?: string): ValidationRule<number>;
/**
 * Validates that an array is not empty.
 */
export declare function notEmpty<T>(message?: string): ValidationRule<T[]>;
/**
 * Validates that an array has at least the specified number of elements.
 */
export declare function minItems<T>(count: number, message?: string): ValidationRule<T[]>;
/**
 * Validates that an array has at most the specified number of elements.
 */
export declare function maxItems<T>(count: number, message?: string): ValidationRule<T[]>;
/**
 * Validates that all array items pass a predicate.
 */
export declare function allItems<T>(predicate: (item: T, index: number) => boolean, message?: string): ValidationRule<T[]>;
/**
 * Validates that an array contains unique items.
 */
export declare function uniqueItems<T>(message?: string): ValidationRule<T[]>;
/**
 * Validates that an object has the specified property.
 */
export declare function hasProperty(propertyName: string, message?: string): ValidationRule<Record<string, unknown>>;
/**
 * Validates that a value is a non-null object.
 */
export declare function isObject(message?: string): ValidationRule<unknown>;
/**
 * Validates that a string is a valid PostgreSQL connection URL.
 */
export declare function postgresUrl(message?: string): ValidationRule<string>;
/**
 * Validates that a string is a valid Redis connection URL.
 */
export declare function redisUrl(message?: string): ValidationRule<string>;
/**
 * Validates that a string is a valid boolean string.
 */
export declare function booleanString(message?: string): ValidationRule<string>;
/**
 * Validates that a string is a valid JSON.
 */
export declare function json(message?: string): ValidationRule<string>;
/**
 * Validates a cron expression (basic validation).
 */
export declare function cronExpression(message?: string): ValidationRule<string>;
/**
 * Validates that a string is a valid slug (URL-friendly identifier).
 */
export declare function slug(message?: string): ValidationRule<string>;
/**
 * Validates a secret/API key has sufficient length and entropy.
 */
export declare function secretKey(minLength?: number, message?: string): ValidationRule<string>;
/**
 * Creates a conditional validation rule that only runs if a condition is met.
 */
export declare function when<T>(condition: (value: T) => boolean, rule: ValidationRule<T>, otherwiseRule?: ValidationRule<T>): ValidationRule<T>;
/**
 * Creates a rule that passes if value is null/undefined, otherwise validates.
 */
export declare function optional<T>(rule: ValidationRule<T>): ValidationRule<T | null | undefined>;
/**
 * Creates a rule that passes if any of the provided rules pass.
 */
export declare function anyOf<T>(rules: ValidationRule<T>[], message?: string): ValidationRule<T>;
/**
 * Collection of all validation rules for easy importing.
 */
export declare const Rules: {
    readonly required: typeof required;
    readonly minLength: typeof minLength;
    readonly maxLength: typeof maxLength;
    readonly lengthBetween: typeof lengthBetween;
    readonly pattern: typeof pattern;
    readonly email: typeof email;
    readonly url: typeof url;
    readonly uuid: typeof uuid;
    readonly noCharacters: typeof noCharacters;
    readonly startsWith: typeof startsWith;
    readonly endsWith: typeof endsWith;
    readonly oneOf: typeof oneOf;
    readonly isNumber: typeof isNumber;
    readonly range: typeof range;
    readonly min: typeof min;
    readonly max: typeof max;
    readonly integer: typeof integer;
    readonly positive: typeof positive;
    readonly nonNegative: typeof nonNegative;
    readonly port: typeof port;
    readonly notEmpty: typeof notEmpty;
    readonly minItems: typeof minItems;
    readonly maxItems: typeof maxItems;
    readonly allItems: typeof allItems;
    readonly uniqueItems: typeof uniqueItems;
    readonly hasProperty: typeof hasProperty;
    readonly isObject: typeof isObject;
    readonly postgresUrl: typeof postgresUrl;
    readonly redisUrl: typeof redisUrl;
    readonly booleanString: typeof booleanString;
    readonly json: typeof json;
    readonly cronExpression: typeof cronExpression;
    readonly slug: typeof slug;
    readonly secretKey: typeof secretKey;
    readonly when: typeof when;
    readonly optional: typeof optional;
    readonly anyOf: typeof anyOf;
};
export default Rules;
