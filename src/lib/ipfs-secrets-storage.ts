/**
 * IPFS Secrets Storage Adapter
 * Stores encrypted secrets on IPFS via native Kubo daemon
 *
 * Priority order:
 * 1. Native IPFS (Kubo daemon on port 5001) - zero-config, no auth
 * 2. Local cache - always available for offline access
 */

import * as fs from 'fs';
import * as fsPromises from 'fs/promises';

import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';
import { Secret } from './secrets-manager.js';
import { createLogger } from './logger.js';
import { getIPFSSync } from './ipfs-sync.js';
import { ENV_VARS } from '../constants/index.js';

const logger = createLogger('IPFSSecretsStorage');

export interface IPFSSecretsMetadata {
  environment: string;
  git_repo?: string;
  git_branch?: string;
  cid: string;
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
export class IPFSSecretsStorage {
  private cacheDir: string;
  private metadataPath: string;
  private metadata: Record<string, IPFSSecretsMetadata>;

  constructor() {
    const homeDir = process.env[ENV_VARS.HOME] || os.homedir();
    const lshDir = path.join(homeDir, '.lsh');
    this.cacheDir = path.join(lshDir, 'secrets-cache');
    this.metadataPath = path.join(lshDir, 'secrets-metadata.json');

    // Load metadata synchronously to ensure we have all existing entries
    // This fixes the bug where sequential pushes from different repos
    // would overwrite each other's metadata
    this.metadata = this.loadMetadata();

    // Ensure cache directory exists
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  /**
   * Initialize async parts
   */
  // TODO(@gwicho38): Review - initialize
  async initialize(): Promise<void> {
    // Ensure directories exist
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }

    // Load metadata
    this.metadata = await this.loadMetadataAsync();
  }

  /**
   * Store secrets on IPFS
   */
  // TODO(@gwicho38): Review - push
  async push(
    secrets: Secret[],
    environment: string,
    encryptionKey: string,
    gitRepo?: string,
    gitBranch?: string
  ): Promise<string> {
    try {
      // Encrypt secrets
      const encryptedData = this.encryptSecrets(secrets, encryptionKey);

      // Generate CID from encrypted content
      const cid = this.generateCID(encryptedData);

      // Store locally (cache)
      await this.storeLocally(cid, encryptedData, environment);

      // Update metadata
      const metadata: IPFSSecretsMetadata = {
        environment,
        git_repo: gitRepo,
        git_branch: gitBranch,
        cid,
        timestamp: new Date().toISOString(),
        keys_count: secrets.length,
        encrypted: true,
      };

      this.metadata[this.getMetadataKey(gitRepo, environment)] = metadata;
      await this.saveMetadata();

      logger.info(`📦 Stored ${secrets.length} secrets on IPFS: ${cid}`);
      logger.info(`   Environment: ${environment}`);
      if (gitRepo) {
        logger.info(`   Repository: ${gitRepo}/${gitBranch || 'main'}`);
      }

      // Try native IPFS upload
      const ipfsSync = getIPFSSync();
      let uploadedToNetwork = false;
      let realCid: string | null = null;

      if (await ipfsSync.checkDaemon()) {
        try {
          const filename = `lsh-secrets-${environment}.encrypted`;
          realCid = await ipfsSync.upload(
            Buffer.from(encryptedData, 'utf-8'),
            filename,
            { environment, gitRepo }
          );

          if (realCid) {
            // Update CID to the real IPFS CID
            logger.info(`   🌐 Synced to IPFS (CID: ${realCid})`);
            uploadedToNetwork = true;

            // Update metadata with real CID if different
            if (realCid !== cid) {
              metadata.cid = realCid;
              this.metadata[this.getMetadataKey(gitRepo, environment)] = metadata;
              await this.saveMetadata();
            }
          }
        } catch (error) {
          const err = error as Error;
          logger.warn(`   ⚠️  IPFS upload failed: ${err.message}`);
        }
      }

      if (!uploadedToNetwork) {
        logger.warn(`   📁 Secrets cached locally only (no network sync)`);
        logger.warn(`   💡 Start IPFS daemon for network sync: lsh ipfs start`);
      }

      return realCid || cid;
    } catch (error) {
      const err = error as Error;
      logger.error(`Failed to push secrets to IPFS: ${err.message}`);
      throw error;
    }
  }

