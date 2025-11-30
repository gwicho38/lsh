#!/usr/bin/env npx ts-node
/**
 * Hardcoded Values Detection Script v2
 *
 * Scans TypeScript files in src/ to find hardcoded strings and numbers
 * that should be moved to the constants directory.
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface HardcodedValue {
  file: string;
  line: number;
  value: string;
  type: string;
  context: string;
  suggestion?: string;
}

const SRC_DIR = path.join(__dirname, '..', 'src');
const CONSTANTS_DIR = path.join(SRC_DIR, 'constants');

// Files/patterns to skip
const SKIP_FILES = [
  /\.test\.ts$/,
  /\.spec\.ts$/,
  /\.d\.ts$/,
  /constants\//,
];

// Load existing constants values
const EXISTING_CONSTANTS = new Set<string>();
const EXISTING_ENV_VARS = new Set<string>();

function loadExistingConstants(): void {
  const constantFiles = fs.readdirSync(CONSTANTS_DIR);
  for (const file of constantFiles) {
    if (!file.endsWith('.ts') || file === 'index.ts') continue;
    const content = fs.readFileSync(path.join(CONSTANTS_DIR, file), 'utf-8');

    // Extract string values
    const stringMatches = content.matchAll(/'([^']+)'|"([^"]+)"/g);
    for (const match of stringMatches) {
      const value = match[1] || match[2];
      if (value && value.length > 2) {
        EXISTING_CONSTANTS.add(value);
      }
    }

    // Extract ENV_VARS specifically
    if (file === 'config.ts') {
      const envVarMatches = content.matchAll(/:\s*'([A-Z][A-Z0-9_]+)'/g);
      for (const match of envVarMatches) {
        EXISTING_ENV_VARS.add(match[1]);
      }
    }
  }
}

// Values that are OK to have inline
const ALLOWED_INLINE = new Set([
  'utf-8', 'utf8', 'hex', 'base64', 'ascii', 'binary',
  'true', 'false', 'null', 'undefined',
  'string', 'number', 'object', 'boolean', 'function', 'symbol',
  'GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS',
  'application/json', 'text/plain', 'text/html',
  'Content-Type', 'Authorization',
  '.js', '.ts', '.json', '.md', '.txt', '.log',
  'production', 'development', 'test',
  'asc', 'desc', 'ASC', 'DESC',
  'id', 'name', 'type', 'status', 'value', 'key', 'data',
  'error', 'success', 'message', 'result', 'response', 'request',
  'start', 'stop', 'create', 'update', 'delete', 'get', 'set',
  'on', 'off', 'yes', 'no', 'ok', 'OK',
]);

function scanForHardcodedValues(filePath: string): HardcodedValue[] {
  const results: HardcodedValue[] = [];
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const relativePath = path.relative(path.join(__dirname, '..'), filePath);

  // Check if file imports constants
  const importsConstants = content.includes("from '../constants") ||
                           content.includes("from './constants") ||
                           content.includes("from '../../constants");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;
    const trimmed = line.trim();

    // Skip comments
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) {
      continue;
    }

    // 1. Environment variables not from constants
    const envVarMatches = line.matchAll(/process\.env\.([A-Z][A-Z0-9_]+)|process\.env\[['"]([A-Z][A-Z0-9_]+)['"]\]/g);
    for (const match of envVarMatches) {
      const envVar = match[1] || match[2];
      if (envVar && !ALLOWED_INLINE.has(envVar)) {
        const shouldUseConstant = EXISTING_ENV_VARS.has(envVar);
        results.push({
          file: relativePath,
          line: lineNum,
          value: envVar,
          type: 'ENV_VAR',
          context: trimmed.substring(0, 120),
          suggestion: shouldUseConstant ? `Use ENV_VARS.${envVar.toUpperCase()}` : `Add to ENV_VARS in config.ts`,
        });
      }
    }

    // 2. Port numbers
    const portMatch = line.match(/port[:\s]*[:=]?\s*['"]?(\d{4,5})['"]?|:\s*(\d{4,5})\s*[,\)]/i);
    if (portMatch) {
      const port = portMatch[1] || portMatch[2];
      const portNum = parseInt(port);
      if (portNum >= 1024 && portNum <= 65535 && !EXISTING_CONSTANTS.has(port)) {
        results.push({
          file: relativePath,
          line: lineNum,
          value: port,
          type: 'PORT',
          context: trimmed.substring(0, 120),
          suggestion: 'Add to DEFAULTS in config.ts',
        });
      }
    }

    // 3. Timeout/interval values
    const timeoutMatch = line.match(/timeout[:\s]*[:=]?\s*(\d{3,})|(\d{3,})\s*(?:ms|milliseconds?)/i);
    if (timeoutMatch) {
      const timeout = timeoutMatch[1] || timeoutMatch[2];
      if (timeout && !EXISTING_CONSTANTS.has(timeout)) {
        results.push({
          file: relativePath,
          line: lineNum,
          value: timeout,
          type: 'TIMEOUT',
          context: trimmed.substring(0, 120),
          suggestion: 'Add to DEFAULTS in config.ts',
        });
      }
    }

    // 4. API paths (not already in constants)
    const apiPathMatches = line.matchAll(/'(\/api\/[^']+)'|"(\/api\/[^"]+)"/g);
    for (const match of apiPathMatches) {
      const apiPath = match[1] || match[2];
      if (apiPath && !EXISTING_CONSTANTS.has(apiPath)) {
        results.push({
          file: relativePath,
          line: lineNum,
          value: apiPath,
          type: 'API_ENDPOINT',
          context: trimmed.substring(0, 120),
          suggestion: 'Add to ENDPOINTS in api.ts',
        });
      }
    }

    // 5. File paths (absolute paths starting with /)
    const filePathMatches = line.matchAll(/'(\/(?:tmp|var|etc|home|usr)[^']*)'|"(\/(?:tmp|var|etc|home|usr)[^"]*)"/g);
    for (const match of filePathMatches) {
      const filePath = match[1] || match[2];
      if (filePath && !EXISTING_CONSTANTS.has(filePath) && !filePath.includes('${')) {
        results.push({
          file: relativePath,
          line: lineNum,
          value: filePath,
          type: 'PATH',
          context: trimmed.substring(0, 120),
          suggestion: 'Add to PATHS in paths.ts',
        });
      }
    }

    // 6. Database table names (in .from() or .table() calls)
    const tableMatch = line.match(/\.from\(['"]([a-z_]+)['"]\)|\.table\(['"]([a-z_]+)['"]\)/);
    if (tableMatch) {
      const tableName = tableMatch[1] || tableMatch[2];
      if (tableName && !EXISTING_CONSTANTS.has(tableName)) {
        results.push({
          file: relativePath,
          line: lineNum,
          value: tableName,
          type: 'TABLE_NAME',
          context: trimmed.substring(0, 120),
          suggestion: 'Add to TABLES in database.ts',
        });
      }
    }

    // 7. Error codes and strings
    const errorCodeMatch = line.match(/error:?\s*{\s*code:\s*'([A-Z_]+)'|throw new Error\('([A-Z_]+)'\)/);
    if (errorCodeMatch) {
      const errorCode = errorCodeMatch[1] || errorCodeMatch[2];
      if (errorCode && !EXISTING_CONSTANTS.has(errorCode)) {
        results.push({
          file: relativePath,
          line: lineNum,
          value: errorCode,
          type: 'ERROR_CODE',
          context: trimmed.substring(0, 120),
          suggestion: 'Add to ERRORS in errors.ts',
        });
      }
    }

    // 8. UI messages with emojis (these should definitely be in constants)
    const emojiMsgMatch = line.match(/'((?:✅|❌|⚠️|📋|💡|🔑|ℹ️|⬆️|🔍|📁|📍)[^']*)'|"((?:✅|❌|⚠️|📋|💡|🔑|ℹ️|⬆️|🔍|📁|📍)[^"]*)"/);
    if (emojiMsgMatch) {
      const msg = emojiMsgMatch[1] || emojiMsgMatch[2];
      if (msg && !EXISTING_CONSTANTS.has(msg)) {
        results.push({
          file: relativePath,
          line: lineNum,
          value: msg.substring(0, 60) + (msg.length > 60 ? '...' : ''),
          type: 'UI_MESSAGE',
          context: trimmed.substring(0, 120),
          suggestion: 'Add to UI_MESSAGES or LOG_MESSAGES in ui.ts',
        });
      }
    }

    // 9. URLs
    const urlMatches = line.matchAll(/'(https?:\/\/[^']+)'|"(https?:\/\/[^"]+)"/g);
    for (const match of urlMatches) {
      const url = match[1] || match[2];
      if (url && !EXISTING_CONSTANTS.has(url) && !url.includes('${') &&
          !url.includes('localhost') && !url.includes('127.0.0.1')) {
        results.push({
          file: relativePath,
          line: lineNum,
          value: url.substring(0, 60) + (url.length > 60 ? '...' : ''),
          type: 'URL',
          context: trimmed.substring(0, 120),
          suggestion: 'Add to DEFAULTS or new URLS constant in config.ts',
        });
      }
    }

    // 10. Magic numbers (buffer sizes, limits, etc.)
    const magicNumMatches = line.matchAll(/(?:size|limit|max|min|buffer|chunk|capacity)[:\s]*[:=]?\s*(\d{3,})/gi);
    for (const match of magicNumMatches) {
      const num = match[1];
      if (num && !EXISTING_CONSTANTS.has(num)) {
        results.push({
          file: relativePath,
          line: lineNum,
          value: num,
          type: 'MAGIC_NUMBER',
          context: trimmed.substring(0, 120),
          suggestion: 'Add to DEFAULTS in config.ts',
        });
      }
    }
  }

  return results;
}

function scanDirectory(dir: string): HardcodedValue[] {
  const results: HardcodedValue[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '__tests__' ||
          entry.name === 'examples' || entry.name === 'declarations' ||
          entry.name === 'constants') {
        continue;
      }
      results.push(...scanDirectory(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.ts')) {
      if (SKIP_FILES.some(p => p.test(fullPath))) continue;
      results.push(...scanForHardcodedValues(fullPath));
    }
  }

  return results;
}

function deduplicateResults(results: HardcodedValue[]): HardcodedValue[] {
  const seen = new Map<string, HardcodedValue>();
  for (const r of results) {
    const key = `${r.type}:${r.value}`;
    if (!seen.has(key)) {
      seen.set(key, r);
    }
  }
  return Array.from(seen.values());
}

function groupByType(results: HardcodedValue[]): Map<string, HardcodedValue[]> {
  const groups = new Map<string, HardcodedValue[]>();
  for (const r of results) {
    const existing = groups.get(r.type) || [];
    existing.push(r);
    groups.set(r.type, existing);
  }
  return groups;
}

function main(): void {
  console.log('🔍 Scanning for hardcoded values...\n');

  loadExistingConstants();
  console.log(`📚 Loaded ${EXISTING_CONSTANTS.size} existing constant values`);
  console.log(`📚 Loaded ${EXISTING_ENV_VARS.size} existing ENV_VAR names\n`);

  const results = scanDirectory(SRC_DIR);
  const unique = deduplicateResults(results);

  if (unique.length === 0) {
    console.log('✅ No hardcoded values found!\n');
    process.exit(0);
  }

  console.log(`Found ${unique.length} unique hardcoded values:\n`);

  const groups = groupByType(unique);

  // Sort by priority
  const typeOrder = ['ENV_VAR', 'ERROR_CODE', 'API_ENDPOINT', 'TABLE_NAME', 'PORT', 'TIMEOUT', 'PATH', 'URL', 'UI_MESSAGE', 'MAGIC_NUMBER'];

  for (const type of typeOrder) {
    const items = groups.get(type);
    if (!items || items.length === 0) continue;

    console.log(`\n${'─'.repeat(70)}`);
    console.log(`📁 ${type} (${items.length} items)`);
    console.log('─'.repeat(70));

    for (const item of items.slice(0, 15)) { // Show first 15
      console.log(`\n  📍 ${item.file}:${item.line}`);
      console.log(`     Value: ${item.value}`);
      if (item.suggestion) {
        console.log(`     💡 ${item.suggestion}`);
      }
    }
    if (items.length > 15) {
      console.log(`\n  ... and ${items.length - 15} more`);
    }
  }

  console.log(`\n${'═'.repeat(70)}`);
  console.log('📊 SUMMARY');
  console.log('═'.repeat(70));

  let total = 0;
  for (const type of typeOrder) {
    const count = groups.get(type)?.length || 0;
    if (count > 0) {
      console.log(`  ${type.padEnd(15)} ${count}`);
      total += count;
    }
  }

  console.log('─'.repeat(70));
  console.log(`  ${'TOTAL'.padEnd(15)} ${total}`);
  console.log('═'.repeat(70));

  // Exit with error if hardcoded values found
  process.exit(total > 0 ? 1 : 0);
}

main();
