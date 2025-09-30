import { describe, it, expect } from '@jest/globals';
import {
  validateEnvironment,
  LSH_ENV_REQUIREMENTS,
  EnvRequirement
} from '../src/lib/env-validator.js';

describe('Environment Validator', () => {
  describe('validateEnvironment', () => {
    describe('Development mode', () => {
      it('should pass with minimal configuration in development', () => {
        const env = {
          NODE_ENV: 'development'
        };
        const result = validateEnvironment(LSH_ENV_REQUIREMENTS, env);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should provide recommendations for missing optional vars', () => {
        const env = {
          NODE_ENV: 'development'
        };
        const result = validateEnvironment(LSH_ENV_REQUIREMENTS, env);
        expect(result.recommendations.length).toBeGreaterThan(0);
      });

      it('should accept API configuration', () => {
        const env = {
          NODE_ENV: 'development',
          LSH_API_ENABLED: 'true',
          LSH_API_PORT: '3030',
          LSH_API_KEY: 'a'.repeat(32),
          LSH_JWT_SECRET: 'b'.repeat(32)
        };
        const result = validateEnvironment(LSH_ENV_REQUIREMENTS, env);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should accept webhook configuration', () => {
        const env = {
          NODE_ENV: 'development',
          LSH_ENABLE_WEBHOOKS: 'true',
          GITHUB_WEBHOOK_SECRET: 'c'.repeat(16)
        };
        const result = validateEnvironment(LSH_ENV_REQUIREMENTS, env);
        expect(result.isValid).toBe(true);
      });
    });

    describe('Production mode', () => {
      it('should require API keys when API is enabled', () => {
        const env = {
          NODE_ENV: 'production',
          LSH_API_ENABLED: 'true'
        };
        const result = validateEnvironment(LSH_ENV_REQUIREMENTS, env);
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.includes('LSH_API_KEY'))).toBe(true);
        expect(result.errors.some(e => e.includes('LSH_JWT_SECRET'))).toBe(true);
      });

      it('should pass when API keys are properly configured', () => {
        const env = {
          NODE_ENV: 'production',
          LSH_API_ENABLED: 'true',
          LSH_API_KEY: 'a'.repeat(32),
          LSH_JWT_SECRET: 'b'.repeat(32)
        };
        const result = validateEnvironment(LSH_ENV_REQUIREMENTS, env);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should require webhook secrets when webhooks are enabled', () => {
        const env = {
          NODE_ENV: 'production',
          LSH_ENABLE_WEBHOOKS: 'true'
        };
        const result = validateEnvironment(LSH_ENV_REQUIREMENTS, env);
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.includes('GITHUB_WEBHOOK_SECRET'))).toBe(true);
      });

      it('should pass with proper webhook configuration', () => {
        const env = {
          NODE_ENV: 'production',
          LSH_ENABLE_WEBHOOKS: 'true',
          GITHUB_WEBHOOK_SECRET: 'c'.repeat(16)
        };
        const result = validateEnvironment(LSH_ENV_REQUIREMENTS, env);
        expect(result.isValid).toBe(true);
      });

      it('should warn about dangerous commands in production', () => {
        const env = {
          NODE_ENV: 'production',
          LSH_ALLOW_DANGEROUS_COMMANDS: 'true'
        };
        const result = validateEnvironment(LSH_ENV_REQUIREMENTS, env);
        expect(result.warnings.some(w => w.includes('DANGEROUS_COMMANDS'))).toBe(true);
      });

      it('should reject short API keys in production', () => {
        const env = {
          NODE_ENV: 'production',
          LSH_API_ENABLED: 'true',
          LSH_API_KEY: 'tooshort',
          LSH_JWT_SECRET: 'b'.repeat(32)
        };
        const result = validateEnvironment(LSH_ENV_REQUIREMENTS, env);
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.includes('32 characters'))).toBe(true);
      });

      it('should reject short JWT secrets in production', () => {
        const env = {
          NODE_ENV: 'production',
          LSH_API_ENABLED: 'true',
          LSH_API_KEY: 'a'.repeat(32),
          LSH_JWT_SECRET: 'short'
        };
        const result = validateEnvironment(LSH_ENV_REQUIREMENTS, env);
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.includes('32 characters'))).toBe(true);
      });
    });

    describe('Validation rules', () => {
      it('should validate NODE_ENV values', () => {
        const env = {
          NODE_ENV: 'invalid-env'
        };
        const result = validateEnvironment(LSH_ENV_REQUIREMENTS, env);
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.includes('NODE_ENV'))).toBe(true);
      });

      it('should validate port numbers', () => {
        const env = {
          LSH_API_PORT: '99999' // Invalid port
        };
        const result = validateEnvironment(LSH_ENV_REQUIREMENTS, env);
        expect(result.isValid).toBe(false);
      });

      it('should accept valid port numbers', () => {
        const env = {
          LSH_API_PORT: '3030',
          WEBHOOK_PORT: '8080',
          MONITORING_API_PORT: '9000'
        };
        const result = validateEnvironment(LSH_ENV_REQUIREMENTS, env);
        expect(result.isValid).toBe(true);
      });

      it('should validate DATABASE_URL format', () => {
        const env = {
          DATABASE_URL: 'invalid-url'
        };
        const result = validateEnvironment(LSH_ENV_REQUIREMENTS, env);
        expect(result.isValid).toBe(false);
      });

      it('should accept valid DATABASE_URL', () => {
        const env = {
          DATABASE_URL: 'postgresql://localhost:5432/mydb'
        };
        const result = validateEnvironment(LSH_ENV_REQUIREMENTS, env);
        expect(result.isValid).toBe(true);
      });

      it('should validate SUPABASE_URL format', () => {
        const env = {
          SUPABASE_URL: 'not-a-url'
        };
        const result = validateEnvironment(LSH_ENV_REQUIREMENTS, env);
        expect(result.isValid).toBe(false);
      });

      it('should accept valid SUPABASE_URL', () => {
        const env = {
          SUPABASE_URL: 'https://myproject.supabase.co'
        };
        const result = validateEnvironment(LSH_ENV_REQUIREMENTS, env);
        expect(result.isValid).toBe(true);
      });

      it('should validate REDIS_URL format', () => {
        const env = {
          REDIS_URL: 'http://invalid'
        };
        const result = validateEnvironment(LSH_ENV_REQUIREMENTS, env);
        expect(result.isValid).toBe(false);
      });

      it('should accept valid REDIS_URL', () => {
        const env = {
          REDIS_URL: 'redis://localhost:6379'
        };
        const result = validateEnvironment(LSH_ENV_REQUIREMENTS, env);
        expect(result.isValid).toBe(true);
      });
    });

    describe('Custom requirements', () => {
      it('should validate custom required variables', () => {
        const customReqs: EnvRequirement[] = [
          {
            name: 'CUSTOM_VAR',
            required: true,
            requireInProduction: false,
            description: 'Custom required variable'
          }
        ];
        const env = {};
        const result = validateEnvironment(customReqs, env);
        expect(result.isValid).toBe(false);
        expect(result.missing).toContain('CUSTOM_VAR');
      });

      it('should validate with custom validation function', () => {
        const customReqs: EnvRequirement[] = [
          {
            name: 'CUSTOM_NUMBER',
            required: false,
            requireInProduction: false,
            validate: (val) => !isNaN(parseInt(val)) && parseInt(val) > 100
          }
        ];

        const envInvalid = { CUSTOM_NUMBER: '50' };
        const resultInvalid = validateEnvironment(customReqs, envInvalid);
        expect(resultInvalid.isValid).toBe(false);

        const envValid = { CUSTOM_NUMBER: '200' };
        const resultValid = validateEnvironment(customReqs, envValid);
        expect(resultValid.isValid).toBe(true);
      });

      it('should handle validation function errors gracefully', () => {
        const customReqs: EnvRequirement[] = [
          {
            name: 'THROWS_ERROR',
            required: false,
            requireInProduction: false,
            validate: () => {
              throw new Error('Validation error');
            }
          }
        ];

        const env = { THROWS_ERROR: 'value' };
        const result = validateEnvironment(customReqs, env);
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.includes('Failed to validate'))).toBe(true);
      });
    });

    describe('Edge cases', () => {
      it('should handle empty environment', () => {
        const env = {};
        const result = validateEnvironment(LSH_ENV_REQUIREMENTS, env);
        // Should pass in development (default)
        expect(result.isValid).toBe(true);
      });

      it('should handle undefined environment', () => {
        const result = validateEnvironment(LSH_ENV_REQUIREMENTS, undefined);
        // Should use process.env by default
        expect(result).toBeDefined();
        expect(result.isValid).toBeDefined();
      });

      it('should handle whitespace-only values', () => {
        const customReqs: EnvRequirement[] = [
          { name: 'REQUIRED_VAR', required: true, requireInProduction: false }
        ];
        const env = {
          REQUIRED_VAR: '   '
        };
        const result = validateEnvironment(customReqs, env);
        // Whitespace should be treated as empty for required vars
        expect(result.missing).toContain('REQUIRED_VAR');
        expect(result.isValid).toBe(false);
      });

      it('should track all missing variables', () => {
        const customReqs: EnvRequirement[] = [
          { name: 'VAR1', required: true, requireInProduction: false },
          { name: 'VAR2', required: true, requireInProduction: false },
          { name: 'VAR3', required: true, requireInProduction: false }
        ];
        const env = {};
        const result = validateEnvironment(customReqs, env);
        expect(result.missing).toHaveLength(3);
        expect(result.missing).toContain('VAR1');
        expect(result.missing).toContain('VAR2');
        expect(result.missing).toContain('VAR3');
      });
    });
  });
});
