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
  const secretsCmd = program
    .command('secrets')
    .description('Manage environment secrets across machines');

  // Push secrets to cloud
  secretsCmd
    .command('push')
    .description('Push local .env to encrypted cloud storage')
    .option('-f, --file <path>', 'Path to .env file', '.env')
    .option('-e, --env <name>', 'Environment name (dev/staging/prod)', 'dev')
    .action(async (options) => {
      try {
        const manager = new SecretsManager();
        await manager.push(options.file, options.env);
      } catch (error: any) {
        console.error('❌ Failed to push secrets:', error.message);
        process.exit(1);
      }
    });

  // Pull secrets from cloud
  secretsCmd
    .command('pull')
    .description('Pull .env from encrypted cloud storage')
    .option('-f, --file <path>', 'Path to .env file', '.env')
    .option('-e, --env <name>', 'Environment name (dev/staging/prod)', 'dev')
    .option('--force', 'Overwrite without creating backup')
    .action(async (options) => {
      try {
        const manager = new SecretsManager();
        await manager.pull(options.file, options.env, options.force);
      } catch (error: any) {
        console.error('❌ Failed to pull secrets:', error.message);
        process.exit(1);
      }
    });

  // List environments
  secretsCmd
    .command('list [environment]')
    .alias('ls')
    .description('List all stored environments or show secrets for specific environment')
    .option('--all-files', 'List all tracked .env files across environments')
    .action(async (environment, options) => {
      try {
        const manager = new SecretsManager();

        // If --all-files flag is set, list all tracked files
        if (options.allFiles) {
          const files = await manager.listAllFiles();

          if (files.length === 0) {
            console.log('No .env files found. Push your first file with: lsh secrets push --file <filename>');
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
          console.log('No environments found. Push your first .env with: lsh secrets push');
          return;
        }

        console.log('\n📦 Available environments:\n');
        for (const env of envs) {
          console.log(`  • ${env}`);
        }
        console.log();
      } catch (error: any) {
        console.error('❌ Failed to list environments:', error.message);
        process.exit(1);
      }
    });

  // Show secrets (masked)
  secretsCmd
    .command('show')
    .description('Show secrets for an environment (masked)')
    .option('-e, --env <name>', 'Environment name', 'dev')
    .action(async (options) => {
      try {
        const manager = new SecretsManager();
        await manager.show(options.env);
      } catch (error: any) {
        console.error('❌ Failed to show secrets:', error.message);
        process.exit(1);
      }
    });

  // Generate encryption key
  secretsCmd
    .command('key')
    .description('Generate a new encryption key')
    .action(async () => {
      const { randomBytes } = await import('crypto');
      const key = randomBytes(32).toString('hex');
      console.log('\n🔑 New encryption key (add to your .env):\n');
      console.log(`LSH_SECRETS_KEY=${key}\n`);
      console.log('💡 Tip: Share this key securely with your team to sync secrets.');
      console.log('    Never commit it to git!\n');
    });

  // Create .env file
  secretsCmd
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
      } catch (error: any) {
        console.error('❌ Failed to create .env file:', error.message);
        process.exit(1);
      }
    });

  // Sync command - check status and suggest actions
  secretsCmd
    .command('sync')
    .description('Check secrets sync status and show recommended actions')
    .option('-f, --file <path>', 'Path to .env file', '.env')
    .option('-e, --env <name>', 'Environment name', 'dev')
    .action(async (options) => {
      try {
        const manager = new SecretsManager();
        await manager.sync(options.file, options.env);
      } catch (error: any) {
        console.error('❌ Failed to check sync status:', error.message);
        process.exit(1);
      }
    });

  // Status command - get detailed status info
  secretsCmd
    .command('status')
    .description('Get detailed secrets status (JSON output)')
    .option('-f, --file <path>', 'Path to .env file', '.env')
    .option('-e, --env <name>', 'Environment name', 'dev')
    .action(async (options) => {
      try {
        const manager = new SecretsManager();
        const status = await manager.status(options.file, options.env);
        console.log(JSON.stringify(status, null, 2));
      } catch (error: any) {
        console.error('❌ Failed to get status:', error.message);
        process.exit(1);
      }
    });

  // Get a specific secret value
  secretsCmd
    .command('get <key>')
    .description('Get a specific secret value from .env file')
    .option('-f, --file <path>', 'Path to .env file', '.env')
    .action(async (key, options) => {
      try {
        const envPath = path.resolve(options.file);

        if (!fs.existsSync(envPath)) {
          console.error(`❌ File not found: ${envPath}`);
          process.exit(1);
        }

        const content = fs.readFileSync(envPath, 'utf8');
        const lines = content.split('\n');

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
      } catch (error: any) {
        console.error('❌ Failed to get secret:', error.message);
        process.exit(1);
      }
    });

  // Set a specific secret value
  secretsCmd
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
      } catch (error: any) {
        console.error('❌ Failed to set secret:', error.message);
        process.exit(1);
      }
    });

  // Delete .env file with confirmation
  secretsCmd
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
      } catch (error: any) {
        console.error('❌ Failed to delete .env file:', error.message);
        process.exit(1);
      }
    });
}

export default init_secrets;
