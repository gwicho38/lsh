/**
 * Daemon Command Registrar
 * Registers all daemon-related CLI commands using BaseCommandRegistrar
 */
import { Command } from 'commander';
import { BaseCommandRegistrar } from '../../lib/base-command-registrar.js';
export declare class DaemonCommandRegistrar extends BaseCommandRegistrar {
    constructor();
    register(program: Command): Promise<void>;
    private registerDaemonControlCommands;
    private registerJobManagementCommands;
    private registerDatabaseCommands;
    private cleanupDaemon;
}
