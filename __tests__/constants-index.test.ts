/**
 * Constants Index Tests
 * Tests for the centralized constants export
 */

import { describe, it, expect, beforeAll } from '@jest/globals';

describe('Constants Index', () => {
  let constants: typeof import('../src/constants/index.js');

  beforeAll(async () => {
    constants = await import('../src/constants/index.js');
  });

  describe('Paths exports', () => {
    it('should export PATHS', () => {
      expect(constants.PATHS).toBeDefined();
      expect(constants.PATHS.DAEMON_SOCKET_TEMPLATE).toBeDefined();
    });

    it('should export PREFIXES', () => {
      expect(constants.PREFIXES).toBeDefined();
      expect(constants.PREFIXES.SESSION_ID).toBe('lsh_');
    });

    it('should export SYSTEM', () => {
      expect(constants.SYSTEM).toBeDefined();
      expect(constants.SYSTEM.UNKNOWN_USER).toBe('unknown');
    });
  });

  describe('Errors exports', () => {
    it('should export ERRORS', () => {
      expect(constants.ERRORS).toBeDefined();
      expect(constants.ERRORS.DAEMON_ALREADY_RUNNING).toBeDefined();
    });

    it('should export RISK_LEVELS', () => {
      expect(constants.RISK_LEVELS).toBeDefined();
      expect(constants.RISK_LEVELS.CRITICAL).toBe('critical');
    });
  });

  describe('Commands exports', () => {
    it('should export CLI', () => {
      expect(constants.CLI).toBeDefined();
      expect(constants.CLI.NAME).toBe('lsh');
    });

    it('should export COMMANDS', () => {
      expect(constants.COMMANDS).toBeDefined();
      expect(constants.COMMANDS.PUSH).toBeDefined();
    });

    it('should export JOB_COMMANDS', () => {
      expect(constants.JOB_COMMANDS).toBeDefined();
      expect(constants.JOB_COMMANDS.SECRETS_SYNC).toBe('secrets_sync');
    });

    it('should export JOB_STATUSES', () => {
      expect(constants.JOB_STATUSES).toBeDefined();
      expect(constants.JOB_STATUSES.RUNNING).toBe('running');
    });

    it('should export JOB_TYPES', () => {
      expect(constants.JOB_TYPES).toBeDefined();
      expect(constants.JOB_TYPES.SHELL).toBe('shell');
    });

    it('should export IPC_COMMANDS', () => {
      expect(constants.IPC_COMMANDS).toBeDefined();
      expect(constants.IPC_COMMANDS.STATUS).toBe('status');
    });

    it('should export PLATFORMS', () => {
      expect(constants.PLATFORMS).toBeDefined();
      expect(constants.PLATFORMS.GITHUB).toBe('github');
    });
  });

  describe('Config exports', () => {
    it('should export ENV_VARS', () => {
      expect(constants.ENV_VARS).toBeDefined();
      expect(constants.ENV_VARS.LSH_API_KEY).toBe('LSH_API_KEY');
    });

    it('should export DEFAULTS', () => {
      expect(constants.DEFAULTS).toBeDefined();
      expect(constants.DEFAULTS.API_PORT).toBe(3030);
    });
  });

  describe('API exports', () => {
    it('should export ENDPOINTS', () => {
      expect(constants.ENDPOINTS).toBeDefined();
      expect(constants.ENDPOINTS.HEALTH).toBe('/health');
    });

    it('should export HTTP_HEADERS', () => {
      expect(constants.HTTP_HEADERS).toBeDefined();
      expect(constants.HTTP_HEADERS.CONTENT_TYPE).toBe('Content-Type');
    });

    it('should export CONTENT_TYPES', () => {
      expect(constants.CONTENT_TYPES).toBeDefined();
      expect(constants.CONTENT_TYPES.JSON).toBe('application/json');
    });

    it('should export AUTH', () => {
      expect(constants.AUTH).toBeDefined();
      expect(constants.AUTH.BEARER_PREFIX).toBe('Bearer ');
    });
  });

  describe('UI exports', () => {
    it('should export UI_MESSAGES', () => {
      expect(constants.UI_MESSAGES).toBeDefined();
    });

    it('should export LOG_MESSAGES', () => {
      expect(constants.LOG_MESSAGES).toBeDefined();
    });

    it('should export LOG_LEVELS', () => {
      expect(constants.LOG_LEVELS).toBeDefined();
    });
  });

  describe('Validation exports', () => {
    it('should export DANGEROUS_PATTERNS', () => {
      expect(constants.DANGEROUS_PATTERNS).toBeDefined();
      expect(Array.isArray(constants.DANGEROUS_PATTERNS)).toBe(true);
    });

    it('should export WARNING_PATTERNS', () => {
      expect(constants.WARNING_PATTERNS).toBeDefined();
      expect(Array.isArray(constants.WARNING_PATTERNS)).toBe(true);
    });
  });

  describe('Database exports', () => {
    it('should export TABLES', () => {
      expect(constants.TABLES).toBeDefined();
      expect(constants.TABLES.SHELL_HISTORY).toBe('shell_history');
    });
  });

  describe('All exports are usable', () => {
    it('should allow accessing paths constants', () => {
      expect(typeof constants.PATHS.DAEMON_SOCKET_TEMPLATE).toBe('string');
    });

    it('should allow accessing error constants', () => {
      expect(typeof constants.ERRORS.DAEMON_ALREADY_RUNNING).toBe('string');
    });

    it('should allow accessing config defaults', () => {
      expect(typeof constants.DEFAULTS).toBe('object');
    });
  });
});
