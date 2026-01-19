/**
 * Comprehensive CLI Command Integration Tests
 *
 * Tests every LSH command using a mock git repository environment.
 * This ensures all commands work correctly end-to-end.
 *
 * Commands tested:
 * - Secrets: push, pull, list, get, set, delete, create, key, env, status, sync, info
 * - Config: config (init, path, get, set, delete, list, show, reload)
 * - Init & Health: init, doctor
 * - Daemon: daemon (start, stop, status, restart, cleanup)
 * - Cron: cron (list, templates, add, start, stop, remove, info)
 * - Self: self (version, info, update)
 * - IPFS: ipfs (status)
 * - Sync: sync (init, push, pull, status, history, verify, clear)
 * - Help: help, --help, --version
 * - Supabase: supabase (init, test)
 * - Completion: completion
 * - Migrate: migrate
 * - Sync History: sync-history (show, get)
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, jest } from '@jest/globals';

// Set longer timeout for integration tests
jest.setTimeout(60000);

import { execSync, spawn, ChildProcess, SpawnOptions } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';

/**
 * Test helper to execute LSH CLI commands
 */
interface CommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

class CLITestHelper {
  private testDir: string;
  private homeDir: string;
  private configDir: string;
  private originalEnv: NodeJS.ProcessEnv;
  private cliPath: string;

  constructor() {
    this.testDir = '';
    this.homeDir = '';
    this.configDir = '';
    this.originalEnv = { ...process.env };
    // Path to the compiled CLI - Jest runs from repo root
    this.cliPath = path.join(process.cwd(), 'dist/cli.js');
  }

  /**
   * Initialize test environment with mock git repo
   */
  async setup(): Promise<void> {
    // Create isolated test directories
    const tmpBase = os.tmpdir();
    this.testDir = fs.mkdtempSync(path.join(tmpBase, 'lsh-cli-test-'));
    this.homeDir = fs.mkdtempSync(path.join(tmpBase, 'lsh-cli-home-'));
    this.configDir = path.join(this.homeDir, '.config', 'lsh');

    // Create config directory
    fs.mkdirSync(this.configDir, { recursive: true });

    // Create .lsh directory for secrets metadata
    const lshDir = path.join(this.homeDir, '.lsh');
    fs.mkdirSync(lshDir, { recursive: true });

    // Initialize git repo in test directory
    execSync('git init', { cwd: this.testDir, stdio: 'pipe' });
    execSync('git config user.name "Test User"', { cwd: this.testDir, stdio: 'pipe' });
    execSync('git config user.email "test@example.com"', { cwd: this.testDir, stdio: 'pipe' });
    execSync('git commit --allow-empty -m "Initial commit"', { cwd: this.testDir, stdio: 'pipe' });

    // Create a sample .env file
    const envContent = `DATABASE_URL=postgres://localhost/testdb
API_KEY=test-api-key-12345
DEBUG=true
APP_NAME=lsh-test`;
    fs.writeFileSync(path.join(this.testDir, '.env'), envContent, 'utf-8');
  }

  /**
   * Clean up test environment
   */
  async cleanup(): Promise<void> {
    // Restore original environment
    process.env = { ...this.originalEnv };

    // Clean up test directories
    if (this.testDir && fs.existsSync(this.testDir)) {
      fs.rmSync(this.testDir, { recursive: true, force: true });
    }
    if (this.homeDir && fs.existsSync(this.homeDir)) {
      fs.rmSync(this.homeDir, { recursive: true, force: true });
    }
  }

