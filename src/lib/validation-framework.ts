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

import { LSHError, ErrorCodes, extractErrorMessage } from './lsh-error.js';

// ============================================================================
// CORE TYPES
// ============================================================================

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

// ============================================================================
// VALIDATOR CLASS
// ============================================================================

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
export class Validator<T = unknown> {
  private rules: ValidationRule<T>[] = [];

  /**
   * Add a validation rule.
   * Rules are executed in the order they are added.
   */
  addRule(rule: ValidationRule<T>): this {
    this.rules.push(rule);
    return this;
  }

  /**
   * Add multiple validation rules at once.
   */
  addRules(rules: ValidationRule<T>[]): this {
    this.rules.push(...rules);
    return this;
  }

  /**
   * Validate a value synchronously against all rules.
   */
  validate(value: T, options: ValidationOptions = {}): ValidationResult {
    const { stopOnFirstError = false, includeWarnings = true, fieldName } = options;

    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      failedRules: [],
      passedRules: [],
    };

    for (const rule of this.rules) {
      try {
        const ruleResult = rule.validate(value);

        if (!ruleResult.passed) {
          result.isValid = false;
          const errorMsg = fieldName
            ? `${fieldName}: ${ruleResult.error || 'Validation failed'}`
            : ruleResult.error || 'Validation failed';
          result.errors.push(errorMsg);
          result.failedRules.push(rule.name);

          if (stopOnFirstError) {
            break;
          }
        } else {
          result.passedRules.push(rule.name);

          if (includeWarnings && ruleResult.warning) {
            const warningMsg = fieldName
              ? `${fieldName}: ${ruleResult.warning}`
              : ruleResult.warning;
            result.warnings.push(warningMsg);
          }
        }
      } catch (error) {
        result.isValid = false;
        const errorMsg = `Rule '${rule.name}' threw exception: ${extractErrorMessage(error)}`;
        result.errors.push(errorMsg);
        result.failedRules.push(rule.name);

        if (stopOnFirstError) {
          break;
        }
      }
    }

    return result;
  }

  /**
   * Validate a value asynchronously (for rules that need async checks).
   */
  async validateAsync(value: T, options: ValidationOptions = {}): Promise<ValidationResult> {
    const { stopOnFirstError = false, includeWarnings = true, fieldName } = options;

    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      failedRules: [],
      passedRules: [],
    };

    for (const rule of this.rules) {
      try {
        // Try async validation first, fall back to sync
        const ruleResult = rule.validateAsync
          ? await rule.validateAsync(value)
          : rule.validate(value);

        if (!ruleResult.passed) {
          result.isValid = false;
          const errorMsg = fieldName
            ? `${fieldName}: ${ruleResult.error || 'Validation failed'}`
            : ruleResult.error || 'Validation failed';
          result.errors.push(errorMsg);
          result.failedRules.push(rule.name);

          if (stopOnFirstError) {
            break;
          }
        } else {
          result.passedRules.push(rule.name);

          if (includeWarnings && ruleResult.warning) {
            const warningMsg = fieldName
              ? `${fieldName}: ${ruleResult.warning}`
              : ruleResult.warning;
            result.warnings.push(warningMsg);
          }
        }
      } catch (error) {
        result.isValid = false;
        const errorMsg = `Rule '${rule.name}' threw exception: ${extractErrorMessage(error)}`;
        result.errors.push(errorMsg);
        result.failedRules.push(rule.name);

        if (stopOnFirstError) {
          break;
        }
      }
    }

    return result;
  }

  /**
   * Validate and throw LSHError if validation fails.
   */
  validateOrThrow(
    value: T,
    errorCode: typeof ErrorCodes[keyof typeof ErrorCodes] = ErrorCodes.VALIDATION_REQUIRED_FIELD,
    options: ValidationOptions = {}
  ): void {
    const result = this.validate(value, options);
    if (!result.isValid) {
      throw new LSHError(errorCode, result.errors.join('; '), {
        failedRules: result.failedRules,
        fieldName: options.fieldName,
      });
    }
  }

  /**
   * Async validate and throw LSHError if validation fails.
   */
  async validateOrThrowAsync(
    value: T,
    errorCode: typeof ErrorCodes[keyof typeof ErrorCodes] = ErrorCodes.VALIDATION_REQUIRED_FIELD,
    options: ValidationOptions = {}
  ): Promise<void> {
    const result = await this.validateAsync(value, options);
    if (!result.isValid) {
      throw new LSHError(errorCode, result.errors.join('; '), {
        failedRules: result.failedRules,
        fieldName: options.fieldName,
      });
    }
  }

  /**
   * Check if a value is valid (returns boolean).
   */
  isValid(value: T): boolean {
    return this.validate(value).isValid;
  }

  /**
   * Check if a value is valid asynchronously.
   */
  async isValidAsync(value: T): Promise<boolean> {
    const result = await this.validateAsync(value);
    return result.isValid;
  }

  /**
   * Create a copy of this validator.
   */
  clone(): Validator<T> {
    const cloned = new Validator<T>();
    cloned.rules = [...this.rules];
    return cloned;
  }
}

