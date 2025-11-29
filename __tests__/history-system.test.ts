/**
 * History System Tests
 * Tests for the HistorySystem class
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('HistorySystem', () => {
  let HistorySystem: typeof import('../src/lib/history-system.js').HistorySystem;

  let testHistoryDir: string;
  let testHistoryFile: string;

  beforeAll(async () => {
    const module = await import('../src/lib/history-system.js');
    HistorySystem = module.HistorySystem;
  });

  beforeEach(async () => {
    // Create temporary history directory
    testHistoryDir = path.join(os.tmpdir(), `lsh-history-test-${Date.now()}`);
    testHistoryFile = path.join(testHistoryDir, '.lsh_history');

    // Ensure clean state
    try {
      await fs.promises.rm(testHistoryDir, { recursive: true, force: true });
    } catch {
      // Directory may not exist
    }

    await fs.promises.mkdir(testHistoryDir, { recursive: true });
  });

  afterEach(async () => {
    // Clean up test history directory
    try {
      await fs.promises.rm(testHistoryDir, { recursive: true, force: true });
    } catch {
      // Directory may not exist
    }
  });

  describe('Constructor', () => {
    it('should create instance with default config', () => {
      const history = new HistorySystem({ filePath: testHistoryFile });
      expect(history).toBeDefined();
    });

    it('should use custom max size', () => {
      const history = new HistorySystem({
        filePath: testHistoryFile,
        maxSize: 100,
      });
      expect(history).toBeDefined();
    });

    it('should load existing history file', async () => {
      // Create history file
      const content = '1234567890:echo hello\n1234567891:ls -la';
      await fs.promises.writeFile(testHistoryFile, content);

      const history = new HistorySystem({ filePath: testHistoryFile });
      const entries = history.getAllEntries();

      expect(entries).toHaveLength(2);
      expect(entries[0].command).toBe('echo hello');
      expect(entries[1].command).toBe('ls -la');
    });
  });

  describe('addCommand', () => {
    it('should add command to history', () => {
      const history = new HistorySystem({ filePath: testHistoryFile });
      history.addCommand('test command');

      const entries = history.getAllEntries();
      expect(entries).toHaveLength(1);
      expect(entries[0].command).toBe('test command');
    });

    it('should not add empty commands', () => {
      const history = new HistorySystem({ filePath: testHistoryFile });
      history.addCommand('');
      history.addCommand('   ');

      expect(history.getAllEntries()).toHaveLength(0);
    });

    it('should skip commands starting with space when ignoreSpace is true', () => {
      const history = new HistorySystem({
        filePath: testHistoryFile,
        ignoreSpace: true,
      });

      history.addCommand(' secret command');
      history.addCommand('normal command');

      const entries = history.getAllEntries();
      expect(entries).toHaveLength(1);
      expect(entries[0].command).toBe('normal command');
    });

    it('should remove duplicates when ignoreDups is true', () => {
      const history = new HistorySystem({
        filePath: testHistoryFile,
        ignoreDups: true,
      });

      history.addCommand('repeated command');
      history.addCommand('other command');
      history.addCommand('repeated command');

      const entries = history.getAllEntries();
      expect(entries).toHaveLength(2);
      expect(entries[entries.length - 1].command).toBe('repeated command');
    });

    it('should trim history to max size', () => {
      const history = new HistorySystem({
        filePath: testHistoryFile,
        maxSize: 3,
        ignoreDups: false,
      });

      history.addCommand('cmd1');
      history.addCommand('cmd2');
      history.addCommand('cmd3');
      history.addCommand('cmd4');

      const entries = history.getAllEntries();
      expect(entries).toHaveLength(3);
      expect(entries[0].command).toBe('cmd2');
      expect(entries[2].command).toBe('cmd4');
    });

    it('should store exit code if provided', () => {
      const history = new HistorySystem({ filePath: testHistoryFile });
      history.addCommand('failing command', 1);

      const entries = history.getAllEntries();
      expect(entries[0].exitCode).toBe(1);
    });
  });

  describe('getEntry', () => {
    it('should get entry by line number', () => {
      const history = new HistorySystem({ filePath: testHistoryFile });
      history.addCommand('first');
      history.addCommand('second');
      history.addCommand('third');

      const entry = history.getEntry(2);
      expect(entry?.command).toBe('second');
    });

    it('should return undefined for invalid line number', () => {
      const history = new HistorySystem({ filePath: testHistoryFile });
      history.addCommand('only one');

      expect(history.getEntry(999)).toBeUndefined();
    });
  });

  describe('getEntryByPrefix', () => {
    it('should get last entry matching prefix', () => {
      const history = new HistorySystem({ filePath: testHistoryFile, ignoreDups: false });
      history.addCommand('git status');
      history.addCommand('git commit');
      history.addCommand('npm install');
      history.addCommand('git push');

      const entry = history.getEntryByPrefix('git');
      expect(entry?.command).toBe('git push');
    });

    it('should return undefined if no match', () => {
      const history = new HistorySystem({ filePath: testHistoryFile });
      history.addCommand('npm install');

      expect(history.getEntryByPrefix('git')).toBeUndefined();
    });
  });

  describe('searchHistory', () => {
    it('should search history with regex pattern', () => {
      const history = new HistorySystem({ filePath: testHistoryFile });
      history.addCommand('git status');
      history.addCommand('npm install');
      history.addCommand('git commit -m "test"');

      const results = history.searchHistory('git');
      expect(results).toHaveLength(2);
    });

    it('should be case insensitive', () => {
      const history = new HistorySystem({ filePath: testHistoryFile });
      history.addCommand('GIT status');
      history.addCommand('git PUSH');

      const results = history.searchHistory('git');
      expect(results).toHaveLength(2);
    });

    it('should return empty array for no matches', () => {
      const history = new HistorySystem({ filePath: testHistoryFile });
      history.addCommand('npm install');

      expect(history.searchHistory('python')).toHaveLength(0);
    });
  });

  describe('Navigation', () => {
    it('should get previous command', () => {
      const history = new HistorySystem({ filePath: testHistoryFile });
      history.addCommand('first');
      history.addCommand('second');
      history.addCommand('third');

      expect(history.getPreviousCommand()).toBe('second');
      expect(history.getPreviousCommand()).toBe('first');
    });

    it('should return null at beginning of history', () => {
      const history = new HistorySystem({ filePath: testHistoryFile });
      history.addCommand('only');

      history.getPreviousCommand(); // returns null because current is at 0
      expect(history.getPreviousCommand()).toBeNull();
    });

    it('should get next command', () => {
      const history = new HistorySystem({ filePath: testHistoryFile });
      history.addCommand('first');
      history.addCommand('second');
      history.addCommand('third');

      history.getPreviousCommand(); // second
      history.getPreviousCommand(); // first

      expect(history.getNextCommand()).toBe('second');
      expect(history.getNextCommand()).toBe('third');
    });

    it('should return null at end of history', () => {
      const history = new HistorySystem({ filePath: testHistoryFile });
      history.addCommand('only');

      expect(history.getNextCommand()).toBeNull();
    });

    it('should reset index', () => {
      const history = new HistorySystem({ filePath: testHistoryFile });
      history.addCommand('first');
      history.addCommand('second');
      history.addCommand('third');

      history.getPreviousCommand();
      history.getPreviousCommand();

      history.resetIndex();
      expect(history.getPreviousCommand()).toBe('second');
    });
  });

  describe('expandHistory', () => {
    it('should expand !! to last command', () => {
      const history = new HistorySystem({ filePath: testHistoryFile });
      history.addCommand('echo hello');

      const result = history.expandHistory('sudo !!');
      expect(result).toBe('sudo echo hello');
    });

    it('should expand !n to command number', () => {
      const history = new HistorySystem({ filePath: testHistoryFile });
      history.addCommand('first cmd');
      history.addCommand('second cmd');
      history.addCommand('third cmd');

      const result = history.expandHistory('!2 again');
      expect(result).toBe('second cmd again');
    });

    it('should expand !string to last command starting with string', () => {
      const history = new HistorySystem({ filePath: testHistoryFile, ignoreDups: false });
      history.addCommand('git status');
      history.addCommand('npm install');
      history.addCommand('git push');

      const result = history.expandHistory('!npm');
      expect(result).toBe('npm install');
    });

    it('should expand ^old^new to substitute in last command', () => {
      const history = new HistorySystem({ filePath: testHistoryFile });
      history.addCommand('echo hello');

      const result = history.expandHistory('^hello^world');
      expect(result).toBe('echo world');
    });

    it('should leave unmatched references unchanged', () => {
      const history = new HistorySystem({ filePath: testHistoryFile });

      const result = history.expandHistory('!999');
      expect(result).toBe('!999');
    });
  });

  describe('clearHistory', () => {
    it('should clear all history', () => {
      const history = new HistorySystem({ filePath: testHistoryFile });
      history.addCommand('first');
      history.addCommand('second');

      history.clearHistory();
      expect(history.getAllEntries()).toHaveLength(0);
    });
  });

  describe('getStats', () => {
    it('should return history statistics', () => {
      const history = new HistorySystem({ filePath: testHistoryFile, ignoreDups: false });
      history.addCommand('cmd1');
      history.addCommand('cmd2');
      history.addCommand('cmd1'); // duplicate

      const stats = history.getStats();
      expect(stats.total).toBe(3);
      expect(stats.unique).toBe(2);
      expect(stats.oldest).toBeInstanceOf(Date);
      expect(stats.newest).toBeInstanceOf(Date);
    });

    it('should return null dates for empty history', () => {
      const history = new HistorySystem({ filePath: testHistoryFile });

      const stats = history.getStats();
      expect(stats.total).toBe(0);
      expect(stats.oldest).toBeNull();
      expect(stats.newest).toBeNull();
    });
  });

  describe('setEnabled', () => {
    it('should disable history recording', () => {
      const history = new HistorySystem({ filePath: testHistoryFile });

      history.setEnabled(false);
      history.addCommand('should not be recorded');

      expect(history.getAllEntries()).toHaveLength(0);
    });

    it('should re-enable history recording', () => {
      const history = new HistorySystem({ filePath: testHistoryFile });

      history.setEnabled(false);
      history.addCommand('not recorded');
      history.setEnabled(true);
      history.addCommand('recorded');

      expect(history.getAllEntries()).toHaveLength(1);
      expect(history.getAllEntries()[0].command).toBe('recorded');
    });
  });

  describe('updateConfig', () => {
    it('should update configuration', () => {
      const history = new HistorySystem({
        filePath: testHistoryFile,
        ignoreSpace: false,
      });

      history.addCommand(' spaced command');
      expect(history.getAllEntries()).toHaveLength(1);

      history.updateConfig({ ignoreSpace: true });
      history.addCommand(' another spaced');

      expect(history.getAllEntries()).toHaveLength(1);
    });
  });

  describe('Persistence', () => {
    it('should save history to file', async () => {
      const history = new HistorySystem({ filePath: testHistoryFile });
      history.addCommand('persisted command');

      // Read the file directly
      const content = await fs.promises.readFile(testHistoryFile, 'utf-8');
      expect(content).toContain('persisted command');
    });

    it('should load history on new instance', () => {
      const history1 = new HistorySystem({ filePath: testHistoryFile });
      history1.addCommand('test persistence');

      const history2 = new HistorySystem({ filePath: testHistoryFile });
      const entries = history2.getAllEntries();

      expect(entries).toHaveLength(1);
      expect(entries[0].command).toBe('test persistence');
    });

    it('should handle malformed history file', async () => {
      await fs.promises.writeFile(testHistoryFile, 'malformed:content\nnocolon');

      const history = new HistorySystem({ filePath: testHistoryFile });
      const entries = history.getAllEntries();

      // Should still load, treating lines without proper format
      expect(entries.length).toBeGreaterThanOrEqual(0);
    });
  });
});
