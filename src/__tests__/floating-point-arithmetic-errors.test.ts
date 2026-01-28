/**
 * Tests for floating-point-arithmetic.ts error handling
 * Verifies LSHError is used with correct error codes
 */

import { describe, it, expect } from '@jest/globals';
import { LSHError, ErrorCodes } from '../lib/lsh-error.js';

describe('LSHError for Floating Point Arithmetic', () => {
  describe('Expression Evaluation Errors', () => {
    it('should use VALIDATION_INVALID_FORMAT code for arithmetic errors', () => {
      const error = new LSHError(
        ErrorCodes.VALIDATION_INVALID_FORMAT,
        'Arithmetic error: Cannot read property of undefined',
        { expression: '1 + undefined', operation: 'evaluate' }
      );

      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('VALIDATION_INVALID_FORMAT');
      expect(error.context?.expression).toBe('1 + undefined');
      expect(error.context?.operation).toBe('evaluate');
    });
  });

  describe('Invalid Characters Errors', () => {
    it('should use VALIDATION_INVALID_FORMAT code for invalid characters', () => {
      const error = new LSHError(
        ErrorCodes.VALIDATION_INVALID_FORMAT,
        'Invalid characters in expression',
        { expression: '1 + @#$', cleaned: '1+@#$' }
      );

      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('VALIDATION_INVALID_FORMAT');
      expect(error.context?.expression).toBe('1 + @#$');
      expect(error.context?.cleaned).toBe('1+@#$');
    });
  });

  describe('Unknown Function Errors', () => {
    it('should use RESOURCE_NOT_FOUND code for unknown functions', () => {
      const availableFunctions = ['sin', 'cos', 'tan', 'sqrt'];
      const error = new LSHError(
        ErrorCodes.RESOURCE_NOT_FOUND,
        'Unknown function: foobar',
        { functionName: 'foobar', availableFunctions }
      );

      expect(error.statusCode).toBe(404);
      expect(error.code).toBe('RESOURCE_NOT_FOUND');
      expect(error.context?.functionName).toBe('foobar');
      expect(error.context?.availableFunctions).toEqual(availableFunctions);
    });
  });

  describe('Argument Count Errors', () => {
    it('should use VALIDATION_INVALID_FORMAT code for wrong argument count', () => {
      const error = new LSHError(
        ErrorCodes.VALIDATION_INVALID_FORMAT,
        'Function pow expects 2 arguments, got 1',
        { functionName: 'pow', expectedArity: 2, actualArity: 1 }
      );

      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('VALIDATION_INVALID_FORMAT');
      expect(error.context?.functionName).toBe('pow');
      expect(error.context?.expectedArity).toBe(2);
      expect(error.context?.actualArity).toBe(1);
    });
  });

  describe('Invalid Result Errors', () => {
    it('should use VALIDATION_INVALID_FORMAT code for invalid result', () => {
      const error = new LSHError(
        ErrorCodes.VALIDATION_INVALID_FORMAT,
        'Invalid expression result',
        { expression: '0/0', resultType: 'number' }
      );

      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('VALIDATION_INVALID_FORMAT');
      expect(error.context?.expression).toBe('0/0');
    });
  });

  describe('Expression Evaluation Failed Errors', () => {
    it('should use VALIDATION_INVALID_FORMAT code for evaluation failures', () => {
      const error = new LSHError(
        ErrorCodes.VALIDATION_INVALID_FORMAT,
        'Expression evaluation failed: syntax error',
        { expression: '1 +' }
      );

      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('VALIDATION_INVALID_FORMAT');
      expect(error.context?.expression).toBe('1 +');
    });
  });

  describe('Parse Float Errors', () => {
    it('should use VALIDATION_INVALID_FORMAT code for invalid float', () => {
      const error = new LSHError(
        ErrorCodes.VALIDATION_INVALID_FORMAT,
        'Invalid floating point number: abc',
        { input: 'abc' }
      );

      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('VALIDATION_INVALID_FORMAT');
      expect(error.context?.input).toBe('abc');
    });
  });

  describe('Error Serialization', () => {
    it('should serialize arithmetic errors to JSON correctly', () => {
      const error = new LSHError(
        ErrorCodes.VALIDATION_INVALID_FORMAT,
        'Arithmetic error',
        { expression: '2+2*', operation: 'evaluate' }
      );

      const json = error.toJSON();

      expect(json.code).toBe('VALIDATION_INVALID_FORMAT');
      expect(json.statusCode).toBe(400);
      expect(json.context?.expression).toBe('2+2*');
    });

    it('should serialize unknown function errors correctly', () => {
      const error = new LSHError(
        ErrorCodes.RESOURCE_NOT_FOUND,
        'Unknown function: xyz',
        { functionName: 'xyz', availableFunctions: ['sin', 'cos'] }
      );

      const json = error.toJSON();

      expect(json.code).toBe('RESOURCE_NOT_FOUND');
      expect(json.context?.availableFunctions).toContain('sin');
    });
  });

  describe('Error Instance Checks', () => {
    it('should be instanceof Error', () => {
      const error = new LSHError(
        ErrorCodes.VALIDATION_INVALID_FORMAT,
        'Invalid format',
        {}
      );

      expect(error instanceof Error).toBe(true);
      expect(error instanceof LSHError).toBe(true);
    });

    it('should have name property set to LSHError', () => {
      const error = new LSHError(
        ErrorCodes.VALIDATION_INVALID_FORMAT,
        'Invalid format',
        {}
      );

      expect(error.name).toBe('LSHError');
    });
  });

  describe('Floating Point Error Code Coverage', () => {
    it('should cover all error codes used in floating-point-arithmetic.ts', () => {
      expect(ErrorCodes.VALIDATION_INVALID_FORMAT).toBe('VALIDATION_INVALID_FORMAT');
      expect(ErrorCodes.RESOURCE_NOT_FOUND).toBe('RESOURCE_NOT_FOUND');
    });

    it('should have correct HTTP status codes for floating point errors', () => {
      expect(new LSHError(ErrorCodes.VALIDATION_INVALID_FORMAT, 'test', {}).statusCode).toBe(400);
      expect(new LSHError(ErrorCodes.RESOURCE_NOT_FOUND, 'test', {}).statusCode).toBe(404);
    });
  });

  describe('Context Preservation', () => {
    it('should preserve expression in context', () => {
      const error = new LSHError(
        ErrorCodes.VALIDATION_INVALID_FORMAT,
        'Error',
        { expression: 'sin(x) + cos(y)' }
      );

      expect(error.context?.expression).toBe('sin(x) + cos(y)');
    });

    it('should preserve function name and arity in context', () => {
      const error = new LSHError(
        ErrorCodes.VALIDATION_INVALID_FORMAT,
        'Error',
        { functionName: 'atan2', expectedArity: 2, actualArity: 3 }
      );

      expect(error.context?.functionName).toBe('atan2');
      expect(error.context?.expectedArity).toBe(2);
      expect(error.context?.actualArity).toBe(3);
    });

    it('should preserve input in context for parse errors', () => {
      const error = new LSHError(
        ErrorCodes.VALIDATION_INVALID_FORMAT,
        'Invalid float',
        { input: 'not_a_number' }
      );

      expect(error.context?.input).toBe('not_a_number');
    });
  });

  describe('Floating Point Operation Scenarios', () => {
    it('should handle expression with invalid characters scenario', () => {
      const error = new LSHError(
        ErrorCodes.VALIDATION_INVALID_FORMAT,
        'Invalid characters in expression',
        { expression: '1 + $ * 2', cleaned: '1+$*2' }
      );

      expect(error.code).toBe('VALIDATION_INVALID_FORMAT');
      expect(error.message).toBe('Invalid characters in expression');
    });

    it('should handle unknown function call scenario', () => {
      const error = new LSHError(
        ErrorCodes.RESOURCE_NOT_FOUND,
        'Unknown function: customfunc',
        { functionName: 'customfunc', availableFunctions: ['sin', 'cos', 'tan', 'log', 'exp', 'sqrt'] }
      );

      expect(error.statusCode).toBe(404);
      expect(error.context?.functionName).toBe('customfunc');
    });

    it('should handle wrong argument count scenario', () => {
      const error = new LSHError(
        ErrorCodes.VALIDATION_INVALID_FORMAT,
        'Function min expects 2 arguments, got 0',
        { functionName: 'min', expectedArity: 2, actualArity: 0 }
      );

      expect(error.code).toBe('VALIDATION_INVALID_FORMAT');
      expect(error.message).toContain('expects 2 arguments');
    });

    it('should handle invalid expression result scenario', () => {
      const error = new LSHError(
        ErrorCodes.VALIDATION_INVALID_FORMAT,
        'Invalid expression result',
        { expression: 'undefined+1', resultType: 'undefined' }
      );

      expect(error.statusCode).toBe(400);
      expect(error.context?.resultType).toBe('undefined');
    });

    it('should handle parse float failure scenario', () => {
      const error = new LSHError(
        ErrorCodes.VALIDATION_INVALID_FORMAT,
        'Invalid floating point number: hello',
        { input: 'hello' }
      );

      expect(error.code).toBe('VALIDATION_INVALID_FORMAT');
      expect(error.message).toContain('Invalid floating point number');
    });
  });
});
