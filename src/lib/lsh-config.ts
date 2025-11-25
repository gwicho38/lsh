/**
 * LSH Configuration Manager
 *
 * Manages encryption keys and configuration for different repositories.
 * Keys are stored in ~/.lsh/config.json separate from the .env files being synced.
 *
 * This prevents sync conflicts where different hosts overwrite each other's keys.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { logger } from './logger.js';

interface LshConfig {
  version: string;
  keys: {
    [repoName: string]: {
      key: string;
      createdAt: string;
      lastUsed: string;
    };
  };
}

export class LshConfigManager {
  private configPath: string;
  private config: LshConfig;

  constructor(configPath?: string) {
    this.configPath = configPath || path.join(os.homedir(), '.lsh', 'config.json');
    this.config = this.loadConfig();
  }

  /**
   * Load config from disk, or create default if it doesn't exist
   */
  private loadConfig(): LshConfig {
    try {
      if (fs.existsSync(this.configPath)) {
        const data = fs.readFileSync(this.configPath, 'utf-8');
        return JSON.parse(data);
      }
    } catch (error) {
      const err = error as Error;
      logger.warn(`Failed to load config: ${err.message}`);
    }

    // Return default config
    return {
      version: '1.0.0',
      keys: {},
    };
  }

  /**
   * Save config to disk
   */
  private saveConfig(): void {
    try {
      const dir = path.dirname(this.configPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(
        this.configPath,
        JSON.stringify(this.config, null, 2),
        'utf-8'
      );
    } catch (error) {
      const err = error as Error;
      logger.error(`Failed to save config: ${err.message}`);
      throw error;
    }
  }

  /**
   * Get encryption key for a specific repository
   */
  getKey(repoName: string): string | null {
    // Check config file first
    if (this.config.keys[repoName]) {
      // Update last used timestamp
      this.config.keys[repoName].lastUsed = new Date().toISOString();
      this.saveConfig();
      return this.config.keys[repoName].key;
    }

    // Fall back to environment variables
    const envKey = process.env.LSH_SECRETS_KEY || process.env.LSH_MASTER_KEY;
    if (envKey) {
      logger.debug(`Using encryption key from environment for ${repoName}`);
      return envKey;
    }

    return null;
  }

  /**
   * Set encryption key for a specific repository
   */
  setKey(repoName: string, key: string): void {
    this.config.keys[repoName] = {
      key,
      createdAt: this.config.keys[repoName]?.createdAt || new Date().toISOString(),
      lastUsed: new Date().toISOString(),
    };
    this.saveConfig();
    logger.debug(`Saved encryption key for ${repoName}`);
  }

  /**
   * Check if a key exists for a repository
   */
  hasKey(repoName: string): boolean {
    return !!this.config.keys[repoName];
  }

  /**
   * Remove encryption key for a repository
   */
  removeKey(repoName: string): void {
    delete this.config.keys[repoName];
    this.saveConfig();
    logger.debug(`Removed encryption key for ${repoName}`);
  }

  /**
   * List all repositories with stored keys
   */
  listKeys(): Array<{ repoName: string; createdAt: string; lastUsed: string }> {
    return Object.entries(this.config.keys).map(([repoName, data]) => ({
      repoName,
      createdAt: data.createdAt,
      lastUsed: data.lastUsed,
    }));
  }

  /**
   * Export key for sharing with other hosts
   */
  exportKey(repoName: string): string | null {
    const key = this.getKey(repoName);
    if (!key) {
      return null;
    }
    return `export LSH_SECRETS_KEY='${key}'`;
  }

  /**
   * Get config file path (for debugging/migration)
   */
  getConfigPath(): string {
    return this.configPath;
  }
}

// Singleton instance
let _configManager: LshConfigManager | null = null;

/**
 * Get the global LSH config manager instance
 */
export function getLshConfig(): LshConfigManager {
  if (!_configManager) {
    _configManager = new LshConfigManager();
  }
  return _configManager;
}
