/**
 * Local File-Based Storage Adapter
 * Provides persistence when Supabase/PostgreSQL is not available
 * Uses JSON files for storage - suitable for development and single-user deployments
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import {
  ShellHistoryEntry,
  ShellJob,
  ShellConfiguration,
  ShellAlias,
  ShellFunction,
} from './database-schema.js';

export interface LocalStorageConfig {
  dataDir?: string;
  autoFlush?: boolean;
  flushInterval?: number;
}

interface StorageData {
  shell_history: ShellHistoryEntry[];
  shell_jobs: ShellJob[];
  shell_configuration: ShellConfiguration[];
  shell_sessions: Array<{
    id?: string;
    user_id?: string;
    session_id: string;
    hostname: string;
    working_directory: string;
    environment_variables: Record<string, string>;
    started_at: string;
    ended_at?: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
  }>;
  shell_aliases: ShellAlias[];
  shell_functions: ShellFunction[];
  shell_completions: Array<{
    id?: string;
    user_id?: string;
    command: string;
    completions: string[];
    is_active: boolean;
    created_at: string;
    updated_at: string;
  }>;
}

/**
 * Local file-based storage adapter
 * Implements same interface as DatabasePersistence but uses local JSON files
 */
export class LocalStorageAdapter {
  private dataDir: string;
  private dataFile: string;
  private data: StorageData;
  private userId?: string;
  private sessionId: string;
  private autoFlush: boolean;
  private flushInterval?: NodeJS.Timeout;
  private isDirty = false;

  constructor(userId?: string, config: LocalStorageConfig = {}) {
    this.userId = userId;
    this.sessionId = this.generateSessionId();
    this.dataDir = config.dataDir || path.join(os.homedir(), '.lsh', 'data');
    this.dataFile = path.join(this.dataDir, 'storage.json');
    this.autoFlush = config.autoFlush !== false; // default true

    // Initialize empty data structure
    this.data = {
      shell_history: [],
      shell_jobs: [],
      shell_configuration: [],
      shell_sessions: [],
      shell_aliases: [],
      shell_functions: [],
      shell_completions: [],
    };

    // Start auto-flush if enabled
    if (this.autoFlush) {
      const interval = config.flushInterval || 5000; // default 5s
      this.flushInterval = setInterval(() => this.flush(), interval);
    }
  }

  /**
   * Initialize storage directory and load existing data
   */
  async initialize(): Promise<void> {
    try {
      // Create data directory if it doesn't exist
      await fs.mkdir(this.dataDir, { recursive: true });

      // Load existing data if file exists
      try {
        const content = await fs.readFile(this.dataFile, 'utf-8');
        this.data = JSON.parse(content);
      } catch (_error) {
        // File doesn't exist yet, use empty data
        await this.flush();
      }
    } catch (error) {
      console.error('Failed to initialize local storage:', error);
      throw error;
    }
  }

  /**
   * Flush in-memory data to disk
   */
  async flush(): Promise<void> {
    if (!this.isDirty) {
      return;
    }

    try {
      await fs.writeFile(
        this.dataFile,
        JSON.stringify(this.data, null, 2),
        'utf-8'
      );
      this.isDirty = false;
    } catch (error) {
      console.error('Failed to flush data to disk:', error);
      throw error;
    }
  }

  /**
   * Mark data as dirty (needs flush)
   */
  private markDirty(): void {
    this.isDirty = true;
  }

  /**
   * Reload data from disk (useful to get latest data from other processes)
   */
  async reload(): Promise<void> {
    try {
      const content = await fs.readFile(this.dataFile, 'utf-8');
      this.data = JSON.parse(content);
      this.isDirty = false;
    } catch (_error) {
      // File doesn't exist or can't be read - use current in-memory data
      // Don't throw here, as this is expected on first run
    }
  }

  /**
   * Cleanup and flush on exit
   */
  async cleanup(): Promise<void> {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    await this.flush();
  }

