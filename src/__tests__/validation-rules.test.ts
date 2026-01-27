/**
 * Tests for Validation Rules
 */

import { Rules } from '../lib/validation-rules.js';

describe('String Validation Rules', () => {
  describe('required', () => {
    const rule = Rules.required('Field is required');

    it('should pass for non-empty string', () => {
      expect(rule.validate('hello').passed).toBe(true);
    });

    it('should fail for empty string', () => {
      expect(rule.validate('').passed).toBe(false);
    });

    it('should fail for whitespace-only string', () => {
      expect(rule.validate('   ').passed).toBe(false);
    });

    it('should fail for null', () => {
      expect(rule.validate(null).passed).toBe(false);
    });

    it('should fail for undefined', () => {
      expect(rule.validate(undefined).passed).toBe(false);
    });

    it('should pass for non-string truthy values', () => {
      expect(rule.validate(123).passed).toBe(true);
      expect(rule.validate({}).passed).toBe(true);
    });
  });

  describe('minLength', () => {
    const rule = Rules.minLength(5);

    it('should pass for string at minimum length', () => {
      expect(rule.validate('hello').passed).toBe(true);
    });

    it('should pass for string above minimum length', () => {
      expect(rule.validate('hello world').passed).toBe(true);
    });

    it('should fail for string below minimum length', () => {
      expect(rule.validate('hi').passed).toBe(false);
    });

    it('should fail for non-string values', () => {
      expect(rule.validate(123 as unknown as string).passed).toBe(false);
    });
  });

  describe('maxLength', () => {
    const rule = Rules.maxLength(10);

    it('should pass for string at maximum length', () => {
      expect(rule.validate('1234567890').passed).toBe(true);
    });

    it('should pass for string below maximum length', () => {
      expect(rule.validate('short').passed).toBe(true);
    });

    it('should fail for string above maximum length', () => {
      expect(rule.validate('this is too long').passed).toBe(false);
    });
  });

  describe('lengthBetween', () => {
    const rule = Rules.lengthBetween(3, 10);

    it('should pass for string within range', () => {
      expect(rule.validate('hello').passed).toBe(true);
    });

    it('should pass for string at minimum', () => {
      expect(rule.validate('abc').passed).toBe(true);
    });

    it('should pass for string at maximum', () => {
      expect(rule.validate('1234567890').passed).toBe(true);
    });

    it('should fail for string below minimum', () => {
      expect(rule.validate('ab').passed).toBe(false);
    });

    it('should fail for string above maximum', () => {
      expect(rule.validate('12345678901').passed).toBe(false);
    });
  });

  describe('pattern', () => {
    const rule = Rules.pattern(/^[a-z]+$/, 'Only lowercase letters allowed');

    it('should pass for matching pattern', () => {
      expect(rule.validate('hello').passed).toBe(true);
    });

    it('should fail for non-matching pattern', () => {
      const result = rule.validate('Hello123');
      expect(result.passed).toBe(false);
      expect(result.error).toBe('Only lowercase letters allowed');
    });
  });

  describe('email', () => {
    const rule = Rules.email();

    it('should pass for valid email', () => {
      expect(rule.validate('user@example.com').passed).toBe(true);
      expect(rule.validate('user.name@example.co.uk').passed).toBe(true);
      expect(rule.validate('user+tag@example.com').passed).toBe(true);
    });

    it('should fail for invalid email', () => {
      expect(rule.validate('not-an-email').passed).toBe(false);
      expect(rule.validate('user@').passed).toBe(false);
      expect(rule.validate('@example.com').passed).toBe(false);
      expect(rule.validate('user@example').passed).toBe(false);
    });
  });

  describe('url', () => {
    const rule = Rules.url();

    it('should pass for valid HTTP URLs', () => {
      expect(rule.validate('http://example.com').passed).toBe(true);
      expect(rule.validate('https://example.com').passed).toBe(true);
      expect(rule.validate('https://example.com/path?query=1').passed).toBe(true);
    });

    it('should fail for invalid URLs', () => {
      expect(rule.validate('not-a-url').passed).toBe(false);
      expect(rule.validate('ftp://example.com').passed).toBe(false);
    });

    it('should require HTTPS when specified', () => {
      const httpsRule = Rules.url('Must use HTTPS', true);
      expect(httpsRule.validate('https://example.com').passed).toBe(true);
      expect(httpsRule.validate('http://example.com').passed).toBe(false);
    });
  });

  describe('uuid', () => {
    const rule = Rules.uuid();

    it('should pass for valid UUID v4', () => {
      expect(rule.validate('550e8400-e29b-41d4-a716-446655440000').passed).toBe(true);
      expect(rule.validate('6ba7b810-9dad-41d4-80b4-00c04fd430c8').passed).toBe(true);
    });

    it('should fail for invalid UUID', () => {
      expect(rule.validate('not-a-uuid').passed).toBe(false);
      expect(rule.validate('550e8400-e29b-31d4-a716-446655440000').passed).toBe(false); // v3
    });
  });

  describe('noCharacters', () => {
    const rule = Rules.noCharacters('<>');

    it('should pass when characters not present', () => {
      expect(rule.validate('hello world').passed).toBe(true);
    });

    it('should fail when disallowed characters present', () => {
      expect(rule.validate('<script>').passed).toBe(false);
      expect(rule.validate('foo > bar').passed).toBe(false);
    });
  });

  describe('startsWith', () => {
    const rule = Rules.startsWith('https://');

    it('should pass for matching prefix', () => {
      expect(rule.validate('https://example.com').passed).toBe(true);
    });

    it('should fail for non-matching prefix', () => {
      expect(rule.validate('http://example.com').passed).toBe(false);
    });
  });

  describe('endsWith', () => {
    const rule = Rules.endsWith('.json');

    it('should pass for matching suffix', () => {
      expect(rule.validate('config.json').passed).toBe(true);
    });

    it('should fail for non-matching suffix', () => {
      expect(rule.validate('config.yaml').passed).toBe(false);
    });
  });

  describe('oneOf', () => {
    const rule = Rules.oneOf(['development', 'staging', 'production'] as const);

    it('should pass for allowed values', () => {
      expect(rule.validate('development').passed).toBe(true);
      expect(rule.validate('staging').passed).toBe(true);
      expect(rule.validate('production').passed).toBe(true);
    });

    it('should fail for disallowed values', () => {
      expect(rule.validate('test').passed).toBe(false);
      expect(rule.validate('prod').passed).toBe(false);
    });
  });
});

