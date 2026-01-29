/**
 * UI strings and console output
 *
 * All user-facing messages, prompts, and terminal output strings.
 */
/**
 * ANSI color codes for terminal output
 */
export declare const ANSI: {
    readonly RESET: "\u001B[0m";
    readonly BRIGHT: "\u001B[1m";
    readonly DIM: "\u001B[2m";
    readonly FG_BLACK: "\u001B[30m";
    readonly FG_RED: "\u001B[31m";
    readonly FG_GREEN: "\u001B[32m";
    readonly FG_YELLOW: "\u001B[33m";
    readonly FG_BLUE: "\u001B[34m";
    readonly FG_MAGENTA: "\u001B[35m";
    readonly FG_CYAN: "\u001B[36m";
    readonly FG_WHITE: "\u001B[37m";
    readonly BG_BLACK: "\u001B[40m";
    readonly BG_RED: "\u001B[41m";
    readonly BG_GREEN: "\u001B[42m";
    readonly BG_YELLOW: "\u001B[43m";
    readonly BG_BLUE: "\u001B[44m";
    readonly BG_MAGENTA: "\u001B[45m";
    readonly BG_CYAN: "\u001B[46m";
    readonly BG_WHITE: "\u001B[47m";
};
export declare const UI_MESSAGES: {
    readonly DID_YOU_MEAN: "\nDid you mean one of these?";
    readonly RUN_HELP_MESSAGE: "\nRun 'lsh --help' to see available commands.";
    readonly CONFIG_EXISTS: "Configuration file already exists: ${rcFile}";
    readonly CONFIG_CREATED: "✅ Created configuration file: ${rcFile}";
    readonly CONFIG_CREATE_FAILED: "❌ Failed to create configuration: ${message}";
    readonly CONFIG_NOT_FOUND: "❌ Configuration file not found: ${rcFile}";
    readonly CONFIG_INIT_HINT: "Run \"lsh config --init\" to create one.";
    readonly CONFIG_FILE_DISPLAY: "📄 Configuration file: ${rcFile}";
    readonly CONFIG_NOT_FOUND_VALIDATE: "❌ Configuration file not found: ${rcFile}";
    readonly CONFIG_VALID: "✅ Configuration file is valid: ${rcFile}";
    readonly CONFIG_HAS_ERRORS: "❌ Configuration file has errors: ${rcFile}";
    readonly FAILED_PUSH_SECRETS: "❌ Failed to push secrets:";
    readonly FAILED_PULL_SECRETS: "❌ Failed to pull secrets:";
    readonly FILE_NOT_FOUND: "❌ File not found: ${envPath}";
    readonly TIP_PULL_FROM_CLOUD: "💡 Tip: Pull from cloud with: lsh pull --env <environment>";
    readonly SECRETS_IN_FILE: "\n📋 Secrets in ${file}:\n";
    readonly TOTAL_SECRETS: "\n  Total: ${count} secrets\n";
    readonly FAILED_LIST_SECRETS: "❌ Failed to list secrets:";
    readonly CURRENT_VERSION: "Current version:";
    readonly CHECKING_UPDATES: "Checking npm for updates...";
    readonly FAILED_FETCH_VERSION: "✗ Failed to fetch version information from npm";
    readonly CHECK_INTERNET: "⚠ Make sure you have internet connectivity";
    readonly LATEST_VERSION: "Latest version:";
    readonly ALREADY_LATEST: "✓ You're already on the latest version!";
    readonly VERSION_NEWER: "✓ Your version (${currentVersion}) is newer than npm";
    readonly DEV_VERSION_HINT: "You may be using a development version";
    readonly UPDATE_AVAILABLE: "⬆ Update available: ${currentVersion} → ${latestVersion}";
    readonly RUN_UPDATE_HINT: "ℹ Run 'lsh self update' to install the update";
};
export declare const LOG_MESSAGES: {
    readonly VALIDATING_ENV: "Validating environment configuration";
    readonly ENV_VALIDATION_FAILED: "Environment validation failed in production";
    readonly DAEMON_STARTING: "Starting LSH Job Daemon";
    readonly DAEMON_STARTED: "Daemon started with PID ${pid}";
    readonly DAEMON_STOPPING: "Stopping LSH Job Daemon";
    readonly DAEMON_STOPPED: "Daemon stopped";
    readonly API_SERVER_STARTED: "API Server started on port ${port}";
    readonly API_SERVER_STOPPED: "API Server stopped";
    readonly ADDING_JOB: "Adding job: ${name}";
    readonly STARTING_JOB: "Starting job: ${jobId}";
    readonly TRIGGERING_JOB: "Triggering job: ${jobId}";
    readonly SCHEDULER_STARTING: "📅 Starting job scheduler...";
    readonly SCHEDULER_STARTED: "✅ Job scheduler started successfully";
    readonly WARN_NO_SECRETS_KEY: "⚠️  Warning: No LSH_SECRETS_KEY set. Using machine-derived key.";
    readonly WARN_GENERATE_KEY_MESSAGE: "To share secrets across machines, generate a key with: lsh secrets key";
    readonly PUSHING_SECRETS: "Pushing ${envFilePath} to Supabase (${environment})...";
    readonly SECRETS_PUSHED: "✅ Pushed ${count} secrets from ${filename} to Supabase";
    readonly PULLING_SECRETS: "Pulling ${filename} (${environment}) from Supabase...";
    readonly BACKUP_CREATED: "Backed up existing .env to ${backup}";
    readonly SECRETS_PULLED: "✅ Pulled ${count} secrets from Supabase";
};
export declare const LOG_LEVELS: {
    readonly INFO: "INFO";
    readonly WARN: "WARN";
    readonly ERROR: "ERROR";
    readonly DEBUG: "DEBUG";
};
/**
 * Emoji prefixes for consistent UI output
 */
