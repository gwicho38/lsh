/**
 * Native IPFS Sync Library
 *
 * Provides zero-config IPFS sync via local Kubo daemon (port 5001)
 * and public gateways for retrieval.
 *
 * Features:
 * - Zero-config: No authentication required
 * - Direct CID sharing: Share CIDs with teammates
 * - Public gateways: Retrieve from ipfs.io, dweb.link, cloudflare-ipfs
 */
export interface SyncHistoryEntry {
    cid: string;
    filename: string;
    timestamp: string;
    size: number;
    environment?: string;
    gitRepo?: string;
}
export interface IPFSAddResponse {
    Name: string;
    Hash: string;
    Size: string;
}
/**
 * Native IPFS Sync
 *
 * Connects to local IPFS daemon for uploads, uses public gateways for downloads.
 * No authentication required - just share CIDs with teammates.
 */
export declare class IPFSSync {
    private readonly LOCAL_IPFS_API;
    private readonly GATEWAYS;
    private historyPath;
    private lshDir;
    constructor();
    /**
     * Check if IPFS daemon is running and accessible
     */
    checkDaemon(): Promise<boolean>;
    /**
     * Get IPFS daemon info
     */
    getDaemonInfo(): Promise<{
        peerId: string;
        version: string;
    } | null>;
    /**
     * Upload data to IPFS via local daemon
     * Returns CID if successful, null on failure
     */
    upload(data: Buffer, filename: string, metadata?: {
        environment?: string;
        gitRepo?: string;
    }): Promise<string | null>;
    /**
     * Download data from IPFS
     * Tries local daemon first, then falls back to public gateways
     */
    download(cid: string): Promise<Buffer | null>;
    /**
     * Verify a CID is accessible (from any source)
     */
    verifyCid(cid: string): Promise<{
        available: boolean;
        source?: string;
    }>;
    /**
     * Pin a CID to local IPFS node
     */
    pin(cid: string): Promise<boolean>;
    /**
     * Unpin a CID from local IPFS node
     */
    unpin(cid: string): Promise<boolean>;
    /**
     * Get sync history
     */
    getHistory(limit?: number): Promise<SyncHistoryEntry[]>;
    /**
     * Save entry to sync history
     */
    private saveToHistory;
    /**
     * Get the latest CID for a specific repo/environment from history
     */
    getLatestCid(gitRepo?: string, environment?: string): Promise<string | null>;
    /**
     * Clear sync history
     */
    clearHistory(): Promise<void>;
    /**
     * Get public gateway URLs for a CID
     */
    getGatewayUrls(cid: string): string[];
}
/**
 * Get singleton IPFSSync instance
 */
export declare function getIPFSSync(): IPFSSync;
