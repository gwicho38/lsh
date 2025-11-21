/**
 * IPFS Commands
 * Manage IPFS client installation and configuration
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { IPFSClientManager } from '../lib/ipfs-client-manager.js';

/**
 * Register IPFS commands
 */
export function registerIPFSCommands(program: Command): void {
  const ipfsCommand = program
    .command('ipfs')
    .description('Manage IPFS client installation and configuration');

  // lsh ipfs status
  ipfsCommand
    .command('status')
    .description('Check IPFS client installation status')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      try {
        const manager = new IPFSClientManager();
        const info = await manager.detect();

        if (options.json) {
          console.log(JSON.stringify(info, null, 2));
          return;
        }

        console.log(chalk.bold.cyan('\n📦 IPFS Client Status'));
        console.log(chalk.gray('━'.repeat(50)));
        console.log('');

        if (info.installed) {
          console.log(chalk.green('✅ IPFS client installed'));
          console.log(`   Type: ${info.type}`);
          console.log(`   Version: ${info.version}`);
          console.log(`   Path: ${info.path}`);
        } else {
          console.log(chalk.yellow('⚠️  IPFS client not installed'));
          console.log('');
          console.log(chalk.gray('   Install with: lsh ipfs install'));
        }

        console.log('');
      } catch (error) {
        const err = error as Error;
        console.error(chalk.red('\n❌ Failed to check status:'), err.message);
        process.exit(1);
      }
    });

  // lsh ipfs install
  ipfsCommand
    .command('install')
    .description('Install IPFS client (Kubo)')
    .option('-f, --force', 'Force reinstall even if already installed')
    .option('-v, --version <version>', 'Install specific version')
    .action(async (options) => {
      const spinner = ora('Installing IPFS client...').start();

      try {
        const manager = new IPFSClientManager();
        await manager.install({
          force: options.force,
          version: options.version,
        });

        spinner.succeed(chalk.green('IPFS client installed successfully!'));
        console.log('');
        console.log(chalk.gray('Next steps:'));
        console.log(chalk.cyan('  lsh ipfs init    # Initialize IPFS repository'));
        console.log(chalk.cyan('  lsh ipfs start   # Start IPFS daemon'));
        console.log('');
      } catch (error) {
        const err = error as Error;
        spinner.fail(chalk.red('Installation failed'));
        console.error(chalk.red(err.message));
        process.exit(1);
      }
    });

  // lsh ipfs uninstall
  ipfsCommand
    .command('uninstall')
    .description('Uninstall LSH-managed IPFS client')
    .action(async () => {
      try {
        const manager = new IPFSClientManager();
        await manager.uninstall();
      } catch (error) {
        const err = error as Error;
        console.error(chalk.red('\n❌ Uninstallation failed:'), err.message);
        process.exit(1);
      }
    });

  // lsh ipfs init
  ipfsCommand
    .command('init')
    .description('Initialize IPFS repository')
    .action(async () => {
      const spinner = ora('Initializing IPFS repository...').start();

      try {
        const manager = new IPFSClientManager();
        await manager.init();

        spinner.succeed(chalk.green('IPFS repository initialized!'));
        console.log('');
        console.log(chalk.gray('Next step:'));
        console.log(chalk.cyan('  lsh ipfs start   # Start IPFS daemon'));
        console.log('');
      } catch (error) {
        const err = error as Error;
        spinner.fail(chalk.red('Initialization failed'));
        console.error(chalk.red(err.message));
        process.exit(1);
      }
    });

  // lsh ipfs start
  ipfsCommand
    .command('start')
    .description('Start IPFS daemon')
    .action(async () => {
      try {
        const manager = new IPFSClientManager();
        await manager.start();
      } catch (error) {
        const err = error as Error;
        console.error(chalk.red('\n❌ Failed to start daemon:'), err.message);
        process.exit(1);
      }
    });

  // lsh ipfs stop
  ipfsCommand
    .command('stop')
    .description('Stop IPFS daemon')
    .action(async () => {
      try {
        const manager = new IPFSClientManager();
        await manager.stop();
      } catch (error) {
        const err = error as Error;
        console.error(chalk.red('\n❌ Failed to stop daemon:'), err.message);
        process.exit(1);
      }
    });
}

export default registerIPFSCommands;
