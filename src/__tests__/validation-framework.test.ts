/**
 * Tests for Validation Framework
 */

import {
  Validator,
  validateSchema,
  validateSchemaAsync,
  createRule,
  createAsyncRule,
  combineValidators,
  validResult,
  invalidResult,
  mergeResults,
  type ValidationRule,
  type Schema,
} from '../lib/validation-framework.js';
import { ErrorCodes, LSHError } from '../lib/lsh-error.js';

describe('Validator', () => {
  describe('basic validation', () => {
    it('should pass validation with no rules', () => {
      const validator = new Validator<string>();
      const result = validator.validate('test');

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should pass validation when all rules pass', () => {
      const rule1: ValidationRule<string> = {
        name: 'notEmpty',
        validate: (value) => ({
          passed: value.length > 0,
          error: 'Value cannot be empty',
        }),
      };

      const rule2: ValidationRule<string> = {
        name: 'maxLength',
        validate: (value) => ({
          passed: value.length <= 10,
          error: 'Value too long',
        }),
      };

      const validator = new Validator<string>().addRule(rule1).addRule(rule2);
      const result = validator.validate('hello');

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.passedRules).toContain('notEmpty');
      expect(result.passedRules).toContain('maxLength');
    });

    it('should fail validation when any rule fails', () => {
      const rule: ValidationRule<string> = {
        name: 'minLength',
        validate: (value) => ({
          passed: value.length >= 5,
          error: 'Value must be at least 5 characters',
        }),
      };

      const validator = new Validator<string>().addRule(rule);
      const result = validator.validate('hi');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Value must be at least 5 characters');
      expect(result.failedRules).toContain('minLength');
    });

    it('should collect all errors by default', () => {
      const rule1: ValidationRule<string> = {
        name: 'rule1',
        validate: () => ({ passed: false, error: 'Error 1' }),
      };

      const rule2: ValidationRule<string> = {
        name: 'rule2',
        validate: () => ({ passed: false, error: 'Error 2' }),
      };

      const validator = new Validator<string>().addRule(rule1).addRule(rule2);
      const result = validator.validate('test');

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(result.errors).toContain('Error 1');
      expect(result.errors).toContain('Error 2');
    });

    it('should stop on first error when option is set', () => {
      const rule1: ValidationRule<string> = {
        name: 'rule1',
        validate: () => ({ passed: false, error: 'Error 1' }),
      };

      const rule2: ValidationRule<string> = {
        name: 'rule2',
        validate: () => ({ passed: false, error: 'Error 2' }),
      };

      const validator = new Validator<string>().addRule(rule1).addRule(rule2);
      const result = validator.validate('test', { stopOnFirstError: true });

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors).toContain('Error 1');
    });
  });

  describe('warnings', () => {
    it('should collect warnings from passing rules', () => {
      const rule: ValidationRule<string> = {
        name: 'withWarning',
        validate: () => ({
          passed: true,
          warning: 'Consider using a different approach',
        }),
      };

      const validator = new Validator<string>().addRule(rule);
      const result = validator.validate('test');

      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings).toContain('Consider using a different approach');
    });

    it('should exclude warnings when option is set', () => {
      const rule: ValidationRule<string> = {
        name: 'withWarning',
        validate: () => ({
          passed: true,
          warning: 'Consider using a different approach',
        }),
      };

      const validator = new Validator<string>().addRule(rule);
      const result = validator.validate('test', { includeWarnings: false });

      expect(result.warnings).toHaveLength(0);
    });
  });

  describe('field name in options', () => {
    it('should prefix error messages with field name', () => {
      const rule: ValidationRule<string> = {
        name: 'required',
        validate: (value) => ({
          passed: value.length > 0,
          error: 'This field is required',
        }),
      };

      const validator = new Validator<string>().addRule(rule);
      const result = validator.validate('', { fieldName: 'email' });

      expect(result.errors[0]).toBe('email: This field is required');
    });
  });

  describe('exception handling', () => {
    it('should handle exceptions in validation rules', () => {
      const rule: ValidationRule<string> = {
        name: 'throwing',
        validate: () => {
          throw new Error('Unexpected error');
        },
      };

      const validator = new Validator<string>().addRule(rule);
      const result = validator.validate('test');

      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('Unexpected error');
      expect(result.failedRules).toContain('throwing');
    });
  });

  describe('validateOrThrow', () => {
    it('should not throw when validation passes', () => {
      const rule: ValidationRule<string> = {
        name: 'pass',
        validate: () => ({ passed: true }),
      };

      const validator = new Validator<string>().addRule(rule);

      expect(() => validator.validateOrThrow('test')).not.toThrow();
    });

    it('should throw LSHError when validation fails', () => {
      const rule: ValidationRule<string> = {
        name: 'fail',
        validate: () => ({ passed: false, error: 'Validation failed' }),
      };

      const validator = new Validator<string>().addRule(rule);

      expect(() => validator.validateOrThrow('test')).toThrow(LSHError);

      try {
        validator.validateOrThrow('test');
      } catch (error) {
        expect(error instanceof LSHError).toBe(true);
        expect((error as LSHError).code).toBe(ErrorCodes.VALIDATION_REQUIRED_FIELD);
      }
    });

    it('should use custom error code', () => {
      const rule: ValidationRule<string> = {
        name: 'fail',
        validate: () => ({ passed: false, error: 'Invalid format' }),
      };

      const validator = new Validator<string>().addRule(rule);

      try {
        validator.validateOrThrow('test', ErrorCodes.VALIDATION_INVALID_FORMAT);
      } catch (error) {
        expect((error as LSHError).code).toBe(ErrorCodes.VALIDATION_INVALID_FORMAT);
      }
    });
  });

  describe('isValid helper', () => {
    it('should return true when valid', () => {
      const rule: ValidationRule<string> = {
        name: 'pass',
        validate: () => ({ passed: true }),
      };

      const validator = new Validator<string>().addRule(rule);
      expect(validator.isValid('test')).toBe(true);
    });

    it('should return false when invalid', () => {
      const rule: ValidationRule<string> = {
        name: 'fail',
        validate: () => ({ passed: false, error: 'Failed' }),
      };

      const validator = new Validator<string>().addRule(rule);
      expect(validator.isValid('test')).toBe(false);
    });
  });

  describe('addRules', () => {
    it('should add multiple rules at once', () => {
      const rules: ValidationRule<number>[] = [
        { name: 'positive', validate: (v) => ({ passed: v > 0, error: 'Must be positive' }) },
        { name: 'even', validate: (v) => ({ passed: v % 2 === 0, error: 'Must be even' }) },
      ];

      const validator = new Validator<number>().addRules(rules);
      const result = validator.validate(4);

      expect(result.isValid).toBe(true);
      expect(result.passedRules).toHaveLength(2);
    });
  });

  describe('clone', () => {
    it('should create independent copy', () => {
      const rule: ValidationRule<string> = {
        name: 'original',
        validate: () => ({ passed: true }),
      };

      const validator1 = new Validator<string>().addRule(rule);
      const validator2 = validator1.clone();

      // Add another rule to the clone
      const rule2: ValidationRule<string> = {
        name: 'cloned',
        validate: () => ({ passed: false, error: 'Clone rule failed' }),
      };
      validator2.addRule(rule2);

      // Original should still work
      expect(validator1.isValid('test')).toBe(true);
      // Clone should fail
      expect(validator2.isValid('test')).toBe(false);
    });
  });
});

