/**
 * POSIX Shell Command Executor
 * Executes parsed AST nodes following POSIX semantics
 */

import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import {
  ASTNode,
  SimpleCommand,
  Pipeline,
  CommandList,
  Subshell,
  CommandGroup,
  Redirection,
  IfStatement,
  ForStatement,
  WhileStatement,
  CaseStatement,
  FunctionDefinition,
  ProcessSubstitution,
  parseShellCommand
} from './shell-parser.js';
import { VariableExpander, VariableContext } from './variable-expansion.js';
import { PathnameExpander } from './pathname-expansion.js';
import { BraceExpander } from './brace-expansion.js';
import { CompletionFunction } from './completion-system.js';
import JobManager from './job-manager.js';
import JobBuiltins from './job-builtins.js';
import HistorySystem from './history-system.js';
import CompletionSystem from './completion-system.js';
import AssociativeArrayManager from './associative-arrays.js';
import ExtendedParameterExpander from './extended-parameter-expansion.js';
import ExtendedGlobber from './extended-globbing.js';
import ZshOptionsManager from './zsh-options.js';
import PromptSystem from './prompt-system.js';
import FloatingPointArithmetic from './floating-point-arithmetic.js';
import ZshCompatibility from './zsh-compatibility.js';

const execAsync = promisify(exec);

export interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  success: boolean;
}

export interface Job {
  id: number;
  pid: number;
  command: string;
  status: 'running' | 'stopped' | 'done';
  startTime: number;
}

export interface JobControl {
  jobs: Map<number, Job>;
  nextJobId: number;
  lastBackgroundPid: number;
}

export interface ShellOptions {
  errexit: boolean;    // set -e: exit on error
  nounset: boolean;    // set -u: error on unset variables
  xtrace: boolean;     // set -x: print commands before execution
  verbose: boolean;    // set -v: print shell input lines
  noglob: boolean;     // set -f: disable pathname expansion
  monitor: boolean;    // set -m: enable job control
  noclobber: boolean;  // set -C: don't overwrite files with >
  allexport: boolean;  // set -a: export all variables
}

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

export class ShellExecutor {
  private context: ShellContext;
  private expander: VariableExpander;
  private pathExpander: PathnameExpander;
  private braceExpander: BraceExpander;
  private jobManager: JobManager;
  private jobBuiltins: JobBuiltins;
  private extendedExpander: ExtendedParameterExpander;
  private extendedGlobber: ExtendedGlobber;

  constructor(initialContext?: Partial<ShellContext>) {
    this.context = {
      env: { ...process.env },
      cwd: process.cwd(),
      variables: {},
      lastExitCode: 0,
      lastReturnCode: 0,
      positionalParams: [],
      ifs: ' \t\n',
      functions: {},
      jobControl: {
        jobs: new Map(),
        nextJobId: 1,
        lastBackgroundPid: 0,
      },
      options: {
        errexit: false,
        nounset: false,
        xtrace: false,
        verbose: false,
        noglob: false,
        monitor: false,
        noclobber: false,
        allexport: false,
      },
      history: new HistorySystem(),
      completion: new CompletionSystem(),
      arrays: new AssociativeArrayManager(),
      zshOptions: new ZshOptionsManager(),
      prompt: new PromptSystem(),
      floatingPoint: new FloatingPointArithmetic(),
      zshCompatibility: null as any, // Will be initialized after constructor
      ...initialContext,
    };

    this.expander = new VariableExpander(this.createVariableContext());
    this.pathExpander = new PathnameExpander(this.context.cwd);
    this.braceExpander = new BraceExpander();
    this.jobManager = new JobManager();
    this.jobBuiltins = new JobBuiltins(this.jobManager);
    this.extendedExpander = new ExtendedParameterExpander({
      variables: this.context.variables,
      env: this.context.env,
      arrays: this.context.arrays,
    });
    this.extendedGlobber = new ExtendedGlobber(this.context.cwd);
  }

  private createVariableContext(): VariableContext {
    return {
      variables: this.context.variables,
      env: this.context.env,
      positionalParams: this.context.positionalParams,
      specialParams: {
        '$': process.pid.toString(),
        '?': this.context.lastExitCode.toString(),
        '#': this.context.positionalParams.length.toString(),
        '*': this.context.positionalParams.join(' '),
        '@': this.context.positionalParams,
        '!': this.context.jobControl.lastBackgroundPid.toString(),
        '0': 'lsh',
        '-': this.formatShellOptions(),
      },
      options: this.context.options, // Pass shell options for set -u behavior
    };

    // Initialize zshCompatibility after constructor to avoid circular dependency
    this.context.zshCompatibility = new ZshCompatibility(this, {
      sourceZshrc: true,
      respectZshCompletions: true,
      installPackages: true,
    });
  }

  private updateExpander(): void {
    this.expander.updateContext(this.createVariableContext());
  }

  private formatShellOptions(): string {
    const options = this.context.options;
    let optionString = '';

    if (options.errexit) optionString += 'e';
    if (options.nounset) optionString += 'u';
    if (options.xtrace) optionString += 'x';
    if (options.verbose) optionString += 'v';
    if (options.noglob) optionString += 'f';
    if (options.monitor) optionString += 'm';
    if (options.noclobber) optionString += 'C';
    if (options.allexport) optionString += 'a';

    return optionString;
  }

  private adaptJobBuiltinResult(result: { stdout: string; stderr: string; exitCode: number }): ExecutionResult {
    return {
      ...result,
      success: result.exitCode === 0
    };
  }
  
  public getContext(): ShellContext {
    return { ...this.context };
  }
  
  public async execute(node: ASTNode): Promise<ExecutionResult> {
    try {
      return await this.executeNode(node);
    } catch (error) {
      return {
        stdout: '',
        stderr: error.message,
        exitCode: 1,
        success: false,
      };
    }
  }
  
  private async executeNode(node: ASTNode): Promise<ExecutionResult> {
    // Implement set -x (xtrace) - print commands before execution
    if (this.context.options.xtrace && (node.type === 'SimpleCommand' || node.type === 'Pipeline')) {
      console.error(`+ ${this.nodeToString(node)}`);
    }

    let result: ExecutionResult;

    switch (node.type) {
      case 'SimpleCommand':
        result = await this.executeSimpleCommand(node as SimpleCommand);
        break;
      case 'Pipeline':
        result = await this.executePipeline(node as Pipeline);
        break;
      case 'CommandList':
        result = await this.executeCommandList(node as CommandList);
        break;
      case 'Subshell':
        result = await this.executeSubshell(node as Subshell);
        break;
      case 'CommandGroup':
        result = await this.executeCommandGroup(node as CommandGroup);
        break;
      case 'IfStatement':
        result = await this.executeIfStatement(node as IfStatement);
        break;
      case 'ForStatement':
        result = await this.executeForStatement(node as ForStatement);
        break;
      case 'WhileStatement':
        result = await this.executeWhileStatement(node as WhileStatement);
        break;
      case 'CaseStatement':
        result = await this.executeCaseStatement(node as CaseStatement);
        break;
      case 'FunctionDefinition':
        result = await this.executeFunctionDefinition(node as FunctionDefinition);
        break;
      default:
        throw new Error(`Unknown AST node type: ${node.type}`);
    }

    // Implement set -e (errexit) - exit immediately on command failure
    if (this.context.options.errexit && !result.success && result.exitCode !== 0) {
      // Only exit on actual command failures, not control structures or built-ins that expect failures
      if (node.type === 'SimpleCommand' || node.type === 'Pipeline') {
        throw new Error(`Command failed with exit code ${result.exitCode} (set -e)`);
      }
    }

    return result;
  }
  
