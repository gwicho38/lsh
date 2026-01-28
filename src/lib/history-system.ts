/**
 * Command History System Implementation
 * Provides ZSH-compatible history functionality
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { DEFAULTS } from '../constants/index.js';

export interface HistoryEntry {
  lineNumber: number;
  command: string;
  timestamp: number;
  exitCode?: number;
}

export interface HistoryConfig {
  maxSize: number;
  filePath: string;
  shareHistory: boolean;
  ignoreDups: boolean;
  ignoreSpace: boolean;
  expireDuplicatesFirst: boolean;
}

export class HistorySystem {
  protected entries: HistoryEntry[] = [];
  private currentIndex: number = -1;
  protected config: HistoryConfig;
  private isEnabled: boolean = true;

  constructor(config?: Partial<HistoryConfig>) {
    this.config = {
      maxSize: DEFAULTS.MAX_HISTORY_SIZE,
      filePath: path.join(os.homedir(), '.lsh_history'),
      shareHistory: false,
      ignoreDups: true,
      ignoreSpace: false,
      expireDuplicatesFirst: true,
      ...config,
    };

    this.loadHistory();
  }

  /**
   * Add a command to history
   */
  // TODO(@gwicho38): Review - addCommand
  public addCommand(command: string, exitCode?: number): void {
    if (!this.isEnabled) return;

    // Skip empty commands
    if (!command.trim()) return;

    // Skip commands starting with space if ignoreSpace is enabled
    if (this.config.ignoreSpace && command.startsWith(' ')) return;

    // Remove duplicates if configured
    if (this.config.ignoreDups) {
      this.removeDuplicateCommand(command);
    }

    const entry: HistoryEntry = {
      lineNumber: this.entries.length + 1,
      command: command.trim(),
      timestamp: Date.now(),
      exitCode,
    };

    this.entries.push(entry);

    // Trim history if it exceeds max size
    if (this.entries.length > this.config.maxSize) {
      this.entries = this.entries.slice(-this.config.maxSize);
      this.renumberEntries();
    }

    this.currentIndex = this.entries.length - 1;
    this.saveHistory();
  }

  /**
   * Get history entry by line number
   */
  // TODO(@gwicho38): Review - getEntry
  public getEntry(lineNumber: number): HistoryEntry | undefined {
    return this.entries.find(entry => entry.lineNumber === lineNumber);
  }

  /**
   * Get history entry by command prefix
   */
  // TODO(@gwicho38): Review - getEntryByPrefix
  public getEntryByPrefix(prefix: string): HistoryEntry | undefined {
    return this.entries
      .slice()
      .reverse()
      .find(entry => entry.command.startsWith(prefix));
  }

  /**
   * Get all history entries
   */
  // TODO(@gwicho38): Review - getAllEntries
  public getAllEntries(): HistoryEntry[] {
    return [...this.entries];
  }

  /**
   * Search history for commands matching pattern
   */
  // TODO(@gwicho38): Review - searchHistory
  public searchHistory(pattern: string): HistoryEntry[] {
    const regex = new RegExp(pattern, 'i');
    return this.entries.filter(entry => regex.test(entry.command));
  }

  /**
   * Get previous command in history
   */
  // TODO(@gwicho38): Review - getPreviousCommand
  public getPreviousCommand(): string | null {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      return this.entries[this.currentIndex].command;
    }
    return null;
  }

  /**
   * Get next command in history
   */
  // TODO(@gwicho38): Review - getNextCommand
  public getNextCommand(): string | null {
    if (this.currentIndex < this.entries.length - 1) {
      this.currentIndex++;
      return this.entries[this.currentIndex].command;
    }
    return null;
  }

  /**
   * Reset history navigation index
   */
  // TODO(@gwicho38): Review - resetIndex
  public resetIndex(): void {
    this.currentIndex = this.entries.length - 1;
  }

  /**
   * Expand history references like !! !n !string
   */
  // TODO(@gwicho38): Review - expandHistory
  public expandHistory(command: string): string {
    let result = command;

    // Handle !! (last command)
    result = result.replace(/!!/g, () => {
      const lastEntry = this.entries[this.entries.length - 1];
      return lastEntry ? lastEntry.command : '!!';
    });

    // Handle !n (command number n)
    result = result.replace(/!(\d+)/g, (match, numStr) => {
      const num = parseInt(numStr, 10);
      const entry = this.getEntry(num);
      return entry ? entry.command : match;
    });

    // Handle !string (last command starting with string)
    result = result.replace(/!([a-zA-Z0-9_]+)/g, (match, prefix) => {
      const entry = this.getEntryByPrefix(prefix);
      return entry ? entry.command : match;
    });

    // Handle ^old^new (quick substitution)
    result = result.replace(/\^([^^]+)\^([^^]*)/g, (match, old, replacement) => {
      const lastEntry = this.entries[this.entries.length - 1];
      if (lastEntry) {
        return lastEntry.command.replace(new RegExp(old, 'g'), replacement);
      }
      return match;
    });

    return result;
  }

  /**
   * Clear history
   */
  // TODO(@gwicho38): Review - clearHistory
  public clearHistory(): void {
    this.entries = [];
    this.currentIndex = -1;
    this.saveHistory();
  }

  /**
   * Get history statistics
   */
  // TODO(@gwicho38): Review - getStats
  public getStats(): { total: number; unique: number; oldest: Date | null; newest: Date | null } {
    const unique = new Set(this.entries.map(e => e.command)).size;
    const oldest = this.entries.length > 0 ? new Date(this.entries[0].timestamp) : null;
    const newest = this.entries.length > 0 ? new Date(this.entries[this.entries.length - 1].timestamp) : null;

    return {
      total: this.entries.length,
      unique,
      oldest,
      newest,
    };
  }

  /**
   * Enable/disable history
   */
  // TODO(@gwicho38): Review - setEnabled
  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  /**
   * Update configuration
   */
  // TODO(@gwicho38): Review - updateConfig
  public updateConfig(newConfig: Partial<HistoryConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Load history from file
   */
  // TODO(@gwicho38): Review - loadHistory
  private loadHistory(): void {
    try {
      if (fs.existsSync(this.config.filePath)) {
        const content = fs.readFileSync(this.config.filePath, 'utf8');
        const lines = content.split('\n').filter(line => line.trim());

        this.entries = lines.map((line, index) => {
          // Parse history line format: timestamp:command
          const colonIndex = line.indexOf(':');
          if (colonIndex > 0) {
            const timestamp = parseInt(line.substring(0, colonIndex), 10);
            const command = line.substring(colonIndex + 1);
            return {
              lineNumber: index + 1,
              command,
              timestamp: isNaN(timestamp) ? Date.now() : timestamp,
            };
          } else {
            return {
              lineNumber: index + 1,
              command: line,
              timestamp: Date.now(),
            };
          }
        });
      }
    } catch (_error) {
      // If loading fails, start with empty history
      this.entries = [];
    }
  }

  /**
   * Save history to file
   */
  // TODO(@gwicho38): Review - saveHistory
  private saveHistory(): void {
    try {
      const content = this.entries
        .map(entry => `${entry.timestamp}:${entry.command}`)
        .join('\n');

      // Ensure directory exists
      const dir = path.dirname(this.config.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(this.config.filePath, content, 'utf8');
    } catch (_error) {
      // Silently fail if we can't save history
    }
  }

  /**
   * Remove duplicate command from history
   */
  // TODO(@gwicho38): Review - removeDuplicateCommand
  private removeDuplicateCommand(command: string): void {
    const trimmedCommand = command.trim();
    this.entries = this.entries.filter(entry => entry.command !== trimmedCommand);
  }

  /**
   * Renumber entries after trimming
   */
  // TODO(@gwicho38): Review - renumberEntries
  private renumberEntries(): void {
    this.entries.forEach((entry, index) => {
      entry.lineNumber = index + 1;
    });
  }
}

export default HistorySystem;