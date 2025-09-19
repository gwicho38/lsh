/**
 * Database Persistence Layer for LSH
 * Handles data synchronization with Supabase PostgreSQL
 */

import { supabaseClient } from './supabase-client.js';
import * as os from 'os';
import {
  ShellHistoryEntry,
  ShellJob,
  ShellConfiguration,
  ShellSession,
  ShellAlias,
  ShellFunction,
  ShellCompletion,
} from './database-schema.js';

export class DatabasePersistence {
  private client: any;
  private userId?: string;
  private sessionId: string;

  constructor(userId?: string) {
    this.client = supabaseClient.getClient();
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
   * Save shell history entry
   */
  public async saveHistoryEntry(entry: Omit<ShellHistoryEntry, 'id' | 'created_at' | 'updated_at'>): Promise<boolean> {
    try {
      const insertData: any = {
        ...entry,
        session_id: this.sessionId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Only include user_id if it's not undefined
      if (this.userId !== undefined) {
        insertData.user_id = this.userId;
      }

      const { data, error } = await this.client
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
    try {
      let query = this.client
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
    try {
      const insertData: any = {
        ...job,
        session_id: this.sessionId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Only include user_id if it's not undefined
      if (this.userId !== undefined) {
        insertData.user_id = this.userId;
      }

      const { data, error } = await this.client
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
    try {
      const updateData: any = {
        status,
        updated_at: new Date().toISOString(),
      };

      if (status === 'completed' || status === 'failed') {
        updateData.completed_at = new Date().toISOString();
        if (exitCode !== undefined) {
          updateData.exit_code = exitCode;
        }
      }

      let query = this.client
        .from('shell_jobs')
        .update(updateData)
        .eq('job_id', jobId);

      // Only filter by user_id if it's not undefined
      if (this.userId !== undefined) {
        query = query.eq('user_id', this.userId);
      } else {
        query = query.is('user_id', null);
      }

      const { data, error } = await query;

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
    try {
      let query = this.client
        .from('shell_jobs')
        .select('*')
        .in('status', ['running', 'stopped'])
        .order('started_at', { ascending: false });

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
    try {
      const upsertData: any = {
        ...config,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Only include user_id if it's not undefined
      if (this.userId !== undefined) {
        upsertData.user_id = this.userId;
      }

      const { data, error } = await this.client
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
    try {
      let query = this.client
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
    try {
      const upsertData: any = {
        ...alias,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Only include user_id if it's not undefined
      if (this.userId !== undefined) {
        upsertData.user_id = this.userId;
      }

      const { data, error } = await this.client
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
    try {
      let query = this.client
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
    try {
      const upsertData: any = {
        ...func,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Only include user_id if it's not undefined
      if (this.userId !== undefined) {
        upsertData.user_id = this.userId;
      }

      const { data, error } = await this.client
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
    try {
      let query = this.client
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
    try {
      const insertData: any = {
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

      const { data, error } = await this.client
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
    try {
      let query = this.client
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

      const { data, error } = await query;

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
    return await supabaseClient.testConnection();
  }

  /**
   * Get session ID
   */
  public getSessionId(): string {
    return this.sessionId;
  }
}

export default DatabasePersistence;