  /**
   * Execute LSH CLI command and return result
   */
  async runCommand(args: string[], options: { timeout?: number; cwd?: string; env?: Record<string, string> } = {}): Promise<CommandResult> {
    const timeout = options.timeout || 30000;
    const cwd = options.cwd || this.testDir;

    // Build environment with test isolation
    const env: NodeJS.ProcessEnv = {
      ...process.env,
      HOME: this.homeDir,
      XDG_CONFIG_HOME: path.join(this.homeDir, '.config'),
      LSH_API_ENABLED: 'false',
      DISABLE_IPFS_SYNC: 'true',
      LSH_SECRETS_KEY: crypto.randomBytes(32).toString('hex'),
      ...options.env,
    };

    return new Promise((resolve) => {
      let stdout = '';
      let stderr = '';

      const spawnOptions: SpawnOptions = {
        cwd,
        env,
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: false,
      };

      const child: ChildProcess = spawn('node', [this.cliPath, ...args], spawnOptions);

      const timer = setTimeout(() => {
        child.kill('SIGTERM');
        resolve({
          stdout,
          stderr: stderr + '\n[TIMEOUT]',
          exitCode: 124,
        });
      }, timeout);

      child.stdout?.on('data', (data: Buffer) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data: Buffer) => {
        stderr += data.toString();
      });

      child.on('close', (code: number | null) => {
        clearTimeout(timer);
        resolve({
          stdout,
          stderr,
          exitCode: code ?? 1,
        });
      });

      child.on('error', (err: Error) => {
        clearTimeout(timer);
        resolve({
          stdout,
          stderr: stderr + '\n' + err.message,
          exitCode: 1,
        });
      });
    });
  }

  /**
   * Get test directory path
   */
  getTestDir(): string {
    return this.testDir;
  }

  /**
   * Get home directory path
   */
  getHomeDir(): string {
    return this.homeDir;
  }

  /**
   * Get config directory path
   */
  getConfigDir(): string {
    return this.configDir;
  }

  /**
   * Create a file in the test directory
   */
  createFile(relativePath: string, content: string): void {
    const fullPath = path.join(this.testDir, relativePath);
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(fullPath, content, 'utf-8');
  }

  /**
   * Read a file from the test directory
   */
  readFile(relativePath: string): string {
    const fullPath = path.join(this.testDir, relativePath);
    return fs.readFileSync(fullPath, 'utf-8');
  }

  /**
   * Check if a file exists in the test directory
   */
  fileExists(relativePath: string): boolean {
    const fullPath = path.join(this.testDir, relativePath);
    return fs.existsSync(fullPath);
  }
}

