/**
 * LSH Doctor Command
 * Health check and troubleshooting utility
 */

import { Command } from 'commander';
import chalk from 'chalk';
import * as fs from 'fs/promises';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';
import _ora from 'ora';
import { getPlatformPaths, getPlatformInfo } from '../lib/platform-utils.js';
import { IPFSClientManager } from '../lib/ipfs-client-manager.js';
import { getIPFSSync } from '../lib/ipfs-sync.js';
import * as os from 'os';

interface HealthCheck {
  name: string;
  status: 'pass' | 'warn' | 'fail' | 'skip';
  message: string;
  details?: string;
}

/**
 * Register doctor commands
 */
// TODO(@gwicho38): Review - registerDoctorCommands
export function registerDoctorCommands(program: Command): void {
  program
    .command('doctor')
    .description('Health check and troubleshooting')
    .option('-g, --global', 'Use global workspace ($HOME)')
    .option('-v, --verbose', 'Show detailed information')
    .option('--json', 'Output results as JSON')
    .action(async (options) => {
      try {
        await runHealthCheck(options);
      } catch (error) {
        const err = error as Error;
        console.error(chalk.red('\n❌ Health check failed:'), err.message);
        process.exit(1);
      }
    });
}

/**
 * Get the base directory for .env files
 */
// TODO(@gwicho38): Review - getBaseDir
function getBaseDir(globalMode?: boolean): string {
  return globalMode ? os.homedir() : process.cwd();
}

/**
 * Run comprehensive health check
 */
// TODO(@gwicho38): Review - runHealthCheck
async function runHealthCheck(options: { global?: boolean; verbose?: boolean; json?: boolean }): Promise<void> {
  const baseDir = getBaseDir(options.global);

  if (!options.json) {
    if (options.global) {
      console.log(chalk.bold.cyan('\n🏥 LSH Health Check (Global Workspace)'));
      console.log(chalk.yellow(`   Location: ${baseDir}`));
    } else {
      console.log(chalk.bold.cyan('\n🏥 LSH Health Check'));
    }
    console.log(chalk.gray('━'.repeat(50)));
    console.log('');
  }

  const checks: HealthCheck[] = [];

  // Platform check
  checks.push(await checkPlatform(options.verbose));

  // .env file check
  checks.push(await checkEnvFile(options.verbose, baseDir));

  // Encryption key check
  checks.push(await checkEncryptionKey(options.verbose, baseDir));

  // Storage backend check
  const storageChecks = await checkStorageBackend(options.verbose, baseDir);
  checks.push(...storageChecks);

  // Git repository check (skip for global mode)
  if (!options.global) {
    checks.push(await checkGitRepository(options.verbose));
  }

  // IPFS client check
  checks.push(await checkIPFSClient(options.verbose));

  // Permissions check
  checks.push(await checkPermissions(options.verbose, baseDir));

  // Display results
  if (options.json) {
    console.log(JSON.stringify({ checks, summary: getSummary(checks) }, null, 2));
  } else {
    displayResults(checks);
    displayRecommendations(checks);
  }

  // Exit code based on results
  const hasFailed = checks.some(c => c.status === 'fail');
  if (hasFailed) {
    process.exit(1);
  }
}

/**
 * Check platform compatibility
 */
// TODO(@gwicho38): Review - checkPlatform
async function checkPlatform(verbose?: boolean): Promise<HealthCheck> {
  const info = getPlatformInfo();

  const supportedPlatforms = ['win32', 'darwin', 'linux'];
  const isSupported = supportedPlatforms.includes(info.platform);

  return {
    name: 'Platform Compatibility',
    status: isSupported ? 'pass' : 'warn',
    message: isSupported
      ? `${info.platformName} ${info.arch} (${info.release})`
      : `${info.platformName} may not be fully supported`,
    details: verbose ? `Node ${info.nodeVersion}` : undefined,
  };
}

/**
 * Check .env file
 */
// TODO(@gwicho38): Review - checkEnvFile
async function checkEnvFile(verbose?: boolean, baseDir?: string): Promise<HealthCheck> {
  try {
    const envPath = path.join(baseDir || process.cwd(), '.env');
    // Read file directly without access check to avoid TOCTOU race condition
    const content = await fs.readFile(envPath, 'utf-8');
    const lines = content.split('\n').filter(l => l.trim() && !l.startsWith('#'));

    return {
      name: '.env File',
      status: 'pass',
      message: 'Found and readable',
      details: verbose ? `${lines.length} variables configured` : undefined,
    };
  } catch {
    return {
      name: '.env File',
      status: 'fail',
      message: 'Not found',
      details: 'Run "lsh init" to create configuration',
    };
  }
}

