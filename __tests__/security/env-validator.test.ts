/**
 * Environment Validator Tests
 * Tests for security-focused environment variable validation
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { 
  validateEnvironment,
  LSH_ENV_REQUIREMENTS,
  EnvValidationResult,
  EnvRequirement
} from '../src/lib/env-validator.js';

describe('EnvValidator - Security Tests', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('validateEnvironment - Critical Security Variables', () => {
    it('should validate LSH_API_KEY for security', () => {
      process.env.LSH_API_KEY = 'weak-key';
      process.env.NODE_ENV = 'production';

      const result = validateEnvironment();
      
      // Should warn about weak API keys
      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          variable: 'LSH_API_KEY',
          message: expect.stringContaining('API key appears to be weak')
        })
      );
    });

    it('should validate JWT_SECRET for strength', () => {
      process.env.LSH_JWT_SECRET = 'short';
      process.env.NODE_ENV = 'production';

      const result = validateEnvironment();
      
      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          variable: 'LSH_JWT_SECRET',
          message: expect.stringContaining('JWT secret is too short')
        })
      );
    });

    it('should validate webhook secrets for proper randomness', () => {
      const weakSecrets = {
        'GITHUB_WEBHOOK_SECRET': 'webhook-secret',
        'GITLAB_WEBHOOK_SECRET': 'gitlab-secret',
        'JENKINS_WEBHOOK_SECRET': 'jenkins-secret'
      };

      Object.entries(weakSecrets).forEach(([key, value]) => {
        process.env[key] = value;
        process.env.NODE_ENV = 'production';
      });

      const result = validateEnvironment();
      
      Object.keys(weakSecrets).forEach(key => {
        expect(result.warnings).toContainEqual(
          expect.objectContaining({
            variable: key,
            message: expect.stringContaining('webhook secret appears weak')
          })
        );
      });
    });

    it('should validate DATABASE_URL for security', () => {
      const insecureUrls = [
        'http://insecure-db.com:5432/db', // HTTP instead of HTTPS
        'postgresql://user:password@public-db.com/db', // Password in URL
        'postgresql://user@localhost/db', // No password
        'postgresql://user:pass@0.0.0.0/db' // Localhost in production
      ];

      insecureUrls.forEach(url => {
        process.env.DATABASE_URL = url;
        process.env.NODE_ENV = 'production';

        const result = validateEnvironment();
        
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors.some(err => err.includes('DATABASE_URL'))).toBe(true);
      });
    });
  });

  describe('validateEnvironment - Type Validation', () => {
    it('should validate boolean environment variables', () => {
      process.env.LSH_API_ENABLED = 'maybe'; // Invalid boolean
      process.env.LSH_ALLOW_DANGEROUS_COMMANDS = 'yes'; // Invalid boolean
      
      const result = validateEnvironment();
      
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          variable: 'LSH_API_ENABLED',
          message: expect.stringContaining('must be "true" or "false"')
        })
      );
      
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          variable: 'LSH_ALLOW_DANGEROUS_COMMANDS',
          message: expect.stringContaining('must be "true" or "false"')
        })
      );
    });

    it('should validate numeric environment variables', () => {
      process.env.LSH_API_PORT = 'not-a-number';
      process.env.LSH_LOG_LEVEL = '999'; // Invalid log level
      
      const result = validateEnvironment();
      
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          variable: 'LSH_API_PORT',
          message: expect.stringContaining('must be a valid port number')
        })
      );
    });

    it('should validate URL environment variables', () => {
      const invalidUrls = {
        'SUPABASE_URL': 'not-a-url',
        'STORACHA_RPC_URL': 'ftp://insecure-protocol.com',
        'REDIS_URL': 'redis://user:pass@invalid-host-with-spaces .com'
      };

      Object.entries(invalidUrls).forEach(([key, value]) => {
        process.env[key] = value;
      });

      const result = validateEnvironment();
      
      Object.keys(invalidUrls).forEach(key => {
        expect(result.errors).toContainEqual(
          expect.objectContaining({
            variable: key,
            message: expect.stringContaining('must be a valid URL')
          })
        );
      });
    });
  });

  describe('validateEnvironment - Production Security', () => {
    it('should require security variables in production', () => {
      process.env.NODE_ENV = 'production';
      
      // Remove critical security variables
      delete process.env.LSH_API_KEY;
      delete process.env.LSH_JWT_SECRET;

      const result = validateEnvironment();
      
      expect(result.isValid).toBe(false);
      expect(result.missing).toContain('LSH_API_KEY');
      expect(result.missing).toContain('LSH_JWT_SECRET');
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          message: expect.stringContaining('required in production')
        })
      );
    });

    it('should reject dangerous development settings in production', () => {
      process.env.NODE_ENV = 'production';
      process.env.LSH_ALLOW_DANGEROUS_COMMANDS = 'true';
      process.env.LSH_DEBUG = 'true';
      
      const result = validateEnvironment();
      
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          variable: 'LSH_ALLOW_DANGEROUS_COMMANDS',
          message: expect.stringContaining('cannot be enabled in production')
        })
      );
      
      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          variable: 'LSH_DEBUG',
          message: expect.stringContaining('should not be enabled in production')
        })
      );
    });

    it('should validate SSL settings in production', () => {
      process.env.NODE_ENV = 'production';
      process.env.LSH_FORCE_HTTP = 'true'; // Force HTTP instead of HTTPS
      
      const result = validateEnvironment();
      
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          variable: 'LSH_FORCE_HTTP',
          message: expect.stringContaining('HTTPS required in production')
        })
      );
    });
  });

  describe('validateEnvironment - Edge Cases', () => {
    it('should handle empty and undefined values', () => {
      process.env.LSH_API_KEY = '';
      process.env.LSH_JWT_SECRET = '';
      process.env.NODE_ENV = 'production';

      const result = validateEnvironment();
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle extremely long values', () => {
      process.env.LSH_API_KEY = 'x'.repeat(10000);
      process.env.NODE_ENV = 'production';

      const result = validateEnvironment();
      
      // Should warn about unusually long values
      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          variable: 'LSH_API_KEY',
          message: expect.stringContaining('unusually long')
        })
      );
    });

    it('should handle values with control characters', () => {
      const dangerousValues = {
        'LSH_API_KEY': 'key\x00with\x01nulls',
        'LSH_JWT_SECRET': 'secret\nwith\nnewlines',
        'GITHUB_WEBHOOK_SECRET': 'webhook\rwith\rcarriage'
      };

      Object.entries(dangerousValues).forEach(([key, value]) => {
        process.env[key] = value;
      });

      const result = validateEnvironment();
      
      Object.keys(dangerousValues).forEach(key => {
        expect(result.errors).toContainEqual(
          expect.objectContaining({
            variable: key,
            message: expect.stringContaining('contains control characters')
          })
        );
      });
    });

    it('should handle values with injection patterns', () => {
      const injectionValues = {
        'LSH_API_KEY': 'key; rm -rf /',
        'DATABASE_URL': 'postgresql://user:pass@host/db; DROP TABLE users;',
        'SUPABASE_URL': 'https://api.supabase.io | cat /etc/passwd'
      };

      Object.entries(injectionValues).forEach(([key, value]) => {
        process.env[key] = value;
      });

      const result = validateEnvironment();
      
      Object.keys(injectionValues).forEach(key => {
        expect(result.errors).toContainEqual(
          expect.objectContaining({
            variable: key,
            message: expect.stringContaining('contains potentially dangerous characters')
          })
        );
      });
    });
  });

  describe('validateEnvironment - Default Values', () => {
    it('should provide secure defaults', () => {
      // Clear all environment variables
      Object.keys(process.env).forEach(key => delete process.env[key]);

      const result = validateEnvironment();
      
      // Should have recommendations for missing variables
      expect(result.recommendations.length).toBeGreaterThan(0);
      
      // Recommendations should include security advice
      const securityRecs = result.recommendations.filter(rec => 
        rec.includes('security') || rec.includes('LSH_API_KEY') || rec.includes('LSH_JWT_SECRET')
      );
      expect(securityRecs.length).toBeGreaterThan(0);
    });

    it('should validate custom validation functions', () => {
      const customRequirement: EnvRequirement = {
        name: 'CUSTOM_SECURE_VAR',
        required: true,
        requireInProduction: false,
        validate: (value: string) => {
          // Must be at least 32 chars and contain numbers, letters, and symbols
          return value.length >= 32 && 
                 /[A-Z]/.test(value) && 
                 /[a-z]/.test(value) && 
                 /[0-9]/.test(value) && 
                 /[!@#$%^&*]/.test(value);
        },
        description: 'Custom secure variable'
      };

      process.env.CUSTOM_SECURE_VAR = 'weak';
      
      const result = validateEnvironment([customRequirement]);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          variable: 'CUSTOM_SECURE_VAR',
          message: expect.stringContaining('failed custom validation')
        })
      );
    });
  });

  describe('validateEnvironment - Error Message Security', () => {
    it('should not leak sensitive values in error messages', () => {
      process.env.LSH_API_KEY = 'super-secret-api-key-12345';
      process.env.LSH_JWT_SECRET = 'super-secret-jwt-key-67890';
      process.env.NODE_ENV = 'production';

      const result = validateEnvironment();
      
      // Error messages should not contain the actual secret values
      const resultString = JSON.stringify(result);
      expect(resultString).not.toContain('super-secret-api-key-12345');
      expect(resultString).not.toContain('super-secret-jwt-key-67890');
      
      // But should reference the variable names
      expect(resultString).toContain('LSH_API_KEY');
      expect(resultString).toContain('LSH_JWT_SECRET');
    });

    it('should provide helpful security recommendations', () => {
      // Clear security variables
      delete process.env.LSH_API_KEY;
      delete process.env.LSH_JWT_SECRET;
      process.env.NODE_ENV = 'production';

      const result = validateEnvironment();
      
      expect(result.recommendations).toContainEqual(
        expect.stringContaining('Generate a strong API key')
      );
      
      expect(result.recommendations).toContainEqual(
        expect.stringContaining('Generate a secure JWT secret')
      );
      
      expect(result.recommendations).toContainEqual(
        expect.stringContaining('openssl rand -hex 32')
      );
    });
  });

  describe('validateEnvironment - Performance Tests', () => {
    it('should validate efficiently under load', () => {
      // Set many environment variables
      for (let i = 0; i < 100; i++) {
        process.env[`TEST_VAR_${i}`] = `value-${i}`;
      }

      const startTime = process.hrtime.bigint();
      const result = validateEnvironment();
      const endTime = process.hrtime.bigint();
      
      const duration = Number(endTime - startTime) / 1000000; // Convert to ms
      
      // Should complete validation in under 50ms even with 100+ variables
      expect(duration).toBeLessThan(50);
      expect(typeof result.isValid).toBe('boolean');
      expect(Array.isArray(result.errors)).toBe(true);
    });
  });

  describe('validateEnvironment - Integration Tests', () => {
    it('should work with LSH security configuration', () => {
      // Set a typical production LSH environment
      process.env.NODE_ENV = 'production';
      process.env.LSH_API_KEY = 'lsh_prod_' + 'a'.repeat(40);
      process.env.LSH_JWT_SECRET = 'jwt_prod_' + 'b'.repeat(50);
      process.env.LSH_ALLOW_DANGEROUS_COMMANDS = 'false';
      process.env.LSH_API_ENABLED = 'true';
      process.env.LSH_API_PORT = '3030';

      const result = validateEnvironment();
      
      // Valid production setup
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      
      // Should have warnings about long secrets though
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should detect development security misconfigurations', () => {
      process.env.NODE_ENV = 'development';
      process.env.LSH_ALLOW_DANGEROUS_COMMANDS = 'true';
      process.env.LSH_DEBUG = 'true';
      process.env.LSH_FORCE_HTTP = 'true';

      const result = validateEnvironment();
      
      // Development allows more permissive settings but should warn
      expect(result.warnings.length).toBeGreaterThan(2);
      
      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          message: expect.stringContaining('dangerous commands enabled')
        })
      );
    });
  });

  describe('validateEnvironment - Fuzz Testing', () => {
    it('should handle random environment values safely', () => {
      const randomValues = [
        '', // Empty
        '\0\0\0', // Null bytes
        '\x01\x02\x03', // Control characters
        'a'.repeat(10000), // Very long
        '!@#$%^&*()[]{}|:;<>?./\\', // Special chars
        '🚀🔥💻', // Unicode emoji
        '\'"\\`', // Quote chars
        ' \t\n\r', // Whitespace variations
        '${rm -rf /}', // Shell expansion
        '`whoami`', // Command substitution
      ];

      randomValues.forEach((value, index) => {
        process.env[`FUZZ_VAR_${index}`] = value;
      });

      // Should not crash with malicious input
      expect(() => validateEnvironment()).not.toThrow();
      
      const result = validateEnvironment();
      expect(typeof result.isValid).toBe('boolean');
      expect(Array.isArray(result.errors)).toBe(true);
      expect(Array.isArray(result.warnings)).toBe(true);
    });
  });
});