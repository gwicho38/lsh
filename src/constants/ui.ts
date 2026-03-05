/**
 * UI strings and console output
 *
 * All user-facing messages, prompts, and terminal output strings.
 */

/**
 * ANSI color codes for terminal output
 */
export const ANSI = {
  // Reset
  RESET: '\x1b[0m',

  // Text styles
  BRIGHT: '\x1b[1m',
  DIM: '\x1b[2m',

  // Foreground colors
  FG_BLACK: '\x1b[30m',
  FG_RED: '\x1b[31m',
  FG_GREEN: '\x1b[32m',
  FG_YELLOW: '\x1b[33m',
  FG_BLUE: '\x1b[34m',
  FG_MAGENTA: '\x1b[35m',
  FG_CYAN: '\x1b[36m',
  FG_WHITE: '\x1b[37m',

  // Background colors
  BG_BLACK: '\x1b[40m',
  BG_RED: '\x1b[41m',
  BG_GREEN: '\x1b[42m',
  BG_YELLOW: '\x1b[43m',
  BG_BLUE: '\x1b[44m',
  BG_MAGENTA: '\x1b[45m',
  BG_CYAN: '\x1b[46m',
  BG_WHITE: '\x1b[47m',
} as const;

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
  LIB_COMMANDS: `${ANSI.FG_YELLOW}⚠️  WARNING: "lsh lib" commands are deprecated as of v1.0.0${ANSI.RESET}`,
} as const;

/**
 * CLI help text and command descriptions
 */
export const CLI_TEXT = {
  // Program metadata
  NAME: 'lsh',
  DESCRIPTION: 'LSH - Simple, cross-platform encrypted secrets manager',
  HELP_AFTER_ERROR: '(add --help for additional information)',

  // Option descriptions
  OPTION_VERBOSE: '-v, --verbose',
  OPTION_VERBOSE_DESC: 'Verbose output',
  OPTION_DEBUG: '-d, --debug',
  OPTION_DEBUG_DESC: 'Debug mode',

  // Help command
  HELP_DESCRIPTION: 'Show detailed help',

  // Error messages
  ERROR_UNKNOWN_COMMAND: 'error: unknown command',
  DID_YOU_MEAN: '\nDid you mean one of these?',
  RUN_HELP: "\nRun 'lsh --help' to see available commands.",

  // Commander event names
  EVENT_UNKNOWN_COMMAND: 'command:*',
} as const;

/**
 * Main help screen content
 */
