/**
 * UI strings and console output
 *
 * All user-facing messages, prompts, and terminal output strings.
 */
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
