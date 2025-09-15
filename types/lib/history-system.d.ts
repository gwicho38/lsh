/**
 * Command History System Implementation
 * Provides ZSH-compatible history functionality
 */
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
export declare class HistorySystem {
    private entries;
    private currentIndex;
    private config;
    private isEnabled;
    constructor(config?: Partial<HistoryConfig>);
    /**
     * Add a command to history
     */
    addCommand(command: string, exitCode?: number): void;
    /**
     * Get history entry by line number
     */
    getEntry(lineNumber: number): HistoryEntry | undefined;
    /**
     * Get history entry by command prefix
     */
    getEntryByPrefix(prefix: string): HistoryEntry | undefined;
    /**
     * Get all history entries
     */
    getAllEntries(): HistoryEntry[];
    /**
     * Search history for commands matching pattern
     */
    searchHistory(pattern: string): HistoryEntry[];
    /**
     * Get previous command in history
     */
    getPreviousCommand(): string | null;
    /**
     * Get next command in history
     */
    getNextCommand(): string | null;
    /**
     * Reset history navigation index
     */
    resetIndex(): void;
    /**
     * Expand history references like !! !n !string
     */
    expandHistory(command: string): string;
    /**
     * Clear history
     */
    clearHistory(): void;
    /**
     * Get history statistics
     */
    getStats(): {
        total: number;
        unique: number;
        oldest: Date | null;
        newest: Date | null;
    };
    /**
     * Enable/disable history
     */
    setEnabled(enabled: boolean): void;
    /**
     * Update configuration
     */
    updateConfig(newConfig: Partial<HistoryConfig>): void;
    /**
     * Load history from file
     */
    private loadHistory;
    /**
     * Save history to file
     */
    private saveHistory;
    /**
     * Remove duplicate command from history
     */
    private removeDuplicateCommand;
    /**
     * Renumber entries after trimming
     */
    private renumberEntries;
}
export default HistorySystem;
