/**
 * Tab Completion System Implementation
 * Provides ZSH-compatible completion functionality
 */
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
export declare class CompletionSystem {
    private completionFunctions;
    private defaultCompletions;
    private isEnabled;
    constructor();
    /**
     * Register a completion function for a specific command
     */
    registerCompletion(command: string, func: CompletionFunction): void;
    /**
     * Register a default completion function
     */
    registerDefaultCompletion(func: CompletionFunction): void;
    /**
     * Get completions for the current context
     */
    getCompletions(context: CompletionContext): Promise<CompletionCandidate[]>;
    /**
     * Enable/disable completion
     */
    setEnabled(enabled: boolean): void;
    /**
     * Setup default completion functions
     */
    private setupDefaultCompletions;
    /**
     * Complete files and directories
     */
    private completeFilesAndDirectories;
    /**
     * Complete commands from PATH
     */
    private completeCommands;
    /**
     * Complete variables
     */
    private completeVariables;
    /**
     * Setup built-in command completions
     */
    private setupBuiltinCompletions;
    /**
     * Complete directories only
     */
    private completeDirectories;
    /**
     * Complete test command options
     */
    private completeTestOptions;
    /**
     * Complete job IDs (placeholder - would integrate with job manager)
     */
    private completeJobIds;
    /**
     * Check if a pattern matches a string
     */
    private matchesPattern;
    /**
     * Check if a file is executable
     */
    private isExecutable;
    /**
     * Filter and sort completion candidates
     */
    private filterAndSortCandidates;
}
export default CompletionSystem;
