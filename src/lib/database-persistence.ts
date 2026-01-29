/**
 * Database Persistence Layer for LSH
 * Handles data synchronization with Supabase PostgreSQL or local storage fallback
 */

import { supabaseClient, isSupabaseConfigured } from './supabase-client.js';
import type { SupabaseClient } from '@supabase/supabase-js';
import * as os from 'os';
import {
  ShellHistoryEntry,
  ShellJob,
  ShellConfiguration,
  ShellAlias,
  ShellFunction,
} from './database-schema.js';
import { LocalStorageAdapter } from './local-storage-adapter.js';
import { ENV_VARS } from '../constants/index.js';

export class DatabasePersistence {
  private client?: SupabaseClient;
  private localStorage?: LocalStorageAdapter;
  private userId?: string;
  private sessionId: string;
  private useLocalStorage: boolean;

  constructor(userId?: string) {
    this.useLocalStorage = !isSupabaseConfigured();

    if (this.useLocalStorage) {
      // Using local storage is normal when Supabase is not configured
      // Only show this message once per session to avoid noise
      if (!process.env[ENV_VARS.LSH_LOCAL_STORAGE_QUIET]) {
        console.log('ℹ️  Using local storage (Supabase not configured)');
      }
      this.localStorage = new LocalStorageAdapter(userId);
      this.localStorage.initialize().catch(err => {
        console.error('Failed to initialize local storage:', err);
      });
    } else {
      // Supabase is configured, use it exclusively
      try {
        this.client = supabaseClient.getClient();
      } catch (error) {
        // If Supabase is configured but fails, throw error instead of falling back
        console.error('⚠️  Supabase is configured but connection failed:', error);
        throw new Error('Supabase connection failed. Check your SUPABASE_URL and SUPABASE_ANON_KEY configuration.');
      }
    }

    this.userId = userId ? this.generateUserUUID(userId) : undefined;
    this.sessionId = this.generateSessionId();
  }

  /**
   * Generate a deterministic UUID from username
   */
  private generateUserUUID(username: string): string {
    // Create a simple UUID v5-like deterministic UUID from username
    // In production, you'd use a proper UUID library
    const hash = username.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);

