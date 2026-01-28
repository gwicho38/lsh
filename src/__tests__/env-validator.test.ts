/**
 * Tests for env-validator.ts
 * Environment variable validation at startup
 */

import {
  validateEnvironment,
  LSH_ENV_REQUIREMENTS,
  type EnvValidationResult,
  type EnvRequirement,
} from '../lib/env-validator.js';

describe('Environment Validator', () => {
  describe('validateEnvironment', () => {
    describe('basic validation', () => {
      it('should return valid result for empty requirements', () => {
        const result = validateEnvironment([], {});
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
        expect(result.warnings).toHaveLength(0);
      });

      it('should pass when all required variables are set', () => {
        const requirements: EnvRequirement[] = [
          { name: 'TEST_VAR', required: true, requireInProduction: false },
        ];
        const result = validateEnvironment(requirements, { TEST_VAR: 'value' });
        expect(result.isValid).toBe(true);
        expect(result.missing).toHaveLength(0);
      });

      it('should fail when required variable is missing', () => {
        const requirements: EnvRequirement[] = [
          { name: 'REQUIRED_VAR', required: true, requireInProduction: false },
        ];
        const result = validateEnvironment(requirements, {});
        expect(result.isValid).toBe(false);
        expect(result.missing).toContain('REQUIRED_VAR');
        expect(result.errors.some(e => e.includes('REQUIRED_VAR'))).toBe(true);
      });

      it('should fail when required variable is empty string', () => {
        const requirements: EnvRequirement[] = [
          { name: 'REQUIRED_VAR', required: true, requireInProduction: false },
        ];
        const result = validateEnvironment(requirements, { REQUIRED_VAR: '' });
        expect(result.isValid).toBe(false);
        expect(result.missing).toContain('REQUIRED_VAR');
      });

      it('should fail when required variable is whitespace only', () => {
        const requirements: EnvRequirement[] = [
          { name: 'REQUIRED_VAR', required: true, requireInProduction: false },
        ];
        const result = validateEnvironment(requirements, { REQUIRED_VAR: '   ' });
        expect(result.isValid).toBe(false);
        expect(result.missing).toContain('REQUIRED_VAR');
      });

      it('should pass for optional variables when missing', () => {
        const requirements: EnvRequirement[] = [
          { name: 'OPTIONAL_VAR', required: false, requireInProduction: false },
        ];
        const result = validateEnvironment(requirements, {});
        expect(result.isValid).toBe(true);
      });
    });

    describe('production requirements', () => {
      it('should fail when production-required variable is missing in production', () => {
        const requirements: EnvRequirement[] = [
          { name: 'PROD_VAR', required: false, requireInProduction: true },
        ];
        const result = validateEnvironment(requirements, { NODE_ENV: 'production' });
        expect(result.warnings.some(w => w.includes('PROD_VAR'))).toBe(true);
      });

      it('should pass when production-required variable is missing in development', () => {
        const requirements: EnvRequirement[] = [
          { name: 'PROD_VAR', required: false, requireInProduction: true },
        ];
        const result = validateEnvironment(requirements, { NODE_ENV: 'development' });
        expect(result.isValid).toBe(true);
      });

      it('should pass when production-required variable is set in production', () => {
        const requirements: EnvRequirement[] = [
          { name: 'PROD_VAR', required: false, requireInProduction: true },
        ];
        const result = validateEnvironment(requirements, {
          NODE_ENV: 'production',
          PROD_VAR: 'value'
        });
        expect(result.errors.filter(e => e.includes('PROD_VAR'))).toHaveLength(0);
      });
    });

    describe('API key requirements in production', () => {
      it('should fail when LSH_API_KEY is missing with API enabled in production', () => {
        const result = validateEnvironment(LSH_ENV_REQUIREMENTS, {
          NODE_ENV: 'production',
          LSH_API_ENABLED: 'true',
        });
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.includes('LSH_API_KEY'))).toBe(true);
      });

      it('should fail when LSH_JWT_SECRET is missing with API enabled in production', () => {
        const result = validateEnvironment(LSH_ENV_REQUIREMENTS, {
          NODE_ENV: 'production',
          LSH_API_ENABLED: 'true',
          LSH_API_KEY: 'a'.repeat(32),
        });
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.includes('LSH_JWT_SECRET'))).toBe(true);
      });

      it('should fail when LSH_API_KEY is too short in production', () => {
        const result = validateEnvironment(LSH_ENV_REQUIREMENTS, {
          NODE_ENV: 'production',
          LSH_API_ENABLED: 'true',
          LSH_API_KEY: 'tooshort',
          LSH_JWT_SECRET: 'a'.repeat(32),
        });
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.includes('LSH_API_KEY') && e.includes('32 characters'))).toBe(true);
      });

      it('should pass with valid API credentials in production', () => {
        const result = validateEnvironment(LSH_ENV_REQUIREMENTS, {
          NODE_ENV: 'production',
          LSH_API_ENABLED: 'true',
          LSH_API_KEY: 'a'.repeat(32),
          LSH_JWT_SECRET: 'b'.repeat(32),
        });
        expect(result.errors.filter(e => e.includes('LSH_API_KEY'))).toHaveLength(0);
        expect(result.errors.filter(e => e.includes('LSH_JWT_SECRET'))).toHaveLength(0);
      });

      it('should not require API keys when API is disabled', () => {
        const result = validateEnvironment(LSH_ENV_REQUIREMENTS, {
          NODE_ENV: 'production',
          LSH_API_ENABLED: 'false',
        });
        expect(result.errors.filter(e => e.includes('LSH_API_KEY'))).toHaveLength(0);
        expect(result.errors.filter(e => e.includes('LSH_JWT_SECRET'))).toHaveLength(0);
      });
    });

    describe('webhook requirements in production', () => {
      it('should fail when GITHUB_WEBHOOK_SECRET is missing with webhooks enabled in production', () => {
        const result = validateEnvironment(LSH_ENV_REQUIREMENTS, {
          NODE_ENV: 'production',
          LSH_ENABLE_WEBHOOKS: 'true',
        });
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.includes('GITHUB_WEBHOOK_SECRET'))).toBe(true);
      });

      it('should pass when webhook secret is set with webhooks enabled', () => {
        const result = validateEnvironment(LSH_ENV_REQUIREMENTS, {
          NODE_ENV: 'production',
          LSH_ENABLE_WEBHOOKS: 'true',
          GITHUB_WEBHOOK_SECRET: 'a'.repeat(16),
        });
        expect(result.errors.filter(e => e.includes('GITHUB_WEBHOOK_SECRET'))).toHaveLength(0);
      });

      it('should not require webhook secret when webhooks are disabled', () => {
        const result = validateEnvironment(LSH_ENV_REQUIREMENTS, {
          NODE_ENV: 'production',
          LSH_ENABLE_WEBHOOKS: 'false',
        });
        expect(result.errors.filter(e => e.includes('GITHUB_WEBHOOK_SECRET'))).toHaveLength(0);
      });
    });

    describe('custom validation functions', () => {
      it('should pass when custom validation succeeds', () => {
        const requirements: EnvRequirement[] = [
          {
            name: 'PORT',
            required: false,
            requireInProduction: false,
            validate: (val) => !isNaN(parseInt(val)) && parseInt(val) > 0,
          },
        ];
        const result = validateEnvironment(requirements, { PORT: '3000' });
        expect(result.isValid).toBe(true);
      });

      it('should fail when custom validation fails', () => {
        const requirements: EnvRequirement[] = [
          {
            name: 'PORT',
            required: false,
            requireInProduction: false,
            validate: (val) => !isNaN(parseInt(val)) && parseInt(val) > 0,
            description: 'Port must be a positive number',
          },
        ];
        const result = validateEnvironment(requirements, { PORT: '-1' });
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.includes('PORT'))).toBe(true);
      });

      it('should handle validation function that throws', () => {
        const requirements: EnvRequirement[] = [
          {
            name: 'THROW_VAR',
            required: false,
            requireInProduction: false,
            validate: () => { throw new Error('Validation error'); },
          },
        ];
        const result = validateEnvironment(requirements, { THROW_VAR: 'value' });
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.includes('THROW_VAR') && e.includes('Validation error'))).toBe(true);
      });

      it('should not run validation on empty values', () => {
        let validationRan = false;
        const requirements: EnvRequirement[] = [
          {
            name: 'EMPTY_VAR',
            required: false,
            requireInProduction: false,
            validate: () => { validationRan = true; return true; },
          },
        ];
        validateEnvironment(requirements, {});
        expect(validationRan).toBe(false);
      });
    });

    describe('LSH_ENV_REQUIREMENTS validation', () => {
      it('should validate NODE_ENV correctly', () => {
        const result = validateEnvironment(LSH_ENV_REQUIREMENTS, { NODE_ENV: 'production' });
        expect(result.errors.filter(e => e.includes('NODE_ENV'))).toHaveLength(0);
      });

      it('should reject invalid NODE_ENV', () => {
        const result = validateEnvironment(LSH_ENV_REQUIREMENTS, { NODE_ENV: 'invalid' });
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.includes('NODE_ENV'))).toBe(true);
      });

      it('should validate LSH_API_ENABLED as boolean', () => {
        const validResult = validateEnvironment(LSH_ENV_REQUIREMENTS, { LSH_API_ENABLED: 'true' });
        expect(validResult.errors.filter(e => e.includes('LSH_API_ENABLED'))).toHaveLength(0);

        const invalidResult = validateEnvironment(LSH_ENV_REQUIREMENTS, { LSH_API_ENABLED: 'yes' });
        expect(invalidResult.errors.some(e => e.includes('LSH_API_ENABLED'))).toBe(true);
      });

      it('should validate port numbers', () => {
        const validResult = validateEnvironment(LSH_ENV_REQUIREMENTS, { LSH_API_PORT: '3030' });
        expect(validResult.errors.filter(e => e.includes('LSH_API_PORT'))).toHaveLength(0);

        const invalidResult = validateEnvironment(LSH_ENV_REQUIREMENTS, { LSH_API_PORT: '999999' });
        expect(invalidResult.errors.some(e => e.includes('LSH_API_PORT'))).toBe(true);

        const negativeResult = validateEnvironment(LSH_ENV_REQUIREMENTS, { LSH_API_PORT: '-1' });
        expect(negativeResult.errors.some(e => e.includes('LSH_API_PORT'))).toBe(true);

        const nonNumericResult = validateEnvironment(LSH_ENV_REQUIREMENTS, { LSH_API_PORT: 'abc' });
        expect(nonNumericResult.errors.some(e => e.includes('LSH_API_PORT'))).toBe(true);
      });

      it('should validate DATABASE_URL format', () => {
        const validPostgres = validateEnvironment(LSH_ENV_REQUIREMENTS, {
          DATABASE_URL: 'postgresql://localhost:5432/lsh'
        });
        expect(validPostgres.errors.filter(e => e.includes('DATABASE_URL'))).toHaveLength(0);

        const validPostgresAlt = validateEnvironment(LSH_ENV_REQUIREMENTS, {
          DATABASE_URL: 'postgres://localhost:5432/lsh'
        });
        expect(validPostgresAlt.errors.filter(e => e.includes('DATABASE_URL'))).toHaveLength(0);

        const invalidUrl = validateEnvironment(LSH_ENV_REQUIREMENTS, {
          DATABASE_URL: 'mysql://localhost:3306/lsh'
        });
        expect(invalidUrl.errors.some(e => e.includes('DATABASE_URL'))).toBe(true);
      });

      it('should validate SUPABASE_URL format', () => {
        const validHttps = validateEnvironment(LSH_ENV_REQUIREMENTS, {
          SUPABASE_URL: 'https://project.supabase.co'
        });
        expect(validHttps.errors.filter(e => e.includes('SUPABASE_URL'))).toHaveLength(0);

        const invalidUrl = validateEnvironment(LSH_ENV_REQUIREMENTS, {
          SUPABASE_URL: 'ftp://project.supabase.co'
        });
        expect(invalidUrl.errors.some(e => e.includes('SUPABASE_URL'))).toBe(true);
      });

      it('should validate REDIS_URL format', () => {
        const validRedis = validateEnvironment(LSH_ENV_REQUIREMENTS, {
          REDIS_URL: 'redis://localhost:6379'
        });
        expect(validRedis.errors.filter(e => e.includes('REDIS_URL'))).toHaveLength(0);

        const validRediss = validateEnvironment(LSH_ENV_REQUIREMENTS, {
          REDIS_URL: 'rediss://localhost:6379'
        });
        expect(validRediss.errors.filter(e => e.includes('REDIS_URL'))).toHaveLength(0);

        const invalidUrl = validateEnvironment(LSH_ENV_REQUIREMENTS, {
          REDIS_URL: 'http://localhost:6379'
        });
        expect(invalidUrl.errors.some(e => e.includes('REDIS_URL'))).toBe(true);
      });
    });

    describe('default values and recommendations', () => {
      it('should add recommendation when using default value', () => {
        const requirements: EnvRequirement[] = [
          {
            name: 'PORT',
            required: false,
            requireInProduction: false,
            defaultValue: '3000',
          },
        ];
        const result = validateEnvironment(requirements, {});
        expect(result.recommendations.some(r => r.includes('PORT') && r.includes('3000'))).toBe(true);
      });

      it('should not add recommendation when value is set', () => {
        const requirements: EnvRequirement[] = [
          {
            name: 'PORT',
            required: false,
            requireInProduction: false,
            defaultValue: '3000',
          },
        ];
        const result = validateEnvironment(requirements, { PORT: '8080' });
        expect(result.recommendations.filter(r => r.includes('PORT'))).toHaveLength(0);
      });
    });

    describe('storage mode detection', () => {
      it('should recommend local storage when no database configured', () => {
        const result = validateEnvironment(LSH_ENV_REQUIREMENTS, {});
        expect(result.recommendations.some(r => r.includes('local file storage'))).toBe(true);
      });

      it('should detect PostgreSQL mode', () => {
        const result = validateEnvironment(LSH_ENV_REQUIREMENTS, {
          DATABASE_URL: 'postgresql://localhost:5432/lsh',
        });
        expect(result.recommendations.some(r => r.includes('local PostgreSQL'))).toBe(true);
      });

      it('should detect Supabase mode', () => {
        const result = validateEnvironment(LSH_ENV_REQUIREMENTS, {
          SUPABASE_URL: 'https://project.supabase.co',
          SUPABASE_ANON_KEY: 'key',
        });
        expect(result.recommendations.some(r => r.includes('Supabase'))).toBe(true);
      });

      it('should warn about local storage in production', () => {
        const result = validateEnvironment(LSH_ENV_REQUIREMENTS, {
          NODE_ENV: 'production',
        });
        expect(result.warnings.some(w => w.includes('production') && w.includes('database'))).toBe(true);
      });
    });

    describe('security warnings', () => {
      it('should warn about dangerous commands enabled in production', () => {
        const result = validateEnvironment(LSH_ENV_REQUIREMENTS, {
          NODE_ENV: 'production',
          LSH_ALLOW_DANGEROUS_COMMANDS: 'true',
        });
        expect(result.warnings.some(w => w.includes('DANGEROUS_COMMANDS') && w.includes('security risk'))).toBe(true);
      });

      it('should not warn about dangerous commands in development', () => {
        const result = validateEnvironment(LSH_ENV_REQUIREMENTS, {
          NODE_ENV: 'development',
          LSH_ALLOW_DANGEROUS_COMMANDS: 'true',
        });
        expect(result.warnings.filter(w => w.includes('DANGEROUS_COMMANDS'))).toHaveLength(0);
      });
    });
  });

  describe('EnvValidationResult type', () => {
    it('should have correct structure for valid result', () => {
      const result: EnvValidationResult = {
        isValid: true,
        errors: [],
        warnings: [],
        missing: [],
        recommendations: [],
      };
      expect(result.isValid).toBe(true);
      expect(Array.isArray(result.errors)).toBe(true);
      expect(Array.isArray(result.warnings)).toBe(true);
      expect(Array.isArray(result.missing)).toBe(true);
      expect(Array.isArray(result.recommendations)).toBe(true);
    });

    it('should have correct structure for invalid result', () => {
      const result: EnvValidationResult = {
        isValid: false,
        errors: ['Missing required variable'],
        warnings: ['Deprecated setting'],
        missing: ['REQUIRED_VAR'],
        recommendations: ['Use default value'],
      };
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.warnings).toHaveLength(1);
      expect(result.missing).toHaveLength(1);
      expect(result.recommendations).toHaveLength(1);
    });
  });

  describe('EnvRequirement type', () => {
    it('should support all fields', () => {
      const requirement: EnvRequirement = {
        name: 'TEST_VAR',
        required: true,
        requireInProduction: true,
        validate: (val) => val.length > 0,
        description: 'Test variable',
        defaultValue: 'default',
        sensitiveValue: true,
      };
      expect(requirement.name).toBe('TEST_VAR');
      expect(requirement.required).toBe(true);
      expect(requirement.requireInProduction).toBe(true);
      expect(requirement.validate?.('test')).toBe(true);
      expect(requirement.description).toBe('Test variable');
      expect(requirement.defaultValue).toBe('default');
      expect(requirement.sensitiveValue).toBe(true);
    });

    it('should work with minimal fields', () => {
      const requirement: EnvRequirement = {
        name: 'MINIMAL_VAR',
        required: false,
        requireInProduction: false,
      };
      expect(requirement.name).toBe('MINIMAL_VAR');
      expect(requirement.validate).toBeUndefined();
      expect(requirement.defaultValue).toBeUndefined();
    });
  });

  describe('edge cases', () => {
    it('should handle undefined env object', () => {
      const result = validateEnvironment([], undefined as unknown as Record<string, string>);
      // Should not throw, uses process.env as fallback
      expect(result).toBeDefined();
    });

    it('should handle multiple errors', () => {
      const requirements: EnvRequirement[] = [
        { name: 'VAR1', required: true, requireInProduction: false },
        { name: 'VAR2', required: true, requireInProduction: false },
        { name: 'VAR3', required: true, requireInProduction: false },
      ];
      const result = validateEnvironment(requirements, {});
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBe(3);
      expect(result.missing.length).toBe(3);
    });

    it('should handle mixed valid and invalid variables', () => {
      const requirements: EnvRequirement[] = [
        { name: 'VALID_VAR', required: true, requireInProduction: false },
        { name: 'INVALID_VAR', required: true, requireInProduction: false },
      ];
      const result = validateEnvironment(requirements, { VALID_VAR: 'value' });
      expect(result.isValid).toBe(false);
      expect(result.missing).toContain('INVALID_VAR');
      expect(result.missing).not.toContain('VALID_VAR');
    });
  });
});
