/**
 * Unit tests for the atomic, permission-enforcing secret-file writer.
 *
 * Covers issue #223: every secret-bearing file must end up at mode 0600 on
 * POSIX systems, including when it replaces a file that was already
 * world-readable, and a failed write must never leave a partial destination.
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import {
  SECRET_FILE_MODE,
  copySecretFileSync,
  writeSecretFileSync,
} from '../src/lib/secure-file-writer.js';

const isPosix = process.platform !== 'win32';
const modeOf = (target: string): number => fs.statSync(target).mode & 0o777;

/** Assert POSIX mode bits only where the platform actually has them. */
function expectSecretMode(target: string): void {
  if (isPosix) {
    expect(modeOf(target)).toBe(0o600);
  } else {
    // Windows has no POSIX mode bits; the file must still exist and be readable.
    expect(fs.existsSync(target)).toBe(true);
  }
}

describe('secure-file-writer', () => {
  let dir: string;
  let savedUmask: number;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lsh-secure-write-'));
    savedUmask = isPosix ? process.umask(0o022) : 0;
  });

  afterEach(() => {
    if (isPosix) process.umask(savedUmask);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  describe('writeSecretFileSync', () => {
    it('should exhibit the documented secret file mode', () => {
      expect(SECRET_FILE_MODE).toBe(0o600);
    });

    it('should create a new secret file with owner-only permissions', () => {
      const target = path.join(dir, '.env');

      writeSecretFileSync(target, 'LSH_SECRETS_KEY=abc\n');

      expect(fs.readFileSync(target, 'utf8')).toBe('LSH_SECRETS_KEY=abc\n');
      expectSecretMode(target);
    });

    it('should repair an existing world-readable file to owner-only', () => {
      const target = path.join(dir, '.env');
      fs.writeFileSync(target, 'OLD=1\n');
      if (isPosix) {
        fs.chmodSync(target, 0o644);
        expect(modeOf(target)).toBe(0o644);
      }

      writeSecretFileSync(target, 'NEW=2\n');

      expect(fs.readFileSync(target, 'utf8')).toBe('NEW=2\n');
      expectSecretMode(target);
    });

    it('should not widen permissions under a permissive umask', () => {
      if (!isPosix) return;
      const target = path.join(dir, 'permissive.env');
      process.umask(0o000);

      writeSecretFileSync(target, 'A=1\n');

      expect(modeOf(target)).toBe(0o600);
    });

    it('should create missing parent directories', () => {
      const target = path.join(dir, 'nested', 'deeper', '.env');

      writeSecretFileSync(target, 'A=1\n');

      expect(fs.readFileSync(target, 'utf8')).toBe('A=1\n');
      expectSecretMode(target);
    });

    it('should accept Buffer payloads', () => {
      const target = path.join(dir, 'buffer.bin');

      writeSecretFileSync(target, Buffer.from('binary-secret'));

      expect(fs.readFileSync(target, 'utf8')).toBe('binary-secret');
      expectSecretMode(target);
    });

    it('should leave no temporary files behind after a successful write', () => {
      const target = path.join(dir, '.env');

      writeSecretFileSync(target, 'A=1\n');

      expect(fs.readdirSync(dir)).toEqual(['.env']);
    });

    it('should not leave a partial destination or temp file when the write fails', () => {
      // A directory cannot be replaced by rename(2), so the write fails after
      // the temp file has been created - the interrupted-write case.
      const target = path.join(dir, 'blocked');
      fs.mkdirSync(target);

      expect(() => writeSecretFileSync(target, 'A=1\n')).toThrow();

      expect(fs.statSync(target).isDirectory()).toBe(true);
      expect(fs.readdirSync(dir)).toEqual(['blocked']);
    });

    it('should write through a symlink to its target file', () => {
      if (!isPosix) return;
      const real = path.join(dir, 'real.env');
      const link = path.join(dir, 'link.env');
      fs.writeFileSync(real, 'OLD=1\n');
      fs.chmodSync(real, 0o644);
      fs.symlinkSync(real, link);

      writeSecretFileSync(link, 'NEW=2\n');

      expect(fs.lstatSync(link).isSymbolicLink()).toBe(true);
      expect(fs.readFileSync(real, 'utf8')).toBe('NEW=2\n');
      expect(modeOf(real)).toBe(0o600);
    });

    it('should replace the destination atomically', () => {
      const target = path.join(dir, '.env');
      writeSecretFileSync(target, 'A=1\n');
      const firstInode = isPosix ? fs.statSync(target).ino : 0;

      writeSecretFileSync(target, 'B=2\n');

      expect(fs.readFileSync(target, 'utf8')).toBe('B=2\n');
      if (isPosix) {
        // rename(2) swaps in a fresh inode rather than truncating in place.
        expect(fs.statSync(target).ino).not.toBe(firstInode);
      }
    });
  });

  describe('copySecretFileSync', () => {
    it('should copy content and enforce owner-only permissions on the copy', () => {
      const source = path.join(dir, '.env');
      const backup = path.join(dir, '.env.backup');
      fs.writeFileSync(source, 'A=1\n');
      if (isPosix) fs.chmodSync(source, 0o644);

      copySecretFileSync(source, backup);

      expect(fs.readFileSync(backup, 'utf8')).toBe('A=1\n');
      expectSecretMode(backup);
    });

    it('should repair an existing world-readable backup target', () => {
      const source = path.join(dir, '.env');
      const backup = path.join(dir, '.env.backup');
      fs.writeFileSync(source, 'A=1\n');
      fs.writeFileSync(backup, 'STALE=1\n');
      if (isPosix) fs.chmodSync(backup, 0o644);

      copySecretFileSync(source, backup);

      expect(fs.readFileSync(backup, 'utf8')).toBe('A=1\n');
      expectSecretMode(backup);
    });
  });
});