export declare const EMOJI: {
    readonly SUCCESS: "✅";
    readonly ERROR: "❌";
    readonly WARNING: "⚠️";
    readonly INFO: "ℹ️";
    readonly TIP: "💡";
    readonly KEY: "🔑";
    readonly FILE: "📄";
    readonly FOLDER: "📁";
    readonly LIST: "📋";
    readonly SEARCH: "🔍";
    readonly LOCATION: "📍";
    readonly UP: "⬆️";
    readonly DOWN: "⬇️";
    readonly CALENDAR: "📅";
    readonly GEAR: "⚙️";
};
/**
 * Status messages with emoji
 */
export declare const STATUS_MESSAGES: {
    readonly SUCCESS: "✅";
    readonly SUCCESS_GENERIC: "✅ Success";
    readonly CONNECTION_SUCCESS: "✅ Connection successful!";
    readonly CONFIG_SAVED: "✅ Configuration saved";
    readonly SECRETS_PULLED: "✅ Secrets pulled successfully!";
    readonly IPFS_INSTALLED: "✅ IPFS client installed";
    readonly ERROR: "❌";
    readonly ERROR_GENERIC: "❌ Error";
    readonly CONNECTION_FAILED: "❌ Connection failed";
    readonly CONFIG_SAVE_FAILED: "❌ Failed to save configuration";
    readonly PULL_FAILED: "❌ Failed to pull secrets";
    readonly WARNING: "⚠️";
    readonly WARNING_GENERIC: "⚠️ Warning";
    readonly IPFS_NOT_INSTALLED: "⚠️  IPFS client not installed";
    readonly NOT_GIT_REPO: "ℹ️  Not in a git repository";
    readonly INFO: "ℹ️";
    readonly RECOMMENDATIONS: "💡 Recommendations:";
    readonly CURRENT_REPO: "📁 Current Repository:";
};
/**
 * Doctor/diagnostic messages
 */
export declare const DOCTOR_MESSAGES: {
    readonly CHECKING: "🔍 Checking:";
    readonly ALL_PASSED: "✅ All checks passed!";
    readonly ISSUES_FOUND: "❌ Issues found";
    readonly RECOMMENDATIONS: "💡 Recommendations:";
};
/**
 * Init/setup messages
 */
