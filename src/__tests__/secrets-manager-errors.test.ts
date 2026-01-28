/**
 * Tests for secrets-manager.ts error handling
 * Verifies LSHError is used with correct error codes
 *
 * Note: SecretsManager integration tests require IPFS/storage mocking.
 * These tests verify LSHError behavior directly.
 */

import { describe, it, expect } from '@jest/globals';
import { LSHError, ErrorCodes } from '../lib/lsh-error.js';

describe('LSHError for Secrets Manager', () => {
  describe('Decryption Errors', () => {
    it('should use SECRETS_DECRYPTION_FAILED code with 500 status for invalid format', () => {
      const error = new LSHError(
        ErrorCodes.SECRETS_DECRYPTION_FAILED,
        'Invalid encrypted format',
        { reason: 'Expected format is IV:ENCRYPTED_DATA' }
      );

      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('SECRETS_DECRYPTION_FAILED');
      expect(error.context?.reason).toBe('Expected format is IV:ENCRYPTED_DATA');
    });

    it('should use SECRETS_DECRYPTION_FAILED code for key mismatch', () => {
      const error = new LSHError(
        ErrorCodes.SECRETS_DECRYPTION_FAILED,
        'Decryption failed. This usually means key mismatch.',
        { originalError: 'bad decrypt', reason: 'key_mismatch' }
      );

      expect(error.code).toBe('SECRETS_DECRYPTION_FAILED');
      expect(error.context?.reason).toBe('key_mismatch');
      expect(error.context?.originalError).toBe('bad decrypt');
    });
  });

  describe('File Errors', () => {
    it('should use CONFIG_FILE_NOT_FOUND code with 404 status', () => {
      const error = new LSHError(
        ErrorCodes.CONFIG_FILE_NOT_FOUND,
        'File not found: .env',
        { filePath: '.env' }
      );

      expect(error.statusCode).toBe(404);
      expect(error.code).toBe('CONFIG_FILE_NOT_FOUND');
      expect(error.context?.filePath).toBe('.env');
    });
  });

  describe('Validation Errors', () => {
    it('should use VALIDATION_INVALID_FORMAT code with 400 status for invalid filename', () => {
      const error = new LSHError(
        ErrorCodes.VALIDATION_INVALID_FORMAT,
        "Invalid filename: secrets.txt. Must be '.env' or start with '.env.'",
        { filename: 'secrets.txt', expectedPattern: '.env or .env.*' }
      );

      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('VALIDATION_INVALID_FORMAT');
      expect(error.context?.filename).toBe('secrets.txt');
      expect(error.context?.expectedPattern).toBe('.env or .env.*');
    });
  });

  describe('Push Errors', () => {
    it('should use SECRETS_PUSH_FAILED code with 500 status for destructive changes', () => {
      const error = new LSHError(
        ErrorCodes.SECRETS_PUSH_FAILED,
        'Destructive change detected!',
        { destructiveChanges: ['API_KEY', 'DATABASE_URL'], count: 2 }
      );

      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('SECRETS_PUSH_FAILED');
      expect(error.context?.destructiveChanges).toContain('API_KEY');
      expect(error.context?.count).toBe(2);
    });
  });

  describe('Pull Errors', () => {
    it('should use SECRETS_NOT_FOUND code with 404 status for missing environment', () => {
      const error = new LSHError(
        ErrorCodes.SECRETS_NOT_FOUND,
        'No secrets found for environment: production',
        { environment: 'production', requestedEnvironment: 'prod' }
      );

      expect(error.statusCode).toBe(404);
      expect(error.code).toBe('SECRETS_NOT_FOUND');
      expect(error.context?.environment).toBe('production');
    });
  });

  describe('Error Serialization', () => {
    it('should serialize decryption errors to JSON correctly', () => {
      const error = new LSHError(
        ErrorCodes.SECRETS_DECRYPTION_FAILED,
        'Invalid encrypted format',
        { reason: 'format_error' }
      );

      const json = error.toJSON();

      expect(json.code).toBe('SECRETS_DECRYPTION_FAILED');
      expect(json.message).toBe('Invalid encrypted format');
      expect(json.statusCode).toBe(500);
    });

    it('should serialize file not found errors to JSON correctly', () => {
      const error = new LSHError(
        ErrorCodes.CONFIG_FILE_NOT_FOUND,
        'File not found',
        { filePath: '/path/to/.env' }
      );

      const json = error.toJSON();

      expect(json.code).toBe('CONFIG_FILE_NOT_FOUND');
      expect(json.context?.filePath).toBe('/path/to/.env');
    });
  });

  describe('Error Instance Checks', () => {
    it('should be instanceof Error', () => {
      const error = new LSHError(
        ErrorCodes.SECRETS_DECRYPTION_FAILED,
        'Decryption failed',
        {}
      );

      expect(error instanceof Error).toBe(true);
      expect(error instanceof LSHError).toBe(true);
    });

    it('should have name property set to LSHError', () => {
      const error = new LSHError(
        ErrorCodes.SECRETS_NOT_FOUND,
        'Not found',
        {}
      );

      expect(error.name).toBe('LSHError');
    });
  });

  describe('Secrets Error Code Coverage', () => {
    it('should cover all secrets-related error codes', () => {
      // Verify error codes exist and have correct types
      expect(ErrorCodes.SECRETS_ENCRYPTION_FAILED).toBe('SECRETS_ENCRYPTION_FAILED');
      expect(ErrorCodes.SECRETS_DECRYPTION_FAILED).toBe('SECRETS_DECRYPTION_FAILED');
      expect(ErrorCodes.SECRETS_KEY_NOT_FOUND).toBe('SECRETS_KEY_NOT_FOUND');
      expect(ErrorCodes.SECRETS_PUSH_FAILED).toBe('SECRETS_PUSH_FAILED');
      expect(ErrorCodes.SECRETS_PULL_FAILED).toBe('SECRETS_PULL_FAILED');
      expect(ErrorCodes.SECRETS_ROTATION_FAILED).toBe('SECRETS_ROTATION_FAILED');
      expect(ErrorCodes.SECRETS_ENV_PARSE_FAILED).toBe('SECRETS_ENV_PARSE_FAILED');
      expect(ErrorCodes.SECRETS_NOT_FOUND).toBe('SECRETS_NOT_FOUND');
    });

    it('should have consistent 5xx status codes for secrets errors', () => {
      const secretsErrors = [
        new LSHError(ErrorCodes.SECRETS_ENCRYPTION_FAILED, 'test', {}),
        new LSHError(ErrorCodes.SECRETS_DECRYPTION_FAILED, 'test', {}),
        new LSHError(ErrorCodes.SECRETS_PUSH_FAILED, 'test', {}),
        new LSHError(ErrorCodes.SECRETS_PULL_FAILED, 'test', {}),
        new LSHError(ErrorCodes.SECRETS_ROTATION_FAILED, 'test', {}),
        new LSHError(ErrorCodes.SECRETS_ENV_PARSE_FAILED, 'test', {}),
      ];

      secretsErrors.forEach(error => {
        expect(error.statusCode).toBe(500);
      });
    });

    it('should have 404 status for SECRETS_NOT_FOUND', () => {
      const error = new LSHError(ErrorCodes.SECRETS_NOT_FOUND, 'test', {});
      expect(error.statusCode).toBe(404);
    });
  });
});
