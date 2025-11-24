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
    const envDisabled = process.env.LSH_STORACHA_ENABLED === 'false';
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
    if (process.env.LSH_STORACHA_ENABLED === 'false') {
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

      // Check if space exists, create default if not
      const spaces = await client.spaces();
      if (spaces.length === 0) {
        logger.info('🆕 Creating default space: "lsh-secrets"...');
        const space = await client.createSpace('lsh-secrets', { account });
        await client.setCurrentSpace(space.did());
        this.config.spaceName = 'lsh-secrets';
        this.saveConfig();
        logger.info('✅ Default space created and activated!');
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
      logger.info(`📥 Downloading from Storacha: ${cid}...`);

      const response = await fetch(gatewayUrl);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      logger.info(`✅ Downloaded ${buffer.length} bytes from Storacha`);

      return buffer;
    } catch (error) {
      const err = error as Error;
      throw new Error(`Failed to download from Storacha: ${err.message}`);
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
