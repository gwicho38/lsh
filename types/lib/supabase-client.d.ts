/**
 * Supabase Client Configuration
 * Provides database connectivity for LSH features
 */
export interface SupabaseConfig {
    url: string;
    anonKey: string;
    databaseUrl?: string;
}
export declare class SupabaseClient {
    private client;
    private config;
    constructor(config?: Partial<SupabaseConfig>);
    /**
     * Get the Supabase client instance
     */
    getClient(): any;
    /**
     * Test database connectivity
     */
    testConnection(): Promise<boolean>;
    /**
     * Get database connection info
     */
    getConnectionInfo(): {
        url: string;
        databaseUrl: string | undefined;
        isConnected: boolean;
    };
}
/**
 * Check if Supabase is configured and available
 */
export declare function isSupabaseConfigured(): boolean;
export declare const supabaseClient: {
    getClient(): any;
    testConnection(): Promise<boolean>;
    getConnectionInfo(): {
        url: string;
        databaseUrl: string | undefined;
        isConnected: boolean;
    } | {
        url: undefined;
        databaseUrl: undefined;
        isConnected: boolean;
    };
    isAvailable(): boolean;
};
/**
 * Get Supabase client for SaaS platform
 * Uses environment variables for configuration
 * @throws {Error} If SUPABASE_URL or SUPABASE_ANON_KEY are not set
 */
export declare function getSupabaseClient(): import("@supabase/supabase-js").SupabaseClient<any, "public", "public", any, any>;
export default SupabaseClient;
