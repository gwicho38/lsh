/**
 * LSH Secrets Manager
 * Sync .env files across machines using encrypted Supabase storage
 */
export interface Secret {
    key: string;
    value: string;
    environment: string;
    description?: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface SecretsManagerOptions {
    userId?: string;
    encryptionKey?: string;
    detectGit?: boolean;
    globalMode?: boolean;
}
export declare class SecretsManager {
    private storage;
    private encryptionKey;
    private gitInfo?;
    private globalMode;
    private homeDir;
    constructor(userId?: string, encryptionKey?: string, detectGit?: boolean);
    constructor(options: SecretsManagerOptions);
    /**
     * Check if running in global mode
     */
    isGlobalMode(): boolean;
    /**
     * Get the home directory path
     */
    getHomeDir(): string;
    /**
     * Resolve file path - in global mode, resolves relative to $HOME
     */
    resolveFilePath(filePath: string): string;
    /**
     * Cleanup resources (stop timers, close connections)
     * Call this when done to allow process to exit
     */
    cleanup(): Promise<void>;
    /**
     * Get default encryption key from environment or machine
     */
    private getDefaultEncryptionKey;
    /**
     * Encrypt a value
     */
    private encrypt;
    /**
     * Decrypt a value
     */
    private decrypt;
    /**
     * Parse .env file into key-value pairs
     */
    private parseEnvFile;
    /**
     * Filter out LSH-internal keys that should not be synced
     * These keys are host-specific and syncing them would cause conflicts
     */
    private filterLshInternalKeys;
    /**
     * Format env vars as .env file content
     */
    private formatEnvFile;
    /**
     * Detect destructive changes (filled secrets becoming empty)
     */
    private detectDestructiveChanges;
    /**
     * Format error message for destructive changes
     */
    private formatDestructiveChangesError;
    /**
     * Push local .env to Supabase
     */
    push(envFilePath?: string, environment?: string, force?: boolean): Promise<void>;
    /**
     * Pull .env from IPFS
     */
    pull(envFilePath?: string, environment?: string, force?: boolean): Promise<void>;
    /**
     * List all stored environments
     */
    listEnvironments(): Promise<string[]>;
    /**
     * List all tracked .env files
     */
    listAllFiles(): Promise<Array<{
        filename: string;
        environment: string;
        updated: string;
    }>>;
    /**
     * Show secrets (masked)
     */
    show(environment?: string, format?: 'env' | 'json' | 'yaml' | 'toml' | 'export'): Promise<void>;
    /**
     * Get status of secrets for an environment
     */
    status(envFilePath?: string, environment?: string): Promise<{
        localExists: boolean;
        localKeys: number;
        localModified?: Date;
        cloudExists: boolean;
        cloudKeys: number;
        cloudModified?: Date;
        keySet: boolean;
        keyMatches?: boolean;
        suggestions: string[];
    }>;
    /**
     * Get the default environment name based on context
     * v2.0: In git repo, default is repo name; otherwise 'dev'
     * Global mode: always returns 'dev' (which resolves to 'global' namespace)
     */
    getDefaultEnvironment(): string;
    /**
     * Get repo-aware environment namespace
     * v2.0: Returns environment name with repo context if in a git repo
     *
     * Behavior:
     * - Global mode: returns 'global' or 'global_env' (e.g., global_staging)
     * - Empty env in repo: returns just repo name (v2.0 default)
     * - Named env in repo: returns repo_env (e.g., repo_staging)
     * - Any env outside repo: returns env as-is
     */
    private getRepoAwareEnvironment;
    /**
     * Generate encryption key if not set
     */
    private ensureEncryptionKey;
    /**
     * Create .env from .env.example if available
     */
    private createEnvFromExample;
    /**
     * Generate shell export commands for loading .env file
     */
    private generateExportCommands;
    /**
     * Smart sync command - automatically set up and synchronize secrets
     * This is the new enhanced sync that does everything automatically
     */
    smartSync(envFilePath?: string, environment?: string, autoExecute?: boolean, loadMode?: boolean, force?: boolean, forceRekey?: boolean): Promise<void>;
    /**
     * Show instructions for loading secrets
     */
    private showLoadInstructions;
    /**
     * Sync command - check status and suggest actions (legacy, kept for compatibility)
     */
    sync(envFilePath?: string, environment?: string): Promise<void>;
    /**
     * Log sync operation to IPFS for immutable record
     */
    private logToIPFS;
}
export default SecretsManager;
