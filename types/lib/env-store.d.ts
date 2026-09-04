/**
 * Filesystem side of .env handling: safe reads, backups, and in-place writes.
 */
/**
 * Installs gitignore coverage for `filePath` before it's written, so a freshly created or
 * backed-up plaintext secrets file is never briefly stageable. Skipped at the home directory
 * itself — a `--global` write must not touch a user's personal dotfiles `.gitignore`.
 */
export declare function ensureTargetGitignored(filePath: string): void;
/**
 * Backs up an existing secrets file before a targeted edit overwrites it, mirroring
 * SecretsManager.pull. The backup carries the same plaintext secrets as the file it's
 * copied from, so the git-ignore patterns that cover it must exist before it's written.
 */
export declare function backupEnvFile(filePath: string): void;
export declare function readLocalEnv(filePath: string): Record<string, string>;
/**
 * Writes `updates` into `filePath`. An existing file is backed up, then patched in place with
 * `upsertEnv` to preserve every line `updates` doesn't touch; a missing file is created fresh
 * from `fullContent` since there is nothing to preserve.
 */
export declare function writeEnvUpdate(filePath: string, updates: Record<string, string>, fullContent: Record<string, string>): void;
