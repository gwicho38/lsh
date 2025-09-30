/**
 * Tests for Logger utility
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { Logger, LogLevel, createLogger } from '../src/lib/logger.js';

describe('Logger', () => {
  let consoleLogSpy: jest.SpiedFunction<typeof console.log>;
  let consoleWarnSpy: jest.SpiedFunction<typeof console.warn>;
  let consoleErrorSpy: jest.SpiedFunction<typeof console.error>;

  beforeEach(() => {
    // Spy on console methods
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore console methods
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('Log Levels', () => {
    it('should log debug messages when level is DEBUG', () => {
      const logger = new Logger({ level: LogLevel.DEBUG });

      logger.debug('Debug message');

      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls[0][0] as string;
      expect(output).toContain('Debug message');
      expect(output).toContain('DEBUG');
    });

    it('should not log debug messages when level is INFO', () => {
      const logger = new Logger({ level: LogLevel.INFO });

      logger.debug('Debug message');

      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it('should log info messages when level is INFO', () => {
      const logger = new Logger({ level: LogLevel.INFO });

      logger.info('Info message');

      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls[0][0] as string;
      expect(output).toContain('Info message');
      expect(output).toContain('INFO');
    });

    it('should log warn messages when level is WARN', () => {
      const logger = new Logger({ level: LogLevel.WARN });

      logger.warn('Warning message');

      expect(consoleWarnSpy).toHaveBeenCalled();
      const output = consoleWarnSpy.mock.calls[0][0] as string;
      expect(output).toContain('Warning message');
      expect(output).toContain('WARN');
    });

    it('should not log info messages when level is WARN', () => {
      const logger = new Logger({ level: LogLevel.WARN });

      logger.info('Info message');

      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it('should log error messages when level is ERROR', () => {
      const logger = new Logger({ level: LogLevel.ERROR });

      logger.error('Error message');

      expect(consoleErrorSpy).toHaveBeenCalled();
      const output = consoleErrorSpy.mock.calls[0][0] as string;
      expect(output).toContain('Error message');
      expect(output).toContain('ERROR');
    });

    it('should not log anything when level is NONE', () => {
      const logger = new Logger({ level: LogLevel.NONE });

      logger.debug('Debug');
      logger.info('Info');
      logger.warn('Warn');
      logger.error('Error');

      expect(consoleLogSpy).not.toHaveBeenCalled();
      expect(consoleWarnSpy).not.toHaveBeenCalled();
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });
  });

  describe('Formatting', () => {
    it('should include timestamp when enabled', () => {
      const logger = new Logger({
        level: LogLevel.INFO,
        enableTimestamp: true,
        enableColors: false,
      });

      logger.info('Message');

      const output = consoleLogSpy.mock.calls[0][0] as string;
      // Should contain ISO timestamp format
      expect(output).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should not include timestamp when disabled', () => {
      const logger = new Logger({
        level: LogLevel.INFO,
        enableTimestamp: false,
        enableColors: false,
      });

      logger.info('Message');

      const output = consoleLogSpy.mock.calls[0][0] as string;
      // Should not contain ISO timestamp format
      expect(output).not.toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should format as JSON when enabled', () => {
      const logger = new Logger({
        level: LogLevel.INFO,
        enableJSON: true,
      });

      logger.info('JSON message', { key: 'value' });

      const output = consoleLogSpy.mock.calls[0][0] as string;
      const parsed = JSON.parse(output);

      expect(parsed.level).toBe('INFO');
      expect(parsed.message).toBe('JSON message');
      expect(parsed.metadata).toEqual({ key: 'value' });
      expect(parsed.timestamp).toBeDefined();
    });

    it('should not include colors when disabled', () => {
      const logger = new Logger({
        level: LogLevel.INFO,
        enableColors: false,
      });

      logger.info('Message');

      const output = consoleLogSpy.mock.calls[0][0] as string;
      // Should not contain ANSI color codes
      expect(output).not.toContain('\x1b[');
    });
  });

  describe('Context', () => {
    it('should include context in log output', () => {
      const logger = new Logger({
        level: LogLevel.INFO,
        context: 'TestModule',
        enableColors: false,
      });

      logger.info('Message');

      const output = consoleLogSpy.mock.calls[0][0] as string;
      expect(output).toContain('[TestModule]');
    });

    it('should create child logger with nested context', () => {
      const parentLogger = new Logger({
        level: LogLevel.INFO,
        context: 'Parent',
        enableColors: false,
      });

      const childLogger = parentLogger.child('Child');
      childLogger.info('Message');

      const output = consoleLogSpy.mock.calls[0][0] as string;
      expect(output).toContain('[Parent:Child]');
    });

    it('should support multiple levels of nested context', () => {
      const logger1 = new Logger({ level: LogLevel.INFO, context: 'Level1', enableColors: false });
      const logger2 = logger1.child('Level2');
      const logger3 = logger2.child('Level3');

      logger3.info('Message');

      const output = consoleLogSpy.mock.calls[0][0] as string;
      expect(output).toContain('[Level1:Level2:Level3]');
    });
  });

  describe('Metadata', () => {
    it('should include metadata in text format', () => {
      const logger = new Logger({
        level: LogLevel.INFO,
        enableJSON: false,
        enableColors: false,
      });

      logger.info('Message', { userId: 123, action: 'login' });

      const output = consoleLogSpy.mock.calls[0][0] as string;
      expect(output).toContain('{"userId":123,"action":"login"}');
    });

    it('should include metadata in JSON format', () => {
      const logger = new Logger({
        level: LogLevel.INFO,
        enableJSON: true,
      });

      logger.info('Message', { userId: 123, action: 'login' });

      const output = consoleLogSpy.mock.calls[0][0] as string;
      const parsed = JSON.parse(output);

      expect(parsed.metadata).toEqual({ userId: 123, action: 'login' });
    });

    it('should handle empty metadata', () => {
      const logger = new Logger({
        level: LogLevel.INFO,
        enableJSON: false,
      });

      logger.info('Message', {});

      // Should not throw and should log successfully
      expect(consoleLogSpy).toHaveBeenCalled();
    });
  });

  describe('Error Logging', () => {
    it('should log Error objects with stack traces', () => {
      const logger = new Logger({ level: LogLevel.ERROR });

      const error = new Error('Test error');
      logger.error('Error occurred', error);

      expect(consoleErrorSpy).toHaveBeenCalledTimes(2); // Once for message, once for stack
      const messageOutput = consoleErrorSpy.mock.calls[0][0] as string;
      expect(messageOutput).toContain('Error occurred');
      expect(messageOutput).toContain('ERROR');

      const stackOutput = consoleErrorSpy.mock.calls[1][0] as string;
      expect(stackOutput).toContain('Error: Test error');
    });

    it('should handle non-Error objects in error parameter', () => {
      const logger = new Logger({
        level: LogLevel.ERROR,
        enableJSON: false,
      });

      logger.error('Error occurred', { code: 'ERR_001' });

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      const output = consoleErrorSpy.mock.calls[0][0] as string;
      expect(output).toContain('Error occurred');
    });

    it('should include error in JSON format', () => {
      const logger = new Logger({
        level: LogLevel.ERROR,
        enableJSON: true,
      });

      const error = new Error('Test error');
      logger.error('Error occurred', error);

      const output = consoleErrorSpy.mock.calls[0][0] as string;
      const parsed = JSON.parse(output);

      expect(parsed.error).toBeDefined();
      expect(parsed.error.name).toBe('Error');
      expect(parsed.error.message).toBe('Test error');
      expect(parsed.error.stack).toBeDefined();
    });
  });

  describe('Dynamic Level Changes', () => {
    it('should respect dynamically changed log level', () => {
      const logger = new Logger({ level: LogLevel.INFO });

      logger.debug('Debug 1'); // Should not log
      expect(consoleLogSpy).not.toHaveBeenCalled();

      logger.setLevel(LogLevel.DEBUG);
      logger.debug('Debug 2'); // Should log

      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls[0][0] as string;
      expect(output).toContain('Debug 2');
    });
  });

  describe('createLogger helper', () => {
    it('should create logger with context', () => {
      const logger = createLogger('TestContext', {
        level: LogLevel.INFO,
        enableColors: false,
      });

      logger.info('Message');

      const output = consoleLogSpy.mock.calls[0][0] as string;
      expect(output).toContain('[TestContext]');
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long messages', () => {
      const logger = new Logger({ level: LogLevel.INFO });

      const longMessage = 'A'.repeat(10000);
      logger.info(longMessage);

      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls[0][0] as string;
      expect(output).toContain(longMessage);
    });

    it('should handle special characters in messages', () => {
      const logger = new Logger({
        level: LogLevel.INFO,
        enableColors: false,
      });

      logger.info('Special chars: \n\t\r"\'\\');

      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls[0][0] as string;
      expect(output).toContain('Special chars');
    });

    it('should handle unicode characters', () => {
      const logger = new Logger({
        level: LogLevel.INFO,
        enableColors: false,
      });

      logger.info('Unicode: 你好 🌍 مرحبا');

      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls[0][0] as string;
      expect(output).toContain('你好');
      expect(output).toContain('🌍');
      expect(output).toContain('مرحبا');
    });
  });
});
