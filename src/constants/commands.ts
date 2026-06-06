/**
 * Command names and CLI strings
 *
 * All command names, subcommands, and CLI-related strings.
 */

export const CLI = {
  NAME: 'lsh',
  DESCRIPTION: 'LSH - Encrypted secrets manager with automatic rotation and team sync',
  BANNER: 'LSH - Encrypted Secrets Manager with Automatic Rotation',
} as const;

export const COMMANDS = {
  // Core commands
  SCRIPT: 'script <file>',
  CONFIG: 'config',
  ZSH: 'zsh',
  HELP: 'help',

  // Secrets commands
  PUSH: 'push',
  PULL: 'pull',
  LIST: 'list',
  ENV: 'env [environment]',
  KEY: 'key',
  CREATE: 'create',
  SYNC: 'sync',
  STATUS: 'status',
  INFO: 'info',
  GET: 'get [key]',
  SET: 'set [key] [value]',
  DELETE: 'delete',
} as const;

export const JOB_COMMANDS = {
  SECRETS_SYNC: 'secrets_sync',
} as const;

export const JOB_STATUSES = {
  CREATED: 'created',
  RUNNING: 'running',
  STOPPED: 'stopped',
  COMPLETED: 'completed',
  FAILED: 'failed',
  KILLED: 'killed',
} as const;

export const JOB_TYPES = {
  SHELL: 'shell',
  SYSTEM: 'system',
  SCHEDULED: 'scheduled',
  SERVICE: 'service',
} as const;

export const IPC_COMMANDS = {
  STATUS: 'status',
  ADD_JOB: 'addJob',
  START_JOB: 'startJob',
  TRIGGER_JOB: 'triggerJob',
  STOP_JOB: 'stopJob',
  LIST_JOBS: 'listJobs',
  GET_JOB: 'getJob',
  REMOVE_JOB: 'removeJob',
  RESTART: 'restart',
  STOP: 'stop',
} as const;

export const PLATFORMS = {
  GITHUB: 'github',
  GITLAB: 'gitlab',
  JENKINS: 'jenkins',
} as const;

// `lsh shell-init` — managed block injected into the user's shell rc file so
// secrets load into every shell automatically (homebrew-style wire-up).
export const SHELL_INIT = {
  MARKER_START: '# >>> lsh shell-init >>>',
  MARKER_END: '# <<< lsh shell-init <<<',
  // Absolute ($HOME/.env) path → never calls process.cwd(), so it can't hit
  // the `uv_cwd` crash a cwd-relative `lsh load` does on a stale directory.
  LOAD_LINE: 'eval "$(lsh load --global --quiet)"',
} as const;
