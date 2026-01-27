/**
 * LSH Validation Framework
 *
 * Provides a unified, composable validation system for the entire LSH codebase.
 * Replaces duplicated validation patterns across modules with a single source of truth.
 *
 * Key Features:
 * - Composable validation rules via ValidationRule interface
 * - Type-safe validators with generics
 * - Consistent validation result structure
 * - Support for sync and async validation
 * - Integration with LSHError for error handling
 *
 * @example
 * ```typescript
 * import { Validator, Rules } from './validation-framework.js';
 *
 * const validator = new Validator<string>()
 *   .addRule(Rules.required('API key is required'))
 *   .addRule(Rules.minLength(32, 'API key must be at least 32 characters'));
 *
 * const result = validator.validate(apiKey);
 * if (!result.isValid) {
 *   throw new LSHError(ErrorCodes.VALIDATION_REQUIRED_FIELD, result.errors.join(', '));
 * }
 * ```
 *
 * @module validation-framework
 */
import { ErrorCodes } from './lsh-error.js';
/**
 * Result of a single validation rule execution.
 */
export interface ValidationRuleResult {
    /** Whether the value passed this rule */
    passed: boolean;
    /** Error message if validation failed */
    error?: string;
    /** Warning message (validation passed but with concerns) */
    warning?: string;
}
/**
 * A single validation rule that can be composed with others.
 */
export interface ValidationRule<T = unknown> {
    /** Unique name for this rule (for debugging) */
    name: string;
    /** Synchronous validation function */
    validate: (value: T) => ValidationRuleResult;
    /** Optional async validation function (for database checks, etc.) */
    validateAsync?: (value: T) => Promise<ValidationRuleResult>;
}
/**
 * Result of validating a value against all rules.
 */
export interface ValidationResult {
    /** Whether all rules passed */
    isValid: boolean;
    /** Collected error messages from failed rules */
    errors: string[];
    /** Collected warning messages */
    warnings: string[];
    /** Names of rules that failed */
    failedRules: string[];
    /** Names of rules that passed */
    passedRules: string[];
}
/**
 * Options for validation execution.
 */
export interface ValidationOptions {
    /** Stop on first error (default: false - collect all errors) */
    stopOnFirstError?: boolean;
    /** Include warnings in result (default: true) */
    includeWarnings?: boolean;
    /** Custom context for error messages */
    fieldName?: string;
}
/**
 * Type-safe validator that composes multiple rules.
 *
 * @example
 * ```typescript
 * const emailValidator = new Validator<string>()
 *   .addRule(Rules.required())
 *   .addRule(Rules.email());
 *
 * const result = emailValidator.validate('user@example.com');
 * ```
 */
export declare class Validator<T = unknown> {
    private rules;
    /**
     * Add a validation rule.
     * Rules are executed in the order they are added.
     */
    addRule(rule: ValidationRule<T>): this;
    /**
     * Add multiple validation rules at once.
     */
    addRules(rules: ValidationRule<T>[]): this;
    /**
     * Validate a value synchronously against all rules.
     */
    validate(value: T, options?: ValidationOptions): ValidationResult;
    /**
     * Validate a value asynchronously (for rules that need async checks).
     */
    validateAsync(value: T, options?: ValidationOptions): Promise<ValidationResult>;
    /**
     * Validate and throw LSHError if validation fails.
     */
    validateOrThrow(value: T, errorCode?: typeof ErrorCodes[keyof typeof ErrorCodes], options?: ValidationOptions): void;
    /**
     * Async validate and throw LSHError if validation fails.
     */
    validateOrThrowAsync(value: T, errorCode?: typeof ErrorCodes[keyof typeof ErrorCodes], options?: ValidationOptions): Promise<void>;
    /**
     * Check if a value is valid (returns boolean).
     */
    isValid(value: T): boolean;
    /**
     * Check if a value is valid asynchronously.
     */
    isValidAsync(value: T): Promise<boolean>;
    /**
     * Create a copy of this validator.
     */
    clone(): Validator<T>;
}
/**
 * Field definition for schema validation.
 */
export interface FieldDefinition<T = unknown> {
    /** Validator for this field */
    validator: Validator<T>;
    /** Whether the field is optional (default: false) */
    optional?: boolean;
}
/**
 * Schema definition mapping field names to validators.
 */
export type Schema<T extends Record<string, unknown>> = {
    [K in keyof T]?: FieldDefinition<T[K]>;
};
/**
 * Result of schema validation with per-field errors.
 */
export interface SchemaValidationResult extends ValidationResult {
    /** Per-field validation results */
    fieldResults: Record<string, ValidationResult>;
}
/**
 * Validate an object against a schema.
 *
 * @example
 * ```typescript
 * const userSchema: Schema<User> = {
 *   email: { validator: emailValidator },
 *   name: { validator: nameValidator },
 *   age: { validator: ageValidator, optional: true },
 * };
 *
 * const result = validateSchema(userData, userSchema);
 * ```
 */
export declare function validateSchema<T extends Record<string, unknown>>(obj: T, schema: Schema<T>, options?: ValidationOptions): SchemaValidationResult;
/**
 * Async version of schema validation.
 */
export declare function validateSchemaAsync<T extends Record<string, unknown>>(obj: T, schema: Schema<T>, options?: ValidationOptions): Promise<SchemaValidationResult>;
/**
 * Create a validation rule from a simple predicate function.
 */
export declare function createRule<T>(name: string, predicate: (value: T) => boolean, errorMessage: string, warningMessage?: string): ValidationRule<T>;
/**
 * Create an async validation rule.
 */
export declare function createAsyncRule<T>(name: string, predicate: (value: T) => Promise<boolean>, errorMessage: string, warningMessage?: string): ValidationRule<T>;
/**
 * Combine multiple validators into one.
 */
export declare function combineValidators<T>(...validators: Validator<T>[]): Validator<T>;
/**
 * Create an empty (always valid) validation result.
 */
export declare function validResult(): ValidationResult;
/**
 * Create an invalid validation result with a single error.
 */
export declare function invalidResult(error: string, ruleName?: string): ValidationResult;
/**
 * Merge multiple validation results.
 */
export declare function mergeResults(...results: ValidationResult[]): ValidationResult;
declare const _default: {
    Validator: typeof Validator;
    validateSchema: typeof validateSchema;
    validateSchemaAsync: typeof validateSchemaAsync;
    createRule: typeof createRule;
    createAsyncRule: typeof createAsyncRule;
    combineValidators: typeof combineValidators;
    validResult: typeof validResult;
    invalidResult: typeof invalidResult;
    mergeResults: typeof mergeResults;
};
export default _default;