/**
 * Check encryption key
 */
// TODO(@gwicho38): Review - checkEncryptionKey
async function checkEncryptionKey(verbose?: boolean, baseDir?: string): Promise<HealthCheck> {
  try {
    const envPath = path.join(baseDir || process.cwd(), '.env');
    const content = await fs.readFile(envPath, 'utf-8');

    const match = content.match(/^LSH_SECRETS_KEY=(.+)$/m);
    if (!match) {
      return {
        name: 'Encryption Key',
        status: 'fail',
        message: 'LSH_SECRETS_KEY not found in .env',
        details: 'Run "lsh key" to generate a key',
      };
    }

    const key = match[1].trim();
    if (key.length < 32) {
      return {
        name: 'Encryption Key',
        status: 'warn',
        message: 'Key is too short (< 32 characters)',
        details: 'Generate a stronger key with "lsh key"',
      };
    }

    // Check if it's a valid hex string
    const isHex = /^[0-9a-fA-F]+$/.test(key);
    const expectedLength = 64; // 32 bytes in hex

    if (isHex && key.length === expectedLength) {
      return {
        name: 'Encryption Key',
        status: 'pass',
        message: 'Valid (AES-256 compatible)',
        details: verbose ? `${key.length} characters (hex)` : undefined,
      };
    }

    return {
      name: 'Encryption Key',
      status: 'pass',
      message: 'Present',
      details: verbose ? `${key.length} characters` : undefined,
    };
  } catch {
    return {
      name: 'Encryption Key',
      status: 'fail',
      message: 'Could not verify',
      details: 'Ensure .env file exists and is readable',
    };
  }
}

/**
 * Check storage backend configuration
 */
// TODO(@gwicho38): Review - checkStorageBackend
async function checkStorageBackend(verbose?: boolean, baseDir?: string): Promise<HealthCheck[]> {
  const checks: HealthCheck[] = [];

  try {
    const envPath = path.join(baseDir || process.cwd(), '.env');
    let content = '';
    try {
      content = await fs.readFile(envPath, 'utf-8');
    } catch {
      // .env may not exist, continue with other checks
    }

    const supabaseUrl = content.match(/^SUPABASE_URL=(.+)$/m)?.[1]?.trim();
    const supabaseKey = content.match(/^SUPABASE_ANON_KEY=(.+)$/m)?.[1]?.trim();
    const databaseUrl = content.match(/^DATABASE_URL=(.+)$/m)?.[1]?.trim();
    const storageMode = content.match(/^LSH_STORAGE_MODE=(.+)$/m)?.[1]?.trim();

    // Check if IPFS daemon is running
    let ipfsRunning = false;
    try {
      const ipfsSync = getIPFSSync();
      ipfsRunning = await ipfsSync.checkDaemon();
    } catch {
      // IPFS not available
    }

    // Determine storage type (priority: explicit mode > Supabase > PostgreSQL > IPFS > none)
    if (storageMode === 'local') {
      checks.push({
        name: 'Storage Backend',
        status: 'pass',
        message: 'Local encryption mode',
        details: ipfsRunning ? 'IPFS available for sync' : 'No cloud sync available',
      });
    } else if (supabaseUrl && supabaseKey) {
      checks.push({
        name: 'Storage Backend',
        status: 'pass',
        message: 'Supabase configured',
      });

      // Test connection
      const connectionCheck = await testSupabaseConnection(supabaseUrl, supabaseKey, verbose);
      checks.push(connectionCheck);
    } else if (databaseUrl) {
      checks.push({
        name: 'Storage Backend',
        status: 'pass',
        message: 'PostgreSQL configured',
        details: verbose ? maskConnectionString(databaseUrl) : undefined,
      });
    } else if (ipfsRunning) {
      checks.push({
        name: 'Storage Backend',
        status: 'pass',
        message: 'Native IPFS sync',
        details: 'Use "lsh sync push" to sync secrets',
      });
    } else {
      checks.push({
        name: 'Storage Backend',
        status: 'warn',
        message: 'No storage backend configured',
        details: 'Run "lsh sync init" to set up IPFS sync',
      });
    }
  } catch {
    checks.push({
      name: 'Storage Backend',
      status: 'fail',
      message: 'Could not verify configuration',
    });
  }

  return checks;
}

