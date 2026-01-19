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
import ora from 'ora';
import { getPlatformPaths } from '../lib/platform-utils.js';
import { getGitRepoInfo } from '../lib/git-utils.js';
import * as os from 'os';

interface InitConfig {
  encryptionKey: string;
}

/**
 * Register init commands
 */
export function registerInitCommands(program: Command): void {
  program
    .command('init')
    .description('Interactive setup wizard (first-time configuration)')
    .option('-g, --global', 'Use global workspace ($HOME)')
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
 * Get the base directory for .env files
 */
function getBaseDir(globalMode?: boolean): string {
  return globalMode ? os.homedir() : process.cwd();
}

/**
 * Run the interactive setup wizard
 */
async function runSetupWizard(options: {
  global?: boolean;
}): Promise<void> {
  const globalMode = options.global ?? false;
  const baseDir = getBaseDir(globalMode);

  if (globalMode) {
    console.log(chalk.bold.cyan('\n🔐 LSH Secrets Manager - Global Setup Wizard'));
    console.log(chalk.gray('━'.repeat(50)));
    console.log(chalk.yellow(`\n🌐 Global Mode: Using $HOME (${baseDir})`));
  } else {
    console.log(chalk.bold.cyan('\n🔐 LSH Secrets Manager - Setup Wizard'));
    console.log(chalk.gray('━'.repeat(50)));
  }
  console.log('');

  // Check if already configured
  const existingConfig = await checkExistingConfig(baseDir);
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

  // Check IPFS daemon status
  const { getIPFSSync } = await import('../lib/ipfs-sync.js');
  const ipfsSync = getIPFSSync();
  const daemonRunning = await ipfsSync.checkDaemon();

  if (!daemonRunning) {
    console.log(chalk.yellow('\n⚠️  IPFS daemon not running'));
    console.log(chalk.gray('   For network sync, start IPFS:'));
    console.log(chalk.cyan('   lsh ipfs install && lsh ipfs init && lsh ipfs start'));
    console.log(chalk.gray('   Setup will continue with local-only mode.'));
    console.log('');
  } else {
    console.log(chalk.green('\n✅ IPFS daemon running - network sync enabled'));
    console.log('');
  }

  // Check if secrets already exist locally
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
    encryptionKey,
  };

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
  await saveConfiguration(config, baseDir, globalMode);

  // Show success message
  showSuccessMessage(config);
}

/**
 * Check if LSH is already configured
 */
async function checkExistingConfig(baseDir: string): Promise<boolean> {
  try {
    const envPath = path.join(baseDir, '.env');
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
async function pullSecretsAfterInit(_encryptionKey: string, _repoName: string): Promise<void> {
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
 * Check if secrets already exist locally for current repo
 */
async function checkCloudSecretsExist(): Promise<{ exists: boolean; repoName?: string; environment?: string }> {
  try {
    const gitInfo = getGitRepoInfo();
    if (!gitInfo?.repoName) {
      return { exists: false };
    }

    const repoName = gitInfo.repoName;
    const environment = repoName; // Default environment for repo

    // Check local metadata (fast path)
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
      // Metadata file doesn't exist or can't be read
    }

    // Check IPFS sync history for this repo
    try {
      const { getIPFSSync } = await import('../lib/ipfs-sync.js');
      const ipfsSync = getIPFSSync();
      const latestCid = await ipfsSync.getLatestCid(repoName);

      if (latestCid) {
        return { exists: true, repoName, environment };
      }
    } catch {
      // IPFS sync history check failed
    }

    return { exists: false, repoName, environment };
  } catch {
    return { exists: false };
  }
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
async function saveConfiguration(config: InitConfig, baseDir: string, globalMode?: boolean): Promise<void> {
  const spinner = ora('Saving configuration...').start();

  try {
    const envPath = path.join(baseDir, '.env');
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

    // Update .gitignore (skip for global mode since it's in $HOME)
    if (!globalMode) {
      await updateGitignore();
    }

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

  console.log(chalk.cyan('🌐 Using native IPFS for secrets sync'));
  console.log('');

  // Next steps
  console.log(chalk.bold('🚀 Next steps:'));
  console.log('');

  console.log(chalk.gray('   1. (Optional) Start IPFS daemon for network sync:'));
  console.log(chalk.cyan('      lsh ipfs install && lsh ipfs init && lsh ipfs start'));
  console.log('');
  console.log(chalk.gray('   2. Push your secrets to IPFS:'));
  console.log(chalk.cyan('      lsh sync push'));
  console.log(chalk.gray('      (Returns a CID - share this with teammates)'));
  console.log('');
  console.log(chalk.gray('   3. On another machine:'));
  console.log(chalk.cyan('      lsh init'));
  console.log(chalk.cyan('      export LSH_SECRETS_KEY=<key-from-teammate>'));
  console.log(chalk.cyan('      lsh sync pull <cid>'));
  console.log('');
  console.log(chalk.gray('   Alternatively, use the classic push/pull commands:'));
  console.log(chalk.cyan('      lsh push --env dev'));
  console.log(chalk.cyan('      lsh pull --env dev'));

  console.log('');
  console.log(chalk.gray('📖 Documentation: https://github.com/gwicho38/lsh'));
  console.log('');
}

export default registerInitCommands;
