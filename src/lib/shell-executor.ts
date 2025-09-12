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
  Redirection 
} from './shell-parser.js';

const execAsync = promisify(exec);

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

export class ShellExecutor {
  private context: ShellContext;
  
  constructor(initialContext?: Partial<ShellContext>) {
    this.context = {
      env: { ...process.env },
      cwd: process.cwd(),
      variables: {},
      lastExitCode: 0,
      ...initialContext,
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
    switch (node.type) {
      case 'SimpleCommand':
        return this.executeSimpleCommand(node as SimpleCommand);
      case 'Pipeline':
        return this.executePipeline(node as Pipeline);
      case 'CommandList':
        return this.executeCommandList(node as CommandList);
      case 'Subshell':
        return this.executeSubshell(node as Subshell);
      default:
        throw new Error(`Unknown AST node type: ${node.type}`);
    }
  }
  
  private async executeSimpleCommand(cmd: SimpleCommand): Promise<ExecutionResult> {
    if (!cmd.name) {
      return { stdout: '', stderr: '', exitCode: 0, success: true };
    }
    
    // Check for built-in commands first
    const builtinResult = await this.executeBuiltin(cmd.name, cmd.args);
    if (builtinResult !== null) {
      this.context.lastExitCode = builtinResult.exitCode;
      return builtinResult;
    }
    
    // Execute external command
    return this.executeExternalCommand(cmd);
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
    
    return { stdout: '', stderr: '', exitCode: 0, success: true };
  }
  
  private async builtin_unset(args: string[]): Promise<ExecutionResult> {
    for (const name of args) {
      delete this.context.variables[name];
      delete this.context.env[name];
    }
    
    return { stdout: '', stderr: '', exitCode: 0, success: true };
  }
  
  private async builtin_set(args: string[]): Promise<ExecutionResult> {
    // Basic implementation - just show variables if no args
    if (args.length === 0) {
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
    
    // TODO: Handle set options like -e, -u, etc.
    return { stdout: '', stderr: '', exitCode: 0, success: true };
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
  
  private async executeCommandList(cmdList: CommandList): Promise<ExecutionResult> {
    const leftResult = await this.executeNode(cmdList.left);
    
    switch (cmdList.operator) {
      case ';':
        // Always execute right command
        if (cmdList.right) {
          return this.executeNode(cmdList.right);
        }
        return leftResult;
        
      case '&&':
        // Execute right only if left succeeded
        if (leftResult.success && cmdList.right) {
          return this.executeNode(cmdList.right);
        }
        return leftResult;
        
      case '||':
        // Execute right only if left failed
        if (!leftResult.success && cmdList.right) {
          return this.executeNode(cmdList.right);
        }
        return leftResult;
        
      case '&':
        // Background execution - for now just execute normally
        // TODO: Implement proper background job control
        if (cmdList.right) {
          return this.executeNode(cmdList.right);
        }
        return leftResult;
        
      default:
        throw new Error(`Unknown command list operator: ${cmdList.operator}`);
    }
  }
  
  private async executeSubshell(subshell: Subshell): Promise<ExecutionResult> {
    // Create a new executor with copied context for subshell
    const subExecutor = new ShellExecutor(this.context);
    return subExecutor.executeNode(subshell.command);
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
      default:
        return '';
    }
  }
}