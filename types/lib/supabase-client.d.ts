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
        databaseUrl: string;
        isConnected: boolean;
    };
}
export declare const supabaseClient: SupabaseClient;
export default SupabaseClient;
