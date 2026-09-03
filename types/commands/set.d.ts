/**
 * lsh set — write secrets into the local .env file. Publishing stays an explicit `lsh push`.
 */
import { Command } from 'commander';
export interface ParsedAssignments {
    updates: Record<string, string>;
    errors: string[];
}
/**
 * Parses KEY=VALUE lines, tolerating the `export ` prefix so `printenv`, a sourced profile,
 * and `lsh get --format export` can all be piped straight in.
 */
export declare function parseAssignments(input: string): ParsedAssignments;
export declare function readStdin(): Promise<string>;
export declare function registerSetCommand(program: Command): void;
