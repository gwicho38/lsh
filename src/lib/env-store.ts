/**
 * Filesystem side of .env handling: safe reads, backups, and in-place writes.
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { getGitRepoInfo, ensureEnvInGitignore } from './git-utils.js';
import { parseEnv, serializeEnv, upsertEnv } from './env-file.js';
import { ENV_BACKUP_SUFFIX_PATTERN } from '../constants/paths.js';
import { ENV_VARS } from '../constants/config.js';

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
export function ensureTargetGitignored(filePath: string): void {
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

export function readLocalEnv(filePath: string): Record<string, string> {
  if (!fs.existsSync(filePath)) return {};
  return parseEnv(fs.readFileSync(filePath, 'utf8'));
}

/**
 * Writes `updates` into `filePath`. An existing file is backed up, then patched in place with
 * `upsertEnv` to preserve every line `updates` doesn't touch; a missing file is created fresh
 * from `fullContent` since there is nothing to preserve.
 */
export function writeEnvUpdate(
  filePath: string,
  updates: Record<string, string>,
  fullContent: Record<string, string>,
): void {
  if (fs.existsSync(filePath)) {
    backupEnvFile(filePath);
    const raw = fs.readFileSync(filePath, 'utf8');
    fs.writeFileSync(filePath, upsertEnv(raw, updates), { mode: 0o600 });
    return;
  }
  ensureTargetGitignored(filePath);
  fs.writeFileSync(filePath, serializeEnv(fullContent), { mode: 0o600 });
}
