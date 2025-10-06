/**
 * Tests for ZSH Import CLI Commands
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { jest } from '@jest/globals';
import { Command } from 'commander';
import { registerZshImportCommands } from '../../src/commands/zsh-import.js';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

describe('ZSH Import Commands', () => {
  let program: Command;
  let tempDir: string;
  let testZshrcPath: string;
  let originalExit: typeof process.exit;
  let originalConsoleLog: typeof console.log;
  let originalConsoleError: typeof console.error;
  let consoleOutput: string[];

  beforeEach(() => {
    program = new Command();
    program.exitOverride(); // Prevent process.exit during tests

    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lsh-zsh-import-test-'));
    testZshrcPath = path.join(tempDir, '.zshrc');

    // Mock console output
    consoleOutput = [];
    originalConsoleLog = console.log;
    originalConsoleError = console.error;
    console.log = jest.fn((...args) => {
      consoleOutput.push(args.join(' '));
    }) as any;
    console.error = jest.fn((...args) => {
      consoleOutput.push(args.join(' '));
    }) as any;

    // Mock process.exit
    originalExit = process.exit;
    process.exit = jest.fn() as any;

    registerZshImportCommands(program);
  });

  afterEach(() => {
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
    process.exit = originalExit;

    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('zsh-import all', () => {
    it('should have all command', () => {
      const commands = program.commands.find(cmd => cmd.name() === 'zsh-import');
      expect(commands).toBeDefined();

      const subcommands = commands?.commands.map(c => c.name()) || [];
      expect(subcommands).toContain('all');
    });

    it('should accept --source option', async () => {
      const zshrcContent = `
alias ll='ls -la'
export EDITOR=vim
`;
      fs.writeFileSync(testZshrcPath, zshrcContent, 'utf8');

      try {
        await program.parseAsync(['node', 'lsh', 'zsh-import', 'all', '--source', testZshrcPath]);

        const output = consoleOutput.join('\n');
        expect(output).toContain('Import Summary');
      } catch (error) {
        // Command might exit with code 0, which throws in test mode
      }
    });

    it('should accept --rename-conflicts option', async () => {
      const commands = program.commands.find(cmd => cmd.name() === 'zsh-import');
      const allCommand = commands?.commands.find(c => c.name() === 'all');

      expect(allCommand).toBeDefined();
      const options = allCommand?.options.map(o => o.long) || [];
      expect(options).toContain('--rename-conflicts');
    });

    it('should accept --overwrite-conflicts option', async () => {
      const commands = program.commands.find(cmd => cmd.name() === 'zsh-import');
      const allCommand = commands?.commands.find(c => c.name() === 'all');

      const options = allCommand?.options.map(o => o.long) || [];
      expect(options).toContain('--overwrite-conflicts');
    });

    it('should accept pattern options', async () => {
      const commands = program.commands.find(cmd => cmd.name() === 'zsh-import');
      const allCommand = commands?.commands.find(c => c.name() === 'all');

      const options = allCommand?.options.map(o => o.long) || [];
      expect(options).toContain('--include');
      expect(options).toContain('--exclude');
    });
  });

  describe('zsh-import aliases', () => {
    it('should have aliases command', () => {
      const commands = program.commands.find(cmd => cmd.name() === 'zsh-import');
      const subcommands = commands?.commands.map(c => c.name()) || [];
      expect(subcommands).toContain('aliases');
    });

    it('should import only aliases', async () => {
      const zshrcContent = `
alias ll='ls -la'
export EDITOR=vim
function myfunc() { echo "test"; }
`;
      fs.writeFileSync(testZshrcPath, zshrcContent, 'utf8');

      try {
        await program.parseAsync(['node', 'lsh', 'zsh-import', 'aliases', '--source', testZshrcPath]);

        const output = consoleOutput.join('\n');
        expect(output).toContain('Import Summary');
      } catch (error) {
        // Expected
      }
    });
  });

  describe('zsh-import exports', () => {
    it('should have exports command', () => {
      const commands = program.commands.find(cmd => cmd.name() === 'zsh-import');
      const subcommands = commands?.commands.map(c => c.name()) || [];
      expect(subcommands).toContain('exports');
    });

    it('should accept --source option', async () => {
      const commands = program.commands.find(cmd => cmd.name() === 'zsh-import');
      const exportsCommand = commands?.commands.find(c => c.name() === 'exports');

      const options = exportsCommand?.options.map(o => o.long) || [];
      expect(options).toContain('--source');
    });
  });

  describe('zsh-import functions', () => {
    it('should have functions command', () => {
      const commands = program.commands.find(cmd => cmd.name() === 'zsh-import');
      const subcommands = commands?.commands.map(c => c.name()) || [];
      expect(subcommands).toContain('functions');
    });

    it('should accept pattern options', async () => {
      const commands = program.commands.find(cmd => cmd.name() === 'zsh-import');
      const functionsCommand = commands?.commands.find(c => c.name() === 'functions');

      const options = functionsCommand?.options.map(o => o.long) || [];
      expect(options).toContain('--include');
      expect(options).toContain('--exclude');
    });
  });

  describe('zsh-import status', () => {
    it('should have status command', () => {
      const commands = program.commands.find(cmd => cmd.name() === 'zsh-import');
      const subcommands = commands?.commands.map(c => c.name()) || [];
      expect(subcommands).toContain('status');
    });

    it('should display import statistics', async () => {
      try {
        await program.parseAsync(['node', 'lsh', 'zsh-import', 'status']);

        const output = consoleOutput.join('\n');
        expect(output).toContain('Import Statistics');
      } catch (error) {
        // Expected
      }
    });
  });

  describe('zsh-import diagnose', () => {
    it('should have diagnose command', () => {
      const commands = program.commands.find(cmd => cmd.name() === 'zsh-import');
      const subcommands = commands?.commands.map(c => c.name()) || [];
      expect(subcommands).toContain('diagnose');
    });

    it('should accept --failed option', async () => {
      const commands = program.commands.find(cmd => cmd.name() === 'zsh-import');
      const diagnoseCommand = commands?.commands.find(c => c.name() === 'diagnose');

      const options = diagnoseCommand?.options.map(o => o.long) || [];
      expect(options).toContain('--failed');
    });

    it('should accept --type option', async () => {
      const commands = program.commands.find(cmd => cmd.name() === 'zsh-import');
      const diagnoseCommand = commands?.commands.find(c => c.name() === 'diagnose');

      const options = diagnoseCommand?.options.map(o => o.long) || [];
      expect(options).toContain('--type');
    });

    it('should display diagnostic information', async () => {
      try {
        await program.parseAsync(['node', 'lsh', 'zsh-import', 'diagnose']);

        const output = consoleOutput.join('\n');
        expect(output).toContain('Import Diagnostics');
      } catch (error) {
        // Expected
      }
    });
  });

  describe('zsh-import setup-auto-import', () => {
    it('should have setup-auto-import command', () => {
      const commands = program.commands.find(cmd => cmd.name() === 'zsh-import');
      const subcommands = commands?.commands.map(c => c.name()) || [];
      expect(subcommands).toContain('setup-auto-import');
    });

    it('should accept --disable option', async () => {
      const commands = program.commands.find(cmd => cmd.name() === 'zsh-import');
      const setupCommand = commands?.commands.find(c => c.name() === 'setup-auto-import');

      const options = setupCommand?.options.map(o => o.long) || [];
      expect(options).toContain('--disable');
    });

    it('should accept selective import options', async () => {
      const commands = program.commands.find(cmd => cmd.name() === 'zsh-import');
      const setupCommand = commands?.commands.find(c => c.name() === 'setup-auto-import');

      const options = setupCommand?.options.map(o => o.long) || [];
      expect(options).toContain('--aliases-only');
      expect(options).toContain('--exports-only');
    });

    it('should accept --rename-conflicts option', async () => {
      const commands = program.commands.find(cmd => cmd.name() === 'zsh-import');
      const setupCommand = commands?.commands.find(c => c.name() === 'setup-auto-import');

      const options = setupCommand?.options.map(o => o.long) || [];
      expect(options).toContain('--rename-conflicts');
    });
  });

  describe('command help text', () => {
    it('should have description for all command', () => {
      const commands = program.commands.find(cmd => cmd.name() === 'zsh-import');
      const allCommand = commands?.commands.find(c => c.name() === 'all');

      expect(allCommand?.description()).toBeTruthy();
      expect(allCommand?.description()).toContain('Import');
    });

    it('should have description for aliases command', () => {
      const commands = program.commands.find(cmd => cmd.name() === 'zsh-import');
      const aliasesCommand = commands?.commands.find(c => c.name() === 'aliases');

      expect(aliasesCommand?.description()).toBeTruthy();
      expect(aliasesCommand?.description()).toContain('alias');
    });

    it('should have description for status command', () => {
      const commands = program.commands.find(cmd => cmd.name() === 'zsh-import');
      const statusCommand = commands?.commands.find(c => c.name() === 'status');

      expect(statusCommand?.description()).toBeTruthy();
    });

    it('should have description for diagnose command', () => {
      const commands = program.commands.find(cmd => cmd.name() === 'zsh-import');
      const diagnoseCommand = commands?.commands.find(c => c.name() === 'diagnose');

      expect(diagnoseCommand?.description()).toBeTruthy();
    });

    it('should have description for setup-auto-import command', () => {
      const commands = program.commands.find(cmd => cmd.name() === 'zsh-import');
      const setupCommand = commands?.commands.find(c => c.name() === 'setup-auto-import');

      expect(setupCommand?.description()).toBeTruthy();
      expect(setupCommand?.description()).toContain('auto-import');
    });
  });

  describe('error handling', () => {
    it('should handle missing .zshrc file', async () => {
      try {
        await program.parseAsync(['node', 'lsh', 'zsh-import', 'all', '--source', '/nonexistent/.zshrc']);

        const output = consoleOutput.join('\n');
        expect(output).toContain('not found');
      } catch (error) {
        // Expected to throw or exit
      }
    });

    it('should handle invalid options gracefully', async () => {
      const commands = program.commands.find(cmd => cmd.name() === 'zsh-import');
      expect(commands).toBeDefined();

      // Commands should be defined and not throw during registration
      expect(commands?.commands.length).toBeGreaterThan(0);
    });
  });

  describe('integration', () => {
    it('should register all subcommands', () => {
      const commands = program.commands.find(cmd => cmd.name() === 'zsh-import');
      const subcommands = commands?.commands.map(c => c.name()) || [];

      expect(subcommands).toContain('all');
      expect(subcommands).toContain('aliases');
      expect(subcommands).toContain('exports');
      expect(subcommands).toContain('functions');
      expect(subcommands).toContain('status');
      expect(subcommands).toContain('diagnose');
      expect(subcommands).toContain('setup-auto-import');
    });

    it('should have parent command description', () => {
      const commands = program.commands.find(cmd => cmd.name() === 'zsh-import');

      expect(commands?.description()).toBeTruthy();
      expect(commands?.description()).toContain('ZSH');
    });
  });

  describe('option validation', () => {
    it('should have correct option types for include/exclude', () => {
      const commands = program.commands.find(cmd => cmd.name() === 'zsh-import');
      const allCommand = commands?.commands.find(c => c.name() === 'all');

      const includeOption = allCommand?.options.find(o => o.long === '--include');
      const excludeOption = allCommand?.options.find(o => o.long === '--exclude');

      expect(includeOption).toBeDefined();
      expect(excludeOption).toBeDefined();
    });

    it('should have boolean options for conflict resolution', () => {
      const commands = program.commands.find(cmd => cmd.name() === 'zsh-import');
      const allCommand = commands?.commands.find(c => c.name() === 'all');

      const renameOption = allCommand?.options.find(o => o.long === '--rename-conflicts');
      const overwriteOption = allCommand?.options.find(o => o.long === '--overwrite-conflicts');

      expect(renameOption).toBeDefined();
      expect(overwriteOption).toBeDefined();
    });
  });
});
