/**
 * POSIX Shell Command Executor
 * Executes parsed AST nodes following POSIX semantics
 */
import { ASTNode } from './shell-parser.js';
export interface ExecutionResult {
    stdout: string;
    stderr: string;
    exitCode: number;
    success: boolean;
}
export interface ShellContext {
    env: Record<string, string>;
    cwd: string;
    variables: Record<string, string>;
    lastExitCode: number;
}
export declare class ShellExecutor {
    private context;
    constructor(initialContext?: Partial<ShellContext>);
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
    private executeExternalCommand;
    private executePipeline;
    private executeCommandList;
    private executeSubshell;
    private nodeToString;
}
