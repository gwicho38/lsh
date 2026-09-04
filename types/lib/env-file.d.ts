/**
 * Pure .env parsing, serialization, and diffing. No I/O.
 */
export interface EnvDiff {
    added: string[];
    changed: string[];
    removed: string[];
    isEmpty: boolean;
}
export declare function parseEnv(content: string): Record<string, string>;
export declare function serializeEnv(vars: Record<string, string>): string;
/**
 * Applies `updates` to `content` line-by-line: a line whose key is in `updates` is replaced
 * with the new value, every other line (comments, blanks, unrecognized text) is returned
 * byte-identical, and keys not already present are appended. Unlike `serializeEnv`, this
 * never round-trips the file through `parseEnv`, so it can't drop comments or reformat a
 * value `parseEnv` would otherwise strip (e.g. an unquoted trailing `#` comment).
 *
 * A key that appears more than once resolves last-wins, matching `parseEnv` and dotenv — so
 * a duplicated key is updated at its last occurrence and every earlier occurrence is dropped,
 * keeping the file's resolved value in agreement with what was just set.
 */
export declare function upsertEnv(content: string, updates: Record<string, string>): string;
export declare function diffEnv(local: Record<string, string>, remote: Record<string, string>): EnvDiff;