  private async executeSimpleCommand(cmd: SimpleCommand): Promise<ExecutionResult> {
    if (!cmd.name) {
      return { stdout: '', stderr: '', exitCode: 0, success: true };
    }
    
    this.updateExpander();
    
    // Expand command name and arguments
    const expandedName = await this.expander.expandString(cmd.name);
    const expandedArgs: string[] = [];
    
    for (const arg of cmd.args) {
      // Check for process substitution first
      if (arg.startsWith('<(') || arg.startsWith('>(')) {
        const fifoPath = await this.handleProcessSubstitution(arg);
        expandedArgs.push(fifoPath);
        continue;
      }

      // Step 1: Variable and command substitution expansion
      const variableExpanded = await this.expander.expandString(arg);

      // Step 2: Brace expansion
      const braceExpanded = this.braceExpander.expandBraces(variableExpanded);

      // Step 3: Process each brace-expanded result
      for (const braceResult of braceExpanded) {
        // Step 4: Field splitting (only if variable expansion occurred)
        let fields: string[];
        if (variableExpanded !== arg && (arg.includes('$') || arg.includes('`'))) {
          // Only split if variable expansion happened
          fields = this.expander.splitFields(braceResult, this.context.ifs);
        } else {
          // No variable expansion, keep as single field
          fields = [braceResult];
        }

        // Step 5: Pathname expansion for each field
        for (const field of fields) {
          const pathExpanded = await this.pathExpander.expandPathnames(field, {
            cwd: this.context.cwd,
            includeHidden: false,
          });

          // If pathname expansion found matches, use them; otherwise use original field
          if (pathExpanded.length > 0 && pathExpanded[0] !== field) {
            expandedArgs.push(...pathExpanded);
          } else {
            expandedArgs.push(field);
          }
        }
      }
    }
    
    // Create expanded command
    const expandedCmd: SimpleCommand = {
      type: 'SimpleCommand',
      name: expandedName,
      args: expandedArgs,
      redirections: cmd.redirections,
    };

    // Handle redirections and execute command
    return this.executeWithRedirections(expandedCmd);
  }
  