  /**
   * Retrieve secrets from IPFS
   */
  // TODO(@gwicho38): Review - pull
  async pull(
    environment: string,
    encryptionKey: string,
    gitRepo?: string
  ): Promise<Secret[]> {
    try {
      const metadataKey = this.getMetadataKey(gitRepo, environment);
      let metadata = this.metadata[metadataKey];

      // Construct display name for error messages
      const displayEnv = gitRepo
        ? (environment ? `${gitRepo}_${environment}` : gitRepo)
        : (environment || 'default');

      // If no local metadata, check IPFS sync history
      if (!metadata && gitRepo) {
        try {
          const ipfsSync = getIPFSSync();
          const latestCid = await ipfsSync.getLatestCid(gitRepo, environment);

          if (latestCid) {
            logger.info(`   ✅ Found secrets in IPFS history (CID: ${latestCid})`);
            // Create metadata from history
            metadata = {
              environment,
              git_repo: gitRepo,
              cid: latestCid,
              timestamp: new Date().toISOString(),
              keys_count: 0, // Unknown until decrypted
              encrypted: true,
            };
            this.metadata[metadataKey] = metadata;
            await this.saveMetadata();
          }
        } catch (error) {
          // History check failed, continue to error
          const err = error as Error;
          logger.debug(`   IPFS history check failed: ${err.message}`);
        }
      }

      if (!metadata) {
        throw new Error(`No secrets found for environment: ${displayEnv}\n\n` +
          `💡 Tip: Check available environments with: lsh env\n` +
          `   Or push secrets first with: lsh push\n` +
          `   Or pull by CID with: lsh sync pull <cid>`);
      }

      // Try to load from local cache
      let cachedData = await this.loadLocally(metadata.cid);

      // If not in cache, try downloading from IPFS
      if (!cachedData) {
        const ipfsSync = getIPFSSync();

        try {
          logger.info(`   🌐 Downloading from IPFS...`);
          const downloadedData = await ipfsSync.download(metadata.cid);

          if (downloadedData) {
            // Store in local cache for future use
            await this.storeLocally(metadata.cid, downloadedData.toString('utf-8'), environment);
            cachedData = downloadedData.toString('utf-8');
            logger.info(`   ✅ Downloaded and cached from IPFS`);
          }
        } catch (error) {
          const err = error as Error;
          logger.debug(`   IPFS download failed: ${err.message}`);
        }
      }

      if (!cachedData) {
        throw new Error(`Secrets not found in cache or IPFS. CID: ${metadata.cid}\n\n` +
          `💡 Tip: Start IPFS daemon: lsh ipfs start\n` +
          `   Or pull directly by CID: lsh sync pull <cid>`);
      }

      // Decrypt secrets
      const secrets = this.decryptSecrets(cachedData, encryptionKey);

      logger.info(`📥 Retrieved ${secrets.length} secrets from IPFS`);
      logger.info(`   CID: ${metadata.cid}`);
      logger.info(`   Environment: ${environment}`);

      return secrets;
    } catch (error) {
      const err = error as Error;
      logger.error(`Failed to pull secrets from IPFS: ${err.message}`);
      throw error;
    }
  }

  /**
   * Check if secrets exist for environment
   */
  // TODO(@gwicho38): Review - exists
  exists(environment: string, gitRepo?: string): boolean {
    const metadataKey = this.getMetadataKey(gitRepo, environment);
    return !!this.metadata[metadataKey];
  }

  /**
   * Get metadata for environment
   */
  // TODO(@gwicho38): Review - getMetadata
  getMetadata(environment: string, gitRepo?: string): IPFSSecretsMetadata | undefined {
    const metadataKey = this.getMetadataKey(gitRepo, environment);
    return this.metadata[metadataKey];
  }

  /**
   * List all environments
   */
  // TODO(@gwicho38): Review - listEnvironments
  listEnvironments(): IPFSSecretsMetadata[] {
    return Object.values(this.metadata);
  }

  /**
   * Delete local cached secrets for an environment
   */
  // TODO(@gwicho38): Review - deleteLocal
  async deleteLocal(environment: string, gitRepo?: string): Promise<void> {
    const metadataKey = this.getMetadataKey(gitRepo, environment);
    const metadata = this.metadata[metadataKey];

    if (metadata) {
      // Delete local cache
      const cachePath = path.join(this.cacheDir, `${metadata.cid}.encrypted`);
      try {
        await fsPromises.access(cachePath);
        await fsPromises.unlink(cachePath);
      } catch {
        // File doesn't exist, which is fine
      }

      // Remove metadata
      delete this.metadata[metadataKey];
      await this.saveMetadata();

      logger.info(`🗑️  Deleted secrets for ${environment}`);
    }
  }

