/**
 * IPFS Secrets Storage Adapter
 * Stores encrypted secrets on IPFS using Storacha (formerly web3.storage)
 */

import * as fs from 'fs';
import * as fsPromises from 'fs/promises';

import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';
import { Secret } from './secrets-manager.js';
import { createLogger } from './logger.js';
import { getStorachaClient } from './storacha-client.js';
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

      // Upload to Storacha network if enabled
      const storacha = getStorachaClient();
      if (storacha.isEnabled()) {
        try {
          // Ensure project-specific space is active before uploading
          // This creates/selects a space named after the git repo or directory
          if (await storacha.isAuthenticated()) {
            const projectName = gitRepo || storacha.getProjectName();
            await storacha.ensureProjectSpace(projectName);
          }

          const filename = `lsh-secrets-${environment}-${cid}.encrypted`;
          // encryptedData is already a Buffer, pass it directly
          await storacha.upload(Buffer.from(encryptedData), filename);
          logger.info(`   ☁️  Synced to Storacha network`);

          // Upload registry file if this is a git repo
          // This allows detection on new machines without local metadata
          // Include the secrets CID so other hosts can fetch the latest version
          if (gitRepo) {
            try {
              await storacha.uploadRegistry(gitRepo, environment, cid);
              logger.debug(`   📝 Registry uploaded for ${gitRepo} (CID: ${cid})`);
            } catch (regError) {
              // Registry upload failed, but secrets are still uploaded
              const _regErr = regError as Error;
              logger.debug(`   Registry upload failed: ${_regErr.message}`);
            }
          }
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
      let metadata = this.metadata[metadataKey];

      // Construct display name for error messages
      const displayEnv = gitRepo
        ? (environment ? `${gitRepo}_${environment}` : gitRepo)
        : (environment || 'default');

      // If no local metadata, try to fetch from Storacha registry first (for git repos)
      if (!metadata && gitRepo) {
        try {
          const storacha = getStorachaClient();
          if (storacha.isEnabled() && await storacha.isAuthenticated()) {
            // Ensure project-specific space is active before registry check
            const projectName = gitRepo || storacha.getProjectName();
            await storacha.ensureProjectSpace(projectName);

            logger.info(`   🔍 No local metadata found, checking Storacha registry...`);
            const latestCid = await storacha.getLatestCID(gitRepo);
            if (latestCid) {
              logger.info(`   ✅ Found secrets in registry (CID: ${latestCid})`);
              // Create metadata from registry
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
          }
        } catch (error) {
          // Registry check failed, continue to error
          const err = error as Error;
          logger.debug(`   Registry check failed: ${err.message}`);
        }
      }

      if (!metadata) {
        throw new Error(`No secrets found for environment: ${displayEnv}\n\n` +
          `💡 Tip: Check available environments with: lsh env\n` +
          `   Or push secrets first with: lsh push`);
      }

      // Check if there's a newer version in the registry (for git repos)
      if (gitRepo) {
        try {
          const storacha = getStorachaClient();
          if (storacha.isEnabled() && await storacha.isAuthenticated()) {
            // Ensure project-specific space is active
            const projectName = gitRepo || storacha.getProjectName();
            await storacha.ensureProjectSpace(projectName);

            const latestCid = await storacha.getLatestCID(gitRepo);
            if (latestCid && latestCid !== metadata.cid) {
              logger.info(`   🔄 Found newer version in registry (CID: ${latestCid})`);
              // Update metadata with latest CID
              metadata = {
                ...metadata,
                cid: latestCid,
                timestamp: new Date().toISOString(),
              };
              this.metadata[metadataKey] = metadata;
              await this.saveMetadata();
            }
          }
        } catch (error) {
          // Registry check failed, continue with local metadata
          const err = error as Error;
          logger.debug(`   Registry check failed: ${err.message}`);
        }
      }

      // Try to load from local cache
      let cachedData = await this.loadLocally(metadata.cid);

      // If not in cache, try downloading from Storacha
      if (!cachedData) {
        const storacha = getStorachaClient();
        if (storacha.isEnabled()) {
          try {
            // Ensure project-specific space is active before download
            if (await storacha.isAuthenticated()) {
              const projectName = gitRepo || storacha.getProjectName();
              await storacha.ensureProjectSpace(projectName);
            }

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
   * Delete local cached secrets for an environment
   */
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
          '  3. Generate a shared key with: lsh secrets key\n' +
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
  private generateCID(content: string): string {
    const hash = crypto.createHash('sha256').update(content).digest('hex');
    // Format like IPFS CIDv1 (bafkreixxx...)
    return `bafkrei${hash.substring(0, 52)}`;
  }

  /**
   * Store encrypted data locally
   */
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
   * Load metadata from disk asynchronously
   */
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
