/**
 * lsh sync — reconcile local and remote secrets, and report sync/IPFS state.
 * Also carries the operational control plane: setup, keys, config, and health.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { resolveContext } from '../lib/workspace-context.js';
import { extractErrorMessage } from '../lib/lsh-error.js';
import { IPFSClientManager } from '../lib/ipfs-client-manager.js';
import { getIPFSSync } from '../lib/ipfs-sync.js';
import { IPFSSecretsStorage } from '../lib/ipfs-secrets-storage.js';
import { IPFSSyncLogger } from '../lib/ipfs-sync-logger.js';
import { getGitRepoInfo } from '../lib/git-utils.js';
import { getConfigManager } from '../lib/config-manager.js';
import { findEncryptionKey, findEncryptionKeyWithSource } from '../lib/secrets-manager.js';
import { ENV_VARS } from '../constants/config.js';
import { runDoctor } from '../lib/doctor.js';
import { runSetupWizard } from '../lib/setup-wizard.js';
import { SYNC_MESSAGES } from '../constants/ui.js';
import { writeSecretFileSync } from '../lib/secure-file-writer.js';

export interface SyncStatus {
  localExists: boolean;
  localKeys: number;
  cloudExists: boolean;
  cloudKeys: number;
  keySet: boolean;
  keyMatches?: boolean;
  suggestions: string[];
}

interface SmartSyncCapable {
  smartSync: (
    filePath: string,
    environment: string,
    autoExecute: boolean,
    loadMode: boolean,
    force: boolean,
  ) => Promise<void>;
}

export function isExportLine(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith('export ');
}

// Loggers in IPFSSync/IPFSSecretsStorage/IPNSKeyManager/IPFSClientManager are built at import time and write straight to console.log.
export async function withFilteredStdout<T>(shouldPrint: (value: unknown) => boolean, fn: () => Promise<T>): Promise<T> {
  const originalLog = console.log;
  console.log = (...args: unknown[]) => {
    if (shouldPrint(args[0])) originalLog(...args);
  };
  try {
    return await fn();
  } finally {
    // Safe - single process, no concurrent console.log writers.
    // eslint-disable-next-line require-atomic-updates
    console.log = originalLog;
  }
}

export async function runSmartSync(
  manager: SmartSyncCapable,
  filePath: string,
  environment: string,
  loadMode: boolean,
  force: boolean,
): Promise<void> {
  if (!loadMode) {
    await new IPFSClientManager().ensureDaemonRunning();
    await manager.smartSync(filePath, environment, true, false, force);
    return;
  }
  await withFilteredStdout(isExportLine, async () => {
    await new IPFSClientManager().ensureDaemonRunning();
    await manager.smartSync(filePath, environment, true, true, force);
  });
}

export function printStatus(status: SyncStatus, environment: string, daemonReachable: boolean): void {
  const mark = (ok: boolean) => (ok ? chalk.green('yes') : chalk.yellow('no'));
  console.log(chalk.bold(`\n${SYNC_MESSAGES.STATUS_HEADER_PREFIX}${environment}\n`));
  console.log(`${SYNC_MESSAGES.LOCAL_LABEL}${mark(status.localExists)}  (${status.localKeys} keys)`);
  if (daemonReachable) {
    console.log(`${SYNC_MESSAGES.REMOTE_LABEL}${mark(status.cloudExists)}  (${status.cloudKeys} keys)`);
  } else {
    console.log(
      `${SYNC_MESSAGES.REMOTE_LABEL}${chalk.yellow(SYNC_MESSAGES.REMOTE_UNKNOWN)}${SYNC_MESSAGES.REMOTE_UNKNOWN_HINT}`,
    );
  }
  console.log(`${SYNC_MESSAGES.KEY_SET_LABEL}${mark(status.keySet)}`);
  if (status.keyMatches !== undefined) {
    console.log(`${SYNC_MESSAGES.KEY_MATCHES_LABEL}${mark(status.keyMatches)}`);
  }
  if (!daemonReachable) {
    console.log(chalk.gray(SYNC_MESSAGES.DAEMON_UNREACHABLE_HINT));
  }
  if (status.suggestions.length > 0) {
    console.log(chalk.bold(SYNC_MESSAGES.SUGGESTIONS_HEADER));
    status.suggestions.forEach((s) => console.log(`${SYNC_MESSAGES.SUGGESTION_PREFIX}${s}`));
  }
  console.log('');
}

/**
 * Reads LSH_SECRETS_KEY directly out of a specific .env file, tolerating
 * optional surrounding quotes. Mirrors secrets-manager.ts's private
 * readKeyFromEnvFile so the two behave identically on quoted values.
 */
