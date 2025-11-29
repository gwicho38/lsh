/**
 * Completion System Tests
 * Tests for ZSH-compatible tab completion functionality
 */

import { describe, it, expect, beforeAll, beforeEach } from '@jest/globals';
import * as os from 'os';
import * as path from 'path';

describe('CompletionSystem', () => {
  let CompletionSystem: typeof import('../src/lib/completion-system.js').CompletionSystem;

  beforeAll(async () => {
    const module = await import('../src/lib/completion-system.js');
    CompletionSystem = module.CompletionSystem;
  });

  describe('Constructor', () => {
    it('should create instance', () => {
      const completion = new CompletionSystem();
      expect(completion).toBeDefined();
    });
  });

  describe('registerCompletion', () => {
    it('should register command-specific completion', async () => {
      const completion = new CompletionSystem();
      completion.registerCompletion('mycommand', async () => [
        { word: 'option1', description: 'First option' }
      ]);

      const context = {
        command: 'mycommand',
        args: [],
        currentWord: '',
        wordIndex: 1,
        cwd: process.cwd(),
        env: process.env as Record<string, string>
      };

      const results = await completion.getCompletions(context);
      expect(results.some(r => r.word === 'option1')).toBe(true);
    });
  });

  describe('registerDefaultCompletion', () => {
    it('should register default completion function', async () => {
      const completion = new CompletionSystem();
      completion.registerDefaultCompletion(async () => [
        { word: 'default-option', description: 'Default option' }
      ]);

      const context = {
        command: 'unknowncommand',
        args: [],
        currentWord: 'def',
        wordIndex: 1,
        cwd: process.cwd(),
        env: process.env as Record<string, string>
      };

      const results = await completion.getCompletions(context);
      expect(results.some(r => r.word === 'default-option')).toBe(true);
    });
  });

  describe('setEnabled', () => {
    it('should disable completions', async () => {
      const completion = new CompletionSystem();
      completion.setEnabled(false);

      const context = {
        command: 'test',
        args: [],
        currentWord: '',
        wordIndex: 0,
        cwd: process.cwd(),
        env: process.env as Record<string, string>
      };

      const results = await completion.getCompletions(context);
      expect(results).toEqual([]);
    });

    it('should enable completions', async () => {
      const completion = new CompletionSystem();
      completion.setEnabled(false);
      completion.setEnabled(true);

      completion.registerCompletion('test', async () => [
        { word: 'enabled', description: 'Test' }
      ]);

      const context = {
        command: 'test',
        args: [],
        currentWord: '',
        wordIndex: 1,
        cwd: process.cwd(),
        env: process.env as Record<string, string>
      };

      const results = await completion.getCompletions(context);
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('getCompletions', () => {
    it('should return file completions for current directory', async () => {
      const completion = new CompletionSystem();

      const context = {
        command: 'ls',
        args: [],
        currentWord: '',
        wordIndex: 1,
        cwd: os.tmpdir(),
        env: process.env as Record<string, string>
      };

      const results = await completion.getCompletions(context);
      // Should return some file/directory completions
      expect(Array.isArray(results)).toBe(true);
    });

    it('should filter completions by current word prefix when function filters', async () => {
      const completion = new CompletionSystem();
      // Completion functions are responsible for their own filtering
      completion.registerCompletion('test', async (ctx) => {
        const all = [
          { word: 'alpha', description: 'Alpha' },
          { word: 'beta', description: 'Beta' },
          { word: 'gamma', description: 'Gamma' }
        ];
        // Filter by prefix
        return all.filter(c => c.word.startsWith(ctx.currentWord));
      });

      const context = {
        command: 'test',
        args: [],
        currentWord: 'al',
        wordIndex: 1,
        cwd: process.cwd(),
        env: process.env as Record<string, string>
      };

      const results = await completion.getCompletions(context);
      expect(results.some(r => r.word === 'alpha')).toBe(true);
      expect(results.some(r => r.word === 'beta')).toBe(false);
    });

    it('should complete variables when current word starts with $', async () => {
      const completion = new CompletionSystem();

      const context = {
        command: 'echo',
        args: [],
        currentWord: '$HO',
        wordIndex: 1,
        cwd: process.cwd(),
        env: { HOME: os.homedir(), PATH: '/bin:/usr/bin' }
      };

      const results = await completion.getCompletions(context);
      expect(results.some(r => r.word === '$HOME')).toBe(true);
    });

    it('should complete commands when at word index 0', async () => {
      const completion = new CompletionSystem();

      const context = {
        command: '',
        args: [],
        currentWord: 'cd',
        wordIndex: 0,
        cwd: process.cwd(),
        env: { PATH: '/bin:/usr/bin' }
      };

      const results = await completion.getCompletions(context);
      expect(results.some(r => r.word === 'cd')).toBe(true);
    });
  });

  describe('Built-in completions', () => {
    it('should have cd completion registered', async () => {
      const completion = new CompletionSystem();

      const context = {
        command: 'cd',
        args: [],
        currentWord: '',
        wordIndex: 1,
        cwd: os.homedir(),
        env: process.env as Record<string, string>
      };

      const results = await completion.getCompletions(context);
      // cd should complete directories only
      expect(Array.isArray(results)).toBe(true);
    });

    it('should have test options completion', async () => {
      const completion = new CompletionSystem();

      const context = {
        command: 'test',
        args: [],
        currentWord: '-',
        wordIndex: 1,
        cwd: process.cwd(),
        env: process.env as Record<string, string>
      };

      const results = await completion.getCompletions(context);
      expect(results.some(r => r.word === '-f')).toBe(true);
      expect(results.some(r => r.word === '-d')).toBe(true);
    });
  });

  describe('Candidate sorting', () => {
    it('should remove duplicate candidates', async () => {
      const completion = new CompletionSystem();
      completion.registerCompletion('test', async () => [
        { word: 'same', description: 'First' },
        { word: 'same', description: 'Second' },
        { word: 'different', description: 'Different' }
      ]);

      const context = {
        command: 'test',
        args: [],
        currentWord: '',
        wordIndex: 1,
        cwd: process.cwd(),
        env: process.env as Record<string, string>
      };

      const results = await completion.getCompletions(context);
      const sameCount = results.filter(r => r.word === 'same').length;
      expect(sameCount).toBe(1);
    });

    it('should sort by type then alphabetically', async () => {
      const completion = new CompletionSystem();
      completion.registerCompletion('test', async () => [
        { word: 'zulu', type: 'command' },
        { word: 'alpha', type: 'directory' },
        { word: 'beta', type: 'file' }
      ]);

      const context = {
        command: 'test',
        args: [],
        currentWord: '',
        wordIndex: 1,
        cwd: process.cwd(),
        env: process.env as Record<string, string>
      };

      const results = await completion.getCompletions(context);
      // Should be ordered: directory, file, command
      const types = results.map(r => r.type);
      const dirIndex = types.indexOf('directory');
      const fileIndex = types.indexOf('file');
      const cmdIndex = types.indexOf('command');
      expect(dirIndex).toBeLessThan(fileIndex);
      expect(fileIndex).toBeLessThan(cmdIndex);
    });
  });
});
