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
  CONNECTION_TEST_SKIPPED: '⚠️  Connection test skipped. Run "lsh sync --doctor" after setup to verify.',
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
  SECTION_SECRETS: '🔐 Commands:',
  SECTION_QUICK_START: '🚀 Quick Start:',
  SECTION_MORE: '📚 More:',
  SECTION_USAGE: 'Usage:',
  SECTION_MAIN_COMMANDS: 'Main Commands:',
  SECTION_SYNC_FLAGS: 'Sync flags (setup, keys, health):',
  SECTION_EDIT_FLAGS: 'Edit flags (read/write the local .env):',
  SECTION_LIST_FLAGS: 'List flags (view the local .env):',
  SECTION_EXAMPLES: 'Examples:',
  SECTION_FEATURES: 'Features:',
  SECTION_FIRST_TIME: 'First-Time Setup:',
  SECTION_DAILY_USAGE: 'Daily Usage:',

  // Top-level commands
  CMD_SYNC: '  sync                    Setup, keys, health check, status, two-way sync (see sync --help)',
  CMD_PUSH: '  push                    Encrypt the local .env and push it to cloud storage',
  CMD_PULL: '  pull                    Pull and decrypt a .env from cloud storage',
  CMD_EDIT: '  edit                    Get, set, or list secrets in the local .env',
  CMD_LIST: '  list                    List secrets in the current local .env file',
  CMD_HELP_OPT: '  --help                  Show all options',

  // Quick start commands
  QUICK_SYNC_INIT: '  lsh sync --init                   # One-time setup: installs IPFS, generates a key',
  QUICK_PUSH: '  lsh push                          # Push secrets to the cloud',
  QUICK_PULL: '  lsh pull                          # Pull secrets on another machine',

  // Documentation link
  DOCS_LINK: '📖 Documentation: https://github.com/gwicho38/lsh',

  // Detailed help - Usage
  USAGE_DEFAULT: '  lsh                    Show help (default)',
  USAGE_PUSH: '  lsh push               Push secrets to cloud',
  USAGE_PULL: '  lsh pull               Pull secrets from cloud',
  USAGE_SYNC: '  lsh sync               Setup, keys, health check, status, two-way sync',
  USAGE_EDIT: '  lsh edit               Edit the local .env',
  USAGE_LIST: '  lsh list               List secrets in the local .env',

  // Detailed help - Main commands
  MAIN_PUSH: '  push                   Encrypt & push .env to cloud storage',
  MAIN_PULL: '  pull                   Pull & decrypt .env from cloud storage',
  MAIN_SYNC: '  sync                   Setup, keys, health check, status (see flags below)',
  MAIN_EDIT: '  edit                   Get, set, or list secrets in the local .env',
  MAIN_LIST: '  list                   List secrets in the current local .env file',

  // Detailed help - sync flags
  SYNC_FLAG_INIT: '  --init                 Run the setup wizard (installs IPFS, generates a key)',
  SYNC_FLAG_KEY: '  --key [value]          Print the encryption key, or import one',
  SYNC_FLAG_DOCTOR: '  --doctor               Run a health check',
  SYNC_FLAG_STATUS: '  --status               Show context, tracked environment, and IPFS state',
  SYNC_FLAG_LOAD: '  --load                 Print export lines for eval "$(lsh sync --load)"',
  SYNC_FLAG_CONFIG: '  --config               Print the resolved configuration and its source path',
  SYNC_FLAG_REPAIR: '  --repair               Clear local metadata and cache to unstick registries',
  SYNC_FLAG_HISTORY: '  --history              Show immutable IPFS sync records',
  SYNC_FLAG_VERIFY: '  --verify <cid>         Check that a CID is retrievable',

  // Detailed help - edit flags
  EDIT_FLAG_GET: '  --get [key]            Print one value, or every value with --all',
  EDIT_FLAG_SET: '  --set <key>=<value>    Set a specific secret value',
  EDIT_FLAG_LIST: '  --list                 Print a masked table of keys',
  EDIT_FLAG_COPY_FROM: '  --copy-from <env>      Merge another environment\'s vars into this one',

  // Detailed help - list flags
  LIST_FLAG_KEYS_ONLY: '  --keys-only            Show only keys, not values',
  LIST_FLAG_FORMAT: '  --format <type>        Output format: env, json, yaml, toml, export',
  LIST_FLAG_NO_MASK: '  --no-mask              Show full values (default: auto based on format)',

  // Example commands
  EX_SYNC_INIT: '    lsh sync --init                         # One-time setup',
  EX_SYNC_DOCTOR: '    lsh sync --doctor                       # Verify setup',
  EX_PUSH: '    lsh push                                # Push to the cloud',
  EX_PULL: '    lsh pull                                # Pull on another machine',
  EX_EDIT_LIST: '    lsh edit --list                         # View local secrets, masked',
  EX_EDIT_GET: '    lsh edit --get API_KEY                  # Get specific secret',
  EX_EDIT_SET: '    lsh edit --set API_KEY=newvalue         # Update secret',
  EX_LIST: '    lsh list                                # View local secrets, masked',

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

