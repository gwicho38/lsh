/**
 * Self-management commands for LSH
 * Provides utilities for updating and maintaining the CLI
 */

import { Command } from 'commander';
import * as https from 'https';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';

const selfCommand = new Command('self');
selfCommand.description('Manage and update the LSH application');

/**
 * Parse version string to tuple for comparison
 */
function parseVersion(version: string): number[] {
  return version
    .replace(/^v/, '')
    .split('.')
    .map(x => parseInt(x) || 0);
}

/**
 * Compare two version strings
 * Returns: -1 if v1 < v2, 0 if equal, 1 if v1 > v2
 */
function compareVersions(v1: string, v2: string): number {
  const parts1 = parseVersion(v1);
  const parts2 = parseVersion(v2);

  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;

    if (p1 < p2) return -1;
    if (p1 > p2) return 1;
  }

  return 0;
}

/**
 * Get current version from package.json
 */
function getCurrentVersion(): string {
  try {
    const packageJsonPath = path.join(__dirname, '../../package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    return packageJson.version || 'unknown';
  } catch {
    return 'unknown';
  }
}

/**
 * Fetch latest version from npm registry
 */
async function fetchLatestVersion(): Promise<{ version: string; publishedAt?: string } | null> {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'registry.npmjs.org',
      port: 443,
      path: '/gwicho38-lsh',
      method: 'GET',
      headers: {
        'User-Agent': 'lsh-cli',
      },
    };

    https.get(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          if (res.statusCode === 200) {
            const npmData = JSON.parse(data);
            const latestVersion = npmData['dist-tags']?.latest;

            if (latestVersion) {
              const publishedAt = npmData.time?.[latestVersion];
              resolve({
                version: latestVersion,
                publishedAt: publishedAt || undefined,
              });
            } else {
              resolve(null);
            }
          } else {
            console.error(chalk.red(`✗ npm registry returned status ${res.statusCode}`));
            resolve(null);
          }
        } catch (error) {
          reject(error);
        }
      });
    }).on('error', (error) => {
      reject(error);
    });
  });
}

/**
 * Update command - check for and install updates from npm
 */
selfCommand
  .command('update')
  .description('Check for and install LSH updates from npm')
  .option('--check', 'Only check for updates, don\'t install')
  .option('-y, --yes', 'Skip confirmation prompt')
  .action(async (options) => {
    try {
      const currentVersion = getCurrentVersion();

      console.log(chalk.cyan('Current version:'), currentVersion);
      console.log(chalk.cyan('Checking npm for updates...'));

      // Fetch latest version from npm
      const latestInfo = await fetchLatestVersion();

      if (!latestInfo) {
        console.log(chalk.red('✗ Failed to fetch version information from npm'));
        console.log(chalk.yellow('⚠ Make sure you have internet connectivity'));
        return;
      }

      const { version: latestVersion, publishedAt } = latestInfo;
      console.log(chalk.cyan('Latest version:'), latestVersion);

      if (publishedAt) {
        const date = new Date(publishedAt);
        console.log(chalk.dim(`  Published: ${date.toLocaleDateString()}`));
      }

      // Compare versions
      const comparison = compareVersions(currentVersion, latestVersion);

      if (comparison === 0) {
        console.log(chalk.green('✓ You\'re already on the latest version!'));
        return;
      }

      if (comparison > 0) {
        console.log(chalk.green(`✓ Your version (${currentVersion}) is newer than npm`));
        console.log(chalk.dim('  You may be using a development version'));
        return;
      }

      // Update available
      console.log(chalk.yellow(`⬆ Update available: ${currentVersion} → ${latestVersion}`));

      if (options.check) {
        console.log(chalk.cyan('ℹ Run \'lsh self update\' to install the update'));
        return;
      }

      // Ask for confirmation unless --yes flag is used
      if (!options.yes) {
        const readline = await import('readline');
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout,
        });

        const answer = await new Promise<string>((resolve) => {
          rl.question(chalk.yellow(`Install lsh ${latestVersion}? (y/N) `), (ans) => {
            rl.close();
            resolve(ans);
          });
        });

        if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
          console.log(chalk.yellow('Update cancelled'));
          return;
        }
      }

      // Install update
      console.log(chalk.cyan(`📦 Installing lsh ${latestVersion}...`));

      const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
      const updateProcess = spawn(npmCmd, ['install', '-g', 'gwicho38-lsh@latest'], {
        stdio: 'inherit',
      });

      updateProcess.on('close', (code) => {
        if (code === 0) {
          console.log(chalk.green(`✓ Successfully updated to lsh ${latestVersion}!`));
          console.log(chalk.yellow('ℹ Restart your terminal or run \'hash -r\' to use the new version'));
        } else {
          console.log(chalk.red('✗ Update failed'));
          console.log(chalk.yellow('ℹ Try running with sudo: sudo npm install -g gwicho38-lsh@latest'));
        }
      });
    } catch (error) {
      console.error(chalk.red('✗ Error during update:'), error);
    }
  });

/**
 * Version command - show detailed version information
 */
selfCommand
  .command('version')
  .description('Show detailed version information')
  .action(() => {
    const currentVersion = getCurrentVersion();

    console.log(chalk.cyan('╔════════════════════════════════════╗'));
    console.log(chalk.cyan('║         LSH Version Info           ║'));
    console.log(chalk.cyan('╚════════════════════════════════════╝'));
    console.log();
    console.log(chalk.cyan('Version:'), currentVersion);
    console.log(chalk.cyan('Node:'), process.version);
    console.log(chalk.cyan('Platform:'), `${process.platform} (${process.arch})`);
    console.log();
    console.log(chalk.dim('Run \'lsh self update --check\' to check for updates'));
  });

/**
 * Info command - show installation and configuration info
 */
selfCommand
  .command('info')
  .description('Show installation and configuration information')
  .action(() => {
    const currentVersion = getCurrentVersion();

    console.log(chalk.cyan('╔════════════════════════════════════╗'));
    console.log(chalk.cyan('║      LSH Installation Info         ║'));
    console.log(chalk.cyan('╚════════════════════════════════════╝'));
    console.log();

    // Version info
    console.log(chalk.yellow('Version Information:'));
    console.log('  LSH Version:', currentVersion);
    console.log('  Node.js:', process.version);
    console.log('  Platform:', `${process.platform} (${process.arch})`);
    console.log();

    // Installation paths
    console.log(chalk.yellow('Installation:'));
    console.log('  Executable:', process.execPath);
    console.log('  Working Dir:', process.cwd());
    console.log();

    // Environment
    console.log(chalk.yellow('Environment:'));
    console.log('  NODE_ENV:', process.env.NODE_ENV || 'not set');
    console.log('  HOME:', process.env.HOME || 'not set');
    console.log('  USER:', process.env.USER || 'not set');
    console.log();

    // Configuration
    const envFile = path.join(process.cwd(), '.env');
    const envExists = fs.existsSync(envFile);
    console.log(chalk.yellow('Configuration:'));
    console.log('  .env file:', envExists ? chalk.green('Found') : chalk.red('Not found'));
    if (!envExists) {
      console.log(chalk.dim('  Copy .env.example to .env to configure'));
    }
    console.log();

    console.log(chalk.dim('For more info, visit: https://github.com/gwicho38/lsh'));
  });

export default selfCommand;