/**
 * Test Supabase connection
 */
// TODO(@gwicho38): Review - testSupabaseConnection
async function testSupabaseConnection(
  url: string,
  key: string,
  verbose?: boolean
): Promise<HealthCheck> {
  try {
    const supabase = createClient(url, key);

    // Try to query
    const { error } = await supabase.from('lsh_secrets').select('count').limit(0);

    // No error means table exists and connection works
    if (!error) {
      return {
        name: 'Supabase Connection',
        status: 'pass',
        message: 'Connected successfully',
        details: verbose ? url : undefined,
      };
    }

    // Check if table doesn't exist (PGRST116 or relation not found errors)
    if (error.code === 'PGRST116' || error.message.includes('relation') || error.message.includes('table') || error.message.includes('schema cache')) {
      return {
        name: 'Storage Mode',
        status: 'pass',
        message: 'Using IPFS storage (Supabase table not found)',
        details: 'Secrets: ~/.lsh/secrets-cache/ | Metadata: ~/.lsh/secrets-metadata.json | IPFS audit logs: ~/.lsh/ipfs/',
      };
    }

    // Other connection errors
    return {
      name: 'Supabase Connection',
      status: 'warn',
      message: `Connection warning: ${error.message}`,
    };
  } catch (error) {
    const err = error as Error;
    return {
      name: 'Supabase Connection',
      status: 'fail',
      message: 'Cannot connect',
      details: err.message,
    };
  }
}

/**
 * Check if in git repository
 */
// TODO(@gwicho38): Review - checkGitRepository
async function checkGitRepository(_verbose?: boolean): Promise<HealthCheck> {
  try {
    const gitPath = path.join(process.cwd(), '.git');
    // Use stat instead of access to avoid TOCTOU race condition
    await fs.stat(gitPath);

    // Check .gitignore
    const gitignorePath = path.join(process.cwd(), '.gitignore');
    try {
      const gitignoreContent = await fs.readFile(gitignorePath, 'utf-8');
      const ignoresEnv = gitignoreContent.includes('.env');

      return {
        name: 'Git Repository',
        status: ignoresEnv ? 'pass' : 'warn',
        message: ignoresEnv ? 'Git repository with .env in .gitignore' : 'Git repository found',
        details: !ignoresEnv ? '.env not in .gitignore - secrets may be committed!' : undefined,
      };
    } catch {
      return {
        name: 'Git Repository',
        status: 'warn',
        message: 'Git repository found, no .gitignore',
        details: 'Add .env to .gitignore to prevent committing secrets',
      };
    }
  } catch {
    return {
      name: 'Git Repository',
      status: 'skip',
      message: 'Not in a git repository',
    };
  }
}

/**
 * Check IPFS client installation
 */
// TODO(@gwicho38): Review - checkIPFSClient
async function checkIPFSClient(verbose?: boolean): Promise<HealthCheck> {
  try {
    const manager = new IPFSClientManager();
    const info = await manager.detect();

    if (info.installed) {
      return {
        name: 'IPFS Client',
        status: 'pass',
        message: `${info.type} v${info.version} installed`,
        details: verbose ? `Path: ${info.path}` : undefined,
      };
    }

    return {
      name: 'IPFS Client',
      status: 'warn',
      message: 'Not installed (optional for local storage)',
      details: 'Install with: lsh ipfs install',
    };
  } catch (error) {
    const err = error as Error;
    return {
      name: 'IPFS Client',
      status: 'warn',
      message: 'Could not check IPFS client',
      details: err.message,
    };
  }
}

/**
 * Check file permissions
 */
// TODO(@gwicho38): Review - checkPermissions
async function checkPermissions(verbose?: boolean, _baseDir?: string): Promise<HealthCheck> {
  try {
    const paths = getPlatformPaths();

    // Check if we can write to temp directory with secure permissions
    // Use crypto.randomBytes for secure random filename
    const crypto = await import('crypto');
    const randomSuffix = crypto.randomBytes(8).toString('hex');
    const testFile = path.join(paths.tmpDir, `lsh-test-${randomSuffix}`);

    // Create file with secure permissions (mode 0o600 = rw-------)
    await fs.writeFile(testFile, 'test', { mode: 0o600 });
    await fs.unlink(testFile);

    // Check if we can create config directory
    await fs.mkdir(paths.configDir, { recursive: true });

    return {
      name: 'File Permissions',
      status: 'pass',
      message: 'Can read/write required directories',
      details: verbose ? `tmp: ${paths.tmpDir}, config: ${paths.configDir}` : undefined,
    };
  } catch (error) {
    const err = error as Error;
    return {
      name: 'File Permissions',
      status: 'fail',
      message: 'Permission denied',
      details: err.message,
    };
  }
}