  private async executeBuiltin(name: string, args: string[]): Promise<ExecutionResult | null> {
    switch (name) {
      case 'cd':
        return this.builtin_cd(args);
      case 'pwd':
        return this.builtin_pwd(args);
      case 'echo':
        return this.builtin_echo(args);
      case 'true':
        return { stdout: '', stderr: '', exitCode: 0, success: true };
      case 'false':
        return { stdout: '', stderr: '', exitCode: 1, success: false };
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
      case 'printf':
        return this.builtin_printf(args);
      case 'eval':
        return this.builtin_eval(args);
      case 'exec':
        return this.builtin_exec(args);
      case 'return':
        return this.builtin_return(args);
      case 'shift':
        return this.builtin_shift(args);
      case 'local':
        return this.builtin_local(args);
      case 'jobs':
        return this.builtin_jobs(args);
      case 'fg':
        return this.builtin_fg(args);
      case 'bg':
        return this.builtin_bg(args);
      case 'wait':
        return this.builtin_wait(args);
      case 'read':
        return this.builtin_read(args);
      case 'getopts':
        return this.builtin_getopts(args);
      case 'trap':
        return this.builtin_trap(args);
      case 'typeset':
        return this.builtin_typeset(args);
      case 'setopt':
        return this.builtin_setopt(args);
      case 'unsetopt':
        return this.builtin_unsetopt(args);
      case 'history':
        return this.builtin_history(args);
      case 'fc':
        return this.builtin_fc(args);
      case 'r':
        return this.builtin_r(args);
      case 'alias':
        return this.builtin_alias(args);
      case 'unalias':
        return this.builtin_unalias(args);
      case 'source':
        return this.builtin_source(args);
      case 'install':
        return this.builtin_install(args);
      case 'uninstall':
        return this.builtin_uninstall(args);
      case 'zsh-migrate':
        return this.builtin_zsh_migrate(args);
      case 'zsh-source':
        return this.builtin_zsh_source(args);

      // Job Management Built-ins
      case 'job-create':
        return this.adaptJobBuiltinResult(await this.jobBuiltins.jobCreate(args));
      case 'job-list':
      case 'jlist':
        return this.adaptJobBuiltinResult(await this.jobBuiltins.jobList(args));
      case 'job-show':
      case 'jshow':
        return this.adaptJobBuiltinResult(await this.jobBuiltins.jobShow(args));
      case 'job-start':
      case 'jstart':
        return this.adaptJobBuiltinResult(await this.jobBuiltins.jobStart(args));
      case 'job-stop':
      case 'jstop':
        return this.adaptJobBuiltinResult(await this.jobBuiltins.jobStop(args));
      case 'job-pause':
      case 'jpause':
        return this.adaptJobBuiltinResult(await this.jobBuiltins.jobPause(args));
      case 'job-resume':
      case 'jresume':
        return this.adaptJobBuiltinResult(await this.jobBuiltins.jobResume(args));
      case 'job-remove':
      case 'jremove':
        return this.adaptJobBuiltinResult(await this.jobBuiltins.jobRemove(args));
      case 'job-update':
      case 'jupdate':
        return this.adaptJobBuiltinResult(await this.jobBuiltins.jobUpdate(args));
      case 'job-run':
      case 'jrun':
        return this.adaptJobBuiltinResult(await this.jobBuiltins.jobRun(args));
      case 'job-monitor':
      case 'jmonitor':
        return this.adaptJobBuiltinResult(await this.jobBuiltins.jobMonitor(args));
      case 'job-stats':
      case 'jstats':
        return this.adaptJobBuiltinResult(await this.jobBuiltins.jobStats(args));
      case 'job-cleanup':
      case 'jcleanup':
        return this.adaptJobBuiltinResult(await this.jobBuiltins.jobCleanup(args));
      case 'ps-list':
      case 'pslist':
        return this.adaptJobBuiltinResult(await this.jobBuiltins.psList(args));
      case 'ps-kill':
      case 'pskill':
        return this.adaptJobBuiltinResult(await this.jobBuiltins.psKill(args));

      default:
        return null; // Not a built-in
    }
  }
  
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
        stderr: `cd: ${target}: ${error.message}`,
        exitCode: 1,
        success: false,
      };
    }
  }
  
  private async builtin_pwd(args: string[]): Promise<ExecutionResult> {
    return {
      stdout: this.context.cwd,
      stderr: '',
      exitCode: 0,
      success: true,
    };
  }
  
  private async builtin_echo(args: string[]): Promise<ExecutionResult> {
    let output = args.join(' ');
    
    // Handle -n flag (no trailing newline)
    if (args[0] === '-n') {
      output = args.slice(1).join(' ');
    } else {
      output += '\n';
    }
    
    return {
      stdout: output,
      stderr: '',
      exitCode: 0,
      success: true,
    };
  }
  
  private async builtin_exit(args: string[]): Promise<ExecutionResult> {
    const code = args[0] ? parseInt(args[0], 10) : this.context.lastExitCode;
    
    // In a real shell, this would exit the process
    // For now, we'll just return the exit code
    return {
      stdout: '',
      stderr: '',
      exitCode: code,
      success: code === 0,
    };
  }
  
  private async builtin_export(args: string[]): Promise<ExecutionResult> {
    for (const arg of args) {
      if (arg.includes('=')) {
        const [name, value] = arg.split('=', 2);
        this.context.env[name] = value;
        this.context.variables[name] = value;
      } else {
        // Export existing variable
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
      // Show all variables and functions
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

    // Handle set options
    for (const arg of args) {
      if (arg.startsWith('-')) {
        // Enable options
        for (let i = 1; i < arg.length; i++) {
          const option = arg.charAt(i);
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
            default:
              return {
                stdout: '',
                stderr: `set: illegal option -- ${option}`,
                exitCode: 1,
                success: false,
              };
          }
        }
      } else if (arg.startsWith('+')) {
        // Disable options
        for (let i = 1; i < arg.length; i++) {
          const option = arg.charAt(i);
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
            default:
              return {
                stdout: '',
                stderr: `set: illegal option -- ${option}`,
                exitCode: 1,
                success: false,
              };
          }
        }
      } else {
        // Set positional parameters
        const index = args.indexOf(arg);
        this.context.positionalParams = args.slice(index);
        break;
      }
    }

    return {
      stdout: '',
      stderr: '',
      exitCode: 0,
      success: true,
    };
  }

  private async builtin_test(args: string[]): Promise<ExecutionResult> {
    // POSIX test command implementation
    try {
      const result = this.evaluateTestExpression(args);
      return {
        stdout: '',
        stderr: '',
        exitCode: result ? 0 : 1,
        success: result,
      };
    } catch (error) {
      return {
        stdout: '',
        stderr: `test: ${error.message}`,
        exitCode: 2,
        success: false,
      };
    }
  }

  private evaluateTestExpression(args: string[]): boolean {
    if (args.length === 0) {
      return false; // No arguments means false
    }

    // Handle [ command - remove trailing ]
    if (args[args.length - 1] === ']') {
      args = args.slice(0, -1);
    }

    if (args.length === 1) {
      // Single argument: test if string is non-empty
      return args[0] !== '';
    }

    if (args.length === 2) {
      const [operator, operand] = args;
      return this.evaluateUnaryTest(operator, operand);
    }

    if (args.length === 3) {
      const [left, operator, right] = args;
      return this.evaluateBinaryTest(left, operator, right);
    }

    if (args.length >= 4) {
      // Complex expressions with logical operators
      return this.evaluateComplexTest(args);
    }

    return false;
  }

  private evaluateUnaryTest(operator: string, operand: string): boolean {
    switch (operator) {
      case '-z': return operand === '';           // String is empty
      case '-n': return operand !== '';           // String is non-empty
      case '-f': return this.isRegularFile(operand);
      case '-d': return this.isDirectory(operand);
      case '-e': return this.fileExists(operand);
      case '-r': return this.isReadable(operand);
      case '-w': return this.isWritable(operand);
      case '-x': return this.isExecutable(operand);
      case '-s': return this.hasSize(operand);
      case '!':  return !this.evaluateTestExpression([operand]);
      default:
        throw new Error(`unknown unary operator: ${operator}`);
    }
  }

  private evaluateBinaryTest(left: string, operator: string, right: string): boolean {
    switch (operator) {
      // String comparisons
      case '=':
      case '==':
        return left === right;
      case '!=':
        return left !== right;

      // Numeric comparisons
      case '-eq': return parseInt(left, 10) === parseInt(right, 10);
      case '-ne': return parseInt(left, 10) !== parseInt(right, 10);
      case '-lt': return parseInt(left, 10) < parseInt(right, 10);
      case '-le': return parseInt(left, 10) <= parseInt(right, 10);
      case '-gt': return parseInt(left, 10) > parseInt(right, 10);
      case '-ge': return parseInt(left, 10) >= parseInt(right, 10);

      default:
        throw new Error(`unknown binary operator: ${operator}`);
    }
  }

  private evaluateComplexTest(args: string[]): boolean {
    // Handle logical operators -a (AND) and -o (OR)
    for (let i = 1; i < args.length - 1; i++) {
      if (args[i] === '-a') {
        const leftArgs = args.slice(0, i);
        const rightArgs = args.slice(i + 1);
        return this.evaluateTestExpression(leftArgs) && this.evaluateTestExpression(rightArgs);
      }
      if (args[i] === '-o') {
        const leftArgs = args.slice(0, i);
        const rightArgs = args.slice(i + 1);
        return this.evaluateTestExpression(leftArgs) || this.evaluateTestExpression(rightArgs);
      }
    }
    
    // If no logical operators, try to evaluate as a complex expression
    return false;
  }

  // File test helper methods
  private fileExists(path: string): boolean {
    try {
      fs.accessSync(path);
      return true;
    } catch {
      return false;
    }
  }

  private isRegularFile(path: string): boolean {
    try {
      return fs.statSync(path).isFile();
    } catch {
      return false;
    }
  }

  private isDirectory(path: string): boolean {
    try {
      return fs.statSync(path).isDirectory();
    } catch {
      return false;
    }
  }

  private isReadable(path: string): boolean {
    try {
      fs.accessSync(path, fs.constants.R_OK);
      return true;
    } catch {
      return false;
    }
  }

  private isWritable(path: string): boolean {
    try {
      fs.accessSync(path, fs.constants.W_OK);
      return true;
    } catch {
      return false;
    }
  }

  private isExecutable(path: string): boolean {
    try {
      fs.accessSync(path, fs.constants.X_OK);
      return true;
    } catch {
      return false;
    }
  }

  private hasSize(path: string): boolean {
    try {
      return fs.statSync(path).size > 0;
    } catch {
      return false;
    }
  }

  private async builtin_printf(args: string[]): Promise<ExecutionResult> {
    if (args.length === 0) {
      return {
        stdout: '',
        stderr: 'printf: missing format string',
        exitCode: 1,
        success: false,
      };
    }

    const format = args[0];
    const values = args.slice(1);
    
    try {
      // Basic printf implementation - handle most common format specifiers
      let result = format;
      let valueIndex = 0;

      // Simple substitution for %s, %d, %c, etc.
      result = result.replace(/%[sdcxo%]/g, (match) => {
        if (match === '%%') return '%';
        if (valueIndex >= values.length) return match; // Keep placeholder if no value
        
        const value = values[valueIndex++];
        
        switch (match) {
          case '%s': return value;
          case '%d': return parseInt(value, 10).toString() || '0';
          case '%c': return value.charAt(0);
          case '%x': return parseInt(value, 10).toString(16) || '0';
          case '%o': return parseInt(value, 10).toString(8) || '0';
          default: return value;
        }
      });

      // Handle escape sequences
      result = result.replace(/\\n/g, '\n')
                     .replace(/\\t/g, '\t')
                     .replace(/\\r/g, '\r')
                     .replace(/\\b/g, '\b')
                     .replace(/\\f/g, '\f')
                     .replace(/\\v/g, '\v')
                     .replace(/\\\\/g, '\\');

      return {
        stdout: result,
        stderr: '',
        exitCode: 0,
        success: true,
      };
    } catch (error) {
      return {
        stdout: '',
        stderr: `printf: ${error.message}`,
        exitCode: 1,
        success: false,
      };
    }
  }

  private async builtin_eval(args: string[]): Promise<ExecutionResult> {
    if (args.length === 0) {
      return { stdout: '', stderr: '', exitCode: 0, success: true };
    }

    // Join all arguments into a single command string
    const command = args.join(' ');

    try {
      // Parse and execute the command
      const { parseShellCommand } = await import('./shell-parser.js');
      const ast = parseShellCommand(command);
      return await this.execute(ast);
    } catch (error) {
      return {
        stdout: '',
        stderr: `eval: ${error.message}`,
        exitCode: 1,
        success: false,
      };
    }
  }

  private async builtin_exec(args: string[]): Promise<ExecutionResult> {
    if (args.length === 0) {
      return {
        stdout: '',
        stderr: 'exec: usage: exec [-cl] [-a name] [command [arguments]]',
        exitCode: 2,
        success: false,
      };
    }

    // In a real shell, exec would replace the current process
    // For our implementation, we'll just execute the command
    try {
      const cmd: SimpleCommand = {
        type: 'SimpleCommand',
        name: args[0],
        args: args.slice(1),
        redirections: [],
      };

      return await this.executeSimpleCommand(cmd);
    } catch (error) {
      return {
        stdout: '',
        stderr: `exec: ${error.message}`,
        exitCode: 126,
        success: false,
      };
    }
  }

  private async builtin_return(args: string[]): Promise<ExecutionResult> {
    // Parse exit code argument (defaults to 0)
    let exitCode = 0;
    if (args.length > 0) {
      const code = parseInt(args[0], 10);
      if (isNaN(code)) {
        return {
          stdout: '',
          stderr: `return: ${args[0]}: numeric argument required`,
          exitCode: 2,
          success: false,
        };
      }
      exitCode = code;
    }

    // In a real shell, return would exit from a function or sourced script
    // For our implementation, we'll store the return value and indicate completion
    this.context.lastReturnCode = exitCode;

    return {
      stdout: '',
      stderr: '',
      exitCode: exitCode,
      success: exitCode === 0,
    };
  }

  private async builtin_shift(args: string[]): Promise<ExecutionResult> {
    // Parse shift count (defaults to 1)
    let count = 1;
    if (args.length > 0) {
      count = parseInt(args[0], 10);
      if (isNaN(count) || count < 0) {
        return {
          stdout: '',
          stderr: `shift: ${args[0]}: numeric argument required`,
          exitCode: 1,
          success: false,
        };
      }
    }

    // Check if we have enough positional parameters to shift
    if (!this.context.positionalParams) {
      this.context.positionalParams = [];
    }

    const available = this.context.positionalParams.length;
    if (count > available) {
      return {
        stdout: '',
        stderr: `shift: shift count (${count}) exceeds number of positional parameters (${available})`,
        exitCode: 1,
        success: false,
      };
    }

    // Perform the shift
    this.context.positionalParams = this.context.positionalParams.slice(count);

    return {
      stdout: '',
      stderr: '',
      exitCode: 0,
      success: true,
    };
  }

  private async builtin_local(args: string[]): Promise<ExecutionResult> {
    // The local command is only meaningful within a function
    // For now, we'll treat it the same as variable assignment
    // In a full implementation, this would set function-local variables

    if (args.length === 0) {
      // List all local variables (in a full implementation)
      return {
        stdout: '',
        stderr: '',
        exitCode: 0,
        success: true,
      };
    }

    // Process variable assignments
    for (const arg of args) {
      const equalIndex = arg.indexOf('=');
      if (equalIndex > 0) {
        const name = arg.substring(0, equalIndex);
        const value = arg.substring(equalIndex + 1);
        this.context.variables[name] = value;
      } else {
        // Just declare the variable as local (set to empty in our implementation)
        this.context.variables[arg] = '';
      }
    }

    // Update expander with new variables
    this.updateExpander();

    return {
      stdout: '',
      stderr: '',
      exitCode: 0,
      success: true,
    };
  }

  // Job Control Built-ins

  private async builtin_jobs(args: string[]): Promise<ExecutionResult> {
    const jobs = Array.from(this.context.jobControl.jobs.values());

    if (jobs.length === 0) {
      return {
        stdout: '',
        stderr: '',
        exitCode: 0,
        success: true,
      };
    }

    let output = '';
    for (const job of jobs) {
      const status = job.status === 'running' ? 'Running' : 'Done';
      output += `[${job.id}]${job.status === 'running' ? '+' : '-'} ${status}      ${job.command}\n`;
    }

    return {
      stdout: output,
      stderr: '',
      exitCode: 0,
      success: true,
    };
  }

  private async builtin_fg(args: string[]): Promise<ExecutionResult> {
    // In a real implementation, this would bring a background job to foreground
    // For now, just return a message
    return {
      stdout: '',
      stderr: 'fg: job control not fully implemented',
      exitCode: 1,
      success: false,
    };
  }

  private async builtin_bg(args: string[]): Promise<ExecutionResult> {
    // In a real implementation, this would resume a stopped job in background
    // For now, just return a message
    return {
      stdout: '',
      stderr: 'bg: job control not fully implemented',
      exitCode: 1,
      success: false,
    };
  }

  private async builtin_wait(args: string[]): Promise<ExecutionResult> {
    // Wait for background jobs to complete
    if (args.length === 0) {
      // Wait for all background jobs
      const runningJobs = Array.from(this.context.jobControl.jobs.values())
        .filter(job => job.status === 'running');

      if (runningJobs.length === 0) {
        return {
          stdout: '',
          stderr: '',
          exitCode: 0,
          success: true,
        };
      }

      // In a real implementation, this would actually wait for process completion
      // For now, just simulate waiting briefly
      await new Promise(resolve => setTimeout(resolve, 100));

      return {
        stdout: '',
        stderr: '',
        exitCode: 0,
        success: true,
      };
    }

    // Wait for specific job (simplified implementation)
    const pid = parseInt(args[0], 10);
    const job = Array.from(this.context.jobControl.jobs.values())
      .find(j => j.pid === pid);

    if (!job) {
      return {
        stdout: '',
        stderr: `wait: ${pid}: no such job`,
        exitCode: 1,
        success: false,
      };
    }

    return {
      stdout: '',
      stderr: '',
      exitCode: 0,
      success: true,
    };
  }

  // Essential Built-ins for POSIX Compliance

  private async builtin_read(args: string[]): Promise<ExecutionResult> {
    // Basic read implementation - reads from stdin
    // In a full implementation, this would handle options like -p, -t, -n, etc.

    if (args.length === 0) {
      return {
        stdout: '',
        stderr: 'read: missing variable name',
        exitCode: 1,
        success: false,
      };
    }

    const varName = args[0];

    try {
      // For now, simulate reading input (in a real implementation, this would read from stdin)
      // Since we can't easily read from stdin in this context, we'll set a default value
      const inputValue = 'simulated_input';

      // Set the variable
      this.context.variables[varName] = inputValue;
      this.updateExpander();

      return {
        stdout: '',
        stderr: '',
        exitCode: 0,
        success: true,
      };
    } catch (error) {
      return {
        stdout: '',
        stderr: `read: ${error.message}`,
        exitCode: 1,
        success: false,
      };
    }
  }

  private async builtin_getopts(args: string[]): Promise<ExecutionResult> {
    // Basic getopts implementation for option parsing
    // Usage: getopts optstring name [args...]

    if (args.length < 2) {
      return {
        stdout: '',
        stderr: 'getopts: usage: getopts optstring name [args...]',
        exitCode: 1,
        success: false,
      };
    }

    const optstring = args[0];
    const varName = args[1];
    const optargs = args.length > 2 ? args.slice(2) : this.context.positionalParams;

    // Initialize OPTIND if not set
    if (!this.context.variables.OPTIND) {
      this.context.variables.OPTIND = '1';
    }

    const optind = parseInt(this.context.variables.OPTIND, 10);

    // If we've processed all arguments
    if (optind > optargs.length) {
      this.context.variables[varName] = '?';
      return {
        stdout: '',
        stderr: '',
        exitCode: 1,
        success: false,
      };
    }

    const currentArg = optargs[optind - 1];

    // Check if current argument is an option
    if (!currentArg || !currentArg.startsWith('-') || currentArg.length < 2) {
      this.context.variables[varName] = '?';
      return {
        stdout: '',
        stderr: '',
        exitCode: 1,
        success: false,
      };
    }

    // Simple implementation - just return the first character after -
    const option = currentArg.charAt(1);
    this.context.variables[varName] = option;
    this.context.variables.OPTIND = String(optind + 1);
    this.updateExpander();

    return {
      stdout: '',
      stderr: '',
      exitCode: 0,
      success: true,
    };
  }

  private async builtin_trap(args: string[]): Promise<ExecutionResult> {
    // Basic trap implementation for signal handling
    // Usage: trap [-lp] [command] [signal...]

    if (args.length === 0) {
      // List current traps (simplified)
      let output = '';
      if (this.context.variables.TRAP_INT) {
        output += `trap -- '${this.context.variables.TRAP_INT}' INT\n`;
      }
      if (this.context.variables.TRAP_TERM) {
        output += `trap -- '${this.context.variables.TRAP_TERM}' TERM\n`;
      }

      return {
        stdout: output,
        stderr: '',
        exitCode: 0,
        success: true,
      };
    }

    if (args[0] === '-l') {
      // List signal names
      return {
        stdout: ' 1) SIGHUP  2) SIGINT  3) SIGQUIT  4) SIGILL  5) SIGTRAP\n' +
               ' 6) SIGABRT  7) SIGBUS  8) SIGFPE  9) SIGKILL 10) SIGUSR1\n' +
               '11) SIGSEGV 12) SIGUSR2 13) SIGPIPE 14) SIGALRM 15) SIGTERM\n',
        stderr: '',
        exitCode: 0,
        success: true,
      };
    }

    if (args.length >= 2) {
      const command = args[0];
      const signals = args.slice(1);

      // Set trap for each signal (simplified implementation)
      for (const signal of signals) {
        const signalUpper = signal.toUpperCase();
        if (signalUpper === 'INT' || signalUpper === 'SIGINT') {
          this.context.variables.TRAP_INT = command;
        } else if (signalUpper === 'TERM' || signalUpper === 'SIGTERM') {
          this.context.variables.TRAP_TERM = command;
        }
      }

      this.updateExpander();

      return {
        stdout: '',
        stderr: '',
        exitCode: 0,
        success: true,
      };
    }

    return {
      stdout: '',
      stderr: 'trap: usage: trap [-lp] [command] [signal...]',
      exitCode: 1,
      success: false,
    };
  }

  private async executeExternalCommand(cmd: SimpleCommand): Promise<ExecutionResult> {
    return new Promise((resolve) => {
      const child = spawn(cmd.name, cmd.args, {
        cwd: this.context.cwd,
        env: this.context.env,
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      
      let stdout = '';
      let stderr = '';
      
      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });
      
      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });
      
      child.on('close', (code) => {
        const exitCode = code || 0;
        this.context.lastExitCode = exitCode;
        
        resolve({
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          exitCode,
          success: exitCode === 0,
        });
      });
      
      child.on('error', (error) => {
        resolve({
          stdout: '',
          stderr: `${cmd.name}: command not found`,
          exitCode: 127,
          success: false,
        });
      });
    });
  }
  
  private async executePipeline(pipeline: Pipeline): Promise<ExecutionResult> {
    if (pipeline.commands.length === 1) {
      return this.executeNode(pipeline.commands[0]);
    }
    
    // For now, use simple shell delegation for pipelines
    // TODO: Implement proper pipeline with stdout/stdin chaining
    const commandStrings = pipeline.commands.map(cmd => this.nodeToString(cmd));
    const pipelineCommand = commandStrings.join(' | ');
    
    try {
      const { stdout, stderr } = await execAsync(pipelineCommand, {
        cwd: this.context.cwd,
        env: this.context.env,
      });
      
      return {
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        exitCode: 0,
        success: true,
      };
    } catch (error) {
      return {
        stdout: '',
        stderr: error.message,
        exitCode: error.code || 1,
        success: false,
      };
    }
  }
  
  
  // Helper method to convert AST node back to string (for fallback cases)
  private nodeToString(node: ASTNode): string {
    switch (node.type) {
      case 'SimpleCommand':
        const cmd = node as SimpleCommand;
        return [cmd.name, ...cmd.args].join(' ');
      case 'Pipeline':
        const pipeline = node as Pipeline;
        return pipeline.commands.map(c => this.nodeToString(c)).join(' | ');
      case 'CommandList':
        const cmdList = node as CommandList;
        const left = this.nodeToString(cmdList.left);
        const right = cmdList.right ? this.nodeToString(cmdList.right) : '';
        return `${left} ${cmdList.operator} ${right}`.trim();
      case 'IfStatement':
      case 'ForStatement':
      case 'WhileStatement':
      case 'CaseStatement':
        return `[${node.type}]`;
      default:
        return '';
    }
  }

  // Control Structure Execution Methods
  
  private async executeIfStatement(ifStmt: IfStatement): Promise<ExecutionResult> {
    // Execute condition
    const conditionResult = await this.executeNode(ifStmt.condition);
    
    if (conditionResult.success) {
      // Condition succeeded, execute then clause
      return this.executeNode(ifStmt.thenClause);
    } else if (ifStmt.elseClause) {
      // Condition failed, execute else clause if present
      return this.executeNode(ifStmt.elseClause);
    } else {
      // No else clause, return success with empty output
      return {
        stdout: '',
        stderr: '',
        exitCode: 0,
        success: true,
      };
    }
  }
  
  private async executeForStatement(forStmt: ForStatement): Promise<ExecutionResult> {
    let lastResult: ExecutionResult = {
      stdout: '',
      stderr: '',
      exitCode: 0,
      success: true,
    };
    
    this.updateExpander();
    
    // Determine the word list to iterate over
    let words = forStmt.words;
    if (words.length === 0) {
      // If no words specified, use positional parameters
      words = this.context.positionalParams;
    }
    
    // Expand each word before iteration
    const expandedWords: string[] = [];
    for (const word of words) {
      const expanded = await this.expander.expandString(word);
      // Apply field splitting to expanded words
      const fields = this.expander.splitFields(expanded, this.context.ifs);
      expandedWords.push(...fields);
    }
    
    // Iterate over each word
    for (const word of expandedWords) {
      // Set the loop variable
      this.context.variables[forStmt.variable] = word;
      this.updateExpander();
      
      // Execute the body
      lastResult = await this.executeNode(forStmt.body);
      
      // Update context with result
      this.context.lastExitCode = lastResult.exitCode;
      
      // TODO: Handle break/continue statements
      // For now, continue execution unless there's an error
      if (!lastResult.success) {
        break;
      }
    }
    
    return lastResult;
  }
  
  private async executeWhileStatement(whileStmt: WhileStatement): Promise<ExecutionResult> {
    let lastResult: ExecutionResult = {
      stdout: '',
      stderr: '',
      exitCode: 0,
      success: true,
    };
    
    // Continue looping while condition succeeds
    while (true) {
      // Execute condition
      const conditionResult = await this.executeNode(whileStmt.condition);
      
      if (!conditionResult.success) {
        // Condition failed, exit loop
        break;
      }
      
      // Execute body
      lastResult = await this.executeNode(whileStmt.body);
      
      // Update context with result
      this.context.lastExitCode = lastResult.exitCode;
      
      // TODO: Handle break/continue statements
      // For now, continue execution
    }
    
    return lastResult;
  }
  
  private async executeCaseStatement(caseStmt: CaseStatement): Promise<ExecutionResult> {
    this.updateExpander();
    
    // Expand the case word
    const expandedWord = await this.expander.expandString(caseStmt.word);
    
    // Try to match against each case item
    for (const item of caseStmt.items) {
      for (const pattern of item.patterns) {
        // Expand the pattern
        const expandedPattern = await this.expander.expandString(pattern);
        
        // Simple pattern matching (would need full glob pattern matching)
        if (this.matchesPattern(expandedWord, expandedPattern)) {
          if (item.command) {
            return this.executeNode(item.command);
          } else {
            return {
              stdout: '',
              stderr: '',
              exitCode: 0,
              success: true,
            };
          }
        }
      }
    }
    
    // No pattern matched, return success
    return {
      stdout: '',
      stderr: '',
      exitCode: 0,
      success: true,
    };
  }
  
  private matchesPattern(text: string, pattern: string): boolean {
    // Simple pattern matching - exact match or '*' wildcard
    if (pattern === '*') {
      return true;
    }
    
    // Convert simple glob patterns to regex
    const regexPattern = pattern
      .replace(/\*/g, '.*')     // * matches any string
      .replace(/\?/g, '.')      // ? matches any single character
      .replace(/\[([^\]]+)\]/g, '[$1]'); // [abc] character class
    
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(text);
  }

  // Subshell and Command Grouping Implementation

  private async executeSubshell(subshell: Subshell): Promise<ExecutionResult> {
    // Create a new executor with isolated environment
    const subshellContext: Partial<ShellContext> = {
      // Copy current context but isolate variables and working directory
      env: { ...this.context.env },
      cwd: this.context.cwd,  // Subshells inherit CWD but changes don't affect parent
      variables: { ...this.context.variables }, // Copy variables but changes are isolated
      lastExitCode: this.context.lastExitCode,
      lastReturnCode: this.context.lastReturnCode,
      positionalParams: [...this.context.positionalParams],
      ifs: this.context.ifs,
      functions: this.context.functions, // Functions are shared (not isolated)
    };

    // Create isolated executor
    const subshellExecutor = new ShellExecutor(subshellContext);

    try {
      // Execute command in subshell
      const result = await subshellExecutor.execute(subshell.command);

      // Update parent's exit code but not other context
      this.context.lastExitCode = result.exitCode;

      return result;
    } catch (error) {
      return {
        stdout: '',
        stderr: `subshell: ${error.message}`,
        exitCode: 1,
        success: false,
      };
    }
  }

  private async executeCommandGroup(group: CommandGroup): Promise<ExecutionResult> {
    // Command groups run in the current context (no isolation like subshells)
    try {
      return await this.executeNode(group.command);
    } catch (error) {
      return {
        stdout: '',
        stderr: `command group: ${error.message}`,
        exitCode: 1,
        success: false,
      };
    }
  }

  private async executeBackgroundCommand(backgroundCommand: ASTNode, foregroundCommand?: ASTNode): Promise<ExecutionResult> {
    // For now, use setImmediate for background execution
    // TODO: Implement proper process spawning for real background jobs
    const commandString = this.nodeToString(backgroundCommand);

    // Create job entry
    const jobId = this.context.jobControl.nextJobId++;
    // For now, use a fake PID (in real implementation, this would be the actual process PID)
    const fakePid = Date.now() % 100000;

    const job: Job = {
      id: jobId,
      pid: fakePid,
      command: commandString,
      status: 'running',
      startTime: Date.now(),
    };

    // Add job to tracking
    this.context.jobControl.jobs.set(jobId, job);
    this.context.jobControl.lastBackgroundPid = fakePid;

    // Update expander context to reflect new background PID
    this.updateExpander();

    // Execute background command asynchronously
    setImmediate(async () => {
      try {
        await this.executeNode(backgroundCommand);
        // Mark job as done
        if (this.context.jobControl.jobs.has(jobId)) {
          this.context.jobControl.jobs.get(jobId)!.status = 'done';
        }
      } catch (error) {
        // Mark job as done with error
        if (this.context.jobControl.jobs.has(jobId)) {
          this.context.jobControl.jobs.get(jobId)!.status = 'done';
        }
        // Background errors are typically not displayed immediately
      }
    });

    // Execute foreground command if present
    if (foregroundCommand) {
      return this.executeNode(foregroundCommand);
    }

    // Return success for background job started
    return {
      stdout: `[${jobId}] ${fakePid}`,
      stderr: '',
      exitCode: 0,
      success: true,
    };
  }

  private async executeCommandList(cmdList: CommandList): Promise<ExecutionResult> {
    // Execute left side first
    const leftResult = await this.executeNode(cmdList.left);

    // Update context with left result
    this.context.lastExitCode = leftResult.exitCode;
    this.updateExpander();

    // Handle different operators
    switch (cmdList.operator) {
      case '&&':
        // Execute right only if left succeeded
        if (leftResult.success) {
          if (cmdList.right) {
            return this.executeNode(cmdList.right);
          }
        }
        return leftResult;

      case '||':
        // Execute right only if left failed
        if (!leftResult.success) {
          if (cmdList.right) {
            return this.executeNode(cmdList.right);
          }
        }
        return leftResult;

      case ';':
        // Execute right regardless of left result
        if (cmdList.right) {
          const rightResult = await this.executeNode(cmdList.right);
          // Return the right result but preserve left output
          return {
            stdout: leftResult.stdout + rightResult.stdout,
            stderr: leftResult.stderr + rightResult.stderr,
            exitCode: rightResult.exitCode,
            success: rightResult.success,
          };
        }
        return leftResult;

      case '&':
        // Execute left in background, then execute right immediately
        return this.executeBackgroundCommand(cmdList.left, cmdList.right);

      default:
        throw new Error(`Unknown command list operator: ${cmdList.operator}`);
    }
  }

  // Function Implementation

  private async executeFunctionDefinition(funcDef: FunctionDefinition): Promise<ExecutionResult> {
    // Store the function definition in the context
    this.context.functions[funcDef.name] = funcDef;

    return {
      stdout: '',
      stderr: '',
      exitCode: 0,
      success: true,
    };
  }

  private async executeFunctionCall(name: string, args: string[]): Promise<ExecutionResult> {
    const funcDef = this.context.functions[name];
    if (!funcDef) {
      return {
        stdout: '',
        stderr: `${name}: function not found`,
        exitCode: 127,
        success: false,
      };
    }

    // Save current context for restoration
    const savedPositionalParams = this.context.positionalParams;
    const savedVariables = { ...this.context.variables };

    try {
      // Set up function parameters
      this.context.positionalParams = args;

      // Update expander with new context
      this.updateExpander();

      // Execute function body
      const result = await this.executeNode(funcDef.body);

      return result;
    } finally {
      // Restore original context
      this.context.positionalParams = savedPositionalParams;
      // Restore non-local variables
      for (const key in savedVariables) {
        this.context.variables[key] = savedVariables[key];
      }
      // Remove any variables that were created during function execution
      // (this is a simple implementation - real shells have more complex scoping)
      this.updateExpander();
    }
  }

  // I/O Redirection Implementation

  private async executeWithRedirections(cmd: SimpleCommand): Promise<ExecutionResult> {
    if (!cmd.redirections || cmd.redirections.length === 0) {
      // No redirections, execute normally

      // Check for function call first
      if (this.context.functions[cmd.name]) {
        const result = await this.executeFunctionCall(cmd.name, cmd.args);
        this.context.lastExitCode = result.exitCode;
        this.updateExpander();
        return result;
      }

      const builtinResult = await this.executeBuiltin(cmd.name, cmd.args);
      if (builtinResult !== null) {
        this.context.lastExitCode = builtinResult.exitCode;
        this.updateExpander();
        return builtinResult;
      }
      return this.executeExternalCommand(cmd);
    }

    // Process redirections and execute command
    return this.executeWithRedirectionHandling(cmd);
  }

  private async executeWithRedirectionHandling(cmd: SimpleCommand): Promise<ExecutionResult> {
    const fs = await import('fs');
    const originalFiles: { [fd: number]: any } = {};
    const redirectionFiles: { [fd: number]: number } = {};

    try {
      // Process each redirection
      for (const redir of cmd.redirections) {
        await this.processRedirection(redir, originalFiles, redirectionFiles, fs);
      }

      // Execute the command with redirections in place
      let result: ExecutionResult;

      // Check for function call first
      if (this.context.functions[cmd.name]) {
        // Functions don't directly support redirections in our implementation
        // We'll execute the function and handle output redirection manually
        const functionResult = await this.executeFunctionCall(cmd.name, cmd.args);
        result = await this.executeBuiltinWithRedirection(cmd.name, cmd.args, functionResult, redirectionFiles, fs);
        this.context.lastExitCode = result.exitCode;
      } else {
        const builtinResult = await this.executeBuiltin(cmd.name, cmd.args);
        if (builtinResult !== null) {
          // For built-ins, handle output redirection manually
          result = await this.executeBuiltinWithRedirection(cmd.name, cmd.args, builtinResult, redirectionFiles, fs);
          this.context.lastExitCode = result.exitCode;
        } else {
          // For external commands, redirections are handled by spawn
          result = await this.executeExternalCommandWithRedirection(cmd, redirectionFiles);
          this.context.lastExitCode = result.exitCode;
        }
      }

      return result;

    } catch (error) {
      return {
        stdout: '',
        stderr: `Redirection error: ${error.message}`,
        exitCode: 1,
        success: false,
      };
    } finally {
      // Restore original file descriptors and clean up
      this.cleanupRedirections(originalFiles, redirectionFiles, fs);
    }
  }

  private async processRedirection(
    redir: Redirection,
    originalFiles: any,
    redirectionFiles: any,
    fs: any
  ): Promise<void> {
    const target = await this.expander.expandString(redir.target);

    switch (redir.type) {
      case 'output': // >
        try {
          const fd = fs.openSync(target, 'w');
          redirectionFiles[1] = fd; // stdout
          break;
        } catch (error) {
          throw new Error(`cannot create ${target}: ${error.message}`);
        }

      case 'append': // >>
        try {
          const fd = fs.openSync(target, 'a');
          redirectionFiles[1] = fd; // stdout
          break;
        } catch (error) {
          throw new Error(`cannot create ${target}: ${error.message}`);
        }

      case 'input': // <
        try {
          if (!fs.existsSync(target)) {
            throw new Error(`${target}: No such file or directory`);
          }
          const fd = fs.openSync(target, 'r');
          redirectionFiles[0] = fd; // stdin
          break;
        } catch (error) {
          throw new Error(`cannot open ${target}: ${error.message}`);
        }

      case 'heredoc': // <<
        // Create a temporary file with the here document content
        const tmpFile = `/tmp/lsh-heredoc-${Date.now()}`;
        fs.writeFileSync(tmpFile, target); // target contains the here-doc content
        const fd = fs.openSync(tmpFile, 'r');
        redirectionFiles[0] = fd; // stdin
        // Schedule cleanup of temp file
        setTimeout(() => {
          try { fs.unlinkSync(tmpFile); } catch {}
        }, 1000);
        break;

      default:
        throw new Error(`unsupported redirection type: ${redir.type}`);
    }
  }

  private async executeBuiltinWithRedirection(
    name: string,
    args: string[],
    result: ExecutionResult,
    redirectionFiles: any,
    fs: any
  ): Promise<ExecutionResult> {
    // For built-ins, we need to manually handle output redirection
    if (redirectionFiles[1] !== undefined) {
      // Redirect stdout to file
      if (result.stdout) {
        fs.writeSync(redirectionFiles[1], result.stdout);
      }
      // Return result with empty stdout since it was redirected
      return {
        stdout: '',
        stderr: result.stderr,
        exitCode: result.exitCode,
        success: result.success,
      };
    }

    return result;
  }

  private async executeExternalCommandWithRedirection(
    cmd: SimpleCommand,
    redirectionFiles: any
  ): Promise<ExecutionResult> {
    return new Promise((resolve) => {
      const stdio: any[] = ['inherit', 'pipe', 'pipe'];

      // Configure stdio based on redirections
      if (redirectionFiles[0] !== undefined) {
        stdio[0] = redirectionFiles[0]; // stdin
      }
      if (redirectionFiles[1] !== undefined) {
        stdio[1] = redirectionFiles[1]; // stdout
      }
      if (redirectionFiles[2] !== undefined) {
        stdio[2] = redirectionFiles[2]; // stderr
      }

      const child = spawn(cmd.name, cmd.args, {
        stdio,
        cwd: this.context.cwd,
        env: { ...this.context.env, ...this.context.variables },
      });

      let stdout = '';
      let stderr = '';

      if (child.stdout && stdio[1] === 'pipe') {
        child.stdout.on('data', (data) => {
          stdout += data.toString();
        });
      }

      if (child.stderr && stdio[2] === 'pipe') {
        child.stderr.on('data', (data) => {
          stderr += data.toString();
        });
      }

      child.on('close', (code) => {
        resolve({
          stdout: stdio[1] === 'pipe' ? stdout : '', // Empty if redirected
          stderr: stdio[2] === 'pipe' ? stderr : '',
          exitCode: code || 0,
          success: (code || 0) === 0,
        });
      });

      child.on('error', (error) => {
        resolve({
          stdout: '',
          stderr: `Command failed: ${error.message}`,
          exitCode: 127,
          success: false,
        });
      });
    });
  }

  private cleanupRedirections(originalFiles: any, redirectionFiles: any, fs: any): void {
    // Close redirection files
    for (const fd of Object.values(redirectionFiles)) {
      try {
        if (typeof fd === 'number') {
          fs.closeSync(fd);
        }
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  }

  private async handleProcessSubstitution(procSubArg: string): Promise<string> {
    const os = await import('os');
    const path = await import('path');
    const fs = await import('fs');
    const { parseShellCommand } = await import('./shell-parser.js');

    // Extract direction and command from the process substitution
    const isInput = procSubArg.startsWith('<(');
    const command = procSubArg.slice(2, -1); // Remove <( or >( and )

    // Create a temporary file to simulate named pipe behavior
    const tmpDir = await fs.promises.mkdtemp(path.default.join(os.default.tmpdir(), 'lsh-procsub-'));
    const fifoPath = path.default.join(tmpDir, isInput ? 'input' : 'output');

    try {
      if (isInput) {
        // For <(command), execute command and write output to temp file
        const ast = parseShellCommand(command);
        const executor = new ShellExecutor(this.context);
        const result = await executor.execute(ast);

        // Write command output to temporary file
        await fs.promises.writeFile(fifoPath, result.stdout || '');

        return fifoPath;
      } else {
        // For >(command), create a temporary file that can be written to
        // The command will process the file content after the main command finishes
        // This is a simplified implementation - full POSIX would use actual named pipes
        await fs.promises.writeFile(fifoPath, '');

        // Store the command to execute later when the file has content
        // For now, return the file path - the command would process it post-execution
        return fifoPath;
      }
    } catch (error) {
      // Clean up on error
      try {
        await fs.promises.unlink(fifoPath);
      } catch {}
      throw new Error(`Process substitution failed: ${error.message}`);
    }
  }

  // ZSH-Style Built-in Commands

  private async builtin_typeset(args: string[]): Promise<ExecutionResult> {
    const result = this.context.arrays.parseTypesetCommand(args);
    return {
      stdout: '',
      stderr: result.message,
      exitCode: result.success ? 0 : 1,
      success: result.success,
    };
  }

  private async builtin_setopt(args: string[]): Promise<ExecutionResult> {
    const result = this.context.zshOptions.parseSetoptCommand(args);
    return {
      stdout: '',
      stderr: result.message,
      exitCode: result.success ? 0 : 1,
      success: result.success,
    };
  }

  private async builtin_unsetopt(args: string[]): Promise<ExecutionResult> {
    const result = this.context.zshOptions.parseUnsetoptCommand(args);
    return {
      stdout: '',
      stderr: result.message,
      exitCode: result.success ? 0 : 1,
      success: result.success,
    };
  }

  private async builtin_history(args: string[]): Promise<ExecutionResult> {
    if (args.length === 0) {
      // Show history
      const entries = this.context.history.getAllEntries();
      const output = entries
        .map(entry => `${entry.lineNumber.toString().padStart(4)}  ${entry.command}`)
        .join('\n');
      
      return {
        stdout: output,
        stderr: '',
        exitCode: 0,
        success: true,
      };
    }

    // Handle history options
    if (args[0] === '-c') {
      this.context.history.clearHistory();
      return {
        stdout: '',
        stderr: '',
        exitCode: 0,
        success: true,
      };
    }

    if (args[0] === '-d') {
      // Delete specific history entry
      const lineNumber = parseInt(args[1], 10);
      if (isNaN(lineNumber)) {
        return {
          stdout: '',
          stderr: 'history: invalid line number',
          exitCode: 1,
          success: false,
        };
      }
      // Implementation would delete specific entry
      return {
        stdout: '',
        stderr: '',
        exitCode: 0,
        success: true,
      };
    }

    return {
      stdout: '',
      stderr: 'history: unknown option',
      exitCode: 1,
      success: false,
    };
  }

  private async builtin_fc(args: string[]): Promise<ExecutionResult> {
    // Fix command - edit and re-execute last command
    if (args.length === 0) {
      const entries = this.context.history.getAllEntries();
      if (entries.length === 0) {
        return {
          stdout: '',
          stderr: 'fc: no history',
          exitCode: 1,
          success: false,
        };
      }
      
      const lastCommand = entries[entries.length - 1].command;
      // In a real implementation, this would open an editor
      return {
        stdout: `Would edit: ${lastCommand}`,
        stderr: '',
        exitCode: 0,
        success: true,
      };
    }

    return {
      stdout: '',
      stderr: 'fc: not fully implemented',
      exitCode: 1,
      success: false,
    };
  }

  private async builtin_r(args: string[]): Promise<ExecutionResult> {
    // Repeat last command
    const entries = this.context.history.getAllEntries();
    if (entries.length === 0) {
      return {
        stdout: '',
        stderr: 'r: no history',
        exitCode: 1,
        success: false,
      };
    }

    const lastCommand = entries[entries.length - 1].command;
    
    try {
      const { parseShellCommand } = await import('./shell-parser.js');
      const ast = parseShellCommand(lastCommand);
      return await this.execute(ast);
    } catch (error) {
      return {
        stdout: '',
        stderr: `r: ${error.message}`,
        exitCode: 1,
        success: false,
      };
    }
  }

  private async builtin_alias(args: string[]): Promise<ExecutionResult> {
    if (args.length === 0) {
      // List all aliases
      const aliases = Object.entries(this.context.variables)
        .filter(([key, value]) => key.startsWith('alias_'))
        .map(([key, value]) => `${key.substring(6)}='${value}'`)
        .join('\n');
      
      return {
        stdout: aliases,
        stderr: '',
        exitCode: 0,
        success: true,
      };
    }

    // Set alias
    const aliasStr = args.join(' ');
    const equalIndex = aliasStr.indexOf('=');
    
    if (equalIndex === -1) {
      return {
        stdout: '',
        stderr: 'alias: invalid syntax',
        exitCode: 1,
        success: false,
      };
    }

    const name = aliasStr.substring(0, equalIndex);
    const value = aliasStr.substring(equalIndex + 1);
    
    this.context.variables[`alias_${name}`] = value;
    this.updateExpander();

    return {
      stdout: '',
      stderr: '',
      exitCode: 0,
      success: true,
    };
  }

  private async builtin_unalias(args: string[]): Promise<ExecutionResult> {
    if (args.length === 0) {
      return {
        stdout: '',
        stderr: 'unalias: missing argument',
        exitCode: 1,
        success: false,
      };
    }

    for (const aliasName of args) {
      delete this.context.variables[`alias_${aliasName}`];
    }

    this.updateExpander();

    return {
      stdout: '',
      stderr: '',
      exitCode: 0,
      success: true,
    };
  }

  // Enhanced parameter expansion with ZSH features
  private async expandParameterWithZshFeatures(paramExpr: string): Promise<string> {
    // Try extended parameter expansion first
    try {
      return this.extendedExpander.expandParameter(paramExpr);
    } catch (error) {
      // Fall back to regular parameter expansion
      return this.expander.expandParameterExpression(paramExpr);
    }
  }

  // Enhanced globbing with ZSH features
  private async expandPathnamesWithZshFeatures(pattern: string): Promise<string[]> {
    // Check if extended globbing is enabled
    if (this.context.zshOptions.isOptionSet('EXTENDED_GLOB')) {
      try {
        return await this.extendedGlobber.expandPattern(pattern, {
          cwd: this.context.cwd,
          includeHidden: this.context.zshOptions.isOptionSet('GLOB_DOTS'),
          extendedGlob: true,
        });
      } catch (error) {
        // Fall back to regular globbing
      }
    }

    // Use regular pathname expansion
    return await this.pathExpander.expandPathnames(pattern, {
      cwd: this.context.cwd,
      includeHidden: this.context.zshOptions.isOptionSet('GLOB_DOTS'),
    });
  }

  // Enhanced arithmetic expansion with floating point
  private evaluateArithmeticWithFloatingPoint(expression: string): string {
    try {
      const result = this.context.floatingPoint.evaluate(expression);
      return result.toString();
    } catch (error) {
      // Fall back to integer arithmetic
      return this.expander.evaluateArithmeticExpression(expression).toString();
    }
  }


  // Get completions for current context
  public async getCompletions(command: string, args: string[], currentWord: string, wordIndex: number): Promise<string[]> {
    const context = {
      command,
      args,
      currentWord,
      wordIndex,
      cwd: this.context.cwd,
      env: this.context.env,
    };

    const candidates = await this.context.completion.getCompletions(context);
    return candidates.map(c => c.word);
  }

  // Register completion function
  public registerCompletion(command: string, func: CompletionFunction): void {
    this.context.completion.registerCompletion(command, func);
  }

  // Add command to history
  public addToHistory(command: string, exitCode?: number): void {
    this.context.history.addCommand(command, exitCode);
  }

  // Get all history entries
  public getHistoryEntries(): Array<{ command: string; timestamp: number; exitCode?: number }> {
    return this.context.history.getAllEntries();
  }

  // Set positional parameters
  public setPositionalParams(params: string[]): void {
    this.context.positionalParams = params;
  }

  // Get ZSH compatibility instance
  public getZshCompatibility(): any {
    return this.context.zshCompatibility;
  }

  // Get current prompt
  public getPrompt(): string {
    return this.context.prompt.getCurrentPrompt({
      user: process.env.USER || 'user',
      host: process.env.HOSTNAME || 'localhost',
      cwd: this.context.cwd,
      home: process.env.HOME || '/',
      exitCode: this.context.lastExitCode,
      jobCount: this.context.jobControl.jobs.size,
      time: new Date(),
    });
  }

  // Get current right prompt
  public getRPrompt(): string {
    return this.context.prompt.getCurrentRPrompt({
      user: process.env.USER || 'user',
      host: process.env.HOSTNAME || 'localhost',
      cwd: this.context.cwd,
      home: process.env.HOME || '/',
      exitCode: this.context.lastExitCode,
      jobCount: this.context.jobControl.jobs.size,
      time: new Date(),
    });
  }

  // ZSH Compatibility Built-in Commands

  private async builtin_source(args: string[]): Promise<ExecutionResult> {
    if (args.length === 0) {
      return {
        stdout: '',
        stderr: 'source: missing filename',
        exitCode: 1,
        success: false,
      };
    }

    const filename = args[0];
    
    try {
      const fs = await import('fs');
      const content = fs.readFileSync(filename, 'utf8');
      const lines = content.split('\n');

      for (const line of lines) {
        const trimmed = line.trim();
        
        if (trimmed.startsWith('#') || trimmed === '') {
          continue;
        }

        try {
          const ast = parseShellCommand(trimmed);
          await this.execute(ast);
        } catch (error) {
          console.error(`Error in ${filename}: ${error.message}`);
        }
      }

      return {
        stdout: '',
        stderr: '',
        exitCode: 0,
        success: true,
      };
    } catch (error) {
      return {
        stdout: '',
        stderr: `source: ${filename}: ${error.message}`,
        exitCode: 1,
        success: false,
      };
    }
  }

  private async builtin_install(args: string[]): Promise<ExecutionResult> {
    if (args.length === 0) {
      return {
        stdout: '',
        stderr: 'install: missing package name',
        exitCode: 1,
        success: false,
      };
    }

    const packageName = args[0];
    const result = await this.context.zshCompatibility.installPackage(packageName);

    return {
      stdout: result.message,
      stderr: '',
      exitCode: result.success ? 0 : 1,
      success: result.success,
    };
  }

  private async builtin_uninstall(args: string[]): Promise<ExecutionResult> {
    if (args.length === 0) {
      return {
        stdout: '',
        stderr: 'uninstall: missing package name',
        exitCode: 1,
        success: false,
      };
    }

    const packageName = args[0];
    const result = await this.context.zshCompatibility.uninstallPackage(packageName);

    return {
      stdout: result.message,
      stderr: '',
      exitCode: result.success ? 0 : 1,
      success: result.success,
    };
  }

  private async builtin_zsh_migrate(args: string[]): Promise<ExecutionResult> {
    const result = await this.context.zshCompatibility.migrateZshConfig();

    return {
      stdout: result.message,
      stderr: '',
      exitCode: result.success ? 0 : 1,
      success: result.success,
    };
  }

  private async builtin_zsh_source(args: string[]): Promise<ExecutionResult> {
    const result = await this.context.zshCompatibility.sourceZshConfig();

    return {
      stdout: result.message,
      stderr: '',
      exitCode: result.success ? 0 : 1,
      success: result.success,
    };
  }
}