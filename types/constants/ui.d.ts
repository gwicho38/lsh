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
    readonly CONNECTION_TEST_SKIPPED: "⚠️  Connection test skipped. Run \"lsh sync --doctor\" after setup to verify.";
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
    readonly SECTION_SECRETS: "🔐 Commands:";
    readonly SECTION_QUICK_START: "🚀 Quick Start:";
    readonly SECTION_MORE: "📚 More:";
    readonly SECTION_USAGE: "Usage:";
    readonly SECTION_MAIN_COMMANDS: "Main Commands:";
    readonly SECTION_SYNC_FLAGS: "Sync flags (setup, keys, health):";
    readonly SECTION_EDIT_FLAGS: "Edit flags (read/write the local .env):";
    readonly SECTION_LIST_FLAGS: "List flags (view the local .env):";
    readonly SECTION_GET_FLAGS: "Get flags (read one value):";
    readonly SECTION_SET_FLAGS: "Set flags (write one value):";
    readonly SECTION_EXAMPLES: "Examples:";
    readonly SECTION_FEATURES: "Features:";
    readonly SECTION_FIRST_TIME: "First-Time Setup:";
    readonly SECTION_DAILY_USAGE: "Daily Usage:";
    readonly CMD_SYNC: "  sync                    Setup, keys, health check, status, two-way sync (see sync --help)";
    readonly CMD_PUSH: "  push                    Encrypt the local .env and push it to cloud storage";
    readonly CMD_PULL: "  pull                    Pull and decrypt a .env from cloud storage";
    readonly CMD_EDIT: "  edit                    Get, set, or list secrets in the local .env";
    readonly CMD_LIST: "  list                    List secrets in the current local .env file";
    readonly CMD_GET: "  get                     Print one secret value from the local .env file";
    readonly CMD_SET: "  set                     Set a secret in the local .env file";
    readonly CMD_HELP_OPT: "  --help                  Show all options";
    readonly QUICK_SYNC_INIT: "  lsh sync --init                   # One-time setup: installs IPFS, generates a key";
    readonly QUICK_PUSH: "  lsh push                          # Push secrets to the cloud";
    readonly QUICK_PULL: "  lsh pull                          # Pull secrets on another machine";
    readonly DOCS_LINK: "📖 Documentation: https://github.com/gwicho38/lsh";
    readonly USAGE_DEFAULT: "  lsh                    Show help (default)";
    readonly USAGE_PUSH: "  lsh push               Push secrets to cloud";
    readonly USAGE_PULL: "  lsh pull               Pull secrets from cloud";
    readonly USAGE_SYNC: "  lsh sync               Setup, keys, health check, status, two-way sync";
    readonly USAGE_EDIT: "  lsh edit               Edit the local .env";
    readonly USAGE_LIST: "  lsh list               List secrets in the local .env";
    readonly USAGE_GET: "  lsh get <key>          Print one secret value";
    readonly USAGE_SET: "  lsh set <key> <value>  Set one secret value";
    readonly MAIN_PUSH: "  push                   Encrypt & push .env to cloud storage";
    readonly MAIN_PULL: "  pull                   Pull & decrypt .env from cloud storage";
    readonly MAIN_SYNC: "  sync                   Setup, keys, health check, status (see flags below)";
    readonly MAIN_EDIT: "  edit                   Get, set, or list secrets in the local .env";
    readonly MAIN_LIST: "  list                   List secrets in the current local .env file";
    readonly MAIN_GET: "  get                    Print one secret value from the local .env file";
    readonly MAIN_SET: "  set                    Set a secret in the local .env file";
    readonly SYNC_FLAG_INIT: "  --init                 Run the setup wizard (installs IPFS, generates a key)";
    readonly SYNC_FLAG_KEY: "  --key [value]          Print the encryption key, or import one";
    readonly SYNC_FLAG_DOCTOR: "  --doctor               Run a health check";
    readonly SYNC_FLAG_STATUS: "  --status               Show context, tracked environment, and IPFS state";
    readonly SYNC_FLAG_LOAD: "  --load                 Print export lines for eval \"$(lsh sync --load)\"";
    readonly SYNC_FLAG_CONFIG: "  --config               Print the resolved configuration and its source path";
    readonly SYNC_FLAG_REPAIR: "  --repair               Clear local metadata and cache to unstick registries";
    readonly SYNC_FLAG_HISTORY: "  --history              Show immutable IPFS sync records";
    readonly SYNC_FLAG_VERIFY: "  --verify <cid>         Check that a CID is retrievable";
    readonly EDIT_FLAG_GET: "  --get [key]            Print one value, or every value with --all";
    readonly EDIT_FLAG_SET: "  --set <key>=<value>    Set a specific secret value";
    readonly EDIT_FLAG_LIST: "  --list                 Print a masked table of keys";
    readonly EDIT_FLAG_COPY_FROM: "  --copy-from <env>      Merge another environment's vars into this one";
    readonly LIST_FLAG_KEYS_ONLY: "  --keys-only            Show only keys, not values";
    readonly LIST_FLAG_FORMAT: "  --format <type>        Output format: env, json, yaml, toml, export";
    readonly LIST_FLAG_NO_MASK: "  --no-mask              Show full values (default: auto based on format)";
    readonly GET_FLAG_ALL: "  --all                  Print every secret in the file";
    readonly GET_FLAG_FORMAT: "  --format <type>        Output format for --all: env, json, yaml, toml, export";
    readonly GET_FLAG_EXACT: "  --exact                Require an exact key match (disable fuzzy matching)";
    readonly SET_FLAG_STDIN: "  --stdin                Read KEY=VALUE pairs from stdin, one per line";
    readonly EX_SYNC_INIT: "    lsh sync --init                         # One-time setup";
    readonly EX_SYNC_DOCTOR: "    lsh sync --doctor                       # Verify setup";
    readonly EX_PUSH: "    lsh push                                # Push to the cloud";
    readonly EX_PULL: "    lsh pull                                # Pull on another machine";
    readonly EX_EDIT_LIST: "    lsh edit --list                         # View local secrets, masked";
    readonly EX_EDIT_GET: "    lsh edit --get API_KEY                  # Get specific secret";
    readonly EX_EDIT_SET: "    lsh edit --set API_KEY=newvalue         # Update secret";
    readonly EX_LIST: "    lsh list                                # View local secrets, masked";
    readonly EX_GET: "    lsh get API_KEY                         # Print one value";
    readonly EX_SET: "    lsh set API_KEY newvalue                # Set one value";
    readonly FEATURE_CROSS_PLATFORM: "  ✅ Cross-platform (Windows, macOS, Linux)";
    readonly FEATURE_ENCRYPTION: "  ✅ AES-256 encryption";
    readonly FEATURE_MULTI_ENV: "  ✅ Multi-environment support";
    readonly FEATURE_TEAM: "  ✅ Team collaboration";
    readonly FEATURE_ROTATION: "  ✅ Automatic secret rotation";
    readonly FEATURE_GIT_AWARE: "  ✅ Git-aware namespacing";
    readonly NEED_HELP: "Need help? Visit https://github.com/gwicho38/lsh";
};
/**
 * Messages for `lsh pull --cid` / `lsh pull --repo`
 */