/**
 * Messages for `lsh pull --cid` / `lsh pull --repo`
 */
export const PULL_MESSAGES = {
  KEY_REQUIRED: 'LSH_SECRETS_KEY is required. Run: lsh sync --init',
  DOWNLOAD_FAILED: 'Download failed.',
  CID_UNAVAILABLE_HINT: 'The CID might not be available on public gateways yet.',
  DAEMON_OFFLINE_HINT: 'Make sure the source machine is online with IPFS daemon running.',
  INVALID_ENCRYPTED_FORMAT: 'Invalid encrypted data format',
  DECRYPTION_FAILED: 'Decryption failed. Wrong encryption key!',
  WRONG_KEY_HINT: 'Make sure LSH_SECRETS_KEY matches the key used to push.',
  UNRECOGNIZED_PAYLOAD:
    'CID contents are not in a recognized format (expected pushed secrets or raw .env text). Nothing was written.',
} as const;

/**
 * Messages for `lsh edit`
 */
export const EDIT_MESSAGES = {
  DESCRIPTION: 'Edit the local .env, then optionally push the change',
  OPTION_FILE: 'Path to .env file',
  OPTION_ENV: 'Environment name (dev/staging/prod)',
  OPTION_GLOBAL: 'Use global workspace ($HOME)',
  OPTION_GET: 'Print one value, or every value with --all',
  OPTION_ALL: 'With --get, print every value',
  OPTION_SET: 'Set KEY=VALUE',
  OPTION_LIST: 'Print a masked table of keys',
  OPTION_COPY_FROM: "Merge another environment's vars into this one",
  OPTION_NO_PUSH: 'Never prompt to push after editing',
  OPTION_FORMAT: 'Output format: env, json, yaml, toml, export',

  KEY_NOT_FOUND_PREFIX: 'Key not found: ',
  NO_ENV_FILE_PREFIX: 'No .env file at ',
  SET_USAGE: '--set expects KEY=VALUE',
  CREATED_FILE_PREFIX: 'Created ',
  NO_CHANGES: 'No changes.',
  NOT_PUSHED: 'Not pushed.',
  NOT_PUSHED_HINT_PREFIX: 'Not pushed. Run: lsh push --env ',
  NOT_PUSHED_HINT_BARE: 'Not pushed. Run: lsh push',
  PUSH_PROMPT_PREFIX: 'Push to ',
  PUSH_PROMPT_BARE: 'Push',
  PUSH_PROMPT_SUFFIX: '? [Y/n] ',
  MERGED_PREFIX: 'Merged ',
  MERGED_SUFFIX: ' from ',
  FAILED_TO_EDIT: 'Failed to edit secrets:',
  UNKNOWN_FORMAT_PREFIX: 'Unknown format ',
  VALID_FORMATS_PREFIX: '. Valid: ',
  KEY_LABEL: 'key',
  KEYS_LABEL: 'keys',
  EDITED_SUFFIX: ' edited:  ',
} as const;

/**
 * Messages for `lsh list`
 */
export const LIST_MESSAGES = {
  DESCRIPTION: 'List secrets in the current local .env file',
  OPTION_FILE: 'Path to .env file',
  OPTION_GLOBAL: 'Use global workspace ($HOME)',
  OPTION_KEYS_ONLY: 'Show only keys, not values',
  OPTION_FORMAT: 'Output format: env, json, yaml, toml, export',
  OPTION_NO_MASK: 'Show full values (default: auto based on format)',

  NO_ENV_FILE_PREFIX: 'No .env file at ',
  PULL_HINT_PREFIX: 'Tip: Pull from cloud with: lsh pull --env ',
  UNKNOWN_FORMAT_PREFIX: 'Unknown format ',
  VALID_FORMATS_PREFIX: '. Valid: ',
  FAILED_TO_LIST: 'Failed to list secrets:',
} as const;

/**
 * Messages for `lsh sync`
 */
