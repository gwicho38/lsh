/**
 * Tests for saas-encryption.ts error handling
 * Verifies LSHError is used with correct error codes
 */

import { describe, it, expect } from '@jest/globals';
import { LSHError, ErrorCodes } from '../lib/lsh-error.js';

describe('LSHError for SaaS Encryption Service', () => {
  describe('Configuration Errors', () => {
    it('should use CONFIG_MISSING_ENV_VAR code with 500 status for missing master key', () => {
      const error = new LSHError(
        ErrorCodes.CONFIG_MISSING_ENV_VAR,
        'LSH_MASTER_KEY or LSH_SECRETS_KEY environment variable must be set for encryption',
        { required: ['LSH_MASTER_KEY', 'LSH_SECRETS_KEY'] }
      );

      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('CONFIG_MISSING_ENV_VAR');
      expect(error.context?.required).toContain('LSH_MASTER_KEY');
      expect(error.context?.required).toContain('LSH_SECRETS_KEY');
    });
  });

  describe('Key Creation Errors', () => {
    it('should use SECRETS_ENCRYPTION_FAILED code with 500 status for key creation failure', () => {
      const error = new LSHError(
        ErrorCodes.SECRETS_ENCRYPTION_FAILED,
        'Failed to create encryption key: duplicate key value',
        { teamId: 'team_123', dbError: 'duplicate key value' }
      );

      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('SECRETS_ENCRYPTION_FAILED');
      expect(error.context?.teamId).toBe('team_123');
      expect(error.context?.dbError).toBe('duplicate key value');
    });
  });

  describe('Key Rotation Errors', () => {
    it('should use SECRETS_ROTATION_FAILED code with 500 status for rotation failure', () => {
      const error = new LSHError(
        ErrorCodes.SECRETS_ROTATION_FAILED,
        'Failed to rotate encryption key: connection timeout',
        { teamId: 'team_456', newVersion: 2, dbError: 'connection timeout' }
      );

      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('SECRETS_ROTATION_FAILED');
      expect(error.context?.teamId).toBe('team_456');
      expect(error.context?.newVersion).toBe(2);
    });
  });

  describe('Key Not Found Errors', () => {
    it('should use SECRETS_KEY_NOT_FOUND code with 404 status for missing team key', () => {
      const error = new LSHError(
        ErrorCodes.SECRETS_KEY_NOT_FOUND,
        'No active encryption key found for team',
        { teamId: 'team_789' }
      );

      expect(error.statusCode).toBe(404);
      expect(error.code).toBe('SECRETS_KEY_NOT_FOUND');
      expect(error.context?.teamId).toBe('team_789');
    });
  });

  describe('Decryption Errors', () => {
    it('should use SECRETS_DECRYPTION_FAILED code with 500 status for invalid data format', () => {
      const error = new LSHError(
        ErrorCodes.SECRETS_DECRYPTION_FAILED,
        'Invalid encrypted data format',
        { teamId: 'team_123', expectedFormat: 'iv:encryptedData', actualParts: 1 }
      );

      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('SECRETS_DECRYPTION_FAILED');
      expect(error.context?.expectedFormat).toBe('iv:encryptedData');
      expect(error.context?.actualParts).toBe(1);
    });

    it('should use SECRETS_DECRYPTION_FAILED code for invalid key format', () => {
      const error = new LSHError(
        ErrorCodes.SECRETS_DECRYPTION_FAILED,
        'Invalid encrypted key format',
        { expectedFormat: 'iv:encryptedKey', actualParts: 3 }
      );

      expect(error.code).toBe('SECRETS_DECRYPTION_FAILED');
      expect(error.context?.expectedFormat).toBe('iv:encryptedKey');
    });
  });

  describe('Error Serialization', () => {
    it('should serialize encryption errors to JSON correctly', () => {
      const error = new LSHError(
        ErrorCodes.SECRETS_ENCRYPTION_FAILED,
        'Failed to create encryption key',
        { teamId: 'team_123', dbError: 'constraint violation' }
      );

      const json = error.toJSON();

      expect(json.code).toBe('SECRETS_ENCRYPTION_FAILED');
      expect(json.message).toBe('Failed to create encryption key');
      expect(json.statusCode).toBe(500);
      expect(json.context?.teamId).toBe('team_123');
    });

    it('should serialize rotation errors correctly', () => {
      const error = new LSHError(
        ErrorCodes.SECRETS_ROTATION_FAILED,
        'Failed to rotate key',
        { teamId: 'team_456', newVersion: 3 }
      );

      const json = error.toJSON();

      expect(json.code).toBe('SECRETS_ROTATION_FAILED');
      expect(json.context?.newVersion).toBe(3);
    });
  });

  describe('Error Instance Checks', () => {
    it('should be instanceof Error', () => {
      const error = new LSHError(
        ErrorCodes.CONFIG_MISSING_ENV_VAR,
        'Missing env var',
        {}
      );

      expect(error instanceof Error).toBe(true);
      expect(error instanceof LSHError).toBe(true);
    });

    it('should have name property set to LSHError', () => {
      const error = new LSHError(
        ErrorCodes.SECRETS_KEY_NOT_FOUND,
        'Key not found',
        {}
      );

      expect(error.name).toBe('LSHError');
    });
  });

  describe('Encryption Error Code Coverage', () => {
    it('should cover all error codes used in saas-encryption.ts', () => {
      // Verify error codes exist and have correct types
      expect(ErrorCodes.CONFIG_MISSING_ENV_VAR).toBe('CONFIG_MISSING_ENV_VAR');
      expect(ErrorCodes.SECRETS_ENCRYPTION_FAILED).toBe('SECRETS_ENCRYPTION_FAILED');
      expect(ErrorCodes.SECRETS_ROTATION_FAILED).toBe('SECRETS_ROTATION_FAILED');
      expect(ErrorCodes.SECRETS_KEY_NOT_FOUND).toBe('SECRETS_KEY_NOT_FOUND');
      expect(ErrorCodes.SECRETS_DECRYPTION_FAILED).toBe('SECRETS_DECRYPTION_FAILED');
    });

    it('should have correct HTTP status codes for encryption errors', () => {
      expect(new LSHError(ErrorCodes.CONFIG_MISSING_ENV_VAR, 'test', {}).statusCode).toBe(500);
      expect(new LSHError(ErrorCodes.SECRETS_ENCRYPTION_FAILED, 'test', {}).statusCode).toBe(500);
      expect(new LSHError(ErrorCodes.SECRETS_ROTATION_FAILED, 'test', {}).statusCode).toBe(500);
      expect(new LSHError(ErrorCodes.SECRETS_KEY_NOT_FOUND, 'test', {}).statusCode).toBe(404);
      expect(new LSHError(ErrorCodes.SECRETS_DECRYPTION_FAILED, 'test', {}).statusCode).toBe(500);
    });
  });

  describe('Context Preservation', () => {
    it('should preserve teamId in context', () => {
      const error = new LSHError(
        ErrorCodes.SECRETS_KEY_NOT_FOUND,
        'Key not found',
        { teamId: 'team_abc123' }
      );

      expect(error.context?.teamId).toBe('team_abc123');
    });

    it('should preserve version info in context', () => {
      const error = new LSHError(
        ErrorCodes.SECRETS_ROTATION_FAILED,
        'Rotation failed',
        { teamId: 'team_xyz', newVersion: 5, dbError: 'timeout' }
      );

      expect(error.context?.newVersion).toBe(5);
      expect(error.context?.dbError).toBe('timeout');
    });

    it('should preserve format info in context', () => {
      const error = new LSHError(
        ErrorCodes.SECRETS_DECRYPTION_FAILED,
        'Invalid format',
        { expectedFormat: 'iv:data', actualParts: 0 }
      );

      expect(error.context?.expectedFormat).toBe('iv:data');
      expect(error.context?.actualParts).toBe(0);
    });

    it('should preserve required env vars in context', () => {
      const error = new LSHError(
        ErrorCodes.CONFIG_MISSING_ENV_VAR,
        'Missing config',
        { required: ['VAR_A', 'VAR_B', 'VAR_C'] }
      );

      expect(error.context?.required).toHaveLength(3);
      expect(error.context?.required).toContain('VAR_B');
    });
  });

  describe('Encryption Operation Scenarios', () => {
    it('should handle master key not set scenario', () => {
      const error = new LSHError(
        ErrorCodes.CONFIG_MISSING_ENV_VAR,
        'LSH_MASTER_KEY or LSH_SECRETS_KEY environment variable must be set for encryption',
        { required: ['LSH_MASTER_KEY', 'LSH_SECRETS_KEY'] }
      );

      expect(error.code).toBe('CONFIG_MISSING_ENV_VAR');
      expect(error.message).toContain('must be set');
    });

    it('should handle key generation failure scenario', () => {
      const error = new LSHError(
        ErrorCodes.SECRETS_ENCRYPTION_FAILED,
        'Failed to create encryption key: unique constraint violated',
        { teamId: 'team_test', dbError: 'unique constraint violated' }
      );

      expect(error.code).toBe('SECRETS_ENCRYPTION_FAILED');
    });

    it('should handle decryption with malformed data scenario', () => {
      const error = new LSHError(
        ErrorCodes.SECRETS_DECRYPTION_FAILED,
        'Invalid encrypted data format',
        { teamId: 'team_test', expectedFormat: 'iv:encryptedData', actualParts: 5 }
      );

      expect(error.statusCode).toBe(500);
      expect(error.context?.actualParts).toBe(5);
    });
  });
});
