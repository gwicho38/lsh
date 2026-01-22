/**
 * Migration Command - Help users migrate from v1.x to v2.0
 */

import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { homedir } from 'os';
import { getGitRepoInfo } from '../lib/git-utils.js';

// TODO(@gwicho38): Review - registerMigrateCommand

// TODO(@gwicho38): Review - registerMigrateCommand
export function registerMigrateCommand(program: Command) {
  program
    .command('migrate')
    .description('Migrate from v1.x to v2.0 environment naming')
    .option('--dry-run', 'Show what would be migrated without doing it')
    .option('--v1-compat', 'Enable v1.x compatibility mode')
    .action(async (options) => {
      if (options.v1Compat) {
        console.log('\n🔄 Enabling v1.x Compatibility Mode\n');
        console.log('Add this to your shell profile (~/.bashrc or ~/.zshrc):');
        console.log('');
        console.log('  export LSH_V1_COMPAT=true');
        console.log('');
        console.log('This will keep v1.x behavior (repo_dev naming).');
        console.log('');
        return;
      }

      console.log('\n🔄 LSH v2.0 Migration Guide\n');
      console.log('━'.repeat(60));
      console.log('');

      // Check if in git repo
      const gitInfo = getGitRepoInfo(process.cwd());

      if (!gitInfo?.isGitRepo) {
        console.log('ℹ️  Not in a git repository');
        console.log('');
        console.log('v2.0 only affects git repositories.');
        console.log('Outside git repos, behavior is unchanged (default: dev)');
        console.log('');
        return;
      }

      console.log('📁 Current Repository:', gitInfo.repoName);
      console.log('🌿 Branch:', gitInfo.currentBranch);
      console.log('');

      console.log('📊 Environment Naming Changes:\n');
      console.log('  v1.x Behavior:');
      console.log(`    lsh push              → ${gitInfo.repoName}_dev`);
      console.log(`    lsh push --env dev    → ${gitInfo.repoName}_dev`);
      console.log(`    lsh push --env staging → ${gitInfo.repoName}_staging`);
      console.log('');
      console.log('  v2.0 Behavior:');
      console.log(`    lsh push              → ${gitInfo.repoName} (simpler!)`);
      console.log(`    lsh push --env dev    → ${gitInfo.repoName}_dev`);
      console.log(`    lsh push --env staging → ${gitInfo.repoName}_staging`);
      console.log('');

      // Check for existing v1.x cache
      const cacheDir = path.join(homedir(), '.lsh', 'secrets-cache');
      const repoName = gitInfo.repoName || 'unknown';
      const v1EnvName = `${repoName}_dev`;
      const v2EnvName = repoName;

      let hasV1Data = false;
      let hasV2Data = false;

      if (fs.existsSync(cacheDir)) {
        const files = fs.readdirSync(cacheDir);
        hasV1Data = files.some(f => f.includes(v1EnvName));
        hasV2Data = files.some(f => f.includes(v2EnvName) && !f.includes(`${v2EnvName}_`));
      }

      console.log('💾 Your Current Data:\n');
      if (hasV1Data) {
        console.log(`  ✅ v1.x data found: ${v1EnvName}`);
      }
      if (hasV2Data) {
        console.log(`  ✅ v2.0 data found: ${v2EnvName}`);
      }
      if (!hasV1Data && !hasV2Data) {
        console.log('  ℹ️  No local cache found (fresh start)');
      }
      console.log('');

      console.log('🔧 Migration Steps:\n');

      if (hasV1Data && !hasV2Data) {
        console.log('  You have v1.x data. To migrate:\n');
        console.log('  1. Push with explicit environment name:');
        console.log(`     lsh push --env dev     # Keeps v1.x format (${v1EnvName})`);
        console.log('');
        console.log('  2. Or start using v2.0 format:');
        console.log(`     lsh push               # New v2.0 format (${v2EnvName})`);
        console.log('');
        console.log('  💡 Both formats can coexist. Use --env dev to access old data.');
      } else if (hasV2Data) {
        console.log('  ✅ You\'re already using v2.0 format!');
        console.log('');
        console.log(`  Continue using: lsh push    # → ${v2EnvName}`);
      } else {
        console.log('  ✅ Fresh start - you\'re ready for v2.0!');
        console.log('');
        console.log(`  Start using: lsh push    # → ${v2EnvName}`);
      }

      console.log('');
      console.log('━'.repeat(60));
      console.log('');
      console.log('📚 For more information:');
      console.log('   https://github.com/gwicho38/lsh/blob/main/docs/releases/2.0.0.md');
      console.log('');
      console.log('💡 Tip: Use --v1-compat flag to keep v1.x behavior');
      console.log('');
    });
}
