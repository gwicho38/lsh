/**
 * Cloud Configuration Manager
 * Manages shell configuration with Supabase persistence
 */

import DatabasePersistence from './database-persistence.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface CloudConfigOptions {
  userId?: string;
  enableCloudSync: boolean;
  localConfigPath: string;
  syncInterval: number;
}

export interface ConfigValue {
  key: string;
  value: any;
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
      syncInterval: 60000, // 1 minute
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
  private saveLocalConfig(): void {
    try {
      const config: Record<string, any> = {};
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
  private getType(value: any): ConfigValue['type'] {
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
  private parseConfigValue(value: string, type: ConfigValue['type']): any {
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
  private serializeConfigValue(value: any, type: ConfigValue['type']): string {
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
  private startSyncTimer(): void {
    this.syncTimer = setInterval(() => {
      this.syncToCloud();
    }, this.options.syncInterval);
  }

  /**
   * Stop synchronization timer
   */
  private stopSyncTimer(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = undefined;
    }
  }

  /**
   * Synchronize local configuration to cloud
   */
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
  public get(key: string, defaultValue?: any): any {
    const configValue = this.localConfig.get(key);
    return configValue ? configValue.value : defaultValue;
  }

  /**
   * Set configuration value
   */
  public set(key: string, value: any, description?: string): void {
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
  public getKeys(): string[] {
    return Array.from(this.localConfig.keys());
  }

  /**
   * Get all configuration entries
   */
  public getAll(): ConfigValue[] {
    return Array.from(this.localConfig.values());
  }

  /**
   * Check if configuration key exists
   */
  public has(key: string): boolean {
    return this.localConfig.has(key);
  }

  /**
   * Delete configuration key
   */
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
  public export(): string {
    const config: Record<string, any> = {};
    this.localConfig.forEach((configValue, key) => {
      config[key] = configValue.value;
    });
    return JSON.stringify(config, null, 2);
  }

  /**
   * Import configuration from JSON
   */
  public import(configJson: string): void {
    try {
      const config = JSON.parse(configJson);
      Object.entries(config).forEach(([key, value]) => {
        this.set(key, value);
      });
    } catch (error) {
      console.error('Failed to import configuration:', error);
      throw new Error('Invalid configuration JSON');
    }
  }

  /**
   * Get configuration statistics
   */
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