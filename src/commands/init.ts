/**
 * LSH Init Command
 * Interactive setup wizard for first-time configuration
 */

import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import ora from 'ora';
import { getPlatformPaths } from '../lib/platform-utils.js';

interface InitConfig {
  storageType: 'supabase' | 'local' | 'postgres';
  supabaseUrl?: string;
  supabaseKey?: string;
  postgresUrl?: string;
  encryptionKey: string;
}

/**
 * Register init commands
 */
export function registerInitCommands(program: Command): void {
  program
    .command('init')
    .description('Interactive setup wizard (first-time configuration)')
    .option('--local', 'Use local-only encryption (no cloud sync)')
    .option('--supabase', 'Use Supabase cloud storage')
    .option('--postgres', 'Use self-hosted PostgreSQL')
    .option('--skip-test', 'Skip connection testing')
    .action(async (options) => {
      try {
        await runSetupWizard(options);
      } catch (error) {
        const err = error as Error;
        console.error(chalk.red('\n❌ Setup failed:'), err.message);
        process.exit(1);
      }
    });
}

/**
 * Run the interactive setup wizard
 */
async function runSetupWizard(options: {
  local?: boolean;
  supabase?: boolean;
  postgres?: boolean;
  skipTest?: boolean;
}): Promise<void> {
  console.log(chalk.bold.cyan('\n🔐 LSH Secrets Manager - Setup Wizard'));
  console.log(chalk.gray('━'.repeat(50)));
  console.log('');

  // Check if already configured
  const existingConfig = await checkExistingConfig();
  if (existingConfig) {
    const { overwrite } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'overwrite',
        message: 'Configuration already exists. Overwrite?',
        default: false,
      },
    ]);

    if (!overwrite) {
      console.log(chalk.yellow('\n⚠️  Setup cancelled. Existing configuration preserved.'));
      console.log(chalk.gray('\nRun'), chalk.cyan('lsh doctor'), chalk.gray('to check your current setup.'));
      return;
    }
  }

  // Determine storage type
  let storageType: 'supabase' | 'local' | 'postgres';

  if (options.local) {
    storageType = 'local';
  } else if (options.postgres) {
    storageType = 'postgres';
  } else if (options.supabase) {
    storageType = 'supabase';
  } else {
    // Ask user
    const { storage } = await inquirer.prompt([
      {
        type: 'list',
        name: 'storage',
        message: 'Choose storage backend:',
        choices: [
          {
            name: 'Supabase (free, cloud-hosted, recommended)',
            value: 'supabase',
          },
          {
            name: 'Local encryption (file-based, no cloud sync)',
            value: 'local',
          },
          {
            name: 'Self-hosted PostgreSQL',
            value: 'postgres',
          },
        ],
        default: 'supabase',
      },
    ]);
    storageType = storage;
  }

  const config: InitConfig = {
    storageType,
    encryptionKey: generateEncryptionKey(),
  };

  // Configure based on storage type
  if (storageType === 'supabase') {
    await configureSupabase(config, options.skipTest);
  } else if (storageType === 'postgres') {
    await configurePostgres(config, options.skipTest);
  } else {
    await configureLocal(config);
  }

  // Save configuration
  await saveConfiguration(config);

  // Show success message
  showSuccessMessage(config);
}

/**
 * Check if LSH is already configured
 */
async function checkExistingConfig(): Promise<boolean> {
  try {
    const envPath = path.join(process.cwd(), '.env');
    await fs.access(envPath);

    const content = await fs.readFile(envPath, 'utf-8');
    return content.includes('LSH_SECRETS_KEY') ||
           content.includes('SUPABASE_URL') ||
           content.includes('DATABASE_URL');
  } catch {
    return false;
  }
}

/**
 * Configure Supabase
 */
