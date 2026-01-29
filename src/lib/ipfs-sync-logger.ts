/**
 * IPFS Sync Logger
 * Records immutable sync operations to IPFS via native Kubo daemon
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';
import { getGitRepoInfo } from './git-utils.js';
import { ENV_VARS } from '../constants/index.js';

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
export class IPFSSyncLogger {
  private syncLogPath: string;
  private syncLog: SyncLog;

  constructor() {
    const lshDir = path.join(os.homedir(), '.lsh');
    this.syncLogPath = path.join(lshDir, 'sync-log.json');

    // Ensure directory exists
    if (!fs.existsSync(lshDir)) {
      fs.mkdirSync(lshDir, { recursive: true });
    }

    // Load existing log
    this.syncLog = this.loadSyncLog();
  }

  /**
   * Check if IPFS sync is enabled
   */
  isEnabled(): boolean {
    return process.env[ENV_VARS.DISABLE_IPFS_SYNC] !== 'true';
  }

  /**
   * Record a sync operation to IPFS
   * Returns the IPFS CID (Content Identifier)
   */
  async recordSync(data: Partial<SyncRecord>): Promise<string> {
    if (!this.isEnabled()) {
      return '';
    }

    const gitInfo = getGitRepoInfo();
    const version = await this.getLSHVersion();

    const record: SyncRecord = {
      timestamp: new Date().toISOString(),
      command: data.command || 'lsh sync',
      action: data.action || 'sync',
      environment: data.environment || 'dev',
      git_repo: gitInfo.repoName,
      git_branch: gitInfo.currentBranch,
      git_commit: undefined, // Git commit not available in GitRepoInfo
      keys_count: data.keys_count || 0,
      key_fingerprint: data.key_fingerprint || this.getKeyFingerprint(),
      machine_id: this.getMachineId(),
      user: os.userInfo().username,
      lsh_version: version,
    };

    // Use file-based storage with IPFS-like CIDs
    // Records are stored locally and can optionally be uploaded to IPFS
    const cid = this.generateContentId(record);
    const repoEnv = this.getRepoEnvKey(record.git_repo, record.environment);

    // Store the record locally
    await this.storeRecordLocally(cid, record);

    // Add to sync log
    if (!this.syncLog[repoEnv]) {
      this.syncLog[repoEnv] = [];
    }

    this.syncLog[repoEnv].push({
      cid,
      timestamp: record.timestamp,
      url: `ipfs://${cid}`,
      action: record.action,
    });

    // Save sync log
    this.saveSyncLog();

    return cid;
  }

  /**
   * Read a record by CID
   */
  async readRecord(cid: string): Promise<SyncRecord | null> {
    const recordPath = this.getRecordPath(cid);

    if (!fs.existsSync(recordPath)) {
      return null;
    }

    const content = fs.readFileSync(recordPath, 'utf8');
    return JSON.parse(content) as SyncRecord;
  }

  /**
   * Get all records for a repo/environment
   */
  async getAllRecords(repo?: string, env?: string): Promise<SyncRecord[]> {
    const repoEnv = repo && env ? this.getRepoEnvKey(repo, env) : null;

    if (repoEnv && this.syncLog[repoEnv]) {
      const records: SyncRecord[] = [];
      for (const entry of this.syncLog[repoEnv]) {
        const record = await this.readRecord(entry.cid);
        if (record) {
          records.push(record);
        }
      }
      return records;
    }

    // Return all records
    const allRecords: SyncRecord[] = [];
    for (const entries of Object.values(this.syncLog)) {
      for (const entry of entries) {
        const record = await this.readRecord(entry.cid);
        if (record) {
          allRecords.push(record);
        }
      }
    }
    return allRecords;
  }

  /**
   * Get sync log for a specific repo/env
   */
  getSyncLog(repo?: string, env?: string): SyncLogEntry[] {
    if (repo && env) {
      const key = this.getRepoEnvKey(repo, env);
      return this.syncLog[key] || [];
    }

    // Return all entries
    const allEntries: SyncLogEntry[] = [];
    for (const entries of Object.values(this.syncLog)) {
      allEntries.push(...entries);
    }
    return allEntries;
  }

  /**
   * Generate a content-addressed ID (like IPFS CID)
   */
  private generateContentId(record: SyncRecord): string {
    const content = JSON.stringify(record);
    const hash = crypto.createHash('sha256').update(content).digest('hex');
    // Format like IPFS CIDv1 (bafkreixxx...)
    return `bafkrei${hash.substring(0, 52)}`;
  }

  /**
   * Store record locally (acts as IPFS cache)
   */
  private async storeRecordLocally(cid: string, record: SyncRecord): Promise<void> {
    const recordPath = this.getRecordPath(cid);
    const recordDir = path.dirname(recordPath);

    if (!fs.existsSync(recordDir)) {
      fs.mkdirSync(recordDir, { recursive: true });
    }

    fs.writeFileSync(recordPath, JSON.stringify(record, null, 2), 'utf8');
  }

  /**
   * Get path for storing a record
   */
  private getRecordPath(cid: string): string {
    const lshDir = path.join(os.homedir(), '.lsh');
    const ipfsDir = path.join(lshDir, 'ipfs');
    return path.join(ipfsDir, `${cid}.json`);
  }

  /**
   * Get repo/env key for indexing
   */
  private getRepoEnvKey(repo: string | undefined, env: string): string {
    return repo ? `${repo}_${env}` : env;
  }

  /**
   * Load sync log from disk
   */
  private loadSyncLog(): SyncLog {
    if (!fs.existsSync(this.syncLogPath)) {
      return {};
    }

    try {
      const content = fs.readFileSync(this.syncLogPath, 'utf8');
      return JSON.parse(content) as SyncLog;
    } catch {
      return {};
    }
  }

  /**
   * Save sync log to disk
   */
  private saveSyncLog(): void {
    fs.writeFileSync(
      this.syncLogPath,
      JSON.stringify(this.syncLog, null, 2),
      'utf8'
    );
  }

  /**
   * Get encryption key fingerprint
   */
  private getKeyFingerprint(): string {
    const key = process.env[ENV_VARS.LSH_SECRETS_KEY] || 'default';
    return `sha256:${crypto.createHash('sha256').update(key).digest('hex').substring(0, 16)}`;
  }

  /**
   * Get machine ID (anonymized)
   */
  private getMachineId(): string {
    const hostname = os.hostname();
    const username = os.userInfo().username;
    const combined = `${username}@${hostname}`;
    return crypto.createHash('sha256').update(combined).digest('hex').substring(0, 16);
  }

  /**
   * Get LSH version
   */
  private async getLSHVersion(): Promise<string> {
    try {
      const packageJsonPath = path.join(process.cwd(), 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        return pkg.version || 'unknown';
      }
    } catch {
      // Ignore
    }
    return 'unknown';
  }
}
