/**
 * Environment Variable Validation
 * Validates required environment variables at startup
 */

export interface EnvValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  missing: string[];
  recommendations: string[];
}

export interface EnvRequirement {
  name: string;
  required: boolean;
  requireInProduction: boolean;
  // eslint-disable-next-line no-unused-vars
  validate?: (val: string) => boolean;
  description?: string;
  defaultValue?: string;
  sensitiveValue?: boolean; // Don't log the actual value
}

/**
 * Standard environment variable requirements for LSH
 */
export const LSH_ENV_REQUIREMENTS: EnvRequirement[] = [
  // Core configuration
  {
    name: 'NODE_ENV',
    required: false,
    requireInProduction: false,
    description: 'Environment mode (development, production, test)',
    validate: (val) => ['development', 'production', 'test'].includes(val)
  },
  {
    name: 'USER',
    required: false,
    requireInProduction: false,
    description: 'Current system user'
  },

  // API Configuration
  {
    name: 'LSH_API_ENABLED',
    required: false,
    requireInProduction: false,
    description: 'Enable API server',
    validate: (val) => ['true', 'false'].includes(val)
  },
  {
    name: 'LSH_API_PORT',
    required: false,
    requireInProduction: false,
    description: 'API server port',
    defaultValue: '3030',
    validate: (val) => !isNaN(parseInt(val)) && parseInt(val) > 0 && parseInt(val) < 65536
  },
  {
    name: 'LSH_API_KEY',
    required: false,
    requireInProduction: true, // Required if API is enabled in production
    description: 'API authentication key',
    sensitiveValue: true,
    validate: (val) => val.length >= 32
  },
  {
    name: 'LSH_JWT_SECRET',
    required: false,
    requireInProduction: true, // Required if API is enabled in production
    description: 'JWT signing secret',
    sensitiveValue: true,
    validate: (val) => val.length >= 32
  },

  // Security Configuration
  {
    name: 'LSH_ALLOW_DANGEROUS_COMMANDS',
    required: false,
    requireInProduction: false,
    description: 'Allow potentially dangerous commands (use with caution)',
    validate: (val) => ['true', 'false'].includes(val)
  },

  // Webhook Configuration
  {
    name: 'LSH_ENABLE_WEBHOOKS',
    required: false,
    requireInProduction: false,
    description: 'Enable webhook receiver',
    validate: (val) => ['true', 'false'].includes(val)
  },
  {
    name: 'WEBHOOK_PORT',
    required: false,
    requireInProduction: false,
    description: 'Webhook receiver port',
    defaultValue: '3033',
    validate: (val) => !isNaN(parseInt(val)) && parseInt(val) > 0 && parseInt(val) < 65536
  },
  {
    name: 'GITHUB_WEBHOOK_SECRET',
    required: false,
    requireInProduction: true, // Required if webhooks enabled in production
    description: 'GitHub webhook secret',
    sensitiveValue: true,
    validate: (val) => val.length >= 16
  },
  {
    name: 'GITLAB_WEBHOOK_SECRET',
    required: false,
    requireInProduction: false,
    description: 'GitLab webhook secret',
    sensitiveValue: true
  },
  {
    name: 'JENKINS_WEBHOOK_SECRET',
    required: false,
    requireInProduction: false,
    description: 'Jenkins webhook secret',
    sensitiveValue: true
  },

  // Database Configuration
  {
    name: 'DATABASE_URL',
    required: false,
    requireInProduction: false,
    description: 'PostgreSQL connection string',
    sensitiveValue: true,
    validate: (val) => val.startsWith('postgresql://') || val.startsWith('postgres://')
  },
  {
    name: 'SUPABASE_URL',
    required: false,
    requireInProduction: false,
    description: 'Supabase project URL',
    validate: (val) => val.startsWith('http://') || val.startsWith('https://')
  },
  {
    name: 'SUPABASE_ANON_KEY',
    required: false,
    requireInProduction: false,
    description: 'Supabase anonymous key',
    sensitiveValue: true
  },
  {
    name: 'REDIS_URL',
    required: false,
    requireInProduction: false,
    description: 'Redis connection string',
    defaultValue: 'redis://localhost:6379',
    validate: (val) => val.startsWith('redis://') || val.startsWith('rediss://')
  },

  // Monitoring
  {
    name: 'MONITORING_API_PORT',
    required: false,
    requireInProduction: false,
    description: 'Monitoring API port',
    defaultValue: '3031',
    validate: (val) => !isNaN(parseInt(val)) && parseInt(val) > 0 && parseInt(val) < 65536
  }
];

/**
 * Validate environment variables based on requirements
 */
