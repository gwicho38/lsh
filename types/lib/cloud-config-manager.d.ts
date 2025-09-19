/**
 * Cloud Configuration Manager
 * Manages shell configuration with Supabase persistence
 */
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
export declare class CloudConfigManager {
    private databasePersistence;
    private options;
    private localConfig;
    private cloudConfig;
    private syncTimer?;
    constructor(options?: Partial<CloudConfigOptions>);
    /**
     * Load local configuration file
     */
    private loadLocalConfig;
    /**
     * Save local configuration file
     */
    private saveLocalConfig;
    /**
     * Get type of a value
     */
    private getType;
    /**
     * Initialize cloud synchronization
     */
    private initializeCloudSync;
    /**
     * Load configuration from cloud
     */
    private loadCloudConfig;
    /**
     * Parse configuration value based on type
     */
    private parseConfigValue;
    /**
     * Serialize configuration value to string
     */
    private serializeConfigValue;
    /**
     * Merge cloud and local configurations
     */
    private mergeConfigurations;
    /**
     * Start periodic synchronization timer
     */
    private startSyncTimer;
    /**
     * Stop synchronization timer
     */
    private stopSyncTimer;
    /**
     * Synchronize local configuration to cloud
     */
    private syncToCloud;
    /**
     * Get configuration value
     */
    get(key: string, defaultValue?: any): any;
    /**
     * Set configuration value
     */
    set(key: string, value: any, description?: string): void;
    /**
     * Get all configuration keys
     */
    getKeys(): string[];
    /**
     * Get all configuration entries
     */
    getAll(): ConfigValue[];
    /**
     * Check if configuration key exists
     */
    has(key: string): boolean;
    /**
     * Delete configuration key
     */
    delete(key: string): void;
    /**
     * Reset configuration to defaults
     */
    reset(): void;
    /**
     * Export configuration to JSON
     */
    export(): string;
    /**
     * Import configuration from JSON
     */
    import(configJson: string): void;
    /**
     * Get configuration statistics
     */
    getStats(): {
        totalKeys: number;
        localKeys: number;
        cloudKeys: number;
        types: Record<string, number>;
    };
    /**
     * Enable or disable cloud sync
     */
    setCloudSyncEnabled(enabled: boolean): void;
    /**
     * Cleanup resources
     */
    destroy(): void;
}
export default CloudConfigManager;
