/**
 * lsh list — print secrets from the local .env file.
 */
import { Command } from 'commander';
import { type OutputFormat } from '../lib/format-utils.js';
export declare function normalizeFormat(format: string): OutputFormat;
export declare function registerListCommand(program: Command): void;
