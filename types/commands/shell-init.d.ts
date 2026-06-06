/**
 * `lsh shell-init` — wire `lsh load` into the user's shell rc file.
 *
 * Homebrew-style: detects the shell, appends a marker-guarded block that runs
 * `eval "$(lsh load --global --quiet)"` on every new shell, idempotently and
 * with a one-time backup. All real logic lives in src/lib/shell-init.ts (pure,
 * unit-tested); this file is just argument parsing + filesystem I/O.
 */
import { Command } from 'commander';
export declare function registerShellInitCommand(program: Command): void;
export default registerShellInitCommand;
