/**
 * Shell Builtin Commands
 * Extracted from shell-executor.ts for better maintainability
 * Contains all POSIX and ZSH builtin command implementations
 */
import { ExecutionResult, ShellContext } from './shell-types.js';
import { PathnameExpander } from './pathname-expansion.js';
import JobBuiltins from './job-builtins.js';
/**
 * Manages all shell builtin commands
 */
export declare class BuiltinCommands {
    private context;
    private pathExpander;
    private jobBuiltins;
    private updateExpander;
    constructor(context: ShellContext, pathExpander: PathnameExpander, jobBuiltins: JobBuiltins, updateExpander: () => void);
    /**
     * Update the path expander reference (called after cd)
     */
    setPathExpander(expander: PathnameExpander): void;
    /**
     * Execute a builtin command by name
     */
    execute(name: string, args: string[]): Promise<ExecutionResult | null>;
    /**
     * Adapt JobBuiltins result format to ExecutionResult
     */
    private adaptJobBuiltinResult;
    private builtin_cd;
    private builtin_pwd;
    private builtin_echo;
    private builtin_exit;
    private builtin_export;
    private builtin_unset;
    private builtin_set;
    private builtin_test;
    private evaluateTestExpression;
    private builtin_shift;
    private builtin_source;
    private builtin_alias;
    private builtin_unalias;
    private builtin_readonly;
    private builtin_local;
    private builtin_return;
    private builtin_typeset;
    private builtin_setopt;
    private builtin_unsetopt;
    private builtin_read;
    private builtin_getopts;
    private builtin_printf;
    private builtin_exec;
    private builtin_eval;
    private builtin_trap;
    private builtin_hash;
    private builtin_type;
    private builtin_history;
    private builtin_fc;
    private builtin_r;
    private builtin_install;
    private builtin_uninstall;
    private builtin_zsh_source;
    private builtin_zsh_migrate;
}
export default BuiltinCommands;
