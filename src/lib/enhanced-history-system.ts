/**
 * Enhanced History System with Supabase Integration
 * Extends the base history system with cloud persistence
 */

import HistorySystem, { HistoryEntry, HistoryConfig } from './history-system.js';
import DatabasePersistence from './database-persistence.js';
import * as os from 'os';
import * as path from 'path';
import { DEFAULTS } from '../constants/index.js';

export interface EnhancedHistoryConfig extends HistoryConfig {
  enableCloudSync: boolean;
  userId?: string;
  syncInterval: number; // milliseconds
}

export class EnhancedHistorySystem extends HistorySystem {
  private databasePersistence: DatabasePersistence;
  private enhancedConfig: EnhancedHistoryConfig;
  private syncTimer?: NodeJS.Timeout;
  private pendingSync: boolean = false;

  constructor(config: Partial<EnhancedHistoryConfig> = {}) {
    const defaultConfig: EnhancedHistoryConfig = {
      maxSize: DEFAULTS.MAX_HISTORY_SIZE,
      filePath: path.join(os.homedir(), '.lsh_history'),
      shareHistory: true,
      ignoreDups: true,
      ignoreSpace: true,
      expireDuplicatesFirst: true,
      enableCloudSync: true,
      userId: undefined,
      syncInterval: DEFAULTS.HISTORY_SYNC_INTERVAL_MS,
      ...config,
    };

    super(defaultConfig);
    this.enhancedConfig = defaultConfig;
    this.databasePersistence = new DatabasePersistence(defaultConfig.userId);

    if (this.enhancedConfig.enableCloudSync) {
      this.initializeCloudSync();
    }
  }

  /**
   * Initialize cloud synchronization
   */
  private async initializeCloudSync(): Promise<void> {
    try {
      const isConnected = await this.databasePersistence.testConnection();
      if (isConnected) {
        console.log('✅ Cloud history sync enabled');
        await this.loadCloudHistory();
        this.startSyncTimer();
      } else {
        console.log('⚠️  Cloud history sync disabled - database not available');
      }
    } catch (error) {
      console.error('Failed to initialize cloud sync:', error);
    }
  }

  /**
   * Load history from cloud database
   */
  private async loadCloudHistory(): Promise<void> {
    try {
      const cloudEntries = await this.databasePersistence.getHistoryEntries(1000);
      
      // Convert cloud entries to local format
      const localEntries: HistoryEntry[] = cloudEntries.map((entry, index) => ({
        lineNumber: index + 1,
        command: entry.command,
        timestamp: new Date(entry.timestamp).getTime(),
        exitCode: entry.exit_code,
      }));

      // Merge with local history (avoid duplicates)
      this.mergeHistoryEntries(localEntries);
    } catch (error) {
      console.error('Failed to load cloud history:', error);
    }
  }

  /**
   * Merge cloud history entries with local history
   */
  private mergeHistoryEntries(cloudEntries: HistoryEntry[]): void {
    const localEntries = this.getAllEntries();
    const mergedEntries: HistoryEntry[] = [];

    // Create a map of local entries by command and timestamp
    const localMap = new Map<string, HistoryEntry>();
    localEntries.forEach(entry => {
      const key = `${entry.command}_${entry.timestamp}`;
      localMap.set(key, entry);
    });

    // Add cloud entries that don't exist locally
    cloudEntries.forEach(entry => {
      const key = `${entry.command}_${entry.timestamp}`;
      if (!localMap.has(key)) {
        mergedEntries.push(entry);
      }
    });

    // Add all local entries
    mergedEntries.push(...localEntries);

    // Sort by timestamp and update line numbers
    mergedEntries.sort((a, b) => a.timestamp - b.timestamp);
    mergedEntries.forEach((entry, index) => {
      entry.lineNumber = index + 1;
    });

    // Update internal entries
    this.entries = mergedEntries;
  }

