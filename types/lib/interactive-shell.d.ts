/**
 * Interactive Shell Implementation
 * Provides ZSH-like interactive shell experience
 */
export interface InteractiveShellOptions {
    prompt?: string;
    rprompt?: string;
    historyFile?: string;
    rcFile?: string;
    verbose?: boolean;
    debug?: boolean;
}
export declare class InteractiveShell {
    private executor;
    private options;
    private isRunning;
    private currentLine;
    private cursorPosition;
    private historyIndex;
    private completionIndex;
    private currentCompletions;
    constructor(options?: InteractiveShellOptions);
    /**
     * Start interactive shell
     */
    start(): Promise<void>;
    /**
     * Stop interactive shell
     */
    stop(): void;
    /**
     * Setup shell environment
     */
    private setupShell;
    /**
     * Load shell configuration from .lshrc
     */
    private loadConfiguration;
    /**
     * Execute configuration commands
     */
    private executeConfiguration;
    /**
     * Create default .lshrc file
     */
    private createDefaultRcFile;
    /**
     * Show welcome message
     */
    private showWelcome;
    /**
     * Main interactive loop
     */
    private interactiveLoop;
    /**
     * Read a line from stdin
     */
    private readLine;
    /**
     * Handle tab completion
     */
    private handleTabCompletion;
    /**
     * Handle history up
     */
    private handleHistoryUp;
    /**
     * Handle history down
     */
    private handleHistoryDown;
    /**
     * Handle SIGINT (Ctrl+C)
     */
    private handleSigInt;
    /**
     * Execute a command
     */
    private executeCommand;
    /**
     * Get current prompt
     */
    private getPrompt;
    /**
     * Show help information
     */
    private showHelp;
    /**
     * Show command history
     */
    private showHistory;
    /**
     * Setup completion system
     */
    private setupCompletion;
}
export default InteractiveShell;