export declare const PULL_MESSAGES: {
    readonly KEY_REQUIRED: "LSH_SECRETS_KEY is required. Run: lsh sync --init";
    readonly DOWNLOAD_FAILED: "Download failed.";
    readonly CID_UNAVAILABLE_HINT: "The CID might not be available on public gateways yet.";
    readonly DAEMON_OFFLINE_HINT: "Make sure the source machine is online with IPFS daemon running.";
    readonly INVALID_ENCRYPTED_FORMAT: "Invalid encrypted data format";
    readonly DECRYPTION_FAILED: "Decryption failed. Wrong encryption key!";
    readonly WRONG_KEY_HINT: "Make sure LSH_SECRETS_KEY matches the key used to push.";
    readonly UNRECOGNIZED_PAYLOAD: "CID contents are not in a recognized format (expected pushed secrets or raw .env text). Nothing was written.";
};
/**
 * Messages for `lsh edit`
 */
export declare const EDIT_MESSAGES: {
    readonly DESCRIPTION: "Edit the local .env, then optionally push the change";
    readonly OPTION_FILE: "Path to .env file";
    readonly OPTION_ENV: "Environment name (dev/staging/prod)";
    readonly OPTION_GLOBAL: "Use global workspace ($HOME)";
    readonly OPTION_GET: "Print one value, or every value with --all";
    readonly OPTION_ALL: "With --get, print every value";
    readonly OPTION_SET: "Set KEY=VALUE";
    readonly OPTION_LIST: "Print a masked table of keys";
    readonly OPTION_COPY_FROM: "Merge another environment's vars into this one";
    readonly OPTION_NO_PUSH: "Never prompt to push after editing";
    readonly OPTION_FORMAT: "Output format: env, json, yaml, toml, export";
    readonly KEY_NOT_FOUND_PREFIX: "Key not found: ";
    readonly NO_ENV_FILE_PREFIX: "No .env file at ";
    readonly SET_USAGE: "--set expects KEY=VALUE";
    readonly CREATED_FILE_PREFIX: "Created ";
    readonly NO_CHANGES: "No changes.";
    readonly NOT_PUSHED: "Not pushed.";
    readonly NOT_PUSHED_HINT_PREFIX: "Not pushed. Run: lsh push --env ";
    readonly NOT_PUSHED_HINT_BARE: "Not pushed. Run: lsh push";
    readonly PUSH_PROMPT_PREFIX: "Push to ";
    readonly PUSH_PROMPT_BARE: "Push";
    readonly PUSH_PROMPT_SUFFIX: "? [Y/n] ";
    readonly MERGED_PREFIX: "Merged ";
    readonly MERGED_SUFFIX: " from ";
    readonly FAILED_TO_EDIT: "Failed to edit secrets:";
    readonly UNKNOWN_FORMAT_PREFIX: "Unknown format ";
    readonly VALID_FORMATS_PREFIX: ". Valid: ";
    readonly KEY_LABEL: "key";
    readonly KEYS_LABEL: "keys";
    readonly EDITED_SUFFIX: " edited:  ";
};
/**
 * Messages for `lsh list`
 */
