/**
 * Cloud Configuration Manager
 * Manages shell configuration with Supabase persistence
 */

import DatabasePersistence from './database-persistence.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { DEFAULTS } from '../constants/index.js';
import { LSHError, ErrorCodes, extractErrorMessage } from './lsh-error.js';

export interface CloudConfigOptions {
  userId?: string;
  enableCloudSync: boolean;
  localConfigPath: string;
  syncInterval: number;
}

export interface ConfigValue {
  key: string;
  value: unknown;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description?: string;
  isDefault: boolean;
}

export class CloudConfigManager {
  private databasePersistence: DatabasePersistence;
  private options: CloudConfigOptions;
  private localConfig: Map<string, ConfigValue> = new Map();
  private cloudConfig: Map<string, ConfigValue> = new Map();
  private syncTimer?: NodeJS.Timeout;

  constructor(options: Partial<CloudConfigOptions> = {}) {
    this.options = {
      userId: undefined,
      enableCloudSync: true,
      localConfigPath: path.join(os.homedir(), '.lshrc'),
      syncInterval: DEFAULTS.CLOUD_CONFIG_SYNC_INTERVAL_MS,
      ...options,
    };

    this.databasePersistence = new DatabasePersistence(this.options.userId);
    this.loadLocalConfig();

    if (this.options.enableCloudSync) {
      this.initializeCloudSync();
    }
  }

  /**
   * Load local configuration file
   */
  // TODO(@gwicho38): Review - loadLocalConfig
  private loadLocalConfig(): void {
    try {
      if (fs.existsSync(this.options.localConfigPath)) {
        const content = fs.readFileSync(this.options.localConfigPath, 'utf8');
        const config = JSON.parse(content);
        
        Object.entries(config).forEach(([key, value]) => {
          this.localConfig.set(key, {
            key,
            value,
            type: this.getType(value),
            isDefault: false,
          });
        });
      }
    } catch (error) {
      console.error('Failed to load local config:', error);
    }
  }

  /**
   * Save local configuration file
   */
  // TODO(@gwicho38): Review - saveLocalConfig
  private saveLocalConfig(): void {
    try {
      const config: Record<string, unknown> = {};
      this.localConfig.forEach((configValue, key) => {
        config[key] = configValue.value;
      });

      fs.writeFileSync(this.options.localConfigPath, JSON.stringify(config, null, 2));
    } catch (error) {
      console.error('Failed to save local config:', error);
    }
  }

  /**
   * Get type of a value
   */
  // TODO(@gwicho38): Review - getType
  private getType(value: unknown): ConfigValue['type'] {
    if (typeof value === 'string') return 'string';
    if (typeof value === 'number') return 'number';
    if (typeof value === 'boolean') return 'boolean';
    if (Array.isArray(value)) return 'array';
    if (typeof value === 'object' && value !== null) return 'object';
    return 'string';
  }

  /**
   * Initialize cloud synchronization
   */
  // TODO(@gwicho38): Review - initializeCloudSync
  private async initializeCloudSync(): Promise<void> {
    try {
      const isConnected = await this.databasePersistence.testConnection();
      if (isConnected) {
        console.log('✅ Cloud config sync enabled');
        await this.loadCloudConfig();
        this.startSyncTimer();
      } else {
        console.log('⚠️  Cloud config sync disabled - database not available');
      }
    } catch (error) {
      console.error('Failed to initialize cloud config sync:', error);
    }
  }

  /**
   * Load configuration from cloud
   */
  // TODO(@gwicho38): Review - loadCloudConfig
  private async loadCloudConfig(): Promise<void> {
    try {
      const cloudConfigs = await this.databasePersistence.getConfiguration();
      
      cloudConfigs.forEach(config => {
        this.cloudConfig.set(config.config_key, {
          key: config.config_key,
          value: this.parseConfigValue(config.config_value, config.config_type),
          type: config.config_type as ConfigValue['type'],
          description: config.description,
          isDefault: config.is_default,
        });
      });

      // Merge cloud config with local config
      this.mergeConfigurations();
    } catch (error) {
      console.error('Failed to load cloud config:', error);
    }
  }

  /**
   * Parse configuration value based on type
   */
  // TODO(@gwicho38): Review - parseConfigValue
  private parseConfigValue(value: string, type: ConfigValue['type']): unknown {
    try {
      switch (type) {
        case 'string':
          return value;
        case 'number':
          return parseFloat(value);
        case 'boolean':
          return value === 'true';
        case 'array':
        case 'object':
          return JSON.parse(value);
        default:
          return value;
      }
    } catch (error) {
      console.error(`Failed to parse config value ${value} as ${type}:`, error);
      return value;
    }
  }

  /**
   * Serialize configuration value to string
   */
  // TODO(@gwicho38): Review - serializeConfigValue
  private serializeConfigValue(value: unknown, type: ConfigValue['type']): string {
    switch (type) {
      case 'string':
      case 'number':
      case 'boolean':
        return String(value);
      case 'array':
      case 'object':
        return JSON.stringify(value);
      default:
        return String(value);
    }
  }

  /**
   * Merge cloud and local configurations
   */
  // TODO(@gwicho38): Review - mergeConfigurations
  private mergeConfigurations(): void {
    // Cloud config takes precedence for non-local overrides
    this.cloudConfig.forEach((cloudValue, key) => {
      if (!this.localConfig.has(key)) {
        this.localConfig.set(key, cloudValue);
      }
    });
  }

