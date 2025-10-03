/**
 * Interactive Shell Implementation
 * Provides ZSH-like interactive shell experience
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ShellExecutor } from './shell-executor.js';
import { parseShellCommand } from './shell-parser.js';
import _HistorySystem from './history-system.js';
import _CompletionSystem from './completion-system.js';

export interface InteractiveShellOptions {
  prompt?: string;
  rprompt?: string;
  historyFile?: string;
  rcFile?: string;
  verbose?: boolean;
  debug?: boolean;
}

export class InteractiveShell {
  private executor: ShellExecutor;
  private options: InteractiveShellOptions;
  private isRunning: boolean = false;
  private currentLine: string = '';
  private cursorPosition: number = 0;
  private historyIndex: number = -1;
  private completionIndex: number = -1;
  private currentCompletions: string[] = [];

  constructor(options: InteractiveShellOptions = {}) {
    this.options = {
      prompt: '%n@%m:%~$ ',
      rprompt: '%T',
      historyFile: path.join(os.homedir(), '.lsh_history'),
      rcFile: path.join(os.homedir(), '.lshrc'),
      verbose: false,
      debug: false,
      ...options,
    };

    this.executor = new ShellExecutor();
    this.setupShell();
  }

  /**
   * Start interactive shell
   */
  public async start(): Promise<void> {
    this.isRunning = true;
    
    // Load configuration
    await this.loadConfiguration();
    
    // Show welcome message
    this.showWelcome();
    
    // Main interactive loop
    await this.interactiveLoop();
  }

  /**
   * Stop interactive shell
   */
  public stop(): void {
    this.isRunning = false;

    // Restore terminal to normal mode
    if (process.stdin.isTTY && process.stdin.setRawMode) {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdin.removeAllListeners('data');
    }

    // Write newline and goodbye message
    process.stdout.write('\nGoodbye!\n');

    // Give terminal time to restore before exiting
    setImmediate(() => {
      process.exit(0);
    });
  }

  /**
   * Setup shell environment
   */
  private setupShell(): void {
    // Set up terminal for raw input
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.setEncoding('utf8');
    }

    // Handle process signals
    process.on('SIGINT', () => {
      this.handleSigInt();
    });

    process.on('SIGTERM', () => {
      this.stop();
    });

    // Set up completion system
    this.setupCompletion();
  }

  /**
   * Load shell configuration from .lshrc
   */
  private async loadConfiguration(): Promise<void> {
    const rcFile = this.options.rcFile!;
    
    if (fs.existsSync(rcFile)) {
      try {
        const rcContent = fs.readFileSync(rcFile, 'utf8');
        await this.executeConfiguration(rcContent);
        
        if (this.options.verbose) {
          console.log(`Loaded configuration from ${rcFile}`);
        }
      } catch (error) {
        console.error(`Error loading ${rcFile}: ${error.message}`);
      }
    } else {
      // Create default .lshrc if it doesn't exist
      this.createDefaultRcFile(rcFile);
    }
  }

  /**
   * Execute configuration commands
   */
  private async executeConfiguration(config: string): Promise<void> {
    const lines = config.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Skip comments and empty lines
      if (trimmed.startsWith('#') || trimmed === '') {
        continue;
      }
      
      try {
        const ast = parseShellCommand(trimmed);
        await this.executor.execute(ast);
      } catch (error) {
        if (this.options.debug) {
          console.error(`Config error: ${error.message}`);
        }
      }
    }
  }

  /**
   * Create default .lshrc file
   */
  private createDefaultRcFile(rcFile: string): void {
    const defaultConfig = `# LSH Configuration File
# This file is executed when LSH starts in interactive mode

# Enable ZSH features
setopt EXTENDED_GLOB
setopt AUTO_CD
setopt SHARE_HISTORY
setopt HIST_IGNORE_DUPS

# Set prompt
export PROMPT='%n@%m:%~$ '
export RPROMPT='%T'

# Set history options
export HISTSIZE=10000
export HISTFILE=~/.lsh_history

# Aliases
alias ll='ls -la'
alias la='ls -A'
alias l='ls -CF'
alias ..='cd ..'
alias ...='cd ../..'

# Functions
greet() {
    echo "Hello from LSH!"
}

# Welcome message
echo "LSH interactive shell loaded. Type 'help' for commands."
`;

    try {
      fs.writeFileSync(rcFile, defaultConfig, 'utf8');
      if (this.options.verbose) {
        console.log(`Created default configuration: ${rcFile}`);
      }
    } catch (error) {
      console.error(`Failed to create ${rcFile}: ${error.message}`);
    }
  }

  /**
   * Show welcome message
   */
  private showWelcome(): void {
    console.log('🐚 LSH Interactive Shell');
    console.log('========================');
    console.log('Type "help" for available commands');
    console.log('Type "exit" or press Ctrl+D to quit');
    console.log('');
  }

  /**
   * Main interactive loop
   */
  private async interactiveLoop(): Promise<void> {
    while (this.isRunning) {
      try {
        // Show prompt
        const prompt = this.getPrompt();
        process.stdout.write(prompt);
        
        // Read input
        const input = await this.readLine();
        
        if (input === null) {
          // EOF (Ctrl+D)
          this.stop();
          break;
        }
        
        if (input.trim() === '') {
          continue;
        }
        
        // Add to history
        this.executor.addToHistory(input);
        
        // Execute command
        await this.executeCommand(input);
        
      } catch (error) {
        console.error(`Shell error: ${error.message}`);
      }
    }
  }

  /**
   * Read a line from stdin
   */
  private readLine(): Promise<string | null> {
    return new Promise((resolve) => {
      let input = '';
      
      const onData = (data: string) => {
        const char = data;
        
        switch (char) {
          case '\r':
          case '\n':
            process.stdin.removeListener('data', onData);
            resolve(input);
            break;
            
          case '\u0003': // Ctrl+C
            process.stdin.removeListener('data', onData);
            console.log('^C');
            resolve('');
            break;
            
          case '\u0004': // Ctrl+D (EOF)
            process.stdin.removeListener('data', onData);
            console.log(''); // Add newline
            resolve(null);
            break;
            
          case '\u007f': // Backspace
            if (input.length > 0) {
              input = input.slice(0, -1);
              process.stdout.write('\b \b');
            }
            break;
            
          case '\t': // Tab completion
            this.handleTabCompletion(input);
            break;
            
          case '\u001b[A': // Up arrow - history
            this.handleHistoryUp();
            break;
            
          case '\u001b[B': // Down arrow - history
            this.handleHistoryDown();
            break;
            
          default:
            if (char >= ' ') {
              input += char;
              process.stdout.write(char);
            }
            break;
        }
      };
      
      process.stdin.on('data', onData);
    });
  }

  /**
   * Handle tab completion
   */
  private async handleTabCompletion(input: string): Promise<void> {
    try {
      const completions = await this.executor.getCompletions(
        'command', // This would be parsed from input
        [],
        input,
        0
      );
      
      if (completions.length > 0) {
        this.currentCompletions = completions;
        this.completionIndex = 0;
        
        // Show first completion
        const completion = completions[0];
        const remaining = completion.substring(input.length);
        process.stdout.write(remaining);
        input += remaining;
      }
    } catch (_error) {
      // Ignore completion errors
    }
  }

  /**
   * Handle history up
   */
  private handleHistoryUp(): void {
    const history = this.executor.getHistoryEntries();
    if (history.length > 0 && this.historyIndex < history.length - 1) {
      this.historyIndex++;
      const entry = history[history.length - 1 - this.historyIndex];
      
      // Clear current line
      process.stdout.write('\r' + ' '.repeat(process.stdout.columns) + '\r');
      
      // Show history entry
      this.currentLine = entry.command;
      process.stdout.write(this.getPrompt() + this.currentLine);
    }
  }

  /**
   * Handle history down
   */
  private handleHistoryDown(): void {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      const history = this.executor.getHistoryEntries();
      const entry = history[history.length - 1 - this.historyIndex];
      
      // Clear current line
      process.stdout.write('\r' + ' '.repeat(process.stdout.columns) + '\r');
      
      // Show history entry
      this.currentLine = entry.command;
      process.stdout.write(this.getPrompt() + this.currentLine);
    } else if (this.historyIndex === 0) {
      this.historyIndex = -1;
      
      // Clear current line
      process.stdout.write('\r' + ' '.repeat(process.stdout.columns) + '\r');
      
      // Show empty line
      this.currentLine = '';
      process.stdout.write(this.getPrompt());
    }
  }

  /**
   * Handle SIGINT (Ctrl+C)
   */
  private handleSigInt(): void {
    console.log('\n^C');
    this.currentLine = '';
    this.historyIndex = -1;
    this.completionIndex = -1;
    this.currentCompletions = [];
  }

  /**
   * Execute a command
   */
  private async executeCommand(command: string): Promise<void> {
    try {
      // Handle special commands
      if (command.trim() === 'exit' || command.trim() === 'quit') {
        this.stop();
        return;
      }
      
      if (command.trim() === 'help') {
        this.showHelp();
        return;
      }
      
      if (command.trim() === 'clear') {
        console.clear();
        return;
      }

      if (command.trim() === 'history') {
        this.showHistory();
        return;
      }

      // Parse and execute command
      const ast = parseShellCommand(command);
      const result = await this.executor.execute(ast);
      
      // Display output
      if (result.stdout) {
        console.log(result.stdout);
      }
      if (result.stderr) {
        console.error(result.stderr);
      }
      
      // Update history with exit code
      this.executor.addToHistory(command, result.exitCode);
      
    } catch (error) {
      console.error(`Command error: ${error.message}`);
    }
  }

  /**
   * Get current prompt
   */
  private getPrompt(): string {
    return this.executor.getPrompt();
  }

  /**
   * Show help information
   */
  private showHelp(): void {
    console.log('LSH Interactive Shell Help');
    console.log('==========================');
    console.log('');
    console.log('Shell Commands:');
    console.log('  help     - Show this help');
    console.log('  exit     - Exit the shell');
    console.log('  clear    - Clear the screen');
    console.log('  history  - Show command history');
    console.log('');
    console.log('CLI Commands (exit shell first):');
    console.log('  lsh repl                 - JavaScript REPL (Node.js interactive)');
    console.log('  lsh self update          - Update LSH to latest version');
    console.log('  lsh self version         - Show version information');
    console.log('  lsh self info            - Show installation info');
    console.log('');
    console.log('  lsh daemon start         - Start LSH daemon');
    console.log('  lsh daemon stop          - Stop LSH daemon');
    console.log('  lsh daemon status        - Check daemon status');
    console.log('  lsh daemon restart       - Restart daemon');
    console.log('');
    console.log('  lsh daemon job list      - List all jobs');
    console.log('  lsh daemon job create    - Create new job');
    console.log('  lsh daemon job trigger   - Run job immediately');
    console.log('  lsh daemon job delete    - Delete a job');
    console.log('');
    console.log('  lsh cron reports         - View cron job reports');
    console.log('  lsh cron list            - List all cron jobs');
    console.log('');
    console.log('  lsh api start            - Start API server');
    console.log('  lsh api stop             - Stop API server');
    console.log('  lsh api key              - Generate API key');
    console.log('  lsh api test             - Test API connection');
    console.log('');
    console.log('  lsh config --init        - Initialize config file');
    console.log('  lsh config --show        - Show current config');
    console.log('');
    console.log('Key Bindings:');
    console.log('  Tab      - Command completion');
    console.log('  Up/Down  - Command history');
    console.log('  Ctrl+C   - Interrupt current command');
    console.log('  Ctrl+D   - Exit shell');
    console.log('');
    console.log('Features:');
    console.log('  - Full POSIX shell compatibility');
    console.log('  - ZSH-style features (arrays, globbing, etc.)');
    console.log('  - Advanced job management');
    console.log('  - Command history and completion');
    console.log('  - Configuration via ~/.lshrc');
    console.log('');
    console.log('For complete documentation: lsh --help');
    console.log('');
  }

  /**
   * Show command history
   */
  private showHistory(): void {
    const history = this.executor.getHistoryEntries();

    if (history.length === 0) {
      console.log('No command history');
      return;
    }

    console.log('Command History:');
    console.log('================');

    history.forEach((entry, index) => {
      const timestamp = new Date(entry.timestamp).toLocaleString();
      const exitCode = entry.exitCode !== undefined ? ` [${entry.exitCode}]` : '';
      console.log(`${index + 1}  ${entry.command}${exitCode}`);
      if (this.options.verbose) {
        console.log(`    ${timestamp}`);
      }
    });
    console.log('');
  }

  /**
   * Setup completion system
   */
  private setupCompletion(): void {
    // Completion is already set up in the executor
    // This method can be extended for additional completion setup
  }
}

export default InteractiveShell;