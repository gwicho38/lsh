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

    beforeAll(async () => {
      const module = await import('../src/constants/errors.js');
      ERRORS = module.ERRORS;
      RISK_LEVELS = module.RISK_LEVELS;
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