  /**
   * Encrypt secrets using AES-256
   */
  // TODO(@gwicho38): Review - encryptSecrets
  private encryptSecrets(secrets: Secret[], encryptionKey: string): string {
    const data = JSON.stringify(secrets);
    const key = crypto.createHash('sha256').update(encryptionKey).digest();
    const iv = crypto.randomBytes(16);

    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Return IV + encrypted data
    return iv.toString('hex') + ':' + encrypted;
  }

  /**
   * Decrypt secrets using AES-256
   */
  // TODO(@gwicho38): Review - decryptSecrets
  private decryptSecrets(encryptedData: string, encryptionKey: string): Secret[] {
    try {
      const [ivHex, encrypted] = encryptedData.split(':');
      const key = crypto.createHash('sha256').update(encryptionKey).digest();
      const iv = Buffer.from(ivHex, 'hex');

      const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return JSON.parse(decrypted) as Secret[];
    } catch (error) {
      const err = error as Error;
      // Catch crypto errors (bad decrypt, wrong block length) AND JSON parse errors
      // (wrong key can produce garbage that fails JSON.parse)
      if (err.message.includes('bad decrypt') ||
          err.message.includes('wrong final block length') ||
          err.message.includes('Unexpected token') ||
          err.message.includes('JSON')) {
        throw new Error(
          'Decryption failed. This usually means:\n' +
          '  1. You need to set LSH_SECRETS_KEY environment variable\n' +
          '  2. The key must match the one used during encryption\n' +
          '  3. Generate a shared key with: lsh key\n' +
          '  4. Add it to your .env: LSH_SECRETS_KEY=<key>\n' +
          '\nOriginal error: ' + err.message
        );
      }
      throw error;
    }
  }

  /**
   * Generate IPFS-compatible CID from content
   */
  // TODO(@gwicho38): Review - generateCID
  private generateCID(content: string): string {
    const hash = crypto.createHash('sha256').update(content).digest('hex');
    // Format like IPFS CIDv1 (bafkreixxx...)
    return `bafkrei${hash.substring(0, 52)}`;
  }

  /**
   * Store encrypted data locally
   */
  // TODO(@gwicho38): Review - storeLocally
  private async storeLocally(cid: string, encryptedData: string, _environment: string): Promise<void> {
    const cachePath = path.join(this.cacheDir, `${cid}.encrypted`);

    // Ensure parent directory exists
    await fsPromises.mkdir(this.cacheDir, { recursive: true });

    // Write file without locking (simpler approach)
    await fsPromises.writeFile(cachePath, encryptedData, 'utf8');
    logger.debug(`Cached secrets locally: ${cachePath}`);
  }

  /**
   * Load encrypted data from local cache
   */
  // TODO(@gwicho38): Review - loadLocally
  private async loadLocally(cid: string): Promise<string | null> {
    const cachePath = path.join(this.cacheDir, `${cid}.encrypted`);

    try {
      await fsPromises.access(cachePath);
    } catch {
      return null;
    }

    // Simple read without locking for now
    return await fsPromises.readFile(cachePath, 'utf8');
  }

  /**
   * Get metadata key for environment
   */
  // TODO(@gwicho38): Review - getMetadataKey
  private getMetadataKey(gitRepo: string | undefined, environment: string): string {
    return gitRepo ? `${gitRepo}_${environment}` : environment;
  }

  /**
   * Load metadata from disk
   */
  // TODO(@gwicho38): Review - loadMetadata
  private loadMetadata(): Record<string, IPFSSecretsMetadata> {
    if (!fs.existsSync(this.metadataPath)) {
      return {};
    }

    try {
      const content = fs.readFileSync(this.metadataPath, 'utf8');
      return JSON.parse(content);
    } catch {
      return {};
    }
  }

  /**
   * Load metadata from disk asynchronously
   */
  // TODO(@gwicho38): Review - loadMetadataAsync
  private async loadMetadataAsync(): Promise<Record<string, IPFSSecretsMetadata>> {
    try {
      await fsPromises.access(this.metadataPath);
    } catch {
      return {};
    }

    try {
      const content = await fsPromises.readFile(this.metadataPath, 'utf8');
      return JSON.parse(content);
    } catch {
      return {};
    }
  }

  /**
   * Save metadata to disk
   */
  // TODO(@gwicho38): Review - saveMetadata
  private async saveMetadata(): Promise<void> {
    // Ensure parent directory exists
    const parentDir = path.dirname(this.metadataPath);
    await fsPromises.mkdir(parentDir, { recursive: true });

    await fsPromises.writeFile(
      this.metadataPath,
      JSON.stringify(this.metadata, null, 2),
      'utf8'
    );
  }
}
