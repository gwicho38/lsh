/**
 * Storacha Client Wrapper
 * Provides IPFS network sync via Storacha (formerly web3.storage)
 */

import * as Storacha from '@storacha/client';
import type { Client } from '@storacha/client';
import * as fs from 'fs';
import * as path from 'path';
import { homedir } from 'os';
import { logger } from './logger.js';
import { ENV_VARS } from '../constants/index.js';
import { getGitRepoInfo } from './git-utils.js';

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

export class StorachaClient {
  private client: Client | null = null;
  private configPath: string;
  private config: StorachaConfig;

  constructor() {
    const lshDir = path.join(homedir(), '.lsh');
    this.configPath = path.join(lshDir, 'storacha-config.json');

    // Ensure directory exists
    if (!fs.existsSync(lshDir)) {
      fs.mkdirSync(lshDir, { recursive: true });
    }

    // Load config
    this.config = this.loadConfig();
  }

  /**
   * Load Storacha configuration
   */
  private loadConfig(): StorachaConfig {
    try {
      if (fs.existsSync(this.configPath)) {
        const data = fs.readFileSync(this.configPath, 'utf-8');
        return JSON.parse(data);
      }
    } catch (_error) {
      logger.warn('Failed to load Storacha config, using defaults');
    }

    // Default to enabled unless explicitly disabled
    const envDisabled = process.env[ENV_VARS.LSH_STORACHA_ENABLED] === 'false';
    return {
      enabled: !envDisabled,
    };
  }

  /**
   * Save Storacha configuration
   */
  private saveConfig(): void {
    try {
      fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
    } catch (error) {
      logger.error('Failed to save Storacha config:', error);
    }
  }

  /**
   * Check if Storacha is enabled
   * Default: enabled (unless explicitly disabled via LSH_STORACHA_ENABLED=false)
   */
  isEnabled(): boolean {
    // Explicitly disabled via env var
    if (process.env[ENV_VARS.LSH_STORACHA_ENABLED] === 'false') {
      return false;
    }
    // Use config setting (defaults to true)
    return this.config.enabled;
  }