  /**
   * Start periodic synchronization timer
   */
  // TODO(@gwicho38): Review - startSyncTimer
  private startSyncTimer(): void {
    this.syncTimer = setInterval(() => {
      this.syncToCloud();
    }, this.options.syncInterval);
  }

  /**
   * Stop synchronization timer
   */
  // TODO(@gwicho38): Review - stopSyncTimer
  private stopSyncTimer(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = undefined;
    }
  }

  /**
   * Synchronize local configuration to cloud
   */
  // TODO(@gwicho38): Review - syncToCloud
  private async syncToCloud(): Promise<void> {
    if (!this.options.enableCloudSync) {
      return;
    }

    try {
      for (const [key, configValue] of this.localConfig) {
        await this.databasePersistence.saveConfiguration({
          config_key: key,
          config_value: this.serializeConfigValue(configValue.value, configValue.type),
          config_type: configValue.type,
          description: configValue.description,
          is_default: configValue.isDefault,
        });
      }
    } catch (error) {
      console.error('Failed to sync config to cloud:', error);
    }
  }

  /**
   * Get configuration value
   */
  public get(key: string, defaultValue?: unknown): unknown {
    const configValue = this.localConfig.get(key);
    return configValue ? configValue.value : defaultValue;
  }

  /**
   * Set configuration value
   */
  public set(key: string, value: unknown, description?: string): void {
    const configValue: ConfigValue = {
      key,
      value,
      type: this.getType(value),
      description,
      isDefault: false,
    };

    this.localConfig.set(key, configValue);
    this.saveLocalConfig();

    // Sync to cloud if enabled
    if (this.options.enableCloudSync) {
      this.syncToCloud().catch(error => {
        console.error('Failed to sync config to cloud:', error);
      });
    }
  }

  /**
   * Get all configuration keys
   */
  // TODO(@gwicho38): Review - getKeys
  public getKeys(): string[] {
    return Array.from(this.localConfig.keys());
  }

  /**
   * Get all configuration entries
   */
  // TODO(@gwicho38): Review - getAll
  public getAll(): ConfigValue[] {
    return Array.from(this.localConfig.values());
  }

  /**
   * Check if configuration key exists
   */
  // TODO(@gwicho38): Review - has
  public has(key: string): boolean {
    return this.localConfig.has(key);
  }

  /**
   * Delete configuration key
   */
  // TODO(@gwicho38): Review - delete
  public delete(key: string): void {
    this.localConfig.delete(key);
    this.saveLocalConfig();

    // Sync to cloud if enabled
    if (this.options.enableCloudSync) {
      this.syncToCloud().catch(error => {
        console.error('Failed to sync config deletion to cloud:', error);
      });
    }
  }

  /**
   * Reset configuration to defaults
   */
  // TODO(@gwicho38): Review - reset
  public reset(): void {
    this.localConfig.clear();
    this.saveLocalConfig();

    if (this.options.enableCloudSync) {
      this.syncToCloud().catch(error => {
        console.error('Failed to sync config reset to cloud:', error);
      });
    }
  }

  /**
   * Export configuration to JSON
   */
  // TODO(@gwicho38): Review - export
  public export(): string {
    const config: Record<string, unknown> = {};
    this.localConfig.forEach((configValue, key) => {
      config[key] = configValue.value;
    });
    return JSON.stringify(config, null, 2);
  }

  /**
   * Import configuration from JSON
   */
  // TODO(@gwicho38): Review - import
  public import(configJson: string): void {
    try {
      const config = JSON.parse(configJson);
      Object.entries(config).forEach(([key, value]) => {
        this.set(key, value);
      });
    } catch (error) {
      console.error('Failed to import configuration:', error);
      throw new LSHError(
        ErrorCodes.CONFIG_PARSE_ERROR,
        'Invalid configuration JSON',
        { parseError: extractErrorMessage(error), inputLength: configJson.length }
      );
    }
  }

  /**
   * Get configuration statistics
   */
  // TODO(@gwicho38): Review - getStats
  public getStats(): {
    totalKeys: number;
    localKeys: number;
    cloudKeys: number;
    types: Record<string, number>;
  } {
    const types: Record<string, number> = {};
    this.localConfig.forEach(configValue => {
      types[configValue.type] = (types[configValue.type] || 0) + 1;
    });

    return {
      totalKeys: this.localConfig.size,
      localKeys: this.localConfig.size,
      cloudKeys: this.cloudConfig.size,
      types,
    };
  }

  /**
   * Enable or disable cloud sync
   */
  // TODO(@gwicho38): Review - setCloudSyncEnabled
  public setCloudSyncEnabled(enabled: boolean): void {
    this.options.enableCloudSync = enabled;
    
    if (enabled) {
      this.initializeCloudSync();
    } else {
      this.stopSyncTimer();
    }
  }

  /**
   * Cleanup resources
   */
  // TODO(@gwicho38): Review - destroy
  public destroy(): void {
    this.stopSyncTimer();
    if (this.options.enableCloudSync) {
      this.syncToCloud().catch(error => {
        console.error('Failed to final config sync on destroy:', error);
      });
    }
  }
}

export default CloudConfigManager;