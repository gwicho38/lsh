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
import { getGitRepoInfo } from '../lib/git-utils.js';
import { ENV_VARS } from '../constants/index.js';

/**
 * Register sync commands
 */
export function registerSyncCommands(program: Command): void {
  const syncCommand = program
    .command('sync')
    .description('Sync secrets via native IPFS')
    .action(() => {
      // Show help when running `lsh sync` without subcommand
      console.log(chalk.bold.cyan('\n🔄 LSH Sync - IPFS Secrets Sync\n'));
      console.log(chalk.gray('Sync encrypted secrets via native IPFS (no auth required)\n'));
      console.log(chalk.bold('Commands:'));
      console.log(`  ${chalk.cyan('init')}      🚀 Initialize and start the IPFS daemon`);
      console.log(`  ${chalk.cyan('push')}      ⬆️  Push encrypted secrets to IPFS`);
      console.log(`  ${chalk.cyan('pull')}      ⬇️  Pull secrets from IPFS by CID`);
      console.log(`  ${chalk.cyan('status')}    📊 Show IPFS daemon and sync status`);
      console.log(`  ${chalk.cyan('history')}   📜 Show IPFS sync history`);
      console.log(`  ${chalk.cyan('verify')}    ✅ Verify that a CID is accessible on IPFS`);
      console.log(`  ${chalk.cyan('clear')}     🗑️  Clear sync history`);
      console.log('');
      console.log(chalk.bold('Examples:'));
      console.log(chalk.gray('  lsh sync init          # Set up IPFS for first time'));
      console.log(chalk.gray('  lsh sync push          # Push secrets, get CID'));
      console.log(chalk.gray('  lsh sync pull <cid>    # Pull secrets by CID'));
      console.log('');
      console.log(chalk.gray('Run "lsh sync <command> --help" for more info.'));
      console.log('');
    });

  // lsh sync init
  syncCommand
    .command('init')
    .description('🚀 Initialize and start the IPFS daemon')
    .action(async () => {
      console.log(chalk.bold.cyan('\n🚀 Initializing IPFS for sync...\n'));

      const ipfsSync = getIPFSSync();

      // Check if daemon is already running
      if (await ipfsSync.checkDaemon()) {
        const info = await ipfsSync.getDaemonInfo();
        console.log(chalk.green('✅ IPFS daemon is already running!'));
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

      // Daemon not running, show instructions
      console.log(chalk.yellow('⚠️  IPFS daemon not running'));
      console.log('');
      console.log(chalk.gray('To start IPFS:'));
      console.log('');
      console.log(chalk.bold('1. Install IPFS (if not installed):'));
      console.log(chalk.cyan('   lsh ipfs install'));
      console.log('');
      console.log(chalk.bold('2. Initialize IPFS repository:'));
      console.log(chalk.cyan('   lsh ipfs init'));
      console.log('');
      console.log(chalk.bold('3. Start the daemon:'));
      console.log(chalk.cyan('   lsh ipfs start'));
      console.log('');
      console.log(chalk.gray('Or run all at once:'));
      console.log(chalk.cyan('   lsh ipfs install && lsh ipfs init && lsh ipfs start'));
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

        // Get encryption key
        const encryptionKey = process.env[ENV_VARS.LSH_SECRETS_KEY];
        if (!encryptionKey) {
          spinner.fail(chalk.red('LSH_SECRETS_KEY not set'));
          console.log('');
          console.log(chalk.gray('Generate a key with:'));
          console.log(chalk.cyan('  lsh key'));
          console.log('');
          console.log(chalk.gray('Then set it:'));
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

        // Get encryption key
        const encryptionKey = process.env[ENV_VARS.LSH_SECRETS_KEY];
        if (!encryptionKey) {
          spinner.fail(chalk.red('LSH_SECRETS_KEY not set'));
          console.log('');
          console.log(chalk.gray('You need the same encryption key used to push.'));
          console.log(chalk.gray('Set it in your environment:'));
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
    .description('📊 Show IPFS daemon and sync status')
    .action(async () => {
      try {
        const ipfsSync = getIPFSSync();
        const daemonInfo = await ipfsSync.getDaemonInfo();

        console.log(chalk.bold.cyan('\n📊 Sync Status\n'));
        console.log(chalk.gray('━'.repeat(50)));
        console.log('');

        if (daemonInfo) {
          console.log(chalk.green('✅ IPFS daemon running'));
          console.log(`   Peer ID: ${daemonInfo.peerId.substring(0, 16)}...`);
          console.log(`   Version: ${daemonInfo.version}`);
          console.log('');
          console.log(chalk.gray('Ready to sync:'));
          console.log(chalk.cyan('  lsh sync push      # Push secrets'));
          console.log(chalk.cyan('  lsh sync pull <cid>  # Pull by CID'));
        } else {
          console.log(chalk.yellow('⚠️  IPFS daemon not running'));
          console.log('');
          console.log(chalk.gray('Start with:'));
          console.log(chalk.cyan('  lsh sync init'));
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
}

export default registerSyncCommands;
