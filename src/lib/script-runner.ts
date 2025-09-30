/**
 * Shell Script Runner
 * Executes shell scripts with LSH
 */

import { ShellExecutor } from './shell-executor.js';
import { parseShellCommand } from './shell-parser.js';
import * as fs from 'fs';
import * as _path from 'path';

export interface ScriptExecutionOptions {
  cwd?: string;
  env?: Record<string, string>;
  args?: string[];
  interactive?: boolean;
  verbose?: boolean;
}

export class ScriptRunner {
  private executor: ShellExecutor;

  constructor(options?: ScriptExecutionOptions) {
    this.executor = new ShellExecutor({
      cwd: options?.cwd || process.cwd(),
      env: { ...process.env, ...options?.env },
    });
  }

  /**
   * Execute a shell script file
   */
  public async executeScript(
    scriptPath: string,
    options: ScriptExecutionOptions = {}
  ): Promise<{ success: boolean; exitCode: number; output: string; errors: string }> {
    try {
      // Read script file
      const scriptContent = fs.readFileSync(scriptPath, 'utf8');
      
      // Set up script context
      if (options.args) {
        this.executor.setPositionalParams(options.args);
      }
      
      // Parse and execute script
      const ast = parseShellCommand(scriptContent);
      const result = await this.executor.execute(ast);
      
      return {
        success: result.success,
        exitCode: result.exitCode,
        output: result.stdout,
        errors: result.stderr,
      };
    } catch (error) {
      return {
        success: false,
        exitCode: 1,
        output: '',
        errors: `Script execution failed: ${error.message}`,
      };
    }
  }

  /**
   * Execute shell commands from string
   */
  public async executeCommands(
    commands: string,
    options: ScriptExecutionOptions = {}
  ): Promise<{ success: boolean; exitCode: number; output: string; errors: string }> {
    try {
      // Set up context
      if (options.args) {
        this.executor.setPositionalParams(options.args);
      }
      
      // Parse and execute commands
      const ast = parseShellCommand(commands);
      const result = await this.executor.execute(ast);
      
      return {
        success: result.success,
        exitCode: result.exitCode,
        output: result.stdout,
        errors: result.stderr,
      };
    } catch (error) {
      return {
        success: false,
        exitCode: 1,
        output: '',
        errors: `Command execution failed: ${error.message}`,
      };
    }
  }

  /**
   * Execute script with shebang detection
   */
  public async executeWithShebang(
    scriptPath: string,
    options: ScriptExecutionOptions = {}
  ): Promise<{ success: boolean; exitCode: number; output: string; errors: string }> {
    try {
      const scriptContent = fs.readFileSync(scriptPath, 'utf8');
      
      // Check for shebang
      const lines = scriptContent.split('\n');
      const firstLine = lines[0];
      
      if (firstLine.startsWith('#!')) {
        const interpreter = firstLine.substring(2).trim();
        
        // Handle different interpreters
        if (interpreter.includes('sh') || interpreter.includes('bash') || interpreter.includes('zsh')) {
          // Execute as shell script
          return await this.executeScript(scriptPath, options);
        } else {
          // For other interpreters, delegate to system
          return await this.executeSystemScript(scriptPath, options);
        }
      } else {
        // No shebang, execute as shell script
        return await this.executeScript(scriptPath, options);
      }
    } catch (error) {
      return {
        success: false,
        exitCode: 1,
        output: '',
        errors: `Script execution failed: ${error.message}`,
      };
    }
  }

  /**
   * Execute system script (fallback)
   */
  private async executeSystemScript(
    scriptPath: string,
    options: ScriptExecutionOptions
  ): Promise<{ success: boolean; exitCode: number; output: string; errors: string }> {
    const { spawn } = await import('child_process');
    
    return new Promise((resolve) => {
      const child = spawn('sh', [scriptPath], {
        cwd: options.cwd || process.cwd(),
        env: { ...process.env, ...options.env },
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
        resolve({
          success: code === 0,
          exitCode: code || 0,
          output: stdout,
          errors: stderr,
        });
      });
      
      child.on('error', (error) => {
        resolve({
          success: false,
          exitCode: 1,
          output: '',
          errors: error.message,
        });
      });
    });
  }

  /**
   * Validate shell script syntax
   */
  public validateScript(scriptPath: string): { valid: boolean; errors: string[] } {
    try {
      const scriptContent = fs.readFileSync(scriptPath, 'utf8');
      const _ast = parseShellCommand(scriptContent);
      
      // Basic validation - if parsing succeeds, syntax is valid
      return { valid: true, errors: [] };
    } catch (error) {
      return { valid: false, errors: [error.message] };
    }
  }

  /**
   * Get script information
   */
  public getScriptInfo(scriptPath: string): {
    exists: boolean;
    executable: boolean;
    size: number;
    shebang?: string;
    interpreter?: string;
  } {
    try {
      const stats = fs.statSync(scriptPath);
      const content = fs.readFileSync(scriptPath, 'utf8');
      const firstLine = content.split('\n')[0];
      
      let shebang: string | undefined;
      let interpreter: string | undefined;
      
      if (firstLine.startsWith('#!')) {
        shebang = firstLine;
        interpreter = firstLine.substring(2).trim();
      }
      
      return {
        exists: true,
        executable: stats.mode & 0o111 ? true : false,
        size: stats.size,
        shebang,
        interpreter,
      };
    } catch {
      return {
        exists: false,
        executable: false,
        size: 0,
      };
    }
  }

  /**
   * Make script executable
   */
  public makeExecutable(scriptPath: string): boolean {
    try {
      const stats = fs.statSync(scriptPath);
      fs.chmodSync(scriptPath, stats.mode | 0o111);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Create a simple shell script
   */
  public createScript(
    scriptPath: string,
    content: string,
    makeExecutable: boolean = true
  ): boolean {
    try {
      // Add shebang if not present
      if (!content.startsWith('#!')) {
        content = '#!/bin/sh\n' + content;
      }
      
      fs.writeFileSync(scriptPath, content, 'utf8');
      
      if (makeExecutable) {
        this.makeExecutable(scriptPath);
      }
      
      return true;
    } catch {
      return false;
    }
  }
}

export default ScriptRunner;