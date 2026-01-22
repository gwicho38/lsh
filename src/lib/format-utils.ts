/**
 * Format Utilities for Secret Export
 * Supports multiple output formats: env, json, yaml, toml, export
 */

import yaml from 'js-yaml';
// Note: We use manual TOML formatting for better control over output
// import { stringify as stringifyToml } from 'smol-toml';

export type OutputFormat = 'env' | 'json' | 'yaml' | 'toml' | 'export';

export interface SecretEntry {
  key: string;
  value: string;
}

/**
 * Mask a secret value showing only first 3 and last 3 characters
 */
// TODO(@gwicho38): Review - maskSecret
export function maskSecret(value: string): string {
  if (value.length <= 6) {
    return '***';
  }
  return `${value.slice(0, 3)}***${value.slice(-3)}`;
}

/**
 * Apply masking to secrets array
 */
// TODO(@gwicho38): Review - maskSecrets
export function maskSecrets(secrets: SecretEntry[]): SecretEntry[] {
  return secrets.map(({ key, value }) => ({
    key,
    value: maskSecret(value),
  }));
}

/**
 * Detect namespaces from key prefixes for TOML grouping
 * E.g., DATABASE_URL, DATABASE_PORT -> namespace: "database"
 */
// TODO(@gwicho38): Review - detectNamespaces
export function detectNamespaces(secrets: SecretEntry[]): Map<string, SecretEntry[]> {
  const namespaces = new Map<string, SecretEntry[]>();
  const ungrouped: SecretEntry[] = [];

  // Common prefixes to detect
  const prefixPattern = /^([A-Z][A-Z0-9]*?)_(.+)$/;

  for (const secret of secrets) {
    const match = secret.key.match(prefixPattern);

    if (match) {
      const [, prefix, remainder] = match;
      const namespace = prefix.toLowerCase();

      // Only create namespace if we have multiple keys with same prefix
      if (!namespaces.has(namespace)) {
        namespaces.set(namespace, []);
      }

      namespaces.get(namespace)!.push({
        key: remainder,
        value: secret.value,
      });
    } else {
      ungrouped.push(secret);
    }
  }

  // Filter out single-item namespaces (not worth grouping)
  const filtered = new Map<string, SecretEntry[]>();
  for (const [ns, entries] of namespaces.entries()) {
    if (entries.length > 1) {
      filtered.set(ns, entries);
    } else {
      // Move single-entry namespaces back to ungrouped
      ungrouped.push({
        key: `${ns.toUpperCase()}_${entries[0].key}`,
        value: entries[0].value,
      });
    }
  }

  // Add ungrouped as special namespace if exists
  if (ungrouped.length > 0) {
    filtered.set('_root', ungrouped);
  }

  return filtered;
}

/**
 * Format secrets as .env file (KEY=value)
 */
// TODO(@gwicho38): Review - formatAsEnv
export function formatAsEnv(secrets: SecretEntry[]): string {
  return secrets.map(({ key, value }) => `${key}=${value}`).join('\n');
}

/**
 * Format secrets as JSON object
 */
// TODO(@gwicho38): Review - formatAsJSON
export function formatAsJSON(secrets: SecretEntry[]): string {
  const obj: Record<string, string> = {};
  for (const { key, value } of secrets) {
    obj[key] = value;
  }
  return JSON.stringify(obj, null, 2);
}

/**
 * Format secrets as YAML
 */
// TODO(@gwicho38): Review - formatAsYAML
export function formatAsYAML(secrets: SecretEntry[]): string {
  const obj: Record<string, string> = {};
  for (const { key, value } of secrets) {
    obj[key] = value;
  }
  return yaml.dump(obj, {
    lineWidth: -1, // Don't wrap long lines
    noRefs: true,
  });
}

/**
 * Format secrets as TOML with namespace detection
 */
// TODO(@gwicho38): Review - formatAsTOML
export function formatAsTOML(secrets: SecretEntry[]): string {
  const namespaces = detectNamespaces(secrets);
  const lines: string[] = [];

  // Process root (ungrouped) keys first
  if (namespaces.has('_root')) {
    const rootEntries = namespaces.get('_root')!;
    for (const { key, value } of rootEntries) {
      lines.push(`${key} = ${JSON.stringify(value)}`);
    }
    namespaces.delete('_root');
  }

  // Process namespaced keys
  for (const [namespace, entries] of namespaces.entries()) {
    if (lines.length > 0) {
      lines.push(''); // Blank line before section
    }
    lines.push(`[${namespace}]`);

    for (const { key, value } of entries) {
      lines.push(`${key} = ${JSON.stringify(value)}`);
    }
  }

  return lines.join('\n');
}

/**
 * Format secrets as shell export statements
 */
// TODO(@gwicho38): Review - formatAsExport
export function formatAsExport(secrets: SecretEntry[]): string {
  return secrets
    .map(({ key, value }) => {
      // Escape single quotes in value
      const escapedValue = value.replace(/'/g, "'\\''");
      return `export ${key}='${escapedValue}'`;
    })
    .join('\n');
}

/**
 * Format secrets based on specified format
 *
 * @param secrets - Array of secret entries
 * @param format - Output format
 * @param mask - Whether to mask values (auto-disabled for structured formats unless explicitly set)
 */
// TODO(@gwicho38): Review - formatSecrets
export function formatSecrets(
  secrets: SecretEntry[],
  format: OutputFormat,
  mask?: boolean
): string {
  // Auto-disable masking for structured formats unless explicitly set to true
  const shouldMask = mask ?? (format === 'env');

  const secretsToFormat = shouldMask ? maskSecrets(secrets) : secrets;

  switch (format) {
    case 'env':
      return formatAsEnv(secretsToFormat);
    case 'json':
      return formatAsJSON(secretsToFormat);
    case 'yaml':
      return formatAsYAML(secretsToFormat);
    case 'toml':
      return formatAsTOML(secretsToFormat);
    case 'export':
      return formatAsExport(secretsToFormat);
    default:
      throw new Error(`Unsupported format: ${format}`);
  }
}
