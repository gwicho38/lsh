/**
 * lsh pull — fetch and decrypt a .env from cloud storage.
 */

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { Command } from 'commander';
import { resolveContext } from '../lib/workspace-context.js';
import { IPFSClientManager } from '../lib/ipfs-client-manager.js';
import { extractErrorMessage } from '../lib/lsh-error.js';
import { findEncryptionKey } from '../lib/secrets-manager.js';
import { IPFSSecretsStorage } from '../lib/ipfs-secrets-storage.js';
import { getIPFSSync } from '../lib/ipfs-sync.js';
import { getGitRepoInfo } from '../lib/git-utils.js';
import { DEFAULTS } from '../constants/index.js';
import { PULL_MESSAGES } from '../constants/ui.js';
import { serializeEnv } from '../lib/env-file.js';

export type PulledPayload =
  | { kind: 'secrets'; vars: Record<string, string> }
  | { kind: 'envtext'; text: string }
  | { kind: 'unknown' };

/**
 * Identify what an explicit `--cid` decrypted to, since the CID may point at either
 * a push-produced `Secret[]` JSON payload or raw .env text from the removed v3 `sync push` subcommand.
 * Never guess: an unrecognized shape must not be written to the user's .env.
 */
export function classifyPayload(decrypted: string): PulledPayload {
  try {
    const parsed = JSON.parse(decrypted);
    if (
      Array.isArray(parsed) &&
      parsed.every(
        (item) => item && typeof item === 'object' && typeof item.key === 'string' && typeof item.value === 'string',
      )
    ) {
      const vars = Object.fromEntries(parsed.map((item) => [item.key, item.value]));
      return { kind: 'secrets', vars };
    }
    return { kind: 'unknown' };
  } catch {
    // Not JSON — fall through to the raw .env-text check below.
  }

  const looksLikeEnvText = decrypted
    .split('\n')
    .map((line) => line.trim())
    .some((line) => line.length > 0 && /^[A-Za-z_][A-Za-z0-9_]*=/.test(line));

  return looksLikeEnvText ? { kind: 'envtext', text: decrypted } : { kind: 'unknown' };
}

function backupExisting(outputPath: string, force: boolean): void {
  if (fs.existsSync(outputPath) && !force) {
    const backupPath = `${outputPath}.backup.${Date.now()}`;
    fs.copyFileSync(outputPath, backupPath);
    console.log(`Backed up existing file to: ${backupPath}`);
  }
}

/**
 * Pull secrets pushed by `lsh push` (via the `IPFSSecretsStorage` storage layer),
 * optionally overriding the repo name IPNS resolution uses.
 */
async function pullViaStorage(
  outputPath: string,
  environment: string,
  repoOption: string | undefined,
  encryptionKey: string,
  force: boolean,
): Promise<void> {
  const gitInfo = getGitRepoInfo();
  const repoName = repoOption || gitInfo?.repoName || DEFAULTS.DEFAULT_ENVIRONMENT;

  const storage = new IPFSSecretsStorage();
  const secrets = await storage.pull(environment, encryptionKey, repoName);
  const vars = Object.fromEntries(secrets.map((s) => [s.key, s.value]));

  backupExisting(outputPath, force);
  fs.writeFileSync(outputPath, serializeEnv(vars), { mode: 0o600 });
  console.log(`Downloaded and decrypted: ${outputPath}`);
}

/**
 * Pull an exact CID. `storage.pull` cannot target an explicit CID, so this downloads and
 * decrypts directly — the same AES-256-CBC scheme every push writes with — then classifies
 * the decrypted payload before ever touching the user's .env.
 */
async function pullByCid(outputPath: string, cid: string, encryptionKey: string, force: boolean): Promise<void> {
  const ipfsSync = getIPFSSync();
  const data = await ipfsSync.download(cid);
  if (!data) {
    console.error(PULL_MESSAGES.DOWNLOAD_FAILED);
    console.error(PULL_MESSAGES.CID_UNAVAILABLE_HINT);
    console.error(PULL_MESSAGES.DAEMON_OFFLINE_HINT);
    process.exitCode = 1;
    return;
  }

  const encryptedData = data.toString('utf-8');
  const [ivHex, encrypted] = encryptedData.split(':');
  if (!ivHex || !encrypted) {
    console.error(PULL_MESSAGES.INVALID_ENCRYPTED_FORMAT);
    process.exitCode = 1;
    return;
  }

  const key = crypto.createHash('sha256').update(encryptionKey).digest();
  const iv = Buffer.from(ivHex, 'hex');

  let decrypted: string;
  try {
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
  } catch {
    console.error(PULL_MESSAGES.DECRYPTION_FAILED);
    console.error(PULL_MESSAGES.WRONG_KEY_HINT);
    process.exitCode = 1;
    return;
  }

  const payload = classifyPayload(decrypted);
  if (payload.kind === 'unknown') {
    console.error(PULL_MESSAGES.UNRECOGNIZED_PAYLOAD);
    process.exitCode = 1;
    return;
  }

  backupExisting(outputPath, force);
  const content = payload.kind === 'secrets' ? serializeEnv(payload.vars) : payload.text;
  fs.writeFileSync(outputPath, content, { mode: 0o600 });
  console.log(`Downloaded and decrypted: ${outputPath}`);
  console.log(`CID: ${cid}`);
}

/**
 * Ported from the removed v3 `sync pull` subcommand; kept as its own branch because
 * `SecretsManager.pull` has no CID/IPNS-resolution path.
 */
export async function pullByCidOrRepo(
  filePath: string,
  environment: string,
  cidOption: string | undefined,
  repoOption: string | undefined,
  force: boolean,
): Promise<void> {
  const encryptionKey = findEncryptionKey();
  if (!encryptionKey) {
    console.error(PULL_MESSAGES.KEY_REQUIRED);
    process.exitCode = 1;
    return;
  }

  const outputPath = path.resolve(filePath);

  if (cidOption) {
    await pullByCid(outputPath, cidOption, encryptionKey, force);
  } else {
    await pullViaStorage(outputPath, environment, repoOption, encryptionKey, force);
  }
}

export function registerPullCommand(program: Command): void {
  program
    .command('pull')
    .description('Pull and decrypt a .env from cloud storage')
    .option('-f, --file <path>', 'Path to .env file', '.env')
    .option('-e, --env <name>', 'Environment name (dev/staging/prod)', 'dev')
    .option('-g, --global', 'Use global workspace ($HOME)')
    .option('--force', 'Overwrite without creating a backup')
    .option('--cid <cid>', 'Pull an exact CID instead of resolving via IPNS')
    .option('-r, --repo <name>', 'Source repo name for IPNS resolution')
    .action(async (options) => {
      const { manager, filePath, environment } = resolveContext(options);
      try {
        await new IPFSClientManager().ensureDaemonRunning();
        if (options.cid || options.repo) {
          await pullByCidOrRepo(filePath, environment, options.cid, options.repo, options.force);
        } else {
          await manager.pull(filePath, environment, options.force);
        }
      } catch (error) {
        console.error('Failed to pull secrets:', extractErrorMessage(error));
        process.exitCode = 1;
      } finally {
        await manager.cleanup();
      }
    });
}
