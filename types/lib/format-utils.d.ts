/**
 * Format Utilities for Secret Export
 * Supports multiple output formats: env, json, yaml, toml, export
 */
export type OutputFormat = 'env' | 'json' | 'yaml' | 'toml' | 'export';
export interface SecretEntry {
    key: string;
    value: string;
}
/**
 * Mask a secret value showing only first 3 and last 3 characters
 */
export declare function maskSecret(value: string): string;
/**
 * Apply masking to secrets array
 */
export declare function maskSecrets(secrets: SecretEntry[]): SecretEntry[];
/**
 * Detect namespaces from key prefixes for TOML grouping
 * E.g., DATABASE_URL, DATABASE_PORT -> namespace: "database"
 */
export declare function detectNamespaces(secrets: SecretEntry[]): Map<string, SecretEntry[]>;
/**
 * Format secrets as .env file (KEY=value)
 */
export declare function formatAsEnv(secrets: SecretEntry[]): string;
/**
 * Format secrets as JSON object
 */
export declare function formatAsJSON(secrets: SecretEntry[]): string;
/**
 * Format secrets as YAML
 */
export declare function formatAsYAML(secrets: SecretEntry[]): string;
/**
 * Format secrets as TOML with namespace detection
 */
export declare function formatAsTOML(secrets: SecretEntry[]): string;
/**
 * Format secrets as shell export statements
 */
export declare function formatAsExport(secrets: SecretEntry[]): string;
/**
 * Format secrets based on specified format
 *
 * @param secrets - Array of secret entries
 * @param format - Output format
 * @param mask - Whether to mask values (auto-disabled for structured formats unless explicitly set)
 */
export declare function formatSecrets(secrets: SecretEntry[], format: OutputFormat, mask?: boolean): string;