    const hex = Math.abs(hash).toString(16).padStart(8, '0');
    return `${hex.substr(0,8)}-${hex.substr(0,4)}-4${hex.substr(1,3)}-8${hex.substr(0,3)}-${hex}${hex.substr(0,4)}`;
  }

  /**
   * Generate a unique session ID
   */
  private generateSessionId(): string {
    return `lsh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Initialize database schema
   */
  public async initializeSchema(): Promise<boolean> {
    try {
      // Note: In a real implementation, you'd need to run the SQL schema
      // This would typically be done through Supabase dashboard or migrations
      console.log('Database schema initialization would be handled by Supabase migrations');
      return true;
    } catch (error) {
      console.error('Failed to initialize database schema:', error);
      return false;
    }
  }

  /**
   * Cleanup resources (stop timers, close connections)
   * Call this when done to allow process to exit
   */
  public async cleanup(): Promise<void> {
    if (this.localStorage) {
      await this.localStorage.cleanup();
    }
    // Supabase client doesn't need cleanup (no persistent connections)
  }

  /**
   * Save shell history entry
   */
  public async saveHistoryEntry(entry: Omit<ShellHistoryEntry, 'id' | 'created_at' | 'updated_at'>): Promise<boolean> {
    if (this.useLocalStorage && this.localStorage) {
      return this.localStorage.saveHistoryEntry(entry);
    }

    try {
      const insertData: Record<string, unknown> = {
        ...entry,
        session_id: this.sessionId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Only include user_id if it's not undefined
      if (this.userId !== undefined) {
        insertData.user_id = this.userId;
      }

      const { error } = await this.client!
        .from('shell_history')
        .insert([insertData]);

      if (error) {
        console.error('Failed to save history entry:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error saving history entry:', error);
      return false;
    }
  }

  /**
   * Get shell history entries
   */
  public async getHistoryEntries(limit: number = 100, offset: number = 0): Promise<ShellHistoryEntry[]> {
    if (this.useLocalStorage && this.localStorage) {
      return this.localStorage.getHistoryEntries(limit, offset);
    }

    try {
      let query = this.client!
        .from('shell_history')
        .select('*')
        .order('timestamp', { ascending: false })
        .range(offset, offset + limit - 1);

      // Only filter by user_id if it's not undefined
      if (this.userId !== undefined) {
        query = query.eq('user_id', this.userId);
      } else {
        query = query.is('user_id', null);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Failed to get history entries:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error getting history entries:', error);
      return [];
    }
  }

  /**
   * Save shell job
   */
  public async saveJob(job: Omit<ShellJob, 'id' | 'created_at' | 'updated_at'>): Promise<boolean> {
    if (this.useLocalStorage && this.localStorage) {
      return this.localStorage.saveJob(job);
    }

    try {
      const insertData: Record<string, unknown> = {
        ...job,
        session_id: this.sessionId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Only include user_id if it's not undefined
      if (this.userId !== undefined) {
        insertData.user_id = this.userId;
      }

      const { error } = await this.client!
        .from('shell_jobs')
        .insert([insertData]);

      if (error) {
        console.error('Failed to save job:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error saving job:', error);
      return false;
    }
  }

  /**
   * Update shell job status
   */
  public async updateJobStatus(jobId: string, status: ShellJob['status'], exitCode?: number): Promise<boolean> {
    if (this.useLocalStorage && this.localStorage) {
      return this.localStorage.updateJobStatus(jobId, status, exitCode);
    }

    try {
      const updateData: Record<string, unknown> = {
        status,
        updated_at: new Date().toISOString(),
      };

      if (status === 'completed' || status === 'failed') {
        updateData.completed_at = new Date().toISOString();
        if (exitCode !== undefined) {
          updateData.exit_code = exitCode;
        }
      }

      let query = this.client!
        .from('shell_jobs')
        .update(updateData)
        .eq('job_id', jobId);

      // Only filter by user_id if it's not undefined
      if (this.userId !== undefined) {
        query = query.eq('user_id', this.userId);
      } else {
        query = query.is('user_id', null);
      }

      const { error } = await query;

      if (error) {
        console.error('Failed to update job status:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error updating job status:', error);
      return false;
    }
  }

  /**
   * Get active jobs
   */
  public async getActiveJobs(): Promise<ShellJob[]> {
    if (this.useLocalStorage && this.localStorage) {
      // Reload from disk to get latest data (in case written by another SecretsManager instance)
      await this.localStorage.reload();
      return this.localStorage.getActiveJobs();
    }

    try {
      let query = this.client!
        .from('shell_jobs')
        .select('*')
        .in('status', ['running', 'stopped', 'completed', 'failed'])
        .order('created_at', { ascending: false });

      // Only filter by user_id if it's not undefined
      if (this.userId !== undefined) {
        query = query.eq('user_id', this.userId);
      } else {
        query = query.is('user_id', null);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Failed to get active jobs:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error getting active jobs:', error);
      return [];
    }
  }

  /**
   * Save shell configuration
   */
  public async saveConfiguration(config: Omit<ShellConfiguration, 'id' | 'created_at' | 'updated_at'>): Promise<boolean> {
    if (this.useLocalStorage && this.localStorage) {
      return this.localStorage.saveConfiguration(config);
    }

    try {
      const upsertData: Record<string, unknown> = {
        ...config,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Only include user_id if it's not undefined
      if (this.userId !== undefined) {
        upsertData.user_id = this.userId;
      }

      const { error } = await this.client!
        .from('shell_configuration')
        .upsert([upsertData], {
          onConflict: 'user_id,config_key'
        });

      if (error) {
        console.error('Failed to save configuration:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error saving configuration:', error);
      return false;
    }
  }

  /**
   * Get shell configuration
   */
  public async getConfiguration(key?: string): Promise<ShellConfiguration[]> {
    if (this.useLocalStorage && this.localStorage) {
      return this.localStorage.getConfiguration(key);
    }

    try {
      let query = this.client!
        .from('shell_configuration')
        .select('*');

      // Only filter by user_id if it's not undefined
      if (this.userId !== undefined) {
        query = query.eq('user_id', this.userId);
      } else {
        // If no user_id, get only default configurations
        query = query.is('user_id', null);
      }

      if (key) {
        query = query.eq('config_key', key);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Failed to get configuration:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error getting configuration:', error);
      return [];
    }
  }

  /**
   * Save shell alias
   */
  public async saveAlias(alias: Omit<ShellAlias, 'id' | 'created_at' | 'updated_at'>): Promise<boolean> {
    if (this.useLocalStorage && this.localStorage) {
      return this.localStorage.saveAlias(alias);
    }

    try {
      const upsertData: Record<string, unknown> = {
        ...alias,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Only include user_id if it's not undefined
      if (this.userId !== undefined) {
        upsertData.user_id = this.userId;
      }

      const { error } = await this.client!
        .from('shell_aliases')
        .upsert([upsertData], {
          onConflict: 'user_id,alias_name'
        });

      if (error) {
        console.error('Failed to save alias:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error saving alias:', error);
      return false;
    }
  }

  /**
   * Get shell aliases
   */
  public async getAliases(): Promise<ShellAlias[]> {
    if (this.useLocalStorage && this.localStorage) {
      return this.localStorage.getAliases();
    }

    try {
      let query = this.client!
        .from('shell_aliases')
        .select('*')
        .eq('is_active', true);

      // Only filter by user_id if it's not undefined
      if (this.userId !== undefined) {
        query = query.eq('user_id', this.userId);
      } else {
        query = query.is('user_id', null);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Failed to get aliases:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error getting aliases:', error);
      return [];
    }
  }

  /**
   * Save shell function
   */
  public async saveFunction(func: Omit<ShellFunction, 'id' | 'created_at' | 'updated_at'>): Promise<boolean> {
    if (this.useLocalStorage && this.localStorage) {
      return this.localStorage.saveFunction(func);
    }

    try {
      const upsertData: Record<string, unknown> = {
        ...func,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Only include user_id if it's not undefined
      if (this.userId !== undefined) {
        upsertData.user_id = this.userId;
      }

      const { error } = await this.client!
        .from('shell_functions')
        .upsert([upsertData], {
          onConflict: 'user_id,function_name'
        });

      if (error) {
        console.error('Failed to save function:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error saving function:', error);
      return false;
    }
  }

  /**
   * Get shell functions
   */
  public async getFunctions(): Promise<ShellFunction[]> {
    if (this.useLocalStorage && this.localStorage) {
      return this.localStorage.getFunctions();
    }

    try {
      let query = this.client!
        .from('shell_functions')
        .select('*')
        .eq('is_active', true);

      // Only filter by user_id if it's not undefined
      if (this.userId !== undefined) {
        query = query.eq('user_id', this.userId);
      } else {
        query = query.is('user_id', null);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Failed to get functions:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error getting functions:', error);
      return [];
    }
  }

  /**
   * Start a new shell session
   */
  public async startSession(workingDirectory: string, environmentVariables: Record<string, string>): Promise<boolean> {
    if (this.useLocalStorage && this.localStorage) {
      return this.localStorage.startSession(workingDirectory, environmentVariables);
    }

    try {
      const insertData: Record<string, unknown> = {
        session_id: this.sessionId,
        hostname: os.hostname(),
        working_directory: workingDirectory,
        environment_variables: environmentVariables,
        started_at: new Date().toISOString(),
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Only include user_id if it's not undefined
      if (this.userId !== undefined) {
        insertData.user_id = this.userId;
      }

      const { error } = await this.client!
        .from('shell_sessions')
        .insert([insertData]);

      if (error) {
        console.error('Failed to start session:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error starting session:', error);
      return false;
    }
  }

  /**
   * End the current shell session
   */
  public async endSession(): Promise<boolean> {
    if (this.useLocalStorage && this.localStorage) {
      return this.localStorage.endSession();
    }

    try {
      let query = this.client!
        .from('shell_sessions')
        .update({
          ended_at: new Date().toISOString(),
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq('session_id', this.sessionId);

      // Only filter by user_id if it's not undefined
      if (this.userId !== undefined) {
        query = query.eq('user_id', this.userId);
      } else {
        query = query.is('user_id', null);
      }

      const { error } = await query;

      if (error) {
        console.error('Failed to end session:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error ending session:', error);
      return false;
    }
  }

  /**
   * Test database connectivity
   */
  public async testConnection(): Promise<boolean> {
    if (this.useLocalStorage && this.localStorage) {
      return this.localStorage.testConnection();
    }
    return await supabaseClient.testConnection();
  }

  /**
   * Get session ID
   */
  public getSessionId(): string {
    if (this.useLocalStorage && this.localStorage) {
      return this.localStorage.getSessionId();
    }

    return this.sessionId;
  }

  /**
   * Get latest rows from all database tables
   */
  public async getLatestRows(limit: number = 5): Promise<{
    [tableName: string]: Record<string, unknown>[]
  }> {
    if (this.useLocalStorage && this.localStorage) {
      return this.localStorage.getLatestRows(limit);
    }

    const result: { [tableName: string]: Record<string, unknown>[] } = {};

    try {
      // Get latest shell history entries
      const historyQuery = this.client!
        .from('shell_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (this.userId !== undefined) {
        historyQuery.eq('user_id', this.userId);
      } else {
        historyQuery.is('user_id', null);
      }

      const { data: historyData } = await historyQuery;
      result.shell_history = historyData || [];

      // Get latest shell jobs
      const jobsQuery = this.client!
        .from('shell_jobs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (this.userId !== undefined) {
        jobsQuery.eq('user_id', this.userId);
      } else {
        jobsQuery.is('user_id', null);
      }

      const { data: jobsData } = await jobsQuery;
      result.shell_jobs = jobsData || [];

      // Get latest shell configuration
      const configQuery = this.client!
        .from('shell_configuration')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (this.userId !== undefined) {
        configQuery.eq('user_id', this.userId);
      } else {
        configQuery.is('user_id', null);
      }

      const { data: configData } = await configQuery;
      result.shell_configuration = configData || [];

      // Get latest shell sessions
      const sessionsQuery = this.client!
        .from('shell_sessions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (this.userId !== undefined) {
        sessionsQuery.eq('user_id', this.userId);
      } else {
        sessionsQuery.is('user_id', null);
      }

      const { data: sessionsData } = await sessionsQuery;
      result.shell_sessions = sessionsData || [];

      // Get latest shell aliases
      const aliasesQuery = this.client!
        .from('shell_aliases')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (this.userId !== undefined) {
        aliasesQuery.eq('user_id', this.userId);
      } else {
        aliasesQuery.is('user_id', null);
      }

      const { data: aliasesData } = await aliasesQuery;
      result.shell_aliases = aliasesData || [];

      // Get latest shell functions
      const functionsQuery = this.client!
        .from('shell_functions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (this.userId !== undefined) {
        functionsQuery.eq('user_id', this.userId);
      } else {
        functionsQuery.is('user_id', null);
      }

      const { data: functionsData } = await functionsQuery;
      result.shell_functions = functionsData || [];

      // Get latest shell completions
      const completionsQuery = this.client!
        .from('shell_completions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (this.userId !== undefined) {
        completionsQuery.eq('user_id', this.userId);
      } else {
        completionsQuery.is('user_id', null);
      }

      const { data: completionsData } = await completionsQuery;
      result.shell_completions = completionsData || [];

      // Get latest politician trading disclosures (global data, no user filtering)
      const { data: tradingData } = await this.client!
        .from('trading_disclosures')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      result.trading_disclosures = tradingData || [];

      // Get latest politicians (global data, no user filtering)
      const { data: politiciansData } = await this.client!
        .from('politicians')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      result.politicians = politiciansData || [];

      // Get latest data pull jobs (global data, no user filtering)
      const { data: dataPullJobsData } = await this.client!
        .from('data_pull_jobs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      result.data_pull_jobs = dataPullJobsData || [];

      return result;
    } catch (error) {
      console.error('Error getting latest rows:', error);
      return {};
    }
  }

  /**
   * Get latest rows from a specific table
   */
  public async getLatestRowsFromTable(tableName: string, limit: number = 5): Promise<Record<string, unknown>[]> {
    if (this.useLocalStorage && this.localStorage) {
      return this.localStorage.getLatestRowsFromTable(tableName, limit);
    }

    try {
      const validTables = [
        'shell_history',
        'shell_jobs',
        'shell_configuration',
        'shell_sessions',
        'shell_aliases',
        'shell_functions',
        'shell_completions',
        'trading_disclosures',
        'politicians',
        'data_pull_jobs'
      ];

      if (!validTables.includes(tableName)) {
        throw new Error(`Invalid table name: ${tableName}`);
      }

      let query = this.client!
        .from(tableName)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      // Filter by user_id if available (except for politician trading tables which are global)
      const globalTables = ['trading_disclosures', 'politicians', 'data_pull_jobs'];
      if (!globalTables.includes(tableName)) {
        if (this.userId !== undefined) {
          query = query.eq('user_id', this.userId);
        } else {
          query = query.is('user_id', null);
        }
      }

      const { data, error } = await query;

      if (error) {
        console.error(`Failed to get latest rows from ${tableName}:`, error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error(`Error getting latest rows from ${tableName}:`, error);
      return [];
    }
  }
}

export default DatabasePersistence;