  /**
   * Get or create Storacha client
   */
  async getClient(): Promise<Client> {
    if (this.client) {
      return this.client;
    }

    try {
      // Create client (it will use default store for Node.js)
      this.client = await Storacha.create();
      return this.client;
    } catch (error) {
      const err = error as Error;
      throw new Error(`Failed to create Storacha client: ${err.message}`);
    }
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    try {
      const client = await this.getClient();
      const accountsRecord = await client.accounts();
      // Convert Record to array
      const accounts = Object.values(accountsRecord);
      return accounts.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Login with email (triggers email verification)
   */
  async login(email: string): Promise<void> {
    try {
      const client = await this.getClient();

      logger.info(`📧 Sending verification email to ${email}...`);
      logger.info('   Click the link in your email to complete authentication.');

      // This will wait for email confirmation
      const account = await client.login(email);

      logger.info('✅ Email verified!');

      // Wait for payment plan selection (15 min timeout)
      logger.info('⏳ Waiting for payment plan selection...');
      logger.info('   Please complete the signup at: https://console.storacha.network/');

      await account.plan.wait();

      logger.info('✅ Payment plan confirmed!');

      // Save email to config
      this.config.email = email;
      this.saveConfig();

      // Check existing spaces and provide guidance
      const spaces = await client.spaces();
      if (spaces.length === 0) {
        // Detect project name for first space
        const projectName = this.getProjectName();
        logger.info(`🆕 Creating space for project: "${projectName}"...`);
        const space = await client.createSpace(projectName, { account });
        await client.setCurrentSpace(space.did());
        this.config.spaceName = projectName;
        this.saveConfig();
        logger.info('✅ Project space created and activated!');
      } else {
        logger.info(`✅ Found ${spaces.length} existing space(s)`);
        // Set first space as current if none selected
        const currentSpace = await client.currentSpace();
        if (!currentSpace) {
          await client.setCurrentSpace(spaces[0].did());
          logger.info(`   Activated space: ${spaces[0].name || 'unnamed'}`);
        }
      }

      logger.info('');
      logger.info('🎉 Storacha setup complete!');
      logger.info('   Enable network sync: export LSH_STORACHA_ENABLED=true');
      logger.info('   Or add to ~/.bashrc or ~/.zshrc');
      logger.info('');
      logger.info('💡 LSH automatically uses project-specific spaces:');
      logger.info('   - Each git repo gets its own Storacha space');
      logger.info('   - Spaces are created/selected during lsh sync');

    } catch (error) {
      const err = error as Error;
      throw new Error(`Login failed: ${err.message}`);
    }
  }

  /**
   * Get current authentication status
   */
  async getStatus(): Promise<{
    authenticated: boolean;
    email?: string;
    currentSpace?: string;
    spaces: StorachaSpace[];
    enabled: boolean;
  }> {
    const authenticated = await this.isAuthenticated();

    if (!authenticated) {
      return {
        authenticated: false,
        spaces: [],
        enabled: this.isEnabled(),
      };
    }

    const client = await this.getClient();
    const spacesRecord = await client.spaces();
    // Convert Record to array
    const spacesArray = Object.values(spacesRecord);
    const currentSpace = await client.currentSpace();

    return {
      authenticated: true,
      email: this.config.email,
      currentSpace: currentSpace?.name || currentSpace?.did(),
      spaces: spacesArray.map(s => ({
        did: s.did(),
        name: s.name || 'unnamed',
        registered: new Date().toISOString(), // Space doesn't have registered field
      })),
      enabled: this.isEnabled(),
    };
  }

  /**
   * Create a new space
   */
  async createSpace(name: string): Promise<void> {
    const client = await this.getClient();
    const accountsRecord = await client.accounts();
    const accounts = Object.values(accountsRecord);

    if (accounts.length === 0) {
      throw new Error('Not authenticated. Run: lsh storacha login <email>');
    }

    const space = await client.createSpace(name, { account: accounts[0] });
    await client.setCurrentSpace(space.did());

    this.config.spaceName = name;
    this.saveConfig();

    logger.info(`✅ Space "${name}" created and activated`);
  }

  /**
   * Get project name from git repo or current directory
   * Returns the git repo name if in a git repo, otherwise the current directory name
   */
  getProjectName(dir: string = process.cwd()): string {
    const gitInfo = getGitRepoInfo(dir);

    if (gitInfo.isGitRepo && gitInfo.repoName) {
      return gitInfo.repoName;
    }

    // Fall back to current directory name
    return path.basename(dir);
  }

  /**
   * Select an existing space by name
   * Returns true if space was found and selected, false otherwise
   */
  async selectSpace(name: string): Promise<boolean> {
    const client = await this.getClient();
    const spacesRecord = await client.spaces();
    const spaces = Object.values(spacesRecord);

    const space = spaces.find(s => s.name === name);
    if (space) {
      await client.setCurrentSpace(space.did());
      this.config.spaceName = name;
      this.saveConfig();
      logger.debug(`Selected space: ${name}`);
      return true;
    }

    return false;
  }

  /**
   * Ensure a project-specific space is active
   * Creates the space if it doesn't exist, selects it if it does
   *
   * @param projectName - Optional project name override. If not provided, auto-detects from git/directory
   * @returns The name of the active space
   */
  async ensureProjectSpace(projectName?: string): Promise<string> {
    if (!await this.isAuthenticated()) {
      throw new Error('Not authenticated. Run: lsh storacha login <email>');
    }

    const name = projectName || this.getProjectName();

    const client = await this.getClient();
    const spacesRecord = await client.spaces();
    const spaces = Object.values(spacesRecord);

    // Check if space already exists
    const existingSpace = spaces.find(s => s.name === name);
    if (existingSpace) {
      // Check if it's already the current space
      const currentSpace = await client.currentSpace();
      if (currentSpace?.did() === existingSpace.did()) {
        logger.debug(`Space "${name}" is already active`);
        return name;
      }

      // Select the existing space
      await client.setCurrentSpace(existingSpace.did());
      this.config.spaceName = name;
      this.saveConfig();
      logger.info(`🔄 Switched to space: ${name}`);
      return name;
    }

    // Create new space for this project
    const accountsRecord = await client.accounts();
    const accounts = Object.values(accountsRecord);

    if (accounts.length === 0) {
      throw new Error('Not authenticated. Run: lsh storacha login <email>');
    }

    logger.info(`🆕 Creating space for project: ${name}...`);
    const space = await client.createSpace(name, { account: accounts[0] });
    await client.setCurrentSpace(space.did());

    this.config.spaceName = name;
    this.saveConfig();

    logger.info(`✅ Space "${name}" created and activated`);
    return name;
  }

  /**
   * Upload data to Storacha
   * Returns CID of uploaded content
   */
  async upload(data: Buffer, filename: string): Promise<string> {
    if (!this.isEnabled()) {
      throw new Error('Storacha is not enabled. Set LSH_STORACHA_ENABLED=true');
    }

    if (!await this.isAuthenticated()) {
      throw new Error('Not authenticated. Run: lsh storacha login <email>');
    }

    const client = await this.getClient();

    // Create File from buffer using Uint8Array view
    const uint8Array = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
    // TypeScript has issues with ArrayBufferLike vs ArrayBuffer, use type assertion
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const file = new File([uint8Array as any], filename, { type: 'application/octet-stream' });

    // Upload file
    const cid = await client.uploadFile(file);

    logger.info(`📤 Uploaded to Storacha: ${cid}`);
    logger.info(`   Gateway: https://${cid}.ipfs.storacha.link`);

    return cid.toString();
  }

  /**
   * Download data from Storacha via IPFS gateway
   * Returns data buffer
   */
  async download(cid: string): Promise<Buffer> {
    const gatewayUrl = `https://${cid}.ipfs.storacha.link`;

    try {
      logger.debug(`📥 Downloading from Storacha: ${cid}...`);

      const response = await fetch(gatewayUrl);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      logger.debug(`✅ Downloaded ${buffer.length} bytes from Storacha`);

      return buffer;
    } catch (error) {
      const err = error as Error;
      throw new Error(`Failed to download from Storacha: ${err.message}`);
    }
  }

  /**
   * Check file size without downloading the full content
   * Returns size in bytes, or -1 if size cannot be determined
   */
  async getFileSize(cid: string): Promise<number> {
    const gatewayUrl = `https://${cid}.ipfs.storacha.link`;

    try {
      const response = await fetch(gatewayUrl, { method: 'HEAD' });

      if (!response.ok) {
        return -1;
      }

      const contentLength = response.headers.get('content-length');
      if (contentLength) {
        return parseInt(contentLength, 10);
      }

      return -1;
    } catch {
      return -1;
    }
  }

  /**
   * Download only if file is small (registry check optimization)
   * Returns buffer if small enough, null otherwise
   */
  async downloadIfSmall(cid: string, maxSize: number = 1024): Promise<Buffer | null> {
    // First check size with HEAD request
    const size = await this.getFileSize(cid);

    // If size check succeeds and file is too large, skip download
    if (size > 0 && size > maxSize) {
      logger.debug(`⏭️  Skipping large file ${cid} (${size} bytes > ${maxSize})`);
      return null;
    }

    // Size unknown or small enough, download with size check after
    try {
      const buffer = await this.download(cid);
      if (buffer.length > maxSize) {
        return null;
      }
      return buffer;
    } catch {
      return null;
    }
  }

  /**
   * Upload registry file for a repo
   * Registry files mark that secrets exist and include the latest secrets CID
   */
  async uploadRegistry(repoName: string, environment: string, secretsCid: string): Promise<string> {
    if (!this.isEnabled()) {
      throw new Error('Storacha is not enabled');
    }

    if (!await this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }

    // Get the latest registry version and increment it
    let registryVersion = 1;
    try {
      const latestRegistry = await this.getLatestRegistry(repoName);
      if (latestRegistry && latestRegistry.registryVersion) {
        registryVersion = latestRegistry.registryVersion + 1;
      }
    } catch (err) {
      logger.debug(`Could not fetch latest registry version, using version 1: ${(err as Error).message}`);
    }

    const registry = {
      repoName,
      environment,
      cid: secretsCid,  // Include the secrets CID
      timestamp: new Date().toISOString(),
      version: '2.3.0',  // LSH version
      registryVersion,    // Incremental version counter
    };

    const content = JSON.stringify(registry, null, 2);
    const buffer = Buffer.from(content, 'utf-8');
    const filename = `lsh-registry-${repoName}.json`;

    const client = await this.getClient();
    const uint8Array = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const file = new File([uint8Array as any], filename, { type: 'application/json' });

    const cid = await client.uploadFile(file);
    logger.debug(`📝 Uploaded registry v${registryVersion} for ${repoName} (secrets CID: ${secretsCid}): ${cid}`);

    return cid.toString();
  }

  /**
   * Get the latest secrets CID from registry
   * Returns the CID of the latest secrets if registry exists, null otherwise
   *
   * NOTE: This method paginates through uploads to find registries for the
   * specific repo, ensuring secrets from different repos don't get mixed up.
   */
  async getLatestCID(repoName: string): Promise<string | null> {
    if (!this.isEnabled()) {
      return null;
    }

    if (!await this.isAuthenticated()) {
      return null;
    }

    try {
      const client = await this.getClient();

      const pageSize = 20;
      const maxPages = 5;  // Check up to 100 uploads total (20 * 5)
      let cursor: string | undefined = '';
      let pagesChecked = 0;

      // Collect all registry files for this repo across all pages
      const registries: Array<{ cid: string; timestamp: string; secretsCid: string; registryVersion: number }> = [];

      // Paginate through uploads to find registries for this specific repo
      while (pagesChecked < maxPages) {
        pagesChecked++;

        const results = await client.capability.upload.list({
          cursor: cursor || '',
          size: pageSize,
        });

        for (const upload of results.results) {
          try {
            const cid = upload.root.toString();

            // Use optimized download that checks size first with HEAD request
            const content = await this.downloadIfSmall(cid, 1024);

            // Skip if file is too large or download failed
            if (!content) {
              continue;
            }

            // Try to parse as JSON
            const json = JSON.parse(content.toString('utf-8'));

            // Check if it's an LSH registry file for our repo
            if (json.repoName === repoName && json.version && json.cid && json.timestamp) {
              registries.push({
                cid: cid,
                timestamp: json.timestamp,
                secretsCid: json.cid,
                registryVersion: json.registryVersion || 0, // Default to 0 for old registries without version
              });
            }
          } catch {
            // Not an LSH registry file or failed to download
            continue;
          }
        }

        // If we found registries for our repo, we can stop paginating
        // (we already have the latest since uploads are sorted by recency)
        if (registries.length > 0) {
          break;
        }

        // Check if there are more pages
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const resultsCursor = (results as any).cursor;
        if (!resultsCursor || results.results.length < pageSize) {
          // No more pages
          break;
        }

        cursor = resultsCursor;
        logger.debug(`📄 Checking page ${pagesChecked + 1} for ${repoName} registry...`);
      }

      // Sort by registryVersion (highest first), then timestamp as tie-breaker
      if (registries.length > 0) {
        registries.sort((a, b) => {
          // First compare by registryVersion (higher is newer)
          if (b.registryVersion !== a.registryVersion) {
            return b.registryVersion - a.registryVersion;
          }
          // If versions match, use timestamp as tie-breaker
          return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        });
        const latest = registries[0];
        logger.debug(`✅ Found latest CID for ${repoName}: ${latest.secretsCid} (v${latest.registryVersion}, timestamp: ${latest.timestamp}, pages checked: ${pagesChecked})`);
        return latest.secretsCid;
      }

      // No registry found
      logger.debug(`❌ No registry found for ${repoName} after checking ${pagesChecked} pages`);
      return null;
    } catch (error) {
      const err = error as Error;
      logger.debug(`Failed to get latest CID: ${err.message}`);
      return null;
    }
  }

  /**
   * Get the latest registry object for a repo
   * Returns the full registry object including registryVersion
   *
   * NOTE: This method paginates through uploads to find registries for the
   * specific repo, ensuring secrets from different repos don't get mixed up.
   */
  async getLatestRegistry(repoName: string): Promise<{
    repoName: string;
    environment: string;
    cid: string;
    timestamp: string;
    version: string;
    registryVersion: number;
  } | null> {
    if (!this.isEnabled()) {
      return null;
    }

    if (!await this.isAuthenticated()) {
      return null;
    }

    try {
      const client = await this.getClient();

      const pageSize = 20;
      const maxPages = 5;  // Check up to 100 uploads total (20 * 5)
      let cursor: string | undefined = '';
      let pagesChecked = 0;

      // Collect all registry files for this repo across all pages
      const registries: Array<{
        repoName: string;
        environment: string;
        cid: string;
        timestamp: string;
        version: string;
        registryVersion: number;
      }> = [];

      // Paginate through uploads to find registries for this specific repo
      while (pagesChecked < maxPages) {
        pagesChecked++;

        const results = await client.capability.upload.list({
          cursor: cursor || '',
          size: pageSize,
        });

        for (const upload of results.results) {
          try {
            const cid = upload.root.toString();

            // Use optimized download that checks size first with HEAD request
            const content = await this.downloadIfSmall(cid, 1024);

            // Skip if file is too large or download failed
            if (!content) {
              continue;
            }

            // Try to parse as JSON
            const json = JSON.parse(content.toString('utf-8'));

            // Check if it's an LSH registry file for our repo
            if (json.repoName === repoName && json.version && json.cid && json.timestamp) {
              registries.push({
                repoName: json.repoName,
                environment: json.environment,
                cid: json.cid,
                timestamp: json.timestamp,
                version: json.version,
                registryVersion: json.registryVersion || 0,
              });
            }
          } catch {
            // Not an LSH registry file or failed to download
            continue;
          }
        }

        // If we found registries for our repo, we can stop paginating
        if (registries.length > 0) {
          break;
        }

        // Check if there are more pages
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const resultsCursor = (results as any).cursor;
        if (!resultsCursor || results.results.length < pageSize) {
          // No more pages
          break;
        }

        cursor = resultsCursor;
        logger.debug(`📄 Checking page ${pagesChecked + 1} for ${repoName} registry...`);
      }

      // Sort by registryVersion (highest first), then timestamp as tie-breaker
      if (registries.length > 0) {
        registries.sort((a, b) => {
          if (b.registryVersion !== a.registryVersion) {
            return b.registryVersion - a.registryVersion;
          }
          return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        });
        return registries[0];
      }

      return null;
    } catch (error) {
      const err = error as Error;
      logger.debug(`Failed to get latest registry: ${err.message}`);
      return null;
    }
  }

  /**
   * Check if registry exists for a repo by listing uploads
   * Returns true if a registry file for this repo exists in Storacha
   *
   * NOTE: This paginates through uploads to find registries for the specific repo,
   * ensuring secrets from different repos don't get mixed up.
   */
  async checkRegistry(repoName: string): Promise<boolean> {
    if (!this.isEnabled()) {
      return false;
    }

    if (!await this.isAuthenticated()) {
      return false;
    }

    try {
      const client = await this.getClient();

      const pageSize = 20;
      const maxPages = 5;  // Check up to 100 uploads total (20 * 5)
      let cursor: string | undefined = '';
      let pagesChecked = 0;

      // Track checked count for logging
      let checked = 0;
      let skipped = 0;

      // Paginate through uploads to find registry for this specific repo
      while (pagesChecked < maxPages) {
        pagesChecked++;

        const results = await client.capability.upload.list({
          cursor: cursor || '',
          size: pageSize,
        });

        // Check if any uploads match our registry pattern
        // Registry files are small JSON files (~200 bytes)
        // Skip large files (encrypted secrets are much larger)
        for (const upload of results.results) {
          try {
            const cid = upload.root.toString();

            // Use optimized download that checks size first with HEAD request
            const content = await this.downloadIfSmall(cid, 1024);

            // Skip if file is too large or download failed
            if (!content) {
              skipped++;
              continue;
            }

            checked++;

            // Try to parse as JSON
            const json = JSON.parse(content.toString('utf-8'));

            // Check if it's an LSH registry file for our repo
            if (json.repoName === repoName && json.version) {
              logger.debug(`✅ Found registry for ${repoName} at CID: ${cid} (checked ${checked} files, skipped ${skipped}, pages: ${pagesChecked})`);
              return true;
            }
          } catch {
            // Not an LSH registry file or failed to download - continue
            skipped++;
          }
        }

        // Check if there are more pages
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const resultsCursor = (results as any).cursor;
        if (!resultsCursor || results.results.length < pageSize) {
          // No more pages
          break;
        }

        cursor = resultsCursor;
        logger.debug(`📄 Checking page ${pagesChecked + 1} for ${repoName} registry...`);
      }

      // No registry found
      logger.debug(`❌ No registry found for ${repoName} (checked ${checked} files, skipped ${skipped}, pages: ${pagesChecked})`);
      return false;
    } catch (error) {
      const err = error as Error;
      logger.debug(`Failed to check registry: ${err.message}`);
      return false;
    }
  }

  /**
   * Enable Storacha network sync
   */
  enable(): void {
    this.config.enabled = true;
    this.saveConfig();
    logger.info('✅ Storacha network sync enabled');
  }

  /**
   * Disable Storacha network sync
   */
  disable(): void {
    this.config.enabled = false;
    this.saveConfig();
    logger.info('⏸️  Storacha network sync disabled (using local cache only)');
  }
}

// Singleton instance
let storachaClient: StorachaClient | null = null;

/**
 * Get singleton Storacha client instance
 */
export function getStorachaClient(): StorachaClient {
  if (!storachaClient) {
    storachaClient = new StorachaClient();
  }
  return storachaClient;
}