// ============================================================================
// SCHEMA VALIDATOR
// ============================================================================

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
export function validateSchema<T extends Record<string, unknown>>(
  obj: T,
  schema: Schema<T>,
  options: ValidationOptions = {}
): SchemaValidationResult {
  const result: SchemaValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
    failedRules: [],
    passedRules: [],
    fieldResults: {},
  };

  for (const [fieldName, fieldDef] of Object.entries(schema) as [keyof T, FieldDefinition][]) {
    if (!fieldDef) continue;

    const value = obj[fieldName];
    const isNullish = value === null || value === undefined;

    // Skip optional fields that are nullish
    if (fieldDef.optional && isNullish) {
      result.fieldResults[fieldName as string] = {
        isValid: true,
        errors: [],
        warnings: [],
        failedRules: [],
        passedRules: ['optional-skip'],
      };
      continue;
    }

    // Validate the field
    const fieldResult = fieldDef.validator.validate(value as unknown, {
      ...options,
      fieldName: fieldName as string,
    });

    result.fieldResults[fieldName as string] = fieldResult;

    if (!fieldResult.isValid) {
      result.isValid = false;
      result.errors.push(...fieldResult.errors);
      result.failedRules.push(...fieldResult.failedRules.map(r => `${String(fieldName)}.${r}`));
    }

    result.passedRules.push(...fieldResult.passedRules.map(r => `${String(fieldName)}.${r}`));
    result.warnings.push(...fieldResult.warnings);
  }

  return result;
}

/**
 * Async version of schema validation.
 */
export async function validateSchemaAsync<T extends Record<string, unknown>>(
  obj: T,
  schema: Schema<T>,
  options: ValidationOptions = {}
): Promise<SchemaValidationResult> {
  const result: SchemaValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
    failedRules: [],
    passedRules: [],
    fieldResults: {},
  };

  for (const [fieldName, fieldDef] of Object.entries(schema) as [keyof T, FieldDefinition][]) {
    if (!fieldDef) continue;

    const value = obj[fieldName];
    const isNullish = value === null || value === undefined;

    // Skip optional fields that are nullish
    if (fieldDef.optional && isNullish) {
      result.fieldResults[fieldName as string] = {
        isValid: true,
        errors: [],
        warnings: [],
        failedRules: [],
        passedRules: ['optional-skip'],
      };
      continue;
    }

    // Validate the field
    const fieldResult = await fieldDef.validator.validateAsync(value as unknown, {
      ...options,
      fieldName: fieldName as string,
    });

    result.fieldResults[fieldName as string] = fieldResult;

    if (!fieldResult.isValid) {
      result.isValid = false;
      result.errors.push(...fieldResult.errors);
      result.failedRules.push(...fieldResult.failedRules.map(r => `${String(fieldName)}.${r}`));
    }

    result.passedRules.push(...fieldResult.passedRules.map(r => `${String(fieldName)}.${r}`));
    result.warnings.push(...fieldResult.warnings);
  }

  return result;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Create a validation rule from a simple predicate function.
 */
export function createRule<T>(
  name: string,
  predicate: (value: T) => boolean,
  errorMessage: string,
  warningMessage?: string
): ValidationRule<T> {
  return {
    name,
    validate: (value: T): ValidationRuleResult => {
      const passed = predicate(value);
      return {
        passed,
        error: passed ? undefined : errorMessage,
        warning: passed ? warningMessage : undefined,
      };
    },
  };
}

/**
 * Create an async validation rule.
 */
export function createAsyncRule<T>(
  name: string,
  predicate: (value: T) => Promise<boolean>,
  errorMessage: string,
  warningMessage?: string
): ValidationRule<T> {
  return {
    name,
    validate: () => ({ passed: true }), // Sync always passes, use async
    validateAsync: async (value: T): Promise<ValidationRuleResult> => {
      const passed = await predicate(value);
      return {
        passed,
        error: passed ? undefined : errorMessage,
        warning: passed ? warningMessage : undefined,
      };
    },
  };
}

/**
 * Combine multiple validators into one.
 */
export function combineValidators<T>(...validators: Validator<T>[]): Validator<T> {
  const combined = new Validator<T>();
  for (const validator of validators) {
    // Extract rules from each validator (access private field via clone)
    const cloned = validator.clone();
    // Use a workaround to access rules
    combined.addRules((cloned as unknown as { rules: ValidationRule<T>[] }).rules);
  }
  return combined;
}

/**
 * Create an empty (always valid) validation result.
 */
export function validResult(): ValidationResult {
  return {
    isValid: true,
    errors: [],
    warnings: [],
    failedRules: [],
    passedRules: [],
  };
}

/**
 * Create an invalid validation result with a single error.
 */
export function invalidResult(error: string, ruleName = 'custom'): ValidationResult {
  return {
    isValid: false,
    errors: [error],
    warnings: [],
    failedRules: [ruleName],
    passedRules: [],
  };
}

/**
 * Merge multiple validation results.
 */
export function mergeResults(...results: ValidationResult[]): ValidationResult {
  const merged: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
    failedRules: [],
    passedRules: [],
  };

  for (const result of results) {
    if (!result.isValid) {
      merged.isValid = false;
    }
    merged.errors.push(...result.errors);
    merged.warnings.push(...result.warnings);
    merged.failedRules.push(...result.failedRules);
    merged.passedRules.push(...result.passedRules);
  }

  return merged;
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  Validator,
  validateSchema,
  validateSchemaAsync,
  createRule,
  createAsyncRule,
  combineValidators,
  validResult,
  invalidResult,
  mergeResults,
};
