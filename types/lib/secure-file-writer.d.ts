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
/** Owner read/write only — the mode every secret-bearing file must end at. */
export declare const SECRET_FILE_MODE: 384;
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
export declare function writeSecretFileSync(filePath: string, data: string | Buffer): void;
/**
 * Copy a secret-bearing file (for example a `.env` backup) so the copy is
 * created atomically at mode 0600 rather than inheriting the source's mode.
 *
 * @param sourcePath File to copy.
 * @param destinationPath Destination path.
 * @throws LSHError when the copy cannot be completed.
 */
export declare function copySecretFileSync(sourcePath: string, destinationPath: string): void;