  /**
   * Generate a unique session ID
   */
  private generateSessionId(): string {
    return `lsh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate a unique ID
   */
  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Save shell history entry
   */
  async saveHistoryEntry(entry: Omit<ShellHistoryEntry, 'id' | 'created_at' | 'updated_at'>): Promise<boolean> {
    try {
      const newEntry: ShellHistoryEntry = {
        ...entry,
        id: this.generateId(),
        user_id: this.userId,
        session_id: this.sessionId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      this.data.shell_history.push(newEntry);
      this.markDirty();
      return true;
    } catch (error) {
      console.error('Error saving history entry:', error);
      return false;
    }
  }

  /**
   * Get shell history entries
   */
  async getHistoryEntries(limit: number = 100, offset: number = 0): Promise<ShellHistoryEntry[]> {
    try {
      const filtered = this.data.shell_history.filter(entry =>
        this.userId ? entry.user_id === this.userId : entry.user_id === undefined || entry.user_id === null
      );

      // Sort by timestamp descending
      filtered.sort((a, b) => {
        const timeA = new Date(a.timestamp).getTime();
        const timeB = new Date(b.timestamp).getTime();
        return timeB - timeA;
      });

      return filtered.slice(offset, offset + limit);
    } catch (error) {
      console.error('Error getting history entries:', error);
      return [];
    }
  }

  /**
   * Save shell job
   */
  async saveJob(job: Omit<ShellJob, 'id' | 'created_at' | 'updated_at'>): Promise<boolean> {
    try {
      const newJob: ShellJob = {
        ...job,
        id: this.generateId(),
        user_id: this.userId,
        session_id: this.sessionId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      this.data.shell_jobs.push(newJob);
      this.markDirty();
      return true;
    } catch (error) {
      console.error('Error saving job:', error);
      return false;
    }
  }

  /**
   * Update shell job status
   */
  async updateJobStatus(jobId: string, status: ShellJob['status'], exitCode?: number): Promise<boolean> {
    try {
      const job = this.data.shell_jobs.find(j =>
        j.job_id === jobId &&
        (this.userId ? j.user_id === this.userId : j.user_id === undefined || j.user_id === null)
      );

      if (!job) {
        return false;
      }

      job.status = status;
      job.updated_at = new Date().toISOString();

      if (status === 'completed' || status === 'failed') {
        job.completed_at = new Date().toISOString();
        if (exitCode !== undefined) {
          job.exit_code = exitCode;
        }
      }

      this.markDirty();
      return true;
    } catch (error) {
      console.error('Error updating job status:', error);
      return false;
    }
  }

  /**
   * Get active jobs
   */
  async getActiveJobs(): Promise<ShellJob[]> {
    try {
      return this.data.shell_jobs
        .filter(job =>
          ['running', 'stopped', 'completed', 'failed'].includes(job.status) &&
          (this.userId ? job.user_id === this.userId : job.user_id === undefined || job.user_id === null)
        )
        .sort((a, b) => {
          const timeA = new Date(a.created_at || 0).getTime();
          const timeB = new Date(b.created_at || 0).getTime();
          return timeB - timeA;
        });
    } catch (error) {
      console.error('Error getting active jobs:', error);
      return [];
    }
  }

  /**
   * Save shell configuration
   */
  async saveConfiguration(config: Omit<ShellConfiguration, 'id' | 'created_at' | 'updated_at'>): Promise<boolean> {
    try {
      // Find existing config
      const existingIndex = this.data.shell_configuration.findIndex(c =>
        c.user_id === (this.userId || null) &&
        c.config_key === config.config_key
      );

      const newConfig: ShellConfiguration = {
        ...config,
        id: existingIndex >= 0 ? this.data.shell_configuration[existingIndex].id : this.generateId(),
        user_id: this.userId,
        created_at: existingIndex >= 0 ? this.data.shell_configuration[existingIndex].created_at : new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (existingIndex >= 0) {
        this.data.shell_configuration[existingIndex] = newConfig;
      } else {
        this.data.shell_configuration.push(newConfig);
      }

      this.markDirty();
      return true;
    } catch (error) {
      console.error('Error saving configuration:', error);
      return false;
    }
  }

  /**
   * Get shell configuration
   */
  async getConfiguration(key?: string): Promise<ShellConfiguration[]> {
    try {
      let filtered = this.data.shell_configuration.filter(config =>
        this.userId ? config.user_id === this.userId : config.user_id === undefined || config.user_id === null
      );

      if (key) {
        filtered = filtered.filter(config => config.config_key === key);
      }

      return filtered;
    } catch (error) {
      console.error('Error getting configuration:', error);
      return [];
    }
  }

  /**
   * Save shell alias
   */
  async saveAlias(alias: Omit<ShellAlias, 'id' | 'created_at' | 'updated_at'>): Promise<boolean> {
    try {
      const existingIndex = this.data.shell_aliases.findIndex(a =>
        a.user_id === (this.userId || null) &&
        a.alias_name === alias.alias_name
      );

      const newAlias: ShellAlias = {
        ...alias,
        id: existingIndex >= 0 ? this.data.shell_aliases[existingIndex].id : this.generateId(),
        user_id: this.userId,
        created_at: existingIndex >= 0 ? this.data.shell_aliases[existingIndex].created_at : new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (existingIndex >= 0) {
        this.data.shell_aliases[existingIndex] = newAlias;
      } else {
        this.data.shell_aliases.push(newAlias);
      }

      this.markDirty();
      return true;
    } catch (error) {
      console.error('Error saving alias:', error);
      return false;
    }
  }

  /**
   * Get shell aliases
   */
  async getAliases(): Promise<ShellAlias[]> {
    try {
      return this.data.shell_aliases.filter(alias =>
        alias.is_active &&
        (this.userId ? alias.user_id === this.userId : alias.user_id === undefined || alias.user_id === null)
      );
    } catch (error) {
      console.error('Error getting aliases:', error);
      return [];
    }
  }

  /**
   * Save shell function
   */
  async saveFunction(func: Omit<ShellFunction, 'id' | 'created_at' | 'updated_at'>): Promise<boolean> {
    try {
      const existingIndex = this.data.shell_functions.findIndex(f =>
        f.user_id === (this.userId || null) &&
        f.function_name === func.function_name
      );

      const newFunc: ShellFunction = {
        ...func,
        id: existingIndex >= 0 ? this.data.shell_functions[existingIndex].id : this.generateId(),
        user_id: this.userId,
        created_at: existingIndex >= 0 ? this.data.shell_functions[existingIndex].created_at : new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (existingIndex >= 0) {
        this.data.shell_functions[existingIndex] = newFunc;
      } else {
        this.data.shell_functions.push(newFunc);
      }

      this.markDirty();
      return true;
    } catch (error) {
      console.error('Error saving function:', error);
      return false;
    }
  }

  /**
   * Get shell functions
   */
  async getFunctions(): Promise<ShellFunction[]> {
    try {
      return this.data.shell_functions.filter(func =>
        func.is_active &&
        (this.userId ? func.user_id === this.userId : func.user_id === undefined || func.user_id === null)
      );
    } catch (error) {
      console.error('Error getting functions:', error);
      return [];
    }
  }

  /**
   * Start a new shell session
   */
  async startSession(workingDirectory: string, environmentVariables: Record<string, string>): Promise<boolean> {
    try {
      const newSession = {
        id: this.generateId(),
        user_id: this.userId,
        session_id: this.sessionId,
        hostname: os.hostname(),
        working_directory: workingDirectory,
        environment_variables: environmentVariables,
        started_at: new Date().toISOString(),
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      this.data.shell_sessions.push(newSession);
      this.markDirty();
      return true;
    } catch (error) {
      console.error('Error starting session:', error);
      return false;
    }
  }

  /**
   * End the current shell session
   */
  async endSession(): Promise<boolean> {
    try {
      const session = this.data.shell_sessions.find(s =>
        s.session_id === this.sessionId &&
        (this.userId ? s.user_id === this.userId : s.user_id === undefined || s.user_id === null)
      );

      if (!session) {
        return false;
      }

      session.ended_at = new Date().toISOString();
      session.is_active = false;
      session.updated_at = new Date().toISOString();

      this.markDirty();
      return true;
    } catch (error) {
      console.error('Error ending session:', error);
      return false;
    }
  }

  /**
   * Test storage connectivity (always succeeds for local storage)
   */
  async testConnection(): Promise<boolean> {
    try {
      await fs.access(this.dataDir);
      return true;
    } catch (_error) {
      return false;
    }
  }

  /**
   * Get session ID
   */
  getSessionId(): string {
    return this.sessionId;
  }

  /**
   * Get latest rows from all tables
   */
  async getLatestRows(limit: number = 5): Promise<{
    [tableName: string]: Record<string, unknown>[]
  }> {
    const result: { [tableName: string]: Record<string, unknown>[] } = {};

    try {
      // Get latest shell history entries
      const history = this.data.shell_history
        .filter(entry => this.userId ? entry.user_id === this.userId : entry.user_id === undefined || entry.user_id === null)
        .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
        .slice(0, limit);
      result.shell_history = history as unknown as Record<string, unknown>[];

      // Get latest shell jobs
      const jobs = this.data.shell_jobs
        .filter(job => this.userId ? job.user_id === this.userId : job.user_id === undefined || job.user_id === null)
        .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
        .slice(0, limit);
      result.shell_jobs = jobs as unknown as Record<string, unknown>[];

      // Get latest shell configuration
      const config = this.data.shell_configuration
        .filter(cfg => this.userId ? cfg.user_id === this.userId : cfg.user_id === undefined || cfg.user_id === null)
        .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
        .slice(0, limit);
      result.shell_configuration = config as unknown as Record<string, unknown>[];

      // Get latest shell sessions
      const sessions = this.data.shell_sessions
        .filter(session => this.userId ? session.user_id === this.userId : session.user_id === undefined || session.user_id === null)
        .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
        .slice(0, limit);
      result.shell_sessions = sessions as unknown as Record<string, unknown>[];

      // Get latest shell aliases
      const aliases = this.data.shell_aliases
        .filter(alias => this.userId ? alias.user_id === this.userId : alias.user_id === undefined || alias.user_id === null)
        .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
        .slice(0, limit);
      result.shell_aliases = aliases as unknown as Record<string, unknown>[];

      // Get latest shell functions
      const functions = this.data.shell_functions
        .filter(func => this.userId ? func.user_id === this.userId : func.user_id === undefined || func.user_id === null)
        .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
        .slice(0, limit);
      result.shell_functions = functions as unknown as Record<string, unknown>[];

      // Get latest shell completions
      const completions = this.data.shell_completions
        .filter(comp => this.userId ? comp.user_id === this.userId : comp.user_id === undefined || comp.user_id === null)
        .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
        .slice(0, limit);
      result.shell_completions = completions as unknown as Record<string, unknown>[];

      return result;
    } catch (error) {
      console.error('Error getting latest rows:', error);
      return {};
    }
  }

  /**
   * Get latest rows from a specific table
   */
  async getLatestRowsFromTable(tableName: string, limit: number = 5): Promise<Record<string, unknown>[]> {
    try {
      const validTables = [
        'shell_history',
        'shell_jobs',
        'shell_configuration',
        'shell_sessions',
        'shell_aliases',
        'shell_functions',
        'shell_completions',
      ];

      if (!validTables.includes(tableName)) {
        throw new Error(`Invalid table name: ${tableName}`);
      }

      const table = this.data[tableName as keyof StorageData] as Array<{ user_id?: string; created_at?: string }>;

      return table
        .filter(row => this.userId ? row.user_id === this.userId : row.user_id === undefined || row.user_id === null)
        .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
        .slice(0, limit) as unknown as Record<string, unknown>[];
    } catch (error) {
      console.error(`Error getting latest rows from ${tableName}:`, error);
      return [];
    }
  }
}

export default LocalStorageAdapter;
