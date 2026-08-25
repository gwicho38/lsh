/**
 * Atomic, permission-enforcing writer for secret-bearing files.
 *
 * Every file that can hold a plaintext secret, an encryption key, a
 * key-bearing configuration entry, or a plaintext backup is written through
 * this module. The write creates a same-directory temporary file with mode
 * 0600, flushes it, and renames it over the destination. Two properties follow:
 *
 * - A reader never observes a partially written destination: `rename(2)` is
 *   atomic within a filesystem, so the destination is either the old file or
 *   the complete new one.
 * - A destination that was already world-readable is *replaced*, not reused.
 *   A create-mode option alone cannot fix that, because the mode applies to a
 *   newly created inode and writing through an existing file keeps its old
 *   mode. The final `chmod` makes the guarantee explicit regardless of umask.
 *
 * Windows has no POSIX mode bits. There the atomic replace still applies and
 * the `chmod` steps are skipped; confidentiality relies on the ACLs of the
 * user profile / repository directory instead. Callers get identical content
 * guarantees on both platforms.
 */

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

import { SECURE_FILE } from '../constants/index.js';
import { ErrorCodes, wrapAsLSHError } from './lsh-error.js';
import { isWindows } from './platform-utils.js';

/** Owner read/write only — the mode every secret-bearing file must end at. */
export const SECRET_FILE_MODE = SECURE_FILE.MODE;

/** POSIX mode bits are meaningless on Windows. */
function supportsPosixModes(): boolean {
  return !isWindows();
}

function closeQuietly(fd: number | undefined): void {
  if (fd === undefined) return;
  try {
    fs.closeSync(fd);
  } catch {
    // Nothing useful to do while unwinding.
  }
}

function removeQuietly(target: string): void {
  try {
    fs.unlinkSync(target);
  } catch {
    // The temp file may never have been created.
  }
}

/**
 * Flush the directory entry so the rename survives a crash. Best effort:
 * some filesystems and platforms reject fsync on a directory descriptor.
 */
function fsyncDirectory(dir: string): void {
  if (!supportsPosixModes()) return;
  let dfd: number | undefined;
  try {
    dfd = fs.openSync(dir, 'r');
    fs.fsyncSync(dfd);
  } catch {
    // Best effort only.
  } finally {
    closeQuietly(dfd);
  }
}

/**
 * Follow a symlinked destination to its real path so callers that intentionally
 * symlink `.env` keep working, and the mode is enforced on the real inode.
 */
function resolveDestination(filePath: string): string {
  try {
    if (fs.lstatSync(filePath).isSymbolicLink()) {
      return fs.realpathSync(filePath);
    }
  } catch {
    // Destination does not exist yet, or the link dangles.
  }
  return filePath;
}

function temporaryPathFor(target: string): string {
  const suffix = crypto.randomBytes(6).toString('hex');
  return path.join(
    path.dirname(target),
    `${SECURE_FILE.TEMP_PREFIX}${path.basename(target)}.${process.pid}.${suffix}`
  );
}

/**
 * Atomically write a secret-bearing file and leave it at mode 0600.
 *
 * Creates missing parent directories. Never leaves a partial destination or a
 * stray temporary file behind when the write fails.
 *
 * @param filePath Destination path (a symlink is followed to its target).
 * @param data Contents to write.
 * @throws LSHError when the write cannot be completed.
 */
export function writeSecretFileSync(filePath: string, data: string | Buffer): void {
  const target = resolveDestination(path.resolve(filePath));
  const dir = path.dirname(target);
  const tempPath = temporaryPathFor(target);

  let fd: number | undefined;
  try {
    fs.mkdirSync(dir, { recursive: true });

    // Exclusive create with a restrictive mode: the secret is never briefly
    // world-readable, even between creation and chmod.
    fd = fs.openSync(tempPath, 'wx', SECRET_FILE_MODE);
    fs.writeFileSync(fd, data);
    fs.fsyncSync(fd);
    fs.closeSync(fd);
    fd = undefined;

    // openSync's mode is masked by the process umask; restate it.
    if (supportsPosixModes()) fs.chmodSync(tempPath, SECRET_FILE_MODE);

    // Atomic replace. Any pre-existing permissive inode is discarded here.
    fs.renameSync(tempPath, target);

    if (supportsPosixModes()) fs.chmodSync(target, SECRET_FILE_MODE);

    fsyncDirectory(dir);
  } catch (error) {
    closeQuietly(fd);
    removeQuietly(tempPath);
    throw wrapAsLSHError(error, ErrorCodes.INTERNAL_ERROR, {
      operation: SECURE_FILE.WRITE_OPERATION,
      path: target,
    });
  }
}

/**
 * Copy a secret-bearing file (for example a `.env` backup) so the copy is
 * created atomically at mode 0600 rather than inheriting the source's mode.
 *
 * @param sourcePath File to copy.
 * @param destinationPath Destination path.
 * @throws LSHError when the copy cannot be completed.
 */
export function copySecretFileSync(sourcePath: string, destinationPath: string): void {
  let contents: Buffer;
  try {
    contents = fs.readFileSync(sourcePath);
  } catch (error) {
    throw wrapAsLSHError(error, ErrorCodes.INTERNAL_ERROR, {
      operation: SECURE_FILE.COPY_OPERATION,
      path: sourcePath,
    });
  }
  writeSecretFileSync(destinationPath, contents);
}
