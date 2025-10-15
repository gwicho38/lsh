/**
 * Secrets Management Commands
 * Sync .env files across development environments
 */

import { Command } from 'commander';
import SecretsManager from '../../lib/secrets-manager.js';

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
    .action(async (options) => {
      try {
        const manager = new SecretsManager();
        await manager.pull(options.file, options.env);
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
    .action(async (environment) => {
      try {
        const manager = new SecretsManager();

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
}

export default init_secrets;