describe('Number Validation Rules', () => {
  describe('isNumber', () => {
    const rule = Rules.isNumber();

    it('should pass for numbers', () => {
      expect(rule.validate(42).passed).toBe(true);
      expect(rule.validate(3.14).passed).toBe(true);
      expect(rule.validate(0).passed).toBe(true);
      expect(rule.validate(-10).passed).toBe(true);
    });

    it('should fail for NaN', () => {
      expect(rule.validate(NaN).passed).toBe(false);
    });

    it('should fail for non-numbers', () => {
      expect(rule.validate('42' as unknown as number).passed).toBe(false);
      expect(rule.validate(null as unknown as number).passed).toBe(false);
    });
  });

  describe('range', () => {
    const rule = Rules.range(1, 100);

    it('should pass for values in range', () => {
      expect(rule.validate(50).passed).toBe(true);
      expect(rule.validate(1).passed).toBe(true);
      expect(rule.validate(100).passed).toBe(true);
    });

    it('should fail for values out of range', () => {
      expect(rule.validate(0).passed).toBe(false);
      expect(rule.validate(101).passed).toBe(false);
    });
  });

  describe('min', () => {
    const rule = Rules.min(0);

    it('should pass for values at or above minimum', () => {
      expect(rule.validate(0).passed).toBe(true);
      expect(rule.validate(100).passed).toBe(true);
    });

    it('should fail for values below minimum', () => {
      expect(rule.validate(-1).passed).toBe(false);
    });
  });

  describe('max', () => {
    const rule = Rules.max(100);

    it('should pass for values at or below maximum', () => {
      expect(rule.validate(100).passed).toBe(true);
      expect(rule.validate(0).passed).toBe(true);
    });

    it('should fail for values above maximum', () => {
      expect(rule.validate(101).passed).toBe(false);
    });
  });

  describe('integer', () => {
    const rule = Rules.integer();

    it('should pass for integers', () => {
      expect(rule.validate(42).passed).toBe(true);
      expect(rule.validate(0).passed).toBe(true);
      expect(rule.validate(-10).passed).toBe(true);
    });

    it('should fail for floats', () => {
      expect(rule.validate(3.14).passed).toBe(false);
      expect(rule.validate(0.1).passed).toBe(false);
    });
  });

  describe('positive', () => {
    const rule = Rules.positive();

    it('should pass for positive numbers', () => {
      expect(rule.validate(1).passed).toBe(true);
      expect(rule.validate(0.001).passed).toBe(true);
    });

    it('should fail for zero and negative numbers', () => {
      expect(rule.validate(0).passed).toBe(false);
      expect(rule.validate(-1).passed).toBe(false);
    });
  });

  describe('nonNegative', () => {
    const rule = Rules.nonNegative();

    it('should pass for non-negative numbers', () => {
      expect(rule.validate(0).passed).toBe(true);
      expect(rule.validate(1).passed).toBe(true);
    });

    it('should fail for negative numbers', () => {
      expect(rule.validate(-1).passed).toBe(false);
    });
  });

  describe('port', () => {
    const rule = Rules.port();

    it('should pass for valid ports', () => {
      expect(rule.validate(80).passed).toBe(true);
      expect(rule.validate(443).passed).toBe(true);
      expect(rule.validate(8080).passed).toBe(true);
      expect(rule.validate(1).passed).toBe(true);
      expect(rule.validate(65535).passed).toBe(true);
    });

    it('should fail for invalid ports', () => {
      expect(rule.validate(0).passed).toBe(false);
      expect(rule.validate(65536).passed).toBe(false);
      expect(rule.validate(80.5).passed).toBe(false);
    });
  });
});