describe('Async Validation', () => {
  describe('validateAsync', () => {
    it('should handle async validation rules', async () => {
      const asyncRule: ValidationRule<string> = {
        name: 'asyncCheck',
        validate: () => ({ passed: true }),
        validateAsync: async (value) => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          return { passed: value.length > 2, error: 'Too short' };
        },
      };

      const validator = new Validator<string>().addRule(asyncRule);
      const result = await validator.validateAsync('hello');

      expect(result.isValid).toBe(true);
    });

    it('should fail async validation', async () => {
      const asyncRule: ValidationRule<string> = {
        name: 'asyncCheck',
        validate: () => ({ passed: true }),
        validateAsync: async () => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          return { passed: false, error: 'Async check failed' };
        },
      };

      const validator = new Validator<string>().addRule(asyncRule);
      const result = await validator.validateAsync('hello');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Async check failed');
    });

    it('should fall back to sync when no async validator', async () => {
      const syncRule: ValidationRule<string> = {
        name: 'syncOnly',
        validate: (value) => ({
          passed: value.length > 0,
          error: 'Empty value',
        }),
      };

      const validator = new Validator<string>().addRule(syncRule);
      const result = await validator.validateAsync('hello');

      expect(result.isValid).toBe(true);
    });
  });

  describe('validateOrThrowAsync', () => {
    it('should throw on async validation failure', async () => {
      const asyncRule: ValidationRule<string> = {
        name: 'asyncFail',
        validate: () => ({ passed: true }),
        validateAsync: async () => ({ passed: false, error: 'Async failed' }),
      };

      const validator = new Validator<string>().addRule(asyncRule);

      await expect(validator.validateOrThrowAsync('test')).rejects.toThrow(LSHError);
    });
  });

  describe('isValidAsync', () => {
    it('should return boolean for async validation', async () => {
      const asyncRule: ValidationRule<string> = {
        name: 'asyncCheck',
        validate: () => ({ passed: true }),
        validateAsync: async () => ({ passed: true }),
      };

      const validator = new Validator<string>().addRule(asyncRule);
      const isValid = await validator.isValidAsync('test');

      expect(isValid).toBe(true);
    });
  });
});

