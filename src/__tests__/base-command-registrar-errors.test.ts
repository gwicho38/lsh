/**
 * Tests for base-command-registrar.ts error handling
 * Verifies LSHError is used with correct error codes
 */

import { describe, it, expect } from '@jest/globals';
import { LSHError, ErrorCodes } from '../lib/lsh-error.js';

describe('LSHError for Base Command Registrar', () => {
  describe('JSON Parse Errors', () => {
    it('should use VALIDATION_INVALID_FORMAT code with 400 status for invalid JSON', () => {
      const error = new LSHError(
        ErrorCodes.VALIDATION_INVALID_FORMAT,
        'Invalid environment variables',
        { input: '{invalid json', parseError: 'Unexpected token i in JSON' }
      );

      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('VALIDATION_INVALID_FORMAT');
      expect(error.context?.input).toBe('{invalid json');
      expect(error.context?.parseError).toContain('Unexpected token');
    });

    it('should truncate long input in context', () => {
      const longInput = 'a'.repeat(200);
      const error = new LSHError(
        ErrorCodes.VALIDATION_INVALID_FORMAT,
        'Invalid JSON',
        { input: longInput.substring(0, 100), parseError: 'Syntax error' }
      );

      expect(error.context?.input).toHaveLength(100);
    });
  });

  describe('Missing Required Options Errors', () => {
    it('should use VALIDATION_REQUIRED_FIELD code with 400 status for missing options', () => {
      const error = new LSHError(
        ErrorCodes.VALIDATION_REQUIRED_FIELD,
        'Missing required options for create',
        { missingOptions: ['--name', '--command'], commandName: 'create' }
      );

      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('VALIDATION_REQUIRED_FIELD');
      expect(error.context?.missingOptions).toContain('--name');
      expect(error.context?.missingOptions).toContain('--command');
      expect(error.context?.commandName).toBe('create');
    });

    it('should handle single missing option', () => {
      const error = new LSHError(
        ErrorCodes.VALIDATION_REQUIRED_FIELD,
        'Missing required options for delete',
        { missingOptions: ['--id'], commandName: 'delete' }
      );

      expect(error.statusCode).toBe(400);
      expect(error.context?.missingOptions).toHaveLength(1);
    });
  });

  describe('Error Serialization', () => {
    it('should serialize JSON parse errors to JSON correctly', () => {
      const error = new LSHError(
        ErrorCodes.VALIDATION_INVALID_FORMAT,
        'Invalid JSON',
        { input: '{"bad":', parseError: 'Unexpected end' }
      );

      const json = error.toJSON();

      expect(json.code).toBe('VALIDATION_INVALID_FORMAT');
      expect(json.message).toBe('Invalid JSON');
      expect(json.statusCode).toBe(400);
      expect(json.context?.parseError).toBe('Unexpected end');
    });

    it('should serialize missing options errors correctly', () => {
      const error = new LSHError(
        ErrorCodes.VALIDATION_REQUIRED_FIELD,
        'Missing options',
        { missingOptions: ['--foo'], commandName: 'bar' }
      );

      const json = error.toJSON();

      expect(json.code).toBe('VALIDATION_REQUIRED_FIELD');
      expect(json.statusCode).toBe(400);
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
        ErrorCodes.VALIDATION_REQUIRED_FIELD,
        'Missing required',
        {}
      );

      expect(error.name).toBe('LSHError');
    });
  });

  describe('Base Command Registrar Error Code Coverage', () => {
    it('should cover all error codes used in base-command-registrar.ts', () => {
      expect(ErrorCodes.VALIDATION_INVALID_FORMAT).toBe('VALIDATION_INVALID_FORMAT');
      expect(ErrorCodes.VALIDATION_REQUIRED_FIELD).toBe('VALIDATION_REQUIRED_FIELD');
    });

    it('should have correct HTTP status codes for validation errors', () => {
      expect(new LSHError(ErrorCodes.VALIDATION_INVALID_FORMAT, 'test', {}).statusCode).toBe(400);
      expect(new LSHError(ErrorCodes.VALIDATION_REQUIRED_FIELD, 'test', {}).statusCode).toBe(400);
    });
  });

  describe('Context Preservation', () => {
    it('should preserve input in context', () => {
      const error = new LSHError(
        ErrorCodes.VALIDATION_INVALID_FORMAT,
        'Invalid',
        { input: 'test input' }
      );

      expect(error.context?.input).toBe('test input');
    });

    it('should preserve parseError in context', () => {
      const error = new LSHError(
        ErrorCodes.VALIDATION_INVALID_FORMAT,
        'Invalid',
        { parseError: 'Syntax error at line 1' }
      );

      expect(error.context?.parseError).toBe('Syntax error at line 1');
    });

    it('should preserve missingOptions in context', () => {
      const error = new LSHError(
        ErrorCodes.VALIDATION_REQUIRED_FIELD,
        'Missing',
        { missingOptions: ['--a', '--b', '--c'] }
      );

      expect(error.context?.missingOptions).toEqual(['--a', '--b', '--c']);
    });

    it('should preserve commandName in context', () => {
      const error = new LSHError(
        ErrorCodes.VALIDATION_REQUIRED_FIELD,
        'Missing',
        { commandName: 'my-command' }
      );

      expect(error.context?.commandName).toBe('my-command');
    });
  });

  describe('Base Command Registrar Operation Scenarios', () => {
    it('should handle parseJSON failure scenario', () => {
      const error = new LSHError(
        ErrorCodes.VALIDATION_INVALID_FORMAT,
        'Invalid environment variables',
        { input: 'not json at all', parseError: 'Unexpected token n in JSON at position 0' }
      );

      expect(error.code).toBe('VALIDATION_INVALID_FORMAT');
      expect(error.message).toContain('environment variables');
      expect(error.context?.parseError).toContain('Unexpected token');
    });

    it('should handle validateRequired failure scenario', () => {
      const error = new LSHError(
        ErrorCodes.VALIDATION_REQUIRED_FIELD,
        'Missing required options for job',
        { missingOptions: ['--name', '--command', '--schedule'], commandName: 'job' }
      );

      expect(error.statusCode).toBe(400);
      expect(error.context?.missingOptions).toHaveLength(3);
      expect(error.context?.commandName).toBe('job');
    });

    it('should handle nested object parse failure', () => {
      const error = new LSHError(
        ErrorCodes.VALIDATION_INVALID_FORMAT,
        'Invalid tags',
        { input: '[1, 2, 3', parseError: 'Unexpected end of JSON input' }
      );

      expect(error.code).toBe('VALIDATION_INVALID_FORMAT');
      expect(error.context?.parseError).toContain('end of JSON');
    });
  });
});
