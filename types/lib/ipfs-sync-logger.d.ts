/**
 * IPFS Sync Logger
 * Records immutable sync operations to IPFS via native Kubo daemon
 */
export interface SyncRecord {
    timestamp: string;
    command: string;
    action: 'push' | 'pull' | 'sync' | 'create';
    environment: string;
    git_repo?: string;
    git_branch?: string;
    git_commit?: string;
    keys_count: number;
    key_fingerprint: string;
    machine_id: string;
    user: string;
    lsh_version: string;
}
export interface SyncLogEntry {
    cid: string;
    timestamp: string;
    url: string;
    action: string;
}
export interface SyncLog {
    [repoEnv: string]: SyncLogEntry[];
}
/**
 * IPFS Sync Logger
 *
 * Stores immutable sync records on IPFS via native daemon
 *
 * Features:
 * - Zero-config: Works with local IPFS daemon
 * - Immutable: Content-addressed storage on IPFS
 * - Privacy: Only metadata stored, no secrets
 * - Opt-out: Can be disabled via DISABLE_IPFS_SYNC config
 */
export declare class IPFSSyncLogger {
    private syncLogPath;
    private syncLog;
    constructor();
    /**
     * Check if IPFS sync is enabled
     */
    isEnabled(): boolean;
    /**
     * Record a sync operation to IPFS
     * Returns the IPFS CID (Content Identifier)
     */
    recordSync(data: Partial<SyncRecord>): Promise<string>;
    /**
     * Read a record by CID
     */
    readRecord(cid: string): Promise<SyncRecord | null>;
    /**
     * Get all records for a repo/environment
     */
    getAllRecords(repo?: string, env?: string): Promise<SyncRecord[]>;
    /**
     * Get sync log for a specific repo/env
     */
    getSyncLog(repo?: string, env?: string): SyncLogEntry[];
    /**
     * Generate a content-addressed ID (like IPFS CID)
     */
    private generateContentId;
    /**
     * Store record locally (acts as IPFS cache)
     */
    private storeRecordLocally;
    /**
     * Get path for storing a record
     */
    private getRecordPath;
    /**
     * Get repo/env key for indexing
     */
    private getRepoEnvKey;
    /**
     * Load sync log from disk
     */
    private loadSyncLog;
    /**
     * Save sync log to disk
     */
    private saveSyncLog;
    /**
     * Get encryption key fingerprint
     */
    private getKeyFingerprint;
    /**
     * Get machine ID (anonymized)
     */
    private getMachineId;
    /**
     * Get LSH version
     */
    private getLSHVersion;
}
