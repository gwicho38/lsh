/**
 * Advanced Prompt System Implementation
 * Provides ZSH-compatible prompt customization
 */
export interface PromptTheme {
    name: string;
    description: string;
    prompt: string;
    rprompt?: string;
    colors?: {
        user?: string;
        host?: string;
        path?: string;
        git?: string;
        error?: string;
        success?: string;
    };
}
export interface PromptContext {
    user: string;
    host: string;
    cwd: string;
    home: string;
    exitCode: number;
    jobCount: number;
    time: Date;
    git?: {
        branch: string;
        status: 'clean' | 'dirty' | 'ahead' | 'behind' | 'diverged';
    };
}
export declare class PromptSystem {
    private themes;
    private currentTheme;
    private context;
    constructor();
    /**
     * Expand prompt string with ZSH-style sequences
     */
    expandPrompt(prompt: string, context?: Partial<PromptContext>): string;
    /**
     * Set current theme
     */
    setTheme(themeName: string): boolean;
    /**
     * Get current theme
     */
    getCurrentTheme(): string;
    /**
     * Get current prompt
     */
    getCurrentPrompt(context?: Partial<PromptContext>): string;
    /**
     * Get current right prompt
     */
    getCurrentRPrompt(context?: Partial<PromptContext>): string;
    /**
     * Add a custom theme
     */
    addTheme(theme: PromptTheme): void;
    /**
     * Get all available themes
     */
    getAvailableThemes(): string[];
    /**
     * Get theme information
     */
    getThemeInfo(themeName: string): PromptTheme | undefined;
    /**
     * Update prompt context
     */
    updateContext(updates: Partial<PromptContext>): void;
    /**
     * Create default context
     */
    private createDefaultContext;
    /**
     * Setup default themes
     */
    private setupDefaultThemes;
    /**
     * Format path with tilde expansion
     */
    private formatPath;
    /**
     * Format time according to pattern
     */
    private formatTime;
    /**
     * Format git status
     */
    private formatGitStatus;
    /**
     * Expand conditional sequences
     */
    private expandConditionalSequences;
    /**
     * Evaluate condition for conditional sequences
     */
    private evaluateCondition;
    /**
     * Expand color sequences
     */
    private expandColorSequences;
    /**
     * Get color code for color name
     */
    private getColorCode;
    /**
     * Get background color code for color name
     */
    private getBackgroundColorCode;
}
export default PromptSystem;