export declare const INIT_MESSAGES: {
    readonly WELCOME: "🚀 Welcome to LSH Setup";
    readonly STEP_COMPLETE: "✅ Step complete";
    readonly SETUP_COMPLETE: "✅ Setup complete!";
    readonly CONNECTION_TEST_SKIPPED: "⚠️  Connection test skipped. Run \"lsh doctor\" after setup to verify.";
};
/**
 * Migration messages
 */
export declare const MIGRATION_MESSAGES: {
    readonly SCANNING: "🔍 Scanning for Firebase references...";
    readonly MIGRATING: "🔄 Migrating...";
    readonly COMPLETE: "✅ Migration complete";
    readonly NO_CHANGES: "ℹ️  No changes needed";
};
/**
 * Deprecation warnings
 */
export declare const DEPRECATION_WARNINGS: {
    readonly LIB_COMMANDS: "\u001B[33m⚠️  WARNING: \"lsh lib\" commands are deprecated as of v1.0.0\u001B[0m";
};
/**
 * CLI help text and command descriptions
 */
export declare const CLI_TEXT: {
    readonly NAME: "lsh";
    readonly DESCRIPTION: "LSH - Simple, cross-platform encrypted secrets manager";
    readonly HELP_AFTER_ERROR: "(add --help for additional information)";
    readonly OPTION_VERBOSE: "-v, --verbose";
    readonly OPTION_VERBOSE_DESC: "Verbose output";
    readonly OPTION_DEBUG: "-d, --debug";
    readonly OPTION_DEBUG_DESC: "Debug mode";
    readonly HELP_DESCRIPTION: "Show detailed help";
    readonly ERROR_UNKNOWN_COMMAND: "error: unknown command";
    readonly DID_YOU_MEAN: "\nDid you mean one of these?";
    readonly RUN_HELP: "\nRun 'lsh --help' to see available commands.";
    readonly EVENT_UNKNOWN_COMMAND: "command:*";
};
/**
 * Main help screen content
 */