describe('Array Validation Rules', () => {
  describe('notEmpty', () => {
    const rule = Rules.notEmpty<string>();

    it('should pass for non-empty array', () => {
      expect(rule.validate(['item']).passed).toBe(true);
    });

    it('should fail for empty array', () => {
      expect(rule.validate([]).passed).toBe(false);
    });
  });

  describe('minItems', () => {
    const rule = Rules.minItems<string>(2);

    it('should pass when array has enough items', () => {
      expect(rule.validate(['a', 'b']).passed).toBe(true);
      expect(rule.validate(['a', 'b', 'c']).passed).toBe(true);
    });

    it('should fail when array has too few items', () => {
      expect(rule.validate(['a']).passed).toBe(false);
      expect(rule.validate([]).passed).toBe(false);
    });
  });

  describe('maxItems', () => {
    const rule = Rules.maxItems<string>(3);

    it('should pass when array has few enough items', () => {
      expect(rule.validate(['a', 'b', 'c']).passed).toBe(true);
      expect(rule.validate(['a']).passed).toBe(true);
    });

    it('should fail when array has too many items', () => {
      expect(rule.validate(['a', 'b', 'c', 'd']).passed).toBe(false);
    });
  });

  describe('allItems', () => {
    const rule = Rules.allItems<number>((item) => item > 0, 'All items must be positive');

    it('should pass when all items match predicate', () => {
      expect(rule.validate([1, 2, 3]).passed).toBe(true);
    });

    it('should fail when any item fails predicate', () => {
      expect(rule.validate([1, -2, 3]).passed).toBe(false);
    });
  });

  describe('uniqueItems', () => {
    const rule = Rules.uniqueItems<string>();

    it('should pass for unique items', () => {
      expect(rule.validate(['a', 'b', 'c']).passed).toBe(true);
    });

    it('should fail for duplicate items', () => {
      expect(rule.validate(['a', 'b', 'a']).passed).toBe(false);
    });
  });
});

describe('Object Validation Rules', () => {
  describe('hasProperty', () => {
    const rule = Rules.hasProperty('name');

    it('should pass when property exists', () => {
      expect(rule.validate({ name: 'John' }).passed).toBe(true);
    });

    it('should fail when property missing', () => {
      expect(rule.validate({ age: 30 }).passed).toBe(false);
    });

    it('should fail for non-objects', () => {
      expect(rule.validate(null as unknown as Record<string, unknown>).passed).toBe(false);
    });
  });

  describe('isObject', () => {
    const rule = Rules.isObject();

    it('should pass for objects', () => {
      expect(rule.validate({}).passed).toBe(true);
      expect(rule.validate({ key: 'value' }).passed).toBe(true);
    });

    it('should fail for arrays', () => {
      expect(rule.validate([]).passed).toBe(false);
    });

    it('should fail for null', () => {
      expect(rule.validate(null).passed).toBe(false);
    });

    it('should fail for primitives', () => {
      expect(rule.validate('string').passed).toBe(false);
      expect(rule.validate(123).passed).toBe(false);
    });
  });
});

