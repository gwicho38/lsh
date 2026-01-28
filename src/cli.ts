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
import { CLI_TEXT, CLI_HELP } from './constants/ui.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get version from package.json
// TODO(@gwicho38): Review - getVersion
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
  .name(CLI_TEXT.NAME)
  .description(CLI_TEXT.DESCRIPTION)
  .version(getVersion())
  .showSuggestionAfterError(true)
  .showHelpAfterError(CLI_TEXT.HELP_AFTER_ERROR)
  .allowUnknownOption(false)
  .enablePositionalOptions();

// Main action - show help by default
program
  .option(CLI_TEXT.OPTION_VERBOSE, CLI_TEXT.OPTION_VERBOSE_DESC)
  .option(CLI_TEXT.OPTION_DEBUG, CLI_TEXT.OPTION_DEBUG_DESC)
  .action(async (_options) => {
    // No arguments - show secrets-focused help
    console.log(CLI_HELP.TITLE);
    console.log('');
    console.log(CLI_HELP.SECTION_SECRETS);
    console.log(CLI_HELP.CMD_INIT);
    console.log(CLI_HELP.CMD_DOCTOR);
    console.log(CLI_HELP.CMD_SYNC);
    console.log(CLI_HELP.CMD_PUSH);
    console.log(CLI_HELP.CMD_PULL);
    console.log(CLI_HELP.CMD_LIST);
    console.log(CLI_HELP.CMD_ENV);
    console.log(CLI_HELP.CMD_KEY);
    console.log(CLI_HELP.CMD_CREATE);
    console.log(CLI_HELP.CMD_GET);
    console.log(CLI_HELP.CMD_SET);
    console.log(CLI_HELP.CMD_DELETE);
    console.log(CLI_HELP.CMD_STATUS);
    console.log('');
    console.log(CLI_HELP.SECTION_IPFS);
    console.log(CLI_HELP.CMD_SYNC_INIT);
    console.log(CLI_HELP.CMD_SYNC_PUSH);
    console.log(CLI_HELP.CMD_SYNC_PULL);
    console.log(CLI_HELP.CMD_SYNC_STATUS);
    console.log(CLI_HELP.CMD_SYNC_START_STOP);
    console.log('');
    console.log(CLI_HELP.SECTION_QUICK_START);
    console.log(CLI_HELP.QUICK_SYNC_INIT);
    console.log(CLI_HELP.QUICK_SYNC_PUSH);
    console.log(CLI_HELP.QUICK_SYNC_PULL);
    console.log('');
    console.log(CLI_HELP.SECTION_MORE);
    console.log(CLI_HELP.CMD_CONFIG);
    console.log(CLI_HELP.CMD_SELF);
    console.log(CLI_HELP.CMD_HELP_OPT);
    console.log('');
    console.log(CLI_HELP.DOCS_LINK);
  });

// Help subcommand
program
  .command('help')
  .description(CLI_TEXT.HELP_DESCRIPTION)
  .action(() => {
    showDetailedHelp();
  });

/**
 * Calculate string similarity (Levenshtein distance)
 */
// TODO(@gwicho38): Review - similarity
function similarity(s1: string, s2: string): number {
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;

  if (longer.length === 0) return 1.0;

  const editDistance = levenshtein(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

// TODO(@gwicho38): Review - levenshtein

// TODO(@gwicho38): Review - levenshtein
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
// TODO(@gwicho38): Review - findSimilarCommands
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
      console.error(`${CLI_TEXT.ERROR_UNKNOWN_COMMAND} '${firstArg}'`);

      if (suggestions.length > 0) {
        console.error(CLI_TEXT.DID_YOU_MEAN);
        suggestions.forEach(cmd => console.error(`    ${cmd}`));
      }

      console.error(CLI_TEXT.RUN_HELP);
      process.exit(1);
    }
  }

  // Configure custom error output for better suggestions
  program.configureOutput({
    writeErr: (str) => {
      // Intercept error messages to add suggestions
      if (str.includes(CLI_TEXT.ERROR_UNKNOWN_COMMAND)) {
        const match = str.match(/unknown command '([^']+)'/);
        if (match) {
          const unknownCommand = match[1];
          const validCommands = program.commands.map(cmd => cmd.name());
          const suggestions = findSimilarCommands(unknownCommand, validCommands);

          process.stderr.write(str);
          if (suggestions.length > 0) {
            process.stderr.write(`${CLI_TEXT.DID_YOU_MEAN}\n`);
            suggestions.forEach(cmd => process.stderr.write(`    ${cmd}\n`));
          }
          process.stderr.write(`${CLI_TEXT.RUN_HELP}\n`);
          return;
        }
      }
      process.stderr.write(str);
    }
  });

  // Add custom error handler for unknown commands
  program.on(CLI_TEXT.EVENT_UNKNOWN_COMMAND, (operands) => {
    const unknownCommand = operands[0];
    const validCommands = program.commands.map(cmd => cmd.name());
    const suggestions = findSimilarCommands(unknownCommand, validCommands);

    console.error(`${CLI_TEXT.ERROR_UNKNOWN_COMMAND} '${unknownCommand}'`);

    if (suggestions.length > 0) {
      console.error(CLI_TEXT.DID_YOU_MEAN);
      suggestions.forEach(cmd => console.error(`    ${cmd}`));
    }

    console.error(CLI_TEXT.RUN_HELP);
    process.exit(1);
  });

  // Parse command line arguments after all commands are registered
  program.parse(process.argv);
})();

