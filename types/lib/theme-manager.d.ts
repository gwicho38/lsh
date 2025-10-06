/**
 * Theme Manager
 * Import and apply ZSH themes (Oh-My-Zsh, Powerlevel10k, custom)
 */
export interface ThemeColors {
    reset: string;
    bold: string;
    dim: string;
    black: string;
    red: string;
    green: string;
    yellow: string;
    blue: string;
    magenta: string;
    cyan: string;
    white: string;
    orange?: string;
    purple?: string;
    pink?: string;
    turquoise?: string;
    limegreen?: string;
}
export interface ThemePrompt {
    left: string;
    right?: string;
    continuation?: string;
    select?: string;
}
export interface ParsedTheme {
    name: string;
    colors: Map<string, string>;
    prompts: ThemePrompt;
    gitFormats?: {
        branch?: string;
        unstaged?: string;
        staged?: string;
        action?: string;
    };
    variables: Map<string, string>;
    hooks: string[];
    dependencies: string[];
}
export declare class ThemeManager {
    private themesPath;
    private customThemesPath;
    private currentTheme;
    constructor();
    /**
     * List available themes
     */
    listThemes(): {
        ohmyzsh: string[];
        custom: string[];
        builtin: string[];
    };
    /**
     * Import Oh-My-Zsh theme
     */
    importOhMyZshTheme(themeName: string): Promise<ParsedTheme>;
    /**
     * Parse ZSH theme file
     */
    private parseZshTheme;
    /**
     * Convert ZSH prompt format to LSH format
     */
    private convertPromptToLsh;
    /**
     * Map ZSH color code to chalk color
     */
    private mapColorToChalk;
    /**
     * Get ANSI code for color name
     */
    private getAnsiCode;
    /**
     * Save theme in LSH format
     */
    private saveAsLshTheme;
    /**
     * Apply theme
     */
    applyTheme(theme: ParsedTheme): string;
    /**
     * Get built-in theme
     */
    getBuiltinTheme(name: string): ParsedTheme;
    /**
     * Preview theme without applying
     */
    previewTheme(theme: ParsedTheme): void;
}
