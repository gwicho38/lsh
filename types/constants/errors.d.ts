/**
 * Error messages
 *
 * All error messages, error prefixes, and error templates used throughout LSH.
 * Use template strings with ${variable} for dynamic content.
 */
export declare const ERRORS: {
    readonly ERROR_PREFIX: "Error: ${message}";
    readonly ERROR_UNKNOWN: "Unknown error";
    readonly ERROR_UNKNOWN_COMMAND: "error: unknown command";
    readonly ERROR_UNKNOWN_COMMAND_PREFIX: "error: unknown command";
    readonly DAEMON_ALREADY_RUNNING: "Daemon is already running";
    readonly ERROR_DAEMON_ALREADY_RUNNING: "Another daemon instance is already running";
    readonly SOCKET_NOT_FOUND: "Daemon socket not found at ${socketPath}. Is the daemon running?";
    readonly SOCKET_PERMISSION_DENIED: "Permission denied to access socket at ${socketPath}. Check file permissions.";
    readonly NOT_CONNECTED: "Not connected to daemon";
    readonly RESPONSE_TOO_LARGE: "Daemon response too large, truncating buffer";
    readonly REQUEST_TIMEOUT: "Request timeout after 10 seconds for command: ${command}";
    readonly JOB_NOT_FOUND: "Job ${jobId} not found";
    readonly ERROR_SCRIPT_PREFIX: "Script error: ${message}";
    readonly ERROR_CONFIG_PREFIX: "Config error: ${message}";
    readonly ERROR_SCRIPT_NOT_FOUND: "Script file not found: ${scriptPath}";
    readonly ERROR_CONFIG_NOT_FOUND: "Configuration file not found: ${rcFile}";
    readonly FILE_NOT_FOUND: "File not found: ${filePath}";
    readonly INVALID_FILENAME: "Invalid filename: ${filename}. Filenames must not contain path separators or special characters.";
    readonly ERROR_ZSH_COMPAT_PREFIX: "ZSH compatibility error: ${message}";
    readonly INVALID_ENV_CONFIG: "Invalid environment configuration. Check logs for details.";
    readonly COMMAND_EMPTY_STRING: "Command must be a non-empty string";
    readonly COMMAND_WHITESPACE_ONLY: "Command cannot be empty or whitespace only";
    readonly COMMAND_TOO_LONG: "Command exceeds maximum length of ${maxLength} characters";
    readonly COMMAND_NOT_WHITELISTED: "Command '${commandName}' is not in whitelist";
    readonly COMMAND_VALIDATION_FAILED: "Command validation failed: ${errors}";
    readonly INVALID_ENCRYPTED_FORMAT: "Invalid encrypted format";
    readonly DECRYPTION_FAILED_MESSAGE: "Failed to decrypt secrets.\n\nThis could happen if:\n1. The LSH_SECRETS_KEY is incorrect or has changed\n2. The encrypted data is corrupted\n3. The data was encrypted with a different key\n\nTo fix this:\n- Verify LSH_SECRETS_KEY matches the key used to encrypt\n- Or re-push your secrets with the current key: lsh push --env <environment>";
    readonly DESTRUCTIVE_CHANGE: "Destructive change detected";
    readonly NO_SECRETS_FOUND: "No secrets found for file: ${filename} in environment: ${environment}";
    readonly NO_ENCRYPTED_DATA: "No encrypted data found for environment: ${environment}";
    readonly DELETE_ROOT: "Attempting to delete root filesystem";
    readonly MKFS_DETECTED: "Filesystem formatting command detected";
    readonly DD_DETECTED: "Direct disk write detected";
    readonly PRIV_ESCALATION: "Privilege escalation attempt";
    readonly PASSWORD_MOD: "Password modification attempt";
    readonly REMOTE_EXEC_CURL: "Remote code execution via curl";
    readonly REMOTE_EXEC_WGET: "Remote code execution via wget";
    readonly REVERSE_SHELL: "Reverse shell attempt with netcat";
    readonly READ_SHADOW: "Attempting to read shadow password file";
    readonly READ_PASSWD: "Attempting to read user account file";
    readonly ACCESS_SSH_KEY: "Attempting to access SSH private keys";
    readonly KILL_INIT: "Attempting to kill init process";
    readonly KILL_SSHD: "Attempting to kill SSH daemon";
    readonly BASE64_COMMAND: "Base64 encoded command detected";
    readonly DYNAMIC_EVAL: "Dynamic command evaluation detected";
    readonly NULL_BYTE: "Null byte injection detected";
};
export declare const RISK_LEVELS: {
    readonly CRITICAL: "critical";
    readonly HIGH: "high";
    readonly MEDIUM: "medium";
    readonly LOW: "low";
};
