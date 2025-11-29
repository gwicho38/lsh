/**
 * UI Constants Tests
 * Tests for UI messages and log messages
 */

import { describe, it, expect, beforeAll } from '@jest/globals';

describe('UI Constants', () => {
  let UI_MESSAGES: typeof import('../src/constants/ui.js').UI_MESSAGES;
  let LOG_MESSAGES: typeof import('../src/constants/ui.js').LOG_MESSAGES;
  let LOG_LEVELS: typeof import('../src/constants/ui.js').LOG_LEVELS;

  beforeAll(async () => {
    const module = await import('../src/constants/ui.js');
    UI_MESSAGES = module.UI_MESSAGES;
    LOG_MESSAGES = module.LOG_MESSAGES;
    LOG_LEVELS = module.LOG_LEVELS;
  });

  describe('UI_MESSAGES', () => {
    it('should have help and usage messages', () => {
      expect(UI_MESSAGES.DID_YOU_MEAN).toBeDefined();
      expect(UI_MESSAGES.RUN_HELP_MESSAGE).toBeDefined();
    });

    it('should have configuration messages', () => {
      expect(UI_MESSAGES.CONFIG_EXISTS).toBeDefined();
      expect(UI_MESSAGES.CONFIG_CREATED).toBeDefined();
      expect(UI_MESSAGES.CONFIG_CREATE_FAILED).toBeDefined();
      expect(UI_MESSAGES.CONFIG_NOT_FOUND).toBeDefined();
      expect(UI_MESSAGES.CONFIG_INIT_HINT).toBeDefined();
      expect(UI_MESSAGES.CONFIG_FILE_DISPLAY).toBeDefined();
      expect(UI_MESSAGES.CONFIG_VALID).toBeDefined();
      expect(UI_MESSAGES.CONFIG_HAS_ERRORS).toBeDefined();
    });

    it('should have secrets messages', () => {
      expect(UI_MESSAGES.FAILED_PUSH_SECRETS).toBeDefined();
      expect(UI_MESSAGES.FAILED_PULL_SECRETS).toBeDefined();
      expect(UI_MESSAGES.FILE_NOT_FOUND).toBeDefined();
      expect(UI_MESSAGES.TIP_PULL_FROM_CLOUD).toBeDefined();
      expect(UI_MESSAGES.SECRETS_IN_FILE).toBeDefined();
      expect(UI_MESSAGES.TOTAL_SECRETS).toBeDefined();
      expect(UI_MESSAGES.FAILED_LIST_SECRETS).toBeDefined();
    });

    it('should have version messages', () => {
      expect(UI_MESSAGES.CURRENT_VERSION).toBeDefined();
      expect(UI_MESSAGES.CHECKING_UPDATES).toBeDefined();
      expect(UI_MESSAGES.FAILED_FETCH_VERSION).toBeDefined();
      expect(UI_MESSAGES.CHECK_INTERNET).toBeDefined();
      expect(UI_MESSAGES.LATEST_VERSION).toBeDefined();
      expect(UI_MESSAGES.ALREADY_LATEST).toBeDefined();
      expect(UI_MESSAGES.VERSION_NEWER).toBeDefined();
      expect(UI_MESSAGES.DEV_VERSION_HINT).toBeDefined();
      expect(UI_MESSAGES.UPDATE_AVAILABLE).toBeDefined();
      expect(UI_MESSAGES.RUN_UPDATE_HINT).toBeDefined();
    });

    it('should use template placeholders correctly', () => {
      expect(UI_MESSAGES.CONFIG_EXISTS).toContain('${rcFile}');
      expect(UI_MESSAGES.UPDATE_AVAILABLE).toContain('${currentVersion}');
      expect(UI_MESSAGES.UPDATE_AVAILABLE).toContain('${latestVersion}');
    });
  });

  describe('LOG_MESSAGES', () => {
    it('should have environment validation messages', () => {
      expect(LOG_MESSAGES.VALIDATING_ENV).toBeDefined();
      expect(LOG_MESSAGES.ENV_VALIDATION_FAILED).toBeDefined();
    });

    it('should have daemon lifecycle messages', () => {
      expect(LOG_MESSAGES.DAEMON_STARTING).toBeDefined();
      expect(LOG_MESSAGES.DAEMON_STARTED).toBeDefined();
      expect(LOG_MESSAGES.DAEMON_STOPPING).toBeDefined();
      expect(LOG_MESSAGES.DAEMON_STOPPED).toBeDefined();
    });

    it('should have API server messages', () => {
      expect(LOG_MESSAGES.API_SERVER_STARTED).toBeDefined();
      expect(LOG_MESSAGES.API_SERVER_STOPPED).toBeDefined();
    });

    it('should have job operation messages', () => {
      expect(LOG_MESSAGES.ADDING_JOB).toBeDefined();
      expect(LOG_MESSAGES.STARTING_JOB).toBeDefined();
      expect(LOG_MESSAGES.TRIGGERING_JOB).toBeDefined();
    });

    it('should have scheduler messages', () => {
      expect(LOG_MESSAGES.SCHEDULER_STARTING).toBeDefined();
      expect(LOG_MESSAGES.SCHEDULER_STARTED).toBeDefined();
    });

    it('should have secrets operation messages', () => {
      expect(LOG_MESSAGES.WARN_NO_SECRETS_KEY).toBeDefined();
      expect(LOG_MESSAGES.WARN_GENERATE_KEY_MESSAGE).toBeDefined();
      expect(LOG_MESSAGES.PUSHING_SECRETS).toBeDefined();
      expect(LOG_MESSAGES.SECRETS_PUSHED).toBeDefined();
      expect(LOG_MESSAGES.PULLING_SECRETS).toBeDefined();
      expect(LOG_MESSAGES.BACKUP_CREATED).toBeDefined();
      expect(LOG_MESSAGES.SECRETS_PULLED).toBeDefined();
    });

    it('should use template placeholders correctly', () => {
      expect(LOG_MESSAGES.DAEMON_STARTED).toContain('${pid}');
      expect(LOG_MESSAGES.API_SERVER_STARTED).toContain('${port}');
      expect(LOG_MESSAGES.ADDING_JOB).toContain('${name}');
    });
  });

  describe('LOG_LEVELS', () => {
    it('should have all standard log levels', () => {
      expect(LOG_LEVELS.INFO).toBe('INFO');
      expect(LOG_LEVELS.WARN).toBe('WARN');
      expect(LOG_LEVELS.ERROR).toBe('ERROR');
      expect(LOG_LEVELS.DEBUG).toBe('DEBUG');
    });
  });
});
