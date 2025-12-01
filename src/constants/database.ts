/**
 * Database tables and schema constants
 *
 * All database table names, column names, and database-related constants.
 */

export const TABLES = {
  // Shell-related tables
  SHELL_HISTORY: 'shell_history',
  SHELL_JOBS: 'shell_jobs',
  SHELL_CONFIGURATION: 'shell_configuration',
  SHELL_ALIASES: 'shell_aliases',
  SHELL_FUNCTIONS: 'shell_functions',
  SHELL_SESSIONS: 'shell_sessions',
  SHELL_COMPLETIONS: 'shell_completions',

  // CI/CD tables
  PIPELINE_EVENTS: 'pipeline_events',

  // SaaS tables - Users and Authentication
  USERS: 'users',
  USER_SESSIONS: 'user_sessions',

  // SaaS tables - Organizations and Teams
  ORGANIZATIONS: 'organizations',
  ORGANIZATION_MEMBERS: 'organization_members',
  TEAMS: 'teams',
  TEAM_MEMBERS: 'team_members',

  // SaaS tables - Secrets
  SECRETS: 'secrets',
  SECRET_ACCESS_LOGS: 'secret_access_logs',
  SECRET_VERSIONS: 'secret_versions',

  // SaaS tables - Audit
  AUDIT_LOGS: 'audit_logs',

  // SaaS tables - Billing
  SUBSCRIPTIONS: 'subscriptions',
  INVOICES: 'invoices',

  // SaaS tables - Encryption
  ENCRYPTION_KEYS: 'encryption_keys',

  // LSH Secrets (legacy name)
  LSH_SECRETS: 'lsh_secrets',

  // Trading/ML tables (legacy)
  TRADING_DISCLOSURES: 'trading_disclosures',
  POLITICIANS: 'politicians',
  DATA_PULL_JOBS: 'data_pull_jobs',

  // ML tables
  ML_TRAINING_JOBS: 'ml_training_jobs',
  ML_MODELS: 'ml_models',
  ML_FEATURES: 'ml_features',

  // Views (read-only aggregations)
  ORGANIZATION_MEMBERS_DETAILED: 'organization_members_detailed',
  ORGANIZATION_USAGE_SUMMARY: 'organization_usage_summary',
  TEAM_MEMBERS_DETAILED: 'team_members_detailed',
  SECRETS_SUMMARY: 'secrets_summary',
} as const;