export declare const LIST_MESSAGES: {
    readonly DESCRIPTION: "List secrets in the current local .env file";
    readonly OPTION_FILE: "Path to .env file";
    readonly OPTION_GLOBAL: "Use global workspace ($HOME)";
    readonly OPTION_KEYS_ONLY: "Show only keys, not values";
    readonly OPTION_FORMAT: "Output format: env, json, yaml, toml, export";
    readonly OPTION_NO_MASK: "Show full values (default: auto based on format)";
    readonly NO_ENV_FILE_PREFIX: "No .env file at ";
    readonly PULL_HINT_PREFIX: "Tip: Pull from cloud with: lsh pull --env ";
    readonly UNKNOWN_FORMAT_PREFIX: "Unknown format ";
    readonly VALID_FORMATS_PREFIX: ". Valid: ";
    readonly FAILED_TO_LIST: "Failed to list secrets:";
};
/**
 * Messages for `lsh get`
 */
export declare const GET_MESSAGES: {
    readonly DESCRIPTION: "Print one secret value from the local .env file, or every value with --all";
    readonly OPTION_FILE: "Path to .env file";
    readonly OPTION_GLOBAL: "Use global workspace ($HOME)";
    readonly OPTION_ALL: "Print every secret in the file";
    readonly OPTION_EXPORT: "Shorthand for --format export";
    readonly OPTION_FORMAT: "Output format for --all: env, json, yaml, toml, export";
    readonly OPTION_EXACT: "Require an exact key match (disable fuzzy matching)";
    readonly OPTION_NO_MASK: "Show full values in the ambiguous-match list";
    readonly NO_ENV_FILE_PREFIX: "No .env file at ";
    readonly PULL_HINT_PREFIX: "Tip: Pull from cloud with: lsh pull --env ";
    readonly UNKNOWN_FORMAT_PREFIX: "Unknown format ";
    readonly VALID_FORMATS_PREFIX: ". Valid: ";
    readonly KEY_REQUIRED: "Usage: lsh get <key>   (or: lsh get --all)";
    readonly KEY_NOT_FOUND_PREFIX: "Key not found: ";
    readonly EXACT_HINT: "Tip: drop --exact to search by fuzzy match";
    readonly AMBIGUOUS_PREFIX: "Ambiguous key ";
    readonly AMBIGUOUS_SUFFIX: " matches:";
    readonly AMBIGUOUS_HINT: "Name one of them exactly, or re-run with --exact";
    readonly FAILED_TO_GET: "Failed to get secret:";
};
/**
 * Messages for `lsh set`
 */
