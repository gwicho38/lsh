/**
 * Enhanced ZSH Import Manager
 * Handles importing ZSH configurations with conflict resolution, diagnostics, and selective import
 */
import { ShellExecutor } from './shell-executor.js';
export interface ZshImportOptions {
    autoImport?: boolean;
    selective?: boolean;
    conflictResolution?: 'skip' | 'overwrite' | 'rename' | 'prompt';
    diagnosticLog?: string;
    includeAliases?: boolean;
    includeExports?: boolean;
    includeFunctions?: boolean;
    includeOptions?: boolean;
    includePlugins?: boolean;
    excludePatterns?: string[];
    includePatterns?: string[];
}
export interface ImportDiagnostic {
    timestamp: Date;
    type: 'alias' | 'export' | 'function' | 'setopt' | 'plugin' | 'error';
    name: string;
    status: 'success' | 'failed' | 'skipped' | 'conflict' | 'disabled';
    reason?: string;
    source?: string;
    action?: string;
}
export interface ParsedZshConfig {
    aliases: Array<{
        name: string;
        value: string;
        line: number;
    }>;
    functions: Array<{
        name: string;
        body: string;
        line: number;
    }>;
    exports: Array<{
        name: string;
        value: string;
        line: number;
    }>;
    setopts: Array<{
        option: string;
        enabled: boolean;
        line: number;
    }>;
    completions: Array<{
        config: string;
        line: number;
    }>;
    plugins: Array<{
        name: string;
        line: number;
    }>;
}
export interface ImportStats {
    total: number;
    succeeded: number;
    failed: number;
    skipped: number;
    conflicts: number;
}
export interface ImportResult {
    success: boolean;
    message: string;
    diagnostics: ImportDiagnostic[];
    stats: ImportStats;
}
export declare class ZshImportManager {
    private executor;
    private options;
    private diagnostics;
    private existingAliases;
    private existingExports;
    private existingFunctions;
    constructor(executor: ShellExecutor, options?: ZshImportOptions);
    private ensureLogDirectory;
    /**
     * Import ZSH configuration from .zshrc
     */
    importZshConfig(zshrcPath?: string): Promise<ImportResult>;
    /**
     * Parse .zshrc with enhanced function parsing
     */
    private parseZshrc;
    /**
     * Load existing items to detect conflicts
     */
    private loadExistingItems;
    /**
     * Import aliases with conflict resolution
     */
    private importAliases;
    /**
     * Import environment variables with conflict resolution
     */
    private importExports;
    /**
     * Import functions with enhanced parsing
     */
    private importFunctions;
    /**
     * Import ZSH options
     */
    private importSetopts;
    /**
     * Import Oh-My-Zsh plugins
     */
    private importPlugins;
    /**
     * Check if item should be imported based on include/exclude patterns
     */
    private shouldImport;
    /**
     * Match name against pattern (supports wildcards)
     */
    private matchPattern;
    /**
     * Resolve naming conflicts
     */
    private resolveConflict;
    /**
     * Log diagnostic entry
     */
    private log;
    /**
     * Write diagnostic log to file
     */
    private writeDiagnosticLog;
    /**
     * Format import summary message
     */
    private formatImportMessage;
    /**
     * Get import statistics from last run
     */
    getLastImportStats(): ImportStats & {
        byType: Record<string, ImportStats>;
    } | null;
}
