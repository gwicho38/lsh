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

import * as path from 'path';
import { SHELL_INIT } from '../constants/index.js';

export type ShellName = 'zsh' | 'bash';

/**
 * Identify the shell from a `$SHELL`-style path (e.g. `/bin/zsh`).
 * Returns undefined for anything we don't manage an rc file for.
 */
export function detectShell(shellPath?: string): ShellName | undefined {
  if (!shellPath) return undefined;
  const base = path.basename(shellPath);
  if (base.includes('zsh')) return 'zsh';
  if (base.includes('bash')) return 'bash';
  return undefined;
}

/** Absolute path to the rc file lsh manages for a given shell. */
export function rcFileForShell(shell: ShellName, homeDir: string): string {
  return path.join(homeDir, shell === 'zsh' ? '.zshrc' : '.bashrc');
}

/** The marker-wrapped block lsh owns inside the rc file. */
export function buildBlock(line: string = SHELL_INIT.LOAD_LINE): string {
  return `${SHELL_INIT.MARKER_START}\n${line}\n${SHELL_INIT.MARKER_END}`;
}

/** Does the rc content already contain an lsh-managed block? */
export function hasBlock(content: string): boolean {
  return content.includes(SHELL_INIT.MARKER_START);
}

/**
 * Matches the managed block. The `[\s\S]*?` is non-greedy so adjacent content
 * isn't swallowed if a malformed file somehow has two start markers.
 */
function blockRegex(): RegExp {
  const start = escapeRegExp(SHELL_INIT.MARKER_START);
  const end = escapeRegExp(SHELL_INIT.MARKER_END);
  return new RegExp(`${start}[\\s\\S]*?${end}`);
}

/**
 * Idempotently insert the block. If a managed block already exists it is
 * replaced in place (so re-running after the line changes upgrades it); if it
 * doesn't exist it's appended, separated from prior content by a blank line.
 */
export function upsertBlock(content: string, block: string = buildBlock()): string {
  if (hasBlock(content)) {
    return content.replace(blockRegex(), block);
  }
  if (content.length === 0) {
    return `${block}\n`;
  }
  const sep = content.endsWith('\n\n') ? '' : content.endsWith('\n') ? '\n' : '\n\n';
  return `${content}${sep}${block}\n`;
}

/**
 * Remove the managed block, cleaning up the surrounding blank line(s) it was
 * inserted with so repeated install/uninstall cycles don't accumulate gaps.
 */
export function removeBlock(content: string): string {
  const start = escapeRegExp(SHELL_INIT.MARKER_START);
  const end = escapeRegExp(SHELL_INIT.MARKER_END);
  // Eat the single blank-line separator upsert added + the block + its
  // trailing newline, leaving the prior content's own terminator intact.
  const withSurrounding = new RegExp(`\\n?${start}[\\s\\S]*?${end}\\n?`);
  return content.replace(withSurrounding, '');
}

function escapeRegExp(s: string): string {
  // '\\$&' is the regex back-reference for "the matched char", not a UI string.
  // eslint-disable-next-line lsh/no-hardcoded-strings
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
