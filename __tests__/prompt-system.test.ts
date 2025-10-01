/**
 * Prompt System Tests
 * Tests for ZSH-style prompt expansion and formatting
 */

import { PromptSystem, PromptContext } from '../src/lib/prompt-system';

describe('PromptSystem', () => {
  let promptSystem: PromptSystem;

  beforeEach(() => {
    promptSystem = new PromptSystem();
  });

  describe('Basic Prompt Expansion', () => {
    test('should expand username (%n)', () => {
      const result = promptSystem.expandPrompt('%n', { user: 'testuser' });
      expect(result).toBe('testuser');
    });

    test('should expand hostname (%m)', () => {
      const result = promptSystem.expandPrompt('%m', { host: 'localhost' });
      expect(result).toBe('localhost');
    });

    test('should expand short hostname (%M)', () => {
      const result = promptSystem.expandPrompt('%M', { host: 'localhost.local' });
      expect(result).toBe('localhost');
    });

    test('should expand tilde path (%~)', () => {
      const result = promptSystem.expandPrompt('%~', {
        cwd: '/home/user/projects',
        home: '/home/user'
      });
      expect(result).toBe('~/projects');
    });

    test('should expand full path (%d)', () => {
      const result = promptSystem.expandPrompt('%d', { cwd: '/home/user/projects' });
      expect(result).toBe('/home/user/projects');
    });
  });

  describe('Exit Code Expansion - Regression Test', () => {
    /**
     * CRITICAL: This test covers the bug where /%?/g was not properly escaped,
     * causing it to match every character and insert the exit code between them.
     *
     * Bug behavior: "user@host:~$ " -> "0u0s0e0r0@0h0o0s0t0:0~0$0 0"
     * Fixed behavior: "user@host:~$ " -> "user@host:~$ " (no change, %? not in template)
     *
     * The regex /%?/g was matching "%" followed by zero or one character,
     * instead of matching the literal sequence "%?".
     */
    test('should not corrupt prompt when exit code is 0', () => {
      const result = promptSystem.expandPrompt('%n@%m:%~$ ', {
        user: 'lefv',
        host: 'localhost',
        cwd: '/home/lefv',
        home: '/home/lefv',
        exitCode: 0
      });

      // Should NOT contain zeros between characters
      expect(result).toBe('lefv@localhost:~$ ');
      expect(result).not.toContain('0l0e0f0v');
    });

    test('should expand exit code (%?) correctly', () => {
      const result = promptSystem.expandPrompt('exit:%? ', { exitCode: 42 });
      expect(result).toBe('exit:42 ');
    });

    test('should expand exit code (%L) correctly', () => {
      const result = promptSystem.expandPrompt('last:%L ', { exitCode: 1 });
      expect(result).toBe('last:1 ');
    });

    test('should handle exit code 0', () => {
      const result = promptSystem.expandPrompt('%?', { exitCode: 0 });
      expect(result).toBe('0');
    });

    test('should handle non-zero exit code', () => {
      const result = promptSystem.expandPrompt('%?', { exitCode: 127 });
      expect(result).toBe('127');
    });
  });

  describe('Special Characters', () => {
    test('should expand prompt character (%#) for regular user', () => {
      const result = promptSystem.expandPrompt('%#', { user: 'testuser' });
      expect(result).toBe('$');
    });

    test('should expand prompt character (%#) for root', () => {
      const result = promptSystem.expandPrompt('%#', { user: 'root' });
      expect(result).toBe('#');
    });

    test('should expand dollar sign (%$) for regular user', () => {
      const result = promptSystem.expandPrompt('%$', { user: 'testuser' });
      expect(result).toBe('$');
    });

    test('should expand dollar sign (%$) for root', () => {
      const result = promptSystem.expandPrompt('%$', { user: 'root' });
      expect(result).toBe('#');
    });

    test('should expand literal percent (%%) ', () => {
      const result = promptSystem.expandPrompt('%%', {});
      expect(result).toBe('%');
    });
  });

  describe('Job Count', () => {
    test('should expand job count (%h)', () => {
      const result = promptSystem.expandPrompt('%h', { jobCount: 3 });
      expect(result).toBe('3');
    });

    test('should expand job count (%j)', () => {
      const result = promptSystem.expandPrompt('%j', { jobCount: 0 });
      expect(result).toBe('0');
    });
  });

  describe('Complex Prompts', () => {
    test('should handle default prompt format', () => {
      const result = promptSystem.expandPrompt('%n@%m:%~$ ', {
        user: 'user',
        host: 'machine',
        cwd: '/home/user',
        home: '/home/user',
        exitCode: 0,
        jobCount: 0,
        time: new Date('2025-01-01T10:00:00')
      });

      expect(result).toBe('user@machine:~$ ');
    });

    test('should handle detailed prompt with exit code and job count', () => {
      const result = promptSystem.expandPrompt('[%?] %n@%m:%~ (%h) %$ ', {
        user: 'dev',
        host: 'server',
        cwd: '/var/www',
        home: '/home/dev',
        exitCode: 1,
        jobCount: 2,
        time: new Date()
      });

      expect(result).toBe('[1] dev@server:/var/www (2) $ ');
    });

    test('should not insert characters when prompt has no special sequences', () => {
      const result = promptSystem.expandPrompt('simple> ', {
        user: 'testuser',
        host: 'testhost',
        exitCode: 0
      });

      expect(result).toBe('simple> ');
      expect(result).not.toContain('0');
    });
  });

  describe('Theme Support', () => {
    test('should use default theme', () => {
      const result = promptSystem.getCurrentPrompt({
        user: 'test',
        host: 'host',
        cwd: '/home/test',
        home: '/home/test',
        exitCode: 0,
        jobCount: 0,
        time: new Date()
      });

      expect(result).toBe('test@host:~$ ');
    });

    test('should switch themes', () => {
      const switched = promptSystem.setTheme('minimal');
      expect(switched).toBe(true);

      const result = promptSystem.getCurrentPrompt({});
      expect(result).toBe('$ ');
    });

    test('should return false for invalid theme', () => {
      const switched = promptSystem.setTheme('nonexistent');
      expect(switched).toBe(false);
    });

    test('should list available themes', () => {
      const themes = promptSystem.getAvailableThemes();
      expect(themes).toContain('default');
      expect(themes).toContain('minimal');
      expect(themes).toContain('detailed');
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty prompt', () => {
      const result = promptSystem.expandPrompt('', {});
      expect(result).toBe('');
    });

    test('should handle prompt with only literals', () => {
      const result = promptSystem.expandPrompt('>>> ', {});
      expect(result).toBe('>>> ');
    });

    test('should use default context when partial context provided', () => {
      const result = promptSystem.expandPrompt('%n@%m', {});

      // Should use defaults from constructor context
      expect(typeof result).toBe('string');
      expect(result).toContain('@');
    });

    test('should handle very long usernames', () => {
      const longUser = 'a'.repeat(100);
      const result = promptSystem.expandPrompt('%n', { user: longUser });
      expect(result).toBe(longUser);
    });
  });

  describe('Regex Special Characters Safety', () => {
    test('should not interpret ? as regex quantifier', () => {
      // The core bug: /%?/g was matching % followed by 0 or 1 chars
      const result = promptSystem.expandPrompt('test %? end', { exitCode: 5 });
      expect(result).toBe('test 5 end');
      expect(result).not.toMatch(/0t0e0s0t/); // Should not have zeros between chars
    });

    test('should not interpret $ as regex end-of-line', () => {
      const result = promptSystem.expandPrompt('%$ ', { user: 'test' });
      expect(result).toBe('$ ');
    });

    test('should handle ~ without treating it as special', () => {
      const result = promptSystem.expandPrompt('%~', {
        cwd: '/root',
        home: '/home/user'
      });
      expect(result).toBe('/root'); // No tilde expansion since cwd != home
    });
  });
});