describe('Schema Validation', () => {
  interface User {
    name: string;
    email: string;
    age?: number;
  }

  const nameValidator = new Validator<string>().addRule({
    name: 'required',
    validate: (v) => ({ passed: v != null && v.length > 0, error: 'Name is required' }),
  });

  const emailValidator = new Validator<string>()
    .addRule({
      name: 'required',
      validate: (v) => ({ passed: v != null && v.length > 0, error: 'Email is required' }),
    })
    .addRule({
      name: 'email',
      validate: (v) => ({
        passed: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v || ''),
        error: 'Invalid email format',
      }),
    });

  const ageValidator = new Validator<number>().addRule({
    name: 'positive',
    validate: (v) => ({ passed: v > 0, error: 'Age must be positive' }),
  });

  describe('validateSchema', () => {
    it('should validate all fields in schema', () => {
      const schema: Schema<User> = {
        name: { validator: nameValidator },
        email: { validator: emailValidator },
      };

      const user: User = { name: 'John', email: 'john@example.com' };
      const result = validateSchema(user, schema);

      expect(result.isValid).toBe(true);
      expect(result.fieldResults.name.isValid).toBe(true);
      expect(result.fieldResults.email.isValid).toBe(true);
    });

    it('should collect errors from all fields', () => {
      const schema: Schema<User> = {
        name: { validator: nameValidator },
        email: { validator: emailValidator },
      };

      const user: User = { name: '', email: 'invalid-email' };
      const result = validateSchema(user, schema);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(2);
      expect(result.fieldResults.name.isValid).toBe(false);
      expect(result.fieldResults.email.isValid).toBe(false);
    });

    it('should skip optional fields when nullish', () => {
      const schema: Schema<User> = {
        name: { validator: nameValidator },
        age: { validator: ageValidator, optional: true },
      };

      const user: User = { name: 'John', email: 'john@example.com' };
      const result = validateSchema(user, schema);

      expect(result.isValid).toBe(true);
      expect(result.fieldResults.age.passedRules).toContain('optional-skip');
    });

    it('should validate optional fields when present', () => {
      const schema: Schema<User> = {
        name: { validator: nameValidator },
        age: { validator: ageValidator, optional: true },
      };

      const user: User = { name: 'John', email: 'john@example.com', age: -5 };
      const result = validateSchema(user, schema);

      expect(result.isValid).toBe(false);
      expect(result.fieldResults.age.isValid).toBe(false);
    });
  });

  describe('validateSchemaAsync', () => {
    it('should validate schema asynchronously', async () => {
      const asyncValidator = new Validator<string>().addRule({
        name: 'async',
        validate: () => ({ passed: true }),
        validateAsync: async (v) => {
          await new Promise((r) => setTimeout(r, 10));
          return { passed: v.length > 0, error: 'Required' };
        },
      });

      const schema: Schema<User> = {
        name: { validator: asyncValidator },
      };

      const user: User = { name: 'John', email: 'john@example.com' };
      const result = await validateSchemaAsync(user, schema);

      expect(result.isValid).toBe(true);
    });
  });
});

