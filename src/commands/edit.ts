/**
 * lsh edit — edit the local .env, then optionally publish the change.
 */

import { Command } from 'commander';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as readline from 'readline';
import chalk from 'chalk';
import { resolveContext } from '../lib/workspace-context.js';
import { getGitRepoInfo, ensureEnvInGitignore } from '../lib/git-utils.js';
import { parseEnv, serializeEnv, upsertEnv, diffEnv, type EnvDiff } from '../lib/env-file.js';
import { formatSecrets, type OutputFormat, type SecretEntry } from '../lib/format-utils.js';
import { IPFSClientManager } from '../lib/ipfs-client-manager.js';
import { extractErrorMessage } from '../lib/lsh-error.js';
import { EDIT_MESSAGES } from '../constants/ui.js';
import { ENV_BACKUP_SUFFIX_PATTERN } from '../constants/paths.js';
import { ENV_VARS } from '../constants/config.js';

const DEFAULT_EDITOR = 'vi';
const VALID_FORMATS: OutputFormat[] = ['env', 'json', 'yaml', 'toml', 'export'];

export function shouldPrompt(): boolean {
  return Boolean(process.stdin.isTTY);
}

export function openInEditor(filePath: string): Promise<void> {
  const editor = process.env.EDITOR || process.env.VISUAL || DEFAULT_EDITOR;
  return new Promise((resolve, reject) => {
    const child = spawn(editor, [filePath], { stdio: 'inherit' });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${editor} exited with code ${code}`));
    });
  });
}

export function normalizeFormat(format: string): OutputFormat {
  if (!(VALID_FORMATS as string[]).includes(format)) {
    throw new Error(
      `${EDIT_MESSAGES.UNKNOWN_FORMAT_PREFIX}'${format}'${EDIT_MESSAGES.VALID_FORMATS_PREFIX}${VALID_FORMATS.join(', ')}`,
    );
  }
  return format as OutputFormat;
}

export function parseSetAssignment(assignment: string): { key: string; value: string } | null {
  const eq = assignment.indexOf('=');
  if (eq < 1) return null;
  return { key: assignment.slice(0, eq).trim(), value: assignment.slice(eq + 1) };
}

/**
 * SecretsManager.pull requires the basename to be `.env` or start with `.env.`; naming the
 * temp file this way (regardless of the target's own basename) always satisfies that guard.
 */
export function copyFromTempPath(filePath: string): string {
  return path.join(path.dirname(filePath), `.env.copyfrom.${process.pid}`);
}

export function toEntries(vars: Record<string, string>): SecretEntry[] {
  return Object.entries(vars).map(([key, value]) => ({ key, value }));
}

export type ReadOnlyResult = { kind: 'ok'; output: string } | { kind: 'not-found'; key: string };

/**
 * `--list` always masks; `--get` never masks, because the user explicitly asked for values.
 */
export function resolveGetOrList(
  vars: Record<string, string>,
  options: { get?: string | boolean; all?: boolean; list?: boolean; format: OutputFormat },
): ReadOnlyResult {
  if (options.list) {
    return { kind: 'ok', output: formatSecrets(toEntries(vars), options.format, true) };
  }

  if (options.all || options.get === true) {
    return { kind: 'ok', output: formatSecrets(toEntries(vars), options.format, false) };
  }

  const key = String(options.get);
  if (!(key in vars)) return { kind: 'not-found', key };
  return { kind: 'ok', output: vars[key] };
}

export function formatEditSummary(diff: EnvDiff): string {
  const summary = [
    ...diff.changed.map((k) => chalk.yellow(`~${k}`)),
    ...diff.added.map((k) => chalk.green(`+${k}`)),
    ...diff.removed.map((k) => chalk.red(`-${k}`)),
  ].join('  ');
  const count = diff.added.length + diff.changed.length + diff.removed.length;
  const label = count === 1 ? EDIT_MESSAGES.KEY_LABEL : EDIT_MESSAGES.KEYS_LABEL;
  return `${count} ${label}${EDIT_MESSAGES.EDITED_SUFFIX}${summary}`;
}

/**
 * Interprets a raw confirm() answer against a "[Y/n]" prompt. Empty, `y`, and `yes` proceed;
 * everything else — including `n`, `no`, and unrecognized input — cancels, since an IPFS
 * publish can't be retracted and the safe default is not to publish.
 */
export function parseConfirmAnswer(answer: string): boolean {
  const normalized = answer.trim().toLowerCase();
  return normalized === '' || normalized === 'y' || normalized === 'yes';
}

function confirm(question: string): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(parseConfirmAnswer(answer));
    });
  });
}

function homeDir(): string {
  return process.env[ENV_VARS.HOME] || process.env[ENV_VARS.USERPROFILE] || os.homedir();
}

/**
 * The gitignore patterns that cover `filePath` itself and its `.backup.<timestamp>` siblings,
 * regardless of the file's basename — so `--file app.env` is covered exactly like `.env`.
 */
function gitignorePatternsForFile(filePath: string): string[] {
  const base = path.basename(filePath);
  return [base, `${base}${ENV_BACKUP_SUFFIX_PATTERN}`];
}

/**
 * Installs gitignore coverage for `filePath` before it's written, so a freshly created or
 * backed-up plaintext secrets file is never briefly stageable. Skipped at the home directory
 * itself — a `--global` write must not touch a user's personal dotfiles `.gitignore`.
 */
function ensureTargetGitignored(filePath: string): void {
  const dir = path.dirname(filePath);
  if (dir === homeDir()) return;
  if (getGitRepoInfo(dir)?.isGitRepo) {
    ensureEnvInGitignore(dir, gitignorePatternsForFile(filePath));
  }
}

/**
 * Backs up an existing secrets file before a targeted edit overwrites it, mirroring
 * SecretsManager.pull. The backup carries the same plaintext secrets as the file it's
 * copied from, so the git-ignore patterns that cover it must exist before it's written.
 */
export function backupEnvFile(filePath: string): void {
  if (!fs.existsSync(filePath)) return;
  ensureTargetGitignored(filePath);
  fs.copyFileSync(filePath, `${filePath}.backup.${Date.now()}`);
}

function readLocal(filePath: string): Record<string, string> {
  if (!fs.existsSync(filePath)) return {};
  return parseEnv(fs.readFileSync(filePath, 'utf8'));
}

/**
 * Writes `updates` into `filePath`. An existing file is backed up, then patched in place with
 * `upsertEnv` to preserve every line `updates` doesn't touch; a missing file is created fresh
 * from `fullContent` since there is nothing to preserve.
 */
function writeEnvUpdate(filePath: string, updates: Record<string, string>, fullContent: Record<string, string>): void {
  if (fs.existsSync(filePath)) {
    backupEnvFile(filePath);
    const raw = fs.readFileSync(filePath, 'utf8');
    fs.writeFileSync(filePath, upsertEnv(raw, updates), { mode: 0o600 });
    return;
  }
  ensureTargetGitignored(filePath);
  fs.writeFileSync(filePath, serializeEnv(fullContent), { mode: 0o600 });
}

interface PushCapableManager {
  push: (f: string, e: string, force?: boolean) => Promise<void>;
  pull: (f: string, e: string, force?: boolean) => Promise<void>;
}

async function maybePush(
  manager: PushCapableManager,
  filePath: string,
  environment: string,
  before: Record<string, string>,
  after: Record<string, string>,
  pushAllowed: boolean,
): Promise<void> {
  const diff = diffEnv(after, before);
  if (diff.isEmpty) {
    console.log(chalk.gray(EDIT_MESSAGES.NO_CHANGES));
    return;
  }

  console.log(formatEditSummary(diff));

  if (!pushAllowed || !shouldPrompt()) {
    console.log(chalk.gray(`${EDIT_MESSAGES.NOT_PUSHED_HINT_PREFIX}${environment}`));
    return;
  }

  const yes = await confirm(`${EDIT_MESSAGES.PUSH_PROMPT_PREFIX}${environment}${EDIT_MESSAGES.PUSH_PROMPT_SUFFIX}`);
  if (!yes) {
    console.log(chalk.gray(EDIT_MESSAGES.NOT_PUSHED));
    return;
  }

  await new IPFSClientManager().ensureDaemonRunning();
  await manager.push(filePath, environment);
}

export function registerEditCommand(program: Command): void {
  program
    .command('edit')
    .description(EDIT_MESSAGES.DESCRIPTION)
    .option('-f, --file <path>', EDIT_MESSAGES.OPTION_FILE, '.env')
    .option('-e, --env <name>', EDIT_MESSAGES.OPTION_ENV, 'dev')
    .option('-g, --global', EDIT_MESSAGES.OPTION_GLOBAL)
    .option('--get [key]', EDIT_MESSAGES.OPTION_GET)
    .option('--all', EDIT_MESSAGES.OPTION_ALL)
    .option('--set <assignment>', EDIT_MESSAGES.OPTION_SET)
    .option('--list', EDIT_MESSAGES.OPTION_LIST)
    .option('--copy-from <env>', EDIT_MESSAGES.OPTION_COPY_FROM)
    .option('--no-push', EDIT_MESSAGES.OPTION_NO_PUSH)
    .option('--format <format>', EDIT_MESSAGES.OPTION_FORMAT, 'env')
    .action(async (options) => {
      const { manager, filePath, environment } = resolveContext(options);
      try {
        // --get / --list are read-only and never touch the editor.
        if (options.get !== undefined || options.list) {
          if (!fs.existsSync(filePath)) {
            console.error(`${EDIT_MESSAGES.NO_ENV_FILE_PREFIX}${filePath}`);
            process.exitCode = 1;
            return;
          }
          const vars = readLocal(filePath);
          const format = normalizeFormat(options.format);
          const result = resolveGetOrList(vars, { get: options.get, all: options.all, list: options.list, format });

          if (result.kind === 'not-found') {
            console.error(`${EDIT_MESSAGES.KEY_NOT_FOUND_PREFIX}${result.key}`);
            process.exitCode = 1;
            return;
          }
          console.log(result.output);
          return;
        }

        const before = readLocal(filePath);

        if (options.set) {
          const assignment = parseSetAssignment(options.set);
          if (!assignment) {
            console.error(EDIT_MESSAGES.SET_USAGE);
            process.exitCode = 1;
            return;
          }
          const next = { ...before, [assignment.key]: assignment.value };
          writeEnvUpdate(filePath, { [assignment.key]: assignment.value }, next);
          await maybePush(manager, filePath, environment, before, next, options.push);
          return;
        }

        if (options.copyFrom) {
          const tmp = copyFromTempPath(filePath);
          try {
            await new IPFSClientManager().ensureDaemonRunning();
            await manager.pull(tmp, options.copyFrom, true);
            const incoming = readLocal(tmp);
            const merged = { ...before, ...incoming };
            writeEnvUpdate(filePath, incoming, merged);
            const mergedCount = Object.keys(incoming).length;
            const mergedLabel = mergedCount === 1 ? EDIT_MESSAGES.KEY_LABEL : EDIT_MESSAGES.KEYS_LABEL;
            console.log(
              `${EDIT_MESSAGES.MERGED_PREFIX}${mergedCount} ${mergedLabel}${EDIT_MESSAGES.MERGED_SUFFIX}${options.copyFrom}`,
            );
            await maybePush(manager, filePath, environment, before, merged, options.push);
          } finally {
            if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
          }
          return;
        }

        // Default path: open the editor.
        if (!fs.existsSync(filePath)) {
          ensureTargetGitignored(filePath);
          fs.writeFileSync(filePath, '', { mode: 0o600 });
          console.log(chalk.gray(`${EDIT_MESSAGES.CREATED_FILE_PREFIX}${filePath}`));
        }
        await openInEditor(filePath);
        const after = readLocal(filePath);
        await maybePush(manager, filePath, environment, before, after, options.push);
      } catch (error) {
        console.error(EDIT_MESSAGES.FAILED_TO_EDIT, extractErrorMessage(error));
        process.exitCode = 1;
      } finally {
        await manager.cleanup();
      }
    });
}
