/**
 * Sync Commands
 * Native IPFS sync for secrets management (mirrors mcli pattern)
 *
 * Usage: lsh sync <command>
 */
import { Command } from 'commander';
/**
 * Register sync commands
 */
export declare function registerSyncCommands(program: Command): void;
export default registerSyncCommands;
