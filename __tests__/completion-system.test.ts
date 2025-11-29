/**
 * Completion System Tests
 * Tests for the CompletionSystem class
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('CompletionSystem', () => {
  let CompletionSystem: typeof import('../src/lib/completion-system.js').CompletionSystem;

  let testDir: string;

  beforeAll(async () => {
    const module = await import('../src/lib/completion-system.js');
    CompletionSystem = module.CompletionSystem;
  });

  beforeEach(async () => {
    // Create temporary directory for file completion tests
    testDir = path.join(os.tmpdir(), `completion-test-${Date.now()}`);
    await fs.promises.mkdir(testDir, { recursive: true });

    // Create test files and directories
    await fs.promises.mkdir(path.join(testDir, 'subdir'));
    await fs.promises.writeFile(path.join(testDir, 'file1.txt'), 'test');
    await fs.promises.writeFile(path.join(testDir, 'file2.js'), 'test');
    await fs.promises.writeFile(path.join(testDir, '.hidden'), 'test');
  });

  afterEach(async () => {
    try {
      await fs.promises.rm(testDir, { recursive: true, force: true });
    } catch {
      // Directory may not exist
    }
  });

  describe('Constructor', () => {
    it('should create instance with default completions', () => {
      const system = new CompletionSystem();
      expect(system).toBeDefined();
    });
  });

  describe('registerCompletion', () => {
    it('should register a completion function for a command', async () => {
      const system = new CompletionSystem();

      system.registerCompletion('mycommand', async () => {
        return [{ word: 'option1', description: 'First option' }];
      });

      const context = {
        command: 'mycommand',
        args: [],
        currentWord: '',
        wordIndex: 1,
        cwd: testDir,
        env: {},
      };

      const completions = await system.getCompletions(context);
      expect(completions.some(c => c.word === 'option1')).toBe(true);
    });
  });

  describe('registerDefaultCompletion', () => {
    it('should register a default completion function', async () => {
      const system = new CompletionSystem();

      system.registerDefaultCompletion(async () => {
        return [{ word: 'default-completion', description: 'Default' }];
      });

      const context = {
        command: 'unknowncommand',
        args: [],
        currentWord: '',
        wordIndex: 0,
        cwd: testDir,
        env: {},
      };

      const completions = await system.getCompletions(context);
      expect(completions.some(c => c.word === 'default-completion')).toBe(true);
    });
  });

  describe('getCompletions', () => {
    it('should return empty array when disabled', async () => {
      const system = new CompletionSystem();
      system.setEnabled(false);

      const context = {
        command: 'test',
        args: [],
        currentWord: '',
        wordIndex: 0,
        cwd: testDir,
        env: {},
      };

      const completions = await system.getCompletions(context);
      expect(completions).toEqual([]);
    });

    it('should complete files and directories', async () => {
      const system = new CompletionSystem();

      const context = {
        command: 'ls',
        args: [],
        currentWord: 'file',
        wordIndex: 1,
        cwd: testDir,
        env: {},
      };

      const completions = await system.getCompletions(context);
      expect(completions.some(c => c.word.includes('file1.txt'))).toBe(true);
      expect(completions.some(c => c.word.includes('file2.js'))).toBe(true);
    });

    it('should complete directories for cd command', async () => {
      const system = new CompletionSystem();

      const context = {
        command: 'cd',
        args: [],
        currentWord: '',
        wordIndex: 1,
        cwd: testDir,
        env: {},
      };

      const completions = await system.getCompletions(context);
      expect(completions.some(c => c.word.includes('subdir'))).toBe(true);
      expect(completions.every(c => c.type === 'directory')).toBe(true);
    });

    it('should complete environment variables', async () => {
      const system = new CompletionSystem();

      const context = {
        command: 'echo',
        args: [],
        currentWord: '$HO',
        wordIndex: 1,
        cwd: testDir,
        env: { HOME: '/home/user', HOSTNAME: 'localhost' },
      };

      const completions = await system.getCompletions(context);
      expect(completions.some(c => c.word === '$HOME')).toBe(true);
      expect(completions.some(c => c.word === '$HOSTNAME')).toBe(true);
    });

    it('should complete built-in commands', async () => {
      const system = new CompletionSystem();

      const context = {
        command: '',
        args: [],
        currentWord: 'ec',
        wordIndex: 0,
        cwd: testDir,
        env: { PATH: '' },
      };

      const completions = await system.getCompletions(context);
      expect(completions.some(c => c.word === 'echo')).toBe(true);
    });

    it('should not complete hidden files unless pattern starts with dot', async () => {
      const system = new CompletionSystem();

      // Without dot prefix
      let context = {
        command: 'ls',
        args: [],
        currentWord: '',
        wordIndex: 1,
        cwd: testDir,
        env: {},
      };

      let completions = await system.getCompletions(context);
      expect(completions.some(c => c.word.includes('.hidden'))).toBe(false);

      // With dot prefix
      context = {
        command: 'ls',
        args: [],
        currentWord: '.hid',
        wordIndex: 1,
        cwd: testDir,
        env: {},
      };

      completions = await system.getCompletions(context);
      expect(completions.some(c => c.word.includes('.hidden'))).toBe(true);
    });

    it('should complete test command options', async () => {
      const system = new CompletionSystem();

      const context = {
        command: 'test',
        args: [],
        currentWord: '-',
        wordIndex: 1,
        cwd: testDir,
        env: {},
      };

      const completions = await system.getCompletions(context);
      expect(completions.some(c => c.word === '-f')).toBe(true);
      expect(completions.some(c => c.word === '-d')).toBe(true);
      expect(completions.some(c => c.word === '-e')).toBe(true);
    });

    it('should handle path with subdirectory', async () => {
      // Create nested file
      await fs.promises.writeFile(path.join(testDir, 'subdir', 'nested.txt'), 'test');

      const system = new CompletionSystem();

      const context = {
        command: 'cat',
        args: [],
        currentWord: 'subdir/nest',
        wordIndex: 1,
        cwd: testDir,
        env: {},
      };

      const completions = await system.getCompletions(context);
      expect(completions.some(c => c.word.includes('nested.txt'))).toBe(true);
    });
  });

  describe('setEnabled', () => {
    it('should enable/disable completions', async () => {
      const system = new CompletionSystem();

      const context = {
        command: 'test',
        args: [],
        currentWord: '',
        wordIndex: 0,
        cwd: testDir,
        env: { PATH: '' },
      };

      // Should work when enabled
      system.setEnabled(true);
      let completions = await system.getCompletions(context);
      expect(completions.length).toBeGreaterThan(0);

      // Should return empty when disabled
      system.setEnabled(false);
      completions = await system.getCompletions(context);
      expect(completions).toEqual([]);
    });
  });

  describe('filterAndSortCandidates', () => {
    it('should remove duplicates and sort by type', async () => {
      const system = new CompletionSystem();

      // Register completion that returns duplicates
      system.registerCompletion('testcmd', async () => {
        return [
          { word: 'aaa', type: 'file' },
          { word: 'bbb', type: 'directory' },
          { word: 'aaa', type: 'file' }, // duplicate
        ];
      });

      const context = {
        command: 'testcmd',
        args: [],
        currentWord: '',
        wordIndex: 1,
        cwd: testDir,
        env: {},
      };

      const completions = await system.getCompletions(context);

      // Should remove duplicate
      const aaaCount = completions.filter(c => c.word === 'aaa').length;
      expect(aaaCount).toBe(1);

      // Should sort directories before files
      const bbbIndex = completions.findIndex(c => c.word === 'bbb');
      const aaaIndex = completions.findIndex(c => c.word === 'aaa');
      expect(bbbIndex).toBeLessThan(aaaIndex);
    });
  });

  describe('Error handling', () => {
    it('should handle completion function errors gracefully', async () => {
      const system = new CompletionSystem();

      system.registerCompletion('errorcmd', async () => {
        throw new Error('Completion error');
      });

      const context = {
        command: 'errorcmd',
        args: [],
        currentWord: '',
        wordIndex: 1,
        cwd: testDir,
        env: {},
      };

      // Should not throw, should return empty or default completions
      const completions = await system.getCompletions(context);
      expect(Array.isArray(completions)).toBe(true);
    });

    it('should handle non-existent directory gracefully', async () => {
      const system = new CompletionSystem();

      const context = {
        command: 'ls',
        args: [],
        currentWord: '/nonexistent/path/',
        wordIndex: 1,
        cwd: '/nonexistent/directory',
        env: {},
      };

      const completions = await system.getCompletions(context);
      expect(Array.isArray(completions)).toBe(true);
    });
  });
});
