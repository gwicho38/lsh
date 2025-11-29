/**
 * String Utils Tests
 * Tests for string utility functions
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach } from '@jest/globals';

describe('StringUtils', () => {
  let formatMessage: typeof import('../src/lib/string-utils.js').formatMessage;
  let formatPath: typeof import('../src/lib/string-utils.js').formatPath;
  let truncate: typeof import('../src/lib/string-utils.js').truncate;
  let escapeRegex: typeof import('../src/lib/string-utils.js').escapeRegex;
  let pluralize: typeof import('../src/lib/string-utils.js').pluralize;

  beforeAll(async () => {
    const module = await import('../src/lib/string-utils.js');
    formatMessage = module.formatMessage;
    formatPath = module.formatPath;
    truncate = module.truncate;
    escapeRegex = module.escapeRegex;
    pluralize = module.pluralize;
  });

  describe('formatMessage', () => {
    it('should replace single placeholder', () => {
      const result = formatMessage('Hello ${name}', { name: 'World' });
      expect(result).toBe('Hello World');
    });

    it('should replace multiple placeholders', () => {
      const result = formatMessage('${greeting} ${name}!', {
        greeting: 'Hello',
        name: 'World'
      });
      expect(result).toBe('Hello World!');
    });

    it('should handle numeric values', () => {
      const result = formatMessage('Job ${jobId} created', { jobId: 12345 });
      expect(result).toBe('Job 12345 created');
    });

    it('should handle boolean values', () => {
      const result = formatMessage('Enabled: ${enabled}', { enabled: true });
      expect(result).toBe('Enabled: true');
    });

    it('should handle multiple occurrences of same placeholder', () => {
      const result = formatMessage('${x} + ${x} = ${result}', { x: 2, result: 4 });
      expect(result).toBe('2 + 2 = 4');
    });

    it('should handle overlapping variable names correctly', () => {
      // Should replace longer variable names first to avoid issues
      const result = formatMessage('${jobId} ${id}', { jobId: 'job123', id: 'id456' });
      expect(result).toBe('job123 id456');
    });

    it('should leave unmatched placeholders as is', () => {
      const result = formatMessage('${matched} ${unmatched}', { matched: 'value' });
      expect(result).toBe('value ${unmatched}');
    });

    it('should handle empty template', () => {
      const result = formatMessage('', { name: 'test' });
      expect(result).toBe('');
    });

    it('should handle no placeholders', () => {
      const result = formatMessage('No placeholders here', { name: 'test' });
      expect(result).toBe('No placeholders here');
    });
  });

  describe('formatPath', () => {
    let originalEnv: NodeJS.ProcessEnv;

    beforeEach(() => {
      originalEnv = { ...process.env };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should replace env variable placeholders', () => {
      process.env.TEST_VAR = 'test_value';
      const result = formatPath('/path/${TEST_VAR}/file');
      expect(result).toBe('/path/test_value/file');
    });

    it('should use fallback when env var not set', () => {
      delete process.env.MISSING_VAR;
      const result = formatPath('/path/${MISSING_VAR}/file', { MISSING_VAR: 'fallback' });
      expect(result).toBe('/path/fallback/file');
    });

    it('should return empty string when no fallback and env var missing', () => {
      delete process.env.MISSING_VAR;
      const result = formatPath('/path/${MISSING_VAR}/file');
      expect(result).toBe('/path//file');
    });

    it('should handle multiple placeholders', () => {
      process.env.DIR1 = 'dir1';
      process.env.DIR2 = 'dir2';
      const result = formatPath('/${DIR1}/${DIR2}/file');
      expect(result).toBe('/dir1/dir2/file');
    });

    it('should prefer env var over fallback', () => {
      process.env.MY_VAR = 'from_env';
      const result = formatPath('/path/${MY_VAR}', { MY_VAR: 'from_fallback' });
      expect(result).toBe('/path/from_env');
    });
  });

  describe('truncate', () => {
    it('should not truncate short strings', () => {
      const result = truncate('Hello', 10);
      expect(result).toBe('Hello');
    });

    it('should truncate long strings with ellipsis', () => {
      const result = truncate('This is a very long string', 15);
      expect(result).toBe('This is a ve...');
      expect(result.length).toBe(15);
    });

    it('should use default max length of 50', () => {
      const longString = 'a'.repeat(60);
      const result = truncate(longString);
      expect(result.length).toBe(50);
      expect(result.endsWith('...')).toBe(true);
    });

    it('should use custom ellipsis', () => {
      const result = truncate('Hello World', 8, '..');
      expect(result).toBe('Hello ..');
    });

    it('should throw if maxLength is less than ellipsis length', () => {
      expect(() => truncate('Hello', 2, '...')).toThrow();
    });

    it('should handle exact length strings', () => {
      const result = truncate('Exact', 5);
      expect(result).toBe('Exact');
    });

    it('should handle empty string', () => {
      const result = truncate('', 10);
      expect(result).toBe('');
    });
  });

  describe('escapeRegex', () => {
    it('should escape special regex characters', () => {
      expect(escapeRegex('test.file')).toBe('test\\.file');
      expect(escapeRegex('test*')).toBe('test\\*');
      expect(escapeRegex('test?')).toBe('test\\?');
      expect(escapeRegex('test+')).toBe('test\\+');
      expect(escapeRegex('test^')).toBe('test\\^');
      expect(escapeRegex('test$')).toBe('test\\$');
      expect(escapeRegex('test{}')).toBe('test\\{\\}');
      expect(escapeRegex('test()')).toBe('test\\(\\)');
      expect(escapeRegex('test|')).toBe('test\\|');
      expect(escapeRegex('test[]')).toBe('test\\[\\]');
      expect(escapeRegex('test\\')).toBe('test\\\\');
    });

    it('should handle multiple special characters', () => {
      const result = escapeRegex('file.*.txt');
      expect(result).toBe('file\\.\\*\\.txt');
    });

    it('should handle normal strings', () => {
      const result = escapeRegex('normaltext');
      expect(result).toBe('normaltext');
    });

    it('should handle empty string', () => {
      expect(escapeRegex('')).toBe('');
    });
  });

  describe('pluralize', () => {
    it('should return singular for count of 1', () => {
      expect(pluralize(1, 'job')).toBe('1 job');
    });

    it('should return plural for count of 0', () => {
      expect(pluralize(0, 'job')).toBe('0 jobs');
    });

    it('should return plural for count greater than 1', () => {
      expect(pluralize(5, 'job')).toBe('5 jobs');
    });

    it('should use custom plural form', () => {
      expect(pluralize(2, 'query', 'queries')).toBe('2 queries');
    });

    it('should use custom plural for irregular nouns', () => {
      expect(pluralize(3, 'child', 'children')).toBe('3 children');
    });

    it('should handle negative counts', () => {
      expect(pluralize(-1, 'item')).toBe('-1 items');
    });
  });
});