/**
 * Show detailed help
 */
// TODO(@gwicho38): Review - showDetailedHelp
function showDetailedHelp(): void {
  console.log(CLI_HELP.TITLE);
  console.log(CLI_HELP.SEPARATOR);
  console.log('');
  console.log(CLI_HELP.SECTION_USAGE);
  console.log(CLI_HELP.USAGE_DEFAULT);
  console.log(CLI_HELP.USAGE_INIT);
  console.log(CLI_HELP.USAGE_PUSH);
  console.log(CLI_HELP.USAGE_PULL);
  console.log('');
  console.log(CLI_HELP.SECTION_MAIN_COMMANDS);
  console.log(CLI_HELP.MAIN_INIT);
  console.log(CLI_HELP.MAIN_DOCTOR);
  console.log(CLI_HELP.MAIN_ENV);
  console.log(CLI_HELP.MAIN_KEY);
  console.log(CLI_HELP.MAIN_STATUS);
  console.log('');
  console.log(CLI_HELP.SECTION_IPFS);
  console.log(CLI_HELP.DETAIL_SYNC_INIT);
  console.log(CLI_HELP.DETAIL_SYNC_PUSH);
  console.log(CLI_HELP.DETAIL_SYNC_PULL);
  console.log(CLI_HELP.DETAIL_SYNC_STATUS);
  console.log(CLI_HELP.DETAIL_SYNC_START);
  console.log(CLI_HELP.DETAIL_SYNC_STOP);
  console.log(CLI_HELP.DETAIL_SYNC_HISTORY);
  console.log('');
  console.log(CLI_HELP.SECTION_SELF_MANAGEMENT);
  console.log(CLI_HELP.SELF_UPDATE);
  console.log(CLI_HELP.SELF_VERSION);
  console.log(CLI_HELP.SELF_UNINSTALL);
  console.log('');
  console.log(CLI_HELP.SECTION_EXAMPLES);
  console.log('');
  console.log(`  ${CLI_HELP.SECTION_FIRST_TIME}`);
  console.log(CLI_HELP.EX_SYNC_INIT);
  console.log(CLI_HELP.EX_DOCTOR);
  console.log('');
  console.log(`  ${CLI_HELP.SECTION_DAILY_USAGE}`);
  console.log(CLI_HELP.EX_SYNC_PUSH);
  console.log(CLI_HELP.EX_SYNC_PULL);
  console.log(CLI_HELP.EX_ENV_MASKED);
  console.log(CLI_HELP.EX_GET);
  console.log(CLI_HELP.EX_SET);
  console.log('');
  console.log(CLI_HELP.SECTION_FEATURES);
  console.log(CLI_HELP.FEATURE_CROSS_PLATFORM);
  console.log(CLI_HELP.FEATURE_ENCRYPTION);
  console.log(CLI_HELP.FEATURE_MULTI_ENV);
  console.log(CLI_HELP.FEATURE_TEAM);
  console.log(CLI_HELP.FEATURE_ROTATION);
  console.log(CLI_HELP.FEATURE_GIT_AWARE);
  console.log('');
  console.log(CLI_HELP.NEED_HELP);
}
