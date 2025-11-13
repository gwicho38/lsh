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

  // Trading/ML tables (legacy)
  TRADING_DISCLOSURES: 'trading_disclosures',
  POLITICIANS: 'politicians',
  DATA_PULL_JOBS: 'data_pull_jobs',
} as const;
