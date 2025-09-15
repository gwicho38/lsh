/**
 * Tab Completion System Implementation
 * Provides ZSH-compatible completion functionality
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface CompletionCandidate {
  word: string;
  description?: string;
  type?: 'file' | 'directory' | 'command' | 'variable' | 'function' | 'option';
}

export interface CompletionContext {
  command: string;
  args: string[];
  currentWord: string;
  wordIndex: number;
  cwd: string;
  env: Record<string, string>;
}

export interface CompletionFunction {
  (context: CompletionContext): Promise<CompletionCandidate[]>;
}

export class CompletionSystem {
  private completionFunctions: Map<string, CompletionFunction> = new Map();
  private defaultCompletions: CompletionFunction[] = [];
  private isEnabled: boolean = true;

  constructor() {
    this.setupDefaultCompletions();
  }

  /**
   * Register a completion function for a specific command
   */
  public registerCompletion(command: string, func: CompletionFunction): void {
    this.completionFunctions.set(command, func);
  }

  /**
   * Register a default completion function
   */
  public registerDefaultCompletion(func: CompletionFunction): void {
    this.defaultCompletions.push(func);
  }

  /**
   * Get completions for the current context
   */
  public async getCompletions(context: CompletionContext): Promise<CompletionCandidate[]> {
    if (!this.isEnabled) return [];

    const candidates: CompletionCandidate[] = [];

    // Try command-specific completion first
    const commandFunc = this.completionFunctions.get(context.command);
    if (commandFunc) {
      try {
        const commandCompletions = await commandFunc(context);
        candidates.push(...commandCompletions);
      } catch (error) {
        // Continue with default completions if command-specific fails
      }
    }

    // If no command-specific completions, try default completions
    if (candidates.length === 0) {
      for (const defaultFunc of this.defaultCompletions) {
        try {
          const defaultCompletions = await defaultFunc(context);
          candidates.push(...defaultCompletions);
        } catch (error) {
          // Continue with other default completions
        }
      }
    }

    // Filter and sort candidates
    return this.filterAndSortCandidates(candidates, context.currentWord);
  }

  /**
   * Enable/disable completion
   */
  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  /**
   * Setup default completion functions
   */
  private setupDefaultCompletions(): void {
    // File and directory completion
    this.registerDefaultCompletion(async (context) => {
      return this.completeFilesAndDirectories(context);
    });

    // Command completion
    this.registerDefaultCompletion(async (context) => {
      if (context.wordIndex === 0) {
        return this.completeCommands(context);
      }
      return [];
    });

    // Variable completion
    this.registerDefaultCompletion(async (context) => {
      if (context.currentWord.startsWith('$')) {
        return this.completeVariables(context);
      }
      return [];
    });

    // Built-in command completions
    this.setupBuiltinCompletions();
  }

  /**
   * Complete files and directories
   */
  private async completeFilesAndDirectories(context: CompletionContext): Promise<CompletionCandidate[]> {
    const candidates: CompletionCandidate[] = [];
    const currentWord = context.currentWord;
    
    // Determine search directory
    let searchDir = context.cwd;
    let pattern = currentWord;
    
    if (currentWord.includes('/')) {
      const lastSlash = currentWord.lastIndexOf('/');
      searchDir = path.resolve(context.cwd, currentWord.substring(0, lastSlash + 1));
      pattern = currentWord.substring(lastSlash + 1);
    }

    try {
      const entries = await fs.promises.readdir(searchDir, { withFileTypes: true });
      
      for (const entry of entries) {
        // Skip hidden files unless explicitly requested
        if (!pattern.startsWith('.') && entry.name.startsWith('.')) {
          continue;
        }

        // Check if entry matches pattern
        if (this.matchesPattern(entry.name, pattern)) {
          const fullPath = path.join(searchDir, entry.name);
          const relativePath = path.relative(context.cwd, fullPath);
          
          candidates.push({
            word: entry.isDirectory() ? relativePath + '/' : relativePath,
            type: entry.isDirectory() ? 'directory' : 'file',
            description: entry.isDirectory() ? 'Directory' : 'File',
          });
        }
      }
    } catch (error) {
      // Directory doesn't exist or not readable
    }

    return candidates;
  }

  /**
   * Complete commands from PATH
   */
  private async completeCommands(context: CompletionContext): Promise<CompletionCandidate[]> {
    const candidates: CompletionCandidate[] = [];
    const pattern = context.currentWord;
    const pathDirs = (context.env.PATH || '').split(':').filter(dir => dir);

    // Add built-in commands
    const builtins = [
      'cd', 'pwd', 'echo', 'printf', 'test', '[', 'export', 'unset', 'set',
      'eval', 'exec', 'return', 'shift', 'local', 'jobs', 'fg', 'bg', 'wait',
      'read', 'getopts', 'trap', 'true', 'false', 'exit'
    ];

    for (const builtin of builtins) {
      if (this.matchesPattern(builtin, pattern)) {
        candidates.push({
          word: builtin,
          type: 'command',
          description: 'Built-in command',
        });
      }
    }

    // Search PATH for executables
    for (const dir of pathDirs) {
      try {
        const entries = await fs.promises.readdir(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          if (entry.isFile() && this.isExecutable(path.join(dir, entry.name))) {
            if (this.matchesPattern(entry.name, pattern)) {
              candidates.push({
                word: entry.name,
                type: 'command',
                description: `Command in ${dir}`,
              });
            }
          }
        }
      } catch (error) {
        // Directory doesn't exist or not readable
      }
    }

    return candidates;
  }

  /**
   * Complete variables
   */
  private async completeVariables(context: CompletionContext): Promise<CompletionCandidate[]> {
    const candidates: CompletionCandidate[] = [];
    const pattern = context.currentWord.substring(1); // Remove $

    // Complete environment variables
    for (const [name, value] of Object.entries(context.env)) {
      if (this.matchesPattern(name, pattern)) {
        candidates.push({
          word: `$${name}`,
          type: 'variable',
          description: `Environment variable: ${value}`,
        });
      }
    }

    return candidates;
  }

  /**
   * Setup built-in command completions
   */
  private setupBuiltinCompletions(): void {
    // cd completion
    this.registerCompletion('cd', async (context) => {
      return this.completeDirectories(context);
    });

    // export completion
    this.registerCompletion('export', async (context) => {
      if (context.wordIndex === 1) {
        return this.completeVariables(context);
      }
      return [];
    });

    // unset completion
    this.registerCompletion('unset', async (context) => {
      if (context.wordIndex === 1) {
        return this.completeVariables(context);
      }
      return [];
    });

    // test completion
    this.registerCompletion('test', async (context) => {
      return this.completeTestOptions(context);
    });

    // Job management completions
    this.registerCompletion('job-start', async (context) => {
      return this.completeJobIds(context);
    });

    this.registerCompletion('job-stop', async (context) => {
      return this.completeJobIds(context);
    });

    this.registerCompletion('job-show', async (context) => {
      return this.completeJobIds(context);
    });
  }

  /**
   * Complete directories only
   */
  private async completeDirectories(context: CompletionContext): Promise<CompletionCandidate[]> {
    const candidates: CompletionCandidate[] = [];
    const currentWord = context.currentWord;
    
    let searchDir = context.cwd;
    let pattern = currentWord;
    
    if (currentWord.includes('/')) {
      const lastSlash = currentWord.lastIndexOf('/');
      searchDir = path.resolve(context.cwd, currentWord.substring(0, lastSlash + 1));
      pattern = currentWord.substring(lastSlash + 1);
    }

    try {
      const entries = await fs.promises.readdir(searchDir, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.isDirectory() && this.matchesPattern(entry.name, pattern)) {
          const fullPath = path.join(searchDir, entry.name);
          const relativePath = path.relative(context.cwd, fullPath);
          
          candidates.push({
            word: relativePath + '/',
            type: 'directory',
            description: 'Directory',
          });
        }
      }
    } catch (error) {
      // Directory doesn't exist or not readable
    }

    return candidates;
  }

  /**
   * Complete test command options
   */
  private async completeTestOptions(context: CompletionContext): Promise<CompletionCandidate[]> {
    const testOptions = [
      { word: '-f', description: 'File exists and is regular file' },
      { word: '-d', description: 'File exists and is directory' },
      { word: '-e', description: 'File exists' },
      { word: '-r', description: 'File exists and is readable' },
      { word: '-w', description: 'File exists and is writable' },
      { word: '-x', description: 'File exists and is executable' },
      { word: '-s', description: 'File exists and has size > 0' },
      { word: '-z', description: 'String is empty' },
      { word: '-n', description: 'String is not empty' },
      { word: '=', description: 'Strings are equal' },
      { word: '!=', description: 'Strings are not equal' },
      { word: '-eq', description: 'Numbers are equal' },
      { word: '-ne', description: 'Numbers are not equal' },
      { word: '-lt', description: 'Number is less than' },
      { word: '-le', description: 'Number is less than or equal' },
      { word: '-gt', description: 'Number is greater than' },
      { word: '-ge', description: 'Number is greater than or equal' },
    ];

    return testOptions.filter(opt => 
      this.matchesPattern(opt.word, context.currentWord)
    ).map(opt => ({
      word: opt.word,
      type: 'option' as const,
      description: opt.description,
    }));
  }

  /**
   * Complete job IDs (placeholder - would integrate with job manager)
   */
  private async completeJobIds(context: CompletionContext): Promise<CompletionCandidate[]> {
    // This would integrate with the job manager to get actual job IDs
    return [
      { word: '1', description: 'Job ID 1' },
      { word: '2', description: 'Job ID 2' },
      { word: '3', description: 'Job ID 3' },
    ];
  }

  /**
   * Check if a pattern matches a string
   */
  private matchesPattern(str: string, pattern: string): boolean {
    if (!pattern) return true;
    
    // Simple case-insensitive prefix matching
    return str.toLowerCase().startsWith(pattern.toLowerCase());
  }

  /**
   * Check if a file is executable
   */
  private isExecutable(filePath: string): boolean {
    try {
      fs.accessSync(filePath, fs.constants.X_OK);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Filter and sort completion candidates
   */
  private filterAndSortCandidates(
    candidates: CompletionCandidate[],
    currentWord: string
  ): CompletionCandidate[] {
    // Remove duplicates
    const unique = new Map<string, CompletionCandidate>();
    for (const candidate of candidates) {
      if (!unique.has(candidate.word)) {
        unique.set(candidate.word, candidate);
      }
    }

    // Sort by type priority and alphabetically
    const sorted = Array.from(unique.values()).sort((a, b) => {
      const typeOrder = { directory: 0, file: 1, command: 2, variable: 3, function: 4, option: 5 };
      const aOrder = typeOrder[a.type || 'file'];
      const bOrder = typeOrder[b.type || 'file'];
      
      if (aOrder !== bOrder) {
        return aOrder - bOrder;
      }
      
      return a.word.localeCompare(b.word);
    });

    return sorted;
  }
}

export default CompletionSystem;