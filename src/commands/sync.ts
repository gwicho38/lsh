/**
 * Sync Commands
 * Native IPFS sync for secrets management (mirrors mcli pattern)
 *
 * Usage: lsh sync <command>
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { getIPFSSync } from '../lib/ipfs-sync.js';
import { IPFSClientManager } from '../lib/ipfs-client-manager.js';
import { getGitRepoInfo } from '../lib/git-utils.js';
import { ENV_VARS } from '../constants/index.js';

/**
 * Register sync commands
 */
// TODO(@gwicho38): Review - registerSyncCommands
export function registerSyncCommands(program: Command): void {
  const syncCommand = program
    .command('sync')
    .description('Sync secrets via native IPFS')
    .action(() => {
      // Show help when running `lsh sync` without subcommand
      console.log(chalk.bold.cyan('\n🔄 LSH Sync - IPFS Secrets Sync\n'));
      console.log(chalk.gray('Sync encrypted secrets via native IPFS (no auth required)\n'));
      console.log(chalk.bold('Setup:'));
      console.log(`  ${chalk.cyan('init')}      🚀 Full setup: install IPFS, initialize, and start daemon`);
      console.log(`  ${chalk.cyan('status')}    📊 Show IPFS client, daemon, and sync status`);
      console.log(`  ${chalk.cyan('start')}     ▶️  Start IPFS daemon`);
      console.log(`  ${chalk.cyan('stop')}      ⏹️  Stop IPFS daemon`);
      console.log('');
      console.log(chalk.bold('Sync:'));
      console.log(`  ${chalk.cyan('push')}      ⬆️  Push encrypted secrets to IPFS`);
      console.log(`  ${chalk.cyan('pull')}      ⬇️  Pull secrets from IPFS by CID`);
      console.log(`  ${chalk.cyan('history')}   📜 Show IPFS sync history`);
      console.log(`  ${chalk.cyan('verify')}    ✅ Verify that a CID is accessible on IPFS`);
      console.log(`  ${chalk.cyan('clear')}     🗑️  Clear sync history`);
      console.log('');
      console.log(chalk.bold('Examples:'));
      console.log(chalk.gray('  lsh sync init          # One-time setup'));
      console.log(chalk.gray('  lsh sync push          # Push secrets, get CID'));
      console.log(chalk.gray('  lsh sync pull <cid>    # Pull secrets by CID'));
      console.log('');
      console.log(chalk.gray('Run "lsh sync <command> --help" for more info.'));
      console.log('');
    });

  // lsh sync init
  syncCommand
    .command('init')
    .description('🚀 Full setup: install IPFS, initialize repo, and start daemon')
    .option('-f, --force', 'Force reinstall even if already installed')
    .action(async (options) => {
      console.log(chalk.bold.cyan('\n🚀 Setting up IPFS for sync...\n'));

      const manager = new IPFSClientManager();
      const ipfsSync = getIPFSSync();

      // Step 1: Check if daemon is already running
      if (await ipfsSync.checkDaemon()) {
        const info = await ipfsSync.getDaemonInfo();
        console.log(chalk.green('✅ IPFS is already set up and running!'));
        if (info) {
          console.log(chalk.gray(`   Peer ID: ${info.peerId.substring(0, 16)}...`));
          console.log(chalk.gray(`   Version: ${info.version}`));
        }
        console.log('');
        console.log(chalk.gray('You can now sync secrets:'));
        console.log(chalk.cyan('  lsh sync push'));
        console.log('');
        return;
      }

      // Step 2: Check if IPFS is installed
      const clientInfo = await manager.detect();

      if (!clientInfo.installed || options.force) {
        const installSpinner = ora('Installing IPFS client (Kubo)...').start();
        try {
          await manager.install({ force: options.force });
          installSpinner.succeed(chalk.green('IPFS client installed'));
        } catch (error) {
          const err = error as Error;
          installSpinner.fail(chalk.red('Failed to install IPFS'));
          console.error(chalk.red(err.message));
          process.exit(1);
        }
      } else {
        console.log(chalk.green('✅ IPFS client already installed'));
        console.log(chalk.gray(`   Version: ${clientInfo.version}`));
      }

      // Step 3: Initialize IPFS repository if needed
      const initSpinner = ora('Initializing IPFS repository...').start();
      try {
        await manager.init();
        initSpinner.succeed(chalk.green('IPFS repository initialized'));
      } catch (error) {
        const err = error as Error;
        // Check if already initialized
        if (err.message.includes('already') || err.message.includes('exists')) {
          initSpinner.succeed(chalk.green('IPFS repository already initialized'));
        } else {
          initSpinner.fail(chalk.red('Failed to initialize IPFS'));
          console.error(chalk.red(err.message));
          process.exit(1);
        }
      }

      // Step 4: Start the daemon
      const startSpinner = ora('Starting IPFS daemon...').start();
      try {
        await manager.start();
        startSpinner.succeed(chalk.green('IPFS daemon started'));
      } catch (error) {
        const err = error as Error;
        startSpinner.fail(chalk.red('Failed to start daemon'));
        console.error(chalk.red(err.message));
        process.exit(1);
      }

      // Final status
      console.log('');
      console.log(chalk.green.bold('✅ IPFS setup complete!'));
      console.log('');
      console.log(chalk.gray('You can now sync secrets:'));
      console.log(chalk.cyan('  lsh sync push          # Push secrets → get CID'));
      console.log(chalk.cyan('  lsh sync pull <cid>    # Pull secrets by CID'));
      console.log('');
    });

  // lsh sync push
  syncCommand
    .command('push')
    .description('⬆️  Push encrypted secrets to IPFS, returns CID')
    .option('-f, --file <path>', 'Path to .env file', '.env')
    .option('-e, --env <name>', 'Environment name', '')
    .action(async (options) => {
      const spinner = ora('Uploading to IPFS...').start();

      try {
        const ipfsSync = getIPFSSync();
        const gitInfo = getGitRepoInfo();

        // Check daemon
        if (!await ipfsSync.checkDaemon()) {
          spinner.fail(chalk.red('IPFS daemon not running'));
          console.log('');
          console.log(chalk.gray('Initialize IPFS first:'));
          console.log(chalk.cyan('  lsh sync init'));
          process.exit(1);
        }

        // Read .env file
        const envPath = path.resolve(options.file);
        if (!fs.existsSync(envPath)) {
          spinner.fail(chalk.red(`File not found: ${envPath}`));
          process.exit(1);
        }

        const content = fs.readFileSync(envPath, 'utf-8');

        // Get encryption key - check env first, then .env file
        let encryptionKey = process.env[ENV_VARS.LSH_SECRETS_KEY];

        if (!encryptionKey) {
          // Try to read from .env file
          const keyMatch = content.match(/^LSH_SECRETS_KEY=(.+)$/m);
          if (keyMatch) {
            encryptionKey = keyMatch[1].trim();
            // Remove quotes if present
            if ((encryptionKey.startsWith('"') && encryptionKey.endsWith('"')) ||
                (encryptionKey.startsWith("'") && encryptionKey.endsWith("'"))) {
              encryptionKey = encryptionKey.slice(1, -1);
            }
          }
        }

        if (!encryptionKey) {
          spinner.fail(chalk.red('LSH_SECRETS_KEY not set'));
          console.log('');
          console.log(chalk.gray('Generate a key with:'));
          console.log(chalk.cyan('  lsh key'));
          console.log('');
          console.log(chalk.gray('Then add it to .env or set it:'));
          console.log(chalk.cyan('  export LSH_SECRETS_KEY=<your-key>'));
          process.exit(1);
        }

        // Encrypt content
        const key = crypto.createHash('sha256').update(encryptionKey).digest();
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
        let encrypted = cipher.update(content, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        const encryptedData = iv.toString('hex') + ':' + encrypted;

        // Upload to IPFS
        const filename = `lsh-secrets-${options.env || 'default'}.encrypted`;
        const cid = await ipfsSync.upload(
          Buffer.from(encryptedData, 'utf-8'),
          filename,
          {
            environment: options.env || undefined,
            gitRepo: gitInfo?.repoName || undefined,
          }
        );

        if (!cid) {
          spinner.fail(chalk.red('Upload failed'));
          process.exit(1);
        }

        spinner.succeed(chalk.green('Uploaded to IPFS!'));
        console.log('');
        console.log(chalk.bold('CID:'), chalk.cyan(cid));
        console.log('');
        console.log(chalk.gray('Share this CID with teammates to pull secrets:'));
        console.log(chalk.cyan(`  lsh sync pull ${cid}`));
        console.log('');
        console.log(chalk.gray('Public gateway URLs:'));
        ipfsSync.getGatewayUrls(cid).slice(0, 2).forEach(url => {
          console.log(chalk.gray(`  ${url}`));
        });
        console.log('');
      } catch (error) {
        const err = error as Error;
        spinner.fail(chalk.red('Push failed'));
        console.error(chalk.red(err.message));
        process.exit(1);
      }
    });

  // lsh sync pull <cid>
  syncCommand
    .command('pull <cid>')
    .description('⬇️  Pull secrets from IPFS by CID')
    .option('-o, --output <path>', 'Output file path', '.env')
    .option('--force', 'Overwrite existing file without backup')
    .action(async (cid, options) => {
      const spinner = ora('Downloading from IPFS...').start();

      try {
        const ipfsSync = getIPFSSync();

        // Download from IPFS
        const data = await ipfsSync.download(cid);
        if (!data) {
          spinner.fail(chalk.red('Download failed'));
          console.log('');
          console.log(chalk.gray('The CID might not be available on public gateways yet.'));
          console.log(chalk.gray('Make sure the source machine is online with IPFS daemon running.'));
          process.exit(1);
        }

        // Get encryption key - check env first, then existing .env file
        let encryptionKey = process.env[ENV_VARS.LSH_SECRETS_KEY];

        if (!encryptionKey) {
          // Try to read from existing .env file
          const outputPath = path.resolve(options.output);
          if (fs.existsSync(outputPath)) {
            const existingContent = fs.readFileSync(outputPath, 'utf-8');
            const keyMatch = existingContent.match(/^LSH_SECRETS_KEY=(.+)$/m);
            if (keyMatch) {
              encryptionKey = keyMatch[1].trim();
              // Remove quotes if present
              if ((encryptionKey.startsWith('"') && encryptionKey.endsWith('"')) ||
                  (encryptionKey.startsWith("'") && encryptionKey.endsWith("'"))) {
                encryptionKey = encryptionKey.slice(1, -1);
              }
            }
          }
        }

        if (!encryptionKey) {
          spinner.fail(chalk.red('LSH_SECRETS_KEY not set'));
          console.log('');
          console.log(chalk.gray('You need the same encryption key used to push.'));
          console.log(chalk.gray('Set it in your environment or .env file:'));
          console.log(chalk.cyan('  export LSH_SECRETS_KEY=<key-from-teammate>'));
          process.exit(1);
        }

        // Decrypt content
        const encryptedData = data.toString('utf-8');
        const [ivHex, encrypted] = encryptedData.split(':');

        if (!ivHex || !encrypted) {
          spinner.fail(chalk.red('Invalid encrypted data format'));
          process.exit(1);
        }

        const key = crypto.createHash('sha256').update(encryptionKey).digest();
        const iv = Buffer.from(ivHex, 'hex');

        let decrypted: string;
        try {
          const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
          decrypted = decipher.update(encrypted, 'hex', 'utf8');
          decrypted += decipher.final('utf8');
        } catch {
          spinner.fail(chalk.red('Decryption failed'));
          console.log('');
          console.log(chalk.red('Wrong encryption key!'));
          console.log(chalk.gray('Make sure LSH_SECRETS_KEY matches the key used to push.'));
          process.exit(1);
        }

        // Write output file
        const outputPath = path.resolve(options.output);

        // Backup existing file if it exists (unless --force)
        if (fs.existsSync(outputPath) && !options.force) {
          const backupPath = `${outputPath}.backup.${Date.now()}`;
          fs.copyFileSync(outputPath, backupPath);
          console.log(chalk.gray(`Backed up existing file to: ${backupPath}`));
        }

        fs.writeFileSync(outputPath, decrypted, 'utf-8');

        spinner.succeed(chalk.green('Downloaded and decrypted!'));
        console.log('');
        console.log(chalk.bold('Output:'), chalk.cyan(outputPath));
        console.log(chalk.bold('CID:'), chalk.gray(cid));
        console.log('');
      } catch (error) {
        const err = error as Error;
        spinner.fail(chalk.red('Pull failed'));
        console.error(chalk.red(err.message));
        process.exit(1);
      }
    });

  // lsh sync status
  syncCommand
    .command('status')
    .description('📊 Show IPFS client, daemon, and sync status')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      try {
        const manager = new IPFSClientManager();
        const clientInfo = await manager.detect();
        const ipfsSync = getIPFSSync();
        const daemonInfo = await ipfsSync.getDaemonInfo();
        const history = await ipfsSync.getHistory(5);

        if (options.json) {
          console.log(JSON.stringify({
            client: clientInfo,
            daemonRunning: !!daemonInfo,
            daemonInfo,
            recentSyncs: history.length,
          }, null, 2));
          return;
        }

        console.log(chalk.bold.cyan('\n📊 Sync Status\n'));
        console.log(chalk.gray('━'.repeat(50)));
        console.log('');

        // Client status
        console.log(chalk.bold('IPFS Client:'));
        if (clientInfo.installed) {
          console.log(chalk.green('  ✅ Installed'));
          console.log(`     Type: ${clientInfo.type}`);
          console.log(`     Version: ${clientInfo.version}`);
        } else {
          console.log(chalk.yellow('  ⚠️  Not installed'));
          console.log(chalk.gray('     Run: lsh sync init'));
        }
        console.log('');

        // Daemon status
        console.log(chalk.bold('IPFS Daemon:'));
        if (daemonInfo) {
          console.log(chalk.green('  ✅ Running'));
          console.log(`     Peer ID: ${daemonInfo.peerId.substring(0, 16)}...`);
          console.log(`     API: http://127.0.0.1:5001`);
          console.log(`     Gateway: http://127.0.0.1:8080`);
        } else {
          console.log(chalk.yellow('  ⚠️  Not running'));
          console.log(chalk.gray('     Run: lsh sync start'));
        }
        console.log('');

        // Recent syncs
        console.log(chalk.bold('Recent Syncs:'));
        if (history.length > 0) {
          console.log(`  ${history.length} recent sync(s)`);
          const latest = history[0];
          const date = new Date(latest.timestamp);
          console.log(`  Latest: ${date.toLocaleString()}`);
          console.log(`  CID: ${latest.cid.substring(0, 20)}...`);
        } else {
          console.log(chalk.gray('  No sync history'));
        }
        console.log('');

        // Quick actions
        if (clientInfo.installed && daemonInfo) {
          console.log(chalk.bold('Ready to sync:'));
          console.log(chalk.cyan('  lsh sync push        # Push secrets'));
          console.log(chalk.cyan('  lsh sync pull <cid>  # Pull by CID'));
        } else if (!clientInfo.installed) {
          console.log(chalk.bold('Get started:'));
          console.log(chalk.cyan('  lsh sync init        # Full setup'));
        } else {
          console.log(chalk.bold('Start daemon:'));
          console.log(chalk.cyan('  lsh sync start'));
        }
        console.log('');
      } catch (error) {
        const err = error as Error;
        console.error(chalk.red('Failed to check status:'), err.message);
        process.exit(1);
      }
    });

  // lsh sync history
  syncCommand
    .command('history')
    .description('📜 Show IPFS sync history')
    .option('-n, --limit <number>', 'Number of entries to show', '10')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      try {
        const ipfsSync = getIPFSSync();
        const limit = parseInt(options.limit, 10);
        const history = await ipfsSync.getHistory(limit);

        if (options.json) {
          console.log(JSON.stringify(history, null, 2));
          return;
        }

        console.log(chalk.bold.cyan('\n📜 Sync History\n'));
        console.log(chalk.gray('━'.repeat(60)));
        console.log('');

        if (history.length === 0) {
          console.log(chalk.gray('No sync history found.'));
          console.log('');
          console.log(chalk.gray('Push your first secrets with:'));
          console.log(chalk.cyan('  lsh sync push'));
          console.log('');
          return;
        }

        for (const entry of history) {
          const date = new Date(entry.timestamp);
          const dateStr = date.toLocaleString();

          console.log(chalk.bold(`${entry.cid.substring(0, 16)}...`));
          console.log(`  File: ${entry.filename}`);
          console.log(`  Size: ${entry.size} bytes`);
          console.log(`  Time: ${dateStr}`);
          if (entry.gitRepo) {
            console.log(`  Repo: ${entry.gitRepo}`);
          }
          if (entry.environment) {
            console.log(`  Env:  ${entry.environment}`);
          }
          console.log('');
        }

        console.log(chalk.gray(`Showing ${history.length} entries. Use -n to show more.`));
        console.log('');
      } catch (error) {
        const err = error as Error;
        console.error(chalk.red('Failed to get history:'), err.message);
        process.exit(1);
      }
    });

  // lsh sync verify <cid>
  syncCommand
    .command('verify <cid>')
    .description('✅ Verify that a CID is accessible on IPFS')
    .action(async (cid) => {
      const spinner = ora('Verifying CID accessibility...').start();

      try {
        const ipfsSync = getIPFSSync();
        const result = await ipfsSync.verifyCid(cid);

        if (result.available) {
          spinner.succeed(chalk.green('CID is accessible!'));
          console.log('');
          console.log(chalk.bold('CID:'), chalk.cyan(cid));
          console.log(chalk.bold('Source:'), chalk.gray(result.source));
          console.log('');
        } else {
          spinner.fail(chalk.red('CID not accessible'));
          console.log('');
          console.log(chalk.gray('The CID could not be found on the network.'));
          console.log(chalk.gray('Possible reasons:'));
          console.log(chalk.gray('  - Source machine is offline'));
          console.log(chalk.gray('  - Content not yet propagated to gateways'));
          console.log(chalk.gray('  - Invalid CID'));
          console.log('');
        }
      } catch (error) {
        const err = error as Error;
        spinner.fail(chalk.red('Verification failed'));
        console.error(chalk.red(err.message));
        process.exit(1);
      }
    });

  // lsh sync clear
  syncCommand
    .command('clear')
    .description('🗑️  Clear sync history')
    .action(async () => {
      try {
        const ipfsSync = getIPFSSync();
        await ipfsSync.clearHistory();
        console.log(chalk.green('✅ Sync history cleared'));
      } catch (error) {
        const err = error as Error;
        console.error(chalk.red('Failed to clear history:'), err.message);
        process.exit(1);
      }
    });

  // lsh sync start
  syncCommand
    .command('start')
    .description('▶️  Start IPFS daemon')
    .action(async () => {
      try {
        const manager = new IPFSClientManager();
        const ipfsSync = getIPFSSync();

        // Check if already running
        if (await ipfsSync.checkDaemon()) {
          const info = await ipfsSync.getDaemonInfo();
          console.log(chalk.green('✅ IPFS daemon is already running'));
          if (info) {
            console.log(chalk.gray(`   Peer ID: ${info.peerId.substring(0, 16)}...`));
          }
          return;
        }

        await manager.start();
      } catch (error) {
        const err = error as Error;
        console.error(chalk.red('Failed to start daemon:'), err.message);
        process.exit(1);
      }
    });

  // lsh sync stop
  syncCommand
    .command('stop')
    .description('⏹️  Stop IPFS daemon')
    .action(async () => {
      try {
        const manager = new IPFSClientManager();
        await manager.stop();
      } catch (error) {
        const err = error as Error;
        console.error(chalk.red('Failed to stop daemon:'), err.message);
        process.exit(1);
      }
    });
}

export default registerSyncCommands;
