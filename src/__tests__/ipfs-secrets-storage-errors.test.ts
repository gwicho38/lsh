/**
 * Tests for ipfs-secrets-storage.ts error handling
 * Verifies LSHError is used with correct error codes
 */

import { describe, it, expect } from '@jest/globals';
import { LSHError, ErrorCodes } from '../lib/lsh-error.js';

describe('LSHError for IPFS Secrets Storage', () => {
  describe('Secrets Not Found Errors', () => {
    it('should use SECRETS_NOT_FOUND code with 404 status for missing environment', () => {
      const error = new LSHError(
        ErrorCodes.SECRETS_NOT_FOUND,
        'No secrets found for environment: production',
        {
          environment: 'production',
          gitRepo: 'myrepo',
          hint: 'Check available environments with: lsh env'
        }
      );

      expect(error.statusCode).toBe(404);
      expect(error.code).toBe('SECRETS_NOT_FOUND');
      expect(error.context?.environment).toBe('production');
      expect(error.context?.gitRepo).toBe('myrepo');
      expect(error.context?.hint).toContain('lsh env');
    });

    it('should use SECRETS_NOT_FOUND code for secrets not in cache or IPFS', () => {
      const error = new LSHError(
        ErrorCodes.SECRETS_NOT_FOUND,
        'Secrets not found in cache or IPFS',
        {
          cid: 'bafkreiabc123',
          environment: 'dev',
          gitRepo: 'myrepo',
          hint: 'Start IPFS daemon: lsh ipfs start'
        }
      );

      expect(error.statusCode).toBe(404);
      expect(error.code).toBe('SECRETS_NOT_FOUND');
      expect(error.context?.cid).toBe('bafkreiabc123');
      expect(error.context?.environment).toBe('dev');
    });
  });

  describe('Decryption Failed Errors', () => {
    it('should use SECRETS_DECRYPTION_FAILED code with 500 status', () => {
      const error = new LSHError(
        ErrorCodes.SECRETS_DECRYPTION_FAILED,
        'Decryption failed - encryption key may be incorrect or missing',
        {
          originalError: 'bad decrypt',
          hint: 'Set LSH_SECRETS_KEY environment variable'
        }
      );

      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('SECRETS_DECRYPTION_FAILED');
      expect(error.context?.originalError).toBe('bad decrypt');
      expect(error.context?.hint).toContain('LSH_SECRETS_KEY');
    });

    it('should handle wrong block length crypto error', () => {
      const error = new LSHError(
        ErrorCodes.SECRETS_DECRYPTION_FAILED,
        'Decryption failed - encryption key may be incorrect or missing',
        {
          originalError: 'wrong final block length',
          hint: 'Generate a shared key with: lsh key'
        }
      );

      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('SECRETS_DECRYPTION_FAILED');
      expect(error.context?.originalError).toContain('block length');
    });

    it('should handle JSON parse error from wrong key', () => {
      const error = new LSHError(
        ErrorCodes.SECRETS_DECRYPTION_FAILED,
        'Decryption failed - encryption key may be incorrect or missing',
        {
          originalError: 'Unexpected token in JSON',
          hint: 'The key must match the one used during encryption'
        }
      );

      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('SECRETS_DECRYPTION_FAILED');
      expect(error.context?.originalError).toContain('JSON');
    });
  });

  describe('Error Serialization', () => {
    it('should serialize secrets not found errors to JSON correctly', () => {
      const error = new LSHError(
        ErrorCodes.SECRETS_NOT_FOUND,
        'No secrets found',
        { environment: 'staging', gitRepo: 'test-repo' }
      );

      const json = error.toJSON();

      expect(json.code).toBe('SECRETS_NOT_FOUND');
      expect(json.message).toBe('No secrets found');
      expect(json.statusCode).toBe(404);
      expect(json.context?.environment).toBe('staging');
    });

    it('should serialize decryption errors correctly', () => {
      const error = new LSHError(
        ErrorCodes.SECRETS_DECRYPTION_FAILED,
        'Decryption failed',
        { originalError: 'bad decrypt' }
      );

      const json = error.toJSON();

      expect(json.code).toBe('SECRETS_DECRYPTION_FAILED');
      expect(json.statusCode).toBe(500);
      expect(json.context?.originalError).toBe('bad decrypt');
    });
  });

  describe('Error Instance Checks', () => {
    it('should be instanceof Error', () => {
      const error = new LSHError(
        ErrorCodes.SECRETS_NOT_FOUND,
        'Not found',
        {}
      );

      expect(error instanceof Error).toBe(true);
      expect(error instanceof LSHError).toBe(true);
    });

    it('should have name property set to LSHError', () => {
      const error = new LSHError(
        ErrorCodes.SECRETS_DECRYPTION_FAILED,
        'Decryption failed',
        {}
      );

      expect(error.name).toBe('LSHError');
    });
  });

  describe('IPFS Secrets Error Code Coverage', () => {
    it('should cover all error codes used in ipfs-secrets-storage.ts', () => {
      expect(ErrorCodes.SECRETS_NOT_FOUND).toBe('SECRETS_NOT_FOUND');
      expect(ErrorCodes.SECRETS_DECRYPTION_FAILED).toBe('SECRETS_DECRYPTION_FAILED');
    });

    it('should have correct HTTP status codes for IPFS secrets errors', () => {
      expect(new LSHError(ErrorCodes.SECRETS_NOT_FOUND, 'test', {}).statusCode).toBe(404);
      expect(new LSHError(ErrorCodes.SECRETS_DECRYPTION_FAILED, 'test', {}).statusCode).toBe(500);
    });
  });

  describe('Context Preservation', () => {
    it('should preserve environment in context', () => {
      const error = new LSHError(
        ErrorCodes.SECRETS_NOT_FOUND,
        'Not found',
        { environment: 'production' }
      );

      expect(error.context?.environment).toBe('production');
    });

    it('should preserve gitRepo in context', () => {
      const error = new LSHError(
        ErrorCodes.SECRETS_NOT_FOUND,
        'Not found',
        { gitRepo: 'myorg/myrepo' }
      );

      expect(error.context?.gitRepo).toBe('myorg/myrepo');
    });

    it('should preserve CID in context', () => {
      const error = new LSHError(
        ErrorCodes.SECRETS_NOT_FOUND,
        'Not found',
        { cid: 'bafkreixyz789' }
      );

      expect(error.context?.cid).toBe('bafkreixyz789');
    });

    it('should preserve original error in decryption context', () => {
      const error = new LSHError(
        ErrorCodes.SECRETS_DECRYPTION_FAILED,
        'Decryption failed',
        { originalError: 'crypto error details' }
      );

      expect(error.context?.originalError).toBe('crypto error details');
    });

    it('should preserve hint in context', () => {
      const error = new LSHError(
        ErrorCodes.SECRETS_NOT_FOUND,
        'Not found',
        { hint: 'Try running: lsh push' }
      );

      expect(error.context?.hint).toBe('Try running: lsh push');
    });
  });

  describe('IPFS Secrets Operation Scenarios', () => {
    it('should handle pull failure - no metadata scenario', () => {
      const error = new LSHError(
        ErrorCodes.SECRETS_NOT_FOUND,
        'No secrets found for environment: myrepo_production',
        {
          environment: 'myrepo_production',
          gitRepo: 'myrepo',
          hint: 'Check available environments with: lsh env, or push secrets first with: lsh push'
        }
      );

      expect(error.code).toBe('SECRETS_NOT_FOUND');
      expect(error.message).toContain('No secrets found');
      expect(error.context?.hint).toContain('lsh push');
    });

    it('should handle pull failure - cache miss scenario', () => {
      const error = new LSHError(
        ErrorCodes.SECRETS_NOT_FOUND,
        'Secrets not found in cache or IPFS',
        {
          cid: 'bafkreiabc123xyz',
          environment: 'development',
          gitRepo: 'test-project',
          hint: 'Start IPFS daemon: lsh ipfs start, or pull directly by CID: lsh sync pull <cid>'
        }
      );

      expect(error.statusCode).toBe(404);
      expect(error.context?.cid).toBe('bafkreiabc123xyz');
      expect(error.context?.hint).toContain('lsh ipfs start');
    });

    it('should handle decryption failure - bad key scenario', () => {
      const error = new LSHError(
        ErrorCodes.SECRETS_DECRYPTION_FAILED,
        'Decryption failed - encryption key may be incorrect or missing',
        {
          originalError: 'bad decrypt',
          hint: 'Set LSH_SECRETS_KEY environment variable with the key used during encryption. Generate a shared key with: lsh key'
        }
      );

      expect(error.code).toBe('SECRETS_DECRYPTION_FAILED');
      expect(error.message).toContain('encryption key');
      expect(error.context?.hint).toContain('lsh key');
    });

    it('should handle decryption failure - corrupted data scenario', () => {
      const error = new LSHError(
        ErrorCodes.SECRETS_DECRYPTION_FAILED,
        'Decryption failed - encryption key may be incorrect or missing',
        {
          originalError: 'wrong final block length',
          hint: 'The encrypted data may be corrupted. Try pulling fresh from IPFS.'
        }
      );

      expect(error.statusCode).toBe(500);
      expect(error.context?.originalError).toContain('block length');
    });

    it('should handle decryption failure - JSON parse error scenario', () => {
      const error = new LSHError(
        ErrorCodes.SECRETS_DECRYPTION_FAILED,
        'Decryption failed - encryption key may be incorrect or missing',
        {
          originalError: 'Unexpected token < in JSON at position 0',
          hint: 'Wrong key produces garbage that fails JSON.parse'
        }
      );

      expect(error.code).toBe('SECRETS_DECRYPTION_FAILED');
      expect(error.context?.originalError).toContain('Unexpected token');
    });
  });
});
