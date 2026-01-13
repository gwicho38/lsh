/**
 * Storacha Client Wrapper
 * Provides IPFS network sync via Storacha (formerly web3.storage)
 */
import type { Client } from '@storacha/client';
export interface StorachaConfig {
    email?: string;
    spaceName?: string;
    enabled: boolean;
}
export interface StorachaSpace {
    did: string;
    name: string;
    registered: string;
}
export declare class StorachaClient {
    private client;
    private configPath;
    private config;
    constructor();
    /**
     * Load Storacha configuration
     */
    private loadConfig;
    /**
     * Save Storacha configuration
     */
    private saveConfig;
    /**
     * Check if Storacha is enabled
     * Default: enabled (unless explicitly disabled via LSH_STORACHA_ENABLED=false)
     */
    isEnabled(): boolean;
    /**
     * Get or create Storacha client
     */
    getClient(): Promise<Client>;
    /**
     * Check if user is authenticated
     */
    isAuthenticated(): Promise<boolean>;
    /**
     * Login with email (triggers email verification)
     */
    login(email: string): Promise<void>;
    /**
     * Get current authentication status
     */
    getStatus(): Promise<{
        authenticated: boolean;
        email?: string;
        currentSpace?: string;
        spaces: StorachaSpace[];
        enabled: boolean;
    }>;
    /**
     * Create a new space
     */
    createSpace(name: string): Promise<void>;
    /**
     * Get project name from git repo or current directory
     * Returns the git repo name if in a git repo, otherwise the current directory name
     */
    getProjectName(dir?: string): string;
    /**
     * Select an existing space by name
     * Returns true if space was found and selected, false otherwise
     */
    selectSpace(name: string): Promise<boolean>;
    /**
     * Ensure a project-specific space is active
     * Creates the space if it doesn't exist, selects it if it does
     *
     * @param projectName - Optional project name override. If not provided, auto-detects from git/directory
     * @returns The name of the active space
     */
    ensureProjectSpace(projectName?: string): Promise<string>;
    /**
     * Upload data to Storacha
     * Returns CID of uploaded content
     */
    upload(data: Buffer, filename: string): Promise<string>;
    /**
     * Download data from Storacha via IPFS gateway
     * Returns data buffer
     */
    download(cid: string): Promise<Buffer>;
    /**
     * Check file size without downloading the full content
     * Returns size in bytes, or -1 if size cannot be determined
     */
    getFileSize(cid: string): Promise<number>;
    /**
     * Download only if file is small (registry check optimization)
     * Returns buffer if small enough, null otherwise
     */
    downloadIfSmall(cid: string, maxSize?: number): Promise<Buffer | null>;
    /**
     * Upload registry file for a repo
     * Registry files mark that secrets exist and include the latest secrets CID
     */
    uploadRegistry(repoName: string, environment: string, secretsCid: string): Promise<string>;
    /**
     * Get the latest secrets CID from registry
     * Returns the CID of the latest secrets if registry exists, null otherwise
     *
     * NOTE: This method paginates through uploads to find registries for the
     * specific repo, ensuring secrets from different repos don't get mixed up.
     */
    getLatestCID(repoName: string): Promise<string | null>;
    /**
     * Get the latest registry object for a repo
     * Returns the full registry object including registryVersion
     *
     * NOTE: This method paginates through uploads to find registries for the
     * specific repo, ensuring secrets from different repos don't get mixed up.
     */
    getLatestRegistry(repoName: string): Promise<{
        repoName: string;
        environment: string;
        cid: string;
        timestamp: string;
        version: string;
        registryVersion: number;
    } | null>;
    /**
     * Check if registry exists for a repo by listing uploads
     * Returns true if a registry file for this repo exists in Storacha
     *
     * NOTE: This paginates through uploads to find registries for the specific repo,
     * ensuring secrets from different repos don't get mixed up.
     */
    checkRegistry(repoName: string): Promise<boolean>;
    /**
     * Enable Storacha network sync
     */
    enable(): void;
    /**
     * Disable Storacha network sync
     */
    disable(): void;
}
/**
 * Get singleton Storacha client instance
 */
export declare function getStorachaClient(): StorachaClient;
