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
    constructor(userId?: string, encryptionKey?: string);
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
     * Push local .env to Supabase
     */
    push(envFilePath?: string, environment?: string): Promise<void>;
    /**
     * Pull .env from Supabase
     */
    pull(envFilePath?: string, environment?: string, force?: boolean): Promise<void>;
    /**
     * List all stored environments
     */
    listEnvironments(): Promise<string[]>;
    /**
     * Show secrets (masked)
     */
    show(environment?: string): Promise<void>;
}
export default SecretsManager;
