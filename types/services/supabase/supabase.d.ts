/**
 * Supabase Service - CLI command registration
 * Uses SupabaseCommandRegistrar for clean, maintainable command setup
 */
import { Command } from 'commander';
export declare function init_supabase(program: Command): Promise<void>;