describe('Utility Functions', () => {
  describe('createRule', () => {
    it('should create a rule from predicate', () => {
      const rule = createRule<string>(
        'nonEmpty',
        (value) => value.length > 0,
        'Value cannot be empty'
      );

      expect(rule.validate('hello').passed).toBe(true);
      expect(rule.validate('').passed).toBe(false);
      expect(rule.validate('').error).toBe('Value cannot be empty');
    });

    it('should include warning when provided', () => {
      const rule = createRule<number>(
        'lessThan100',
        (value) => value < 100,
        'Value must be less than 100',
        'Consider using a smaller value'
      );

      const result = rule.validate(50);
      expect(result.passed).toBe(true);
      expect(result.warning).toBe('Consider using a smaller value');
    });
  });

  describe('createAsyncRule', () => {
    it('should create an async rule', async () => {
      const rule = createAsyncRule<string>(
        'asyncCheck',
        async (value) => {
          await new Promise((r) => setTimeout(r, 10));
          return value.length > 0;
        },
        'Async check failed'
      );

      const result = await rule.validateAsync!('hello');
      expect(result.passed).toBe(true);

      const failResult = await rule.validateAsync!('');
      expect(failResult.passed).toBe(false);
      expect(failResult.error).toBe('Async check failed');
    });
  });

  describe('combineValidators', () => {
    it('should combine multiple validators', () => {
      const validator1 = new Validator<string>().addRule({
        name: 'rule1',
        validate: () => ({ passed: true }),
      });

      const validator2 = new Validator<string>().addRule({
        name: 'rule2',
        validate: () => ({ passed: true }),
      });

      const combined = combineValidators(validator1, validator2);
      const result = combined.validate('test');

      expect(result.passedRules).toContain('rule1');
      expect(result.passedRules).toContain('rule2');
    });
  });

  describe('validResult', () => {
    it('should create a valid result', () => {
      const result = validResult();

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });
  });

  describe('invalidResult', () => {
    it('should create an invalid result with error', () => {
      const result = invalidResult('Something went wrong', 'customRule');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Something went wrong');
      expect(result.failedRules).toContain('customRule');
    });
  });

  describe('mergeResults', () => {
    it('should merge multiple results', () => {
      const result1 = validResult();
      result1.passedRules.push('rule1');

      const result2 = invalidResult('Error from rule2', 'rule2');
      result2.warnings.push('Warning from rule2');

      const merged = mergeResults(result1, result2);

      expect(merged.isValid).toBe(false);
      expect(merged.errors).toContain('Error from rule2');
      expect(merged.warnings).toContain('Warning from rule2');
      expect(merged.passedRules).toContain('rule1');
      expect(merged.failedRules).toContain('rule2');
    });

    it('should be valid when all results are valid', () => {
      const result1 = validResult();
      const result2 = validResult();

      const merged = mergeResults(result1, result2);

      expect(merged.isValid).toBe(true);
    });
  });
});
