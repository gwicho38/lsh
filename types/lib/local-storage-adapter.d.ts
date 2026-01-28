/**
 * Local File-Based Storage Adapter
 * Provides persistence when Supabase/PostgreSQL is not available
 * Uses JSON files for storage - suitable for development and single-user deployments
 */
import { ShellHistoryEntry, ShellJob, ShellConfiguration, ShellAlias, ShellFunction } from './database-schema.js';
export interface LocalStorageConfig {
    dataDir?: string;
    autoFlush?: boolean;
    flushInterval?: number;
}
/**
 * Local file-based storage adapter
 * Implements same interface as DatabasePersistence but uses local JSON files
 */
export declare class LocalStorageAdapter {
    private dataDir;
    private dataFile;
    private data;
    private userId?;
    private sessionId;
    private autoFlush;
    private flushInterval?;
    private isDirty;
    constructor(userId?: string, config?: LocalStorageConfig);
    /**
     * Initialize storage directory and load existing data
     */
    initialize(): Promise<void>;
    /**
     * Flush in-memory data to disk
     */
    flush(): Promise<void>;
    /**
     * Mark data as dirty (needs flush)
     */
    private markDirty;
    /**
     * Reload data from disk (useful to get latest data from other processes)
     */
    reload(): Promise<void>;
    /**
     * Cleanup and flush on exit
     */
    cleanup(): Promise<void>;
    /**
     * Generate a unique session ID
     */
    private generateSessionId;
    /**
     * Generate a unique ID
     */
    private generateId;
    /**
     * Save shell history entry
     */
    saveHistoryEntry(entry: Omit<ShellHistoryEntry, 'id' | 'created_at' | 'updated_at'>): Promise<boolean>;
    /**
     * Get shell history entries
     */
    getHistoryEntries(limit?: number, offset?: number): Promise<ShellHistoryEntry[]>;
    /**
     * Save shell job
     */
    saveJob(job: Omit<ShellJob, 'id' | 'created_at' | 'updated_at'>): Promise<boolean>;
    /**
     * Update shell job status
     */
    updateJobStatus(jobId: string, status: ShellJob['status'], exitCode?: number): Promise<boolean>;
    /**
     * Get active jobs
     */
    getActiveJobs(): Promise<ShellJob[]>;
    /**
     * Get a specific job by its job_id
     */
    getJobById(jobId: string): Promise<ShellJob | null>;
    /**
     * Delete a job by its job_id
     */
    deleteJob(jobId: string): Promise<boolean>;
    /**
     * Save shell configuration
     */
    saveConfiguration(config: Omit<ShellConfiguration, 'id' | 'created_at' | 'updated_at'>): Promise<boolean>;
    /**
     * Get shell configuration
     */
    getConfiguration(key?: string): Promise<ShellConfiguration[]>;
    /**
     * Save shell alias
     */
    saveAlias(alias: Omit<ShellAlias, 'id' | 'created_at' | 'updated_at'>): Promise<boolean>;
    /**
     * Get shell aliases
     */
    getAliases(): Promise<ShellAlias[]>;
    /**
     * Save shell function
     */
    saveFunction(func: Omit<ShellFunction, 'id' | 'created_at' | 'updated_at'>): Promise<boolean>;
    /**
     * Get shell functions
     */
    getFunctions(): Promise<ShellFunction[]>;
    /**
     * Start a new shell session
     */
    startSession(workingDirectory: string, environmentVariables: Record<string, string>): Promise<boolean>;
    /**
     * End the current shell session
     */
    endSession(): Promise<boolean>;
    /**
     * Test storage connectivity (always succeeds for local storage)
     */
    testConnection(): Promise<boolean>;
    /**
     * Get session ID
     */
    getSessionId(): string;
    /**
     * Get latest rows from all tables
     */
    getLatestRows(limit?: number): Promise<{
        [tableName: string]: Record<string, unknown>[];
    }>;
    /**
     * Get latest rows from a specific table
     */
    getLatestRowsFromTable(tableName: string, limit?: number): Promise<Record<string, unknown>[]>;
}
export default LocalStorageAdapter;
