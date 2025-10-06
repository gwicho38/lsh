/**
 * Tests for LshrcManager
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { LshrcManager, initializeLshrc, lshrcExists } from '../../src/lib/lshrc-init.js';
import { ShellExecutor } from '../../src/lib/shell-executor.js';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

describe('LshrcManager', () => {
  let tempDir: string;
  let testLshrcPath: string;
  let lshrcManager: LshrcManager;
  let originalHome: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lsh-lshrc-test-'));
    testLshrcPath = path.join(tempDir, '.lshrc');
    lshrcManager = new LshrcManager(testLshrcPath);

    // Save original HOME
    originalHome = process.env.HOME || '';
  });

  afterEach(() => {
    // Restore HOME
    process.env.HOME = originalHome;

    // Clean up temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('constructor', () => {
    it('should create instance with custom path', () => {
      const manager = new LshrcManager(testLshrcPath);
      expect(manager).toBeDefined();
      expect(manager.getPath()).toBe(testLshrcPath);
    });

    it('should use default path when not specified', () => {
      process.env.HOME = tempDir;
      const manager = new LshrcManager();
      expect(manager.getPath()).toBe(path.join(tempDir, '.lshrc'));
    });
  });

  describe('getPath', () => {
    it('should return configured path', () => {
      expect(lshrcManager.getPath()).toBe(testLshrcPath);
    });
  });

  describe('exists', () => {
    it('should return false when .lshrc does not exist', () => {
      expect(lshrcManager.exists()).toBe(false);
    });

    it('should return true when .lshrc exists', () => {
      fs.writeFileSync(testLshrcPath, '# LSH Config', 'utf8');
      expect(lshrcManager.exists()).toBe(true);
    });
  });

  describe('initialize', () => {
    it('should create .lshrc if it does not exist', () => {
      const result = lshrcManager.initialize();

      expect(result).toBe(true);
      expect(fs.existsSync(testLshrcPath)).toBe(true);

      const content = fs.readFileSync(testLshrcPath, 'utf8');
      expect(content).toContain('LSH Configuration');
    });

    it('should not overwrite existing .lshrc', () => {
      const existingContent = '# My custom config\nalias test="echo test"';
      fs.writeFileSync(testLshrcPath, existingContent, 'utf8');

      const result = lshrcManager.initialize();

      expect(result).toBe(false);
      const content = fs.readFileSync(testLshrcPath, 'utf8');
      expect(content).toBe(existingContent);
    });

    it('should handle createIfMissing option', () => {
      const result = lshrcManager.initialize({ createIfMissing: false });

      expect(result).toBe(false);
      expect(fs.existsSync(testLshrcPath)).toBe(false);
    });

    it('should auto-import from ZSH when option is set', () => {
      // Create a .zshrc file
      const zshrcPath = path.join(tempDir, '.zshrc');
      fs.writeFileSync(zshrcPath, 'alias ll="ls -la"', 'utf8');
      process.env.HOME = tempDir;

      const manager = new LshrcManager();
      const result = manager.initialize({ autoImportZsh: true });

      expect(result).toBe(true);
      expect(fs.existsSync(manager.getPath())).toBe(true);

      const content = fs.readFileSync(manager.getPath(), 'utf8');
      expect(content).toContain('zsh-source');
    });
  });

  describe('enableAutoImport', () => {
    beforeEach(() => {
      lshrcManager.initialize();
    });

    it('should add auto-import configuration', () => {
      const result = lshrcManager.enableAutoImport();

      expect(result).toBe(true);

      const content = fs.readFileSync(testLshrcPath, 'utf8');
      expect(content).toContain('ZSH Auto-Import');
      expect(content).toContain('zsh-source');
    });

    it('should add auto-import with options', () => {
      const result = lshrcManager.enableAutoImport(['--no-functions', '--rename-conflicts']);

      expect(result).toBe(true);

      const content = fs.readFileSync(testLshrcPath, 'utf8');
      expect(content).toContain('--no-functions');
      expect(content).toContain('--rename-conflicts');
    });

    it('should not duplicate auto-import if already exists', () => {
      lshrcManager.enableAutoImport();
      const firstContent = fs.readFileSync(testLshrcPath, 'utf8');

      lshrcManager.enableAutoImport();
      const secondContent = fs.readFileSync(testLshrcPath, 'utf8');

      // Should not have duplicates
      const firstCount = (firstContent.match(/ZSH Auto-Import/g) || []).length;
      const secondCount = (secondContent.match(/ZSH Auto-Import/g) || []).length;
      expect(firstCount).toBe(secondCount);
    });

    it('should return false if .lshrc does not exist', () => {
      const manager = new LshrcManager(path.join(tempDir, 'nonexistent.lshrc'));
      const result = manager.enableAutoImport();

      expect(result).toBe(false);
    });
  });

  describe('disableAutoImport', () => {
    beforeEach(() => {
      lshrcManager.initialize();
      lshrcManager.enableAutoImport();
    });

    it('should remove auto-import configuration', () => {
      const result = lshrcManager.disableAutoImport();

      expect(result).toBe(true);

      const content = fs.readFileSync(testLshrcPath, 'utf8');
      expect(content).not.toContain('ZSH Auto-Import');
      expect(content).not.toContain('zsh-source');
    });

    it('should return true even if auto-import was not enabled', () => {
      lshrcManager.disableAutoImport(); // First disable
      const result = lshrcManager.disableAutoImport(); // Second disable

      expect(result).toBe(true);
    });

    it('should return false if .lshrc does not exist', () => {
      const manager = new LshrcManager(path.join(tempDir, 'nonexistent.lshrc'));
      const result = manager.disableAutoImport();

      expect(result).toBe(false);
    });
  });

  describe('source', () => {
    beforeEach(() => {
      lshrcManager.initialize();
    });

    it('should read and parse .lshrc commands', async () => {
      const lshrcContent = `
# My .lshrc
export TEST_VAR=test_value
alias myalias='echo test'
`;
      fs.writeFileSync(testLshrcPath, lshrcContent, 'utf8');

      const executor = new ShellExecutor();
      const commands = await lshrcManager.source(executor);

      expect(commands).toBeDefined();
      expect(Array.isArray(commands)).toBe(true);
      expect(commands.length).toBeGreaterThan(0);
    });

    it('should skip comments', async () => {
      const lshrcContent = `
# This is a comment
export VAR=value
# Another comment
`;
      fs.writeFileSync(testLshrcPath, lshrcContent, 'utf8');

      const executor = new ShellExecutor();
      const commands = await lshrcManager.source(executor);

      // Should only have the export command
      expect(commands.some(cmd => cmd.includes('VAR'))).toBe(true);
    });

    it('should handle empty .lshrc', async () => {
      fs.writeFileSync(testLshrcPath, '', 'utf8');

      const executor = new ShellExecutor();
      const commands = await lshrcManager.source(executor);

      expect(commands).toEqual([]);
    });

    it('should return empty array if .lshrc does not exist', async () => {
      const manager = new LshrcManager(path.join(tempDir, 'nonexistent.lshrc'));
      const executor = new ShellExecutor();
      const commands = await manager.source(executor);

      expect(commands).toEqual([]);
    });
  });

  describe('module-level functions', () => {
    describe('initializeLshrc', () => {
      it('should initialize .lshrc in HOME directory', () => {
        process.env.HOME = tempDir;

        const result = initializeLshrc();

        expect(result).toBe(true);
        expect(fs.existsSync(path.join(tempDir, '.lshrc'))).toBe(true);
      });

      it('should pass options to manager', () => {
        process.env.HOME = tempDir;

        const result = initializeLshrc({ createIfMissing: false });

        expect(result).toBe(false);
        expect(fs.existsSync(path.join(tempDir, '.lshrc'))).toBe(false);
      });
    });

    describe('lshrcExists', () => {
      it('should return false when .lshrc does not exist', () => {
        process.env.HOME = tempDir;

        expect(lshrcExists()).toBe(false);
      });

      it('should return true when .lshrc exists', () => {
        process.env.HOME = tempDir;
        fs.writeFileSync(path.join(tempDir, '.lshrc'), '# Config', 'utf8');

        expect(lshrcExists()).toBe(true);
      });
    });
  });

  describe('edge cases', () => {
    it('should handle permission errors gracefully', () => {
      // This is hard to test without actual permission changes
      // Just verify the manager doesn't crash
      const manager = new LshrcManager('/root/.lshrc');
      expect(() => manager.exists()).not.toThrow();
    });

    it('should handle very long .lshrc files', async () => {
      let longContent = '# Long .lshrc\n';
      for (let i = 0; i < 1000; i++) {
        longContent += `alias test${i}='echo ${i}'\n`;
      }
      fs.writeFileSync(testLshrcPath, longContent, 'utf8');

      const executor = new ShellExecutor();
      const commands = await lshrcManager.source(executor);

      expect(commands.length).toBeGreaterThan(0);
    });

    it('should handle special characters in config', async () => {
      const lshrcContent = `
export PATH="$PATH:/usr/local/bin"
alias say='echo "hello world"'
alias greet="echo 'hi there'"
`;
      fs.writeFileSync(testLshrcPath, lshrcContent, 'utf8');

      const executor = new ShellExecutor();
      const commands = await lshrcManager.source(executor);

      expect(commands.length).toBeGreaterThan(0);
    });

    it('should handle corrupted .lshrc gracefully', async () => {
      const corruptedContent = `
export GOOD=value
this is not valid syntax
alias test='echo test'
`;
      fs.writeFileSync(testLshrcPath, corruptedContent, 'utf8');

      const executor = new ShellExecutor();

      // Should not throw
      await expect(lshrcManager.source(executor)).resolves.toBeDefined();
    });
  });

  describe('integration', () => {
    it('should support full workflow: initialize → enable auto-import → source', async () => {
      // Step 1: Initialize
      const initResult = lshrcManager.initialize();
      expect(initResult).toBe(true);

      // Step 2: Enable auto-import
      const enableResult = lshrcManager.enableAutoImport(['--rename-conflicts']);
      expect(enableResult).toBe(true);

      // Step 3: Add custom config
      let content = fs.readFileSync(testLshrcPath, 'utf8');
      content += '\nexport MY_VAR=my_value\nalias myalias="echo test"\n';
      fs.writeFileSync(testLshrcPath, content, 'utf8');

      // Step 4: Source the config
      const executor = new ShellExecutor();
      const commands = await lshrcManager.source(executor);

      expect(commands.length).toBeGreaterThan(0);

      // Step 5: Verify auto-import is in config
      const finalContent = fs.readFileSync(testLshrcPath, 'utf8');
      expect(finalContent).toContain('ZSH Auto-Import');
      expect(finalContent).toContain('MY_VAR');
    });

    it('should support disable workflow', () => {
      // Initialize and enable
      lshrcManager.initialize();
      lshrcManager.enableAutoImport();

      let content = fs.readFileSync(testLshrcPath, 'utf8');
      expect(content).toContain('ZSH Auto-Import');

      // Disable
      lshrcManager.disableAutoImport();

      content = fs.readFileSync(testLshrcPath, 'utf8');
      expect(content).not.toContain('ZSH Auto-Import');
    });
  });
});
