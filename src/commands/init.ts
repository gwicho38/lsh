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
import { getGitRepoInfo } from '../lib/git-utils.js';

interface InitConfig {
  storageType: 'supabase' | 'local' | 'postgres' | 'storacha';
  supabaseUrl?: string;
  supabaseKey?: string;
  postgresUrl?: string;
  storachaEmail?: string;
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
    .option('--storacha', 'Use Storacha IPFS network sync (recommended)')
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
  storacha?: boolean;
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
  let storageType: 'supabase' | 'local' | 'postgres' | 'storacha';

  if (options.storacha) {
    storageType = 'storacha';
  } else if (options.local) {
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
            name: '🌐 Storacha (IPFS network, zero-config, recommended)',
            value: 'storacha',
          },
          {
            name: '☁️  Supabase (cloud-hosted, team collaboration)',
            value: 'supabase',
          },
          {
            name: '💾 Local encryption (file-based, no cloud sync)',
            value: 'local',
          },
          {
            name: '🐘 Self-hosted PostgreSQL',
            value: 'postgres',
          },
        ],
        default: 'storacha',
      },
    ]);
    storageType = storage;
  }

  // Check if secrets already exist for this repo in the cloud
  const cloudCheck = await checkCloudSecretsExist();
  let encryptionKey: string;

  if (cloudCheck.exists && cloudCheck.repoName) {
    // Secrets found! This is an existing project
    console.log(chalk.cyan(`\n✨ Found existing secrets for "${cloudCheck.repoName}" in cloud!`));
    console.log(chalk.gray('This appears to be an existing project.'));
    console.log('');

    const { useExisting } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'useExisting',
        message: 'Pull existing secrets from another machine?',
        default: true,
      },
    ]);

    if (useExisting) {
      // Prompt for existing encryption key
      const { existingKey } = await inquirer.prompt([
        {
          type: 'password',
          name: 'existingKey',
          message: 'Enter the encryption key from your other machine:',
          mask: '*',
          validate: (input) => {
            if (!input.trim()) return 'Encryption key is required';
            if (input.length !== 64) return 'Key should be 64 characters (32 bytes hex)';
            if (!/^[0-9a-f]+$/i.test(input)) return 'Key should be hexadecimal';
            return true;
          },
        },
      ]);
      encryptionKey = existingKey.trim();
    } else {
      // Generate new key (will overwrite existing)
      console.log(chalk.yellow('\n⚠️  Generating new key will overwrite existing secrets!'));
      encryptionKey = generateEncryptionKey();
    }
  } else {
    // No existing secrets - generate new key
    encryptionKey = generateEncryptionKey();
  }

  const config: InitConfig = {
    storageType,
    encryptionKey,
  };

  // Configure based on storage type
  if (storageType === 'storacha') {
    await configureStoracha(config);
  } else if (storageType === 'supabase') {
    await configureSupabase(config, options.skipTest);
  } else if (storageType === 'postgres') {
    await configurePostgres(config, options.skipTest);
  } else {
    await configureLocal(config);
  }

  // If using existing key and secrets exist, offer to pull them now
  if (cloudCheck.exists && config.encryptionKey && cloudCheck.repoName) {
    const { pullNow } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'pullNow',
        message: 'Pull secrets now?',
        default: true,
      },
    ]);

    if (pullNow) {
      await pullSecretsAfterInit(config.encryptionKey, cloudCheck.repoName);
    }
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
    // Read file directly without access check to avoid TOCTOU race condition
    const content = await fs.readFile(envPath, 'utf-8');
    return content.includes('LSH_SECRETS_KEY') ||
           content.includes('SUPABASE_URL') ||
           content.includes('DATABASE_URL');
  } catch {
    return false;
  }
}

/**
 * Pull secrets after init is complete
 */
async function pullSecretsAfterInit(encryptionKey: string, repoName: string): Promise<void> {
  const spinner = ora('Pulling secrets from cloud...').start();

  try {
    // Dynamically import SecretsManager to avoid circular dependencies
    const { SecretsManager } = await import('../lib/secrets-manager.js');
    const secretsManager = new SecretsManager();

    // Pull secrets for this repo
    await secretsManager.pull('.env', '', false);

    spinner.succeed(chalk.green('✅ Secrets pulled successfully!'));
  } catch (error) {
    spinner.fail(chalk.red('❌ Failed to pull secrets'));
    const err = error as Error;
    console.log(chalk.yellow(`\n⚠️  ${err.message}`));
    console.log(chalk.gray('\nYou can try pulling manually later with:'));
    console.log(chalk.cyan(`   lsh pull`));
  }
}

