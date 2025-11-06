/**
 * ZSH Compatibility Layer
 * Provides compatibility with ZSH configurations and completions
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ShellExecutor } from './shell-executor.js';
import { parseShellCommand } from './shell-parser.js';
import { ZshImportManager, ZshImportOptions } from './zsh-import-manager.js';

export interface ZshCompatibilityOptions {
  sourceZshrc: boolean;
  zshrcPath?: string;
  respectZshCompletions: boolean;
  zshCompletionsPath?: string;
  installPackages: boolean;
  packageManager?: 'npm' | 'yarn' | 'pnpm' | 'brew' | 'apt' | 'yum';
  importOptions?: ZshImportOptions;
}

export class ZshCompatibility {
  private executor: ShellExecutor;
  private options: ZshCompatibilityOptions;
  private importManager: ZshImportManager;

  constructor(executor: ShellExecutor, options: Partial<ZshCompatibilityOptions> = {}) {
    this.executor = executor;
    this.options = {
      sourceZshrc: true,
      zshrcPath: path.join(os.homedir(), '.zshrc'),
      respectZshCompletions: true,
      zshCompletionsPath: path.join(os.homedir(), '.zsh/completions'),
      installPackages: true,
      packageManager: 'npm',
      ...options,
    };

    // Initialize import manager with options
    this.importManager = new ZshImportManager(executor, this.options.importOptions);
  }

  /**
   * Source ZSH configuration files (enhanced version)
   */
  public async sourceZshConfig(): Promise<{ success: boolean; message: string }> {
    const result = await this.importManager.importZshConfig(this.options.zshrcPath);
    return {
      success: result.success,
      message: result.message,
    };
  }

  /**
   * Source ZSH configuration files (legacy method for backward compatibility)
   */
  public async sourceZshConfigLegacy(): Promise<{ success: boolean; message: string }> {
    try {
      // Check if .zshrc exists
      if (!fs.existsSync(this.options.zshrcPath!)) {
        return {
          success: false,
          message: `ZSH configuration not found: ${this.options.zshrcPath}`,
        };
      }

      // Read and parse .zshrc
      const zshrcContent = fs.readFileSync(this.options.zshrcPath!, 'utf8');
      const parsedConfig = this.parseZshrc(zshrcContent);

      // Apply compatible configurations
      await this.applyZshConfig(parsedConfig);

      return {
        success: true,
        message: `Successfully sourced ZSH configuration from ${this.options.zshrcPath}`,
      };
    } catch (error) {
      return {
        success: false,
        message: `Error sourcing ZSH config: ${error.message}`,
      };
    }
  }

  /**
   * Parse .zshrc content and extract compatible configurations
   */
  private parseZshrc(content: string): {
    aliases: Array<{ name: string; value: string }>;
    functions: Array<{ name: string; body: string }>;
    exports: Array<{ name: string; value: string }>;
    setopts: Array<{ option: string; enabled: boolean }>;
    completions: Array<string>;
    plugins: Array<string>;
  } {
    const lines = content.split('\n');
    const config: {
      aliases: Array<{ name: string; value: string }>;
      functions: Array<{ name: string; body: string }>;
      exports: Array<{ name: string; value: string }>;
      setopts: Array<{ option: string; enabled: boolean }>;
      completions: Array<string>;
      plugins: Array<string>;
    } = {
      aliases: [],
      functions: [],
      exports: [],
      setopts: [],
      completions: [],
      plugins: [],
    };

    let inFunction = false;
    let currentFunction = '';
    let functionBody = '';

    for (const line of lines) {
      const trimmed = line.trim();

      // Skip comments and empty lines
      if (trimmed.startsWith('#') || trimmed === '') {
        continue;
      }

      // Handle function definitions
      if (trimmed.match(/^[a-zA-Z_][a-zA-Z0-9_]*\s*\(\)\s*\{/)) {
        inFunction = true;
        currentFunction = trimmed.split('(')[0].trim();
        functionBody = trimmed;
        continue;
      }

      if (inFunction) {
        functionBody += '\n' + line;
        if (trimmed === '}' || trimmed.endsWith('}')) {
          inFunction = false;
          config.functions.push({
            name: currentFunction,
            body: functionBody,
          });
          currentFunction = '';
          functionBody = '';
        }
        continue;
      }

      // Parse aliases
      const aliasMatch = trimmed.match(/^alias\s+([^=]+)=(.+)$/);
      if (aliasMatch) {
        config.aliases.push({
          name: aliasMatch[1],
          value: aliasMatch[2].replace(/^['"]|['"]$/g, ''), // Remove quotes
        });
        continue;
      }

      // Parse exports
      const exportMatch = trimmed.match(/^export\s+([^=]+)=(.+)$/);
      if (exportMatch) {
        config.exports.push({
          name: exportMatch[1],
          value: exportMatch[2].replace(/^['"]|['"]$/g, ''), // Remove quotes
        });
        continue;
      }

      // Parse setopt
      const setoptMatch = trimmed.match(/^setopt\s+(.+)$/);
      if (setoptMatch) {
        const options = setoptMatch[1].split(/\s+/);
        for (const option of options) {
          config.setopts.push({
            option: option.trim(),
            enabled: true,
          });
        }
        continue;
      }

      // Parse unsetopt
      const unsetoptMatch = trimmed.match(/^unsetopt\s+(.+)$/);
      if (unsetoptMatch) {
        const options = unsetoptMatch[1].split(/\s+/);
        for (const option of options) {
          config.setopts.push({
            option: option.trim(),
            enabled: false,
          });
        }
        continue;
      }

      // Parse completions
      if (trimmed.includes('compinit') || trimmed.includes('autoload')) {
        config.completions.push(trimmed);
        continue;
      }

      // Parse plugins (Oh My Zsh, etc.)
      if (trimmed.includes('plugins=') || trimmed.includes('plugin=')) {
        const pluginMatch = trimmed.match(/plugins?=['"]([^'"]+)['"]/);
        if (pluginMatch) {
          const plugins = pluginMatch[1].split(/\s+/);
          config.plugins.push(...plugins);
        }
        continue;
      }
    }

    return config;
  }

  /**
   * Apply parsed ZSH configuration to LSH
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async applyZshConfig(config: any): Promise<void> {
    // Apply aliases
    for (const alias of config.aliases) {
      try {
        const ast = parseShellCommand(`alias ${alias.name}="${alias.value}"`);
        await this.executor.execute(ast);
      } catch (error) {
        console.error(`Failed to apply alias ${alias.name}: ${error.message}`);
      }
    }

    // Apply exports
    for (const export_ of config.exports) {
      try {
        const ast = parseShellCommand(`export ${export_.name}="${export_.value}"`);
        await this.executor.execute(ast);
      } catch (error) {
        console.error(`Failed to apply export ${export_.name}: ${error.message}`);
      }
    }

    // Apply setopts
    for (const setopt of config.setopts) {
      try {
        const command = setopt.enabled ? 'setopt' : 'unsetopt';
        const ast = parseShellCommand(`${command} ${setopt.option}`);
        await this.executor.execute(ast);
      } catch (error) {
        console.error(`Failed to apply setopt ${setopt.option}: ${error.message}`);
      }
    }

    // Apply functions
    for (const func of config.functions) {
      try {
        const ast = parseShellCommand(func.body);
        await this.executor.execute(ast);
      } catch (error) {
        console.error(`Failed to apply function ${func.name}: ${error.message}`);
      }
    }

    // Load ZSH completions
    if (this.options.respectZshCompletions) {
      await this.loadZshCompletions(config.completions);
    }
  }

  /**
   * Load ZSH completions
   */
  private async loadZshCompletions(_completionConfigs: string[]): Promise<void> {
    // Common ZSH completion paths
    const completionPaths = [
      path.join(os.homedir(), '.zsh/completions'),
      path.join(os.homedir(), '.oh-my-zsh/completions'),
      '/usr/local/share/zsh/site-functions',
      '/usr/share/zsh/site-functions',
      '/usr/share/zsh/functions',
    ];

    for (const completionPath of completionPaths) {
      if (fs.existsSync(completionPath)) {
        await this.loadCompletionsFromPath(completionPath);
      }
    }

    // Load Oh My Zsh completions
    const ohMyZshPath = path.join(os.homedir(), '.oh-my-zsh');
    if (fs.existsSync(ohMyZshPath)) {
      await this.loadOhMyZshCompletions(ohMyZshPath);
    }
  }

  /**
   * Load completions from a specific path
   */
  private async loadCompletionsFromPath(completionPath: string): Promise<void> {
    try {
      const files = fs.readdirSync(completionPath);
      
      for (const file of files) {
        if (file.endsWith('.zsh') || file.endsWith('_completion')) {
          const filePath = path.join(completionPath, file);
          const content = fs.readFileSync(filePath, 'utf8');
          
          // Parse completion file and register completions
          await this.parseCompletionFile(content, file);
        }
      }
    } catch (error) {
      console.error(`Error loading completions from ${completionPath}: ${error.message}`);
    }
  }

  /**
   * Load Oh My Zsh completions
   */
  private async loadOhMyZshCompletions(ohMyZshPath: string): Promise<void> {
    const pluginsPath = path.join(ohMyZshPath, 'plugins');
    const customPath = path.join(ohMyZshPath, 'custom');

    // Load plugin completions
    if (fs.existsSync(pluginsPath)) {
      const plugins = fs.readdirSync(pluginsPath);
      
      for (const plugin of plugins) {
        const pluginPath = path.join(pluginsPath, plugin);
        const completionPath = path.join(pluginPath, '_' + plugin);
        
        if (fs.existsSync(completionPath)) {
          await this.loadCompletionsFromPath(completionPath);
        }
      }
    }

    // Load custom completions
    if (fs.existsSync(customPath)) {
      await this.loadCompletionsFromPath(customPath);
    }
  }

  /**
   * Parse completion file and register with LSH completion system
   */
  private async parseCompletionFile(content: string, filename: string): Promise<void> {
    try {
      // Extract command name from filename
      const commandName = filename.replace(/^_/, '').replace(/\.zsh$/, '');
      
      // Parse completion patterns
      const patterns = this.extractCompletionPatterns(content);
      
      // Register completion function
      if (patterns.length > 0) {
        this.executor.registerCompletion(commandName, async (context) => {
          return this.generateCompletions(context, patterns);
        });
      }
    } catch (error) {
      console.error(`Error parsing completion file ${filename}: ${error.message}`);
    }
  }

  /**
   * Extract completion patterns from ZSH completion file
   */
  private extractCompletionPatterns(content: string): Array<{
    type: 'files' | 'directories' | 'commands' | 'options' | 'custom';
    pattern: string;
  }> {
    const patterns: Array<{ type: 'files' | 'directories' | 'commands' | 'options' | 'custom'; pattern: string }> = [];

    // Look for common completion patterns
    const filePatterns = content.match(/compadd.*-f/g);
    if (filePatterns) {
      patterns.push({ type: 'files', pattern: '*' });
    }

    const dirPatterns = content.match(/compadd.*-d/g);
    if (dirPatterns) {
      patterns.push({ type: 'directories', pattern: '*/' });
    }

    const commandPatterns = content.match(/compadd.*-c/g);
    if (commandPatterns) {
      patterns.push({ type: 'commands', pattern: 'command' });
    }

    // Look for specific option patterns
    const optionMatches = content.match(/--[a-zA-Z-]+/g);
    if (optionMatches) {
      for (const option of optionMatches) {
        patterns.push({ type: 'options', pattern: option });
      }
    }

    return patterns;
  }

  /**
   * Generate completions based on patterns
   */
   
  private async generateCompletions(
    context: any,
    patterns: Array<{ type: string; pattern: string }>
  ): Promise<Array<{ word: string; description?: string; type?: 'file' | 'directory' | 'command' | 'variable' | 'function' | 'option' }>> {
    const completions: Array<{ word: string; description?: string; type?: 'file' | 'directory' | 'command' | 'variable' | 'function' | 'option' }> = [];

    for (const pattern of patterns) {
      switch (pattern.type) {
        case 'files':
          // Generate file completions
          try {
            const files = fs.readdirSync(context.cwd);
            for (const file of files) {
              completions.push({
                word: file,
                type: 'file',
                description: 'File',
              });
            }
          } catch (_error) {
            // Ignore directory read errors
          }
          break;

        case 'directories':
          // Generate directory completions
          try {
            const files = fs.readdirSync(context.cwd, { withFileTypes: true });
            for (const file of files) {
              if (file.isDirectory()) {
                completions.push({
                  word: file.name + '/',
                  type: 'directory',
                  description: 'Directory',
                });
              }
            }
          } catch (_error) {
            // Ignore directory read errors
          }
          break;

        case 'commands': {
          // Generate command completions
          const pathDirs = (context.env.PATH || '').split(':');
          for (const dir of pathDirs) {
            try {
              const files = fs.readdirSync(dir);
              for (const file of files) {
                if (fs.statSync(path.join(dir, file)).isFile()) {
                  completions.push({
                    word: file,
                    type: 'command',
                    description: `Command in ${dir}`,
                  });
                }
              }
            } catch (_error) {
              // Ignore directory read errors
            }
          }
          break;
        }

        case 'options':
          // Add specific option
          completions.push({
            word: pattern.pattern,
            type: 'option',
            description: 'Option',
          });
          break;
      }
    }

    return completions;
  }

  /**
   * Install packages using package manager
   */
  public async installPackage(packageName: string): Promise<{ success: boolean; message: string }> {
    if (!this.options.installPackages) {
      return {
        success: false,
        message: 'Package installation is disabled',
      };
    }

    try {
      const { spawn } = await import('child_process');
      
      let command: string;
      let args: string[];

      switch (this.options.packageManager) {
        case 'npm':
          command = 'npm';
          args = ['install', '-g', packageName];
          break;
        case 'yarn':
          command = 'yarn';
          args = ['global', 'add', packageName];
          break;
        case 'pnpm':
          command = 'pnpm';
          args = ['add', '-g', packageName];
          break;
        case 'brew':
          command = 'brew';
          args = ['install', packageName];
          break;
        case 'apt':
          command = 'sudo';
          args = ['apt', 'install', packageName];
          break;
        case 'yum':
          command = 'sudo';
          args = ['yum', 'install', packageName];
          break;
        default:
          return {
            success: false,
            message: `Unsupported package manager: ${this.options.packageManager}`,
          };
      }

      return new Promise((resolve) => {
        const child = spawn(command, args, {
          stdio: ['pipe', 'pipe', 'pipe'],
        });

        let _stdout = '';
        let stderr = '';

        child.stdout?.on('data', (data) => {
          _stdout += data.toString();
        });

        child.stderr?.on('data', (data) => {
          stderr += data.toString();
        });

        child.on('close', (code) => {
          if (code === 0) {
            resolve({
              success: true,
              message: `Successfully installed ${packageName}`,
            });
          } else {
            resolve({
              success: false,
              message: `Failed to install ${packageName}: ${stderr}`,
            });
          }
        });

        child.on('error', (error) => {
          resolve({
            success: false,
            message: `Error installing ${packageName}: ${error.message}`,
          });
        });
      });
    } catch (error) {
      return {
        success: false,
        message: `Error installing ${packageName}: ${error.message}`,
      };
    }
  }

  /**
   * Uninstall packages using package manager
   */
  public async uninstallPackage(packageName: string): Promise<{ success: boolean; message: string }> {
    if (!this.options.installPackages) {
      return {
        success: false,
        message: 'Package uninstallation is disabled',
      };
    }

    try {
      const { spawn } = await import('child_process');
      
      let command: string;
      let args: string[];

      switch (this.options.packageManager) {
        case 'npm':
          command = 'npm';
          args = ['uninstall', '-g', packageName];
          break;
        case 'yarn':
          command = 'yarn';
          args = ['global', 'remove', packageName];
          break;
        case 'pnpm':
          command = 'pnpm';
          args = ['remove', '-g', packageName];
          break;
        case 'brew':
          command = 'brew';
          args = ['uninstall', packageName];
          break;
        case 'apt':
          command = 'sudo';
          args = ['apt', 'remove', packageName];
          break;
        case 'yum':
          command = 'sudo';
          args = ['yum', 'remove', packageName];
          break;
        default:
          return {
            success: false,
            message: `Unsupported package manager: ${this.options.packageManager}`,
          };
      }

      return new Promise((resolve) => {
        const child = spawn(command, args, {
          stdio: ['pipe', 'pipe', 'pipe'],
        });

        let _stdout = '';
        let stderr = '';

        child.stdout?.on('data', (data) => {
          _stdout += data.toString();
        });

        child.stderr?.on('data', (data) => {
          stderr += data.toString();
        });

        child.on('close', (code) => {
          if (code === 0) {
            resolve({
              success: true,
              message: `Successfully uninstalled ${packageName}`,
            });
          } else {
            resolve({
              success: false,
              message: `Failed to uninstall ${packageName}: ${stderr}`,
            });
          }
        });

        child.on('error', (error) => {
          resolve({
            success: false,
            message: `Error uninstalling ${packageName}: ${error.message}`,
          });
        });
      });
    } catch (error) {
      return {
        success: false,
        message: `Error uninstalling ${packageName}: ${error.message}`,
      };
    }
  }

  /**
   * Check if ZSH is available and get version
   */
  public async checkZshAvailability(): Promise<{ available: boolean; version?: string; path?: string }> {
    try {
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);

      const { stdout } = await execAsync('zsh --version');
      const versionMatch = stdout.match(/zsh\s+([0-9.]+)/);
      
      return {
        available: true,
        version: versionMatch ? versionMatch[1] : 'unknown',
        path: '/bin/zsh', // This could be enhanced to find actual path
      };
    } catch (_error) {
      return {
        available: false,
      };
    }
  }

  /**
   * Migrate ZSH configuration to LSH
   */
  public async migrateZshConfig(): Promise<{ success: boolean; message: string }> {
    try {
      const zshrcPath = this.options.zshrcPath!;
      const lshrcPath = path.join(os.homedir(), '.lshrc');

      if (!fs.existsSync(zshrcPath)) {
        return {
          success: false,
          message: 'No ZSH configuration found to migrate',
        };
      }

      // Read ZSH config
      const zshrcContent = fs.readFileSync(zshrcPath, 'utf8');
      
      // Convert to LSH format
      const lshrcContent = this.convertZshToLsh(zshrcContent);
      
      // Write LSH config
      fs.writeFileSync(lshrcPath, lshrcContent, 'utf8');
      
      return {
        success: true,
        message: `Successfully migrated ZSH configuration to ${lshrcPath}`,
      };
    } catch (error) {
      return {
        success: false,
        message: `Migration failed: ${error.message}`,
      };
    }
  }

  /**
   * Convert ZSH configuration to LSH format
   */
  private convertZshToLsh(zshContent: string): string {
    let lshContent = '# LSH Configuration (migrated from ZSH)\n';
    lshContent += '# This file was automatically generated from ~/.zshrc\n\n';
    
    const lines = zshContent.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Skip comments and empty lines
      if (trimmed.startsWith('#') || trimmed === '') {
        lshContent += line + '\n';
        continue;
      }
      
      // Convert ZSH-specific syntax to LSH
      let convertedLine = line;
      
      // Convert ZSH-specific functions to LSH format
      if (trimmed.includes('autoload') && trimmed.includes('compinit')) {
        convertedLine = '# ' + line + ' # Converted to LSH completion system';
      }
      
      // Convert Oh My Zsh specific syntax
      if (trimmed.includes('ZSH_THEME=')) {
        convertedLine = '# ' + line + ' # Use LSH prompt themes instead';
      }
      
      lshContent += convertedLine + '\n';
    }
    
    return lshContent;
  }
}

export default ZshCompatibility;