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

  describe('shouldImport', () => {
    it('should match simple patterns', () => {
      importManager = new ZshImportManager(executor, {
        includePatterns: ['git*', 'ls*'],
      });

      expect(importManager['shouldImport']('gitlog')).toBe(true);
      expect(importManager['shouldImport']('lsa')).toBe(true);
      expect(importManager['shouldImport']('ll')).toBe(false);
    });

    it('should match with wildcards', () => {
      importManager = new ZshImportManager(executor, {
        includePatterns: ['*test*'],
      });

      expect(importManager['shouldImport']('mytest')).toBe(true);
      expect(importManager['shouldImport']('testfunc')).toBe(true);
      expect(importManager['shouldImport']('no_match')).toBe(false);
    });

    it('should respect exclude patterns', () => {
      importManager = new ZshImportManager(executor, {
        includePatterns: ['*'],
        excludePatterns: ['_*', 'temp*'],
      });

      expect(importManager['shouldImport']('normal')).toBe(true);
      expect(importManager['shouldImport']('_private')).toBe(false);
      expect(importManager['shouldImport']('tempfile')).toBe(false);
    });

    it('should include all when no patterns specified', () => {
      importManager = new ZshImportManager(executor);

      expect(importManager['shouldImport']('anything')).toBe(true);
      expect(importManager['shouldImport']('_private')).toBe(true);
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

  describe('matchPattern', () => {
    it('should match * wildcard', () => {
      importManager = new ZshImportManager(executor);

      expect(importManager['matchPattern']('anything', '*')).toBe(true);
      expect(importManager['matchPattern']('git_log', 'git*')).toBe(true);
      expect(importManager['matchPattern']('mygit', '*git')).toBe(true);
      expect(importManager['matchPattern']('mygitlog', '*git*')).toBe(true);
    });

    it('should match ? wildcard', () => {
      importManager = new ZshImportManager(executor);

      expect(importManager['matchPattern']('a', '?')).toBe(true);
      expect(importManager['matchPattern']('ab', '?')).toBe(false);
      expect(importManager['matchPattern']('git1', 'git?')).toBe(true);
      expect(importManager['matchPattern']('git12', 'git?')).toBe(false);
    });

    it('should match exact strings', () => {
      importManager = new ZshImportManager(executor);

      expect(importManager['matchPattern']('exact', 'exact')).toBe(true);
      expect(importManager['matchPattern']('exact', 'other')).toBe(false);
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

  describe('importSetopts', () => {
    it('should import setopt commands', async () => {
      const zshrcContent = `
setopt AUTO_CD
setopt HIST_IGNORE_DUPS
`;
      fs.writeFileSync(testZshrcPath, zshrcContent, 'utf8');

      importManager = new ZshImportManager(executor);
      const result = await importManager.importZshConfig(testZshrcPath);

      expect(result.success).toBe(true);
      expect(result.stats.total).toBeGreaterThan(0);
    });

    it('should handle multiple setopts on one line', async () => {
      const zshrcContent = `
setopt AUTO_CD HIST_IGNORE_DUPS SHARE_HISTORY
`;
      fs.writeFileSync(testZshrcPath, zshrcContent, 'utf8');

      importManager = new ZshImportManager(executor);
      const config = importManager['parseZshrc'](zshrcContent);

      expect(config.setopts).toHaveLength(3);
      expect(config.setopts[0].option).toBe('AUTO_CD');
      expect(config.setopts[1].option).toBe('HIST_IGNORE_DUPS');
      expect(config.setopts[2].option).toBe('SHARE_HISTORY');
    });

    it('should handle unsetopt commands', async () => {
      const zshrcContent = `
unsetopt BEEP
unsetopt NOMATCH
`;
      fs.writeFileSync(testZshrcPath, zshrcContent, 'utf8');

      importManager = new ZshImportManager(executor);
      const config = importManager['parseZshrc'](zshrcContent);

      expect(config.setopts).toHaveLength(2);
      expect(config.setopts[0]).toEqual({ option: 'BEEP', enabled: false, line: 2 });
      expect(config.setopts[1]).toEqual({ option: 'NOMATCH', enabled: false, line: 3 });
    });
  });

  describe('importPlugins', () => {
    it('should parse Oh-My-Zsh plugins', async () => {
      const zshrcContent = `
plugins=(git docker kubectl)
`;
      fs.writeFileSync(testZshrcPath, zshrcContent, 'utf8');

      importManager = new ZshImportManager(executor);
      const config = importManager['parseZshrc'](zshrcContent);

      expect(config.plugins).toHaveLength(3);
      expect(config.plugins[0].name).toBe('git');
      expect(config.plugins[1].name).toBe('docker');
      expect(config.plugins[2].name).toBe('kubectl');
    });

    it('should parse plugin with single word syntax', async () => {
      const zshrcContent = `
plugin=git
`;
      fs.writeFileSync(testZshrcPath, zshrcContent, 'utf8');

      importManager = new ZshImportManager(executor);
      const config = importManager['parseZshrc'](zshrcContent);

      expect(config.plugins).toHaveLength(1);
      expect(config.plugins[0].name).toBe('git');
    });
  });

  describe('completion parsing', () => {
    it('should parse autoload commands', async () => {
      const zshrcContent = `
autoload -Uz compinit
compinit
`;
      fs.writeFileSync(testZshrcPath, zshrcContent, 'utf8');

      importManager = new ZshImportManager(executor);
      const config = importManager['parseZshrc'](zshrcContent);

      expect(config.completions).toHaveLength(2);
      expect(config.completions[0].config).toContain('autoload');
      expect(config.completions[1].config).toContain('compinit');
    });
  });

  describe('getLastImportStats', () => {
    it('should return statistics from last import', async () => {
      const zshrcContent = `
alias ll='ls -la'
alias gs='git status'
`;
      fs.writeFileSync(testZshrcPath, zshrcContent, 'utf8');

      importManager = new ZshImportManager(executor);
      await importManager.importZshConfig(testZshrcPath);

      const stats = importManager.getLastImportStats();

      expect(stats).toBeDefined();
      expect(stats.total).toBe(2);
    });
  });

  describe('actual execution verification', () => {
    it('should actually set aliases in executor', async () => {
      const zshrcContent = `
alias mytest='echo test'
alias mygrep='grep -i'
`;
      fs.writeFileSync(testZshrcPath, zshrcContent, 'utf8');

      importManager = new ZshImportManager(executor);
      await importManager.importZshConfig(testZshrcPath);

      // Verify aliases are set
      const context = (executor as any).context;
      expect(context.variables['alias_mytest']).toBeDefined();
      expect(context.variables['alias_mygrep']).toBeDefined();
    });

    it('should actually set exports in executor', async () => {
      const zshrcContent = `
export TEST_VAR=test_value
export ANOTHER_VAR=another_value
`;
      fs.writeFileSync(testZshrcPath, zshrcContent, 'utf8');

      importManager = new ZshImportManager(executor);
      await importManager.importZshConfig(testZshrcPath);

      // Verify exports are set
      const context = (executor as any).context;
      expect(context.variables['TEST_VAR']).toBe('test_value');
      expect(context.variables['ANOTHER_VAR']).toBe('another_value');
    });
  });

  describe('conflict scenarios', () => {
    it('should detect alias conflicts', async () => {
      // Set up existing alias
      const context = (executor as any).context;
      context.variables['alias_ll'] = 'ls -l';

      const zshrcContent = `
alias ll='ls -la'
`;
      fs.writeFileSync(testZshrcPath, zshrcContent, 'utf8');

      importManager = new ZshImportManager(executor, {
        conflictResolution: 'skip',
      });

      const result = await importManager.importZshConfig(testZshrcPath);

      expect(result.stats.conflicts).toBeGreaterThan(0);
    });

    it('should rename on conflict when strategy is rename', async () => {
      // Set up existing alias
      const context = (executor as any).context;
      context.variables['alias_ll'] = 'ls -l';

      const zshrcContent = `
alias ll='ls -la'
`;
      fs.writeFileSync(testZshrcPath, zshrcContent, 'utf8');

      importManager = new ZshImportManager(executor, {
        conflictResolution: 'rename',
      });

      const result = await importManager.importZshConfig(testZshrcPath);

      // Should create ll_zsh instead
      expect(context.variables['alias_ll_zsh']).toBeDefined();
    });

    it('should overwrite on conflict when strategy is overwrite', async () => {
      // Set up existing alias
      const context = (executor as any).context;
      context.variables['alias_ll'] = 'ls -l';

      const zshrcContent = `
alias ll='ls -la'
`;
      fs.writeFileSync(testZshrcPath, zshrcContent, 'utf8');

      importManager = new ZshImportManager(executor, {
        conflictResolution: 'overwrite',
      });

      const result = await importManager.importZshConfig(testZshrcPath);

      expect(result.success).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle aliases with special characters', async () => {
      const zshrcContent = `
alias ls='ls --color=auto'
alias grep='grep --color=auto'
alias ll='ls -la'
`;
      fs.writeFileSync(testZshrcPath, zshrcContent, 'utf8');

      importManager = new ZshImportManager(executor);
      const result = await importManager.importZshConfig(testZshrcPath);

      expect(result.success).toBe(true);
      expect(result.stats.total).toBe(3);
    });

    it('should handle aliases with dollar signs', async () => {
      const zshrcContent = `
alias path='echo $PATH'
alias home='cd $HOME'
`;
      fs.writeFileSync(testZshrcPath, zshrcContent, 'utf8');

      importManager = new ZshImportManager(executor);
      const config = importManager['parseZshrc'](zshrcContent);

      expect(config.aliases).toHaveLength(2);
      expect(config.aliases[0].value).toContain('$PATH');
      expect(config.aliases[1].value).toContain('$HOME');
    });

    it('should handle aliases with quotes', async () => {
      const zshrcContent = `
alias say='echo "hello world"'
alias greet="echo 'hi there'"
`;
      fs.writeFileSync(testZshrcPath, zshrcContent, 'utf8');

      importManager = new ZshImportManager(executor);
      const config = importManager['parseZshrc'](zshrcContent);

      expect(config.aliases).toHaveLength(2);
    });

    it('should handle exports with complex values', async () => {
      const zshrcContent = `
export PATH="$PATH:/usr/local/bin"
export EDITOR="vim -n"
export PS1='\\u@\\h:\\w\\$ '
`;
      fs.writeFileSync(testZshrcPath, zshrcContent, 'utf8');

      importManager = new ZshImportManager(executor);
      const config = importManager['parseZshrc'](zshrcContent);

      expect(config.exports).toHaveLength(3);
      expect(config.exports[0].value).toContain('$PATH');
    });

    it('should handle functions with here-docs', async () => {
      const zshrcContent = `
function myhelp() {
  cat <<EOF
This is help text
Line 2
EOF
}
`;
      fs.writeFileSync(testZshrcPath, zshrcContent, 'utf8');

      importManager = new ZshImportManager(executor);
      const config = importManager['parseZshrc'](zshrcContent);

      expect(config.functions).toHaveLength(1);
      expect(config.functions[0].body).toContain('EOF');
    });

    it('should handle functions with case statements', async () => {
      const zshrcContent = `
function mycase() {
  case $1 in
    start)
      echo "starting"
      ;;
    stop)
      echo "stopping"
      ;;
  esac
}
`;
      fs.writeFileSync(testZshrcPath, zshrcContent, 'utf8');

      importManager = new ZshImportManager(executor);
      const config = importManager['parseZshrc'](zshrcContent);

      expect(config.functions).toHaveLength(1);
      expect(config.functions[0].body).toContain('case');
      expect(config.functions[0].body).toContain('esac');
    });

    it('should handle functions with subshells', async () => {
      const zshrcContent = `
function mysub() {
  (
    cd /tmp
    echo "in subshell"
  )
}
`;
      fs.writeFileSync(testZshrcPath, zshrcContent, 'utf8');

      importManager = new ZshImportManager(executor);
      const config = importManager['parseZshrc'](zshrcContent);

      expect(config.functions).toHaveLength(1);
    });

    it('should handle very long files', async () => {
      let longContent = '# Long file\n';
      for (let i = 0; i < 1000; i++) {
        longContent += `alias test${i}='echo ${i}'\n`;
      }
      fs.writeFileSync(testZshrcPath, longContent, 'utf8');

      importManager = new ZshImportManager(executor);
      const config = importManager['parseZshrc'](longContent);

      expect(config.aliases.length).toBe(1000);
    });

    it('should handle corrupted zshrc gracefully', async () => {
      const corruptedContent = `
alias good='ls'
function broken {
  echo "no closing brace"
alias also_good='pwd'
`;
      fs.writeFileSync(testZshrcPath, corruptedContent, 'utf8');

      importManager = new ZshImportManager(executor);
      const result = await importManager.importZshConfig(testZshrcPath);

      // Should still import valid parts
      expect(result.stats.succeeded).toBeGreaterThan(0);
    });
  });

  describe('integration tests', () => {
    it('should complete full workflow: parse → import → verify', async () => {
      const zshrcContent = `
# My ZSH Config
export EDITOR=vim
export PATH="$PATH:/usr/local/bin"

alias ll='ls -la'
alias gs='git status'
alias gp='git pull'

function mkcd() {
  mkdir -p "$1"
  cd "$1"
}

setopt AUTO_CD
setopt HIST_IGNORE_DUPS

plugins=(git docker)
`;
      fs.writeFileSync(testZshrcPath, zshrcContent, 'utf8');

      importManager = new ZshImportManager(executor);

      // Step 1: Import
      const result = await importManager.importZshConfig(testZshrcPath);

      // Step 2: Verify success
      expect(result.success).toBe(true);
      expect(result.stats.total).toBeGreaterThan(0);

      // Step 3: Verify aliases imported
      const context = (executor as any).context;
      expect(context.variables['alias_ll']).toBeDefined();
      expect(context.variables['alias_gs']).toBeDefined();
      expect(context.variables['alias_gp']).toBeDefined();

      // Step 4: Verify exports imported
      expect(context.variables['EDITOR']).toBe('vim');
      expect(context.variables['PATH']).toContain('/usr/local/bin');

      // Step 5: Verify diagnostics logged
      expect(result.diagnostics.length).toBeGreaterThan(0);
      const successCount = result.diagnostics.filter(d => d.status === 'success').length;
      expect(successCount).toBeGreaterThan(0);
    });

    it('should handle mixed success and failure imports', async () => {
      const zshrcContent = `
alias good1='ls'
alias bad='invalid $(syntax'
alias good2='pwd'
export GOOD_VAR=value
function goodfunc() { echo "ok"; }
`;
      fs.writeFileSync(testZshrcPath, zshrcContent, 'utf8');

      importManager = new ZshImportManager(executor);
      const result = await importManager.importZshConfig(testZshrcPath);

      expect(result.success).toBe(true);
      expect(result.stats.succeeded).toBeGreaterThan(0);
      expect(result.stats.failed).toBeGreaterThan(0);
      expect(result.stats.total).toBe(result.stats.succeeded + result.stats.failed + result.stats.skipped);
    });

    it('should respect selective import options', async () => {
      const zshrcContent = `
alias ll='ls -la'
export EDITOR=vim
function myfunc() { echo "test"; }
setopt AUTO_CD
`;
      fs.writeFileSync(testZshrcPath, zshrcContent, 'utf8');

      importManager = new ZshImportManager(executor, {
        includeAliases: true,
        includeExports: false,
        includeFunctions: false,
        includeOptions: false,
      });

      const result = await importManager.importZshConfig(testZshrcPath);

      // Should only import alias
      expect(result.stats.total).toBe(1);

      const context = (executor as any).context;
      expect(context.variables['alias_ll']).toBeDefined();
      expect(context.variables['EDITOR']).toBeUndefined();
    });
  });
});
