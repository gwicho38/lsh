/**
 * lsh get — print one secret value from the local .env file.
 */

import { Command } from 'commander';
import * as fs from 'fs';
import { resolveContext } from '../lib/workspace-context.js';
import { readLocalEnv } from '../lib/env-store.js';
import { findFuzzyMatches, type FuzzyMatchResult } from '../lib/fuzzy-match.js';
import { formatSecrets, maskSecret, type OutputFormat, type SecretEntry } from '../lib/format-utils.js';
import { extractErrorMessage } from '../lib/lsh-error.js';
import { GET_MESSAGES } from '../constants/ui.js';

const VALID_FORMATS: OutputFormat[] = ['env', 'json', 'yaml', 'toml', 'export'];

/**
 * A fuzzy result this strong, this far ahead of the runner-up, is treated as what the user
 * meant rather than as an ambiguity worth interrupting them over.
 */
const CLEAR_WINNER_SCORE = 700;
const CLEAR_WINNER_RATIO = 2;

export function normalizeFormat(format: string): OutputFormat {
  if (!(VALID_FORMATS as string[]).includes(format)) {
    throw new Error(
      `${GET_MESSAGES.UNKNOWN_FORMAT_PREFIX}'${format}'${GET_MESSAGES.VALID_FORMATS_PREFIX}${VALID_FORMATS.join(', ')}`,
    );
  }
  return format as OutputFormat;
}

function toEntries(vars: Record<string, string>): SecretEntry[] {
  return Object.entries(vars).map(([key, value]) => ({ key, value }));
}

export type GetResult =
  | { kind: 'value'; value: string }
  | { kind: 'formatted'; output: string }
  | { kind: 'key-required' }
  | { kind: 'not-found'; key: string; exact: boolean }
  | { kind: 'ambiguous'; key: string; matches: FuzzyMatchResult[] };

export interface GetOptions {
  key?: string;
  all?: boolean;
  exact?: boolean;
  format: OutputFormat;
}

/**
 * An exact key always wins outright, so a script naming a real key can never be answered with
 * a fuzzy neighbour's value. Fuzzy matching only runs once the exact lookup has missed.
 */
export function resolveGet(vars: Record<string, string>, options: GetOptions): GetResult {
  if (options.all) {
    return { kind: 'formatted', output: formatSecrets(toEntries(vars), options.format, false) };
  }

  const key = options.key;
  if (!key) return { kind: 'key-required' };

  if (key in vars) return { kind: 'value', value: vars[key] };
  if (options.exact) return { kind: 'not-found', key, exact: true };

  const matches = findFuzzyMatches(key, toEntries(vars));
  if (matches.length === 0) return { kind: 'not-found', key, exact: false };
  if (matches.length === 1) return { kind: 'value', value: matches[0].value };

  const [best, runnerUp] = matches;
  if (best.score >= CLEAR_WINNER_SCORE && best.score >= runnerUp.score * CLEAR_WINNER_RATIO) {
    return { kind: 'value', value: best.value };
  }

  return { kind: 'ambiguous', key, matches };
}

export function formatAmbiguousMatches(matches: FuzzyMatchResult[], mask: boolean): string {
  return matches.map(({ key, value }) => `  ${key}=${mask ? maskSecret(value) : value}`).join('\n');
}

export function registerGetCommand(program: Command): void {
  program
    .command('get [key]')
    .description(GET_MESSAGES.DESCRIPTION)
    .option('-f, --file <path>', GET_MESSAGES.OPTION_FILE, '.env')
    .option('-g, --global', GET_MESSAGES.OPTION_GLOBAL)
    .option('--all', GET_MESSAGES.OPTION_ALL)
    .option('--export', GET_MESSAGES.OPTION_EXPORT)
    .option('--format <type>', GET_MESSAGES.OPTION_FORMAT, 'env')
    .option('--exact', GET_MESSAGES.OPTION_EXACT)
    .option('--no-mask', GET_MESSAGES.OPTION_NO_MASK)
    .action(async (key, options) => {
      const { manager, filePath } = resolveContext(options);
      try {
        if (!fs.existsSync(filePath)) {
          console.error(`${GET_MESSAGES.NO_ENV_FILE_PREFIX}${filePath}`);
          console.error(`${GET_MESSAGES.PULL_HINT_PREFIX}<environment>`);
          process.exitCode = 1;
          return;
        }

        const format = normalizeFormat(options.export ? 'export' : options.format);
        const result = resolveGet(readLocalEnv(filePath), { key, all: options.all, exact: options.exact, format });

        switch (result.kind) {
          case 'value':
            console.log(result.value);
            return;
          case 'formatted':
            console.log(result.output);
            return;
          case 'key-required':
            console.error(GET_MESSAGES.KEY_REQUIRED);
            process.exitCode = 1;
            return;
          case 'not-found':
            console.error(`${GET_MESSAGES.KEY_NOT_FOUND_PREFIX}${result.key}`);
            if (result.exact) console.error(GET_MESSAGES.EXACT_HINT);
            process.exitCode = 1;
            return;
          case 'ambiguous':
            console.error(`${GET_MESSAGES.AMBIGUOUS_PREFIX}'${result.key}'${GET_MESSAGES.AMBIGUOUS_SUFFIX}`);
            console.error(formatAmbiguousMatches(result.matches, options.mask !== false));
            console.error(GET_MESSAGES.AMBIGUOUS_HINT);
            process.exitCode = 1;
            return;
        }
      } catch (error) {
        console.error(GET_MESSAGES.FAILED_TO_GET, extractErrorMessage(error));
        process.exitCode = 1;
      } finally {
        await manager.cleanup();
      }
    });
}
