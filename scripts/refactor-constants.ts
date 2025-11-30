#!/usr/bin/env npx ts-node
/**
 * Automated Constants Refactoring Script
 *
 * Replaces hardcoded values with constants imports.
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SRC_DIR = path.join(__dirname, '..', 'src');

interface Replacement {
  pattern: RegExp;
  replacement: string;
  importStatement?: string;
}

// Map of file patterns to replacements
const REPLACEMENTS: Record<string, Replacement[]> = {
  // ENV_VAR replacements
  'process.env.LSH_SECRETS_KEY': [
    { pattern: /process\.env\.LSH_SECRETS_KEY/g, replacement: 'process.env[ENV_VARS.LSH_SECRETS_KEY]' }
  ],
  'process.env.LSH_JWT_SECRET': [
    { pattern: /process\.env\.LSH_JWT_SECRET/g, replacement: 'process.env[ENV_VARS.LSH_JWT_SECRET]' }
  ],
  'process.env.SUPABASE_URL': [
    { pattern: /process\.env\.SUPABASE_URL/g, replacement: 'process.env[ENV_VARS.SUPABASE_URL]' }
  ],
  'process.env.SUPABASE_ANON_KEY': [
    { pattern: /process\.env\.SUPABASE_ANON_KEY/g, replacement: 'process.env[ENV_VARS.SUPABASE_ANON_KEY]' }
  ],
  'process.env.DATABASE_URL': [
    { pattern: /process\.env\.DATABASE_URL/g, replacement: 'process.env[ENV_VARS.DATABASE_URL]' }
  ],
  'process.env.HOSTNAME': [
    { pattern: /process\.env\.HOSTNAME/g, replacement: 'process.env[ENV_VARS.HOSTNAME]' }
  ],
  'process.env.NODE_ENV': [
    { pattern: /process\.env\.NODE_ENV/g, replacement: 'process.env[ENV_VARS.NODE_ENV]' }
  ],
  'process.env.HOME': [
    { pattern: /process\.env\.HOME/g, replacement: 'process.env[ENV_VARS.HOME]' }
  ],
  'process.env.USER': [
    { pattern: /process\.env\.USER(?!\w)/g, replacement: 'process.env[ENV_VARS.USER]' }
  ],
  'process.env.LSH_LOG_LEVEL': [
    { pattern: /process\.env\.LSH_LOG_LEVEL/g, replacement: 'process.env[ENV_VARS.LSH_LOG_LEVEL]' }
  ],
  'process.env.NO_COLOR': [
    { pattern: /process\.env\.NO_COLOR/g, replacement: 'process.env[ENV_VARS.NO_COLOR]' }
  ],
  'process.env.LSH_LOG_FORMAT': [
    { pattern: /process\.env\.LSH_LOG_FORMAT/g, replacement: 'process.env[ENV_VARS.LSH_LOG_FORMAT]' }
  ],
  'process.env.LSH_LOCAL_STORAGE_QUIET': [
    { pattern: /process\.env\.LSH_LOCAL_STORAGE_QUIET/g, replacement: 'process.env[ENV_VARS.LSH_LOCAL_STORAGE_QUIET]' }
  ],
  'process.env.DISABLE_IPFS_SYNC': [
    { pattern: /process\.env\.DISABLE_IPFS_SYNC/g, replacement: 'process.env[ENV_VARS.DISABLE_IPFS_SYNC]' }
  ],
  'process.env.LSH_V1_COMPAT': [
    { pattern: /process\.env\.LSH_V1_COMPAT/g, replacement: 'process.env[ENV_VARS.LSH_V1_COMPAT]' }
  ],
  'process.env.LSH_STORACHA_ENABLED': [
    { pattern: /process\.env\.LSH_STORACHA_ENABLED/g, replacement: 'process.env[ENV_VARS.LSH_STORACHA_ENABLED]' }
  ],
  'process.env.LSH_MASTER_KEY': [
    { pattern: /process\.env\.LSH_MASTER_KEY/g, replacement: 'process.env[ENV_VARS.LSH_MASTER_KEY]' }
  ],
  'process.env.STRIPE_': [
    { pattern: /process\.env\.STRIPE_SECRET_KEY/g, replacement: 'process.env[ENV_VARS.STRIPE_SECRET_KEY]' },
    { pattern: /process\.env\.STRIPE_WEBHOOK_SECRET/g, replacement: 'process.env[ENV_VARS.STRIPE_WEBHOOK_SECRET]' },
    { pattern: /process\.env\.STRIPE_PRICE_PRO_MONTHLY/g, replacement: 'process.env[ENV_VARS.STRIPE_PRICE_PRO_MONTHLY]' },
    { pattern: /process\.env\.STRIPE_PRICE_PRO_YEARLY/g, replacement: 'process.env[ENV_VARS.STRIPE_PRICE_PRO_YEARLY]' },
    { pattern: /process\.env\.STRIPE_PRICE_ENTERPRISE_MONTHLY/g, replacement: 'process.env[ENV_VARS.STRIPE_PRICE_ENTERPRISE_MONTHLY]' },
    { pattern: /process\.env\.STRIPE_PRICE_ENTERPRISE_YEARLY/g, replacement: 'process.env[ENV_VARS.STRIPE_PRICE_ENTERPRISE_YEARLY]' },
  ],
  'process.env.RESEND_API_KEY': [
    { pattern: /process\.env\.RESEND_API_KEY/g, replacement: 'process.env[ENV_VARS.RESEND_API_KEY]' }
  ],
  'process.env.EMAIL_FROM': [
    { pattern: /process\.env\.EMAIL_FROM/g, replacement: 'process.env[ENV_VARS.EMAIL_FROM]' }
  ],
  'process.env.BASE_URL': [
    { pattern: /process\.env\.BASE_URL/g, replacement: 'process.env[ENV_VARS.BASE_URL]' }
  ],
  'process.env.APPDATA': [
    { pattern: /process\.env\.APPDATA/g, replacement: 'process.env[ENV_VARS.APPDATA]' }
  ],
  'process.env.LOCALAPPDATA': [
    { pattern: /process\.env\.LOCALAPPDATA/g, replacement: 'process.env[ENV_VARS.LOCALAPPDATA]' }
  ],
  'process.env.COMSPEC': [
    { pattern: /process\.env\.COMSPEC/g, replacement: 'process.env[ENV_VARS.COMSPEC]' }
  ],
  'process.env.SHELL': [
    { pattern: /process\.env\.SHELL(?!\w)/g, replacement: 'process.env[ENV_VARS.SHELL]' }
  ],
  'process.env.VISUAL': [
    { pattern: /process\.env\.VISUAL/g, replacement: 'process.env[ENV_VARS.VISUAL]' }
  ],
  'process.env.EDITOR': [
    { pattern: /process\.env\.EDITOR/g, replacement: 'process.env[ENV_VARS.EDITOR]' }
  ],
  'process.env.USERPROFILE': [
    { pattern: /process\.env\.USERPROFILE/g, replacement: 'process.env[ENV_VARS.USERPROFILE]' }
  ],
};

// Files to skip
const SKIP_FILES = [
  /constants\//,
  /\.test\.ts$/,
  /\.spec\.ts$/,
  /\.d\.ts$/,
  /__tests__/,
];

const IMPORT_STATEMENT = "import { ENV_VARS, DEFAULTS } from '../constants/index.js';";
const IMPORT_STATEMENT_2 = "import { ENV_VARS, DEFAULTS } from '../../constants/index.js';";

function processFile(filePath: string): boolean {
  // Check if should skip
  if (SKIP_FILES.some(p => p.test(filePath))) {
    return false;
  }

  let content = fs.readFileSync(filePath, 'utf-8');
  let modified = false;

  // Check if file needs ENV_VARS import
  let needsEnvVarsImport = false;

  // Apply all replacements
  for (const [_key, replacements] of Object.entries(REPLACEMENTS)) {
    for (const { pattern, replacement } of replacements) {
      if (pattern.test(content)) {
        // Reset regex state
        pattern.lastIndex = 0;
        content = content.replace(pattern, replacement);
        modified = true;
        needsEnvVarsImport = true;
      }
    }
  }

  if (modified) {
    // Check if import already exists
    const hasEnvVarsImport = content.includes('ENV_VARS') &&
                             (content.includes("from '../constants") ||
                              content.includes("from '../../constants") ||
                              content.includes("from './constants"));

    if (needsEnvVarsImport && !hasEnvVarsImport) {
      // Find the right import path based on file depth
      const relativePath = path.relative(SRC_DIR, filePath);
      const depth = relativePath.split(path.sep).length - 1;

      let importPath: string;
      if (depth === 0) {
        importPath = "./constants/index.js";
      } else if (depth === 1) {
        importPath = "../constants/index.js";
      } else {
        importPath = "../../constants/index.js";
      }

      const importStatement = `import { ENV_VARS, DEFAULTS } from '${importPath}';`;

      // Add import after existing imports
      const importInsertPoint = content.lastIndexOf('\nimport ');
      if (importInsertPoint > -1) {
        const endOfImport = content.indexOf('\n', importInsertPoint + 1);
        if (endOfImport > -1) {
          // Find the end of all imports
          let lastImportEnd = endOfImport;
          let searchPos = endOfImport + 1;
          while (true) {
            const nextImport = content.indexOf('\nimport ', searchPos);
            if (nextImport === -1 || nextImport > searchPos + 5) break;
            lastImportEnd = content.indexOf('\n', nextImport + 1);
            searchPos = lastImportEnd + 1;
          }

          content = content.slice(0, lastImportEnd + 1) + importStatement + '\n' + content.slice(lastImportEnd + 1);
        }
      }
    }

    fs.writeFileSync(filePath, content);
    return true;
  }

  return false;
}

function scanDirectory(dir: string): string[] {
  const modifiedFiles: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'constants') {
        continue;
      }
      modifiedFiles.push(...scanDirectory(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.ts')) {
      if (processFile(fullPath)) {
        modifiedFiles.push(path.relative(path.join(__dirname, '..'), fullPath));
      }
    }
  }

  return modifiedFiles;
}

function main(): void {
  console.log('🔄 Refactoring files to use constants...\n');

  const modifiedFiles = scanDirectory(SRC_DIR);

  if (modifiedFiles.length === 0) {
    console.log('✅ No files needed refactoring\n');
  } else {
    console.log(`📝 Modified ${modifiedFiles.length} files:\n`);
    for (const file of modifiedFiles) {
      console.log(`  ✓ ${file}`);
    }
    console.log('\n💡 Run "npm run build" to verify changes compile correctly.\n');
  }
}

main();
