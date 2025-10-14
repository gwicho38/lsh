/**
 * ZSH Import Commands
 * CLI commands for importing ZSH configurations
 */

import { Command } from 'commander';
import { ShellExecutor } from '../lib/shell-executor.js';
import { ZshImportManager, ZshImportOptions } from '../lib/zsh-import-manager.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export function registerZshImportCommands(program: Command): void {
  const zshCommand = program
    .command('zsh-import')
    .description('Import ZSH configurations (aliases, functions, exports)');

  zshCommand
    .command('all')
    .description('Import all ZSH configurations from .zshrc')
    .option('--skip-conflicts', 'Skip items that conflict with existing ones', false)
    .option('--rename-conflicts', 'Rename conflicting items with _zsh suffix', false)
    .option('--overwrite-conflicts', 'Overwrite existing items', false)
    .option('--exclude <patterns...>', 'Exclude items matching patterns (supports wildcards)')
    .option('--include <patterns...>', 'Only include items matching patterns')
    .option('--no-aliases', 'Skip importing aliases')
    .option('--no-exports', 'Skip importing environment variables')
    .option('--no-functions', 'Skip importing functions')
    .option('--no-options', 'Skip importing ZSH options (setopt/unsetopt)')
    .option('--diagnostic-log <path>', 'Path to diagnostic log file')
    .action(async (options) => {
      const executor = new ShellExecutor();

      // Determine conflict resolution strategy
      let conflictResolution: 'skip' | 'overwrite' | 'rename' = 'skip';
      if (options.renameConflicts) conflictResolution = 'rename';
      if (options.overwriteConflicts) conflictResolution = 'overwrite';

      const importOptions: ZshImportOptions = {
        conflictResolution,
        includeAliases: options.aliases !== false,
        includeExports: options.exports !== false,
        includeFunctions: options.functions !== false,
        includeOptions: options.options !== false,
        includePlugins: true,
        excludePatterns: options.exclude || [],
        includePatterns: options.include || [],
        diagnosticLog: options.diagnosticLog,
      };

      const manager = new ZshImportManager(executor, importOptions);
      const result = await manager.importZshConfig();

      console.log(result.message);

      if (result.diagnostics.filter(d => d.status === 'failed').length > 0) {
        console.log(`\n⚠️  Some imports failed. Check diagnostic log: ${importOptions.diagnosticLog || '~/.lsh/zsh-import.log'}`);
      }

      process.exit(result.success ? 0 : 1);
    });

  zshCommand
    .command('aliases')
    .description('Import only aliases from .zshrc')
    .option('--exclude <patterns...>', 'Exclude aliases matching patterns')
    .option('--include <patterns...>', 'Only include aliases matching patterns')
    .option('--rename-conflicts', 'Rename conflicting aliases')
    .action(async (options) => {
      const executor = new ShellExecutor();
      const importOptions: ZshImportOptions = {
        includeAliases: true,
        includeExports: false,
        includeFunctions: false,
        includeOptions: false,
        includePlugins: false,
        conflictResolution: options.renameConflicts ? 'rename' : 'skip',
        excludePatterns: options.exclude || [],
        includePatterns: options.include || [],
      };

      const manager = new ZshImportManager(executor, importOptions);
      const result = await manager.importZshConfig();

      console.log(result.message);
      process.exit(result.success ? 0 : 1);
    });

  zshCommand
    .command('exports')
    .description('Import only environment variables from .zshrc')
    .option('--exclude <patterns...>', 'Exclude exports matching patterns')
    .option('--include <patterns...>', 'Only include exports matching patterns')
    .action(async (options) => {
      const executor = new ShellExecutor();
      const importOptions: ZshImportOptions = {
        includeAliases: false,
        includeExports: true,
        includeFunctions: false,
        includeOptions: false,
        includePlugins: false,
        excludePatterns: options.exclude || [],
        includePatterns: options.include || [],
      };

      const manager = new ZshImportManager(executor, importOptions);
      const result = await manager.importZshConfig();

      console.log(result.message);
      process.exit(result.success ? 0 : 1);
    });

  zshCommand
    .command('functions')
    .description('Import only functions from .zshrc')
    .option('--exclude <patterns...>', 'Exclude functions matching patterns')
    .option('--include <patterns...>', 'Only include functions matching patterns')
    .option('--rename-conflicts', 'Rename conflicting functions')
    .action(async (options) => {
      const executor = new ShellExecutor();
      const importOptions: ZshImportOptions = {
        includeAliases: false,
        includeExports: false,
        includeFunctions: true,
        includeOptions: false,
        includePlugins: false,
        conflictResolution: options.renameConflicts ? 'rename' : 'skip',
        excludePatterns: options.exclude || [],
        includePatterns: options.include || [],
      };

      const manager = new ZshImportManager(executor, importOptions);
      const result = await manager.importZshConfig();

      console.log(result.message);
      process.exit(result.success ? 0 : 1);
    });

  zshCommand
    .command('setup-auto-import')
    .description('Configure auto-import of ZSH config on LSH startup')
    .option('--disable', 'Disable auto-import')
    .option('--aliases-only', 'Only auto-import aliases')
    .option('--exports-only', 'Only auto-import exports')
    .option('--rename-conflicts', 'Auto-rename conflicts')
    .action(async (options) => {
      const lshrcPath = path.join(os.homedir(), '.lshrc');

      if (options.disable) {
        // Remove auto-import from .lshrc
        if (fs.existsSync(lshrcPath)) {
          let content = fs.readFileSync(lshrcPath, 'utf8');
          content = content.replace(/# ZSH Auto-Import[\s\S]*?# End ZSH Auto-Import\n*/g, '');
          fs.writeFileSync(lshrcPath, content, 'utf8');
          console.log('✅ Auto-import disabled');
        }
        process.exit(0);
        return;
      }

      // Generate auto-import configuration
      const importCommand = 'zsh-source';
      const options_list: string[] = [];

      if (options.aliasesOnly) {
        options_list.push('--no-exports', '--no-functions', '--no-options');
      } else if (options.exportsOnly) {
        options_list.push('--no-aliases', '--no-functions', '--no-options');
      }

      if (options.renameConflicts) {
        options_list.push('--rename-conflicts');
      }

      const autoImportConfig = `
# ZSH Auto-Import
# Automatically import ZSH configurations on startup
${importCommand}${options_list.length > 0 ? ' ' + options_list.join(' ') : ''}
# End ZSH Auto-Import
`;

      // Read or create .lshrc
      let lshrcContent = '';
      if (fs.existsSync(lshrcPath)) {
        lshrcContent = fs.readFileSync(lshrcPath, 'utf8');
        // Remove existing auto-import config
        lshrcContent = lshrcContent.replace(/# ZSH Auto-Import[\s\S]*?# End ZSH Auto-Import\n*/g, '');
      }

      // Append new auto-import config
      lshrcContent += autoImportConfig;

      fs.writeFileSync(lshrcPath, lshrcContent, 'utf8');

      console.log('✅ Auto-import configured in ~/.lshrc');
      console.log(`   ZSH config will be imported automatically on LSH startup`);
      console.log(`\nConfiguration added:`);
      console.log(autoImportConfig.trim());

      process.exit(0);
    });

  zshCommand
    .command('status')
    .description('Show ZSH import status and diagnostics')
    .action(async () => {
      const executor = new ShellExecutor();
      const manager = new ZshImportManager(executor);
      const stats = manager.getLastImportStats();

      if (!stats) {
        console.log('No ZSH import has been performed yet.');
        console.log('\nRun one of these commands to import:');
        console.log('  lsh zsh-import all          # Import everything');
        console.log('  lsh zsh-import aliases      # Import only aliases');
        console.log('  lsh zsh-import exports      # Import only exports');
        console.log('  lsh zsh-import functions    # Import only functions');
        process.exit(0);
        return;
      }

      console.log('📊 Last ZSH Import Status:\n');
      console.log(`   Total Items: ${stats.total}`);
      console.log(`   ✅ Succeeded: ${stats.succeeded}`);
      console.log(`   ❌ Failed: ${stats.failed}`);
      console.log(`   ⏭️  Skipped: ${stats.skipped}`);
      console.log(`   ⚠️  Conflicts: ${stats.conflicts}\n`);

      if (stats.byType) {
        console.log('By Type:');
        for (const [type, typeStats] of Object.entries(stats.byType)) {
          const ts = typeStats as any;
          console.log(`   ${type.padEnd(12)}: ${ts.succeeded}/${ts.total} succeeded, ${ts.failed} failed, ${ts.skipped} skipped`);
        }
      }

      const diagnosticLog = path.join(os.homedir(), '.lsh', 'zsh-import.log');
      if (fs.existsSync(diagnosticLog)) {
        console.log(`\nDiagnostic log: ${diagnosticLog}`);
        console.log('Run: cat ' + diagnosticLog + ' | tail -50');
      }

      process.exit(0);
    });

  zshCommand
    .command('diagnose')
    .description('Show failed imports from diagnostic log')
    .option('-n <number>', 'Number of recent entries to show', '20')
    .action((options) => {
      const diagnosticLog = path.join(os.homedir(), '.lsh', 'zsh-import.log');

      if (!fs.existsSync(diagnosticLog)) {
        console.log('No diagnostic log found.');
        console.log('Import ZSH config first: lsh zsh-import all');
        process.exit(1);
        return;
      }

      const content = fs.readFileSync(diagnosticLog, 'utf8');
      const lines = content.trim().split('\n');
      const numLines = parseInt(options.n, 10) || 20;
      const recentLines = lines.slice(-numLines);

      console.log(`📋 Recent ZSH Import Diagnostics (last ${numLines} entries):\n`);

      const failedLines = recentLines.filter(line => line.includes('failed') || line.includes('disabled'));

      if (failedLines.length === 0) {
        console.log('✅ No failed imports found!');
      } else {
        failedLines.forEach(line => {
          console.log('   ' + line);
        });
      }

      process.exit(0);
    });
}
