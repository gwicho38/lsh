/**
 * UI Constants Tests
 * Tests for UI messages and log messages
 */

import { describe, it, expect, beforeAll } from '@jest/globals';

describe('UI Constants', () => {
  let UI_MESSAGES: typeof import('../src/constants/ui.js').UI_MESSAGES;
  let LOG_MESSAGES: typeof import('../src/constants/ui.js').LOG_MESSAGES;
  let LOG_LEVELS: typeof import('../src/constants/ui.js').LOG_LEVELS;
  let ANSI: typeof import('../src/constants/ui.js').ANSI;
  let EMOJI: typeof import('../src/constants/ui.js').EMOJI;
  let STATUS_MESSAGES: typeof import('../src/constants/ui.js').STATUS_MESSAGES;
  let DOCTOR_MESSAGES: typeof import('../src/constants/ui.js').DOCTOR_MESSAGES;
  let INIT_MESSAGES: typeof import('../src/constants/ui.js').INIT_MESSAGES;
  let MIGRATION_MESSAGES: typeof import('../src/constants/ui.js').MIGRATION_MESSAGES;
  let DEPRECATION_WARNINGS: typeof import('../src/constants/ui.js').DEPRECATION_WARNINGS;
  let CLI_TEXT: typeof import('../src/constants/ui.js').CLI_TEXT;
  let CLI_HELP: typeof import('../src/constants/ui.js').CLI_HELP;

  beforeAll(async () => {
    const module = await import('../src/constants/ui.js');
    UI_MESSAGES = module.UI_MESSAGES;
    LOG_MESSAGES = module.LOG_MESSAGES;
    LOG_LEVELS = module.LOG_LEVELS;
    ANSI = module.ANSI;
    EMOJI = module.EMOJI;
    STATUS_MESSAGES = module.STATUS_MESSAGES;
    DOCTOR_MESSAGES = module.DOCTOR_MESSAGES;
    INIT_MESSAGES = module.INIT_MESSAGES;
    MIGRATION_MESSAGES = module.MIGRATION_MESSAGES;
    DEPRECATION_WARNINGS = module.DEPRECATION_WARNINGS;
    CLI_TEXT = module.CLI_TEXT;
    CLI_HELP = module.CLI_HELP;
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

  describe('ANSI', () => {
    it('should have reset code', () => {
      expect(ANSI.RESET).toBe('\x1b[0m');
    });

    it('should have text style codes', () => {
      expect(ANSI.BRIGHT).toBe('\x1b[1m');
      expect(ANSI.DIM).toBe('\x1b[2m');
    });

    it('should have all foreground color codes', () => {
      expect(ANSI.FG_BLACK).toBe('\x1b[30m');
      expect(ANSI.FG_RED).toBe('\x1b[31m');
      expect(ANSI.FG_GREEN).toBe('\x1b[32m');
      expect(ANSI.FG_YELLOW).toBe('\x1b[33m');
      expect(ANSI.FG_BLUE).toBe('\x1b[34m');
      expect(ANSI.FG_MAGENTA).toBe('\x1b[35m');
      expect(ANSI.FG_CYAN).toBe('\x1b[36m');
      expect(ANSI.FG_WHITE).toBe('\x1b[37m');
    });

    it('should have all background color codes', () => {
      expect(ANSI.BG_BLACK).toBe('\x1b[40m');
      expect(ANSI.BG_RED).toBe('\x1b[41m');
      expect(ANSI.BG_GREEN).toBe('\x1b[42m');
      expect(ANSI.BG_YELLOW).toBe('\x1b[43m');
      expect(ANSI.BG_BLUE).toBe('\x1b[44m');
      expect(ANSI.BG_MAGENTA).toBe('\x1b[45m');
      expect(ANSI.BG_CYAN).toBe('\x1b[46m');
      expect(ANSI.BG_WHITE).toBe('\x1b[47m');
    });

    it('should have valid ANSI escape sequence format', () => {
      // All ANSI codes should start with escape sequence
      Object.values(ANSI).forEach((code) => {
        expect(code).toMatch(/^\x1b\[\d+m$/);
      });
    });
  });

  describe('EMOJI', () => {
    it('should have success/error/warning emojis', () => {
      expect(EMOJI.SUCCESS).toBe('✅');
      expect(EMOJI.ERROR).toBe('❌');
      expect(EMOJI.WARNING).toBe('⚠️');
      expect(EMOJI.INFO).toBe('ℹ️');
      expect(EMOJI.TIP).toBe('💡');
    });

    it('should have file/folder emojis', () => {
      expect(EMOJI.KEY).toBe('🔑');
      expect(EMOJI.FILE).toBe('📄');
      expect(EMOJI.FOLDER).toBe('📁');
      expect(EMOJI.LIST).toBe('📋');
    });

    it('should have navigation emojis', () => {
      expect(EMOJI.SEARCH).toBe('🔍');
      expect(EMOJI.LOCATION).toBe('📍');
      expect(EMOJI.UP).toBe('⬆️');
      expect(EMOJI.DOWN).toBe('⬇️');
    });

    it('should have utility emojis', () => {
      expect(EMOJI.CALENDAR).toBe('📅');
      expect(EMOJI.GEAR).toBe('⚙️');
    });
  });

  describe('STATUS_MESSAGES', () => {
    it('should have success messages', () => {
      expect(STATUS_MESSAGES.SUCCESS).toBe('✅');
      expect(STATUS_MESSAGES.SUCCESS_GENERIC).toBe('✅ Success');
      expect(STATUS_MESSAGES.CONNECTION_SUCCESS).toBe('✅ Connection successful!');
      expect(STATUS_MESSAGES.CONFIG_SAVED).toBe('✅ Configuration saved');
      expect(STATUS_MESSAGES.SECRETS_PULLED).toBe('✅ Secrets pulled successfully!');
      expect(STATUS_MESSAGES.IPFS_INSTALLED).toBe('✅ IPFS client installed');
    });

    it('should have error messages', () => {
      expect(STATUS_MESSAGES.ERROR).toBe('❌');
      expect(STATUS_MESSAGES.ERROR_GENERIC).toBe('❌ Error');
      expect(STATUS_MESSAGES.CONNECTION_FAILED).toBe('❌ Connection failed');
      expect(STATUS_MESSAGES.CONFIG_SAVE_FAILED).toBe('❌ Failed to save configuration');
      expect(STATUS_MESSAGES.PULL_FAILED).toBe('❌ Failed to pull secrets');
    });

    it('should have warning messages', () => {
      expect(STATUS_MESSAGES.WARNING).toBe('⚠️');
      expect(STATUS_MESSAGES.WARNING_GENERIC).toBe('⚠️ Warning');
      expect(STATUS_MESSAGES.IPFS_NOT_INSTALLED).toBe('⚠️  IPFS client not installed');
      expect(STATUS_MESSAGES.NOT_GIT_REPO).toBe('ℹ️  Not in a git repository');
    });

    it('should have info messages', () => {
      expect(STATUS_MESSAGES.INFO).toBe('ℹ️');
      expect(STATUS_MESSAGES.RECOMMENDATIONS).toBe('💡 Recommendations:');
      expect(STATUS_MESSAGES.CURRENT_REPO).toBe('📁 Current Repository:');
    });
  });

  describe('DOCTOR_MESSAGES', () => {
    it('should have all diagnostic messages', () => {
      expect(DOCTOR_MESSAGES.CHECKING).toBe('🔍 Checking:');
      expect(DOCTOR_MESSAGES.ALL_PASSED).toBe('✅ All checks passed!');
      expect(DOCTOR_MESSAGES.ISSUES_FOUND).toBe('❌ Issues found');
      expect(DOCTOR_MESSAGES.RECOMMENDATIONS).toBe('💡 Recommendations:');
    });
  });

  describe('INIT_MESSAGES', () => {
    it('should have setup messages', () => {
      expect(INIT_MESSAGES.WELCOME).toBe('🚀 Welcome to LSH Setup');
      expect(INIT_MESSAGES.STEP_COMPLETE).toBe('✅ Step complete');
      expect(INIT_MESSAGES.SETUP_COMPLETE).toBe('✅ Setup complete!');
      expect(INIT_MESSAGES.CONNECTION_TEST_SKIPPED).toContain('Connection test skipped');
    });
  });

  describe('MIGRATION_MESSAGES', () => {
    it('should have migration status messages', () => {
      expect(MIGRATION_MESSAGES.SCANNING).toBe('🔍 Scanning for Firebase references...');
      expect(MIGRATION_MESSAGES.MIGRATING).toBe('🔄 Migrating...');
      expect(MIGRATION_MESSAGES.COMPLETE).toBe('✅ Migration complete');
      expect(MIGRATION_MESSAGES.NO_CHANGES).toBe('ℹ️  No changes needed');
    });
  });

  describe('DEPRECATION_WARNINGS', () => {
    it('should have lib commands deprecation warning', () => {
      expect(DEPRECATION_WARNINGS.LIB_COMMANDS).toContain('deprecated');
      expect(DEPRECATION_WARNINGS.LIB_COMMANDS).toContain('v1.0.0');
    });

    it('should use ANSI color codes', () => {
      // Should contain yellow color for warning
      expect(DEPRECATION_WARNINGS.LIB_COMMANDS).toContain(ANSI.FG_YELLOW);
      expect(DEPRECATION_WARNINGS.LIB_COMMANDS).toContain(ANSI.RESET);
    });
  });

  describe('CLI_TEXT', () => {
    it('should have program metadata', () => {
      expect(CLI_TEXT.NAME).toBe('lsh');
      expect(CLI_TEXT.DESCRIPTION).toContain('secrets manager');
      expect(CLI_TEXT.HELP_AFTER_ERROR).toContain('--help');
    });

    it('should have option descriptions', () => {
      expect(CLI_TEXT.OPTION_VERBOSE).toBe('-v, --verbose');
      expect(CLI_TEXT.OPTION_VERBOSE_DESC).toBe('Verbose output');
      expect(CLI_TEXT.OPTION_DEBUG).toBe('-d, --debug');
      expect(CLI_TEXT.OPTION_DEBUG_DESC).toBe('Debug mode');
    });

    it('should have help command description', () => {
      expect(CLI_TEXT.HELP_DESCRIPTION).toBe('Show detailed help');
    });

    it('should have error messages', () => {
      expect(CLI_TEXT.ERROR_UNKNOWN_COMMAND).toBe('error: unknown command');
      expect(CLI_TEXT.DID_YOU_MEAN).toBe('\nDid you mean one of these?');
      expect(CLI_TEXT.RUN_HELP).toContain('lsh --help');
    });

    it('should have commander event names', () => {
      expect(CLI_TEXT.EVENT_UNKNOWN_COMMAND).toBe('command:*');
    });
  });

  describe('CLI_HELP', () => {
    it('should have title and separator', () => {
      expect(CLI_HELP.TITLE).toBe('LSH - Encrypted Secrets Manager');
      expect(CLI_HELP.SEPARATOR).toBe('================================');
    });

    it('should have section headers', () => {
      expect(CLI_HELP.SECTION_SECRETS).toContain('Secrets Management');
      expect(CLI_HELP.SECTION_IPFS).toContain('IPFS');
      expect(CLI_HELP.SECTION_QUICK_START).toContain('Quick Start');
      expect(CLI_HELP.SECTION_MORE).toContain('More Commands');
      expect(CLI_HELP.SECTION_USAGE).toBe('Usage:');
      expect(CLI_HELP.SECTION_MAIN_COMMANDS).toBe('Main Commands:');
      expect(CLI_HELP.SECTION_SELF_MANAGEMENT).toBe('Self-Management:');
      expect(CLI_HELP.SECTION_EXAMPLES).toBe('Examples:');
      expect(CLI_HELP.SECTION_FEATURES).toBe('Features:');
    });

    it('should have secrets command descriptions', () => {
      expect(CLI_HELP.CMD_INIT).toContain('init');
      expect(CLI_HELP.CMD_DOCTOR).toContain('doctor');
      expect(CLI_HELP.CMD_SYNC).toContain('sync');
      expect(CLI_HELP.CMD_PUSH).toContain('push');
      expect(CLI_HELP.CMD_PULL).toContain('pull');
      expect(CLI_HELP.CMD_LIST).toContain('list');
      expect(CLI_HELP.CMD_KEY).toContain('key');
    });

    it('should have IPFS command descriptions', () => {
      expect(CLI_HELP.CMD_SYNC_INIT).toContain('sync init');
      expect(CLI_HELP.CMD_SYNC_PUSH).toContain('sync push');
      expect(CLI_HELP.CMD_SYNC_PULL).toContain('sync pull');
      expect(CLI_HELP.CMD_SYNC_STATUS).toContain('sync status');
    });

    it('should have feature descriptions', () => {
      expect(CLI_HELP.FEATURE_CROSS_PLATFORM).toContain('Cross-platform');
      expect(CLI_HELP.FEATURE_ENCRYPTION).toContain('AES-256');
      expect(CLI_HELP.FEATURE_MULTI_ENV).toContain('Multi-environment');
      expect(CLI_HELP.FEATURE_TEAM).toContain('Team');
      expect(CLI_HELP.FEATURE_ROTATION).toContain('rotation');
      expect(CLI_HELP.FEATURE_GIT_AWARE).toContain('Git-aware');
    });

    it('should have documentation link', () => {
      expect(CLI_HELP.DOCS_LINK).toContain('github.com/gwicho38/lsh');
    });

    it('should have need help footer', () => {
      expect(CLI_HELP.NEED_HELP).toContain('github.com/gwicho38/lsh');
    });
  });
});
