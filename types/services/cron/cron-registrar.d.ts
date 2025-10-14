/**
 * Cron Command Registrar
 * Registers all cron-related CLI commands using BaseCommandRegistrar
 */
import { Command } from 'commander';
import { BaseCommandRegistrar } from '../../lib/base-command-registrar.js';
export declare class CronCommandRegistrar extends BaseCommandRegistrar {
    constructor();
    register(program: Command): Promise<void>;
    private registerTemplateCommands;
    private registerJobManagementCommands;
    private registerReportingCommands;
}
