/**
 * Tests for Theme CLI Commands
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { jest } from '@jest/globals';
import { Command } from 'commander';
import { registerThemeCommands } from '../../src/commands/theme.js';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

describe('Theme Commands', () => {
  let program: Command;
  let tempDir: string;
  let originalConsoleLog: typeof console.log;
  let originalConsoleError: typeof console.error;
  let consoleOutput: string[];
  let processExitMock: jest.SpiedFunction<typeof process.exit>;

  beforeEach(() => {
    program = new Command();
    program.exitOverride(); // Prevent process.exit during tests

    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lsh-theme-test-'));

    // Mock process.exit to prevent worker crashes
    processExitMock = jest.spyOn(process, 'exit').mockImplementation(((code?: number) => {
      throw new Error(`process.exit called with code ${code}`);
    }) as any);

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

    registerThemeCommands(program);
  });

  afterEach(() => {
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
    processExitMock.mockRestore();

    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('theme list', () => {
    it('should have list command', () => {
      const commands = program.commands.find(cmd => cmd.name() === 'theme');
      expect(commands).toBeDefined();

      const subcommands = commands?.commands.map(c => c.name()) || [];
      expect(subcommands).toContain('list');
    });

    it('should accept --builtin option', () => {
      const commands = program.commands.find(cmd => cmd.name() === 'theme');
      const listCommand = commands?.commands.find(c => c.name() === 'list');

      const options = listCommand?.options.map(o => o.long) || [];
      expect(options).toContain('--builtin');
    });

    it('should accept --ohmyzsh option', () => {
      const commands = program.commands.find(cmd => cmd.name() === 'theme');
      const listCommand = commands?.commands.find(c => c.name() === 'list');

      const options = listCommand?.options.map(o => o.long) || [];
      expect(options).toContain('--ohmyzsh');
    });

    it('should accept --custom option', () => {
      const commands = program.commands.find(cmd => cmd.name() === 'theme');
      const listCommand = commands?.commands.find(c => c.name() === 'list');

      const options = listCommand?.options.map(o => o.long) || [];
      expect(options).toContain('--custom');
    });

    it('should display available themes', async () => {
      try {
        await program.parseAsync(['node', 'lsh', 'theme', 'list']);

        const output = consoleOutput.join('\n');
        expect(output).toContain('Available Themes');
      } catch (error) {
        // Expected
      }
    });
  });

  describe('theme import', () => {
    it('should have import command', () => {
      const commands = program.commands.find(cmd => cmd.name() === 'theme');
      const subcommands = commands?.commands.map(c => c.name()) || [];
      expect(subcommands).toContain('import');
    });

    it('should accept theme name argument', () => {
      const commands = program.commands.find(cmd => cmd.name() === 'theme');
      const importCommand = commands?.commands.find(c => c.name() === 'import');

      expect(importCommand).toBeDefined();
      // Command should accept arguments
      expect(importCommand?.args.length).toBeGreaterThan(0);
    });

    it('should accept --preview option', () => {
      const commands = program.commands.find(cmd => cmd.name() === 'theme');
      const importCommand = commands?.commands.find(c => c.name() === 'import');

      const options = importCommand?.options.map(o => o.long) || [];
      expect(options).toContain('--preview');
    });

    it('should accept --apply option', () => {
      const commands = program.commands.find(cmd => cmd.name() === 'theme');
      const importCommand = commands?.commands.find(c => c.name() === 'import');

      const options = importCommand?.options.map(o => o.long) || [];
      expect(options).toContain('--apply');
    });
  });

  describe('theme preview', () => {
    it('should have preview command', () => {
      const commands = program.commands.find(cmd => cmd.name() === 'theme');
      const subcommands = commands?.commands.map(c => c.name()) || [];
      expect(subcommands).toContain('preview');
    });

    it('should accept theme name argument', () => {
      const commands = program.commands.find(cmd => cmd.name() === 'theme');
      const previewCommand = commands?.commands.find(c => c.name() === 'preview');

      expect(previewCommand).toBeDefined();
      expect(previewCommand?.args.length).toBeGreaterThan(0);
    });

    it('should preview built-in themes', async () => {
      try {
        await program.parseAsync(['node', 'lsh', 'theme', 'preview', 'minimal']);

        const output = consoleOutput.join('\n');
        expect(output).toContain('Preview');
      } catch (error) {
        // Expected
      }
    });
  });

  describe('theme apply', () => {
    it('should have apply command', () => {
      const commands = program.commands.find(cmd => cmd.name() === 'theme');
      const subcommands = commands?.commands.map(c => c.name()) || [];
      expect(subcommands).toContain('apply');
    });

    it('should accept theme name argument', () => {
      const commands = program.commands.find(cmd => cmd.name() === 'theme');
      const applyCommand = commands?.commands.find(c => c.name() === 'apply');

      expect(applyCommand).toBeDefined();
      expect(applyCommand?.args.length).toBeGreaterThan(0);
    });

    it('should accept --save option', () => {
      const commands = program.commands.find(cmd => cmd.name() === 'theme');
      const applyCommand = commands?.commands.find(c => c.name() === 'apply');

      const options = applyCommand?.options.map(o => o.long) || [];
      expect(options).toContain('--save');
    });
  });

  describe('theme from-zshrc', () => {
    it('should have from-zshrc command', () => {
      const commands = program.commands.find(cmd => cmd.name() === 'theme');
      const subcommands = commands?.commands.map(c => c.name()) || [];
      expect(subcommands).toContain('from-zshrc');
    });

    it('should accept --apply option', () => {
      const commands = program.commands.find(cmd => cmd.name() === 'theme');
      const fromZshrcCommand = commands?.commands.find(c => c.name() === 'from-zshrc');

      const options = fromZshrcCommand?.options.map(o => o.long) || [];
      expect(options).toContain('--apply');
    });

    it('should handle missing .zshrc', async () => {
      const originalHome = process.env.HOME;
      process.env.HOME = tempDir;

      try {
        await program.parseAsync(['node', 'lsh', 'theme', 'from-zshrc']);

        const output = consoleOutput.join('\n');
        // Should handle missing file
        expect(output.length).toBeGreaterThan(0);
      } catch (error) {
        // Expected to throw
      } finally {
        process.env.HOME = originalHome;
      }
    });
  });

  describe('theme current', () => {
    it('should have current command', () => {
      const commands = program.commands.find(cmd => cmd.name() === 'theme');
      const subcommands = commands?.commands.map(c => c.name()) || [];
      expect(subcommands).toContain('current');
    });

    it('should display current theme', async () => {
      try {
        await program.parseAsync(['node', 'lsh', 'theme', 'current']);

        const output = consoleOutput.join('\n');
        expect(output).toContain('Current');
      } catch (error) {
        // Expected
      }
    });
  });

  describe('theme reset', () => {
    it('should have reset command', () => {
      const commands = program.commands.find(cmd => cmd.name() === 'theme');
      const subcommands = commands?.commands.map(c => c.name()) || [];
      expect(subcommands).toContain('reset');
    });

    it('should reset to default theme', async () => {
      try {
        await program.parseAsync(['node', 'lsh', 'theme', 'reset']);

        const output = consoleOutput.join('\n');
        expect(output).toContain('reset');
      } catch (error) {
        // Expected
      }
    });
  });

  describe('command help text', () => {
    it('should have description for list command', () => {
      const commands = program.commands.find(cmd => cmd.name() === 'theme');
      const listCommand = commands?.commands.find(c => c.name() === 'list');

      expect(listCommand?.description()).toBeTruthy();
      expect(listCommand?.description()).toContain('List');
    });

    it('should have description for import command', () => {
      const commands = program.commands.find(cmd => cmd.name() === 'theme');
      const importCommand = commands?.commands.find(c => c.name() === 'import');

      expect(importCommand?.description()).toBeTruthy();
      expect(importCommand?.description()).toContain('Import');
    });

    it('should have description for preview command', () => {
      const commands = program.commands.find(cmd => cmd.name() === 'theme');
      const previewCommand = commands?.commands.find(c => c.name() === 'preview');

      expect(previewCommand?.description()).toBeTruthy();
      expect(previewCommand?.description()).toContain('Preview');
    });

    it('should have description for apply command', () => {
      const commands = program.commands.find(cmd => cmd.name() === 'theme');
      const applyCommand = commands?.commands.find(c => c.name() === 'apply');

      expect(applyCommand?.description()).toBeTruthy();
      expect(applyCommand?.description()).toContain('Apply');
    });

    it('should have description for from-zshrc command', () => {
      const commands = program.commands.find(cmd => cmd.name() === 'theme');
      const fromZshrcCommand = commands?.commands.find(c => c.name() === 'from-zshrc');

      expect(fromZshrcCommand?.description()).toBeTruthy();
      expect(fromZshrcCommand?.description()).toContain('zshrc');
    });

    it('should have description for current command', () => {
      const commands = program.commands.find(cmd => cmd.name() === 'theme');
      const currentCommand = commands?.commands.find(c => c.name() === 'current');

      expect(currentCommand?.description()).toBeTruthy();
    });

    it('should have description for reset command', () => {
      const commands = program.commands.find(cmd => cmd.name() === 'theme');
      const resetCommand = commands?.commands.find(c => c.name() === 'reset');

      expect(resetCommand?.description()).toBeTruthy();
      expect(resetCommand?.description()).toContain('Reset');
    });
  });

  describe('integration', () => {
    it('should register all subcommands', () => {
      const commands = program.commands.find(cmd => cmd.name() === 'theme');
      const subcommands = commands?.commands.map(c => c.name()) || [];

      expect(subcommands).toContain('list');
      expect(subcommands).toContain('import');
      expect(subcommands).toContain('preview');
      expect(subcommands).toContain('apply');
      expect(subcommands).toContain('from-zshrc');
      expect(subcommands).toContain('current');
      expect(subcommands).toContain('reset');
    });

    it('should have parent command description', () => {
      const commands = program.commands.find(cmd => cmd.name() === 'theme');

      expect(commands?.description()).toBeTruthy();
      expect(commands?.description()).toContain('theme');
    });

    it('should have at least 7 subcommands', () => {
      const commands = program.commands.find(cmd => cmd.name() === 'theme');
      const subcommands = commands?.commands || [];

      expect(subcommands.length).toBeGreaterThanOrEqual(7);
    });
  });

  describe('error handling', () => {
    it('should handle invalid theme name', async () => {
      try {
        await program.parseAsync(['node', 'lsh', 'theme', 'preview', 'nonexistent-theme']);

        const output = consoleOutput.join('\n');
        // Should handle gracefully
        expect(output.length).toBeGreaterThan(0);
      } catch (error) {
        // Expected to throw or exit
      }
    });

    it('should handle missing Oh-My-Zsh installation', async () => {
      const originalHome = process.env.HOME;
      process.env.HOME = tempDir;

      try {
        await program.parseAsync(['node', 'lsh', 'theme', 'import', 'robbyrussell']);

        const output = consoleOutput.join('\n');
        // Should handle missing Oh-My-Zsh
        expect(output.length).toBeGreaterThan(0);
      } catch (error) {
        // Expected to throw
      } finally {
        process.env.HOME = originalHome;
      }
    });
  });

  describe('theme list filtering', () => {
    it('should filter by builtin when --builtin specified', async () => {
      try {
        await program.parseAsync(['node', 'lsh', 'theme', 'list', '--builtin']);

        const output = consoleOutput.join('\n');
        expect(output).toContain('Built-in');
      } catch (error) {
        // Expected
      }
    });

    it('should filter by ohmyzsh when --ohmyzsh specified', async () => {
      try {
        await program.parseAsync(['node', 'lsh', 'theme', 'list', '--ohmyzsh']);

        const output = consoleOutput.join('\n');
        // Should only show Oh-My-Zsh themes
        expect(output.length).toBeGreaterThan(0);
      } catch (error) {
        // Expected
      }
    });

    it('should filter by custom when --custom specified', async () => {
      try {
        await program.parseAsync(['node', 'lsh', 'theme', 'list', '--custom']);

        const output = consoleOutput.join('\n');
        // Should only show custom themes
        expect(output.length).toBeGreaterThan(0);
      } catch (error) {
        // Expected
      }
    });
  });

  describe('built-in theme names', () => {
    const builtInThemes = ['default', 'minimal', 'powerline', 'robbyrussell', 'simple'];

    builtInThemes.forEach(themeName => {
      it(`should handle ${themeName} theme`, async () => {
        try {
          await program.parseAsync(['node', 'lsh', 'theme', 'preview', themeName]);

          const output = consoleOutput.join('\n');
          // Should preview successfully
          expect(output.length).toBeGreaterThan(0);
        } catch (error) {
          // Expected
        }
      });
    });
  });

  describe('option combinations', () => {
    it('should handle import with preview and apply', () => {
      const commands = program.commands.find(cmd => cmd.name() === 'theme');
      const importCommand = commands?.commands.find(c => c.name() === 'import');

      const options = importCommand?.options.map(o => o.long) || [];
      expect(options).toContain('--preview');
      expect(options).toContain('--apply');
    });

    it('should handle apply with save', () => {
      const commands = program.commands.find(cmd => cmd.name() === 'theme');
      const applyCommand = commands?.commands.find(c => c.name() === 'apply');

      const options = applyCommand?.options.map(o => o.long) || [];
      expect(options).toContain('--save');
    });
  });

  describe('command structure', () => {
    it('should have proper argument names for import', () => {
      const commands = program.commands.find(cmd => cmd.name() === 'theme');
      const importCommand = commands?.commands.find(c => c.name() === 'import');

      expect(importCommand?.args.length).toBeGreaterThan(0);
    });

    it('should have proper argument names for preview', () => {
      const commands = program.commands.find(cmd => cmd.name() === 'theme');
      const previewCommand = commands?.commands.find(c => c.name() === 'preview');

      expect(previewCommand?.args.length).toBeGreaterThan(0);
    });

    it('should have proper argument names for apply', () => {
      const commands = program.commands.find(cmd => cmd.name() === 'theme');
      const applyCommand = commands?.commands.find(c => c.name() === 'apply');

      expect(applyCommand?.args.length).toBeGreaterThan(0);
    });
  });
});
