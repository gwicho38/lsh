/**
 * Database Persistence Layer for LSH
 * Handles data synchronization with Supabase PostgreSQL
 */
import { ShellHistoryEntry, ShellJob, ShellConfiguration, ShellAlias, ShellFunction } from './database-schema.js';
export declare class DatabasePersistence {
    private client;
    private userId?;
    private sessionId;
    constructor(userId?: string);
    /**
     * Generate a deterministic UUID from username
     */
    private generateUserUUID;
    /**
     * Generate a unique session ID
     */
    private generateSessionId;
    /**
     * Initialize database schema
     */
    initializeSchema(): Promise<boolean>;
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
     * Test database connectivity
     */
    testConnection(): Promise<boolean>;
    /**
     * Get session ID
     */
    getSessionId(): string;
    /**
     * Get latest rows from all database tables
     */
    getLatestRows(limit?: number): Promise<{
        [tableName: string]: Record<string, unknown>[];
    }>;
    /**
     * Get latest rows from a specific table
     */
    getLatestRowsFromTable(tableName: string, limit?: number): Promise<Record<string, unknown>[]>;
}
export default DatabasePersistence;
