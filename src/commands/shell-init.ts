/**
 * `lsh shell-init` — wire `lsh load` into the user's shell rc file.
 *
 * Homebrew-style: detects the shell, appends a marker-guarded block that runs
 * `eval "$(lsh load --global --quiet)"` on every new shell, idempotently and
 * with a one-time backup. All real logic lives in src/lib/shell-init.ts (pure,
 * unit-tested); this file is just argument parsing + filesystem I/O.
 */

import { Command } from 'commander';
import * as fs from 'fs';
import * as os from 'os';
import {
  detectShell,
  rcFileForShell,
  buildBlock,
  hasBlock,
  upsertBlock,
  removeBlock,
  type ShellName,
} from '../lib/shell-init.js';
import { SHELL_INIT } from '../constants/index.js';
import { ENV_VARS } from '../constants/config.js';
import { extractErrorMessage } from '../lib/lsh-error.js';

const SUPPORTED: ShellName[] = ['zsh', 'bash'];

function resolveShell(arg?: string): ShellName | undefined {
  if (arg) {
    const lower = arg.toLowerCase();
    return SUPPORTED.includes(lower as ShellName) ? (lower as ShellName) : undefined;
  }
  return detectShell(process.env[ENV_VARS.SHELL]);
}

function homeDir(): string {
  return process.env[ENV_VARS.HOME] || os.homedir();
}

export function registerShellInitCommand(program: Command): void {
  program
    .command('shell-init [shell]')
    .description('Wire `lsh load` into your shell rc file (zsh or bash)')
    .option('-f, --file <path>', 'Target rc file (overrides auto-detection)')
    .option('--print', 'Print the block to stdout instead of writing any file')
    .option('--dry-run', 'Show the target file and block without writing')
    .option('--uninstall', 'Remove the lsh-managed block from the rc file')
    .action((shellArg: string | undefined, options) => {
      try {
        const block = buildBlock();

        // --print: emit the block, do nothing else. Pipe it yourself.
        if (options.print) {
          console.log(block);
          return;
        }

        // Resolve the target rc file.
        let rcPath: string;
        if (options.file) {
          rcPath = options.file;
        } else {
          const shell = resolveShell(shellArg);
          if (!shell) {
            console.error('❌ Could not determine your shell.');
            console.error('💡 Pass one explicitly: lsh shell-init zsh  (or bash)');
            console.error('💡 Or target a file directly: lsh shell-init --file ~/.zshrc');
            process.exit(1);
            return;
          }
          rcPath = rcFileForShell(shell, homeDir());
        }

        const existing = fs.existsSync(rcPath) ? fs.readFileSync(rcPath, 'utf8') : '';

        // --uninstall: strip the managed block.
        if (options.uninstall) {
          if (!hasBlock(existing)) {
            console.log(`ℹ️  No lsh block found in ${rcPath} — nothing to remove.`);
            return;
          }
          if (options.dryRun) {
            console.log(`Would remove the lsh-managed block from ${rcPath}`);
            return;
          }
          fs.writeFileSync(rcPath, removeBlock(existing), 'utf8');
          console.log(`✅ Removed lsh block from ${rcPath}`);
          console.log('💡 Restart your shell to apply.');
          return;
        }

        const alreadyPresent = hasBlock(existing);
        const updated = upsertBlock(existing, block);

        // --dry-run: report intent only.
        if (options.dryRun) {
          console.log(`Target: ${rcPath}`);
          console.log(alreadyPresent ? '(would update existing lsh block)\n' : '(would append)\n');
          console.log(block);
          return;
        }

        if (alreadyPresent && updated === existing) {
          console.log(`ℹ️  ${rcPath} already wired up — no change.`);
          return;
        }

        // Back up an existing rc file once before the first modification.
        if (existing && !alreadyPresent) {
          const backup = `${rcPath}.lsh-backup`;
          if (!fs.existsSync(backup)) {
            fs.writeFileSync(backup, existing, 'utf8');
            console.log(`📦 Backed up ${rcPath} → ${backup}`);
          }
        }

        fs.writeFileSync(rcPath, updated, 'utf8');
        console.log(`✅ ${alreadyPresent ? 'Updated' : 'Added'} lsh block in ${rcPath}`);
        console.log(`   ${SHELL_INIT.LOAD_LINE}`);
        console.log('💡 Restart your shell (or `source` the file) to apply.');
      } catch (error) {
        console.error('❌ shell-init failed:', extractErrorMessage(error));
        process.exit(1);
      }
    });
}

export default registerShellInitCommand;
