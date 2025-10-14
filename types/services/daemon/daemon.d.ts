/**
 * Daemon Service - CLI command registration
 * Uses DaemonCommandRegistrar for clean, maintainable command setup
 */
import { Command } from 'commander';
export declare function init_daemon(program: Command): Promise<void>;
