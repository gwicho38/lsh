/**
 * Supabase Command Registrar
 * Registers all Supabase-related CLI commands using BaseCommandRegistrar
 */
import { Command } from 'commander';
import { BaseCommandRegistrar } from '../../lib/base-command-registrar.js';
export declare class SupabaseCommandRegistrar extends BaseCommandRegistrar {
    constructor();
    register(program: Command): Promise<void>;
    private registerConnectionCommands;
    private registerDataCommands;
    private registerMLCommands;
}
