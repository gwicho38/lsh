/**
 * ZSH Compatibility Layer
 * Provides compatibility with ZSH configurations and completions
 */
import { ShellExecutor } from './shell-executor.js';
import { ZshImportOptions } from './zsh-import-manager.js';
export interface ZshCompatibilityOptions {
    sourceZshrc: boolean;
    zshrcPath?: string;
    respectZshCompletions: boolean;
    zshCompletionsPath?: string;
    installPackages: boolean;
    packageManager?: 'npm' | 'yarn' | 'pnpm' | 'brew' | 'apt' | 'yum';
    importOptions?: ZshImportOptions;
}
export declare class ZshCompatibility {
    private executor;
    private options;
    private importManager;
    constructor(executor: ShellExecutor, options?: Partial<ZshCompatibilityOptions>);
    /**
     * Source ZSH configuration files (enhanced version)
     */
    sourceZshConfig(): Promise<{
        success: boolean;
        message: string;
    }>;
    /**
     * Source ZSH configuration files (legacy method for backward compatibility)
     */
    sourceZshConfigLegacy(): Promise<{
        success: boolean;
        message: string;
    }>;
    /**
     * Parse .zshrc content and extract compatible configurations
     */
    private parseZshrc;
    /**
     * Apply parsed ZSH configuration to LSH
     */
    private applyZshConfig;
    /**
     * Load ZSH completions
     */
    private loadZshCompletions;
    /**
     * Load completions from a specific path
     */
    private loadCompletionsFromPath;
    /**
     * Load Oh My Zsh completions
     */
    private loadOhMyZshCompletions;
    /**
     * Parse completion file and register with LSH completion system
     */
    private parseCompletionFile;
    /**
     * Extract completion patterns from ZSH completion file
     */
    private extractCompletionPatterns;
    /**
     * Generate completions based on patterns
     */
    private generateCompletions;
    /**
     * Install packages using package manager
     */
    installPackage(packageName: string): Promise<{
        success: boolean;
        message: string;
    }>;
    /**
     * Uninstall packages using package manager
     */
    uninstallPackage(packageName: string): Promise<{
        success: boolean;
        message: string;
    }>;
    /**
     * Check if ZSH is available and get version
     */
    checkZshAvailability(): Promise<{
        available: boolean;
        version?: string;
        path?: string;
    }>;
    /**
     * Migrate ZSH configuration to LSH
     */
    migrateZshConfig(): Promise<{
        success: boolean;
        message: string;
    }>;
    /**
     * Convert ZSH configuration to LSH format
     */
    private convertZshToLsh;
}
export default ZshCompatibility;
