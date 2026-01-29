/**
 * Constants Tests
 * Tests for the constants module exports
 */

import { describe, it, expect } from '@jest/globals';

describe('Constants', () => {
  describe('API Constants', () => {
    let ENDPOINTS: typeof import('../src/constants/api.js').ENDPOINTS;
    let HTTP_HEADERS: typeof import('../src/constants/api.js').HTTP_HEADERS;
    let CONTENT_TYPES: typeof import('../src/constants/api.js').CONTENT_TYPES;
    let CACHE_CONTROL_VALUES: typeof import('../src/constants/api.js').CACHE_CONTROL_VALUES;
    let CONNECTION_VALUES: typeof import('../src/constants/api.js').CONNECTION_VALUES;
    let AUTH: typeof import('../src/constants/api.js').AUTH;
    let SOCKET_EVENTS: typeof import('../src/constants/api.js').SOCKET_EVENTS;
    let METRICS: typeof import('../src/constants/api.js').METRICS;
    let REDIS_KEY_TEMPLATES: typeof import('../src/constants/api.js').REDIS_KEY_TEMPLATES;

    beforeAll(async () => {
      const module = await import('../src/constants/api.js');
      ENDPOINTS = module.ENDPOINTS;
      HTTP_HEADERS = module.HTTP_HEADERS;
      CONTENT_TYPES = module.CONTENT_TYPES;
      CACHE_CONTROL_VALUES = module.CACHE_CONTROL_VALUES;
      CONNECTION_VALUES = module.CONNECTION_VALUES;
      AUTH = module.AUTH;
      SOCKET_EVENTS = module.SOCKET_EVENTS;
      METRICS = module.METRICS;
      REDIS_KEY_TEMPLATES = module.REDIS_KEY_TEMPLATES;
    });

    it('should export ENDPOINTS', () => {
      expect(ENDPOINTS).toBeDefined();
      expect(ENDPOINTS.HEALTH).toBe('/health');
      expect(ENDPOINTS.ROOT).toBe('/');
      expect(ENDPOINTS.API_JOBS).toBe('/api/jobs');
      expect(ENDPOINTS.WEBHOOK_GITHUB).toBe('/webhook/github');
    });

    it('should export HTTP_HEADERS', () => {
      expect(HTTP_HEADERS).toBeDefined();
      expect(HTTP_HEADERS.CONTENT_TYPE).toBe('Content-Type');
      expect(HTTP_HEADERS.AUTHORIZATION).toBe('authorization');
      expect(HTTP_HEADERS.X_API_KEY).toBe('x-api-key');
      expect(HTTP_HEADERS.GITHUB_SIGNATURE).toBe('x-hub-signature-256');
    });

    it('should export CONTENT_TYPES', () => {
      expect(CONTENT_TYPES).toBeDefined();
      expect(CONTENT_TYPES.JSON).toBe('application/json');
      expect(CONTENT_TYPES.EVENT_STREAM).toBe('text/event-stream');
    });

    it('should export CACHE_CONTROL_VALUES', () => {
      expect(CACHE_CONTROL_VALUES).toBeDefined();
      expect(CACHE_CONTROL_VALUES.NO_CACHE).toBe('no-cache');
    });

    it('should export CONNECTION_VALUES', () => {
      expect(CONNECTION_VALUES).toBeDefined();
      expect(CONNECTION_VALUES.KEEP_ALIVE).toBe('keep-alive');
    });

    it('should export AUTH constants', () => {
      expect(AUTH).toBeDefined();
      expect(AUTH.BEARER_PREFIX).toBe('Bearer ');
    });

    it('should export SOCKET_EVENTS', () => {
      expect(SOCKET_EVENTS).toBeDefined();
      expect(SOCKET_EVENTS.PIPELINE_UPDATE).toBe('pipeline_event');
    });

    it('should export METRICS', () => {
      expect(METRICS).toBeDefined();
      expect(METRICS.TOTAL_BUILDS).toBe('total_builds');
    });

    it('should export REDIS_KEY_TEMPLATES', () => {
      expect(REDIS_KEY_TEMPLATES).toBeDefined();
      expect(REDIS_KEY_TEMPLATES.PIPELINE).toBe('pipeline:${eventId}');
    });
  });

  describe('Commands Constants', () => {
    let CLI: typeof import('../src/constants/commands.js').CLI;
    let COMMANDS: typeof import('../src/constants/commands.js').COMMANDS;
    let JOB_COMMANDS: typeof import('../src/constants/commands.js').JOB_COMMANDS;
    let JOB_STATUSES: typeof import('../src/constants/commands.js').JOB_STATUSES;
    let JOB_TYPES: typeof import('../src/constants/commands.js').JOB_TYPES;
    let IPC_COMMANDS: typeof import('../src/constants/commands.js').IPC_COMMANDS;
    let PLATFORMS: typeof import('../src/constants/commands.js').PLATFORMS;

    beforeAll(async () => {
      const module = await import('../src/constants/commands.js');
      CLI = module.CLI;
      COMMANDS = module.COMMANDS;
      JOB_COMMANDS = module.JOB_COMMANDS;
      JOB_STATUSES = module.JOB_STATUSES;
      JOB_TYPES = module.JOB_TYPES;
      IPC_COMMANDS = module.IPC_COMMANDS;
      PLATFORMS = module.PLATFORMS;
    });

    it('should export CLI info', () => {
      expect(CLI).toBeDefined();
      expect(CLI.NAME).toBe('lsh');
      expect(CLI.DESCRIPTION).toContain('secrets manager');
    });

    it('should export COMMANDS', () => {
      expect(COMMANDS).toBeDefined();
      expect(COMMANDS.PUSH).toBe('push');
      expect(COMMANDS.PULL).toBe('pull');
      expect(COMMANDS.SYNC).toBe('sync');
    });

    it('should export JOB_COMMANDS', () => {
      expect(JOB_COMMANDS).toBeDefined();
      expect(JOB_COMMANDS.SECRETS_SYNC).toBe('secrets_sync');
    });

    it('should export JOB_STATUSES', () => {
      expect(JOB_STATUSES).toBeDefined();
      expect(JOB_STATUSES.CREATED).toBe('created');
      expect(JOB_STATUSES.RUNNING).toBe('running');
      expect(JOB_STATUSES.COMPLETED).toBe('completed');
      expect(JOB_STATUSES.FAILED).toBe('failed');
    });

    it('should export JOB_TYPES', () => {
      expect(JOB_TYPES).toBeDefined();
      expect(JOB_TYPES.SHELL).toBe('shell');
      expect(JOB_TYPES.SCHEDULED).toBe('scheduled');
      expect(JOB_TYPES.SERVICE).toBe('service');
    });

    it('should export IPC_COMMANDS', () => {
      expect(IPC_COMMANDS).toBeDefined();
      expect(IPC_COMMANDS.STATUS).toBe('status');
      expect(IPC_COMMANDS.ADD_JOB).toBe('addJob');
      expect(IPC_COMMANDS.LIST_JOBS).toBe('listJobs');
    });

    it('should export PLATFORMS', () => {
      expect(PLATFORMS).toBeDefined();
      expect(PLATFORMS.GITHUB).toBe('github');
      expect(PLATFORMS.GITLAB).toBe('gitlab');
      expect(PLATFORMS.JENKINS).toBe('jenkins');
    });
  });

  describe('Config Constants', () => {
    let ENV_VARS: typeof import('../src/constants/config.js').ENV_VARS;
    let DEFAULTS: typeof import('../src/constants/config.js').DEFAULTS;

    beforeAll(async () => {
      const module = await import('../src/constants/config.js');
      ENV_VARS = module.ENV_VARS;
      DEFAULTS = module.DEFAULTS;
    });

    it('should export ENV_VARS', () => {
      expect(ENV_VARS).toBeDefined();
      expect(ENV_VARS.NODE_ENV).toBe('NODE_ENV');
      expect(ENV_VARS.LSH_API_ENABLED).toBe('LSH_API_ENABLED');
      expect(ENV_VARS.LSH_SECRETS_KEY).toBe('LSH_SECRETS_KEY');
      expect(ENV_VARS.SUPABASE_URL).toBe('SUPABASE_URL');
    });

    it('should export DEFAULTS', () => {
      expect(DEFAULTS).toBeDefined();
      expect(DEFAULTS.API_PORT).toBe(3030);
      expect(DEFAULTS.WEBHOOK_PORT).toBe(3033);
      expect(typeof DEFAULTS.MAX_BUFFER_SIZE_BYTES).toBe('number');
      expect(typeof DEFAULTS.CHECK_INTERVAL_MS).toBe('number');
    });
  });

  describe('Database Constants', () => {
    let TABLES: typeof import('../src/constants/database.js').TABLES;

    beforeAll(async () => {
      const module = await import('../src/constants/database.js');
      TABLES = module.TABLES;
    });

    it('should export TABLES', () => {
      expect(TABLES).toBeDefined();
      expect(TABLES.SHELL_HISTORY).toBe('shell_history');
      expect(TABLES.SHELL_JOBS).toBe('shell_jobs');
      expect(TABLES.PIPELINE_EVENTS).toBe('pipeline_events');
    });
  });

  describe('Error Constants', () => {
    let ERRORS: typeof import('../src/constants/errors.js').ERRORS;
    let RISK_LEVELS: typeof import('../src/constants/errors.js').RISK_LEVELS;
    let ERROR_CODES: typeof import('../src/constants/errors.js').ERROR_CODES;

    beforeAll(async () => {
      const module = await import('../src/constants/errors.js');
      ERRORS = module.ERRORS;
      RISK_LEVELS = module.RISK_LEVELS;
      ERROR_CODES = module.ERROR_CODES;
    });

    it('should export ERRORS', () => {
      expect(ERRORS).toBeDefined();
      expect(ERRORS.ERROR_UNKNOWN).toBe('Unknown error');
      expect(ERRORS.JOB_NOT_FOUND).toContain('${jobId}');
      expect(ERRORS.DAEMON_ALREADY_RUNNING).toBe('Daemon is already running');
    });

    it('should export RISK_LEVELS', () => {
      expect(RISK_LEVELS).toBeDefined();
      expect(RISK_LEVELS.CRITICAL).toBe('critical');
      expect(RISK_LEVELS.HIGH).toBe('high');
      expect(RISK_LEVELS.MEDIUM).toBe('medium');
      expect(RISK_LEVELS.LOW).toBe('low');
    });

    it('should have security error messages', () => {
      expect(ERRORS.DELETE_ROOT).toBeDefined();
      expect(ERRORS.REVERSE_SHELL).toBeDefined();
      expect(ERRORS.PRIV_ESCALATION).toBeDefined();
    });

    it('should have general error messages', () => {
      expect(ERRORS.ERROR_PREFIX).toContain('${message}');
      expect(ERRORS.ERROR_UNKNOWN_COMMAND).toBe('error: unknown command');
      expect(ERRORS.ERROR_UNKNOWN_COMMAND_PREFIX).toBe('error: unknown command');
    });

    it('should have daemon error messages', () => {
      expect(ERRORS.DAEMON_ALREADY_RUNNING).toBe('Daemon is already running');
      expect(ERRORS.ERROR_DAEMON_ALREADY_RUNNING).toBe('Another daemon instance is already running');
      expect(ERRORS.SOCKET_NOT_FOUND).toContain('${socketPath}');
      expect(ERRORS.SOCKET_PERMISSION_DENIED).toContain('${socketPath}');
      expect(ERRORS.NOT_CONNECTED).toBe('Not connected to daemon');
      expect(ERRORS.RESPONSE_TOO_LARGE).toContain('truncating');
      expect(ERRORS.REQUEST_TIMEOUT).toContain('${command}');
    });

    it('should have script and config error messages', () => {
      expect(ERRORS.ERROR_SCRIPT_PREFIX).toContain('${message}');
      expect(ERRORS.ERROR_CONFIG_PREFIX).toContain('${message}');
      expect(ERRORS.ERROR_SCRIPT_NOT_FOUND).toContain('${scriptPath}');
      expect(ERRORS.ERROR_CONFIG_NOT_FOUND).toContain('${rcFile}');
    });

    it('should have file error messages', () => {
      expect(ERRORS.FILE_NOT_FOUND).toContain('${filePath}');
      expect(ERRORS.INVALID_FILENAME).toContain('${filename}');
    });

    it('should have ZSH compatibility error messages', () => {
      expect(ERRORS.ERROR_ZSH_COMPAT_PREFIX).toContain('ZSH compatibility');
    });

    it('should have command validation error messages', () => {
      expect(ERRORS.COMMAND_EMPTY_STRING).toBe('Command must be a non-empty string');
      expect(ERRORS.COMMAND_WHITESPACE_ONLY).toContain('whitespace');
      expect(ERRORS.COMMAND_TOO_LONG).toContain('${maxLength}');
      expect(ERRORS.COMMAND_NOT_WHITELISTED).toContain('${commandName}');
      expect(ERRORS.COMMAND_VALIDATION_FAILED).toContain('${errors}');
    });

    it('should have secrets error messages', () => {
      expect(ERRORS.INVALID_ENCRYPTED_FORMAT).toBe('Invalid encrypted format');
      expect(ERRORS.DECRYPTION_FAILED_MESSAGE).toContain('LSH_SECRETS_KEY');
      expect(ERRORS.DESTRUCTIVE_CHANGE).toBe('Destructive change detected');
      expect(ERRORS.NO_SECRETS_FOUND).toContain('${filename}');
      expect(ERRORS.NO_ENCRYPTED_DATA).toContain('${environment}');
    });

    it('should have critical security error messages', () => {
      expect(ERRORS.DELETE_ROOT).toBe('Attempting to delete root filesystem');
      expect(ERRORS.MKFS_DETECTED).toContain('formatting');
      expect(ERRORS.DD_DETECTED).toContain('disk write');
      expect(ERRORS.PRIV_ESCALATION).toBe('Privilege escalation attempt');
      expect(ERRORS.PASSWORD_MOD).toContain('Password');
      expect(ERRORS.REMOTE_EXEC_CURL).toContain('curl');
      expect(ERRORS.REMOTE_EXEC_WGET).toContain('wget');
      expect(ERRORS.REVERSE_SHELL).toContain('netcat');
      expect(ERRORS.READ_SHADOW).toContain('shadow');
      expect(ERRORS.READ_PASSWD).toContain('user account');
      expect(ERRORS.ACCESS_SSH_KEY).toContain('SSH');
      expect(ERRORS.KILL_INIT).toContain('init');
      expect(ERRORS.KILL_SSHD).toContain('SSH daemon');
      expect(ERRORS.BASE64_COMMAND).toContain('Base64');
      expect(ERRORS.DYNAMIC_EVAL).toContain('eval');
      expect(ERRORS.NULL_BYTE).toContain('Null byte');
    });

    it('should have warning-level security messages', () => {
      expect(ERRORS.RECURSIVE_DELETE).toContain('Recursive');
      expect(ERRORS.SUDO_ELEVATED).toContain('privileges');
      expect(ERRORS.CHMOD_777).toContain('permissive');
      expect(ERRORS.DISK_WRITE).toContain('disk');
      expect(ERRORS.INSECURE_SSL).toContain('SSL');
      expect(ERRORS.FORK_BOMB).toContain('Fork bomb');
      expect(ERRORS.EXCESSIVE_CHAINING).toContain('chaining');
      expect(ERRORS.EXCESSIVE_PIPES).toContain('pipe');
      expect(ERRORS.NESTED_SUBSTITUTION).toContain('substitution');
      expect(ERRORS.CONTROL_CHARS).toContain('Control characters');
    });

    it('should export ERROR_CODES', () => {
      expect(ERROR_CODES).toBeDefined();
    });

    it('should have authentication error codes', () => {
      expect(ERROR_CODES.UNAUTHORIZED).toBe('UNAUTHORIZED');
      expect(ERROR_CODES.INVALID_CREDENTIALS).toBe('INVALID_CREDENTIALS');
      expect(ERROR_CODES.INVALID_TOKEN).toBe('INVALID_TOKEN');
      expect(ERROR_CODES.EMAIL_NOT_VERIFIED).toBe('EMAIL_NOT_VERIFIED');
      expect(ERROR_CODES.EMAIL_ALREADY_EXISTS).toBe('EMAIL_ALREADY_EXISTS');
    });

    it('should have authorization error codes', () => {
      expect(ERROR_CODES.FORBIDDEN).toBe('FORBIDDEN');
    });

    it('should have validation error codes', () => {
      expect(ERROR_CODES.INVALID_INPUT).toBe('INVALID_INPUT');
      expect(ERROR_CODES.NOT_FOUND).toBe('NOT_FOUND');
      expect(ERROR_CODES.ALREADY_EXISTS).toBe('ALREADY_EXISTS');
    });

    it('should have payment error codes', () => {
      expect(ERROR_CODES.PAYMENT_REQUIRED).toBe('PAYMENT_REQUIRED');
      expect(ERROR_CODES.TIER_LIMIT_EXCEEDED).toBe('TIER_LIMIT_EXCEEDED');
    });

    it('should have server error codes', () => {
      expect(ERROR_CODES.INTERNAL_ERROR).toBe('INTERNAL_ERROR');
    });
  });

  describe('Path Constants', () => {
    let PATHS: typeof import('../src/constants/paths.js').PATHS;
    let PREFIXES: typeof import('../src/constants/paths.js').PREFIXES;
    let SYSTEM: typeof import('../src/constants/paths.js').SYSTEM;

    beforeAll(async () => {
      const module = await import('../src/constants/paths.js');
      PATHS = module.PATHS;
      PREFIXES = module.PREFIXES;
      SYSTEM = module.SYSTEM;
    });

    it('should export PATHS', () => {
      expect(PATHS).toBeDefined();
      expect(PATHS.LSHRC_FILENAME).toBe('.lshrc');
      expect(PATHS.ROOT_DIR).toBe('/');
      expect(PATHS.DAEMON_SOCKET_TEMPLATE).toContain('${USER}');
    });

    it('should export PREFIXES', () => {
      expect(PREFIXES).toBeDefined();
      expect(PREFIXES.SESSION_ID).toBe('lsh_');
      expect(PREFIXES.SECRETS_SEED_SUFFIX).toBe('lsh-secrets');
    });

    it('should export SYSTEM', () => {
      expect(SYSTEM).toBeDefined();
      expect(SYSTEM.UNKNOWN_USER).toBe('unknown');
      expect(SYSTEM.DEFAULT_HOSTNAME).toBe('localhost');
    });
  });
});
