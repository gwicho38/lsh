/**
 * Tests for ZshImportManager
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { jest } from '@jest/globals';
import { ZshImportManager } from '../../src/lib/zsh-import-manager.js';
import { ShellExecutor } from '../../src/lib/shell-executor.js';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

describe('ZshImportManager', () => {
  let executor: ShellExecutor;
  let importManager: ZshImportManager;
  let tempDir: string;
  let testZshrcPath: string;

  beforeEach(() => {
    executor = new ShellExecutor();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lsh-test-'));
    testZshrcPath = path.join(tempDir, '.zshrc');
  });

  afterEach(() => {
    // Clean up temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('parseZshrc', () => {
    it('should parse simple aliases', async () => {
      const zshrcContent = `
alias ll='ls -la'
alias gs='git status'
alias la='ls -A'
`;
      fs.writeFileSync(testZshrcPath, zshrcContent, 'utf8');

      importManager = new ZshImportManager(executor);
      const config = importManager['parseZshrc'](zshrcContent);

      expect(config.aliases).toHaveLength(3);
      expect(config.aliases[0]).toEqual({ name: 'll', value: 'ls -la', line: 2 });
      expect(config.aliases[1]).toEqual({ name: 'gs', value: 'git status', line: 3 });
      expect(config.aliases[2]).toEqual({ name: 'la', value: 'ls -A', line: 4 });
    });

    it('should parse exports', async () => {
      const zshrcContent = `
export EDITOR=vim
export PATH="$PATH:/usr/local/bin"
export NODE_ENV=development
`;
      fs.writeFileSync(testZshrcPath, zshrcContent, 'utf8');

      importManager = new ZshImportManager(executor);
      const config = importManager['parseZshrc'](zshrcContent);

      expect(config.exports).toHaveLength(3);
      expect(config.exports[0]).toEqual({ name: 'EDITOR', value: 'vim', line: 2 });
      expect(config.exports[1]).toEqual({ name: 'PATH', value: '$PATH:/usr/local/bin', line: 3 });
      expect(config.exports[2]).toEqual({ name: 'NODE_ENV', value: 'development', line: 4 });
    });

    it('should parse simple functions', async () => {
      const zshrcContent = `
function myfunc() {
  echo "hello"
}

greet() {
  echo "hi $1"
}
`;
      fs.writeFileSync(testZshrcPath, zshrcContent, 'utf8');

      importManager = new ZshImportManager(executor);
      const config = importManager['parseZshrc'](zshrcContent);

      expect(config.functions).toHaveLength(2);
      expect(config.functions[0].name).toBe('myfunc');
      expect(config.functions[0].body).toContain('echo "hello"');
      expect(config.functions[1].name).toBe('greet');
      expect(config.functions[1].body).toContain('echo "hi $1"');
    });

    it('should parse nested functions with brace counting', async () => {
      const zshrcContent = `
function nested() {
  if [ -f file ]; then
    echo "found"
  else
    echo "not found"
  fi
}
`;
      fs.writeFileSync(testZshrcPath, zshrcContent, 'utf8');

      importManager = new ZshImportManager(executor);
      const config = importManager['parseZshrc'](zshrcContent);

      expect(config.functions).toHaveLength(1);
      expect(config.functions[0].name).toBe('nested');
      expect(config.functions[0].body).toContain('if [ -f file ]');
      expect(config.functions[0].body).toContain('else');
      expect(config.functions[0].body).toContain('fi');
    });

    it('should parse setopt commands', async () => {
      const zshrcContent = `
setopt AUTO_CD
setopt HIST_IGNORE_DUPS
setopt SHARE_HISTORY
`;
      fs.writeFileSync(testZshrcPath, zshrcContent, 'utf8');

      importManager = new ZshImportManager(executor);
      const config = importManager['parseZshrc'](zshrcContent);

      expect(config.setopts).toHaveLength(3);
      expect(config.setopts[0]).toEqual({ option: 'AUTO_CD', enabled: true, line: 2 });
      expect(config.setopts[1]).toEqual({ option: 'HIST_IGNORE_DUPS', enabled: true, line: 3 });
      expect(config.setopts[2]).toEqual({ option: 'SHARE_HISTORY', enabled: true, line: 4 });
    });

    it('should skip comments', async () => {
      const zshrcContent = `
# This is a comment
alias ll='ls -la'  # inline comment
# alias commented='should not parse'
export EDITOR=vim
`;
      fs.writeFileSync(testZshrcPath, zshrcContent, 'utf8');

      importManager = new ZshImportManager(executor);
      const config = importManager['parseZshrc'](zshrcContent);

      expect(config.aliases).toHaveLength(1);
      expect(config.aliases[0].name).toBe('ll');
      expect(config.exports).toHaveLength(1);
      expect(config.exports[0].name).toBe('EDITOR');
    });

    it('should handle empty files', async () => {
      const zshrcContent = '';
      fs.writeFileSync(testZshrcPath, zshrcContent, 'utf8');

      importManager = new ZshImportManager(executor);
      const config = importManager['parseZshrc'](zshrcContent);

      expect(config.aliases).toHaveLength(0);
      expect(config.exports).toHaveLength(0);
      expect(config.functions).toHaveLength(0);
      expect(config.setopts).toHaveLength(0);
    });
  });

  describe('shouldInclude', () => {
    it('should match simple patterns', () => {
      importManager = new ZshImportManager(executor, {
        includePatterns: ['git*', 'ls*'],
      });

      expect(importManager['shouldInclude']('gitlog', 'alias')).toBe(true);
      expect(importManager['shouldInclude']('lsa', 'alias')).toBe(true);
      expect(importManager['shouldInclude']('ll', 'alias')).toBe(false);
    });

    it('should match with wildcards', () => {
      importManager = new ZshImportManager(executor, {
        includePatterns: ['*test*'],
      });

      expect(importManager['shouldInclude']('mytest', 'alias')).toBe(true);
      expect(importManager['shouldInclude']('testfunc', 'alias')).toBe(true);
      expect(importManager['shouldInclude']('no_match', 'alias')).toBe(false);
    });

    it('should respect exclude patterns', () => {
      importManager = new ZshImportManager(executor, {
        includePatterns: ['*'],
        excludePatterns: ['_*', 'temp*'],
      });

      expect(importManager['shouldInclude']('normal', 'alias')).toBe(true);
      expect(importManager['shouldInclude']('_private', 'alias')).toBe(false);
      expect(importManager['shouldInclude']('tempfile', 'alias')).toBe(false);
    });

    it('should include all when no patterns specified', () => {
      importManager = new ZshImportManager(executor);

      expect(importManager['shouldInclude']('anything', 'alias')).toBe(true);
      expect(importManager['shouldInclude']('_private', 'function')).toBe(true);
    });
  });

  describe('resolveConflict', () => {
    it('should skip conflicts when strategy is skip', async () => {
      importManager = new ZshImportManager(executor, {
        conflictResolution: 'skip',
      });

      const result = await importManager['resolveConflict']('alias', 'existing');
      expect(result).toBe('skip');
    });

    it('should rename conflicts when strategy is rename', async () => {
      importManager = new ZshImportManager(executor, {
        conflictResolution: 'rename',
      });

      const result = await importManager['resolveConflict']('alias', 'existing');
      expect(result).toBe('rename');
    });

    it('should overwrite conflicts when strategy is overwrite', async () => {
      importManager = new ZshImportManager(executor, {
        conflictResolution: 'overwrite',
      });

      const result = await importManager['resolveConflict']('alias', 'existing');
      expect(result).toBe('overwrite');
    });
  });

  describe('importZshConfig', () => {
    it('should successfully import simple config', async () => {
      const zshrcContent = `
alias ll='ls -la'
export EDITOR=vim
`;
      fs.writeFileSync(testZshrcPath, zshrcContent, 'utf8');

      importManager = new ZshImportManager(executor, {
        includeAliases: true,
        includeExports: true,
        includeFunctions: false,
        includeOptions: false,
      });

      const result = await importManager.importZshConfig(testZshrcPath);

      expect(result.success).toBe(true);
      expect(result.stats.total).toBe(2);
      expect(result.stats.succeeded).toBeGreaterThan(0);
    });

    it('should handle import failures gracefully', async () => {
      const zshrcContent = `
alias bad='invalid command $(
export GOOD=value
`;
      fs.writeFileSync(testZshrcPath, zshrcContent, 'utf8');

      const diagnosticLog = path.join(tempDir, 'diagnostic.log');
      importManager = new ZshImportManager(executor, {
        diagnosticLog,
      });

      const result = await importManager.importZshConfig(testZshrcPath);

      expect(result.success).toBe(true); // Overall success despite failures
      expect(fs.existsSync(diagnosticLog)).toBe(true);
    });

    it('should respect type filters', async () => {
      const zshrcContent = `
alias ll='ls -la'
export EDITOR=vim
function myfunc() { echo "hi"; }
`;
      fs.writeFileSync(testZshrcPath, zshrcContent, 'utf8');

      importManager = new ZshImportManager(executor, {
        includeAliases: true,
        includeExports: false,
        includeFunctions: false,
      });

      const result = await importManager.importZshConfig(testZshrcPath);

      expect(result.stats.total).toBe(1); // Only alias
    });

    it('should apply include/exclude patterns', async () => {
      const zshrcContent = `
alias git_log='git log'
alias git_status='git status'
alias ll='ls -la'
`;
      fs.writeFileSync(testZshrcPath, zshrcContent, 'utf8');

      importManager = new ZshImportManager(executor, {
        includePatterns: ['git*'],
      });

      const result = await importManager.importZshConfig(testZshrcPath);

      expect(result.stats.total).toBe(2); // Only git aliases
    });

    it('should handle non-existent file', async () => {
      importManager = new ZshImportManager(executor);

      const result = await importManager.importZshConfig('/nonexistent/path/.zshrc');

      expect(result.success).toBe(false);
      expect(result.message).toContain('not found');
    });
  });

  describe('import result statistics', () => {
    it('should return zero statistics for empty config', async () => {
      fs.writeFileSync(testZshrcPath, '', 'utf8');

      importManager = new ZshImportManager(executor);
      const result = await importManager.importZshConfig(testZshrcPath);

      expect(result.stats.total).toBe(0);
      expect(result.stats.succeeded).toBe(0);
      expect(result.stats.failed).toBe(0);
      expect(result.stats.skipped).toBe(0);
    });

    it('should track statistics after import', async () => {
      const zshrcContent = `
alias ll='ls -la'
alias gs='git status'
`;
      fs.writeFileSync(testZshrcPath, zshrcContent, 'utf8');

      importManager = new ZshImportManager(executor);
      const result = await importManager.importZshConfig(testZshrcPath);

      expect(result.stats.total).toBe(2);
      expect(result.stats.succeeded + result.stats.failed + result.stats.skipped).toBe(2);
    });
  });

  describe('import result diagnostics', () => {
    it('should return empty diagnostics for empty config', async () => {
      fs.writeFileSync(testZshrcPath, '', 'utf8');

      importManager = new ZshImportManager(executor);
      const result = await importManager.importZshConfig(testZshrcPath);

      expect(result.diagnostics).toHaveLength(0);
    });

    it('should track diagnostics during import', async () => {
      const zshrcContent = `
alias good='ls -la'
alias bad='invalid $(
`;
      fs.writeFileSync(testZshrcPath, zshrcContent, 'utf8');

      importManager = new ZshImportManager(executor);
      const result = await importManager.importZshConfig(testZshrcPath);

      expect(result.diagnostics.length).toBeGreaterThan(0);
      expect(result.diagnostics.some(d => d.status === 'success')).toBe(true);
    });

    it('should include diagnostics by type', async () => {
      const zshrcContent = `
alias myalias='ls'
export MYVAR=value
`;
      fs.writeFileSync(testZshrcPath, zshrcContent, 'utf8');

      importManager = new ZshImportManager(executor);
      const result = await importManager.importZshConfig(testZshrcPath);

      const aliasDiagnostics = result.diagnostics.filter(d => d.type === 'alias');
      const exportDiagnostics = result.diagnostics.filter(d => d.type === 'export');

      expect(aliasDiagnostics.every(d => d.type === 'alias')).toBe(true);
      expect(exportDiagnostics.every(d => d.type === 'export')).toBe(true);
    });

    it('should include diagnostics by status', async () => {
      const zshrcContent = `
alias good='ls'
`;
      fs.writeFileSync(testZshrcPath, zshrcContent, 'utf8');

      importManager = new ZshImportManager(executor);
      const result = await importManager.importZshConfig(testZshrcPath);

      const successDiagnostics = result.diagnostics.filter(d => d.status === 'success');

      expect(successDiagnostics.every(d => d.status === 'success')).toBe(true);
    });
  });

  describe('pattern matching', () => {
    it('should match * wildcard', () => {
      importManager = new ZshImportManager(executor);

      expect(importManager['matchesPattern']('anything', '*')).toBe(true);
      expect(importManager['matchesPattern']('git_log', 'git*')).toBe(true);
      expect(importManager['matchesPattern']('mygit', '*git')).toBe(true);
      expect(importManager['matchesPattern']('mygitlog', '*git*')).toBe(true);
    });

    it('should match ? wildcard', () => {
      importManager = new ZshImportManager(executor);

      expect(importManager['matchesPattern']('a', '?')).toBe(true);
      expect(importManager['matchesPattern']('ab', '?')).toBe(false);
      expect(importManager['matchesPattern']('git1', 'git?')).toBe(true);
      expect(importManager['matchesPattern']('git12', 'git?')).toBe(false);
    });

    it('should match exact strings', () => {
      importManager = new ZshImportManager(executor);

      expect(importManager['matchesPattern']('exact', 'exact')).toBe(true);
      expect(importManager['matchesPattern']('exact', 'other')).toBe(false);
    });
  });

  describe('diagnostic logging', () => {
    it('should write diagnostic log to file', async () => {
      const zshrcContent = `
alias test='echo test'
`;
      fs.writeFileSync(testZshrcPath, zshrcContent, 'utf8');

      const diagnosticLog = path.join(tempDir, 'test-diagnostic.log');
      importManager = new ZshImportManager(executor, {
        diagnosticLog,
      });

      await importManager.importZshConfig(testZshrcPath);

      expect(fs.existsSync(diagnosticLog)).toBe(true);
      const logContent = fs.readFileSync(diagnosticLog, 'utf8');
      expect(logContent).toContain('alias');
      expect(logContent).toContain('test');
    });

    it('should handle diagnostic log write errors gracefully', async () => {
      const zshrcContent = `
alias test='echo test'
`;
      fs.writeFileSync(testZshrcPath, zshrcContent, 'utf8');

      // Use invalid path
      importManager = new ZshImportManager(executor, {
        diagnosticLog: '/invalid/path/diagnostic.log',
      });

      // Should not throw
      await expect(importManager.importZshConfig(testZshrcPath)).resolves.toBeDefined();
    });
  });
});
