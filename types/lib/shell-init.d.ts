/**
 * shell-init pure logic
 *
 * Powers `lsh shell-init`, which wires `lsh load` into the user's shell rc file
 * (homebrew-style) so secrets load into every new shell automatically.
 *
 * Everything here is a pure string/path transform — no fs, no process state —
 * so the command layer (src/commands/shell-init.ts) stays a thin I/O shell and
 * all the real behavior is unit-testable without a shell or filesystem.
 */
export type ShellName = 'zsh' | 'bash';
/**
 * Identify the shell from a `$SHELL`-style path (e.g. `/bin/zsh`).
 * Returns undefined for anything we don't manage an rc file for.
 */
export declare function detectShell(shellPath?: string): ShellName | undefined;
/** Absolute path to the rc file lsh manages for a given shell. */
export declare function rcFileForShell(shell: ShellName, homeDir: string): string;
/** The marker-wrapped block lsh owns inside the rc file. */
export declare function buildBlock(line?: string): string;
/** Does the rc content already contain an lsh-managed block? */
export declare function hasBlock(content: string): boolean;
/**
 * Idempotently insert the block. If a managed block already exists it is
 * replaced in place (so re-running after the line changes upgrades it); if it
 * doesn't exist it's appended, separated from prior content by a blank line.
 */
export declare function upsertBlock(content: string, block?: string): string;
/**
 * Remove the managed block, cleaning up the surrounding blank line(s) it was
 * inserted with so repeated install/uninstall cycles don't accumulate gaps.
 */
export declare function removeBlock(content: string): string;