export function validateEnvironment(
  requirements: EnvRequirement[] = LSH_ENV_REQUIREMENTS,
  env: Record<string, string | undefined> = process.env
): EnvValidationResult {
  const result: EnvValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
    missing: [],
    recommendations: []
  };

  const isProduction = env.NODE_ENV === 'production';
  const apiEnabled = env.LSH_API_ENABLED === 'true';
  const webhooksEnabled = env.LSH_ENABLE_WEBHOOKS === 'true';

  for (const req of requirements) {
    const value = env[req.name];
    const isEmpty = !value || value.trim().length === 0;

    // Check if variable is required
    if (req.required && isEmpty) {
      result.errors.push(`Missing required environment variable: ${req.name}`);
      result.missing.push(req.name);
      result.isValid = false;
      continue;
    }

    // Check production requirements
    if (req.requireInProduction && isProduction && isEmpty) {
      // Special cases for conditional requirements
      if (req.name === 'LSH_API_KEY' || req.name === 'LSH_JWT_SECRET') {
        if (apiEnabled) {
          result.errors.push(
            `${req.name} is required in production when LSH_API_ENABLED=true`
          );
          result.missing.push(req.name);
          result.isValid = false;
        }
      } else if (req.name === 'GITHUB_WEBHOOK_SECRET') {
        if (webhooksEnabled) {
          result.errors.push(
            `${req.name} is required in production when LSH_ENABLE_WEBHOOKS=true`
          );
          result.missing.push(req.name);
          result.isValid = false;
        }
      } else {
        result.warnings.push(
          `${req.name} should be set in production (${req.description || 'no description'})`
        );
      }
      continue;
    }

    // If value exists, validate it
    if (!isEmpty && req.validate) {
      try {
        if (!req.validate(value)) {
          result.errors.push(
            `Invalid value for ${req.name}: ${req.description || 'validation failed'}`
          );
          result.isValid = false;
        }
      } catch (error) {
        result.errors.push(
          `Failed to validate ${req.name}: ${error instanceof Error ? error.message : 'unknown error'}`
        );
        result.isValid = false;
      }
    }

    // Provide recommendations for missing optional vars
    if (isEmpty && req.defaultValue) {
      result.recommendations.push(
        `${req.name} not set, using default: ${req.defaultValue}`
      );
    }
  }

  // Additional security checks
  if (isProduction) {
    if (env.LSH_ALLOW_DANGEROUS_COMMANDS === 'true') {
      result.warnings.push(
        'LSH_ALLOW_DANGEROUS_COMMANDS is enabled in production - this is a security risk'
      );
    }

    if (apiEnabled && (!env.LSH_API_KEY || env.LSH_API_KEY.length < 32)) {
      result.errors.push(
        'LSH_API_KEY must be at least 32 characters in production'
      );
      result.isValid = false;
    }

    if (apiEnabled && (!env.LSH_JWT_SECRET || env.LSH_JWT_SECRET.length < 32)) {
      result.errors.push(
        'LSH_JWT_SECRET must be at least 32 characters in production'
      );
      result.isValid = false;
    }
  }

  return result;
}

/**
 * Print validation results to console
 */
export function printValidationResults(result: EnvValidationResult, exitOnError = false): void {
  if (result.errors.length > 0) {
    console.error('\n❌ Environment Variable Errors:');
    result.errors.forEach(err => console.error(`  - ${err}`));
  }

  if (result.warnings.length > 0) {
    console.warn('\n⚠️  Environment Variable Warnings:');
    result.warnings.forEach(warn => console.warn(`  - ${warn}`));
  }

  if (result.recommendations.length > 0) {
    // eslint-disable-next-line no-console
    console.log('\nℹ️  Environment Variable Recommendations:');
    // eslint-disable-next-line no-console
    result.recommendations.forEach(rec => console.log(`  - ${rec}`));
  }

  if (result.isValid) {
    // eslint-disable-next-line no-console
    console.log('\n✅ Environment validation passed');
  } else {
    console.error('\n❌ Environment validation failed');
    if (exitOnError) {
      console.error('\nPlease check your .env file or environment variables');
      console.error('See .env.example for required configuration\n');
      process.exit(1);
    }
  }
}

/**
 * Validate and exit if invalid (for use at startup)
 */
export function validateOrExit(
  requirements: EnvRequirement[] = LSH_ENV_REQUIREMENTS
): void {
  const result = validateEnvironment(requirements);
  printValidationResults(result, true);
}

export default {
  validateEnvironment,
  printValidationResults,
  validateOrExit,
  LSH_ENV_REQUIREMENTS
};