  /**
   * Start periodic synchronization timer
   */
  private startSyncTimer(): void {
    this.syncTimer = setInterval(() => {
      this.syncToCloud();
    }, this.enhancedConfig.syncInterval);
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
   * Synchronize local history to cloud
   */
  private async syncToCloud(): Promise<void> {
    if (this.pendingSync || !this.enhancedConfig.enableCloudSync) {
      return;
    }

    this.pendingSync = true;
    try {
      const localEntries = this.getAllEntries();
      const recentEntries = localEntries.slice(-50); // Sync last 50 entries

      for (const entry of recentEntries) {
        await this.databasePersistence.saveHistoryEntry({
          session_id: this.databasePersistence.getSessionId(),
          command: entry.command,
          working_directory: process.cwd(),
          exit_code: entry.exitCode,
          timestamp: new Date(entry.timestamp).toISOString(),
          hostname: os.hostname(),
        });
      }
    } catch (error) {
      console.error('Failed to sync history to cloud:', error);
    } finally {
      this.pendingSync = false;
    }
  }

  /**
   * Override addCommand to include cloud sync
   */
  public addCommand(command: string, exitCode?: number): void {
    super.addCommand(command, exitCode);

    // Sync to cloud if enabled
    if (this.enhancedConfig.enableCloudSync) {
      this.syncToCloud().catch(error => {
        console.error('Failed to sync command to cloud:', error);
      });
    }
  }

  /**
   * Search history across local and cloud data
   */
  public async searchHistoryCloud(query: string, limit: number = 20): Promise<HistoryEntry[]> {
    const localResults = this.searchHistory(query).slice(0, limit);
    
    if (!this.enhancedConfig.enableCloudSync) {
      return localResults;
    }

    try {
      // Search cloud history
      const cloudEntries = await this.databasePersistence.getHistoryEntries(1000);
      const cloudResults = cloudEntries
        .filter(entry => entry.command.toLowerCase().includes(query.toLowerCase()))
        .slice(0, limit)
        .map((entry, index) => ({
          lineNumber: index + 1,
          command: entry.command,
          timestamp: new Date(entry.timestamp).getTime(),
          exitCode: entry.exit_code,
        }));

      // Merge and deduplicate results
      const allResults = [...localResults, ...cloudResults];
      const uniqueResults = allResults.filter((entry, index, arr) => 
        arr.findIndex(e => e.command === entry.command && e.timestamp === entry.timestamp) === index
      );

      return uniqueResults.slice(0, limit);
    } catch (error) {
      console.error('Failed to search cloud history:', error);
      return localResults;
    }
  }

  /**
   * Get history statistics
   */
  public async getHistoryStats(): Promise<{
    localEntries: number;
    cloudEntries: number;
    totalCommands: number;
    mostUsedCommand: string;
    averageCommandLength: number;
  }> {
    const localEntries = this.getAllEntries();
    let cloudEntries = 0;

    if (this.enhancedConfig.enableCloudSync) {
      try {
        const cloudData = await this.databasePersistence.getHistoryEntries(10000);
        cloudEntries = cloudData.length;
      } catch (error) {
        console.error('Failed to get cloud history stats:', error);
      }
    }

    // Calculate statistics
    const commandCounts = new Map<string, number>();
    let totalLength = 0;

    localEntries.forEach(entry => {
      commandCounts.set(entry.command, (commandCounts.get(entry.command) || 0) + 1);
      totalLength += entry.command.length;
    });

    const mostUsedCommand = Array.from(commandCounts.entries())
      .sort(([,a], [,b]) => b - a)[0]?.[0] || '';

    return {
      localEntries: localEntries.length,
      cloudEntries,
      totalCommands: localEntries.length + cloudEntries,
      mostUsedCommand,
      averageCommandLength: localEntries.length > 0 ? totalLength / localEntries.length : 0,
    };
  }

  /**
   * Enable or disable cloud sync
   */
  public setCloudSyncEnabled(enabled: boolean): void {
    this.enhancedConfig.enableCloudSync = enabled;
    
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
    if (this.enhancedConfig.enableCloudSync) {
      this.syncToCloud().catch(error => {
        console.error('Failed to final sync on destroy:', error);
      });
    }
  }
}

export default EnhancedHistorySystem;