/**
 * Check if secrets already exist in cloud for current repo
 */
async function checkCloudSecretsExist(): Promise<{ exists: boolean; repoName?: string; environment?: string }> {
  try {
    const gitInfo = getGitRepoInfo();
    if (!gitInfo?.repoName) {
      return { exists: false };
    }

    const repoName = gitInfo.repoName;
    const environment = repoName; // Default environment for repo

    // First check local metadata (fast path)
    const paths = getPlatformPaths();
    const metadataPath = path.join(paths.dataDir, 'secrets-metadata.json');

    try {
      const metadataContent = await fs.readFile(metadataPath, 'utf-8');
      const metadata = JSON.parse(metadataContent);

      // Check if any environment matches this repo name
      const hasSecrets = Object.keys(metadata).some(env =>
        env === repoName || env.startsWith(`${repoName}_`)
      );

      if (hasSecrets) {
        return { exists: true, repoName, environment };
      }
    } catch {
      // Metadata file doesn't exist or can't be read - continue to network check
    }

    // Check Storacha network for registry file (works on new machines)
    try {
      const { getStorachaClient } = await import('../lib/storacha-client.js');
      const storacha = getStorachaClient();

      // Only check network if Storacha is enabled and authenticated
      if (storacha.isEnabled() && await storacha.isAuthenticated()) {
        const spinner = ora('Checking Storacha network for existing secrets...').start();

        const registryExists = await storacha.checkRegistry(repoName);

        spinner.stop();

        if (registryExists) {
          return { exists: true, repoName, environment };
        }
      }
    } catch (error) {
      // Network check failed, but that's okay - just means no secrets found
      const err = error as Error;
      console.log(chalk.gray(`   (Network check skipped: ${err.message})`));
    }

    return { exists: false, repoName, environment };
  } catch {
    return { exists: false };
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
 * Configure Storacha IPFS network sync
 */
async function configureStoracha(config: InitConfig): Promise<void> {
  console.log(chalk.cyan('\n🌐 Storacha IPFS Network Sync'));
  console.log(chalk.gray('Zero-config multi-host secrets sync via IPFS network'));
  console.log('');

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'email',
      message: 'Enter your email for Storacha authentication:',
      validate: (input) => {
        if (!input.trim()) return 'Email is required';
        if (!input.includes('@')) return 'Must be a valid email address';
        return true;
      },
    },
  ]);

  config.storachaEmail = answers.email.trim();

  console.log('');
  console.log(chalk.yellow('📧 Please check your email to complete authentication.'));
  console.log(chalk.gray('   After setup completes, run:'));
  console.log(chalk.cyan('   lsh storacha login ' + config.storachaEmail));
  console.log('');
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

    if (config.storageType === 'storacha') {
      updates.LSH_STORACHA_ENABLED = 'true';
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
  if (config.storageType === 'storacha') {
    console.log(chalk.cyan('🌐 Using Storacha IPFS network sync'));
  } else if (config.storageType === 'supabase') {
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

  if (config.storageType === 'storacha') {
    console.log(chalk.gray('   1. Authenticate with Storacha:'));
    console.log(chalk.cyan(`      lsh storacha login ${config.storachaEmail || 'your@email.com'}`));
    console.log('');
    console.log(chalk.gray('   2. Push your secrets:'));
    console.log(chalk.cyan('      lsh push --env dev'));
    console.log(chalk.gray('      (Automatically uploads to IPFS network)'));
    console.log('');
    console.log(chalk.gray('   3. On another machine:'));
    console.log(chalk.cyan('      lsh init --storacha'));
    console.log(chalk.cyan('      lsh storacha login your@email.com'));
    console.log(chalk.cyan('      lsh pull --env dev'));
    console.log(chalk.gray('      (Automatically downloads from IPFS network)'));
  } else {
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
  }

  console.log('');
  console.log(chalk.gray('📖 Documentation: https://github.com/gwicho38/lsh'));
  console.log('');
}

export default registerInitCommands;
