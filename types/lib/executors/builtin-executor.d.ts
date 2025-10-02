/**
 * Builtin Command Executor
 * Handles execution of all POSIX and extended builtin commands
 */
import { ExecutionResult, ShellContext } from '../shell-executor';
import { VariableExpander } from '../variable-expansion';
import { PathnameExpander } from '../pathname-expansion';
import { JobManager } from '../job-manager';
import { JobBuiltins } from '../job-builtins';
export declare class BuiltinExecutor {
    private context;
    private expander;
    private pathExpander;
    private jobManager;
    private jobBuiltins;
    constructor(context: ShellContext, expander: VariableExpander, pathExpander: PathnameExpander, jobManager: JobManager, jobBuiltins: JobBuiltins);
    /**
     * Execute a builtin command
     * Returns null if the command is not a builtin
     */
    execute(name: string, args: string[]): Promise<ExecutionResult | null>;
    /**
     * Get the builtin method for a command name
     */
    private getBuiltinMethod;
    private builtin_cd;
    private builtin_pwd;
    private builtin_echo;
}
