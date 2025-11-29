/**
 * Supabase Client Configuration
 * Provides database connectivity for LSH features
 */

import { createClient, SupabaseClient as SupabaseClientType } from '@supabase/supabase-js';

// Supabase configuration from environment variables
// IMPORTANT: These must be set in .env or environment
// See .env.example for configuration details

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  databaseUrl?: string;
}

export class SupabaseClient {
  private client: SupabaseClientType;
  private config: SupabaseConfig;

  constructor(config?: Partial<SupabaseConfig>) {
    const url = config?.url || process.env.SUPABASE_URL;
    const anonKey = config?.anonKey || process.env.SUPABASE_ANON_KEY;
    const databaseUrl = config?.databaseUrl || process.env.DATABASE_URL;

    if (!url || !anonKey) {
      throw new Error(
        'Supabase configuration missing. Please set SUPABASE_URL and SUPABASE_ANON_KEY environment variables.'
      );
    }

    this.config = {
      url,
      anonKey,
      databaseUrl,
    };

    this.client = createClient(this.config.url, this.config.anonKey);
  }

  /**
   * Get the Supabase client instance
   */
  public getClient() {
    return this.client;
  }

  /**
   * Test database connectivity
   */
  public async testConnection(): Promise<boolean> {
    try {
      const { error } = await this.client
        .from('shell_history')
        .select('count')
        .limit(1);

      return !error;
    } catch (error) {
      console.error('Supabase connection test failed:', error);
      return false;
    }
  }

  /**
   * Get database connection info
   */
  public getConnectionInfo() {
    return {
      url: this.config.url,
      databaseUrl: this.config.databaseUrl,
      isConnected: !!this.client,
    };
  }
}

// Default client instance - lazily initialized to avoid errors at module load
let _supabaseClient: SupabaseClient | null = null;
let _clientInitializationFailed = false;

function getDefaultClient(): SupabaseClient | null {
  if (_clientInitializationFailed) {
    return null;
  }

  if (!_supabaseClient) {
    try {
      _supabaseClient = new SupabaseClient();
    } catch (_error) {
      // Supabase not configured - will fall back to local storage
      _clientInitializationFailed = true;
      return null;
    }
  }
  return _supabaseClient;
}

/**
 * Check if Supabase is configured and available
 */
export function isSupabaseConfigured(): boolean {
  return !!(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY);
}

export const supabaseClient = {
  getClient() {
    const client = getDefaultClient();
    if (!client) {
      throw new Error('Supabase client not initialized. Using local storage fallback.');
    }
    return client.getClient();
  },
  async testConnection() {
    const client = getDefaultClient();
    if (!client) {
      return false;
    }
    return client.testConnection();
  },
  getConnectionInfo() {
    const client = getDefaultClient();
    if (!client) {
      return {
        url: undefined,
        databaseUrl: undefined,
        isConnected: false,
      };
    }
    return client.getConnectionInfo();
  },
  isAvailable() {
    return getDefaultClient() !== null;
  }
};

/**
 * Get Supabase client for SaaS platform
 * Uses environment variables for configuration
 * @throws {Error} If SUPABASE_URL or SUPABASE_ANON_KEY are not set
 */
export function getSupabaseClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      'Supabase configuration missing. Please set SUPABASE_URL and SUPABASE_ANON_KEY environment variables.'
    );
  }

  return createClient(url, key);
}

export default SupabaseClient;