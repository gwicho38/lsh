/**
 * lsh list — print secrets from the local .env file.
 */

import { Command } from 'commander';
import * as fs from 'fs';
import { resolveContext } from '../lib/workspace-context.js';
import { parseEnv } from '../lib/env-file.js';
import { formatSecrets, type OutputFormat, type SecretEntry } from '../lib/format-utils.js';
import { extractErrorMessage } from '../lib/lsh-error.js';
import { LIST_MESSAGES } from '../constants/ui.js';

const VALID_FORMATS: OutputFormat[] = ['env', 'json', 'yaml', 'toml', 'export'];

export function normalizeFormat(format: string): OutputFormat {
  if (!(VALID_FORMATS as string[]).includes(format)) {
    throw new Error(
      `${LIST_MESSAGES.UNKNOWN_FORMAT_PREFIX}'${format}'${LIST_MESSAGES.VALID_FORMATS_PREFIX}${VALID_FORMATS.join(', ')}`,
    );
  }
  return format as OutputFormat;
}

function toEntries(vars: Record<string, string>): SecretEntry[] {
  return Object.entries(vars).map(([key, value]) => ({ key, value }));
}

export function registerListCommand(program: Command): void {
  program
    .command('list')
    .alias('ls')
    .description(LIST_MESSAGES.DESCRIPTION)
    .option('-f, --file <path>', LIST_MESSAGES.OPTION_FILE, '.env')
    .option('-g, --global', LIST_MESSAGES.OPTION_GLOBAL)
    .option('--keys-only', LIST_MESSAGES.OPTION_KEYS_ONLY)
    .option('--format <type>', LIST_MESSAGES.OPTION_FORMAT, 'env')
    .option('--no-mask', LIST_MESSAGES.OPTION_NO_MASK)
    .action(async (options) => {
      const { manager, filePath } = resolveContext(options);
      try {
        if (!fs.existsSync(filePath)) {
          console.error(`${LIST_MESSAGES.NO_ENV_FILE_PREFIX}${filePath}`);
          console.error(`${LIST_MESSAGES.PULL_HINT_PREFIX}<environment>`);
          process.exitCode = 1;
          return;
        }

        const vars = parseEnv(fs.readFileSync(filePath, 'utf8'));

        if (options.keysOnly) {
          for (const key of Object.keys(vars)) console.log(key);
          return;
        }

        const format = normalizeFormat(options.format);
        const mask = options.mask === false ? false : format === 'env';
        console.log(formatSecrets(toEntries(vars), format, mask));
      } catch (error) {
        console.error(LIST_MESSAGES.FAILED_TO_LIST, extractErrorMessage(error));
        process.exitCode = 1;
      } finally {
        await manager.cleanup();
      }
    });
}
