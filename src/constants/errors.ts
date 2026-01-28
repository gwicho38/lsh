/**
 * Error messages
 *
 * All error messages, error prefixes, and error templates used throughout LSH.
 * Use template strings with ${variable} for dynamic content.
 */

export const ERRORS = {
  // General errors
  ERROR_PREFIX: 'Error: ${message}',
  ERROR_UNKNOWN: 'Unknown error',
  ERROR_UNKNOWN_COMMAND: 'error: unknown command',
  ERROR_UNKNOWN_COMMAND_PREFIX: 'error: unknown command',

  // Daemon errors
  DAEMON_ALREADY_RUNNING: 'Daemon is already running',
  ERROR_DAEMON_ALREADY_RUNNING: 'Another daemon instance is already running',
  SOCKET_NOT_FOUND: 'Daemon socket not found at ${socketPath}. Is the daemon running?',
  SOCKET_PERMISSION_DENIED: 'Permission denied to access socket at ${socketPath}. Check file permissions.',
  NOT_CONNECTED: 'Not connected to daemon',
  RESPONSE_TOO_LARGE: 'Daemon response too large, truncating buffer',
  REQUEST_TIMEOUT: 'Request timeout after 10 seconds for command: ${command}',

  // Job errors
  JOB_NOT_FOUND: 'Job ${jobId} not found',

  // Script and config errors
  ERROR_SCRIPT_PREFIX: 'Script error: ${message}',
  ERROR_CONFIG_PREFIX: 'Config error: ${message}',
  ERROR_SCRIPT_NOT_FOUND: 'Script file not found: ${scriptPath}',
  ERROR_CONFIG_NOT_FOUND: 'Configuration file not found: ${rcFile}',

  // File errors
  FILE_NOT_FOUND: 'File not found: ${filePath}',
  INVALID_FILENAME: 'Invalid filename: ${filename}. Filenames must not contain path separators or special characters.',

  // ZSH compatibility errors
  ERROR_ZSH_COMPAT_PREFIX: 'ZSH compatibility error: ${message}',

  // Environment validation errors
  INVALID_ENV_CONFIG: 'Invalid environment configuration. Check logs for details.',

  // Command validation errors
  COMMAND_EMPTY_STRING: 'Command must be a non-empty string',
  COMMAND_WHITESPACE_ONLY: 'Command cannot be empty or whitespace only',
  COMMAND_TOO_LONG: 'Command exceeds maximum length of ${maxLength} characters',
  COMMAND_NOT_WHITELISTED: 'Command \'${commandName}\' is not in whitelist',
  COMMAND_VALIDATION_FAILED: 'Command validation failed: ${errors}',

  // Secrets errors
  INVALID_ENCRYPTED_FORMAT: 'Invalid encrypted format',
  DECRYPTION_FAILED_MESSAGE: `Failed to decrypt secrets.

This could happen if:
1. The LSH_SECRETS_KEY is incorrect or has changed
2. The encrypted data is corrupted
3. The data was encrypted with a different key

To fix this:
- Verify LSH_SECRETS_KEY matches the key used to encrypt
- Or re-push your secrets with the current key: lsh push --env <environment>`,
  DESTRUCTIVE_CHANGE: 'Destructive change detected',
  NO_SECRETS_FOUND: 'No secrets found for file: ${filename} in environment: ${environment}',
  NO_ENCRYPTED_DATA: 'No encrypted data found for environment: ${environment}',

  // Security errors
  DELETE_ROOT: 'Attempting to delete root filesystem',
  MKFS_DETECTED: 'Filesystem formatting command detected',
  DD_DETECTED: 'Direct disk write detected',
  PRIV_ESCALATION: 'Privilege escalation attempt',
  PASSWORD_MOD: 'Password modification attempt',
  REMOTE_EXEC_CURL: 'Remote code execution via curl',
  REMOTE_EXEC_WGET: 'Remote code execution via wget',
  REVERSE_SHELL: 'Reverse shell attempt with netcat',
  READ_SHADOW: 'Attempting to read shadow password file',
  READ_PASSWD: 'Attempting to read user account file',
  ACCESS_SSH_KEY: 'Attempting to access SSH private keys',
  KILL_INIT: 'Attempting to kill init process',
  KILL_SSHD: 'Attempting to kill SSH daemon',
  BASE64_COMMAND: 'Base64 encoded command detected',
  DYNAMIC_EVAL: 'Dynamic command evaluation detected',
  NULL_BYTE: 'Null byte injection detected',

  // Warning-level security messages (command validator)
  RECURSIVE_DELETE: 'Recursive deletion command',
  SUDO_ELEVATED: 'Elevated privileges requested',
  CHMOD_777: 'Overly permissive file permissions',
  DISK_WRITE: 'Writing to disk device',
  INSECURE_SSL: 'Insecure SSL certificate validation disabled',
  FORK_BOMB: 'Fork bomb pattern detected',
  EXCESSIVE_CHAINING: 'Excessive command chaining detected',
  EXCESSIVE_PIPES: 'Excessive pipe usage detected',
  NESTED_SUBSTITUTION: 'Nested command substitution detected',
  CONTROL_CHARS: 'Control characters detected in command',
} as const;

export const RISK_LEVELS = {
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
} as const;

/**
 * API Error Codes
 *
 * Standard error codes used across the SaaS API and services.
 */
export const ERROR_CODES = {
  // Authentication errors
  UNAUTHORIZED: 'UNAUTHORIZED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  INVALID_TOKEN: 'INVALID_TOKEN',
  EMAIL_NOT_VERIFIED: 'EMAIL_NOT_VERIFIED',
  EMAIL_ALREADY_EXISTS: 'EMAIL_ALREADY_EXISTS',

  // Authorization errors
  FORBIDDEN: 'FORBIDDEN',

  // Validation errors
  INVALID_INPUT: 'INVALID_INPUT',
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',

  // Payment errors
  PAYMENT_REQUIRED: 'PAYMENT_REQUIRED',
  TIER_LIMIT_EXCEEDED: 'TIER_LIMIT_EXCEEDED',

  // Server errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;