export declare const CLI_HELP: {
    readonly TITLE: "LSH - Encrypted Secrets Manager";
    readonly SEPARATOR: "================================";
    readonly SECTION_SECRETS: "🔐 Secrets Management Commands:";
    readonly SECTION_IPFS: "🔄 IPFS Sync:";
    readonly SECTION_QUICK_START: "🚀 Quick Start:";
    readonly SECTION_MORE: "📚 More Commands:";
    readonly SECTION_USAGE: "Usage:";
    readonly SECTION_MAIN_COMMANDS: "Main Commands:";
    readonly SECTION_SELF_MANAGEMENT: "Self-Management:";
    readonly SECTION_EXAMPLES: "Examples:";
    readonly SECTION_FEATURES: "Features:";
    readonly SECTION_FIRST_TIME: "First-Time Setup:";
    readonly SECTION_DAILY_USAGE: "Daily Usage:";
    readonly CMD_INIT: "  init                    Interactive setup wizard (first-time setup)";
    readonly CMD_DOCTOR: "  doctor                  Check configuration and connectivity";
    readonly CMD_SYNC: "  sync                    Check sync status & get recommendations";
    readonly CMD_PUSH: "  push                    Upload .env to encrypted cloud storage";
    readonly CMD_PULL: "  pull                    Download .env from cloud storage";
    readonly CMD_LIST: "  list                    List secrets in current local .env file";
    readonly CMD_ENV: "  env [name]              List/view cloud environments";
    readonly CMD_KEY: "  key                     Generate encryption key";
    readonly CMD_CREATE: "  create                  Create new .env file";
    readonly CMD_GET: "  get <key>               Get a specific secret value (--all for all)";
    readonly CMD_SET: "  set <key> <value>       Set a specific secret value";
    readonly CMD_DELETE: "  delete                  Delete .env file";
    readonly CMD_STATUS: "  status                  Get detailed secrets status";
    readonly CMD_SYNC_INIT: "  sync init               Full IPFS setup (install, init, start)";
    readonly CMD_SYNC_PUSH: "  sync push               Push secrets to IPFS → get CID";
    readonly CMD_SYNC_PULL: "  sync pull <cid>         Pull secrets by CID";
    readonly CMD_SYNC_STATUS: "  sync status             Check IPFS and sync status";
    readonly CMD_SYNC_START_STOP: "  sync start/stop         Control IPFS daemon";
    readonly QUICK_SYNC_INIT: "  lsh sync init                     # One-time IPFS setup";
    readonly QUICK_SYNC_PUSH: "  lsh sync push                     # Push secrets to IPFS";
    readonly QUICK_SYNC_PULL: "  lsh sync pull <cid>               # Pull on another machine";
    readonly CMD_CONFIG: "  config                  Manage LSH configuration (~/.config/lsh/lshrc)";
    readonly CMD_SELF: "  self                    Self-management commands";
    readonly CMD_HELP_OPT: "  --help                  Show all options";
    readonly DOCS_LINK: "📖 Documentation: https://github.com/gwicho38/lsh";
    readonly USAGE_DEFAULT: "  lsh                    Show help (default)";
    readonly USAGE_INIT: "  lsh init               Interactive setup wizard";
    readonly USAGE_PUSH: "  lsh push               Push secrets to cloud";
    readonly USAGE_PULL: "  lsh pull               Pull secrets from cloud";
    readonly MAIN_INIT: "  init                   Interactive setup wizard (first-time)";
    readonly MAIN_DOCTOR: "  doctor                 Health check & troubleshooting";
    readonly MAIN_ENV: "  env                    Show local .env file contents";
    readonly MAIN_KEY: "  key                    Generate encryption key";
    readonly MAIN_STATUS: "  status                 Detailed status report";
    readonly DETAIL_SYNC_INIT: "  sync init              Full IPFS setup (install, init, start)";
    readonly DETAIL_SYNC_PUSH: "  sync push              Push secrets to IPFS → get CID";
    readonly DETAIL_SYNC_PULL: "  sync pull <cid>        Pull secrets by CID";
    readonly DETAIL_SYNC_STATUS: "  sync status            Check IPFS client, daemon, and sync status";
    readonly DETAIL_SYNC_START: "  sync start             Start IPFS daemon";
    readonly DETAIL_SYNC_STOP: "  sync stop              Stop IPFS daemon";
    readonly DETAIL_SYNC_HISTORY: "  sync history           View sync history";
    readonly SELF_UPDATE: "  self update            Update to latest version";
    readonly SELF_VERSION: "  self version           Show version information";
    readonly SELF_UNINSTALL: "  self uninstall         Uninstall from system";
    readonly EX_SYNC_INIT: "    lsh sync init                           # One-time IPFS setup";
    readonly EX_DOCTOR: "    lsh doctor                              # Verify setup";
    readonly EX_SYNC_PUSH: "    lsh sync push                           # Push to IPFS → get CID";
    readonly EX_SYNC_PULL: "    lsh sync pull <cid>                     # Pull by CID";
    readonly EX_ENV_MASKED: "    lsh env --masked                        # View local secrets";
    readonly EX_GET: "    lsh get API_KEY                         # Get specific secret";
    readonly EX_SET: "    lsh set API_KEY newvalue                # Update secret";
    readonly FEATURE_CROSS_PLATFORM: "  ✅ Cross-platform (Windows, macOS, Linux)";
    readonly FEATURE_ENCRYPTION: "  ✅ AES-256 encryption";
    readonly FEATURE_MULTI_ENV: "  ✅ Multi-environment support";
    readonly FEATURE_TEAM: "  ✅ Team collaboration";
    readonly FEATURE_ROTATION: "  ✅ Automatic secret rotation";
    readonly FEATURE_GIT_AWARE: "  ✅ Git-aware namespacing";
    readonly NEED_HELP: "Need help? Visit https://github.com/gwicho38/lsh";
};
