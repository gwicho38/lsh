/**
 * Configuration Management Commands
 * Provides commands to manage LSH configuration
 */

import { Command } from 'commander';
import { spawn } from 'child_process';
import {
  getConfigManager,
  loadGlobalConfig
} from '../lib/config-manager.js';
import * as fs from 'fs/promises';
import { ENV_VARS } from '../constants/index.js';

/**
 * Get user's preferred editor
 */
function getEditor(): string {
  return process.env[ENV_VARS.VISUAL] || process.env[ENV_VARS.EDITOR] || 'vi';
}

/**
 * Open config file in user's editor
 */
async function openInEditor(filePath: string): Promise<void> {
  const editor = getEditor();

  return new Promise((resolve, reject) => {
    const child = spawn(editor, [filePath], {
      stdio: 'inherit',
      shell: true
    });

    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Editor exited with code ${code}`));
      }
    });

    child.on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * Register config commands
 */
export function registerConfigCommands(program: Command): void {
  const config = program
    .command('config')
    .description('Manage LSH configuration');

  // lsh config (open in editor)
  config
    .action(async () => {
      try {
        const manager = getConfigManager();

        // Initialize if doesn't exist
        if (!(await manager.exists())) {
          await manager.initialize();
        }

        const configPath = manager.getConfigPath();
        console.log(`Opening ${configPath} in ${getEditor()}...`);

        await openInEditor(configPath);

        console.log('\n✓ Config file saved');
        console.log('  Restart LSH or run a command to apply changes');
      } catch (error) {
        console.error('Failed to open config file:', error);
        process.exit(1);
      }
    });

  // lsh config init
  config
    .command('init')
    .description('Initialize config file with default template')
    .option('-f, --force', 'Overwrite existing config file')
    .action(async (options) => {
      try {
        const manager = getConfigManager();
        const configPath = manager.getConfigPath();

        // Check if exists
        const exists = await manager.exists();
        if (exists && !options.force) {
          console.error(`Config file already exists at ${configPath}`);
          console.error('Use --force to overwrite');
          process.exit(1);
        }

        await manager.initialize();
      } catch (error) {
        console.error('Failed to initialize config:', error);
        process.exit(1);
      }
    });

  // lsh config path
  config
    .command('path')
    .description('Show config file path')
    .action(() => {
      const manager = getConfigManager();
      console.log(manager.getConfigPath());
    });

  // lsh config get <key>
  config
    .command('get <key>')
    .description('Get a config value')
    .action(async (key: string) => {
      try {
        const manager = getConfigManager();
        await manager.load();

        const value = manager.get(key);
        if (value !== undefined) {
          console.log(value);
        } else {
          console.error(`Key "${key}" not found in config`);
          process.exit(1);
        }
      } catch (error) {
        console.error('Failed to get config value:', error);
        process.exit(1);
      }
    });

  // lsh config set <key> <value>
  config
    .command('set <key> <value>')
    .description('Set a config value')
    .action(async (key: string, value: string) => {
      try {
        const manager = getConfigManager();
        await manager.load();
        await manager.set(key, value);
        console.log(`✓ Set ${key}=${value}`);
      } catch (error) {
        console.error('Failed to set config value:', error);
        process.exit(1);
      }
    });

  // lsh config delete <key>
  config
    .command('delete <key>')
    .alias('rm')
    .description('Delete a config value')
    .action(async (key: string) => {
      try {
        const manager = getConfigManager();
        await manager.load();
        await manager.delete(key);
        console.log(`✓ Deleted ${key}`);
      } catch (error) {
        console.error('Failed to delete config value:', error);
        process.exit(1);
      }
    });

  // lsh config list
  config
    .command('list')
    .alias('ls')
    .description('List all config values')
    .option('--show-secrets', 'Show secret values (default: masked)')
    .action(async (options) => {
      try {
        const manager = getConfigManager();
        await manager.load();

        const allConfig = manager.getAll();
        const keys = Object.keys(allConfig).sort();

        if (keys.length === 0) {
          console.log('No configuration found');
          return;
        }

        console.log('\nCurrent Configuration:\n');

        const secretKeys = [
          'LSH_SECRETS_KEY',
          'LSH_MASTER_KEY',
          'LSH_API_KEY',
          'LSH_JWT_SECRET',
          'SUPABASE_ANON_KEY',
          'GITHUB_WEBHOOK_SECRET',
          'GITLAB_WEBHOOK_SECRET',
          'JENKINS_WEBHOOK_SECRET',
          'RESEND_API_KEY',
          'STRIPE_SECRET_KEY',
          'STRIPE_WEBHOOK_SECRET',
          'DATABASE_URL'
        ];

        for (const key of keys) {
          const value = allConfig[key];
          if (value === undefined || value === '') {
            continue;
          }

          // Mask secret values unless --show-secrets is passed
          const isSecret = secretKeys.some(sk => key.includes(sk));
          const displayValue = (isSecret && !options.showSecrets)
            ? '***' + value.slice(-4)
            : value;

          console.log(`  ${key}=${displayValue}`);
        }

        console.log();
      } catch (error) {
        console.error('Failed to list config:', error);
        process.exit(1);
      }
    });

  // lsh config show
  config
    .command('show')
    .description('Show config file contents')
    .action(async () => {
      try {
        const manager = getConfigManager();
        const configPath = manager.getConfigPath();

        const exists = await manager.exists();
        if (!exists) {
          console.error(`Config file not found at ${configPath}`);
          console.error('Run: lsh config init');
          process.exit(1);
        }

        const content = await fs.readFile(configPath, 'utf-8');
        console.log(content);
      } catch (error) {
        console.error('Failed to show config:', error);
        process.exit(1);
      }
    });

  // lsh config reload
  config
    .command('reload')
    .description('Reload config into current environment')
    .action(async () => {
      try {
        const config = await loadGlobalConfig();
        const keys = Object.keys(config).filter(k => config[k] !== undefined && config[k] !== '');

        console.log(`✓ Reloaded ${keys.length} config values into environment`);
        console.log('\nNote: This only affects the current LSH process.');
        console.log('Restart daemons or shells to apply changes globally.');
      } catch (error) {
        console.error('Failed to reload config:', error);
        process.exit(1);
      }
    });
}

export default registerConfigCommands;
