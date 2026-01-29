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

import * as fs from 'fs';
import * as fsPromises from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { createLogger } from './logger.js';

const logger = createLogger('IPFSSync');

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
export class IPFSSync {
  // Local daemon API endpoint
  private readonly LOCAL_IPFS_API = 'http://127.0.0.1:5001/api/v0';

  // Public gateways for retrieval (in order of preference)
  private readonly GATEWAYS = [
    'https://ipfs.io/ipfs/{cid}',
    'https://dweb.link/ipfs/{cid}',
    'https://cloudflare-ipfs.com/ipfs/{cid}',
    'https://gateway.pinata.cloud/ipfs/{cid}',
  ];

  // History file location
  private historyPath: string;
  private lshDir: string;

  constructor() {
    this.lshDir = path.join(os.homedir(), '.lsh');
    this.historyPath = path.join(this.lshDir, 'ipfs-sync-history.json');

    // Ensure directory exists
    if (!fs.existsSync(this.lshDir)) {
      fs.mkdirSync(this.lshDir, { recursive: true });
    }
  }

  /**
   * Check if IPFS daemon is running and accessible
   */
  async checkDaemon(): Promise<boolean> {
    try {
      const response = await fetch(`${this.LOCAL_IPFS_API}/id`, {
        method: 'POST',
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Get IPFS daemon info
   */
  async getDaemonInfo(): Promise<{ peerId: string; version: string } | null> {
    try {
      const response = await fetch(`${this.LOCAL_IPFS_API}/id`, {
        method: 'POST',
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json() as { ID: string; AgentVersion: string };
      return {
        peerId: data.ID,
        version: data.AgentVersion,
      };
    } catch {
      return null;
    }
  }

  /**
   * Upload data to IPFS via local daemon
   * Returns CID if successful, null on failure
   */
  async upload(data: Buffer, filename: string, metadata?: { environment?: string; gitRepo?: string }): Promise<string | null> {
    const isDaemonRunning = await this.checkDaemon();
    if (!isDaemonRunning) {
      logger.error('IPFS daemon not running. Start with: lsh ipfs start');
      return null;
    }

    try {
      // Create form data with the file
      const formData = new FormData();
      // Convert Buffer to regular ArrayBuffer for Blob compatibility
      const arrayBuffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
      const blob = new Blob([arrayBuffer], { type: 'application/octet-stream' });
      formData.append('file', blob, filename);

      // Upload to local daemon
      const response = await fetch(`${this.LOCAL_IPFS_API}/add?pin=true`, {
        method: 'POST',
        body: formData,
        signal: AbortSignal.timeout(30000),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error(`IPFS upload failed: ${response.status} ${errorText}`);
        return null;
      }

      const result = await response.json() as IPFSAddResponse;
      const cid = result.Hash;

      logger.info(`📤 Uploaded to IPFS: ${cid}`);
      logger.info(`   Size: ${result.Size} bytes`);

      // Save to history
      await this.saveToHistory({
        cid,
        filename,
        timestamp: new Date().toISOString(),
        size: parseInt(result.Size, 10),
        environment: metadata?.environment,
        gitRepo: metadata?.gitRepo,
      });

      return cid;
    } catch (error) {
      const err = error as Error;
      logger.error(`IPFS upload error: ${err.message}`);
      return null;
    }
  }

  /**
   * Download data from IPFS
   * Tries local daemon first, then falls back to public gateways
   */
  async download(cid: string): Promise<Buffer | null> {
    // Try local daemon first (fastest if available)
    try {
      const localResponse = await fetch(`${this.LOCAL_IPFS_API}/cat?arg=${cid}`, {
        method: 'POST',
        signal: AbortSignal.timeout(30000),
      });

      if (localResponse.ok) {
        const arrayBuffer = await localResponse.arrayBuffer();
        logger.info(`📥 Downloaded from local IPFS: ${cid}`);
        return Buffer.from(arrayBuffer);
      }
    } catch {
      logger.debug('Local daemon download failed, trying gateways...');
    }

    // Fall back to public gateways
    for (const gatewayTemplate of this.GATEWAYS) {
      const gatewayUrl = gatewayTemplate.replace('{cid}', cid);

      try {
        const response = await fetch(gatewayUrl, {
          signal: AbortSignal.timeout(30000),
        });

        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          logger.info(`📥 Downloaded from gateway: ${gatewayUrl}`);
          return Buffer.from(arrayBuffer);
        }
      } catch {
        logger.debug(`Gateway ${gatewayUrl} failed, trying next...`);
      }
    }

    logger.error(`Failed to download CID: ${cid}`);
    return null;
  }

  /**
   * Verify a CID is accessible (from any source)
   */
  async verifyCid(cid: string): Promise<{ available: boolean; source?: string }> {
    // Check local daemon first
    const isDaemonRunning = await this.checkDaemon();
    if (isDaemonRunning) {
      try {
        const response = await fetch(`${this.LOCAL_IPFS_API}/cat?arg=${cid}&length=1`, {
          method: 'POST',
          signal: AbortSignal.timeout(10000),
        });

        if (response.ok) {
          return { available: true, source: 'local' };
        }
      } catch {
        // Continue to gateways
      }
    }

    // Check public gateways
    for (const gatewayTemplate of this.GATEWAYS) {
      const gatewayUrl = gatewayTemplate.replace('{cid}', cid);

      try {
        const response = await fetch(gatewayUrl, {
          method: 'HEAD',
          signal: AbortSignal.timeout(10000),
        });

        if (response.ok) {
          return { available: true, source: gatewayUrl };
        }
      } catch {
        // Try next gateway
      }
    }

    return { available: false };
  }

  /**
   * Pin a CID to local IPFS node
   */
  async pin(cid: string): Promise<boolean> {
    const isDaemonRunning = await this.checkDaemon();
    if (!isDaemonRunning) {
      logger.error('IPFS daemon not running');
      return false;
    }

    try {
      const response = await fetch(`${this.LOCAL_IPFS_API}/pin/add?arg=${cid}`, {
        method: 'POST',
        signal: AbortSignal.timeout(60000),
      });

      if (response.ok) {
        logger.info(`📌 Pinned: ${cid}`);
        return true;
      }

      return false;
    } catch (error) {
      const err = error as Error;
      logger.error(`Pin failed: ${err.message}`);
      return false;
    }
  }

  /**
   * Unpin a CID from local IPFS node
   */
  async unpin(cid: string): Promise<boolean> {
    const isDaemonRunning = await this.checkDaemon();
    if (!isDaemonRunning) {
      logger.error('IPFS daemon not running');
      return false;
    }

    try {
      const response = await fetch(`${this.LOCAL_IPFS_API}/pin/rm?arg=${cid}`, {
        method: 'POST',
        signal: AbortSignal.timeout(30000),
      });

      if (response.ok) {
        logger.info(`📌 Unpinned: ${cid}`);
        return true;
      }

      return false;
    } catch (error) {
      const err = error as Error;
      logger.error(`Unpin failed: ${err.message}`);
      return false;
    }
  }

  /**
   * Get sync history
   */
  async getHistory(limit?: number): Promise<SyncHistoryEntry[]> {
    try {
      if (!fs.existsSync(this.historyPath)) {
        return [];
      }

      const content = await fsPromises.readFile(this.historyPath, 'utf-8');
      const history = JSON.parse(content) as SyncHistoryEntry[];

      // Sort by timestamp (newest first) and limit
      const sorted = history.sort((a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      return limit ? sorted.slice(0, limit) : sorted;
    } catch {
      return [];
    }
  }

  /**
   * Save entry to sync history
   */
  private async saveToHistory(entry: SyncHistoryEntry): Promise<void> {
    try {
      let history: SyncHistoryEntry[] = [];

      if (fs.existsSync(this.historyPath)) {
        const content = await fsPromises.readFile(this.historyPath, 'utf-8');
        history = JSON.parse(content);
      }

      // Add new entry
      history.push(entry);

      // Keep only last 100 entries
      if (history.length > 100) {
        history = history.slice(-100);
      }

      await fsPromises.writeFile(this.historyPath, JSON.stringify(history, null, 2), 'utf-8');
    } catch (error) {
      const err = error as Error;
      logger.debug(`Failed to save history: ${err.message}`);
    }
  }

  /**
   * Get the latest CID for a specific repo/environment from history
   */
  async getLatestCid(gitRepo?: string, environment?: string): Promise<string | null> {
    const history = await this.getHistory();

    for (const entry of history) {
      // Match repo and environment if specified
      if (gitRepo && entry.gitRepo !== gitRepo) continue;
      if (environment && entry.environment !== environment) continue;

      return entry.cid;
    }

    return null;
  }

  /**
   * Clear sync history
   */
  async clearHistory(): Promise<void> {
    try {
      if (fs.existsSync(this.historyPath)) {
        await fsPromises.unlink(this.historyPath);
        logger.info('Sync history cleared');
      }
    } catch (error) {
      const err = error as Error;
      logger.error(`Failed to clear history: ${err.message}`);
    }
  }

  /**
   * Get public gateway URLs for a CID
   */
  getGatewayUrls(cid: string): string[] {
    return this.GATEWAYS.map(template => template.replace('{cid}', cid));
  }
}

// Singleton instance
let ipfsSyncInstance: IPFSSync | null = null;

/**
 * Get singleton IPFSSync instance
 */
export function getIPFSSync(): IPFSSync {
  if (!ipfsSyncInstance) {
    ipfsSyncInstance = new IPFSSync();
  }
  return ipfsSyncInstance;
}
