/**
 * Secrets Management Commands
 * Sync .env files across development environments
 */

import { Command } from 'commander';
import SecretsManager from '../../lib/secrets-manager.js';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { getGitRepoInfo } from '../../lib/git-utils.js';

export async function init_secrets(program: Command) {
  // Push secrets to cloud
  program
    .command('push')
    .description('Push local .env to encrypted cloud storage')
    .option('-f, --file <path>', 'Path to .env file', '.env')
    .option('-e, --env <name>', 'Environment name (dev/staging/prod)', 'dev')
    .option('--force', 'Force push even if destructive changes detected')
    .action(async (options) => {
      const manager = new SecretsManager();
      try {
        await manager.push(options.file, options.env, options.force);
      } catch (error) {
        const err = error as Error;
        console.error('❌ Failed to push secrets:', err.message);
        await manager.cleanup();
        process.exit(1);
      } finally {
        await manager.cleanup();
      }
    });

  // Pull secrets from cloud
  program
    .command('pull')
    .description('Pull .env from encrypted cloud storage')
    .option('-f, --file <path>', 'Path to .env file', '.env')
    .option('-e, --env <name>', 'Environment name (dev/staging/prod)', 'dev')
    .option('--force', 'Overwrite without creating backup')
    .action(async (options) => {
      const manager = new SecretsManager();
      try {
        await manager.pull(options.file, options.env, options.force);
      } catch (error) {
        const err = error as Error;
        console.error('❌ Failed to pull secrets:', err.message);
        await manager.cleanup();
        process.exit(1);
      } finally {
        await manager.cleanup();
      }
    });

  // List current local secrets
  program
    .command('list')
    .alias('ls')
    .description('List secrets in the current local .env file')
    .option('-f, --file <path>', 'Path to .env file', '.env')
    .option('--keys-only', 'Show only keys, not values')
    .option('--format <type>', 'Output format: env, json, yaml, toml, export', 'env')
    .option('--no-mask', 'Show full values (default: auto based on format)')
    .action(async (options) => {
      try {
        const envPath = path.resolve(options.file);

        if (!fs.existsSync(envPath)) {
          console.error(`❌ File not found: ${envPath}`);
          console.log('💡 Tip: Pull from cloud with: lsh pull --env <environment>');
          process.exit(1);
        }

        const content = fs.readFileSync(envPath, 'utf8');
        const lines = content.split('\n');
        const secrets: Array<{ key: string; value: string }> = [];

        for (const line of lines) {
          if (line.trim().startsWith('#') || !line.trim()) continue;
          const match = line.match(/^([^=]+)=(.*)$/);
          if (match) {
            const key = match[1].trim();
            let value = match[2].trim();
            // Remove quotes if present
            if ((value.startsWith('"') && value.endsWith('"')) ||
                (value.startsWith("'") && value.endsWith("'"))) {
              value = value.slice(1, -1);
            }
            secrets.push({ key, value });
          }
        }

        if (secrets.length === 0) {
          console.log('No secrets found in .env file');
          return;
        }

        // Handle keys-only mode
        if (options.keysOnly) {
          console.log(`\n📋 Keys in ${options.file}:\n`);
          for (const { key } of secrets) {
            console.log(`  ${key}`);
          }
          console.log(`\n  Total: ${secrets.length} keys\n`);
          return;
        }

        // Handle format output
        const format = options.format.toLowerCase();
        const validFormats = ['env', 'json', 'yaml', 'toml', 'export'];

        if (!validFormats.includes(format)) {
          console.error(`❌ Invalid format: ${format}`);
          console.log(`Valid formats: ${validFormats.join(', ')}`);
          process.exit(1);
        }

        // Import format utilities dynamically
        const { formatSecrets } = await import('../../lib/format-utils.js');

        // Determine masking behavior
        const shouldMask = options.mask !== false ? undefined : false;

        const output = formatSecrets(secrets, format as any, shouldMask);

        // Only show header for default env format
        if (format === 'env') {
          console.log(`\n📋 Secrets in ${options.file}:\n`);
          console.log(output);
          console.log(`\n  Total: ${secrets.length} secrets\n`);
        } else {
          // For structured formats, output directly (no decoration)
          console.log(output);
        }
      } catch (error) {
        const err = error as Error;
        console.error('❌ Failed to list secrets:', err.message);
        process.exit(1);
      }
    });

  // Manage environments (old 'list' functionality)
  program
    .command('env [environment]')
    .description('List all stored environments or show secrets for specific environment')
    .option('--all-files', 'List all tracked .env files across environments')
    .option('--format <type>', 'Output format: env, json, yaml, toml, export', 'env')
    .action(async (environment, options) => {
      try {
        const manager = new SecretsManager();

        // If --all-files flag is set, list all tracked files
        if (options.allFiles) {
          const files = await manager.listAllFiles();

          if (files.length === 0) {
            console.log('No .env files found. Push your first file with: lsh push --file <filename>');
            return;
          }

          console.log('\n📦 Tracked .env files:\n');
          for (const file of files) {
            console.log(`  • ${file.filename} (${file.environment}) - Last updated: ${file.updated}`);
          }
          console.log();
          return;
        }

        // If environment specified, show secrets for that environment
        if (environment) {
          const format = options.format.toLowerCase();
          const validFormats = ['env', 'json', 'yaml', 'toml', 'export'];

          if (!validFormats.includes(format)) {
            console.error(`❌ Invalid format: ${format}`);
            console.log(`Valid formats: ${validFormats.join(', ')}`);
            process.exit(1);
          }

          await manager.show(environment, format as any);
          return;
        }

        // Otherwise, list all environments
        const envs = await manager.listEnvironments();

        if (envs.length === 0) {
          console.log('No environments found. Push your first .env with: lsh push');
          return;
        }

        console.log('\n📦 Available environments:\n');
        for (const env of envs) {
          console.log(`  • ${env}`);
        }
        console.log();
      } catch (error) {
        const err = error as Error;
        console.error('❌ Failed to list environments:', err.message);
        process.exit(1);
      }
    });

  // Generate encryption key
  program
    .command('key')
    .description('Generate a new encryption key')
    .option('--export', 'Output in export format for shell evaluation')
    .action(async (options) => {
      const { randomBytes } = await import('crypto');
      const key = randomBytes(32).toString('hex');

      if (options.export) {
        // Just output the export statement for eval
        console.log(`export LSH_SECRETS_KEY='${key}'`);
      } else {
        // Interactive output with tips
        console.log('\n🔑 New encryption key (add to your .env):\n');
        console.log(`export LSH_SECRETS_KEY='${key}'\n`);
        console.log('💡 Tip: Share this key securely with your team to sync secrets.');
        console.log('    Never commit it to git!\n');
        console.log('💡 To load immediately: eval "$(lsh key --export)"\n');
      }
    });

  // Create .env file
  program
    .command('create')
    .description('Create a new .env file')
    .option('-f, --file <path>', 'Path to .env file', '.env')
    .option('-t, --template', 'Create with common template variables')
    .action(async (options) => {
      try {
        const envPath = path.resolve(options.file);

        // Check if file already exists
        if (fs.existsSync(envPath)) {
          console.log(`❌ File already exists: ${envPath}`);
          console.log('💡 Use a different path or delete the existing file first.');
          process.exit(1);
        }

        // Create template content if requested
        let content = '';
        if (options.template) {
          content = `# Environment Configuration
# Generated by LSH Secrets Manager

# Application
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL=

# API Keys
API_KEY=

# LSH Secrets (for cross-machine sync)
# LSH_SECRETS_KEY=

# Add your environment variables below
`;
        }

        // Create the file
        fs.writeFileSync(envPath, content, 'utf8');

        console.log(`✅ Created .env file: ${envPath}`);
        if (options.template) {
          console.log('📝 Template variables added - update with your values');
        }
        console.log('');
        console.log('Next steps:');
        console.log(`  1. Edit the file: ${options.file}`);
        console.log(`  2. Push to cloud: lsh lib secrets push -f ${options.file}`);
        console.log('');
      } catch (error) {
        const err = error as Error;
        console.error('❌ Failed to create .env file:', err.message);
        process.exit(1);
      }
    });

  // Sync command - automatically set up and synchronize secrets
  program
    .command('sync')
    .description('Automatically set up and synchronize secrets (smart mode)')
    .option('-f, --file <path>', 'Path to .env file', '.env')
    .option('-e, --env <name>', 'Environment name', 'dev')
    .option('--dry-run', 'Show what would be done without executing')
    .option('--legacy', 'Use legacy sync mode (suggestions only)')
    .option('--load', 'Output eval-able export commands for loading secrets')
    .option('--force', 'Force sync even if destructive changes detected')
    .action(async (options) => {
      const manager = new SecretsManager();
      try {
        if (options.legacy) {
          // Use legacy sync (suggestions only)
          await manager.sync(options.file, options.env);
        } else {
          // Use new smart sync (auto-execute)
          await manager.smartSync(options.file, options.env, !options.dryRun, options.load, options.force);
        }
      } catch (error) {
        const err = error as Error;
        console.error('❌ Failed to sync:', err.message);
        await manager.cleanup();
        process.exit(1);
      } finally {
        await manager.cleanup();
      }
    });

  // Status command - get detailed status info
  program
    .command('status')
    .description('Get detailed secrets status (JSON output)')
    .option('-f, --file <path>', 'Path to .env file', '.env')
    .option('-e, --env <name>', 'Environment name', 'dev')
    .action(async (options) => {
      try {
        const manager = new SecretsManager();
        const status = await manager.status(options.file, options.env);
        console.log(JSON.stringify(status, null, 2));
      } catch (error) {
        const err = error as Error;
        console.error('❌ Failed to get status:', err.message);
        process.exit(1);
      }
    });

  // Info command - show relevant context information
  program
    .command('info')
    .description('Show current directory context and tracked environment')
    .option('-f, --file <path>', 'Path to .env file', '.env')
    .option('-e, --env <name>', 'Environment name', 'dev')
    .action(async (options) => {
      try {
        const gitInfo = getGitRepoInfo();
        const manager = new SecretsManager();
        const envPath = path.resolve(options.file);

        console.log('\n📍 Current Directory Context\n');

        // Git Repository Info
        if (gitInfo.isGitRepo) {
          console.log('📁 Git Repository:');
          console.log(`   Root: ${gitInfo.rootPath || 'unknown'}`);
          console.log(`   Name: ${gitInfo.repoName || 'unknown'}`);
          if (gitInfo.currentBranch) {
            console.log(`   Branch: ${gitInfo.currentBranch}`);
          }
          if (gitInfo.remoteUrl) {
            console.log(`   Remote: ${gitInfo.remoteUrl}`);
          }
        } else {
          console.log('📁 Not in a git repository');
        }

        console.log('');

        // Environment Tracking
        console.log('🔐 Environment Tracking:');

        // Show the effective environment name used for cloud storage
        const effectiveEnv = gitInfo.repoName
          ? `${gitInfo.repoName}_${options.env}`
          : options.env;

        console.log(`   Base environment: ${options.env}`);
        console.log(`   Cloud storage name: ${effectiveEnv}`);

        if (gitInfo.repoName) {
          console.log(`   Namespace: ${gitInfo.repoName}`);
          console.log('   ℹ️  Repo-based isolation enabled');
        } else {
          console.log('   Namespace: (none - not in git repo)');
          console.log('   ⚠️  No isolation - shared environment name');
        }

        console.log('');

        // Local File Status
        console.log('📄 Local .env File:');
        if (fs.existsSync(envPath)) {
          const content = fs.readFileSync(envPath, 'utf8');
          const lines = content.split('\n').filter(line => {
            const trimmed = line.trim();
            return trimmed && !trimmed.startsWith('#') && trimmed.includes('=');
          });

          console.log(`   Path: ${envPath}`);
          console.log(`   Keys: ${lines.length}`);
          console.log(`   Size: ${Math.round(content.length / 1024 * 10) / 10} KB`);

          // Check for encryption key
          const hasKey = content.includes('LSH_SECRETS_KEY=');
          console.log(`   Has encryption key: ${hasKey ? '✅' : '❌'}`);
        } else {
          console.log(`   Path: ${envPath}`);
          console.log('   Status: ❌ Not found');
        }

        console.log('');

        // Cloud Status
        console.log('☁️  Cloud Storage:');
        try {
          const status = await manager.status(options.file, options.env);

          if (status.cloudExists) {
            console.log(`   Environment: ${effectiveEnv}`);
            console.log(`   Keys stored: ${status.cloudKeys}`);
            console.log(`   Last updated: ${status.cloudModified ? new Date(status.cloudModified).toLocaleString() : 'unknown'}`);

            if (status.keyMatches !== undefined) {
              console.log(`   Key matches: ${status.keyMatches ? '✅' : '❌ MISMATCH'}`);
            }
          } else {
            console.log(`   Environment: ${effectiveEnv}`);
            console.log('   Status: ❌ Not synced yet');
          }
        } catch (_error) {
          console.log('   Status: ⚠️  Unable to check (Supabase not configured)');
        }

        console.log('');

        // Quick Actions
        console.log('💡 Quick Actions:');
        console.log(`   Push:  lsh push --env ${options.env}`);
        console.log(`   Pull:  lsh pull --env ${options.env}`);
        console.log(`   Sync:  lsh sync --env ${options.env}`);

        console.log('');
      } catch (error) {
        const err = error as Error;
        console.error('❌ Failed to get info:', err.message);
        process.exit(1);
      }
    });

  // Get a specific secret value
  program
    .command('get [key]')
    .description('Get a specific secret value from .env file, or all secrets with --all')
    .option('-f, --file <path>', 'Path to .env file', '.env')
    .option('--all', 'Get all secrets from the file')
    .option('--export', 'Output in export format for shell evaluation (alias for --format export)')
    .option('--format <type>', 'Output format: env, json, yaml, toml, export', 'env')
    .option('--exact', 'Require exact key match (disable fuzzy matching)')
    .action(async (key, options) => {
      try {
        const envPath = path.resolve(options.file);

        if (!fs.existsSync(envPath)) {
          console.error(`❌ File not found: ${envPath}`);
          process.exit(1);
        }

        const content = fs.readFileSync(envPath, 'utf8');
        const lines = content.split('\n');

        // Parse all secrets from file
        const secrets: Array<{ key: string; value: string }> = [];
        for (const line of lines) {
          if (line.trim().startsWith('#') || !line.trim()) continue;
          const match = line.match(/^([^=]+)=(.*)$/);
          if (match) {
            const key = match[1].trim();
            let value = match[2].trim();
            // Remove quotes if present
            if ((value.startsWith('"') && value.endsWith('"')) ||
                (value.startsWith("'") && value.endsWith("'"))) {
              value = value.slice(1, -1);
            }
            secrets.push({ key, value });
          }
        }

        // Handle --all flag
        if (options.all) {
          // Handle format output
          const format = options.export ? 'export' : options.format.toLowerCase();
          const validFormats = ['env', 'json', 'yaml', 'toml', 'export'];

          if (!validFormats.includes(format)) {
            console.error(`❌ Invalid format: ${format}`);
            console.log(`Valid formats: ${validFormats.join(', ')}`);
            process.exit(1);
          }

          // Import format utilities dynamically
          const { formatSecrets } = await import('../../lib/format-utils.js');

          // For get --all, always show full values (no masking)
          const output = formatSecrets(secrets, format as any, false);
          console.log(output);
          return;
        }

        // Handle single key lookup
        if (!key) {
          console.error('❌ Please provide a key or use --all flag');
          process.exit(1);
        }

        // Try exact match first
        const exactMatch = secrets.find(s => s.key === key);
        if (exactMatch) {
          console.log(exactMatch.value);
          return;
        }

        // If exact match enabled, don't do fuzzy matching
        if (options.exact) {
          console.error(`❌ Key '${key}' not found in ${options.file}`);
          process.exit(1);
        }

        // Use fuzzy matching
        const { findFuzzyMatches } = await import('../../lib/fuzzy-match.js');
        const matches = findFuzzyMatches(key, secrets);

        if (matches.length === 0) {
          console.error(`❌ No matches found for '${key}' in ${options.file}`);
          console.error('💡 Tip: Use --exact flag for exact matching only');
          process.exit(1);
        }

        // If single match, return it
        if (matches.length === 1) {
          console.log(matches[0].value);
          return;
        }

        // If best match score is significantly higher than second best (clear winner)
        // then auto-select it
        if (matches.length > 1) {
          const bestScore = matches[0].score;
          const secondBestScore = matches[1].score;

          // If best match scores 700+ and is at least 2x better than second best,
          // consider it a clear match
          if (bestScore >= 700 && bestScore >= secondBestScore * 2) {
            console.log(matches[0].value);
            return;
          }
        }

        // Multiple matches - show all matches for user to choose
        console.error(`🔍 Found ${matches.length} matches for '${key}':\n`);
        for (const match of matches) {
          // Mask value for display
          const maskedValue = match.value.length > 4
            ? match.value.substring(0, 4) + '*'.repeat(Math.min(match.value.length - 4, 10))
            : '****';
          console.error(`  ${match.key}=${maskedValue}`);
        }
        console.error('');
        console.error('💡 Please specify the exact key name or use one of:');
        for (const match of matches) {
          console.error(`   lsh get ${match.key}`);
        }
        process.exit(1);
      } catch (error) {
        const err = error as Error;
        console.error('❌ Failed to get secret:', err.message);
        process.exit(1);
      }
    });

  // Set a specific secret value or batch upsert from stdin
  program
    .command('set [key] [value]')
    .description('Set a specific secret value in .env file, or batch upsert from stdin (KEY=VALUE format)')
    .option('-f, --file <path>', 'Path to .env file', '.env')
    .option('--stdin', 'Read KEY=VALUE pairs from stdin (one per line)')
    .action(async (key, value, options) => {
      try {
        const envPath = path.resolve(options.file);

        // Check if we should read from stdin
        const isStdin = options.stdin || (!key && !value);

        if (isStdin) {
          // Batch mode: read from stdin
          await batchSetSecrets(envPath);
        } else {
          // Single mode: set one key-value pair
          if (!key || value === undefined) {
            console.error('❌ Usage: lsh set <key> <value>');
            console.error('   Or pipe input: printenv | lsh set');
            console.error('   Or use stdin: lsh set --stdin < file.env');
            process.exit(1);
          }

          await setSingleSecret(envPath, key, value);
        }
      } catch (error) {
        const err = error as Error;
        console.error('❌ Failed to set secret:', err.message);
        process.exit(1);
      }
    });

  /**
   * Detect if file should use 'export' prefix based on file type
   */
  function shouldUseExport(filePath: string): boolean {
    const filename = path.basename(filePath);
    const ext = path.extname(filePath);

    // Shell script files - use export
    if (['.sh', '.bash', '.zsh'].includes(ext)) {
      return true;
    }

    // Shell profile/rc files - use export
    if (['.bashrc', '.zshrc', '.profile', '.bash_profile', '.zprofile'].includes(filename)) {
      return true;
    }

    // .envrc files (direnv) - use export
    if (filename === '.envrc' || filename.endsWith('.envrc')) {
      return true;
    }

    // .env files - do NOT use export
    if (filename === '.env' || filename.startsWith('.env.')) {
      return false;
    }

    // Default: no export (safest for most env files)
    return false;
  }

  /**
   * Format a line based on file type
   */
  function formatEnvLine(key: string, value: string, filePath: string): string {
    const needsQuotes = /[\s#]/.test(value);
    const quotedValue = needsQuotes ? `"${value}"` : value;
    const useExport = shouldUseExport(filePath);

    return useExport
      ? `export ${key}=${quotedValue}`
      : `${key}=${quotedValue}`;
  }

  /**
   * Set a single secret value
   */
  async function setSingleSecret(envPath: string, key: string, value: string): Promise<void> {
    // Validate key format
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
      console.error(`❌ Invalid key format: ${key}. Must be a valid environment variable name.`);
      process.exit(1);
    }

    let content = '';
    let found = false;

    if (fs.existsSync(envPath)) {
      content = fs.readFileSync(envPath, 'utf8');
      const lines = content.split('\n');
      const newLines: string[] = [];

      for (const line of lines) {
        if (line.trim().startsWith('#') || !line.trim()) {
          newLines.push(line);
          continue;
        }

        // Match both with and without export
        const match = line.match(/^(?:export\s+)?([^=]+)=(.*)$/);
        if (match && match[1].trim() === key) {
          // Use appropriate format for this file type
          newLines.push(formatEnvLine(key, value, envPath));
          found = true;
        } else {
          newLines.push(line);
        }
      }

      content = newLines.join('\n');
    }

    // If key wasn't found, append it
    if (!found) {
      const formattedLine = formatEnvLine(key, value, envPath);
      content = content.trimRight() + `\n${formattedLine}\n`;
    }

    fs.writeFileSync(envPath, content, 'utf8');
    console.log(`✅ Set ${key}`);
  }

  /**
   * Batch upsert secrets from stdin
   */
  async function batchSetSecrets(envPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      let inputData = '';
      const stdin = process.stdin;

      // Check if stdin is a TTY (interactive terminal)
      if (stdin.isTTY) {
        console.error('❌ No input provided. Please pipe data or use --stdin flag.');
        console.error('');
        console.error('Examples:');
        console.error('  printenv | lsh set');
        console.error('  lsh set --stdin < .env.backup');
        console.error('  echo "API_KEY=secret123" | lsh set');
        process.exit(1);
      }

      stdin.setEncoding('utf8');

      stdin.on('data', (chunk) => {
        inputData += chunk;
      });

      stdin.on('end', () => {
        try {
          const lines = inputData.split('\n').filter(line => line.trim());

          if (lines.length === 0) {
            console.error('❌ No valid KEY=VALUE pairs found in input');
            process.exit(1);
          }

          // Read existing .env file
          let content = '';
          const existingKeys = new Map<string, string>();

          if (fs.existsSync(envPath)) {
            content = fs.readFileSync(envPath, 'utf8');
            const existingLines = content.split('\n');

            for (const line of existingLines) {
              if (line.trim().startsWith('#') || !line.trim()) continue;
              const match = line.match(/^([^=]+)=(.*)$/);
              if (match) {
                existingKeys.set(match[1].trim(), line);
              }
            }
          }

          const updates: Array<{ key: string; value: string; action: 'updated' | 'added' }> = [];
          const errors: string[] = [];
          const newKeys = new Map<string, string>();

          // Parse input lines
          for (const line of lines) {
            const trimmed = line.trim();

            // Skip comments and empty lines
            if (trimmed.startsWith('#') || !trimmed) continue;

            // Parse KEY=VALUE format (with or without export)
            const match = trimmed.match(/^(?:export\s+)?([^=]+)=(.*)$/);
            if (!match) {
              errors.push(`Invalid format: ${trimmed}`);
              continue;
            }

            const key = match[1].trim();
            let value = match[2].trim();

            // Validate key format
            if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
              errors.push(`Invalid key format: ${key}`);
              continue;
            }

            // Remove surrounding quotes if present
            if ((value.startsWith('"') && value.endsWith('"')) ||
                (value.startsWith("'") && value.endsWith("'"))) {
              value = value.slice(1, -1);
            }

            // Track if this is an update or addition
            const action = existingKeys.has(key) ? 'updated' : 'added';
            updates.push({ key, value, action });
            newKeys.set(key, value);
          }

          // Build new content
          const newLines: string[] = [];
          let hasContent = false;

          if (fs.existsSync(envPath)) {
            const existingLines = content.split('\n');

            for (const line of existingLines) {
              if (line.trim().startsWith('#') || !line.trim()) {
                newLines.push(line);
                continue;
              }

              // Match both with and without export
              const match = line.match(/^(?:export\s+)?([^=]+)=(.*)$/);
              if (match) {
                const key = match[1].trim();
                if (newKeys.has(key)) {
                  // Update existing key with appropriate format
                  const value = newKeys.get(key)!;
                  newLines.push(formatEnvLine(key, value, envPath));
                  newKeys.delete(key); // Mark as processed
                  hasContent = true;
                } else {
                  // Keep existing line
                  newLines.push(line);
                  hasContent = true;
                }
              } else {
                newLines.push(line);
              }
            }
          }

          // Add new keys that weren't in the existing file
          for (const [key, value] of newKeys.entries()) {
            const formattedLine = formatEnvLine(key, value, envPath);
            if (hasContent) {
              newLines.push(formattedLine);
            } else {
              newLines.push(formattedLine);
              hasContent = true;
            }
          }

          // Write updated content
          let finalContent = newLines.join('\n');
          if (hasContent && !finalContent.endsWith('\n')) {
            finalContent += '\n';
          }

          fs.writeFileSync(envPath, finalContent, 'utf8');

          // Report results
          const added = updates.filter(u => u.action === 'added').length;
          const updated = updates.filter(u => u.action === 'updated').length;

          console.log(`✅ Batch upsert complete:`);
          if (added > 0) console.log(`   Added: ${added} key(s)`);
          if (updated > 0) console.log(`   Updated: ${updated} key(s)`);

          if (errors.length > 0) {
            console.log('');
            console.log('⚠️  Skipped invalid entries:');
            errors.forEach(err => console.log(`   ${err}`));
          }

          resolve();
        } catch (error) {
          reject(error);
        }
      });

      stdin.on('error', (error) => {
        reject(error);
      });
    });
  }

  // Delete .env file with confirmation
  program
    .command('delete')
    .description('Delete .env file (requires confirmation)')
    .option('-f, --file <path>', 'Path to .env file', '.env')
    .option('-y, --yes', 'Skip confirmation prompt')
    .action(async (options) => {
      try {
        const envPath = path.resolve(options.file);

        // Check if file exists
        if (!fs.existsSync(envPath)) {
          console.log(`❌ File not found: ${envPath}`);
          process.exit(1);
        }

        console.log('⚠️  WARNING: You are about to delete a .env file!');
        console.log('');
        console.log(`File: ${envPath}`);
        console.log('');

        // Skip confirmation if --yes flag is provided
        if (!options.yes) {
          console.log('To confirm deletion, please type the full path of the file:');
          console.log(`Expected: ${envPath}`);
          console.log('');

          const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
          });

          const answer = await new Promise<string>((resolve) => {
            rl.question('Enter path to confirm: ', (ans) => {
              rl.close();
              resolve(ans.trim());
            });
          });

          if (answer !== envPath) {
            console.log('');
            console.log('❌ Confirmation failed - path does not match');
            console.log('Deletion cancelled');
            process.exit(1);
          }
        }

        // Delete the file
        fs.unlinkSync(envPath);

        console.log('');
        console.log(`✅ Deleted: ${envPath}`);
        console.log('');
        console.log('💡 Tip: You can still pull from cloud if you pushed previously:');
        console.log(`   lsh lib secrets pull -f ${options.file}`);
        console.log('');
      } catch (error) {
        const err = error as Error;
        console.error('❌ Failed to delete .env file:', err.message);
        process.exit(1);
      }
    });
}

export default init_secrets;