export const SYNC_MESSAGES = {
  DESCRIPTION: 'Two-way sync of secrets, plus setup, keys, and health',
  OPTION_FILE: 'Path to .env file',
  OPTION_ENV: 'Environment name (dev/staging/prod)',
  OPTION_GLOBAL: 'Use global workspace ($HOME)',
  OPTION_FORCE: 'Accept destructive actions: sync past change detection, or replace an existing key',
  OPTION_LOAD: 'Print export lines for eval "$(lsh sync --load)"',
  OPTION_STATUS: 'Show context, tracked environment, and IPFS state',
  OPTION_FORMAT: 'Output format for --status, --history, --config: table or json',
  OPTION_INIT: 'Run the setup wizard (installs IPFS, generates a key)',
  OPTION_KEY: 'Print the encryption key, or import one',
  OPTION_CONFIG: 'Print the resolved configuration and its source path',
  OPTION_DOCTOR: 'Run a health check',
  OPTION_REPAIR: 'Clear local metadata and cache to unstick registries',
  OPTION_HISTORY: 'Show immutable IPFS sync records',
  OPTION_VERIFY: 'Check that a CID is retrievable',
  FAILED_TO_SYNC: 'Failed to sync secrets:',
  FAILED_TO_CHECK_STATUS: 'Failed to check status:',
  FAILED_TO_REPAIR: 'Failed to repair:',
  FAILED_TO_GET_HISTORY: 'Failed to get history:',
  FAILED_TO_VERIFY: 'Failed to verify:',
  STATUS_HEADER_PREFIX: 'lsh sync --status - ',
  LOCAL_LABEL: '  local .env present   ',
  REMOTE_LABEL: '  remote present       ',
  REMOTE_UNKNOWN: 'unknown',
  REMOTE_UNKNOWN_HINT: '  (IPFS daemon not reachable)',
  KEY_SET_LABEL: '  encryption key set   ',
  KEY_MATCHES_LABEL: '  key matches remote   ',
  DAEMON_UNREACHABLE_HINT: '\n  Run `lsh sync --init` to install and start IPFS.',
  SUGGESTIONS_HEADER: '\nSuggestions:',
  SUGGESTION_PREFIX: '  - ',
  KEY_NOT_FOUND: 'No encryption key found. Run: lsh sync --init',
  KEY_INVALID_FORMAT: 'Invalid key format. Expected 64 hex characters (256-bit key).',
  KEY_ALREADY_CONFIGURED: 'This key is already configured.',
  KEY_REPLACE_REFUSED_1_PREFIX: 'An encryption key is already configured in ',
  KEY_REPLACE_REFUSED_1_SUFFIX: ' and is different from this one.',
  KEY_REPLACE_REFUSED_2: 'Replacing it makes secrets already pushed with the old key undecryptable.',
  KEY_REPLACE_REFUSED_3: 'If that is what you want, re-run with --force.',
  KEY_SHADOW_REFUSED_1_PREFIX: 'The active encryption key currently comes from ',
  KEY_SHADOW_REFUSED_1_SUFFIX: ', a different key than this one.',
  KEY_SHADOW_REFUSED_2:
    'Writing to this file would take priority over it, making secrets already pushed under it undecryptable.',
  KEY_SAVED_PREFIX: 'Key saved to ',
  KEY_EFFECTIVE_DIFFERS: 'Note: the active LSH_SECRETS_KEY differs from what was just written — an environment variable or another .env file takes precedence at runtime.',
  CONFIG_PATH_PREFIX: 'Config file: ',
  CONFIG_EMPTY: 'No configuration found',
  HISTORY_RECENT_HEADER: '\nRecent Sync Activity\n',
  HISTORY_RECENT_EMPTY: 'No recent sync activity found.',
  HISTORY_FILE_LABEL: 'File: ',
  HISTORY_SIZE_LABEL: 'Size: ',
  HISTORY_TIME_LABEL: 'Time: ',
  HISTORY_REPO_LABEL: 'Repo: ',
  HISTORY_ENV_LABEL: 'Env:  ',
  HISTORY_RECORDS_HEADER: '\nImmutable Sync Records\n',
  HISTORY_RECORDS_EMPTY: 'No immutable sync records found.',
  HISTORY_NO_REPO: '(no repo)',
  HISTORY_TOTAL_PREFIX: 'Total: ',
  HISTORY_TOTAL_SUFFIX: ' records',
  HISTORY_UNREADABLE_SUFFIX: ' record(s) could not be retrieved',
  REPAIR_SUCCESS: 'Local sync metadata and cache cleared.',
  VERIFY_AVAILABLE: 'CID is accessible.',
  VERIFY_UNAVAILABLE: 'CID is not accessible on the network.',
  VERIFY_CID_LABEL: 'CID: ',
  VERIFY_SOURCE_LABEL: 'Source: ',
} as const;
