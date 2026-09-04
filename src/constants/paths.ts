/**
 * File paths and system locations
 *
 * All file paths, directories, and system locations used throughout LSH.
 */

export const PATHS = {
  // Package and config files
  PACKAGE_JSON_RELATIVE: '../package.json',
  LSHRC_FILENAME: '.lshrc',
  ROOT_DIR: '/',

  // History and session files
  DEFAULT_HISTORY_FILE: '~/.lsh_history',

  // Daemon files (templates with ${USER} placeholder)
  DAEMON_SOCKET_TEMPLATE: '/tmp/lsh-job-daemon-${USER}.sock',
  DAEMON_PID_FILE_TEMPLATE: '/tmp/lsh-job-daemon-${USER}.pid',
  DAEMON_LOG_FILE_TEMPLATE: '/tmp/lsh-job-daemon-${USER}.log',
  DAEMON_JOBS_FILE_TEMPLATE: '/tmp/lsh-daemon-jobs-${USER}.json',

  // Job persistence
  DEFAULT_JOBS_PERSISTENCE_FILE: '/tmp/lsh-jobs.json',

  // Job registry files
  JOB_REGISTRY_FILE: '/tmp/lsh-job-registry.json',
  JOB_LOGS_DIR: '/tmp/lsh-job-logs',
} as const;

export const PREFIXES = {
  SESSION_ID: 'lsh_',
  SECRETS_SEED_SUFFIX: 'lsh-secrets',
} as const;

export const SYSTEM = {
  UNKNOWN_USER: 'unknown',
  DEFAULT_HOSTNAME: 'localhost',
} as const;

/** .gitignore patterns ensureEnvInGitignore keeps every secrets-bearing local file covered by. */
export const ENV_GITIGNORE_PATTERNS = [
  '.env',
  '.env.local',
  '.env.*.local',
  '.env.copyfrom.*',
  '.env.backup.*',
] as const;

export const ENV_GITIGNORE_HEADER = '# Environment variables (managed by LSH)';

/** Suffix ensureEnvInGitignore appends to a target file's basename to gitignore its backups. */
export const ENV_BACKUP_SUFFIX_PATTERN = '.backup.*';
