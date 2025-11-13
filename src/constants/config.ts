/**
 * Configuration keys and environment variables
 *
 * All environment variable names, configuration keys, and default values.
 */

export const ENV_VARS = {
  // Core environment
  NODE_ENV: 'NODE_ENV',
  USER: 'USER',
  HOSTNAME: 'HOSTNAME',

  // LSH API configuration
  LSH_API_ENABLED: 'LSH_API_ENABLED',
  LSH_API_PORT: 'LSH_API_PORT',
  LSH_API_KEY: 'LSH_API_KEY',
  LSH_JWT_SECRET: 'LSH_JWT_SECRET',
  LSH_ALLOW_DANGEROUS_COMMANDS: 'LSH_ALLOW_DANGEROUS_COMMANDS',

  // Secrets management
  LSH_SECRETS_KEY: 'LSH_SECRETS_KEY',

  // Webhooks
  LSH_ENABLE_WEBHOOKS: 'LSH_ENABLE_WEBHOOKS',
  WEBHOOK_PORT: 'WEBHOOK_PORT',
  GITHUB_WEBHOOK_SECRET: 'GITHUB_WEBHOOK_SECRET',
  GITLAB_WEBHOOK_SECRET: 'GITLAB_WEBHOOK_SECRET',
  JENKINS_WEBHOOK_SECRET: 'JENKINS_WEBHOOK_SECRET',

  // Database and persistence
  DATABASE_URL: 'DATABASE_URL',
  SUPABASE_URL: 'SUPABASE_URL',
  SUPABASE_ANON_KEY: 'SUPABASE_ANON_KEY',
  REDIS_URL: 'REDIS_URL',

  // Monitoring
  MONITORING_API_PORT: 'MONITORING_API_PORT',
} as const;

export const DEFAULTS = {
  // Version
  VERSION: '0.5.1',

  // Ports
  API_PORT: 3030,
  WEBHOOK_PORT: 3033,
  MONITORING_API_PORT: 3031,

  // URLs
  REDIS_URL: 'redis://localhost:6379',
  DATABASE_URL: 'postgresql://localhost:5432/cicd',

  // Timeouts and intervals
  CHECK_INTERVAL_MS: 2000,
  REQUEST_TIMEOUT_MS: 10000,

  // Sizes
  MAX_BUFFER_SIZE_BYTES: 1024 * 1024, // 1MB
  MAX_LOG_SIZE_BYTES: 10 * 1024 * 1024, // 10MB
  MAX_COMMAND_LENGTH: 10000,

  // Limits
  MAX_COMMAND_CHAINS: 5,
  MAX_PIPE_USAGE: 3,

  // Cache and retention
  REDIS_CACHE_EXPIRY_SECONDS: 3600, // 1 hour
  METRICS_RETENTION_SECONDS: 30 * 24 * 60 * 60, // 30 days
} as const;
