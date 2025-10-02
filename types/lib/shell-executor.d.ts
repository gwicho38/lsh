/**
 * POSIX Shell Command Executor
 * Executes parsed AST nodes following POSIX semantics
 */
import { ASTNode } from './shell-parser.js';
import { CompletionFunction } from './completion-system.js';
import { ExecutionResult, Job, JobControl, ShellOptions, ShellContext } from './shell-types.js';
export { ExecutionResult, Job, JobControl, ShellOptions, ShellContext, };
export declare class ShellExecutor {
    private context;
    private expander;
    private pathExpander;
    private braceExpander;
    private jobManager;
    private jobBuiltins;
    private extendedExpander;
    private extendedGlobber;
    constructor(initialContext?: Partial<ShellContext>);
    private createVariableContext;
    private updateExpander;
    private formatShellOptions;
    private adaptJobBuiltinResult;
    getContext(): ShellContext;
    execute(node: ASTNode): Promise<ExecutionResult>;
    private executeNode;
    private executeSimpleCommand;
    private executeBuiltin;
    private builtin_cd;
    private builtin_pwd;
    private builtin_echo;
    private builtin_exit;
    private builtin_export;
    private builtin_unset;
    private builtin_set;
    private builtin_test;
    private evaluateTestExpression;
    private evaluateUnaryTest;
    private evaluateBinaryTest;
    private evaluateComplexTest;
    private fileExists;
    private isRegularFile;
    private isDirectory;
    private isReadable;
    private isWritable;
    private isExecutable;
    private hasSize;
    private builtin_printf;
    private builtin_eval;
    private builtin_exec;
    private builtin_return;
    private builtin_shift;
    private builtin_local;
    private builtin_jobs;
    private builtin_fg;
    private builtin_bg;
    private builtin_wait;
    private builtin_read;
    private builtin_getopts;
    private builtin_trap;
    private executeExternalCommand;
    private executePipeline;
    private nodeToString;
    private executeIfStatement;
    private executeForStatement;
    private executeWhileStatement;
    private executeCaseStatement;
    private matchesPattern;
    private executeSubshell;
    private executeCommandGroup;
    private executeBackgroundCommand;
    private executeCommandList;
    private executeFunctionDefinition;
    private executeFunctionCall;
    private executeWithRedirections;
    private executeWithRedirectionHandling;
    private processRedirection;
    private executeBuiltinWithRedirection;
    private executeExternalCommandWithRedirection;
    private cleanupRedirections;
    private handleProcessSubstitution;
    private builtin_typeset;
    private builtin_setopt;
    private builtin_unsetopt;
    private builtin_history;
    private builtin_fc;
    private builtin_r;
    private builtin_alias;
    private builtin_unalias;
    private expandParameterWithZshFeatures;
    private expandPathnamesWithZshFeatures;
    private evaluateArithmeticWithFloatingPoint;
    getCompletions(command: string, args: string[], currentWord: string, wordIndex: number): Promise<string[]>;
    registerCompletion(command: string, func: CompletionFunction): void;
    addToHistory(command: string, exitCode?: number): void;
    getHistoryEntries(): Array<{
        command: string;
        timestamp: number;
        exitCode?: number;
    }>;
    setPositionalParams(params: string[]): void;
    getZshCompatibility(): any;
    getPrompt(): string;
    getRPrompt(): string;
    private builtin_source;
    private builtin_install;
    private builtin_uninstall;
    private builtin_zsh_migrate;
    private builtin_zsh_source;
    /**
     * readonly - Make variables read-only
     * Usage: readonly [name[=value]]...
     */
    private builtin_readonly;
    /**
     * type - Display command type
     * Usage: type name...
     */
    private builtin_type;
    /**
     * hash - Remember command locations
     * Usage: hash [-lr] [name...]
     */
    private builtin_hash;
    /**
     * kill - Send signal to process
     * Usage: kill [-s sigspec | -sigspec] pid...
     */
    private builtin_kill;
}
