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
import { fileURLToPath } from 'url';
import { ENV_VARS } from '../constants/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** GitHub workflow run (minimal interface for CI check) */
interface GitHubWorkflowRun {
  head_branch: string;
  status: string;
  conclusion: string;
  html_url: string;
}

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
      path: '/lsh-framework',
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
 * Decide build status from the build workflow's runs (pure, unit-testable).
 *
 * Only a real `failure` on the most recent COMPLETED run blocks an update.
 * `cancelled` / `skipped` / `null` are infra noise — the build is frequently
 * cancelled by concurrency on the self-hosted runner — and must NOT be reported
 * as a failing build. No completed runs → treat as passing (don't block).
 */
export function evaluateBuildRuns(
  runs: GitHubWorkflowRun[],
): { passing: boolean; url?: string } {
  const completed = (runs || []).filter((run) => run.status === 'completed');
  if (completed.length === 0) {
    return { passing: true };
  }
  const latest = completed[0];
  return { passing: latest.conclusion !== 'failure', url: latest.html_url };
}

/**
 * Check GitHub Actions CI status for a specific version tag
 */
async function checkCIStatus(_version: string): Promise<{ passing: boolean; url?: string }> {
  return new Promise((resolve) => {
    const options = {
      hostname: 'api.github.com',
      port: 443,
      // Scope to the BUILD workflow only. Querying all workflows let a flaky
      // security scan (e.g. Codacy timing out on a download) read as "build failing".
      path: `/repos/gwicho38/lsh/actions/workflows/node.js.yml/runs?branch=main&per_page=5`,
      method: 'GET',
      headers: {
        'User-Agent': 'lsh-cli',
        'Accept': 'application/vnd.github.v3+json',
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
            const ghData = JSON.parse(data);
            const runs = (ghData.workflow_runs || []) as GitHubWorkflowRun[];
            // The path is already scoped to node.js.yml on main; decide via the pure helper.
            resolve(evaluateBuildRuns(runs));
          } else {
            // If we can't check CI, don't block the update
            resolve({ passing: true });
          }
        } catch (_error) {
          // On error, don't block the update
          resolve({ passing: true });
        }
      });
    }).on('error', () => {
      // On network error, don't block the update
      resolve({ passing: true });
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
  .option('--skip-ci-check', 'Skip CI status check and install anyway')
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

      // Check CI status before installing (unless skipped)
      if (!options.skipCiCheck) {
        console.log(chalk.cyan('🔍 Checking CI status...'));
        const ciStatus = await checkCIStatus(latestVersion);

        if (!ciStatus.passing) {
          console.log(chalk.red('✗ CI build is failing for the latest version'));
          if (ciStatus.url) {
            console.log(chalk.yellow(`  View CI status: ${ciStatus.url}`));
          }
          console.log(chalk.yellow('⚠ Update blocked to prevent installing a broken version'));
          console.log(chalk.dim('  Use --skip-ci-check to install anyway (not recommended)'));
          return;
        } else {
          console.log(chalk.green('✓ CI build is passing'));
        }
      }

      // Install update
      console.log(chalk.cyan(`📦 Installing lsh ${latestVersion}...`));

      const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
      const updateProcess = spawn(npmCmd, ['install', '-g', 'lsh-framework@latest'], {
        stdio: 'inherit',
      });

      updateProcess.on('close', (code) => {
        if (code === 0) {
          console.log(chalk.green(`✓ Successfully updated to lsh ${latestVersion}!`));
          console.log(chalk.yellow('ℹ Restart your terminal or run \'hash -r\' to use the new version'));
        } else {
          console.log(chalk.red('✗ Update failed'));
          console.log(chalk.yellow('ℹ Try running with sudo: sudo npm install -g lsh-framework@latest'));
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
    console.log('  NODE_ENV:', process.env[ENV_VARS.NODE_ENV] || 'not set');
    console.log('  HOME:', process.env[ENV_VARS.HOME] || 'not set');
    console.log('  USER:', process.env[ENV_VARS.USER] || 'not set');
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

/**
 * Uninstall command - remove LSH from the system
 */
selfCommand
  .command('uninstall')
  .description('Uninstall LSH from your system')
  .option('-y, --yes', 'Skip confirmation prompt')
  .action(async (options) => {
    try {
      console.log(chalk.yellow('╔════════════════════════════════════╗'));
      console.log(chalk.yellow('║      Uninstall LSH Framework       ║'));
      console.log(chalk.yellow('╚════════════════════════════════════╝'));
      console.log();

      // Ask for confirmation unless --yes flag is used
      if (!options.yes) {
        const readline = await import('readline');
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout,
        });

        const answer = await new Promise<string>((resolve) => {
          rl.question(chalk.yellow('Are you sure you want to uninstall LSH? (y/N) '), (ans) => {
            rl.close();
            resolve(ans);
          });
        });

        if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
          console.log(chalk.yellow('Uninstall cancelled'));
          return;
        }
      }

      console.log(chalk.cyan('📦 Uninstalling lsh-framework...'));
      console.log();

      const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
      const uninstallProcess = spawn(npmCmd, ['uninstall', '-g', 'lsh-framework'], {
        stdio: 'inherit',
      });

      uninstallProcess.on('close', (code) => {
        if (code === 0) {
          console.log();
          console.log(chalk.green('✓ LSH has been uninstalled successfully'));
          console.log();
          console.log(chalk.dim('Thank you for using LSH!'));
          console.log(chalk.dim('You can reinstall anytime with: npm install -g lsh-framework'));
        } else {
          console.log();
          console.log(chalk.red('✗ Uninstall failed'));
          console.log(chalk.yellow('ℹ Try running with sudo: sudo npm uninstall -g lsh-framework'));
        }
      });
    } catch (error) {
      console.error(chalk.red('✗ Error during uninstall:'), error);
    }
  });

export default selfCommand;
