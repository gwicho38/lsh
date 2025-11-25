/**
 * LSH Configuration Manager
 *
 * Manages encryption keys and configuration for different repositories.
 * Keys are stored in ~/.lsh/config.json separate from the .env files being synced.
 *
 * This prevents sync conflicts where different hosts overwrite each other's keys.
 */
export declare class LshConfigManager {
    private configPath;
    private config;
    constructor(configPath?: string);
    /**
     * Load config from disk, or create default if it doesn't exist
     */
    private loadConfig;
    /**
     * Save config to disk
     */
    private saveConfig;
    /**
     * Get encryption key for a specific repository
     */
    getKey(repoName: string): string | null;
    /**
     * Set encryption key for a specific repository
     */
    setKey(repoName: string, key: string): void;
    /**
     * Check if a key exists for a repository
     */
    hasKey(repoName: string): boolean;
    /**
     * Remove encryption key for a repository
     */
    removeKey(repoName: string): void;
    /**
     * List all repositories with stored keys
     */
    listKeys(): Array<{
        repoName: string;
        createdAt: string;
        lastUsed: string;
    }>;
    /**
     * Export key for sharing with other hosts
     */
    exportKey(repoName: string): string | null;
    /**
     * Get config file path (for debugging/migration)
     */
    getConfigPath(): string;
}
/**
 * Get the global LSH config manager instance
 */
export declare function getLshConfig(): LshConfigManager;
