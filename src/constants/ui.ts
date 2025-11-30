/**
 * UI strings and console output
 *
 * All user-facing messages, prompts, and terminal output strings.
 */

export const UI_MESSAGES = {
  // Help and usage
  DID_YOU_MEAN: '\nDid you mean one of these?',
  RUN_HELP_MESSAGE: '\nRun \'lsh --help\' to see available commands.',

  // Configuration messages
  CONFIG_EXISTS: 'Configuration file already exists: ${rcFile}',
  CONFIG_CREATED: '✅ Created configuration file: ${rcFile}',
  CONFIG_CREATE_FAILED: '❌ Failed to create configuration: ${message}',
  CONFIG_NOT_FOUND: '❌ Configuration file not found: ${rcFile}',
  CONFIG_INIT_HINT: 'Run "lsh config --init" to create one.',
  CONFIG_FILE_DISPLAY: '📄 Configuration file: ${rcFile}',
  CONFIG_NOT_FOUND_VALIDATE: '❌ Configuration file not found: ${rcFile}',
  CONFIG_VALID: '✅ Configuration file is valid: ${rcFile}',
  CONFIG_HAS_ERRORS: '❌ Configuration file has errors: ${rcFile}',

  // Secrets messages
  FAILED_PUSH_SECRETS: '❌ Failed to push secrets:',
  FAILED_PULL_SECRETS: '❌ Failed to pull secrets:',
  FILE_NOT_FOUND: '❌ File not found: ${envPath}',
  TIP_PULL_FROM_CLOUD: '💡 Tip: Pull from cloud with: lsh pull --env <environment>',
  SECRETS_IN_FILE: '\n📋 Secrets in ${file}:\n',
  TOTAL_SECRETS: '\n  Total: ${count} secrets\n',
  FAILED_LIST_SECRETS: '❌ Failed to list secrets:',

  // Version messages
  CURRENT_VERSION: 'Current version:',
  CHECKING_UPDATES: 'Checking npm for updates...',
  FAILED_FETCH_VERSION: '✗ Failed to fetch version information from npm',
  CHECK_INTERNET: '⚠ Make sure you have internet connectivity',
  LATEST_VERSION: 'Latest version:',
  ALREADY_LATEST: '✓ You\'re already on the latest version!',
  VERSION_NEWER: '✓ Your version (${currentVersion}) is newer than npm',
  DEV_VERSION_HINT: 'You may be using a development version',
  UPDATE_AVAILABLE: '⬆ Update available: ${currentVersion} → ${latestVersion}',
  RUN_UPDATE_HINT: 'ℹ Run \'lsh self update\' to install the update',
} as const;

export const LOG_MESSAGES = {
  // Environment validation
  VALIDATING_ENV: 'Validating environment configuration',
  ENV_VALIDATION_FAILED: 'Environment validation failed in production',

  // Daemon lifecycle
  DAEMON_STARTING: 'Starting LSH Job Daemon',
  DAEMON_STARTED: 'Daemon started with PID ${pid}',
  DAEMON_STOPPING: 'Stopping LSH Job Daemon',
  DAEMON_STOPPED: 'Daemon stopped',

  // API server
  API_SERVER_STARTED: 'API Server started on port ${port}',
  API_SERVER_STOPPED: 'API Server stopped',

  // Job operations
  ADDING_JOB: 'Adding job: ${name}',
  STARTING_JOB: 'Starting job: ${jobId}',
  TRIGGERING_JOB: 'Triggering job: ${jobId}',

  // Scheduler
  SCHEDULER_STARTING: '📅 Starting job scheduler...',
  SCHEDULER_STARTED: '✅ Job scheduler started successfully',

  // Secrets operations
  WARN_NO_SECRETS_KEY: '⚠️  Warning: No LSH_SECRETS_KEY set. Using machine-derived key.',
  WARN_GENERATE_KEY_MESSAGE: 'To share secrets across machines, generate a key with: lsh secrets key',
  PUSHING_SECRETS: 'Pushing ${envFilePath} to Supabase (${environment})...',
  SECRETS_PUSHED: '✅ Pushed ${count} secrets from ${filename} to Supabase',
  PULLING_SECRETS: 'Pulling ${filename} (${environment}) from Supabase...',
  BACKUP_CREATED: 'Backed up existing .env to ${backup}',
  SECRETS_PULLED: '✅ Pulled ${count} secrets from Supabase',
} as const;

export const LOG_LEVELS = {
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR',
  DEBUG: 'DEBUG',
} as const;

/**
 * Emoji prefixes for consistent UI output
 */
export const EMOJI = {
  SUCCESS: '✅',
  ERROR: '❌',
  WARNING: '⚠️',
  INFO: 'ℹ️',
  TIP: '💡',
  KEY: '🔑',
  FILE: '📄',
  FOLDER: '📁',
  LIST: '📋',
  SEARCH: '🔍',
  LOCATION: '📍',
  UP: '⬆️',
  DOWN: '⬇️',
  CALENDAR: '📅',
  GEAR: '⚙️',
} as const;

/**
 * Status messages with emoji
 */
export const STATUS_MESSAGES = {
  // Success messages
  SUCCESS: '✅',
  SUCCESS_GENERIC: '✅ Success',
  CONNECTION_SUCCESS: '✅ Connection successful!',
  CONFIG_SAVED: '✅ Configuration saved',
  SECRETS_PULLED: '✅ Secrets pulled successfully!',
  IPFS_INSTALLED: '✅ IPFS client installed',

  // Error messages
  ERROR: '❌',
  ERROR_GENERIC: '❌ Error',
  CONNECTION_FAILED: '❌ Connection failed',
  CONFIG_SAVE_FAILED: '❌ Failed to save configuration',
  PULL_FAILED: '❌ Failed to pull secrets',

  // Warning messages
  WARNING: '⚠️',
  WARNING_GENERIC: '⚠️ Warning',
  IPFS_NOT_INSTALLED: '⚠️  IPFS client not installed',
  NOT_GIT_REPO: 'ℹ️  Not in a git repository',

  // Info messages
  INFO: 'ℹ️',
  RECOMMENDATIONS: '💡 Recommendations:',
  CURRENT_REPO: '📁 Current Repository:',
} as const;

/**
 * Doctor/diagnostic messages
 */
export const DOCTOR_MESSAGES = {
  CHECKING: '🔍 Checking:',
  ALL_PASSED: '✅ All checks passed!',
  ISSUES_FOUND: '❌ Issues found',
  RECOMMENDATIONS: '💡 Recommendations:',
} as const;

/**
 * Init/setup messages
 */
export const INIT_MESSAGES = {
  WELCOME: '🚀 Welcome to LSH Setup',
  STEP_COMPLETE: '✅ Step complete',
  SETUP_COMPLETE: '✅ Setup complete!',
  CONNECTION_TEST_SKIPPED: '⚠️  Connection test skipped. Run "lsh doctor" after setup to verify.',
} as const;

/**
 * Migration messages
 */
export const MIGRATION_MESSAGES = {
  SCANNING: '🔍 Scanning for Firebase references...',
  MIGRATING: '🔄 Migrating...',
  COMPLETE: '✅ Migration complete',
  NO_CHANGES: 'ℹ️  No changes needed',
} as const;

/**
 * Deprecation warnings
 */
export const DEPRECATION_WARNINGS = {
  LIB_COMMANDS: '\x1b[33m⚠️  WARNING: "lsh lib" commands are deprecated as of v1.0.0\x1b[0m',
} as const;
