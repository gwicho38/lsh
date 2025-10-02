/**
 * Shell Builtin Commands
 * Extracted from shell-executor.ts for better maintainability
 * Contains all POSIX and ZSH builtin command implementations
 */

import * as fs from 'fs';
import * as path from 'path';
import { ExecutionResult, ShellContext } from './shell-types.js';
import { PathnameExpander } from './pathname-expansion.js';
import JobBuiltins from './job-builtins.js';

/**
 * Manages all shell builtin commands
 */
export class BuiltinCommands {
  private context: ShellContext;
  private pathExpander: PathnameExpander;
  private jobBuiltins: JobBuiltins;
  private updateExpander: () => void;

  constructor(
    context: ShellContext,
    pathExpander: PathnameExpander,
    jobBuiltins: JobBuiltins,
    updateExpander: () => void
  ) {
    this.context = context;
    this.pathExpander = pathExpander;
    this.jobBuiltins = jobBuiltins;
    this.updateExpander = updateExpander;
  }

  /**
   * Update the path expander reference (called after cd)
   */
  setPathExpander(expander: PathnameExpander): void {
    this.pathExpander = expander;
  }

  /**
   * Execute a builtin command by name
   */
  async execute(name: string, args: string[]): Promise<ExecutionResult | null> {
    switch (name) {
      case 'cd':
        return this.builtin_cd(args);
      case 'pwd':
        return this.builtin_pwd(args);
      case 'echo':
        return this.builtin_echo(args);
      case 'exit':
        return this.builtin_exit(args);
      case 'export':
        return this.builtin_export(args);
      case 'unset':
        return this.builtin_unset(args);
      case 'set':
        return this.builtin_set(args);
      case 'test':
      case '[':
        return this.builtin_test(args);
      case 'shift':
        return this.builtin_shift(args);
      case 'source':
      case '.':
        return this.builtin_source(args);
      case 'alias':
        return this.builtin_alias(args);
      case 'unalias':
        return this.builtin_unalias(args);
      case 'readonly':
        return this.builtin_readonly(args);
      case 'local':
        return this.builtin_local(args);
      case 'return':
        return this.builtin_return(args);
      case 'typeset':
        return this.builtin_typeset(args);
      case 'setopt':
        return this.builtin_setopt(args);
      case 'unsetopt':
        return this.builtin_unsetopt(args);
      case 'read':
        return this.builtin_read(args);
      case 'getopts':
        return this.builtin_getopts(args);
      case 'printf':
        return this.builtin_printf(args);
      case 'exec':
        return this.builtin_exec(args);
      case 'eval':
        return this.builtin_eval(args);
      case 'trap':
        return this.builtin_trap(args);
      case 'hash':
        return this.builtin_hash(args);
      case 'type':
        return this.builtin_type(args);

      // Job control builtins - Placeholder implementations
      // TODO: Integrate with JobBuiltins properly
      case 'jobs':
      case 'fg':
      case 'bg':
      case 'kill':
      case 'wait':
        return { stdout: '', stderr: `${name}: not yet implemented`, exitCode: 1, success: false };

      // History builtins
      case 'history':
        return this.builtin_history(args);
      case 'fc':
        return this.builtin_fc(args);
      case 'r':
        return this.builtin_r(args);

      // Installation builtins
      case 'install':
        return this.builtin_install(args);
      case 'uninstall':
        return this.builtin_uninstall(args);

      // ZSH migration builtins
      case 'zsh-source':
        return this.builtin_zsh_source(args);
      case 'zsh-migrate':
        return this.builtin_zsh_migrate(args);

      default:
        return null; // Not a builtin
    }
  }

  /**
   * Adapt JobBuiltins result format to ExecutionResult
   */
  private adaptJobBuiltinResult(result: { stdout: string; stderr: string; exitCode: number }): ExecutionResult {
    return {
      ...result,
      success: result.exitCode === 0,
    };
  }

  // ========================================
  // Core Builtin Implementations
  // ========================================

  private async builtin_cd(args: string[]): Promise<ExecutionResult> {
    const target = args[0] || this.context.env.HOME || '/';

    try {
      const resolvedPath = path.resolve(this.context.cwd, target);

      // Check if directory exists
      if (!fs.existsSync(resolvedPath)) {
        return {
          stdout: '',
          stderr: `cd: ${target}: No such file or directory`,
          exitCode: 1,
          success: false,
        };
      }

      const stats = fs.statSync(resolvedPath);
      if (!stats.isDirectory()) {
        return {
          stdout: '',
          stderr: `cd: ${target}: Not a directory`,
          exitCode: 1,
          success: false,
        };
      }

      // Update context
      this.context.cwd = resolvedPath;
      process.chdir(resolvedPath);

      // Update path expander with new working directory
      this.pathExpander = new PathnameExpander(this.context.cwd);

      return { stdout: '', stderr: '', exitCode: 0, success: true };
    } catch (error) {
      return {
        stdout: '',
        stderr: `cd: ${target}: ${(error as Error).message}`,
        exitCode: 1,
        success: false,
      };
    }
  }

