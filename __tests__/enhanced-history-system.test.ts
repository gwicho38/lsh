/**
 * Enhanced History System Tests
 * Tests for the enhanced history system with cloud sync
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('EnhancedHistorySystem', () => {
  let EnhancedHistorySystem: typeof import('../src/lib/enhanced-history-system.js').EnhancedHistorySystem;
  let tempDir: string;
  let historyPath: string;

  beforeAll(async () => {
    const module = await import('../src/lib/enhanced-history-system.js');
    EnhancedHistorySystem = module.EnhancedHistorySystem;
  });

  beforeEach(() => {
    // Create a temporary directory for test history files
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'enhanced-history-test-'));
    historyPath = path.join(tempDir, '.lsh_history');
  });

  afterEach(() => {
    // Clean up temp directory
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('Constructor', () => {
    it('should create instance with defaults', () => {
      const history = new EnhancedHistorySystem({
        filePath: historyPath,
        enableCloudSync: false,
      });
      expect(history).toBeDefined();
    });

    it('should create instance with custom config', () => {
      const history = new EnhancedHistorySystem({
        maxSize: 5000,
        filePath: historyPath,
        enableCloudSync: false,
        syncInterval: 60000,
      });
      expect(history).toBeDefined();
    });

    it('should create instance with userId', () => {
      const history = new EnhancedHistorySystem({
        filePath: historyPath,
        enableCloudSync: false,
        userId: 'test-user',
      });
      expect(history).toBeDefined();
    });
  });

  describe('Basic History Operations', () => {
    it('should add commands to history', () => {
      const history = new EnhancedHistorySystem({
        filePath: historyPath,
        enableCloudSync: false,
      });

      history.addCommand('ls -la');
      history.addCommand('cd /tmp');

      const entries = history.getAllEntries();
      expect(entries.length).toBe(2);
    });

    it('should get all entries', () => {
      const history = new EnhancedHistorySystem({
        filePath: historyPath,
        enableCloudSync: false,
      });

      history.addCommand('command1');
      history.addCommand('command2');
      history.addCommand('command3');

      const entries = history.getAllEntries();
      expect(entries.length).toBe(3);
      expect(entries.map(e => e.command)).toContain('command1');
      expect(entries.map(e => e.command)).toContain('command2');
      expect(entries.map(e => e.command)).toContain('command3');
    });

    it('should search history', () => {
      const history = new EnhancedHistorySystem({
        filePath: historyPath,
        enableCloudSync: false,
      });

      history.addCommand('git status');
      history.addCommand('git commit -m "test"');
      history.addCommand('npm install');
      history.addCommand('git push');

      const results = history.searchHistory('git');
      expect(results.length).toBe(3);
    });
  });

  describe('Duplicate Handling', () => {
    it('should respect ignoreDups option', () => {
      const history = new EnhancedHistorySystem({
        filePath: historyPath,
        enableCloudSync: false,
        ignoreDups: true,
      });

      history.addCommand('duplicate command');
      history.addCommand('duplicate command');
      history.addCommand('duplicate command');

      const entries = history.getAllEntries();
      // With ignoreDups, duplicates are removed so only 1 remains
      expect(entries.length).toBe(1);
    });

    it('should respect ignoreSpace option', () => {
      const history = new EnhancedHistorySystem({
        filePath: historyPath,
        enableCloudSync: false,
        ignoreSpace: true,
      });

      history.addCommand(' space-prefixed command');
      const entries = history.getAllEntries();
      // Commands starting with space are ignored
      expect(entries.length).toBe(0);
    });
  });

  describe('Entry Metadata', () => {
    it('should include timestamp in entries', () => {
      const history = new EnhancedHistorySystem({
        filePath: historyPath,
        enableCloudSync: false,
      });

      const beforeAdd = Date.now();
      history.addCommand('test command');
      const afterAdd = Date.now();

      const entries = history.getAllEntries();
      expect(entries.length).toBe(1);
      expect(entries[0].timestamp).toBeGreaterThanOrEqual(beforeAdd);
      expect(entries[0].timestamp).toBeLessThanOrEqual(afterAdd);
    });

    it('should include lineNumber in entries', () => {
      const history = new EnhancedHistorySystem({
        filePath: historyPath,
        enableCloudSync: false,
      });

      history.addCommand('command1');
      history.addCommand('command2');

      const entries = history.getAllEntries();
      expect(entries[0]).toHaveProperty('lineNumber');
      expect(entries[1]).toHaveProperty('lineNumber');
    });
  });

  describe('History Navigation', () => {
    it('should get previous and next commands', () => {
      const history = new EnhancedHistorySystem({
        filePath: historyPath,
        enableCloudSync: false,
      });

      history.addCommand('first');
      history.addCommand('second');
      history.addCommand('third');

      // Navigate backward
      const prev1 = history.getPreviousCommand();
      expect(prev1).toBe('second');

      const prev2 = history.getPreviousCommand();
      expect(prev2).toBe('first');

      // Navigate forward
      const next1 = history.getNextCommand();
      expect(next1).toBe('second');
    });

    it('should reset index', () => {
      const history = new EnhancedHistorySystem({
        filePath: historyPath,
        enableCloudSync: false,
      });

      history.addCommand('command1');
      history.addCommand('command2');

      history.getPreviousCommand();
      history.resetIndex();

      // After reset, getPreviousCommand should return the second-to-last
      const prev = history.getPreviousCommand();
      expect(prev).toBe('command1');
    });
  });
});
