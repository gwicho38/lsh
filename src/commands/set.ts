/**
 * lsh set — write secrets into the local .env file. Publishing stays an explicit `lsh push`.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { resolveContext } from '../lib/workspace-context.js';
import { readLocalEnv, writeEnvUpdate } from '../lib/env-store.js';
import { isValidEnvironmentVariableName } from '../lib/format-utils.js';
import { extractErrorMessage } from '../lib/lsh-error.js';
import { SET_MESSAGES } from '../constants/ui.js';

export interface ParsedAssignments {
  updates: Record<string, string>;
  errors: string[];
}

function unquote(value: string): string {
  const quoted =
    (value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"));
  return quoted && value.length >= 2 ? value.slice(1, -1) : value;
}

/**
 * Parses KEY=VALUE lines, tolerating the `export ` prefix so `printenv`, a sourced profile,
 * and `lsh get --format export` can all be piped straight in.
 */
export function parseAssignments(input: string): ParsedAssignments {
  const updates: Record<string, string> = {};
  const errors: string[] = [];

  for (const line of input.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const match = trimmed.match(/^(?:export\s+)?([^=]+)=(.*)$/);
    if (!match) {
      errors.push(`${SET_MESSAGES.INVALID_LINE_PREFIX}${trimmed}`);
      continue;
    }

    const key = match[1].trim();
    if (!isValidEnvironmentVariableName(key)) {
      errors.push(`${SET_MESSAGES.INVALID_KEY_PREFIX}'${key}'${SET_MESSAGES.INVALID_KEY_SUFFIX}`);
      continue;
    }

    updates[key] = unquote(match[2].trim());
  }

  return { updates, errors };
}

export function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => {
      data += chunk;
    });
    process.stdin.on('end', () => resolve(data));
    process.stdin.on('error', reject);
  });
}

/**
 * Synchronous so the exit-code decision never crosses an await — see `require-atomic-updates`.
 */
function applyStdinAssignments(filePath: string, input: string): void {
  const { updates, errors } = parseAssignments(input);
  for (const error of errors) console.error(error);
  if (Object.keys(updates).length === 0) {
    console.error(SET_MESSAGES.NO_ASSIGNMENTS);
    process.exitCode = 1;
    return;
  }
  applyUpdates(filePath, updates);
}

function applyUpdates(filePath: string, updates: Record<string, string>): void {
  const before = readLocalEnv(filePath);
  writeEnvUpdate(filePath, updates, { ...before, ...updates });
  console.log(`${SET_MESSAGES.SET_PREFIX}${Object.keys(updates).join(', ')}${SET_MESSAGES.SET_COUNT_SUFFIX}${filePath}`);
  console.log(chalk.gray(SET_MESSAGES.PUSH_HINT));
}

export function registerSetCommand(program: Command): void {
  program
    .command('set [key] [value]')
    .description(SET_MESSAGES.DESCRIPTION)
    .option('-f, --file <path>', SET_MESSAGES.OPTION_FILE, '.env')
    .option('-g, --global', SET_MESSAGES.OPTION_GLOBAL)
    .option('--stdin', SET_MESSAGES.OPTION_STDIN)
    .action(async (key, value, options) => {
      const { manager, filePath } = resolveContext(options);
      try {
        if (options.stdin || (!key && value === undefined)) {
          if (process.stdin.isTTY) {
            console.error(SET_MESSAGES.STDIN_IS_TTY);
            console.error(SET_MESSAGES.USAGE);
            console.error(SET_MESSAGES.USAGE_STDIN);
            process.exitCode = 1;
            return;
          }

          applyStdinAssignments(filePath, await readStdin());
          return;
        }

        if (!key || value === undefined) {
          console.error(SET_MESSAGES.USAGE);
          console.error(SET_MESSAGES.USAGE_STDIN);
          process.exitCode = 1;
          return;
        }

        if (!isValidEnvironmentVariableName(key)) {
          console.error(`${SET_MESSAGES.INVALID_KEY_PREFIX}'${key}'${SET_MESSAGES.INVALID_KEY_SUFFIX}`);
          process.exitCode = 1;
          return;
        }

        applyUpdates(filePath, { [key]: value });
      } catch (error) {
        console.error(SET_MESSAGES.FAILED_TO_SET, extractErrorMessage(error));
        process.exitCode = 1;
      } finally {
        await manager.cleanup();
      }
    });
}