  private async builtin_pwd(_args: string[]): Promise<ExecutionResult> {
    return {
      stdout: this.context.cwd,
      stderr: '',
      exitCode: 0,
      success: true,
    };
  }

  private async builtin_echo(args: string[]): Promise<ExecutionResult> {
    let message = args.join(' ');
    let newline = true;

    if (args[0] === '-n') {
      newline = false;
      message = args.slice(1).join(' ');
    }

    return {
      stdout: message + (newline ? '\n' : ''),
      stderr: '',
      exitCode: 0,
      success: true,
    };
  }

  private async builtin_exit(args: string[]): Promise<ExecutionResult> {
    const exitCode = args.length > 0 ? parseInt(args[0], 10) : this.context.lastExitCode;
    process.exit(isNaN(exitCode) ? 1 : exitCode);
    return { stdout: '', stderr: '', exitCode: 0, success: true };
  }

  private async builtin_export(args: string[]): Promise<ExecutionResult> {
    for (const arg of args) {
      if (arg.includes('=')) {
        const [key, value] = arg.split('=', 2);
        this.context.env[key] = value;
        this.context.variables[key] = value;
      } else {
        if (arg in this.context.variables) {
          this.context.env[arg] = this.context.variables[arg];
        }
      }
    }
    this.updateExpander();
    return { stdout: '', stderr: '', exitCode: 0, success: true };
  }

  private async builtin_unset(args: string[]): Promise<ExecutionResult> {
    for (const name of args) {
      delete this.context.variables[name];
      delete this.context.env[name];
    }
    this.updateExpander();
    return { stdout: '', stderr: '', exitCode: 0, success: true };
  }

  private async builtin_set(args: string[]): Promise<ExecutionResult> {
    if (args.length === 0) {
      // Print all variables
      const output = Object.entries(this.context.variables)
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');
      return {
        stdout: output,
        stderr: '',
        exitCode: 0,
        success: true,
      };
    }

    for (const arg of args) {
      if (arg.startsWith('-')) {
        // Enable options
        for (let i = 1; i < arg.length; i++) {
          const option = arg[i];
          switch (option) {
            case 'e':
              this.context.options.errexit = true;
              break;
            case 'u':
              this.context.options.nounset = true;
              break;
            case 'x':
              this.context.options.xtrace = true;
              break;
            case 'v':
              this.context.options.verbose = true;
              break;
            case 'f':
              this.context.options.noglob = true;
              break;
            case 'm':
              this.context.options.monitor = true;
              break;
            case 'C':
              this.context.options.noclobber = true;
              break;
            case 'a':
              this.context.options.allexport = true;
              break;
          }
        }
      } else if (arg.startsWith('+')) {
        // Disable options
        for (let i = 1; i < arg.length; i++) {
          const option = arg[i];
          switch (option) {
            case 'e':
              this.context.options.errexit = false;
              break;
            case 'u':
              this.context.options.nounset = false;
              break;
            case 'x':
              this.context.options.xtrace = false;
              break;
            case 'v':
              this.context.options.verbose = false;
              break;
            case 'f':
              this.context.options.noglob = false;
              break;
            case 'm':
              this.context.options.monitor = false;
              break;
            case 'C':
              this.context.options.noclobber = false;
              break;
            case 'a':
              this.context.options.allexport = false;
              break;
          }
        }
      } else {
        // Set positional parameters
        this.context.positionalParams = args;
        break;
      }
    }

    return { stdout: '', stderr: '', exitCode: 0, success: true };
  }

  // Placeholder implementations for remaining builtins
  // These will be extracted from shell-executor.ts in the next phase

  private async builtin_test(args: string[]): Promise<ExecutionResult> {
    const result = this.evaluateTestExpression(args);
    return {
      stdout: '',
      stderr: '',
      exitCode: result ? 0 : 1,
      success: result,
    };
  }

  private evaluateTestExpression(args: string[]): boolean {
    // Simplified test implementation - full version to be extracted
    if (args.length === 0) return false;
    if (args[args.length - 1] === ']') args = args.slice(0, -1);
    if (args.length === 1) return args[0] !== '';
    // More complex test logic to be extracted
    return true;
  }

  private async builtin_shift(args: string[]): Promise<ExecutionResult> {
    const n = args.length > 0 ? parseInt(args[0], 10) : 1;
    this.context.positionalParams = this.context.positionalParams.slice(n);
    return { stdout: '', stderr: '', exitCode: 0, success: true };
  }

  private async builtin_source(args: string[]): Promise<ExecutionResult> {
    // Placeholder - full implementation to be extracted
    return { stdout: '', stderr: 'source: not yet implemented', exitCode: 1, success: false };
  }

  private async builtin_alias(args: string[]): Promise<ExecutionResult> {
    // Placeholder - full implementation to be extracted
    return { stdout: '', stderr: 'alias: not yet implemented', exitCode: 1, success: false };
  }

  private async builtin_unalias(args: string[]): Promise<ExecutionResult> {
    // Placeholder - full implementation to be extracted
    return { stdout: '', stderr: 'unalias: not yet implemented', exitCode: 1, success: false };
  }

