/**
 * Persistent storage for the LSH sync secret.
 *
 * Mirrors the design of mcli's `mcli sync key` store: a single 64-char
 * hex value kept in ``$LSH_HOME/sync_key.json`` (default
 * ``~/.config/lsh/sync_key.json``) with mode 0600. The
 * ``LSH_SECRETS_KEY`` environment variable still wins when set; the
 * store is only consulted as a fallback so users do not have to re-paste
 * their secret on every shell.
 */

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

export const HEX64_REGEX = /^[0-9a-fA-F]{64}$/;
const FILENAME = 'sync_key.json';

/** Resolve the directory where lsh stores its config (`$LSH_HOME` or `~/.config/lsh`). */
export function getLshHome(): string {
  const overridden = process.env.LSH_HOME;
  if (overridden && overridden.trim().length > 0) return overridden;
  return path.join(os.homedir(), '.config', 'lsh');
}

/** Return a freshly-generated 64-char hex secret without persisting it. */
export function generateKey(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Persistent on-disk store for the LSH sync secret.
 */
export class SyncKeyStore {
  /** Absolute path to the on-disk key file. */
  get path(): string {
    return path.join(getLshHome(), FILENAME);
  }

  /** Read the persisted key, or `null` if none is configured / file is malformed. */
  get(): string | null {
    const file = this.path;
    if (!fs.existsSync(file)) return null;
    try {
      const raw = fs.readFileSync(file, 'utf-8');
      const parsed = JSON.parse(raw) as { key?: unknown };
      if (typeof parsed.key === 'string' && HEX64_REGEX.test(parsed.key)) {
        return parsed.key;
      }
    } catch {
      // fall through to null
    }
    return null;
  }

  /** Validate and persist a key. Throws on invalid input. */
  set(key: string): void {
    if (typeof key !== 'string' || !HEX64_REGEX.test(key)) {
      throw new Error('sync key must be a 64-char hex string');
    }
    this.write(key);
  }

  /** Generate a new key and persist it. Refuses to overwrite unless `force=true`. */
  generate(force = false): string {
    if (fs.existsSync(this.path) && !force) {
      throw new Error(
        `sync key already exists at ${this.path}; use force=true to overwrite`
      );
    }
    const key = generateKey();
    this.write(key);
    return key;
  }

  /** Delete the persisted key, if any. No-op when the file is absent. */
  clear(): void {
    try {
      fs.unlinkSync(this.path);
    } catch (err) {
      const e = err as NodeJS.ErrnoException;
      if (e.code !== 'ENOENT') throw err;
    }
  }

  private write(key: string): void {
    const dir = path.dirname(this.path);
    fs.mkdirSync(dir, { recursive: true });
    // Write first, then chmod, so the secret is never world-readable.
    fs.writeFileSync(this.path, JSON.stringify({ key }));
    fs.chmodSync(this.path, 0o600);
  }
}