export function readKeyFrom(envPath: string): string | null {
  if (!fs.existsSync(envPath)) return null;
  const content = fs.readFileSync(envPath, 'utf-8');
  const match = content.match(/^LSH_SECRETS_KEY=['"]?([^'"\n]+)['"]?/m);
  return match ? match[1] : null;
}

/**
 * Import an encryption key into a local .env file. Replacing an existing, different key
 * makes secrets already pushed with the old key permanently undecryptable, so that path
 * is refused unless `force` is set. Two independent risks are guarded:
 *   - the file about to be written already holds a different key (an overwrite), and
 *   - a non-global write would take priority over a different key that is currently
 *     effective from the lower-priority global ~/.env (a silent shadow).
 * A global write is already the lowest-priority tier, so it can never shadow anything —
 * checking it against `findEncryptionKeyWithSource()` there would refuse based on a key
 * (e.g. an env var) that the write can't actually affect.
 */
export function importKey(value: string, force: boolean, global: boolean, file: string): void {
  if (!/^[0-9a-fA-F]{64}$/.test(value)) {
    console.error(SYNC_MESSAGES.KEY_INVALID_FORMAT);
    process.exitCode = 1;
    return;
  }

  // Matches findEncryptionKeyWithSource()'s own global-tier resolution exactly, so a --global
  // write always lands on the same path the guard (and future lookups) will check against.
  const homeDir = process.env[ENV_VARS.HOME] || process.env[ENV_VARS.USERPROFILE] || os.homedir();
  const envPath = global ? path.join(homeDir, '.env') : path.resolve(file);
  const inFile = readKeyFrom(envPath);
  const effective = findEncryptionKeyWithSource();

  // Idempotent only when the write is a true no-op: the target file already holds this exact
  // key. A key merely effective from elsewhere still needs persisting into the target file.
  if (inFile === value) {
    console.log(SYNC_MESSAGES.KEY_ALREADY_CONFIGURED);
    return;
  }

  if (!force) {
    if (inFile && inFile !== value) {
      console.error(`${SYNC_MESSAGES.KEY_REPLACE_REFUSED_1_PREFIX}${envPath}${SYNC_MESSAGES.KEY_REPLACE_REFUSED_1_SUFFIX}`);
      console.error(SYNC_MESSAGES.KEY_REPLACE_REFUSED_2);
      console.error(SYNC_MESSAGES.KEY_REPLACE_REFUSED_3);
      process.exitCode = 1;
      return;
    }

    // The shadow risk only exists when `envPath` is the exact file findEncryptionKeyWithSource()
    // consults for the local tier — writing anywhere else can't take priority over anything.
    const localLookupPath = path.join(process.cwd(), '.env');
    if (!global && envPath === localLookupPath && effective && effective.source !== 'env' && effective.key !== value) {
      console.error(`${SYNC_MESSAGES.KEY_SHADOW_REFUSED_1_PREFIX}${effective.source}${SYNC_MESSAGES.KEY_SHADOW_REFUSED_1_SUFFIX}`);
      console.error(SYNC_MESSAGES.KEY_SHADOW_REFUSED_2);
      console.error(SYNC_MESSAGES.KEY_REPLACE_REFUSED_3);
      process.exitCode = 1;
      return;
    }
  }

  let content: string;
  if (fs.existsSync(envPath)) {
    const existing = fs.readFileSync(envPath, 'utf-8');
    content = /^LSH_SECRETS_KEY=/m.test(existing)
      ? existing.replace(/^LSH_SECRETS_KEY=.*/m, `LSH_SECRETS_KEY=${value}`)
      : `${existing.trimEnd()}\nLSH_SECRETS_KEY=${value}\n`;
  } else {
    content = `LSH_SECRETS_KEY=${value}\n`;
  }
  writeSecretFileSync(envPath, content);
  console.log(`${SYNC_MESSAGES.KEY_SAVED_PREFIX}${envPath}`);

  const effectiveAfter = findEncryptionKey();
  if (effectiveAfter !== value) {
    console.log(SYNC_MESSAGES.KEY_EFFECTIVE_DIFFERS);
  }
}

const SECRET_CONFIG_KEY_SUBSTRINGS = [
  'LSH_SECRETS_KEY',
  'LSH_MASTER_KEY',
  'LSH_API_KEY',
  'LSH_JWT_SECRET',
  'SUPABASE_ANON_KEY',
  'GITHUB_WEBHOOK_SECRET',
  'GITLAB_WEBHOOK_SECRET',
  'JENKINS_WEBHOOK_SECRET',
  'RESEND_API_KEY',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'DATABASE_URL',
];

