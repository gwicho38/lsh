/**
 * Enhanced History System with Supabase Integration
 * Extends the base history system with cloud persistence
 */
import HistorySystem, { HistoryEntry, HistoryConfig } from './history-system.js';
export interface EnhancedHistoryConfig extends HistoryConfig {
    enableCloudSync: boolean;
    userId?: string;
    syncInterval: number;
}
export declare class EnhancedHistorySystem extends HistorySystem {
    private databasePersistence;
    private enhancedConfig;
    private syncTimer?;
    private pendingSync;
    constructor(config?: Partial<EnhancedHistoryConfig>);
    /**
     * Initialize cloud synchronization
     */
    private initializeCloudSync;
    /**
     * Load history from cloud database
     */
    private loadCloudHistory;
    /**
     * Merge cloud history entries with local history
     */
    private mergeHistoryEntries;
    /**
     * Start periodic synchronization timer
     */
    private startSyncTimer;
    /**
     * Stop synchronization timer
     */
    private stopSyncTimer;
    /**
     * Synchronize local history to cloud
     */
    private syncToCloud;
    /**
     * Override addCommand to include cloud sync
     */
    addCommand(command: string, exitCode?: number): void;
    /**
     * Search history across local and cloud data
     */
    searchHistoryCloud(query: string, limit?: number): Promise<HistoryEntry[]>;
    /**
     * Get history statistics
     */
    getHistoryStats(): Promise<{
        localEntries: number;
        cloudEntries: number;
        totalCommands: number;
        mostUsedCommand: string;
        averageCommandLength: number;
    }>;
    /**
     * Enable or disable cloud sync
     */
    setCloudSyncEnabled(enabled: boolean): void;
    /**
     * Cleanup resources
     */
    destroy(): void;
}
export default EnhancedHistorySystem;
