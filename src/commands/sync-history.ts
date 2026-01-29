/**
 * Sync History Commands
 * View immutable sync records stored on IPFS
 */

import { Command } from 'commander';
import { IPFSSyncLogger } from '../lib/ipfs-sync-logger.js';
import { getGitRepoInfo } from '../lib/git-utils.js';


export function registerSyncHistoryCommands(program: Command) {
  const syncHistory = program
    .command('sync-history')
    .description('View immutable sync records stored on IPFS');

  // View history for current repo/env
  syncHistory
    .command('show')
    .description('Show sync history for current repository')
    .option('-e, --env <name>', 'Environment name (dev/staging/prod)', 'dev')
    .option('-a, --all', 'Show all records across all repos/envs')
    .option('--url', 'Show IPFS URLs only')
    .action(async (options) => {
      try {
        const logger = new IPFSSyncLogger();

        if (!logger.isEnabled()) {
          console.log('ℹ️  IPFS sync logging is disabled');
          console.log('   Enable with: lsh config delete DISABLE_IPFS_SYNC');
          return;
        }

        const gitInfo = getGitRepoInfo();
        let records;

        if (options.all) {
          records = await logger.getAllRecords();
          console.log('\n📊 All Sync History\n');
        } else {
          records = await logger.getAllRecords(gitInfo.repoName, options.env);
          const repoEnv = gitInfo.repoName ? `${gitInfo.repoName}/${options.env}` : options.env;
          console.log(`\n📊 Sync History for: ${repoEnv}\n`);
        }

        if (records.length === 0) {
          console.log('No sync records found');
          console.log('\n💡 Records are created automatically when you run:');
          console.log('   lsh push, lsh pull, or lsh sync');
          return;
        }

        // Sort by timestamp (newest first)
        records.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        if (options.url) {
          // Show URLs only
          for (const record of records) {
            const cid = `bafkrei${record.key_fingerprint.substring(0, 52)}`;
            console.log(`ipfs://${cid}`);
          }
        } else {
          // Show formatted table
          for (const record of records) {
            const date = new Date(record.timestamp).toLocaleString();
            const env = record.environment;
            const action = record.action.padEnd(6);
            const keys = `${record.keys_count} keys`.padEnd(10);
            const repo = record.git_repo || '(no repo)';

            console.log(`${date}  ${action}  ${keys}  ${repo}/${env}`);
          }

          console.log(`\n📦 Total: ${records.length} records`);
          console.log('🔒 All records are permanently stored on IPFS');
        }

        console.log();
      } catch (error) {
        const err = error as Error;
        console.error('❌ Failed to show history:', err.message);
        process.exit(1);
      }
    });

  // View specific record by CID
  syncHistory
    .command('get <cid>')
    .description('View a specific sync record by IPFS CID')
    .action(async (cid: string) => {
      try {
        const logger = new IPFSSyncLogger();
        const record = await logger.readRecord(cid);

        if (!record) {
          console.error(`❌ Record not found: ${cid}`);
          process.exit(1);
        }

        console.log('\n📄 Sync Record\n');
        console.log(`CID:         ipfs://${cid}`);
        console.log(`Timestamp:   ${new Date(record.timestamp).toLocaleString()}`);
        console.log(`Command:     ${record.command}`);
        console.log(`Action:      ${record.action}`);
        console.log(`Environment: ${record.environment}`);
        console.log(`Keys Count:  ${record.keys_count}`);

        if (record.git_repo) {
          console.log(`\nGit Info:`);
          console.log(`  Repository: ${record.git_repo}`);
          console.log(`  Branch:     ${record.git_branch || 'unknown'}`);
          console.log(`  Commit:     ${record.git_commit || 'unknown'}`);
        }

        console.log(`\nMetadata:`);
        console.log(`  User:       ${record.user}`);
        console.log(`  Machine ID: ${record.machine_id}`);
        console.log(`  LSH Version: ${record.lsh_version}`);
        console.log(`  Key Fingerprint: ${record.key_fingerprint}`);

        console.log();
      } catch (error) {
        const err = error as Error;
        console.error('❌ Failed to read record:', err.message);
        process.exit(1);
      }
    });

  // List sync log entries
  syncHistory
    .command('list')
    .description('List sync log entries (CIDs with timestamps)')
    .option('-e, --env <name>', 'Environment name', 'dev')
    .option('-a, --all', 'Show all entries')
    .action(async (options) => {
      try {
        const logger = new IPFSSyncLogger();
        const gitInfo = getGitRepoInfo();

        let entries;
        if (options.all) {
          entries = logger.getSyncLog();
        } else {
          entries = logger.getSyncLog(gitInfo.repoName, options.env);
        }

        if (entries.length === 0) {
          console.log('No sync log entries found');
          return;
        }

        console.log('\n📋 Sync Log Entries\n');
        for (const entry of entries) {
          const date = new Date(entry.timestamp).toLocaleString();
          const action = entry.action.padEnd(6);
          console.log(`${date}  ${action}  ${entry.cid}`);
        }

        console.log(`\n📦 Total: ${entries.length} entries`);
        console.log();
      } catch (error) {
        const err = error as Error;
        console.error('❌ Failed to list entries:', err.message);
        process.exit(1);
      }
    });

  return syncHistory;
}
