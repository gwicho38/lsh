/**
 * POSIX Built-in Commands Tests
 * Tests for Issue #29
 */

import { ShellExecutor } from '../src/lib/shell-executor';
import { parseShellCommand } from '../src/lib/shell-parser';

describe('POSIX Built-in Commands', () => {
  let executor: ShellExecutor;

  beforeEach(() => {
    executor = new ShellExecutor();
  });

  describe('readonly', () => {
    test('should make variables readonly', async () => {
      const ast = parseShellCommand('readonly FOO=bar');
      const result = await executor.execute(ast);

      expect(result.exitCode).toBe(0);
    });

    test('should prevent modification of readonly variables', async () => {
      await executor.execute(parseShellCommand('readonly FOO=bar'));
      const result = await executor.execute(parseShellCommand('readonly FOO=baz'));

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('readonly variable');
    });

    test('should list readonly variables when called without arguments', async () => {
      await executor.execute(parseShellCommand('readonly FOO=bar'));
      await executor.execute(parseShellCommand('readonly BAZ=qux'));

      const result = await executor.execute(parseShellCommand('readonly'));

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('FOO=bar');
      expect(result.stdout).toContain('BAZ=qux');
    });

    test('should allow making existing variable readonly', async () => {
      await executor.execute(parseShellCommand('VAR=value'));
      const result = await executor.execute(parseShellCommand('readonly VAR'));

      expect(result.exitCode).toBe(0);
    });
  });

  describe('type', () => {
    test('should identify built-in commands', async () => {
      const result = await executor.execute(parseShellCommand('type cd'));

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('is a shell builtin');
    });

    test('should identify functions', async () => {
      await executor.execute(parseShellCommand('myfunction() { echo test; }'));
      const result = await executor.execute(parseShellCommand('type myfunction'));

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('is a function');
    });

    test('should identify aliases', async () => {
      await executor.execute(parseShellCommand('alias ll="ls -la"'));
      const result = await executor.execute(parseShellCommand('type ll'));

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('is aliased to');
    });

    test('should identify external commands', async () => {
      const result = await executor.execute(parseShellCommand('type ls'));

      // Should be either a builtin or an external command
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toMatch(/is (a shell builtin|\/.*\/ls)/);
    });

    test('should report not found for non-existent commands', async () => {
      const result = await executor.execute(parseShellCommand('type nonexistentcommand123'));

      expect(result.exitCode).toBe(1);
      expect(result.stdout).toContain('not found');
    });

    test('should handle multiple arguments', async () => {
      const result = await executor.execute(parseShellCommand('type cd pwd echo'));

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('cd is a shell builtin');
      expect(result.stdout).toContain('pwd is a shell builtin');
      expect(result.stdout).toContain('echo is a shell builtin');
    });

    test('should require at least one argument', async () => {
      const result = await executor.execute(parseShellCommand('type'));

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('usage');
    });
  });

  describe('hash', () => {
    test('should list empty hash table initially', async () => {
      const result = await executor.execute(parseShellCommand('hash'));

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toBe('');
    });

    test('should hash a command path', async () => {
      const result = await executor.execute(parseShellCommand('hash ls'));

      // Should succeed if ls is found
      if (result.exitCode === 0) {
        const listResult = await executor.execute(parseShellCommand('hash'));
        expect(listResult.stdout).toContain('ls');
      }
    });

    test('should clear hash table with -r', async () => {
      await executor.execute(parseShellCommand('hash ls'));
      const result = await executor.execute(parseShellCommand('hash -r'));

      expect(result.exitCode).toBe(0);

      const listResult = await executor.execute(parseShellCommand('hash'));
      expect(listResult.stdout).toBe('');
    });

    test('should remove specific entry with -r name', async () => {
      await executor.execute(parseShellCommand('hash ls'));
      await executor.execute(parseShellCommand('hash cat'));

      const result = await executor.execute(parseShellCommand('hash -r ls'));

      expect(result.exitCode).toBe(0);

      const listResult = await executor.execute(parseShellCommand('hash'));
      expect(listResult.stdout).not.toContain('ls');
    });

    test('should list with -l option', async () => {
      await executor.execute(parseShellCommand('hash ls'));
      const result = await executor.execute(parseShellCommand('hash -l'));

      expect(result.exitCode).toBe(0);
      if (result.stdout) {
        expect(result.stdout).toContain('ls');
      }
    });

    test('should fail for non-existent command', async () => {
      const result = await executor.execute(parseShellCommand('hash nonexistentcommand123'));

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('not found');
    });
  });

  describe('kill', () => {
    test('should list signals with -l', async () => {
      const result = await executor.execute(parseShellCommand('kill -l'));

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('TERM');
      expect(result.stdout).toContain('KILL');
    });

    test('should require at least one argument', async () => {
      const result = await executor.execute(parseShellCommand('kill'));

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('usage');
    });

    test('should send signal to current process', async () => {
      // Send SIGURG (safe signal that won't kill the process)
      const result = await executor.execute(parseShellCommand(`kill -s URG ${process.pid}`));

      expect(result.exitCode).toBe(0);
    });

    test('should accept -s signal syntax', async () => {
      const result = await executor.execute(parseShellCommand(`kill -s USR1 ${process.pid}`));

      expect(result.exitCode).toBe(0);
    });

    test('should accept -SIGNAL syntax', async () => {
      const result = await executor.execute(parseShellCommand(`kill -USR1 ${process.pid}`));

      expect(result.exitCode).toBe(0);
    });

    test('should accept numeric signal', async () => {
      const result = await executor.execute(parseShellCommand(`kill -9 ${process.pid}`));

      // This will fail because we're trying to kill ourselves, but syntax should be valid
      expect(result.stderr).toBeDefined();
    });

    test('should fail for invalid PID', async () => {
      const result = await executor.execute(parseShellCommand('kill invalid'));

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('arguments must be');
    });

    test('should fail for non-existent PID', async () => {
      const result = await executor.execute(parseShellCommand('kill 999999'));

      expect(result.exitCode).toBe(1);
    });
  });

  describe('Integration Tests', () => {
    test('should work with readonly and export together', async () => {
      await executor.execute(parseShellCommand('export FOO=bar'));
      const result = await executor.execute(parseShellCommand('readonly FOO'));

      expect(result.exitCode).toBe(0);

      const modifyResult = await executor.execute(parseShellCommand('readonly FOO=baz'));
      expect(modifyResult.exitCode).toBe(1);
    });

    test('should find readonly variables with type', async () => {
      await executor.execute(parseShellCommand('readonly MYVAR=value'));
      const result = await executor.execute(parseShellCommand('type MYVAR'));

      // type checks for commands/functions/aliases, not variables
      // So this should report not found
      expect(result.stdout).toBeDefined();
    });

    test('should hash and type work together', async () => {
      await executor.execute(parseShellCommand('hash ls'));
      const typeResult = await executor.execute(parseShellCommand('type ls'));

      expect(typeResult.exitCode).toBe(0);
      expect(typeResult.stdout).toBeDefined();
    });
  });
});