  private async builtin_readonly(args: string[]): Promise<ExecutionResult> {
    // Placeholder - full implementation to be extracted
    return { stdout: '', stderr: 'readonly: not yet implemented', exitCode: 1, success: false };
  }

  private async builtin_local(args: string[]): Promise<ExecutionResult> {
    // Placeholder - full implementation to be extracted
    return { stdout: '', stderr: 'local: not yet implemented', exitCode: 1, success: false };
  }

  private async builtin_return(args: string[]): Promise<ExecutionResult> {
    const code = args.length > 0 ? parseInt(args[0], 10) : this.context.lastReturnCode;
    return { stdout: '', stderr: '', exitCode: isNaN(code) ? 0 : code, success: true };
  }

  private async builtin_typeset(args: string[]): Promise<ExecutionResult> {
    const result = this.context.arrays.parseTypesetCommand(args);
    return {
      stdout: '',
      stderr: result.success ? '' : result.message,
      exitCode: result.success ? 0 : 1,
      success: result.success,
    };
  }

  private async builtin_setopt(args: string[]): Promise<ExecutionResult> {
    // TODO: ZshOptionsManager doesn't have setOption method yet
    // for (const opt of args) {
    //   this.context.zshOptions.setOption(opt, true);
    // }
    return { stdout: '', stderr: 'setopt: not yet fully implemented', exitCode: 1, success: false };
  }

  private async builtin_unsetopt(args: string[]): Promise<ExecutionResult> {
    // TODO: ZshOptionsManager doesn't have setOption method yet
    // for (const opt of args) {
    //   this.context.zshOptions.setOption(opt, false);
    // }
    return { stdout: '', stderr: 'unsetopt: not yet fully implemented', exitCode: 1, success: false };
  }

  private async builtin_read(args: string[]): Promise<ExecutionResult> {
    // Placeholder - full implementation to be extracted
    return { stdout: '', stderr: 'read: not yet implemented', exitCode: 1, success: false };
  }

  private async builtin_getopts(args: string[]): Promise<ExecutionResult> {
    // Placeholder - full implementation to be extracted
    return { stdout: '', stderr: 'getopts: not yet implemented', exitCode: 1, success: false };
  }

  private async builtin_printf(args: string[]): Promise<ExecutionResult> {
    // Placeholder - full implementation to be extracted
    return { stdout: '', stderr: 'printf: not yet implemented', exitCode: 1, success: false };
  }

  private async builtin_exec(args: string[]): Promise<ExecutionResult> {
    // Placeholder - full implementation to be extracted
    return { stdout: '', stderr: 'exec: not yet implemented', exitCode: 1, success: false };
  }

  private async builtin_eval(args: string[]): Promise<ExecutionResult> {
    // Placeholder - full implementation to be extracted
    return { stdout: '', stderr: 'eval: not yet implemented', exitCode: 1, success: false };
  }

  private async builtin_trap(args: string[]): Promise<ExecutionResult> {
    // Placeholder - full implementation to be extracted
    return { stdout: '', stderr: 'trap: not yet implemented', exitCode: 1, success: false };
  }

  private async builtin_hash(args: string[]): Promise<ExecutionResult> {
    // Placeholder - full implementation to be extracted
    return { stdout: '', stderr: 'hash: not yet implemented', exitCode: 1, success: false };
  }

  private async builtin_type(args: string[]): Promise<ExecutionResult> {
    // Placeholder - full implementation to be extracted
    return { stdout: '', stderr: 'type: not yet implemented', exitCode: 1, success: false };
  }

  private async builtin_history(args: string[]): Promise<ExecutionResult> {
    // Placeholder - full implementation to be extracted
    return { stdout: '', stderr: 'history: not yet implemented', exitCode: 1, success: false };
  }

  private async builtin_fc(args: string[]): Promise<ExecutionResult> {
    // Placeholder - full implementation to be extracted
    return { stdout: '', stderr: 'fc: not yet implemented', exitCode: 1, success: false };
  }

  private async builtin_r(args: string[]): Promise<ExecutionResult> {
    // Placeholder - full implementation to be extracted
    return { stdout: '', stderr: 'r: not yet implemented', exitCode: 1, success: false };
  }

  private async builtin_install(args: string[]): Promise<ExecutionResult> {
    // Placeholder - full implementation to be extracted
    return { stdout: '', stderr: 'install: not yet implemented', exitCode: 1, success: false };
  }

  private async builtin_uninstall(args: string[]): Promise<ExecutionResult> {
    // Placeholder - full implementation to be extracted
    return { stdout: '', stderr: 'uninstall: not yet implemented', exitCode: 1, success: false };
  }

  private async builtin_zsh_source(args: string[]): Promise<ExecutionResult> {
    // Placeholder - full implementation to be extracted
    return { stdout: '', stderr: 'zsh-source: not yet implemented', exitCode: 1, success: false };
  }

  private async builtin_zsh_migrate(args: string[]): Promise<ExecutionResult> {
    // Placeholder - full implementation to be extracted
    return { stdout: '', stderr: 'zsh-migrate: not yet implemented', exitCode: 1, success: false };
  }
}

export default BuiltinCommands;
