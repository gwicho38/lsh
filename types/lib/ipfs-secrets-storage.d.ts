/**
 * IPFS Secrets Storage Adapter
 * Stores encrypted secrets on IPFS via native Kubo daemon
 *
 * Priority order:
 * 1. Native IPFS (Kubo daemon on port 5001) - zero-config, no auth
 * 2. Local cache - always available for offline access
 */
import { Secret } from './secrets-manager.js';
export interface IPFSSecretsMetadata {
    environment: string;
    git_repo?: string;
    git_branch?: string;
    cid: string;
    ipns_name?: string;
    timestamp: string;
    keys_count: number;
    encrypted: boolean;
}
/**
 * IPFS Secrets Storage
 *
 * Stores encrypted secrets on IPFS with local caching
 *
 * Features:
 * - Content-addressed storage (IPFS CIDs)
 * - AES-256 encryption before upload
 * - Local cache for offline access
 * - Environment-based organization
 */
export declare class IPFSSecretsStorage {
    private cacheDir;
    private metadataPath;
    private metadata;
    constructor();
    /**
     * Initialize async parts
     */
    initialize(): Promise<void>;
    /**
     * Store secrets on IPFS
     */
    push(secrets: Secret[], environment: string, encryptionKey: string, gitRepo?: string, gitBranch?: string): Promise<string>;
    /**
     * Retrieve secrets from IPFS
     */
    pull(environment: string, encryptionKey: string, gitRepo?: string): Promise<Secret[]>;
    /**
     * Check if secrets exist for environment
     */
    exists(environment: string, gitRepo?: string): boolean;
    /**
     * Get metadata for environment
     */
    getMetadata(environment: string, gitRepo?: string): IPFSSecretsMetadata | undefined;
    /**
     * List all environments
     */
    listEnvironments(): IPFSSecretsMetadata[];
    /**
     * Delete local cached secrets for an environment
     */
    deleteLocal(environment: string, gitRepo?: string): Promise<void>;
    /**
     * Clear all local secrets metadata (~/.lsh/secrets-metadata.json), unsticking a registry
     * that no longer matches what's actually on IPFS. Local encrypted caches are left in place.
     */
    clearMetadata(): Promise<void>;
    /**
     * Encrypt secrets into the versioned AES-256-GCM envelope.
     */
    private encryptSecrets;
    /**
     * Decrypt secrets from the versioned envelope, or from a legacy CBC payload.
     *
     * Authentication is verified before the plaintext is parsed, so a tampered
     * payload can never reach `JSON.parse`.
     */
    private decryptSecrets;
    /**
     * Store encrypted data locally
     */
    private storeLocally;
    /**
     * Load encrypted data from local cache
     */
    private loadLocally;
    /**
     * Get metadata key for environment
     */
    private getMetadataKey;
    /**
     * Load metadata from disk
     */
    private loadMetadata;
    /**
     * Load metadata from disk asynchronously
     */
    private loadMetadataAsync;
    /**
     * Save metadata to disk
     */
    private saveMetadata;
}