export declare const SET_MESSAGES: {
    readonly DESCRIPTION: "Set a secret in the local .env file, or batch upsert KEY=VALUE lines from stdin";
    readonly OPTION_FILE: "Path to .env file";
    readonly OPTION_GLOBAL: "Use global workspace ($HOME)";
    readonly OPTION_STDIN: "Read KEY=VALUE pairs from stdin, one per line";
    readonly USAGE: "Usage: lsh set <key> <value>";
    readonly USAGE_STDIN: "   or: printenv | lsh set          (batch upsert from stdin)";
    readonly STDIN_IS_TTY: "No input on stdin. Pipe KEY=VALUE lines, or pass <key> <value>.";
    readonly NO_ASSIGNMENTS: "No valid KEY=VALUE pairs on stdin";
    readonly INVALID_KEY_PREFIX: "Invalid key ";
    readonly INVALID_KEY_SUFFIX: " — must be a valid environment variable name";
    readonly INVALID_LINE_PREFIX: "Skipped unparseable line: ";
    readonly SET_PREFIX: "Set ";
    readonly SET_COUNT_SUFFIX: " in ";
    readonly PUSH_HINT: "Not pushed. Run: lsh push";
    readonly FAILED_TO_SET: "Failed to set secret:";
};
/**
 * Messages for `lsh sync`
 */