describe('Domain-Specific Validation Rules', () => {
  describe('postgresUrl', () => {
    const rule = Rules.postgresUrl();

    it('should pass for valid postgres URLs', () => {
      expect(rule.validate('postgresql://user:pass@localhost:5432/db').passed).toBe(true);
      expect(rule.validate('postgres://localhost/db').passed).toBe(true);
    });

    it('should fail for invalid URLs', () => {
      expect(rule.validate('mysql://localhost/db').passed).toBe(false);
      expect(rule.validate('http://example.com').passed).toBe(false);
    });
  });

  describe('redisUrl', () => {
    const rule = Rules.redisUrl();

    it('should pass for valid redis URLs', () => {
      expect(rule.validate('redis://localhost:6379').passed).toBe(true);
      expect(rule.validate('rediss://user:pass@redis.example.com').passed).toBe(true);
    });

    it('should fail for invalid URLs', () => {
      expect(rule.validate('http://localhost:6379').passed).toBe(false);
    });
  });

  describe('booleanString', () => {
    const rule = Rules.booleanString();

    it('should pass for true/false strings', () => {
      expect(rule.validate('true').passed).toBe(true);
      expect(rule.validate('false').passed).toBe(true);
      expect(rule.validate('TRUE').passed).toBe(true);
      expect(rule.validate('False').passed).toBe(true);
    });

    it('should fail for other strings', () => {
      expect(rule.validate('yes').passed).toBe(false);
      expect(rule.validate('1').passed).toBe(false);
      expect(rule.validate('').passed).toBe(false);
    });
  });

  describe('json', () => {
    const rule = Rules.json();

    it('should pass for valid JSON', () => {
      expect(rule.validate('{}').passed).toBe(true);
      expect(rule.validate('{"key": "value"}').passed).toBe(true);
      expect(rule.validate('[1, 2, 3]').passed).toBe(true);
      expect(rule.validate('"string"').passed).toBe(true);
    });

    it('should fail for invalid JSON', () => {
      expect(rule.validate('{invalid}').passed).toBe(false);
      expect(rule.validate('undefined').passed).toBe(false);
    });
  });

  describe('cronExpression', () => {
    const rule = Rules.cronExpression();

    it('should pass for valid cron expressions', () => {
      expect(rule.validate('* * * * *').passed).toBe(true);
      expect(rule.validate('0 0 * * *').passed).toBe(true);
      expect(rule.validate('0 0 1 1 *').passed).toBe(true);
      expect(rule.validate('0 0 * * * *').passed).toBe(true); // 6 fields
    });

    it('should fail for invalid cron expressions', () => {
      expect(rule.validate('* * * *').passed).toBe(false); // Too few fields
      expect(rule.validate('not a cron').passed).toBe(false);
    });
  });

  describe('slug', () => {
    const rule = Rules.slug();

    it('should pass for valid slugs', () => {
      expect(rule.validate('my-slug').passed).toBe(true);
      expect(rule.validate('slug123').passed).toBe(true);
      expect(rule.validate('a-b-c').passed).toBe(true);
    });

    it('should fail for invalid slugs', () => {
      expect(rule.validate('My-Slug').passed).toBe(false); // Uppercase
      expect(rule.validate('-invalid').passed).toBe(false); // Leading dash
      expect(rule.validate('invalid-').passed).toBe(false); // Trailing dash
      expect(rule.validate('has spaces').passed).toBe(false);
      expect(rule.validate('has_underscore').passed).toBe(false);
    });
  });

  describe('secretKey', () => {
    const rule = Rules.secretKey(32);

    it('should pass for valid secret keys', () => {
      expect(rule.validate('a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6').passed).toBe(true);
    });

    it('should fail for short keys', () => {
      expect(rule.validate('short').passed).toBe(false);
    });

    it('should fail for low-entropy keys', () => {
      expect(rule.validate('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa').passed).toBe(false);
    });
  });
});

describe('Conditional Validation Rules', () => {
  describe('when', () => {
    const rule = Rules.when<string>(
      (value) => value.length > 0,
      Rules.minLength(5, 'Must be at least 5 chars if provided')
    );

    it('should apply rule when condition is true', () => {
      expect(rule.validate('hi').passed).toBe(false);
      expect(rule.validate('hello').passed).toBe(true);
    });

    it('should skip rule when condition is false', () => {
      expect(rule.validate('').passed).toBe(true);
    });

    it('should apply otherwise rule when provided', () => {
      const withOtherwise = Rules.when<string>(
        (value) => value.length > 0,
        Rules.minLength(5),
        Rules.required('Value is required when empty')
      );

      expect(withOtherwise.validate('').passed).toBe(false);
    });
  });

  describe('optional', () => {
    const rule = Rules.optional(Rules.minLength(5));

    it('should pass for null or undefined', () => {
      expect(rule.validate(null).passed).toBe(true);
      expect(rule.validate(undefined).passed).toBe(true);
    });

    it('should validate when value is present', () => {
      expect(rule.validate('hi').passed).toBe(false);
      expect(rule.validate('hello').passed).toBe(true);
    });
  });

  describe('anyOf', () => {
    const rule = Rules.anyOf<string>(
      [Rules.email(), Rules.url()],
      'Must be either an email or URL'
    );

    it('should pass when any rule passes', () => {
      expect(rule.validate('user@example.com').passed).toBe(true);
      expect(rule.validate('https://example.com').passed).toBe(true);
    });

    it('should fail when all rules fail', () => {
      const result = rule.validate('not-email-or-url');
      expect(result.passed).toBe(false);
      expect(result.error).toBe('Must be either an email or URL');
    });
  });
});