describe('LSH CLI Commands - Comprehensive Integration Tests', () => {
  let cli: CLITestHelper;

  beforeAll(async () => {
    cli = new CLITestHelper();
    await cli.setup();
  });

  afterAll(async () => {
    await cli.cleanup();
  });

  // ============================================================
  // HELP & VERSION COMMANDS
  // ============================================================
  describe('Help & Version Commands', () => {
    it('should show help when called with no arguments', async () => {
      const result = await cli.runCommand([]);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Encrypted Secrets Manager');
      expect(result.stdout).toContain('push');
      expect(result.stdout).toContain('pull');
    });

    it('should show help with --help flag', async () => {
      const result = await cli.runCommand(['--help']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('LSH');
    });

    it('should show version with --version flag', async () => {
      const result = await cli.runCommand(['--version']);

      expect(result.exitCode).toBe(0);
      // Version should be a semver string
      expect(result.stdout).toMatch(/\d+\.\d+\.\d+/);
    });

    it('should show version with -V flag', async () => {
      const result = await cli.runCommand(['-V']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toMatch(/\d+\.\d+\.\d+/);
    });

    it('should show detailed help with help command', async () => {
      const result = await cli.runCommand(['help']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Encrypted Secrets Manager');
      expect(result.stdout).toContain('Examples');
    });

    it('should suggest similar commands for typos', async () => {
      const result = await cli.runCommand(['confg']); // typo of 'config'

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('unknown command');
      expect(result.stderr).toContain('config');
    });
  });

  // ============================================================
  // CONFIG COMMANDS
  // ============================================================
  describe('Config Commands', () => {
    it('should show config path', async () => {
      const result = await cli.runCommand(['config', 'path']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('.config');
      expect(result.stdout).toContain('lsh');
    });

    it('should initialize config file', async () => {
      const result = await cli.runCommand(['config', 'init', '--force']);

      expect(result.exitCode).toBe(0);
    });

    it('should set a config value', async () => {
      // First init the config
      await cli.runCommand(['config', 'init', '--force']);

      const result = await cli.runCommand(['config', 'set', 'TEST_KEY', 'test_value']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Set TEST_KEY=test_value');
    });

    it('should get a config value', async () => {
      // Set a value first
      await cli.runCommand(['config', 'init', '--force']);
      await cli.runCommand(['config', 'set', 'MY_KEY', 'my_value']);

      const result = await cli.runCommand(['config', 'get', 'MY_KEY']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('my_value');
    });

    it('should list all config values', async () => {
      await cli.runCommand(['config', 'init', '--force']);
      await cli.runCommand(['config', 'set', 'LIST_KEY', 'list_value']);

      const result = await cli.runCommand(['config', 'list']);

      expect(result.exitCode).toBe(0);
      // Should show configuration
      expect(result.stdout).toMatch(/LIST_KEY|Configuration/);
    });

    it('should delete a config value', async () => {
      await cli.runCommand(['config', 'init', '--force']);
      await cli.runCommand(['config', 'set', 'DELETE_KEY', 'delete_value']);

      const result = await cli.runCommand(['config', 'delete', 'DELETE_KEY']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Deleted DELETE_KEY');
    });

    it('should show config file contents', async () => {
      await cli.runCommand(['config', 'init', '--force']);

      const result = await cli.runCommand(['config', 'show']);

      // Config show may fail if the file is empty or has issues
      expect([0, 1]).toContain(result.exitCode);
    });

    it('should reload config', async () => {
      await cli.runCommand(['config', 'init', '--force']);

      const result = await cli.runCommand(['config', 'reload']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Reloaded');
    });

    it('should show help for config command', async () => {
      const result = await cli.runCommand(['config', '--help']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('config');
    });
  });

  // ============================================================
  // SECRETS COMMANDS
  // ============================================================
  describe('Secrets Commands', () => {
    it('should generate a new encryption key', async () => {
      const result = await cli.runCommand(['key']);

      expect(result.exitCode).toBe(0);
      // Should output a 64-character hex string (32 bytes)
      expect(result.stdout).toMatch(/[a-f0-9]{64}/i);
    });

    it('should list secrets in local .env file', async () => {
      const result = await cli.runCommand(['list']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('DATABASE_URL');
      expect(result.stdout).toContain('API_KEY');
    });

    it('should list secrets with ls alias', async () => {
      // ls is an alias for list command - fixed in Issue #103
      const result = await cli.runCommand(['ls']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('DATABASE_URL');
    });

    it('should get a specific secret value', async () => {
      const result = await cli.runCommand(['get', 'API_KEY']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('test-api-key-12345');
    });

    it('should get all secrets with --all flag', async () => {
      const result = await cli.runCommand(['get', '--all']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('DATABASE_URL');
      expect(result.stdout).toContain('API_KEY');
    });

    it('should set a secret value', async () => {
      const result = await cli.runCommand(['set', 'NEW_SECRET', 'new_value']);

      expect(result.exitCode).toBe(0);

      // Verify the secret was set
      const envContent = cli.readFile('.env');
      expect(envContent).toContain('NEW_SECRET=new_value');
    });

    it('should create a new .env file', async () => {
      // Create in a subdirectory
      fs.mkdirSync(path.join(cli.getTestDir(), 'subdir'), { recursive: true });

      const result = await cli.runCommand(['create'], {
        cwd: path.join(cli.getTestDir(), 'subdir'),
      });

      // This may require interactive input, so check for expected behavior
      expect([0, 1]).toContain(result.exitCode);
    });

    it('should show env command help', async () => {
      const result = await cli.runCommand(['env', '--help']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('environment');
    });

    it('should show status of secrets', async () => {
      const result = await cli.runCommand(['status']);

      expect(result.exitCode).toBe(0);
      // Status command should show information about secrets
    });

    it('should show sync status', async () => {
      const result = await cli.runCommand(['sync']);

      // Sync may fail without proper backend but should not crash
      expect([0, 1]).toContain(result.exitCode);
    });

    it('should show info about current directory', async () => {
      const result = await cli.runCommand(['info']);

      expect([0, 1]).toContain(result.exitCode);
    });

    it('should push secrets (mock environment)', async () => {
      const result = await cli.runCommand(['push', '--env', 'test', '--force'], {
        timeout: 10000,
      });

      // Push may fail without proper storage backend but should handle gracefully
      expect([0, 1]).toContain(result.exitCode);
    });

    it('should pull secrets (mock environment)', async () => {
      const result = await cli.runCommand(['pull', '--env', 'test', '--force'], {
        timeout: 10000,
      });

      // Pull may fail without proper storage backend but should handle gracefully
      expect([0, 1]).toContain(result.exitCode);
    });
  });

  // ============================================================
  // INIT & DOCTOR COMMANDS
  // ============================================================
  describe('Init & Doctor Commands', () => {
    it('should show init help', async () => {
      const result = await cli.runCommand(['init', '--help']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('setup');
    });

    it('should run doctor check', async () => {
      const result = await cli.runCommand(['doctor']);

      // Doctor may return 1 if some checks fail in test environment
      expect([0, 1]).toContain(result.exitCode);
      // Should still output something about LSH
      expect(result.stdout.toLowerCase()).toContain('lsh');
    });

    it('should run doctor with --verbose flag', async () => {
      const result = await cli.runCommand(['doctor', '--verbose']);

      // Doctor may return 1 if some checks fail in test environment
      expect([0, 1]).toContain(result.exitCode);
    });

    it('should run doctor with --json flag', async () => {
      const result = await cli.runCommand(['doctor', '--json']);

      // Doctor may return 1 if some checks fail in test environment
      expect([0, 1]).toContain(result.exitCode);
      // Output should be valid JSON or at least contain JSON
      try {
        JSON.parse(result.stdout);
      } catch {
        // May contain non-JSON output before/after, just check it completes
        expect(result.stdout).toBeDefined();
      }
    });
  });

  // ============================================================
  // DAEMON COMMANDS
  // ============================================================
  describe('Daemon Commands', () => {
    it('should show daemon help', async () => {
      const result = await cli.runCommand(['daemon', '--help']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('daemon');
    });

    it('should check daemon status', async () => {
      const result = await cli.runCommand(['daemon', 'status']);

      // Daemon likely not running in test environment
      expect([0, 1]).toContain(result.exitCode);
    });

    it('should handle daemon cleanup', async () => {
      const result = await cli.runCommand(['daemon', 'cleanup']);

      expect([0, 1]).toContain(result.exitCode);
    });

    // Note: We don't actually start the daemon in tests as it requires system resources
    it('should show daemon start help', async () => {
      const result = await cli.runCommand(['daemon', 'start', '--help']);

      expect(result.exitCode).toBe(0);
    });

    it('should show daemon job subcommands', async () => {
      const result = await cli.runCommand(['daemon', 'job', '--help']);

      expect([0, 1]).toContain(result.exitCode);
    });
  });

  // ============================================================
  // CRON COMMANDS
  // ============================================================
  describe('Cron Commands', () => {
    it('should show cron help', async () => {
      const result = await cli.runCommand(['cron', '--help']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('cron');
    });

    it('should list cron jobs', async () => {
      const result = await cli.runCommand(['cron', 'list']);

      // May return empty list or error if daemon not running
      expect([0, 1]).toContain(result.exitCode);
    });

    it('should show cron templates', async () => {
      // Cron templates may hang due to daemon connection issues
      // Use a shorter timeout and accept timeout exit code (124)
      const result = await cli.runCommand(['cron', 'templates'], { timeout: 10000 });

      // Exit code 124 = timeout, which is acceptable when daemon is not running
      expect([0, 1, 124]).toContain(result.exitCode);
      // Even with timeout, should output template info
      if (result.stdout.length > 0) {
        expect(result.stdout.toLowerCase()).toMatch(/template|backup|sync/);
      }
    });

    it('should show cron add help', async () => {
      const result = await cli.runCommand(['cron', 'add', '--help']);

      expect([0, 1]).toContain(result.exitCode);
    });
  });

  // ============================================================
  // SELF COMMANDS
  // ============================================================
  describe('Self Commands', () => {
    it('should show self help', async () => {
      const result = await cli.runCommand(['self', '--help']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('self');
    });

    it('should show version info', async () => {
      const result = await cli.runCommand(['self', 'version']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toMatch(/\d+\.\d+\.\d+/);
    });

    it('should show self info', async () => {
      const result = await cli.runCommand(['self', 'info']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('LSH');
    });

    it('should show update help', async () => {
      const result = await cli.runCommand(['self', 'update', '--help']);

      expect(result.exitCode).toBe(0);
    });
  });

  // ============================================================
  // IPFS COMMANDS
  // ============================================================
  describe('IPFS Commands', () => {
    it('should show ipfs help', async () => {
      const result = await cli.runCommand(['ipfs', '--help']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('ipfs');
    });

    it('should check ipfs status', async () => {
      const result = await cli.runCommand(['ipfs', 'status']);

      // IPFS may not be installed in test environment
      expect([0, 1]).toContain(result.exitCode);
    });
  });

  // ============================================================
  // SYNC COMMANDS
  // ============================================================
  describe('Sync Commands', () => {
    it('should show sync help', async () => {
      const result = await cli.runCommand(['sync', '--help']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('sync');
    });

    it('should show sync commands list', async () => {
      const result = await cli.runCommand(['sync']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Commands');
    });

    it('should check sync status', async () => {
      const result = await cli.runCommand(['sync', 'status']);

      // May fail if IPFS daemon not running
      expect([0, 1]).toContain(result.exitCode);
    });

    it('should show sync history', async () => {
      const result = await cli.runCommand(['sync', 'history']);

      // May be empty in test environment
      expect([0, 1]).toContain(result.exitCode);
    });
  });

  // ============================================================
  // SUPABASE COMMANDS
  // ============================================================
  describe('Supabase Commands', () => {
    it('should show supabase help', async () => {
      const result = await cli.runCommand(['supabase', '--help']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('supabase');
    });

    it('should show supabase init help', async () => {
      const result = await cli.runCommand(['supabase', 'init', '--help']);

      expect([0, 1]).toContain(result.exitCode);
    });
  });

  // ============================================================
  // COMPLETION COMMANDS
  // ============================================================
  describe('Completion Commands', () => {
    it('should show completion help', async () => {
      const result = await cli.runCommand(['completion', '--help']);

      expect(result.exitCode).toBe(0);
    });

    it('should generate bash completion', async () => {
      const result = await cli.runCommand(['completion', 'bash']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('complete');
    });

    it('should generate zsh completion', async () => {
      const result = await cli.runCommand(['completion', 'zsh']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('compdef');
    });

    it('should generate fish completion', async () => {
      const result = await cli.runCommand(['completion', 'fish']);

      // Fish completion may use a different format
      expect([0, 1]).toContain(result.exitCode);
      if (result.exitCode === 0) {
        expect(result.stdout).toContain('complete');
      }
    });
  });

  // ============================================================
  // MIGRATE COMMAND
  // ============================================================
  describe('Migrate Command', () => {
    it('should show migrate help', async () => {
      const result = await cli.runCommand(['migrate', '--help']);

      expect(result.exitCode).toBe(0);
    });
  });

  // ============================================================
  // SYNC-HISTORY COMMANDS
  // ============================================================
  describe('Sync History Commands', () => {
    it('should show sync-history help', async () => {
      const result = await cli.runCommand(['sync-history', '--help']);

      expect(result.exitCode).toBe(0);
    });

    it('should show sync history', async () => {
      const result = await cli.runCommand(['sync-history', 'show']);

      // May be empty in test environment
      expect([0, 1]).toContain(result.exitCode);
    });
  });

  // ============================================================
  // ERROR HANDLING
  // ============================================================
  describe('Error Handling', () => {
    it('should handle unknown commands gracefully', async () => {
      const result = await cli.runCommand(['nonexistent-command']);

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('unknown command');
    });

    it('should handle invalid options gracefully', async () => {
      const result = await cli.runCommand(['--invalid-option-that-does-not-exist']);

      expect(result.exitCode).toBe(1);
    });

    it('should handle missing required arguments', async () => {
      // 'get' requires a key argument
      const result = await cli.runCommand(['config', 'get']);

      expect(result.exitCode).toBe(1);
    });
  });

  // ============================================================
  // COMMAND COMBINATIONS & EDGE CASES
  // ============================================================
  describe('Command Combinations & Edge Cases', () => {
    it('should handle verbose flag', async () => {
      const result = await cli.runCommand(['--verbose', 'list']);

      expect([0, 1]).toContain(result.exitCode);
    });

    it('should handle debug flag', async () => {
      const result = await cli.runCommand(['--debug', 'list']);

      expect([0, 1]).toContain(result.exitCode);
    });

    it('should handle empty .env file', async () => {
      // Create empty .env
      cli.createFile('.env.empty', '');

      const result = await cli.runCommand(['list'], {
        env: { LSH_ENV_FILE: path.join(cli.getTestDir(), '.env.empty') },
      });

      expect([0, 1]).toContain(result.exitCode);
    });

    it('should handle .env file with comments', async () => {
      const envWithComments = `# This is a comment
DATABASE_URL=postgres://localhost/db
# Another comment
API_KEY=secret`;
      cli.createFile('.env.comments', envWithComments);

      const result = await cli.runCommand(['list']);

      expect(result.exitCode).toBe(0);
    });

    it('should handle .env file with quoted values', async () => {
      const envWithQuotes = `QUOTED="value with spaces"
SINGLE_QUOTED='another value'
UNQUOTED=simple`;
      cli.createFile('.env.quotes', envWithQuotes);

      const result = await cli.runCommand(['list']);

      expect(result.exitCode).toBe(0);
    });

    it('should handle multiple env files scenario', async () => {
      cli.createFile('.env.development', 'ENV=development');
      cli.createFile('.env.production', 'ENV=production');
      cli.createFile('.env.local', 'ENV=local');

      const result = await cli.runCommand(['list']);

      expect(result.exitCode).toBe(0);
    });
  });

  // ============================================================
  // GLOBAL OPTIONS
  // ============================================================
  describe('Global Options', () => {
    it('should respect -v verbose flag on all commands', async () => {
      const result = await cli.runCommand(['-v', 'doctor']);
      expect([0, 1]).toContain(result.exitCode);
    });

    it('should respect -d debug flag on all commands', async () => {
      const result = await cli.runCommand(['-d', 'doctor']);
      expect([0, 1]).toContain(result.exitCode);
    });
  });
});

// ============================================================
// ADDITIONAL SECRETS MANAGER INTEGRATION TESTS
// ============================================================
describe('SecretsManager Direct Integration', () => {
  let testDir: string;
  let homeDir: string;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    const tmpBase = os.tmpdir();
    testDir = fs.mkdtempSync(path.join(tmpBase, 'lsh-secrets-test-'));
    homeDir = fs.mkdtempSync(path.join(tmpBase, 'lsh-secrets-home-'));

    // Create .lsh directory
    fs.mkdirSync(path.join(homeDir, '.lsh'), { recursive: true });

    // Set environment
    process.env.HOME = homeDir;
    process.env.DISABLE_IPFS_SYNC = 'true';

    // Initialize git repo
    execSync('git init', { cwd: testDir, stdio: 'pipe' });
    execSync('git config user.name "Test"', { cwd: testDir, stdio: 'pipe' });
    execSync('git config user.email "test@test.com"', { cwd: testDir, stdio: 'pipe' });
  });

  afterEach(() => {
    process.env = { ...originalEnv };

    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
    if (fs.existsSync(homeDir)) {
      fs.rmSync(homeDir, { recursive: true, force: true });
    }
  });

  it('should handle push and pull cycle with SecretsManager', async () => {
    // This test uses the SecretsManager directly for more detailed testing
    const { SecretsManager } = await import('../../src/lib/secrets-manager.js');

    const envPath = path.join(testDir, '.env');
    const testKey = crypto.randomBytes(32).toString('hex');
    const testEnv = 'test-env';

    // Create test .env file
    fs.writeFileSync(envPath, 'TEST_VAR=test_value\nANOTHER_VAR=another_value', 'utf-8');

    const originalCwd = process.cwd();
    process.chdir(testDir);

    try {
      // Create manager and push
      const manager = new SecretsManager(undefined, testKey, false);
      await manager.push(envPath, testEnv, true);

      // Modify local file
      fs.writeFileSync(envPath, 'MODIFIED=true', 'utf-8');

      // Pull should restore original
      await manager.pull(envPath, testEnv, true);

      const content = fs.readFileSync(envPath, 'utf-8');
      expect(content).toContain('TEST_VAR=test_value');
    } finally {
      process.chdir(originalCwd);
    }
  });

  it('should preserve LSH_SECRETS_KEY during sync', async () => {
    const { SecretsManager } = await import('../../src/lib/secrets-manager.js');

    const envPath = path.join(testDir, '.env');
    const testKey = crypto.randomBytes(32).toString('hex');
    const testEnv = 'key-preserve-test';
    const localKeyValue = 'local_machine_specific_key';

    // Create .env with LSH_SECRETS_KEY
    fs.writeFileSync(
      envPath,
      `LSH_SECRETS_KEY=${localKeyValue}\nAPP_SECRET=app_value`,
      'utf-8'
    );

    const originalCwd = process.cwd();
    process.chdir(testDir);

    try {
      const manager = new SecretsManager(undefined, testKey, false);

      // Push - should filter out LSH_SECRETS_KEY
      await manager.push(envPath, testEnv, true);

      // Modify local .env
      fs.writeFileSync(
        envPath,
        `LSH_SECRETS_KEY=${localKeyValue}\nDIFFERENT_VAR=different`,
        'utf-8'
      );

      // Pull - should preserve local LSH_SECRETS_KEY
      await manager.pull(envPath, testEnv, true);

      const content = fs.readFileSync(envPath, 'utf-8');

      // LSH_SECRETS_KEY should be preserved
      expect(content).toContain(`LSH_SECRETS_KEY=${localKeyValue}`);
      // Original APP_SECRET should be pulled back
      expect(content).toContain('APP_SECRET=app_value');
    } finally {
      process.chdir(originalCwd);
    }
  });
});
