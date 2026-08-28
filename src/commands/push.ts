/**
 * lsh push — encrypt the local .env and publish it.
 */

import { Command } from 'commander';
import { resolveContext } from '../lib/workspace-context.js';
import { IPFSClientManager } from '../lib/ipfs-client-manager.js';
import { extractErrorMessage } from '../lib/lsh-error.js';

export function registerPushCommand(program: Command): void {
  program
    .command('push')
    .description('Encrypt the local .env and push it to cloud storage')
    .option('-f, --file <path>', 'Path to .env file', '.env')
    .option('-e, --env <name>', 'Environment name (dev/staging/prod)', 'dev')
    .option('-g, --global', 'Use global workspace ($HOME)')
    .option('--force', 'Push even if destructive changes are detected')
    .action(async (options) => {
      const { manager, filePath, environment } = resolveContext(options);
      try {
        await new IPFSClientManager().ensureDaemonRunning();
        await manager.push(filePath, environment, options.force);
      } catch (error) {
        console.error('Failed to push secrets:', extractErrorMessage(error));
        process.exitCode = 1;
      } finally {
        await manager.cleanup();
      }
    });
}