async function configureSupabase(config: InitConfig, skipTest?: boolean): Promise<void> {
  console.log(chalk.cyan('\n📦 Supabase Configuration'));
  console.log(chalk.gray('Need credentials? Visit: https://supabase.com/dashboard'));
  console.log('');

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'url',
      message: 'Enter your Supabase URL:',
      validate: (input) => {
        if (!input.trim()) return 'URL is required';
        if (!input.startsWith('https://')) return 'URL must start with https://';
        if (!input.includes('.supabase.co')) return 'Must be a valid Supabase URL';
        return true;
      },
    },
    {
      type: 'password',
      name: 'key',
      message: 'Enter your Supabase anon key:',
      mask: '*',
      validate: (input) => {
        if (!input.trim()) return 'Anon key is required';
        if (input.length < 100) return 'Anon key seems too short';
        return true;
      },
    },
  ]);

  config.supabaseUrl = answers.url.trim();
  config.supabaseKey = answers.key.trim();

  // Test connection
  if (!skipTest && config.supabaseUrl && config.supabaseKey) {
    await testSupabaseConnection(config.supabaseUrl, config.supabaseKey);
  }
}

/**
 * Test Supabase connection
 */
async function testSupabaseConnection(url: string, key: string): Promise<void> {
  const spinner = ora('Testing Supabase connection...').start();

  try {
    const supabase = createClient(url, key);

    // Try to query the database (even if table doesn't exist, connection will work)
    const { error } = await supabase.from('lsh_secrets').select('count').limit(0);

    // Connection successful (404 table not found is fine - means connection works)
    if (!error || error.code === 'PGRST116' || error.message.includes('relation')) {
      spinner.succeed(chalk.green('✅ Connection successful!'));
    } else {
      spinner.fail(chalk.red('❌ Connection failed'));
      throw new Error(`Supabase error: ${error.message}`);
    }
  } catch (error) {
    spinner.fail(chalk.red('❌ Connection failed'));
    const err = error as Error;
    throw new Error(`Could not connect to Supabase: ${err.message}`);
  }
}

/**
 * Configure self-hosted PostgreSQL
 */
async function configurePostgres(config: InitConfig, skipTest?: boolean): Promise<void> {
  console.log(chalk.cyan('\n🐘 PostgreSQL Configuration'));
  console.log('');

  const { url } = await inquirer.prompt([
    {
      type: 'input',
      name: 'url',
      message: 'Enter PostgreSQL connection URL:',
      default: 'postgresql://user:password@localhost:5432/lsh',
      validate: (input) => {
        if (!input.trim()) return 'Connection URL is required';
        if (!input.startsWith('postgres')) return 'Must be a valid PostgreSQL URL';
        return true;
      },
    },
  ]);

  config.postgresUrl = url.trim();

  if (!skipTest) {
    const spinner = ora('Testing PostgreSQL connection...').start();
    // Note: We'll skip actual testing for now as we don't have pg client imported
    spinner.info(chalk.yellow('⚠️  Connection test skipped. Run "lsh doctor" after setup to verify.'));
  }
}

/**
 * Configure local-only mode
 */
async function configureLocal(config: InitConfig): Promise<void> {
  console.log(chalk.cyan('\n💾 Local Encryption Mode'));
  console.log(chalk.gray('Secrets will be encrypted locally. No cloud sync available.'));
  console.log('');

  const paths = getPlatformPaths();
  console.log(chalk.gray('Encrypted secrets will be stored in:'));
  console.log(chalk.cyan(`  ${path.join(paths.dataDir, 'encrypted')}`));
  console.log('');
}

/**
 * Generate a secure encryption key
 */
function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Save configuration to .env file
 */