export function maskConfigValue(key: string, value: string): string {
  const isSecret = SECRET_CONFIG_KEY_SUBSTRINGS.some((substr) => key.includes(substr));
  return isSecret ? `***${value.slice(-4)}` : value;
}

/** Prints the resolved LSH configuration (~/.config/lsh/lshrc) and its path. */
export async function printConfig(format: string): Promise<void> {
  const manager = getConfigManager();
  const configPath = manager.getConfigPath();
  const config = await manager.load();
  const keys = Object.keys(config)
    .filter((key) => config[key] !== undefined && config[key] !== '')
    .sort();

  if (format === 'json') {
    const masked = Object.fromEntries(keys.map((key) => [key, maskConfigValue(key, config[key] as string)]));
    console.log(JSON.stringify({ path: configPath, config: masked }, null, 2));
    return;
  }

  console.log(`${SYNC_MESSAGES.CONFIG_PATH_PREFIX}${configPath}`);
  console.log('');
  if (keys.length === 0) {
    console.log(SYNC_MESSAGES.CONFIG_EMPTY);
    return;
  }
  for (const key of keys) {
    console.log(`  ${key}=${maskConfigValue(key, config[key] as string)}`);
  }
  console.log('');
}

const HISTORY_LIMIT = 10;

/**
 * Prints recent local sync activity plus the immutable IPFS sync record log.
 * `getAllRecords` drops any log entry whose backing record file can't be
 * read; that omission is surfaced via `unreadableRecords` rather than
 * silently shrinking the list, since a clean-looking audit trail that hides
 * gaps is the wrong failure mode for a secrets manager.
 */
export async function printHistory(environment: string, format: string): Promise<void> {
  const recent = await getIPFSSync().getHistory(HISTORY_LIMIT);

  const logger = new IPFSSyncLogger();
  const gitInfo = getGitRepoInfo();
  const records = logger.isEnabled() ? await logger.getAllRecords(gitInfo.repoName, environment) : [];
  const unreadableRecords = logger.isEnabled()
    ? logger.getSyncLog(gitInfo.repoName, environment).length - records.length
    : 0;
  records.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  if (format === 'json') {
    console.log(JSON.stringify({ recent, records, unreadableRecords }, null, 2));
    return;
  }

  console.log(chalk.bold.cyan(SYNC_MESSAGES.HISTORY_RECENT_HEADER));
  if (recent.length === 0) {
    console.log(chalk.gray(SYNC_MESSAGES.HISTORY_RECENT_EMPTY));
  } else {
    for (const entry of recent) {
      console.log(chalk.bold(`${entry.cid.substring(0, 16)}...`));
      console.log(`  ${SYNC_MESSAGES.HISTORY_FILE_LABEL}${entry.filename}`);
      console.log(`  ${SYNC_MESSAGES.HISTORY_SIZE_LABEL}${entry.size} bytes`);
      console.log(`  ${SYNC_MESSAGES.HISTORY_TIME_LABEL}${new Date(entry.timestamp).toLocaleString()}`);
      if (entry.gitRepo) console.log(`  ${SYNC_MESSAGES.HISTORY_REPO_LABEL}${entry.gitRepo}`);
      if (entry.environment) console.log(`  ${SYNC_MESSAGES.HISTORY_ENV_LABEL}${entry.environment}`);
      console.log('');
    }
  }

  console.log(chalk.bold.cyan(SYNC_MESSAGES.HISTORY_RECORDS_HEADER));
  if (records.length === 0) {
    console.log(chalk.gray(SYNC_MESSAGES.HISTORY_RECORDS_EMPTY));
  } else {
    for (const record of records) {
      const date = new Date(record.timestamp).toLocaleString();
      const action = record.action.padEnd(6);
      const keyCount = `${record.keys_count} keys`.padEnd(10);
      const repo = record.git_repo || SYNC_MESSAGES.HISTORY_NO_REPO;
      console.log(`${date}  ${action}  ${keyCount}  ${repo}/${record.environment}`);
    }
    console.log(chalk.gray(`${SYNC_MESSAGES.HISTORY_TOTAL_PREFIX}${records.length}${SYNC_MESSAGES.HISTORY_TOTAL_SUFFIX}`));
  }
  if (unreadableRecords > 0) {
    console.log(chalk.yellow(`${unreadableRecords}${SYNC_MESSAGES.HISTORY_UNREADABLE_SUFFIX}`));
  }
  console.log('');
}

