/**
 * Supabase Client Configuration
 * Provides database connectivity for LSH features
 */

import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const SUPABASE_URL = 'https://uljsqvwkomdrlnofmlad.supabase.co';
const SUPABASE_ANON_KEY = 'REDACTED';

// Database connection string (for direct PostgreSQL access if needed)
const DATABASE_URL = 'postgresql://postgres:[YOUR-PASSWORD]@db.uljsqvwkomdrlnofmlad.supabase.co:5432/postgres';

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
    this.config = {
      url: SUPABASE_URL,
      anonKey: SUPABASE_ANON_KEY,
      databaseUrl: DATABASE_URL,
      ...config,
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

// Default client instance
export const supabaseClient = new SupabaseClient();

/**
 * Get Supabase client for SaaS platform
 * Uses environment variables for configuration
 */
export function getSupabaseClient() {
  const url = process.env.SUPABASE_URL || 'https://uljsqvwkomdrlnofmlad.supabase.co';
  const key = process.env.SUPABASE_ANON_KEY || 'REDACTED';

  return createClient(url, key);
}

export default SupabaseClient;