export declare const SYNC_MESSAGES: {
    readonly DESCRIPTION: "Two-way sync of secrets, plus setup, keys, and health";
    readonly OPTION_FILE: "Path to .env file";
    readonly OPTION_ENV: "Environment name (dev/staging/prod)";
    readonly OPTION_GLOBAL: "Use global workspace ($HOME)";
    readonly OPTION_FORCE: "Accept destructive actions: sync past change detection, or replace an existing key";
    readonly OPTION_LOAD: "Print export lines for eval \"$(lsh sync --load)\"";
    readonly OPTION_STATUS: "Show context, tracked environment, and IPFS state";
    readonly OPTION_FORMAT: "Output format for --status, --history, --config: table or json";
    readonly OPTION_INIT: "Run the setup wizard (installs IPFS, generates a key)";
    readonly OPTION_KEY: "Print the encryption key, or import one";
    readonly OPTION_CONFIG: "Print the resolved configuration and its source path";
    readonly OPTION_DOCTOR: "Run a health check";
    readonly OPTION_REPAIR: "Clear local metadata and cache to unstick registries";
    readonly OPTION_HISTORY: "Show immutable IPFS sync records";
    readonly OPTION_VERIFY: "Check that a CID is retrievable";
    readonly FAILED_TO_SYNC: "Failed to sync secrets:";
    readonly FAILED_TO_CHECK_STATUS: "Failed to check status:";
    readonly FAILED_TO_REPAIR: "Failed to repair:";
    readonly FAILED_TO_GET_HISTORY: "Failed to get history:";
    readonly FAILED_TO_VERIFY: "Failed to verify:";
    readonly STATUS_HEADER_PREFIX: "lsh sync --status - ";
    readonly LOCAL_LABEL: "  local .env present   ";
    readonly REMOTE_LABEL: "  remote present       ";
    readonly REMOTE_UNKNOWN: "unknown";
    readonly REMOTE_UNKNOWN_HINT: "  (IPFS daemon not reachable)";
    readonly KEY_SET_LABEL: "  encryption key set   ";
    readonly KEY_MATCHES_LABEL: "  key matches remote   ";
    readonly DAEMON_UNREACHABLE_HINT: "\n  Run `lsh sync --init` to install and start IPFS.";
    readonly SUGGESTIONS_HEADER: "\nSuggestions:";
    readonly SUGGESTION_PREFIX: "  - ";
    readonly KEY_NOT_FOUND: "No encryption key found. Run: lsh sync --init";
    readonly KEY_INVALID_FORMAT: "Invalid key format. Expected 64 hex characters (256-bit key).";
    readonly KEY_ALREADY_CONFIGURED: "This key is already configured.";
    readonly KEY_REPLACE_REFUSED_1_PREFIX: "An encryption key is already configured in ";
    readonly KEY_REPLACE_REFUSED_1_SUFFIX: " and is different from this one.";
    readonly KEY_REPLACE_REFUSED_2: "Replacing it makes secrets already pushed with the old key undecryptable.";
    readonly KEY_REPLACE_REFUSED_3: "If that is what you want, re-run with --force.";
    readonly KEY_SHADOW_REFUSED_1_PREFIX: "The active encryption key currently comes from ";
    readonly KEY_SHADOW_REFUSED_1_SUFFIX: ", a different key than this one.";
    readonly KEY_SHADOW_REFUSED_2: "Writing to this file would take priority over it, making secrets already pushed under it undecryptable.";
    readonly KEY_SAVED_PREFIX: "Key saved to ";
    readonly KEY_EFFECTIVE_DIFFERS: "Note: the active LSH_SECRETS_KEY differs from what was just written — an environment variable or another .env file takes precedence at runtime.";
    readonly CONFIG_PATH_PREFIX: "Config file: ";
    readonly CONFIG_EMPTY: "No configuration found";
    readonly HISTORY_RECENT_HEADER: "\nRecent Sync Activity\n";
    readonly HISTORY_RECENT_EMPTY: "No recent sync activity found.";
    readonly HISTORY_FILE_LABEL: "File: ";
    readonly HISTORY_SIZE_LABEL: "Size: ";
    readonly HISTORY_TIME_LABEL: "Time: ";
    readonly HISTORY_REPO_LABEL: "Repo: ";
    readonly HISTORY_ENV_LABEL: "Env:  ";
    readonly HISTORY_RECORDS_HEADER: "\nImmutable Sync Records\n";
    readonly HISTORY_RECORDS_EMPTY: "No immutable sync records found.";
    readonly HISTORY_NO_REPO: "(no repo)";
    readonly HISTORY_TOTAL_PREFIX: "Total: ";
    readonly HISTORY_TOTAL_SUFFIX: " records";
    readonly HISTORY_UNREADABLE_SUFFIX: " record(s) could not be retrieved";
    readonly REPAIR_SUCCESS: "Local sync metadata and cache cleared.";
    readonly VERIFY_AVAILABLE: "CID is accessible.";
    readonly VERIFY_UNAVAILABLE: "CID is not accessible on the network.";
    readonly VERIFY_CID_LABEL: "CID: ";
    readonly VERIFY_SOURCE_LABEL: "Source: ";
};
