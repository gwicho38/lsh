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
export declare class SecretsManager {
    private persistence;
    private encryptionKey;
    private gitInfo?;
    constructor(userId?: string, encryptionKey?: string, detectGit?: boolean);
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
     * Pull .env from Supabase
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
    show(environment?: string): Promise<void>;
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
     * Get repo-aware environment namespace
     * Returns environment name with repo context if in a git repo
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
    smartSync(envFilePath?: string, environment?: string, autoExecute?: boolean, loadMode?: boolean, force?: boolean): Promise<void>;
    /**
     * Show instructions for loading secrets
     */
    private showLoadInstructions;
    /**
     * Sync command - check status and suggest actions (legacy, kept for compatibility)
     */
    sync(envFilePath?: string, environment?: string): Promise<void>;
}
export default SecretsManager;
