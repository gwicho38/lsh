#!/usr/bin/env node

/**
 * LSH CLI Entry Point
 * Simple, cross-platform encrypted secrets manager
 */

import { Command } from 'commander';
import selfCommand from './commands/self.js';
import { registerInitCommands } from './commands/init.js';
import { registerDoctorCommands } from './commands/doctor.js';
import { registerCompletionCommands } from './commands/completion.js';
import { registerConfigCommands } from './commands/config.js';
import { registerSyncHistoryCommands } from './commands/sync-history.js';
import { registerSyncCommands } from './commands/sync.js';
import { registerMigrateCommand } from './commands/migrate.js';
import { registerContextCommand } from './commands/context.js';
import { init_secrets } from './services/secrets/secrets.js';
import { loadGlobalConfigSync } from './lib/config-manager.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get version from package.json
function getVersion(): string {
  try {
    const packageJsonPath = path.join(__dirname, '../package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    return packageJson.version || '1.2.0';
  } catch {
    return '1.2.0';
  }
}

const program = new Command();

program
  .name('lsh')
  .description('LSH - Simple, cross-platform encrypted secrets manager')
  .version(getVersion())
  .showSuggestionAfterError(true)
  .showHelpAfterError('(add --help for additional information)')
  .allowUnknownOption(false)
  .enablePositionalOptions();

// Main action - show help by default
program
  .option('-v, --verbose', 'Verbose output')
  .option('-d, --debug', 'Debug mode')
  .action(async (_options) => {
    // No arguments - show secrets-focused help
    console.log('LSH - Encrypted Secrets Manager');
    console.log('');
    console.log('🔐 Secrets Management Commands:');
    console.log('  init                    Interactive setup wizard (first-time setup)');
    console.log('  doctor                  Check configuration and connectivity');
    console.log('  sync                    Check sync status & get recommendations');
    console.log('  push                    Upload .env to encrypted cloud storage');
    console.log('  pull                    Download .env from cloud storage');
    console.log('  list                    List secrets in current local .env file');
    console.log('  env [name]              List/view cloud environments');
    console.log('  key                     Generate encryption key');
    console.log('  create                  Create new .env file');
    console.log('  get <key>               Get a specific secret value (--all for all)');
    console.log('  set <key> <value>       Set a specific secret value');
    console.log('  delete                  Delete .env file');
    console.log('  status                  Get detailed secrets status');
    console.log('');
    console.log('🔄 IPFS Sync:');
    console.log('  sync init               Full IPFS setup (install, init, start)');
    console.log('  sync push               Push secrets to IPFS → get CID');
    console.log('  sync pull <cid>         Pull secrets by CID');
    console.log('  sync status             Check IPFS and sync status');
    console.log('  sync start/stop         Control IPFS daemon');
    console.log('');
    console.log('🚀 Quick Start:');
    console.log('  lsh sync init                     # One-time IPFS setup');
    console.log('  lsh sync push                     # Push secrets to IPFS');
    console.log('  lsh sync pull <cid>               # Pull on another machine');
    console.log('');
    console.log('📚 More Commands:');
    console.log('  config                  Manage LSH configuration (~/.config/lsh/lshrc)');
    console.log('  self                    Self-management commands');
    console.log('  --help                  Show all options');
    console.log('');
    console.log('📖 Documentation: https://github.com/gwicho38/lsh');
  });

// Help subcommand
program
  .command('help')
  .description('Show detailed help')
  .action(() => {
    showDetailedHelp();
  });

/**
 * Calculate string similarity (Levenshtein distance)
 */
function similarity(s1: string, s2: string): number {
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;

  if (longer.length === 0) return 1.0;

  const editDistance = levenshtein(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

function levenshtein(s1: string, s2: string): number {
  const costs: number[] = [];
  for (let i = 0; i <= s1.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= s2.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else if (j > 0) {
        let newValue = costs[j - 1];
        if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) costs[s2.length] = lastValue;
  }
  return costs[s2.length];
}

/**
 * Find similar commands for suggestions
 */
function findSimilarCommands(input: string, validCommands: string[]): string[] {
  const similarities = validCommands
    .map(cmd => ({ cmd, score: similarity(input, cmd) }))
    .filter(item => item.score > 0.5) // Only suggest if similarity > 50%
    .sort((a, b) => b.score - a.score)
    .slice(0, 3); // Top 3 suggestions

  return similarities.map(item => item.cmd);
}

// Register async command modules
(async () => {
  // Essential onboarding commands
  // Load global configuration before anything else
  loadGlobalConfigSync();

  registerInitCommands(program);
  registerDoctorCommands(program);
  registerConfigCommands(program);
  registerSyncHistoryCommands(program);
  registerSyncCommands(program);
  registerMigrateCommand(program);
  registerContextCommand(program);

  // Secrets management (primary feature)
  await init_secrets(program);

  // Shell completion
  registerCompletionCommands(program);

  // Self-management commands
  program.addCommand(selfCommand);

  // Pre-parse check for unknown commands
  const args = process.argv.slice(2);
  if (args.length > 0) {
    const firstArg = args[0];
    // Include both command names AND their aliases
    const validCommands: string[] = [];
    program.commands.forEach(cmd => {
      validCommands.push(cmd.name());
      const aliases = cmd.aliases();
      if (aliases && aliases.length > 0) {
        validCommands.push(...aliases);
      }
    });
    const validOptions = ['-v', '--verbose', '-d', '--debug', '-h', '--help', '-V', '--version'];

    // Check if first argument looks like a command but isn't valid
    if (!firstArg.startsWith('-') &&
        !validCommands.includes(firstArg) &&
        !validOptions.some(opt => args.includes(opt))) {

      // For suggestions, only use primary command names (not aliases)
      const primaryCommands = program.commands.map(cmd => cmd.name());
      const suggestions = findSimilarCommands(firstArg, primaryCommands);
      console.error(`error: unknown command '${firstArg}'`);

      if (suggestions.length > 0) {
        console.error(`\nDid you mean one of these?`);
        suggestions.forEach(cmd => console.error(`    ${cmd}`));
      }

      console.error(`\nRun 'lsh --help' to see available commands.`);
      process.exit(1);
    }
  }

  // Configure custom error output for better suggestions
  program.configureOutput({
    writeErr: (str) => {
      // Intercept error messages to add suggestions
      if (str.includes('error: unknown command')) {
        const match = str.match(/unknown command '([^']+)'/);
        if (match) {
          const unknownCommand = match[1];
          const validCommands = program.commands.map(cmd => cmd.name());
          const suggestions = findSimilarCommands(unknownCommand, validCommands);

          process.stderr.write(str);
          if (suggestions.length > 0) {
            process.stderr.write(`\nDid you mean one of these?\n`);
            suggestions.forEach(cmd => process.stderr.write(`    ${cmd}\n`));
          }
          process.stderr.write(`\nRun 'lsh --help' to see available commands.\n`);
          return;
        }
      }
      process.stderr.write(str);
    }
  });

  // Add custom error handler for unknown commands
  program.on('command:*', (operands) => {
    const unknownCommand = operands[0];
    const validCommands = program.commands.map(cmd => cmd.name());
    const suggestions = findSimilarCommands(unknownCommand, validCommands);

    console.error(`error: unknown command '${unknownCommand}'`);

    if (suggestions.length > 0) {
      console.error(`\nDid you mean one of these?`);
      suggestions.forEach(cmd => console.error(`    ${cmd}`));
    }

    console.error(`\nRun 'lsh --help' to see available commands.`);
    process.exit(1);
  });

  // Parse command line arguments after all commands are registered
  program.parse(process.argv);
})();

/**
 * Show detailed help
 */
function showDetailedHelp(): void {
  console.log('LSH - Encrypted Secrets Manager');
  console.log('================================');
  console.log('');
  console.log('Usage:');
  console.log('  lsh                    Show help (default)');
  console.log('  lsh init               Interactive setup wizard');
  console.log('  lsh push               Push secrets to cloud');
  console.log('  lsh pull               Pull secrets from cloud');
  console.log('');
  console.log('Main Commands:');
  console.log('  init                   Interactive setup wizard (first-time)');
  console.log('  doctor                 Health check & troubleshooting');
  console.log('  env                    Show local .env file contents');
  console.log('  key                    Generate encryption key');
  console.log('  status                 Detailed status report');
  console.log('');
  console.log('IPFS Sync:');
  console.log('  sync init              Full IPFS setup (install, init, start)');
  console.log('  sync push              Push secrets to IPFS → get CID');
  console.log('  sync pull <cid>        Pull secrets by CID');
  console.log('  sync status            Check IPFS client, daemon, and sync status');
  console.log('  sync start             Start IPFS daemon');
  console.log('  sync stop              Stop IPFS daemon');
  console.log('  sync history           View sync history');
  console.log('');
  console.log('Self-Management:');
  console.log('  self update            Update to latest version');
  console.log('  self version           Show version information');
  console.log('  self uninstall         Uninstall from system');
  console.log('');
  console.log('Examples:');
  console.log('');
  console.log('  First-Time Setup:');
  console.log('    lsh sync init                           # One-time IPFS setup');
  console.log('    lsh doctor                              # Verify setup');
  console.log('');
  console.log('  Daily Usage:');
  console.log('    lsh sync push                           # Push to IPFS → get CID');
  console.log('    lsh sync pull <cid>                     # Pull by CID');
  console.log('    lsh env --masked                        # View local secrets');
  console.log('    lsh get API_KEY                         # Get specific secret');
  console.log('    lsh set API_KEY newvalue                # Update secret');
  console.log('');
  console.log('Features:');
  console.log('  ✅ Cross-platform (Windows, macOS, Linux)');
  console.log('  ✅ AES-256 encryption');
  console.log('  ✅ Multi-environment support');
  console.log('  ✅ Team collaboration');
  console.log('  ✅ Automatic secret rotation');
  console.log('  ✅ Git-aware namespacing');
  console.log('');
  console.log('Need help? Visit https://github.com/gwicho38/lsh');
}
