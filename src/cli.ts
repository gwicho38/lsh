#!/usr/bin/env node

/**
 * LSH CLI Entry Point
 * Simple, cross-platform encrypted secrets manager
 */

import { Command } from 'commander';
import { registerPushCommand } from './commands/push.js';
import { registerPullCommand } from './commands/pull.js';
import { registerSyncCommand } from './commands/sync.js';
import { registerEditCommand } from './commands/edit.js';
import { registerListCommand } from './commands/list.js';
import { registerGetCommand } from './commands/get.js';
import { registerSetCommand } from './commands/set.js';
import { loadGlobalConfigSync } from './lib/config-manager.js';
import { removalMessage, syncSubcommandMessage } from './lib/removed-commands.js';
import { CLI_TEXT, CLI_HELP } from './constants/ui.js';
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
    console.log(CLI_HELP.CMD_SYNC);
    console.log(CLI_HELP.CMD_PUSH);
    console.log(CLI_HELP.CMD_PULL);
    console.log(CLI_HELP.CMD_EDIT);
    console.log(CLI_HELP.CMD_LIST);
    console.log(CLI_HELP.CMD_GET);
    console.log(CLI_HELP.CMD_SET);
    console.log('');
    console.log(CLI_HELP.SECTION_QUICK_START);
    console.log(CLI_HELP.QUICK_SYNC_INIT);
    console.log(CLI_HELP.QUICK_PUSH);
    console.log(CLI_HELP.QUICK_PULL);
    console.log('');
    console.log(CLI_HELP.SECTION_MORE);
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

  registerPushCommand(program);
  registerPullCommand(program);
  registerSyncCommand(program);
  registerEditCommand(program);
  registerListCommand(program);
  registerGetCommand(program);
  registerSetCommand(program);

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

    // commander arity-checks excess operands before any action runs, so a removed
    // `sync <subcommand>` must be caught here rather than inside sync's own action.
    if (firstArg === 'sync' && args[1] && !args[1].startsWith('-')) {
      const message = syncSubcommandMessage(args[1]);
      if (message) {
        console.error(message);
        process.exit(1);
      }
    }

    // Check if first argument looks like a command but isn't valid
    if (!firstArg.startsWith('-') &&
        !validCommands.includes(firstArg) &&
        !validOptions.some(opt => args.includes(opt))) {

      const removed = removalMessage(firstArg);
      if (removed) {
        console.error(removed);
        process.exit(1);
      }

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
function showDetailedHelp(): void {
  console.log(CLI_HELP.TITLE);
  console.log(CLI_HELP.SEPARATOR);
  console.log('');
  console.log(CLI_HELP.SECTION_USAGE);
  console.log(CLI_HELP.USAGE_DEFAULT);
  console.log(CLI_HELP.USAGE_PUSH);
  console.log(CLI_HELP.USAGE_PULL);
  console.log(CLI_HELP.USAGE_SYNC);
  console.log(CLI_HELP.USAGE_EDIT);
  console.log(CLI_HELP.USAGE_LIST);
  console.log(CLI_HELP.USAGE_GET);
  console.log(CLI_HELP.USAGE_SET);
  console.log('');
  console.log(CLI_HELP.SECTION_MAIN_COMMANDS);
  console.log(CLI_HELP.MAIN_PUSH);
  console.log(CLI_HELP.MAIN_PULL);
  console.log(CLI_HELP.MAIN_SYNC);
  console.log(CLI_HELP.MAIN_EDIT);
  console.log(CLI_HELP.MAIN_LIST);
  console.log(CLI_HELP.MAIN_GET);
  console.log(CLI_HELP.MAIN_SET);
  console.log('');
  console.log(CLI_HELP.SECTION_SYNC_FLAGS);
  console.log(CLI_HELP.SYNC_FLAG_INIT);
  console.log(CLI_HELP.SYNC_FLAG_KEY);
  console.log(CLI_HELP.SYNC_FLAG_DOCTOR);
  console.log(CLI_HELP.SYNC_FLAG_STATUS);
  console.log(CLI_HELP.SYNC_FLAG_LOAD);
  console.log(CLI_HELP.SYNC_FLAG_CONFIG);
  console.log(CLI_HELP.SYNC_FLAG_REPAIR);
  console.log(CLI_HELP.SYNC_FLAG_HISTORY);
  console.log(CLI_HELP.SYNC_FLAG_VERIFY);
  console.log('');
  console.log(CLI_HELP.SECTION_EDIT_FLAGS);
  console.log(CLI_HELP.EDIT_FLAG_GET);
  console.log(CLI_HELP.EDIT_FLAG_SET);
  console.log(CLI_HELP.EDIT_FLAG_LIST);
  console.log(CLI_HELP.EDIT_FLAG_COPY_FROM);
  console.log('');
  console.log(CLI_HELP.SECTION_LIST_FLAGS);
  console.log(CLI_HELP.LIST_FLAG_KEYS_ONLY);
  console.log(CLI_HELP.LIST_FLAG_FORMAT);
  console.log(CLI_HELP.LIST_FLAG_NO_MASK);
  console.log('');
  console.log(CLI_HELP.SECTION_GET_FLAGS);
  console.log(CLI_HELP.GET_FLAG_ALL);
  console.log(CLI_HELP.GET_FLAG_FORMAT);
  console.log(CLI_HELP.GET_FLAG_EXACT);
  console.log('');
  console.log(CLI_HELP.SECTION_SET_FLAGS);
  console.log(CLI_HELP.SET_FLAG_STDIN);
  console.log('');
  console.log(CLI_HELP.SECTION_EXAMPLES);
  console.log('');
  console.log(`  ${CLI_HELP.SECTION_FIRST_TIME}`);
  console.log(CLI_HELP.EX_SYNC_INIT);
  console.log(CLI_HELP.EX_SYNC_DOCTOR);
  console.log('');
  console.log(`  ${CLI_HELP.SECTION_DAILY_USAGE}`);
  console.log(CLI_HELP.EX_PUSH);
  console.log(CLI_HELP.EX_PULL);
  console.log(CLI_HELP.EX_EDIT_LIST);
  console.log(CLI_HELP.EX_EDIT_GET);
  console.log(CLI_HELP.EX_EDIT_SET);
  console.log(CLI_HELP.EX_LIST);
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
