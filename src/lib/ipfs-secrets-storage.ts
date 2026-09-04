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
import { getDiscoveryBackend } from './discovery-backend.js';
import { ENV_VARS, DEFAULTS } from '../constants/index.js';
import { extractErrorMessage } from './lsh-error.js';
import { writeSecretFileSync } from './secure-file-writer.js';

const logger = createLogger('IPFSSecretsStorage');

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

      // Upload to IPFS (daemon guaranteed running by ensureDaemonRunning)
      const ipfsSync = getIPFSSync();
      const filename = `lsh-secrets-${environment}.encrypted`;
      const cid = await ipfsSync.upload(
        Buffer.from(encryptedData, 'utf-8'),
        filename,
        { environment, gitRepo }
      );

      if (!cid) {
        throw new Error('IPFS upload failed. Is the daemon running? Check: lsh sync --status');
      }

      // Cache locally for fast re-reads
      await this.storeLocally(cid, encryptedData, environment);

      // Update metadata with real CID
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

      // Publish to IPNS
      if (encryptionKey) {
        try {
          const repoName = gitRepo || DEFAULTS.DEFAULT_ENVIRONMENT;
          const env = environment || DEFAULTS.DEFAULT_ENVIRONMENT;
          const discovery = getDiscoveryBackend(ipfsSync);
          const publishedName = await discovery.publish({ secretsKey: encryptionKey, repoName, env, cid });

          if (publishedName) {
            metadata.ipns_name = publishedName;
            this.metadata[this.getMetadataKey(gitRepo, environment)] = metadata;
            await this.saveMetadata();
            logger.info(`   🔗 Published to ${discovery.id}: ${publishedName}`);
          }
        } catch (error) {
          logger.error(
            `Content uploaded (CID: ${cid}) but IPNS publish failed: ${extractErrorMessage(error)}\n` +
            `Other machines won't find it via 'lsh pull' until you re-push.`
          );
        }
      }

      // Durable remote pin (best-effort): survives this machine going offline.
      // No-op unless a kubo remote pinning service is configured.
      const pinnedService = await ipfsSync.addRemotePin(cid, `lsh-${gitRepo || DEFAULTS.DEFAULT_ENVIRONMENT}-${environment}`);
      if (pinnedService) {
        logger.info(`   📌 Remote-pinned to "${pinnedService}" (durable)`);
      } else {
        logger.warn('No remote pin — content lives only on this machine until a peer caches it. Configure LSH_PIN_SERVICE for durability.');
      }

      return cid;
    } catch (error) {
      logger.error(`Failed to push secrets to IPFS: ${extractErrorMessage(error)}`);
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
      const ipfsSync = getIPFSSync();

      // Step 1: Always resolve via IPNS (source of truth)
      let resolvedCid: string | null = null;

      if (encryptionKey) {
        try {
          const repoName = gitRepo || DEFAULTS.DEFAULT_ENVIRONMENT;
          const env = environment || DEFAULTS.DEFAULT_ENVIRONMENT;
          const discovery = getDiscoveryBackend(ipfsSync);
          const resolved = await discovery.resolve({ secretsKey: encryptionKey, repoName, env });
          const ipnsName = resolved.name;

          if (ipnsName) {
            logger.info(`   🔍 Resolving via IPNS: ${ipnsName.substring(0, 20)}...`);
            resolvedCid = resolved.cid;

            if (resolvedCid) {
              logger.info(`   ✅ IPNS resolved to CID: ${resolvedCid}`);

              // Update local metadata
              const metadataKey = this.getMetadataKey(gitRepo, environment);
              this.metadata[metadataKey] = {
                environment,
                git_repo: gitRepo,
                cid: resolvedCid,
                ipns_name: ipnsName,
                timestamp: new Date().toISOString(),
                keys_count: 0,
                encrypted: true,
              };
              await this.saveMetadata();
            }
          }
        } catch (error) {
          logger.debug(`   IPNS resolution error: ${extractErrorMessage(error)}`);
        }
      }

      // No fallback to local metadata — IPNS is the source of truth
      if (!resolvedCid) {
        throw new Error(
          'Could not resolve secrets from network.\n\n' +
          'Possible causes:\n' +
          '  - The machine that pushed secrets is offline or IPFS daemon stopped\n' +
          '  - IPNS record hasn\'t propagated yet (try again in 30s)\n' +
          '  - Network connectivity issue\n' +
          '  - IPNS record expired from DHT (records are cached ~24-48h;\n' +
          '    the publishing machine must be online periodically)\n\n' +
          'Troubleshooting:\n' +
          '  lsh sync --status  # Check local daemon\n' +
          '  lsh sync --doctor  # Full health check'
        );
      }

      // Step 2: Load content — try cache first, then IPFS download
      let cachedData = await this.loadLocally(resolvedCid);

      if (!cachedData) {
        try {
          logger.info(`   🌐 Downloading from IPFS...`);
          const downloadedData = await ipfsSync.download(resolvedCid);

          if (downloadedData) {
            await this.storeLocally(resolvedCid, downloadedData.toString('utf-8'), environment);
            cachedData = downloadedData.toString('utf-8');
            logger.info(`   ✅ Downloaded and cached from IPFS`);
          }
        } catch (error) {
          logger.debug(`   IPFS download failed: ${extractErrorMessage(error)}`);
        }
      }

      if (!cachedData) {
        throw new Error(`Secrets resolved via IPNS (CID: ${resolvedCid}) but download failed.\n\n` +
          `💡 The source machine may be offline. Try again when it's online.`);
      }

      // Step 3: Decrypt
      const secrets = this.decryptSecrets(cachedData, encryptionKey);

      // Now that the payload is decrypted, record the real key count
      const metadataKey = this.getMetadataKey(gitRepo, environment);
      if (this.metadata[metadataKey]) {
        this.metadata[metadataKey].keys_count = secrets.length;
        await this.saveMetadata();
      }

      logger.info(`📥 Retrieved ${secrets.length} secrets from IPFS`);
      logger.info(`   CID: ${resolvedCid}`);
      logger.info(`   Environment: ${environment}`);

      return secrets;
    } catch (error) {
      logger.error(`Failed to pull secrets from IPFS: ${extractErrorMessage(error)}`);
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
   * Clear all local secrets metadata (~/.lsh/secrets-metadata.json), unsticking a registry
   * that no longer matches what's actually on IPFS. Local encrypted caches are left in place.
   */
  async clearMetadata(): Promise<void> {
    this.metadata = {};
    try {
      await fsPromises.unlink(this.metadataPath);
    } catch {
      // File doesn't exist, which is fine
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
      const msg = extractErrorMessage(error);
      // Catch crypto errors (bad decrypt, wrong block length) AND JSON parse errors
      // (wrong key can produce garbage that fails JSON.parse)
      if (msg.includes('bad decrypt') ||
          msg.includes('wrong final block length') ||
          msg.includes('Unexpected token') ||
          msg.includes('JSON')) {
        throw new Error(
          'Decryption failed. This usually means:\n' +
          '  1. You need to set LSH_SECRETS_KEY environment variable\n' +
          '  2. The key must match the one used during encryption\n' +
          '  3. Generate a shared key with: lsh sync --key\n' +
          '  4. Add it to your .env: LSH_SECRETS_KEY=<key>\n' +
          '\nOriginal error: ' + msg,
          { cause: error }
        );
      }
      throw error;
    }
  }

  /**
   * Store encrypted data locally
   */
  private async storeLocally(cid: string, encryptedData: string, _environment: string): Promise<void> {
    const cachePath = path.join(this.cacheDir, `${cid}.encrypted`);

    // Ciphertext cache: still key-derived material, so owner-only and atomic.
    writeSecretFileSync(cachePath, encryptedData);
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
    // Metadata records key fingerprints alongside CIDs — owner-only and atomic.
    writeSecretFileSync(this.metadataPath, JSON.stringify(this.metadata, null, 2));
  }
}
