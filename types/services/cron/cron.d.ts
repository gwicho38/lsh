/**
 * Cron Service - CLI command registration
 * Uses CronCommandRegistrar for clean, maintainable command setup
 */
import { Command } from 'commander';
export declare function init_cron(program: Command): Promise<void>;