/** Clears local sync metadata and cache so a stuck registry can start clean. */
export async function runRepair(): Promise<void> {
  await getIPFSSync().clearHistory();
  await new IPFSSecretsStorage().clearMetadata();
  console.log(chalk.green(SYNC_MESSAGES.REPAIR_SUCCESS));
}

/** Checks whether a CID is retrievable from the local daemon or public gateways. */
export async function runVerify(cid: string): Promise<void> {
  const result = await getIPFSSync().verifyCid(cid);
  if (result.available) {
    console.log(chalk.green(SYNC_MESSAGES.VERIFY_AVAILABLE));
    console.log(`${SYNC_MESSAGES.VERIFY_CID_LABEL}${cid}`);
    console.log(`${SYNC_MESSAGES.VERIFY_SOURCE_LABEL}${result.source}`);
  } else {
    console.error(chalk.red(SYNC_MESSAGES.VERIFY_UNAVAILABLE));
  }
}

export function registerSyncCommand(program: Command): void {
  program
    .command('sync')
    .description(SYNC_MESSAGES.DESCRIPTION)
    .option('-f, --file <path>', SYNC_MESSAGES.OPTION_FILE, '.env')
    .option('-e, --env <name>', SYNC_MESSAGES.OPTION_ENV, 'dev')
    .option('-g, --global', SYNC_MESSAGES.OPTION_GLOBAL)
    .option('--force', SYNC_MESSAGES.OPTION_FORCE)
    .option('--load', SYNC_MESSAGES.OPTION_LOAD)
    .option('--status', SYNC_MESSAGES.OPTION_STATUS)
    .option('--format <format>', SYNC_MESSAGES.OPTION_FORMAT, 'table')
    .option('--init', SYNC_MESSAGES.OPTION_INIT)
    .option('--key [value]', SYNC_MESSAGES.OPTION_KEY)
    .option('--config', SYNC_MESSAGES.OPTION_CONFIG)
    .option('--doctor', SYNC_MESSAGES.OPTION_DOCTOR)
    .option('--repair', SYNC_MESSAGES.OPTION_REPAIR)
    .option('--history', SYNC_MESSAGES.OPTION_HISTORY)
    .option('--verify <cid>', SYNC_MESSAGES.OPTION_VERIFY)
    .action(async (options) => {
      if (options.init) {
        await runSetupWizard({ global: Boolean(options.global), force: Boolean(options.force) });
        return;
      }

      if (options.doctor) {
        await runDoctor({
          global: Boolean(options.global),
          verbose: Boolean(program.opts().verbose),
          json: options.format === 'json',
        });
        return;
      }

      if (options.key !== undefined) {
        if (options.key === true) {
          const key = findEncryptionKey();
          if (!key) {
            console.error(SYNC_MESSAGES.KEY_NOT_FOUND);
            process.exitCode = 1;
            return;
          }
          console.log(key);
        } else {
          importKey(String(options.key), Boolean(options.force), Boolean(options.global), options.file);
        }
        return;
      }

      if (options.config) {
        await printConfig(options.format);
        return;
      }

      const { manager, filePath, environment } = resolveContext(options);
      try {
        if (options.repair) {
          await runRepair();
          return;
        }

        if (options.history) {
          await printHistory(environment, options.format);
          return;
        }

        if (options.verify) {
          await runVerify(options.verify);
          return;
        }

        if (options.status) {
          let daemonReachable = true;
          const status = await withFilteredStdout(
            () => false,
            async () => {
              try {
                await new IPFSClientManager().ensureDaemonRunning();
              } catch {
                daemonReachable = false;
              }
              return manager.status(filePath, environment);
            },
          );

          if (options.format === 'json') {
            console.log(JSON.stringify({ ...status, daemonReachable }, null, 2));
          } else {
            printStatus(status, environment, daemonReachable);
          }
          return;
        }

        await runSmartSync(manager, filePath, environment, Boolean(options.load), Boolean(options.force));
      } catch (error) {
        const failureMessages: Array<[boolean, string]> = [
          [Boolean(options.repair), SYNC_MESSAGES.FAILED_TO_REPAIR],
          [Boolean(options.history), SYNC_MESSAGES.FAILED_TO_GET_HISTORY],
          [Boolean(options.verify), SYNC_MESSAGES.FAILED_TO_VERIFY],
          [Boolean(options.status), SYNC_MESSAGES.FAILED_TO_CHECK_STATUS],
        ];
        const message = failureMessages.find(([active]) => active)?.[1] ?? SYNC_MESSAGES.FAILED_TO_SYNC;
        console.error(message, extractErrorMessage(error));
        process.exitCode = 1;
      } finally {
        await manager.cleanup();
      }
    });
}