export const CLI_HELP = {
  TITLE: 'LSH - Encrypted Secrets Manager',
  SEPARATOR: '================================',

  // Section headers
  SECTION_SECRETS: '🔐 Secrets Management Commands:',
  SECTION_IPFS: '🔄 IPFS Sync:',
  SECTION_QUICK_START: '🚀 Quick Start:',
  SECTION_MORE: '📚 More Commands:',
  SECTION_USAGE: 'Usage:',
  SECTION_MAIN_COMMANDS: 'Main Commands:',
  SECTION_SELF_MANAGEMENT: 'Self-Management:',
  SECTION_EXAMPLES: 'Examples:',
  SECTION_FEATURES: 'Features:',
  SECTION_FIRST_TIME: 'First-Time Setup:',
  SECTION_DAILY_USAGE: 'Daily Usage:',

  // Secrets commands
  CMD_INIT: '  init                    Interactive setup wizard (first-time setup)',
  CMD_DOCTOR: '  doctor                  Check configuration and connectivity',
  CMD_SYNC: '  sync                    Check sync status & get recommendations',
  CMD_PUSH: '  push                    Upload .env to encrypted cloud storage',
  CMD_PULL: '  pull                    Download .env from cloud storage',
  CMD_LIST: '  list                    List secrets in current local .env file',
  CMD_ENV: '  env [name]              List/view cloud environments',
  CMD_KEY: '  key                     Generate encryption key',
  CMD_CREATE: '  create                  Create new .env file',
  CMD_GET: '  get <key>               Get a specific secret value (--all for all)',
  CMD_SET: '  set <key> <value>       Set a specific secret value',
  CMD_DELETE: '  delete                  Delete .env file',
  CMD_CP: '  cp <from> <to>          Copy env variables between files (--name to copy one variable)',
  CMD_STATUS: '  status                  Get detailed secrets status',

  // IPFS commands
  CMD_SYNC_INIT: '  sync init               Full IPFS setup (install, init, start)',
  CMD_SYNC_PUSH: '  sync push               Push secrets to IPFS → get CID',
  CMD_SYNC_PULL: '  sync pull <cid>         Pull secrets by CID',
  CMD_SYNC_STATUS: '  sync status             Check IPFS and sync status',
  CMD_SYNC_START_STOP: '  sync start/stop         Control IPFS daemon',

  // Quick start commands
  QUICK_SYNC_INIT: '  lsh sync init                     # One-time IPFS setup',
  QUICK_SYNC_PUSH: '  lsh sync push                     # Push secrets to IPFS',
  QUICK_SYNC_PULL: '  lsh sync pull <cid>               # Pull on another machine',

  // More commands
  CMD_CONFIG: '  config                  Manage LSH configuration (~/.config/lsh/lshrc)',
  CMD_SELF: '  self                    Self-management commands',
  CMD_HELP_OPT: '  --help                  Show all options',

  // Documentation link
  DOCS_LINK: '📖 Documentation: https://github.com/gwicho38/lsh',

  // Detailed help - Usage
  USAGE_DEFAULT: '  lsh                    Show help (default)',
  USAGE_INIT: '  lsh init               Interactive setup wizard',
  USAGE_PUSH: '  lsh push               Push secrets to cloud',
  USAGE_PULL: '  lsh pull               Pull secrets from cloud',

  // Detailed help - Main commands
  MAIN_INIT: '  init                   Interactive setup wizard (first-time)',
  MAIN_DOCTOR: '  doctor                 Health check & troubleshooting',
  MAIN_ENV: '  env                    Show local .env file contents',
  MAIN_KEY: '  key                    Generate encryption key',
  MAIN_STATUS: '  status                 Detailed status report',

  // Detailed help - IPFS Sync
  DETAIL_SYNC_INIT: '  sync init              Full IPFS setup (install, init, start)',
  DETAIL_SYNC_PUSH: '  sync push              Push secrets to IPFS → get CID',
  DETAIL_SYNC_PULL: '  sync pull <cid>        Pull secrets by CID',
  DETAIL_SYNC_STATUS: '  sync status            Check IPFS client, daemon, and sync status',
  DETAIL_SYNC_START: '  sync start             Start IPFS daemon',
  DETAIL_SYNC_STOP: '  sync stop              Stop IPFS daemon',
  DETAIL_SYNC_HISTORY: '  sync history           View sync history',

  // Detailed help - Self management
  SELF_UPDATE: '  self update            Update to latest version',
  SELF_VERSION: '  self version           Show version information',
  SELF_UNINSTALL: '  self uninstall         Uninstall from system',

  // Example commands
  EX_SYNC_INIT: '    lsh sync init                           # One-time IPFS setup',
  EX_DOCTOR: '    lsh doctor                              # Verify setup',
  EX_SYNC_PUSH: '    lsh sync push                           # Push to IPFS → get CID',
  EX_SYNC_PULL: '    lsh sync pull <cid>                     # Pull by CID',
  EX_ENV_MASKED: '    lsh env --masked                        # View local secrets',
  EX_GET: '    lsh get API_KEY                         # Get specific secret',
  EX_SET: '    lsh set API_KEY newvalue                # Update secret',

  // Features
  FEATURE_CROSS_PLATFORM: '  ✅ Cross-platform (Windows, macOS, Linux)',
  FEATURE_ENCRYPTION: '  ✅ AES-256 encryption',
  FEATURE_MULTI_ENV: '  ✅ Multi-environment support',
  FEATURE_TEAM: '  ✅ Team collaboration',
  FEATURE_ROTATION: '  ✅ Automatic secret rotation',
  FEATURE_GIT_AWARE: '  ✅ Git-aware namespacing',

  // Footer
  NEED_HELP: 'Need help? Visit https://github.com/gwicho38/lsh',
} as const;
