/**
 * Shell Type Definitions
 * Shared types used across shell execution modules
 * Extracted from shell-executor.ts to break circular dependencies
 */
import { FunctionDefinition } from './shell-parser.js';
import HistorySystem from './history-system.js';
import CompletionSystem from './completion-system.js';
import AssociativeArrayManager from './associative-arrays.js';
import ZshOptionsManager from './zsh-options.js';
import PromptSystem from './prompt-system.js';
import FloatingPointArithmetic from './floating-point-arithmetic.js';
import ZshCompatibility from './zsh-compatibility.js';
/**
 * Result of command execution
 */
export interface ExecutionResult {
    stdout: string;
    stderr: string;
    exitCode: number;
    success: boolean;
}
/**
 * Job information for job control
 */
export interface Job {
    id: number;
    pid: number;
    command: string;
    status: 'running' | 'stopped' | 'done';
    startTime: number;
}
/**
 * Job control state
 */
export interface JobControl {
    jobs: Map<number, Job>;
    nextJobId: number;
    lastBackgroundPid: number;
}
/**
 * Shell options (set -e, set -u, etc.)
 */
export interface ShellOptions {
    errexit: boolean;
    nounset: boolean;
    xtrace: boolean;
    verbose: boolean;
    noglob: boolean;
    monitor: boolean;
    noclobber: boolean;
    allexport: boolean;
}
/**
 * Shell execution context
 */
export interface ShellContext {
    env: Record<string, string>;
    cwd: string;
    variables: Record<string, string>;
    lastExitCode: number;
    lastReturnCode: number;
    positionalParams: string[];
    ifs: string;
    functions: Record<string, FunctionDefinition>;
    jobControl: JobControl;
    options: ShellOptions;
    history: HistorySystem;
    completion: CompletionSystem;
    arrays: AssociativeArrayManager;
    zshOptions: ZshOptionsManager;
    prompt: PromptSystem;
    floatingPoint: FloatingPointArithmetic;
    zshCompatibility: ZshCompatibility;
}
