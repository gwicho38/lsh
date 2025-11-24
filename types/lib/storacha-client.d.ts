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
     * Upload registry file for a repo
     * Registry files mark that secrets exist for a repo without exposing the secrets themselves
     */
    uploadRegistry(repoName: string, environment: string): Promise<string>;
    /**
     * Check if registry exists for a repo by listing uploads
     * Returns true if a registry file for this repo exists in Storacha
     *
     * NOTE: This is optimized to check only recent small files (likely registry files)
     * to avoid downloading large encrypted secret files.
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
