/**
 * lsh get — print one secret value from the local .env file.
 */
import { Command } from 'commander';
import { type FuzzyMatchResult } from '../lib/fuzzy-match.js';
import { type OutputFormat } from '../lib/format-utils.js';
export declare function normalizeFormat(format: string): OutputFormat;
export type GetResult = {
    kind: 'value';
    value: string;
} | {
    kind: 'formatted';
    output: string;
} | {
    kind: 'key-required';
} | {
    kind: 'not-found';
    key: string;
    exact: boolean;
} | {
    kind: 'ambiguous';
    key: string;
    matches: FuzzyMatchResult[];
};
export interface GetOptions {
    key?: string;
    all?: boolean;
    exact?: boolean;
    format: OutputFormat;
}
/**
 * An exact key always wins outright, so a script naming a real key can never be answered with
 * a fuzzy neighbour's value. Fuzzy matching only runs once the exact lookup has missed.
 */
export declare function resolveGet(vars: Record<string, string>, options: GetOptions): GetResult;
export declare function formatAmbiguousMatches(matches: FuzzyMatchResult[], mask: boolean): string;
export declare function registerGetCommand(program: Command): void;
