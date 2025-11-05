/**
 * Secrets Management Commands
 * Sync .env files across development environments
 */

import { Command } from 'commander';
import SecretsManager from '../../lib/secrets-manager.js';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

export async function init_secrets(program: Command) {
  // Push secrets to cloud
  program
    .command('push')
    .description('Push local .env to encrypted cloud storage')
    .option('-f, --file <path>', 'Path to .env file', '.env')
    .option('-e, --env <name>', 'Environment name (dev/staging/prod)', 'dev')
    .option('--force', 'Force push even if destructive changes detected')
    .action(async (options) => {
      try {
        const manager = new SecretsManager();
        await manager.push(options.file, options.env, options.force);
      } catch (error) {
        const err = error as Error;
        console.error('❌ Failed to push secrets:', err.message);
        process.exit(1);
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
      try {
        const manager = new SecretsManager();
        await manager.pull(options.file, options.env, options.force);
      } catch (error) {
        const err = error as Error;
        console.error('❌ Failed to pull secrets:', err.message);
        process.exit(1);
      }
    });

  // List current local secrets
  program
    .command('list')
    .alias('ls')
    .description('List secrets in the current local .env file')
    .option('-f, --file <path>', 'Path to .env file', '.env')
    .option('--keys-only', 'Show only keys, not values')
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

        console.log(`\n📋 Secrets in ${options.file}:\n`);
        for (const { key, value } of secrets) {
          if (options.keysOnly) {
            console.log(`  ${key}`);
          } else {
            // Mask the value but show first/last 3 chars if long enough
            let maskedValue = value;
            if (value.length > 8) {
              maskedValue = `${value.substring(0, 3)}${'*'.repeat(value.length - 6)}${value.substring(value.length - 3)}`;
            } else if (value.length > 0) {
              maskedValue = '*'.repeat(value.length);
            }
            console.log(`  ${key}=${maskedValue}`);
          }
        }
        console.log(`\n  Total: ${secrets.length} secrets\n`);
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
          await manager.show(environment);
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
      try {
        const manager = new SecretsManager();

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
        process.exit(1);
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

  // Get a specific secret value
  program
    .command('get [key]')
    .description('Get a specific secret value from .env file, or all secrets with --all')
    .option('-f, --file <path>', 'Path to .env file', '.env')
    .option('--all', 'Get all secrets from the file')
    .option('--export', 'Output in export format for shell evaluation')
    .action(async (key, options) => {
      try {
        const envPath = path.resolve(options.file);

        if (!fs.existsSync(envPath)) {
          console.error(`❌ File not found: ${envPath}`);
          process.exit(1);
        }

        const content = fs.readFileSync(envPath, 'utf8');
        const lines = content.split('\n');

        // Handle --all flag
        if (options.all) {
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

          if (options.export) {
            // Output in export format for shell evaluation
            for (const { key, value } of secrets) {
              // Escape single quotes in value and wrap in single quotes
              const escapedValue = value.replace(/'/g, "'\\''");
              console.log(`export ${key}='${escapedValue}'`);
            }
          } else {
            // Output in KEY=VALUE format
            for (const { key, value } of secrets) {
              console.log(`${key}=${value}`);
            }
          }
          return;
        }

        // Handle single key lookup
        if (!key) {
          console.error('❌ Please provide a key or use --all flag');
          process.exit(1);
        }

        for (const line of lines) {
          if (line.trim().startsWith('#') || !line.trim()) continue;
          const match = line.match(/^([^=]+)=(.*)$/);
          if (match && match[1].trim() === key) {
            let value = match[2].trim();
            // Remove quotes if present
            if ((value.startsWith('"') && value.endsWith('"')) ||
                (value.startsWith("'") && value.endsWith("'"))) {
              value = value.slice(1, -1);
            }
            console.log(value);
            return;
          }
        }

        console.error(`❌ Key '${key}' not found in ${options.file}`);
        process.exit(1);
      } catch (error) {
        const err = error as Error;
        console.error('❌ Failed to get secret:', err.message);
        process.exit(1);
      }
    });

  // Set a specific secret value
  program
    .command('set <key> <value>')
    .description('Set a specific secret value in .env file')
    .option('-f, --file <path>', 'Path to .env file', '.env')
    .action(async (key, value, options) => {
      try {
        const envPath = path.resolve(options.file);

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

            const match = line.match(/^([^=]+)=(.*)$/);
            if (match && match[1].trim() === key) {
              // Quote values with spaces or special characters
              const needsQuotes = /[\s#]/.test(value);
              const quotedValue = needsQuotes ? `"${value}"` : value;
              newLines.push(`${key}=${quotedValue}`);
              found = true;
            } else {
              newLines.push(line);
            }
          }

          content = newLines.join('\n');
        }

        // If key wasn't found, append it
        if (!found) {
          const needsQuotes = /[\s#]/.test(value);
          const quotedValue = needsQuotes ? `"${value}"` : value;
          content = content.trimRight() + `\n${key}=${quotedValue}\n`;
        }

        fs.writeFileSync(envPath, content, 'utf8');
        console.log(`✅ Set ${key} in ${options.file}`);
      } catch (error) {
        const err = error as Error;
        console.error('❌ Failed to set secret:', err.message);
        process.exit(1);
      }
    });

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
