/**
 * Tests for string-utils.ts
 * String manipulation and formatting utilities
 */

import {
  formatMessage,
  formatPath,
  truncate,
  escapeRegex,
  pluralize,
} from '../lib/string-utils.js';
import { LSHError, ErrorCodes } from '../lib/lsh-error.js';

describe('String Utilities', () => {
  describe('formatMessage', () => {
    describe('basic substitution', () => {
      it('should replace a single variable', () => {
        expect(formatMessage('Job ${jobId} not found', { jobId: '123' })).toBe('Job 123 not found');
      });

      it('should replace multiple variables', () => {
        const result = formatMessage('User ${userId} created job ${jobId}', {
          userId: 'user_1',
          jobId: 'job_42',
        });
        expect(result).toBe('User user_1 created job job_42');
      });

      it('should replace same variable multiple times', () => {
        const result = formatMessage('${name} said: Hello ${name}!', { name: 'Alice' });
        expect(result).toBe('Alice said: Hello Alice!');
      });

      it('should handle numeric values', () => {
        const result = formatMessage('Count: ${count}', { count: 42 });
        expect(result).toBe('Count: 42');
      });

      it('should handle boolean values', () => {
        expect(formatMessage('Enabled: ${enabled}', { enabled: true })).toBe('Enabled: true');
        expect(formatMessage('Enabled: ${enabled}', { enabled: false })).toBe('Enabled: false');
      });

      it('should return template unchanged if no vars provided', () => {
        expect(formatMessage('No variables here', {})).toBe('No variables here');
      });

      it('should leave unmatched placeholders unchanged', () => {
        expect(formatMessage('${missing} value', { other: 'x' })).toBe('${missing} value');
      });
    });

    describe('variable name priority', () => {
      it('should replace longer variable names first', () => {
        // This tests that 'jobId' is replaced before 'id'
        const result = formatMessage('Job ${jobId} with id ${id}', {
          id: 'short',
          jobId: 'long-job-id',
        });
        expect(result).toBe('Job long-job-id with id short');
      });

      it('should not partially match variable names', () => {
        // ${job} should not be replaced when only ${jobId} is provided
        const result = formatMessage('${job} vs ${jobId}', {
          jobId: 'my-job',
        });
        expect(result).toBe('${job} vs my-job');
      });
    });

    describe('edge cases', () => {
      it('should handle empty template', () => {
        expect(formatMessage('', { key: 'value' })).toBe('');
      });

      it('should handle empty string values', () => {
        expect(formatMessage('Value: ${val}', { val: '' })).toBe('Value: ');
      });

      it('should handle special characters in values', () => {
        expect(formatMessage('Path: ${path}', { path: '/user/data/file.txt' })).toBe(
          'Path: /user/data/file.txt'
        );
      });

      it('should handle dollar sign in template (not as placeholder)', () => {
        expect(formatMessage('Price: $100', {})).toBe('Price: $100');
      });

      it('should handle unicode in values', () => {
        expect(formatMessage('Name: ${name}', { name: '你好世界' })).toBe('Name: 你好世界');
      });

      it('should handle zero as value', () => {
        expect(formatMessage('Count: ${n}', { n: 0 })).toBe('Count: 0');
      });
    });
  });

  describe('formatPath', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterAll(() => {
      process.env = originalEnv;
    });

    describe('environment variable substitution', () => {
      it('should substitute environment variable', () => {
        process.env.MY_VAR = 'test-value';
        expect(formatPath('/path/${MY_VAR}/file')).toBe('/path/test-value/file');
      });

      it('should substitute multiple environment variables', () => {
        process.env.USER = 'testuser';
        process.env.HOME = '/home/testuser';
        expect(formatPath('${HOME}/config/${USER}')).toBe('/home/testuser/config/testuser');
      });

      it('should use fallback when env var not set', () => {
        delete process.env.MISSING_VAR;
        expect(formatPath('/path/${MISSING_VAR}', { MISSING_VAR: 'default' })).toBe('/path/default');
      });

      it('should prefer env var over fallback', () => {
        process.env.MY_VAR = 'from-env';
        expect(formatPath('/path/${MY_VAR}', { MY_VAR: 'from-fallback' })).toBe('/path/from-env');
      });

      it('should use empty string when no env var and no fallback', () => {
        delete process.env.MISSING;
        expect(formatPath('/path/${MISSING}/file')).toBe('/path//file');
      });
    });

    describe('template patterns', () => {
      it('should handle path with no variables', () => {
        expect(formatPath('/static/path')).toBe('/static/path');
      });

      it('should handle same variable multiple times', () => {
        process.env.VAR = 'x';
        expect(formatPath('${VAR}/${VAR}/${VAR}')).toBe('x/x/x');
      });

      it('should handle adjacent variables', () => {
        process.env.A = 'aa';
        process.env.B = 'bb';
        expect(formatPath('${A}${B}')).toBe('aabb');
      });
    });

    describe('typical use cases', () => {
      it('should format daemon socket path', () => {
        process.env.USER = 'johndoe';
        const template = '/tmp/lsh-job-daemon-${USER}.sock';
        expect(formatPath(template)).toBe('/tmp/lsh-job-daemon-johndoe.sock');
      });

      it('should format config path', () => {
        process.env.HOME = '/Users/alice';
        expect(formatPath('${HOME}/.lsh/config.json')).toBe('/Users/alice/.lsh/config.json');
      });

      it('should format log path with fallbacks', () => {
        delete process.env.LOG_DIR;
        process.env.USER = 'bob';
        const template = '${LOG_DIR}/lsh-${USER}.log';
        expect(formatPath(template, { LOG_DIR: '/var/log' })).toBe('/var/log/lsh-bob.log');
      });
    });
  });

  describe('truncate', () => {
    describe('basic truncation', () => {
      it('should return string unchanged if within maxLength', () => {
        expect(truncate('Hello', 10)).toBe('Hello');
      });

      it('should return string unchanged if exactly maxLength', () => {
        expect(truncate('12345', 5)).toBe('12345');
      });

      it('should truncate and add ellipsis', () => {
        expect(truncate('Hello, World!', 10)).toBe('Hello, ...');
      });

      it('should use default maxLength of 50', () => {
        const longString = 'a'.repeat(60);
        const result = truncate(longString);
        expect(result.length).toBe(50);
        expect(result.endsWith('...')).toBe(true);
      });

      it('should handle empty string', () => {
        expect(truncate('', 10)).toBe('');
      });
    });

    describe('custom ellipsis', () => {
      it('should use custom ellipsis', () => {
        expect(truncate('Hello, World!', 10, '…')).toBe('Hello, Wo…');
      });

      it('should use longer custom ellipsis', () => {
        expect(truncate('Hello, World!', 10, ' [more]')).toBe('Hel [more]');
      });

      it('should use empty ellipsis', () => {
        expect(truncate('Hello, World!', 5, '')).toBe('Hello');
      });
    });

    describe('edge cases', () => {
      it('should handle maxLength equal to ellipsis length', () => {
        expect(truncate('Hello', 3, '...')).toBe('...');
      });

      it('should truncate to just ellipsis when string is long', () => {
        expect(truncate('A very long string', 3, '...')).toBe('...');
      });

      it('should handle unicode characters', () => {
        // Note: JavaScript counts unicode characters as 1 character each
        // '你好世界' is 4 characters long
        expect(truncate('你好世界', 3)).toBe('...');  // Can only fit ellipsis
        // maxLength 5 means 2 chars + ellipsis(3) = 5
        expect(truncate('你好世界世界', 5)).toBe('你好...');
        expect(truncate('你好世界', 10)).toBe('你好世界'); // Under maxLength
      });
    });

    describe('error handling', () => {
      it('should throw LSHError when maxLength less than ellipsis length', () => {
        expect(() => truncate('Hello', 2, '...')).toThrow(LSHError);
        try {
          truncate('Hello', 2, '...');
        } catch (error) {
          expect(error).toBeInstanceOf(LSHError);
          if (error instanceof LSHError) {
            expect(error.code).toBe(ErrorCodes.VALIDATION_INVALID_FORMAT);
            expect(error.context?.maxLength).toBe(2);
            expect(error.context?.ellipsisLength).toBe(3);
          }
        }
      });

      it('should not throw when maxLength equals ellipsis length', () => {
        expect(() => truncate('Hello', 3, '...')).not.toThrow();
      });
    });
  });

  describe('escapeRegex', () => {
    describe('special characters', () => {
      it('should escape dot', () => {
        expect(escapeRegex('test.file')).toBe('test\\.file');
      });

      it('should escape asterisk', () => {
        expect(escapeRegex('*.txt')).toBe('\\*\\.txt');
      });

      it('should escape plus', () => {
        expect(escapeRegex('a+b')).toBe('a\\+b');
      });

      it('should escape question mark', () => {
        expect(escapeRegex('file?')).toBe('file\\?');
      });

      it('should escape caret', () => {
        expect(escapeRegex('^start')).toBe('\\^start');
      });

      it('should escape dollar sign', () => {
        expect(escapeRegex('end$')).toBe('end\\$');
      });

      it('should escape curly braces', () => {
        expect(escapeRegex('{a,b}')).toBe('\\{a,b\\}');
      });

      it('should escape parentheses', () => {
        expect(escapeRegex('(group)')).toBe('\\(group\\)');
      });

      it('should escape pipe', () => {
        expect(escapeRegex('a|b')).toBe('a\\|b');
      });

      it('should escape square brackets', () => {
        expect(escapeRegex('[abc]')).toBe('\\[abc\\]');
      });

      it('should escape backslash', () => {
        expect(escapeRegex('path\\file')).toBe('path\\\\file');
      });
    });

    describe('combined patterns', () => {
      it('should escape multiple special characters', () => {
        expect(escapeRegex('*.{js,ts}')).toBe('\\*\\.\\{js,ts\\}');
      });

      it('should escape regex pattern', () => {
        expect(escapeRegex('^test$')).toBe('\\^test\\$');
      });

      it('should escape complex pattern', () => {
        expect(escapeRegex('[a-z]+(\\d+)?')).toBe('\\[a-z\\]\\+\\(\\\\d\\+\\)\\?');
      });
    });

    describe('edge cases', () => {
      it('should handle empty string', () => {
        expect(escapeRegex('')).toBe('');
      });

      it('should not modify plain text', () => {
        expect(escapeRegex('hello world')).toBe('hello world');
      });

      it('should handle numbers', () => {
        expect(escapeRegex('12345')).toBe('12345');
      });

      it('should handle unicode', () => {
        expect(escapeRegex('你好')).toBe('你好');
      });
    });

    describe('usage validation', () => {
      it('should produce valid regex pattern', () => {
        const specialString = 'test.file(1)';
        const escaped = escapeRegex(specialString);
        const regex = new RegExp(escaped);
        expect(regex.test(specialString)).toBe(true);
        expect(regex.test('testXfile11')).toBe(false);
      });

      it('should match exact string with all special chars', () => {
        const specialString = '.*+?^${}()|[]\\';
        const escaped = escapeRegex(specialString);
        const regex = new RegExp(`^${escaped}$`);
        expect(regex.test(specialString)).toBe(true);
      });
    });
  });

  describe('pluralize', () => {
    describe('regular pluralization', () => {
      it('should return singular for count 1', () => {
        expect(pluralize(1, 'job')).toBe('1 job');
      });

      it('should return plural for count 0', () => {
        expect(pluralize(0, 'job')).toBe('0 jobs');
      });

      it('should return plural for count > 1', () => {
        expect(pluralize(5, 'job')).toBe('5 jobs');
        expect(pluralize(100, 'item')).toBe('100 items');
      });

      it('should return plural for negative counts', () => {
        expect(pluralize(-1, 'point')).toBe('-1 points');
        expect(pluralize(-5, 'degree')).toBe('-5 degrees');
      });
    });

    describe('custom plural forms', () => {
      it('should use custom plural', () => {
        expect(pluralize(2, 'query', 'queries')).toBe('2 queries');
      });

      it('should use custom plural for count 0', () => {
        expect(pluralize(0, 'child', 'children')).toBe('0 children');
      });

      it('should use singular for count 1 with custom plural', () => {
        expect(pluralize(1, 'person', 'people')).toBe('1 person');
      });

      it('should handle irregular plurals', () => {
        expect(pluralize(3, 'mouse', 'mice')).toBe('3 mice');
        expect(pluralize(2, 'foot', 'feet')).toBe('2 feet');
        expect(pluralize(4, 'goose', 'geese')).toBe('4 geese');
      });
    });

    describe('edge cases', () => {
      it('should handle large numbers', () => {
        expect(pluralize(1000000, 'record')).toBe('1000000 records');
      });

      it('should handle decimal numbers', () => {
        // Decimal 1.0 is still !== 1 in strict comparison context
        expect(pluralize(1.5, 'hour')).toBe('1.5 hours');
        expect(pluralize(0.5, 'day')).toBe('0.5 days');
      });

      it('should handle words ending in s', () => {
        expect(pluralize(2, 'bus', 'buses')).toBe('2 buses');
      });

      it('should handle words ending in y', () => {
        expect(pluralize(3, 'category', 'categories')).toBe('3 categories');
      });
    });

    describe('practical examples', () => {
      it('should format job counts', () => {
        expect(pluralize(0, 'job')).toBe('0 jobs');
        expect(pluralize(1, 'job')).toBe('1 job');
        expect(pluralize(42, 'job')).toBe('42 jobs');
      });

      it('should format error counts', () => {
        expect(pluralize(0, 'error')).toBe('0 errors');
        expect(pluralize(1, 'error')).toBe('1 error');
        expect(pluralize(3, 'error')).toBe('3 errors');
      });

      it('should format time units', () => {
        expect(pluralize(1, 'second')).toBe('1 second');
        expect(pluralize(30, 'second')).toBe('30 seconds');
        expect(pluralize(1, 'minute')).toBe('1 minute');
        expect(pluralize(5, 'minute')).toBe('5 minutes');
      });
    });
  });
});