async function saveConfiguration(config: InitConfig): Promise<void> {
  const spinner = ora('Saving configuration...').start();

  try {
    const envPath = path.join(process.cwd(), '.env');
    let envContent = '';

    // Try to read existing .env
    try {
      envContent = await fs.readFile(envPath, 'utf-8');
    } catch {
      // File doesn't exist, start fresh
    }

    // Update or add configuration
    const updates: Record<string, string> = {
      LSH_SECRETS_KEY: config.encryptionKey,
    };

    if (config.storageType === 'supabase' && config.supabaseUrl && config.supabaseKey) {
      updates.SUPABASE_URL = config.supabaseUrl;
      updates.SUPABASE_ANON_KEY = config.supabaseKey;
    }

    if (config.storageType === 'postgres' && config.postgresUrl) {
      updates.DATABASE_URL = config.postgresUrl;
    }

    if (config.storageType === 'local') {
      updates.LSH_STORAGE_MODE = 'local';
    }

    // Update .env content
    for (const [key, value] of Object.entries(updates)) {
      const regex = new RegExp(`^${key}=.*$`, 'm');
      if (regex.test(envContent)) {
        envContent = envContent.replace(regex, `${key}=${value}`);
      } else {
        if (envContent && !envContent.endsWith('\n')) {
          envContent += '\n';
        }
        envContent += `${key}=${value}\n`;
      }
    }

    // Write .env file
    await fs.writeFile(envPath, envContent, 'utf-8');

    // Update .gitignore
    await updateGitignore();

    spinner.succeed(chalk.green('✅ Configuration saved'));
  } catch (error) {
    spinner.fail(chalk.red('❌ Failed to save configuration'));
    throw error;
  }
}

/**
 * Update .gitignore to include .env
 */
async function updateGitignore(): Promise<void> {
  try {
    const gitignorePath = path.join(process.cwd(), '.gitignore');
    let gitignoreContent = '';

    try {
      gitignoreContent = await fs.readFile(gitignorePath, 'utf-8');
    } catch {
      // File doesn't exist
    }

    if (!gitignoreContent.includes('.env')) {
      if (gitignoreContent && !gitignoreContent.endsWith('\n')) {
        gitignoreContent += '\n';
      }
      gitignoreContent += '\n# LSH secrets\n.env\n';
      await fs.writeFile(gitignorePath, gitignoreContent, 'utf-8');
    }
  } catch {
    // Ignore errors with .gitignore
  }
}

/**
 * Show success message with next steps
 */
function showSuccessMessage(config: InitConfig): void {
  console.log('');
  console.log(chalk.bold.green('✨ Setup complete!'));
  console.log(chalk.gray('━'.repeat(50)));
  console.log('');

  // Show encryption key
  console.log(chalk.yellow('📝 Your encryption key (save this securely):'));
  console.log(chalk.cyan(`   ${config.encryptionKey}`));
  console.log('');
  console.log(chalk.gray('   This key is saved in your .env file.'));
  console.log(chalk.gray('   Share it with your team to sync secrets.'));
  console.log('');

  // Storage info
  if (config.storageType === 'supabase') {
    console.log(chalk.cyan('☁️  Using Supabase cloud storage'));
  } else if (config.storageType === 'postgres') {
    console.log(chalk.cyan('🐘 Using PostgreSQL storage'));
  } else {
    console.log(chalk.cyan('💾 Using local encryption'));
  }
  console.log('');

  // Next steps
  console.log(chalk.bold('🚀 Next steps:'));
  console.log('');
  console.log(chalk.gray('   1. Verify your setup:'));
  console.log(chalk.cyan('      lsh doctor'));
  console.log('');

  if (config.storageType !== 'local') {
    console.log(chalk.gray('   2. Push your secrets:'));
    console.log(chalk.cyan('      lsh push --env dev'));
    console.log('');
    console.log(chalk.gray('   3. On another machine:'));
    console.log(chalk.cyan('      lsh init          ') + chalk.gray('# Use the same credentials'));
    console.log(chalk.cyan('      lsh pull --env dev'));
  } else {
    console.log(chalk.gray('   2. Start managing secrets:'));
    console.log(chalk.cyan('      lsh set API_KEY myvalue'));
    console.log(chalk.cyan('      lsh list'));
  }

  console.log('');
  console.log(chalk.gray('📖 Documentation: https://github.com/gwicho38/lsh'));
  console.log('');
}

export default registerInitCommands;
