/**
 * Supabase Client Configuration
 * Provides database connectivity for LSH features
 */

import { createClient } from '@supabase/supabase-js';

// Supabase configuration from environment variables
// IMPORTANT: These must be set in .env or environment
// See .env.example for configuration details

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  databaseUrl?: string;
}

export class SupabaseClient {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private client: any;
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
      const { _data, error } = await this.client
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

function getDefaultClient(): SupabaseClient {
  if (!_supabaseClient) {
    _supabaseClient = new SupabaseClient();
  }
  return _supabaseClient;
}

export const supabaseClient = {
  getClient() {
    return getDefaultClient().getClient();
  },
  async testConnection() {
    return getDefaultClient().testConnection();
  },
  getConnectionInfo() {
    return getDefaultClient().getConnectionInfo();
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