/**
 * Mask sensitive parts of connection string
 */
// TODO(@gwicho38): Review - maskConnectionString
function maskConnectionString(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.password) {
      parsed.password = '***';
    }
    return parsed.toString();
  } catch {
    return url.replace(/:[^:@]+@/, ':***@');
  }
}

/**
 * Get summary statistics
 */
// TODO(@gwicho38): Review - getSummary
function getSummary(checks: HealthCheck[]): {
  total: number;
  passed: number;
  warned: number;
  failed: number;
  skipped: number;
} {
  return {
    total: checks.length,
    passed: checks.filter(c => c.status === 'pass').length,
    warned: checks.filter(c => c.status === 'warn').length,
    failed: checks.filter(c => c.status === 'fail').length,
    skipped: checks.filter(c => c.status === 'skip').length,
  };
}

/**
 * Display results in terminal
 */
// TODO(@gwicho38): Review - displayResults
function displayResults(checks: HealthCheck[]): void {
  for (const check of checks) {
    let icon: string;
    let color: (text: string) => string;

    switch (check.status) {
      case 'pass':
        icon = '✅';
        color = chalk.green;
        break;
      case 'warn':
        icon = '⚠️ ';
        color = chalk.yellow;
        break;
      case 'fail':
        icon = '❌';
        color = chalk.red;
        break;
      case 'skip':
        icon = '⊝ ';
        color = chalk.gray;
        break;
    }

    console.log(icon, color(check.name), '-', check.message);
    if (check.details) {
      console.log(chalk.gray(`   ${check.details}`));
    }
  }

  console.log('');
}

/**
 * Display recommendations
 */
// TODO(@gwicho38): Review - displayRecommendations
function displayRecommendations(checks: HealthCheck[]): void {
  const summary = getSummary(checks);
  const hasIssues = summary.failed > 0 || summary.warned > 0;

  console.log(chalk.gray('━'.repeat(50)));
  console.log('');

  if (!hasIssues) {
    console.log(chalk.bold.green('🎉 All checks passed!'));
    console.log('');
    console.log(chalk.gray('Your LSH installation is healthy and ready to use.'));
  } else {
    console.log(chalk.bold.yellow('💡 Recommendations:'));
    console.log('');

    const failedChecks = checks.filter(c => c.status === 'fail');
    const warnedChecks = checks.filter(c => c.status === 'warn');

    if (failedChecks.length > 0) {
      console.log(chalk.red(`❌ ${failedChecks.length} critical issue(s):`));
      failedChecks.forEach(c => {
        console.log(chalk.gray(`   • ${c.name}: ${c.details || c.message}`));
      });
      console.log('');
    }

    if (warnedChecks.length > 0) {
      console.log(chalk.yellow(`⚠️  ${warnedChecks.length} warning(s):`));
      warnedChecks.forEach(c => {
        console.log(chalk.gray(`   • ${c.name}: ${c.details || c.message}`));
      });
      console.log('');
    }

    // Specific recommendations
    if (checks.some(c => c.name === '.env File' && c.status === 'fail')) {
      console.log(chalk.cyan('👉 Run: lsh init'));
    }

    if (checks.some(c => c.name === 'Supabase Connection' && c.status === 'fail')) {
      console.log(chalk.cyan('👉 Verify Supabase credentials in .env'));
      console.log(chalk.gray('   Check SUPABASE_URL and SUPABASE_ANON_KEY'));
    }

    if (checks.some(c => c.name === 'Git Repository' && c.status === 'warn')) {
      console.log(chalk.cyan('👉 Add .env to .gitignore:'));
      console.log(chalk.gray('   echo ".env" >> .gitignore'));
    }
  }

  console.log('');
  console.log(chalk.gray('Need help? Visit https://github.com/gwicho38/lsh'));
  console.log('');
}

export default registerDoctorCommands;
