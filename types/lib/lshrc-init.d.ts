/**
 * .lshrc Initialization
 * Creates and manages the user's .lshrc configuration file
 */
export interface LshrcOptions {
    autoImportZsh?: boolean;
    importOptions?: string[];
    createIfMissing?: boolean;
}
export declare class LshrcManager {
    private lshrcPath;
    constructor(lshrcPath?: string);
    /**
     * Initialize .lshrc if it doesn't exist
     */
    initialize(options?: LshrcOptions): boolean;
    /**
     * Create basic .lshrc without template
     */
    private createBasicLshrc;
    /**
     * Check if .lshrc exists
     */
    exists(): boolean;
    /**
     * Source .lshrc commands
     */
    source(executor?: any): Promise<string[]>;
    /**
     * Enable auto-import in existing .lshrc
     */
    enableAutoImport(options?: string[]): boolean;
    /**
     * Disable auto-import in .lshrc
     */
    disableAutoImport(): boolean;
    /**
     * Get .lshrc path
     */
    getPath(): string;
}
/**
 * Initialize .lshrc on first run
 */
export declare function initializeLshrc(options?: LshrcOptions): boolean;
/**
 * Check if .lshrc exists
 */
export declare function lshrcExists(): boolean;
