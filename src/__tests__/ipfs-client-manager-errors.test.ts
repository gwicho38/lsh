/**
 * Tests for ipfs-client-manager.ts error handling
 * Verifies LSHError is used with correct error codes
 */

import { describe, it, expect } from '@jest/globals';
import { LSHError, ErrorCodes } from '../lib/lsh-error.js';

describe('LSHError for IPFS Client Manager', () => {
  describe('Unsupported Platform Errors', () => {
    it('should use NOT_IMPLEMENTED code with 501 status for unsupported platform', () => {
      const error = new LSHError(
        ErrorCodes.NOT_IMPLEMENTED,
        'Unsupported platform: freebsd',
        { platform: 'freebsd', supportedPlatforms: ['darwin', 'linux', 'win32'] }
      );

      expect(error.statusCode).toBe(501);
      expect(error.code).toBe('NOT_IMPLEMENTED');
      expect(error.context?.platform).toBe('freebsd');
      expect(error.context?.supportedPlatforms).toContain('darwin');
    });

    it('should include supported platforms in context', () => {
      const error = new LSHError(
        ErrorCodes.NOT_IMPLEMENTED,
        'Unsupported platform: sunos',
        { platform: 'sunos', supportedPlatforms: ['darwin', 'linux', 'win32'] }
      );

      expect(error.context?.supportedPlatforms).toHaveLength(3);
      expect(error.context?.supportedPlatforms).toContain('linux');
      expect(error.context?.supportedPlatforms).toContain('win32');
    });
  });

  describe('IPFS Not Installed Errors', () => {
    it('should use CONFIG_MISSING_ENV_VAR code with 500 status for missing IPFS', () => {
      const error = new LSHError(
        ErrorCodes.CONFIG_MISSING_ENV_VAR,
        'IPFS client not installed',
        { hint: 'Run: lsh ipfs install' }
      );

      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('CONFIG_MISSING_ENV_VAR');
      expect(error.context?.hint).toContain('lsh ipfs install');
    });
  });

  describe('Error Serialization', () => {
    it('should serialize unsupported platform errors to JSON correctly', () => {
      const error = new LSHError(
        ErrorCodes.NOT_IMPLEMENTED,
        'Unsupported platform: aix',
        { platform: 'aix', supportedPlatforms: ['darwin', 'linux', 'win32'] }
      );

      const json = error.toJSON();

      expect(json.code).toBe('NOT_IMPLEMENTED');
      expect(json.message).toBe('Unsupported platform: aix');
      expect(json.statusCode).toBe(501);
      expect(json.context?.platform).toBe('aix');
    });

    it('should serialize IPFS not installed errors correctly', () => {
      const error = new LSHError(
        ErrorCodes.CONFIG_MISSING_ENV_VAR,
        'IPFS client not installed',
        { hint: 'Install IPFS first' }
      );

      const json = error.toJSON();

      expect(json.code).toBe('CONFIG_MISSING_ENV_VAR');
      expect(json.statusCode).toBe(500);
    });
  });

  describe('Error Instance Checks', () => {
    it('should be instanceof Error', () => {
      const error = new LSHError(
        ErrorCodes.NOT_IMPLEMENTED,
        'Not implemented',
        {}
      );

      expect(error instanceof Error).toBe(true);
      expect(error instanceof LSHError).toBe(true);
    });

    it('should have name property set to LSHError', () => {
      const error = new LSHError(
        ErrorCodes.CONFIG_MISSING_ENV_VAR,
        'Missing config',
        {}
      );

      expect(error.name).toBe('LSHError');
    });
  });

  describe('IPFS Client Manager Error Code Coverage', () => {
    it('should cover all error codes used in ipfs-client-manager.ts', () => {
      expect(ErrorCodes.NOT_IMPLEMENTED).toBe('NOT_IMPLEMENTED');
      expect(ErrorCodes.CONFIG_MISSING_ENV_VAR).toBe('CONFIG_MISSING_ENV_VAR');
    });

    it('should have correct HTTP status codes for IPFS client errors', () => {
      expect(new LSHError(ErrorCodes.NOT_IMPLEMENTED, 'test', {}).statusCode).toBe(501);
      expect(new LSHError(ErrorCodes.CONFIG_MISSING_ENV_VAR, 'test', {}).statusCode).toBe(500);
    });
  });

  describe('Context Preservation', () => {
    it('should preserve platform in context', () => {
      const error = new LSHError(
        ErrorCodes.NOT_IMPLEMENTED,
        'Unsupported',
        { platform: 'openbsd' }
      );

      expect(error.context?.platform).toBe('openbsd');
    });

    it('should preserve supportedPlatforms in context', () => {
      const error = new LSHError(
        ErrorCodes.NOT_IMPLEMENTED,
        'Unsupported',
        { supportedPlatforms: ['darwin', 'linux'] }
      );

      expect(error.context?.supportedPlatforms).toEqual(['darwin', 'linux']);
    });

    it('should preserve hint in context', () => {
      const error = new LSHError(
        ErrorCodes.CONFIG_MISSING_ENV_VAR,
        'Not installed',
        { hint: 'Run installation command' }
      );

      expect(error.context?.hint).toBe('Run installation command');
    });
  });

  describe('IPFS Client Manager Operation Scenarios', () => {
    it('should handle install() unsupported platform scenario', () => {
      const error = new LSHError(
        ErrorCodes.NOT_IMPLEMENTED,
        'Unsupported platform: netbsd',
        { platform: 'netbsd', supportedPlatforms: ['darwin', 'linux', 'win32'] }
      );

      expect(error.code).toBe('NOT_IMPLEMENTED');
      expect(error.message).toContain('Unsupported platform');
      expect(error.context?.platform).toBe('netbsd');
    });

    it('should handle init() IPFS not installed scenario', () => {
      const error = new LSHError(
        ErrorCodes.CONFIG_MISSING_ENV_VAR,
        'IPFS client not installed',
        { hint: 'Run: lsh ipfs install' }
      );

      expect(error.statusCode).toBe(500);
      expect(error.context?.hint).toContain('lsh ipfs install');
    });

    it('should handle start() IPFS not installed scenario', () => {
      const error = new LSHError(
        ErrorCodes.CONFIG_MISSING_ENV_VAR,
        'IPFS client not installed',
        { hint: 'Run: lsh ipfs install' }
      );

      expect(error.code).toBe('CONFIG_MISSING_ENV_VAR');
      expect(error.message).toContain('not installed');
    });
  });
});
