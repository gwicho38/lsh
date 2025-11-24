/**
 * IPFS Secrets Storage Adapter
 * Stores encrypted secrets on IPFS using Storacha (formerly web3.storage)
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';
import { Secret } from './secrets-manager.js';
import { createLogger } from './logger.js';
import { getStorachaClient } from './storacha-client.js';

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
    const homeDir = process.env.HOME || os.homedir();
    const lshDir = path.join(homeDir, '.lsh');
    this.cacheDir = path.join(lshDir, 'secrets-cache');
    this.metadataPath = path.join(lshDir, 'secrets-metadata.json');

    // Ensure directories exist
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }

    // Load metadata
    this.metadata = this.loadMetadata();
  }

  /**
   * Store secrets on IPFS
   */
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
      this.saveMetadata();

      logger.info(`📦 Stored ${secrets.length} secrets on IPFS: ${cid}`);
      logger.info(`   Environment: ${environment}`);
      if (gitRepo) {
        logger.info(`   Repository: ${gitRepo}/${gitBranch || 'main'}`);
      }

      // Upload to Storacha network if enabled
      const storacha = getStorachaClient();
      if (storacha.isEnabled()) {
        try {
          const filename = `lsh-secrets-${environment}-${cid}.encrypted`;
          // encryptedData is already a Buffer, pass it directly
          await storacha.upload(Buffer.from(encryptedData), filename);
          logger.info(`   ☁️  Synced to Storacha network`);
        } catch (error) {
          const err = error as Error;
          logger.warn(`   ⚠️  Storacha upload failed: ${err.message}`);
          logger.warn(`   Secrets are still cached locally`);
        }
      }

      return cid;
    } catch (error) {
      const err = error as Error;
      logger.error(`Failed to push secrets to IPFS: ${err.message}`);
      throw error;
    }
  }

  /**
   * Retrieve secrets from IPFS
   */
  async pull(
    environment: string,
    encryptionKey: string,
    gitRepo?: string
  ): Promise<Secret[]> {
    try {
      const metadataKey = this.getMetadataKey(gitRepo, environment);
      const metadata = this.metadata[metadataKey];

      if (!metadata) {
        throw new Error(`No secrets found for environment: ${environment}`);
      }

      // Try to load from local cache
      let cachedData = await this.loadLocally(metadata.cid);

      // If not in cache, try downloading from Storacha
      if (!cachedData) {
        const storacha = getStorachaClient();
        if (storacha.isEnabled()) {
          try {
            logger.info(`   ☁️  Downloading from Storacha network...`);
            const downloadedData = await storacha.download(metadata.cid);
            // Store in local cache for future use
            await this.storeLocally(metadata.cid, downloadedData.toString('utf-8'), environment);
            cachedData = downloadedData.toString('utf-8');
            logger.info(`   ✅ Downloaded and cached from Storacha`);
          } catch (error) {
            const err = error as Error;
            throw new Error(`Secrets not in cache and Storacha download failed: ${err.message}`);
          }
        } else {
          throw new Error(`Secrets not found in cache. CID: ${metadata.cid}\n\n` +
            `💡 Tip: Enable Storacha network sync:\n` +
            `   export LSH_STORACHA_ENABLED=true\n` +
            `   Or set up Supabase: lsh supabase init`);
        }
      }

      // At this point cachedData is guaranteed to be a string
      if (!cachedData) {
        throw new Error(`Failed to retrieve secrets for environment: ${environment}`);
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
  exists(environment: string, gitRepo?: string): boolean {
    const metadataKey = this.getMetadataKey(gitRepo, environment);
    return !!this.metadata[metadataKey];
  }

  /**
   * Get metadata for environment
   */
  getMetadata(environment: string, gitRepo?: string): IPFSSecretsMetadata | undefined {
    const metadataKey = this.getMetadataKey(gitRepo, environment);
    return this.metadata[metadataKey];
  }

  /**
   * List all environments
   */
  listEnvironments(): IPFSSecretsMetadata[] {
    return Object.values(this.metadata);
  }

  /**
   * Delete secrets for environment
   */
  async delete(environment: string, gitRepo?: string): Promise<void> {
    const metadataKey = this.getMetadataKey(gitRepo, environment);
    const metadata = this.metadata[metadataKey];

    if (metadata) {
      // Delete local cache
      const cachePath = path.join(this.cacheDir, `${metadata.cid}.encrypted`);
      if (fs.existsSync(cachePath)) {
        fs.unlinkSync(cachePath);
      }

      // Remove metadata
      delete this.metadata[metadataKey];
      this.saveMetadata();

      logger.info(`🗑️  Deleted secrets for ${environment}`);
    }
  }

  /**
   * Encrypt secrets using AES-256
   */
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
  private decryptSecrets(encryptedData: string, encryptionKey: string): Secret[] {
    const [ivHex, encrypted] = encryptedData.split(':');
    const key = crypto.createHash('sha256').update(encryptionKey).digest();
    const iv = Buffer.from(ivHex, 'hex');

    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return JSON.parse(decrypted) as Secret[];
  }

  /**
   * Generate IPFS-compatible CID from content
   */
  private generateCID(content: string): string {
    const hash = crypto.createHash('sha256').update(content).digest('hex');
    // Format like IPFS CIDv1 (bafkreixxx...)
    return `bafkrei${hash.substring(0, 52)}`;
  }

  /**
   * Store encrypted data locally
   */
  private async storeLocally(cid: string, encryptedData: string, environment: string): Promise<void> {
    const cachePath = path.join(this.cacheDir, `${cid}.encrypted`);
    fs.writeFileSync(cachePath, encryptedData, 'utf8');

    logger.debug(`Cached secrets locally: ${cachePath}`);
  }

  /**
   * Load encrypted data from local cache
   */
  private async loadLocally(cid: string): Promise<string | null> {
    const cachePath = path.join(this.cacheDir, `${cid}.encrypted`);

    if (!fs.existsSync(cachePath)) {
      return null;
    }

    return fs.readFileSync(cachePath, 'utf8');
  }

  /**
   * Get metadata key for environment
   */
  private getMetadataKey(gitRepo: string | undefined, environment: string): string {
    return gitRepo ? `${gitRepo}_${environment}` : environment;
  }

  /**
   * Load metadata from disk
   */
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
   * Save metadata to disk
   */
  private saveMetadata(): void {
    fs.writeFileSync(
      this.metadataPath,
      JSON.stringify(this.metadata, null, 2),
      'utf8'
    );
  }
}
