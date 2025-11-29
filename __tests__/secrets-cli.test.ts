/**
 * Secrets CLI Commands Tests
 * Tests for the secrets management CLI commands
 *
 * NOTE: Due to ESM module resolution issues with jest.unstable_mockModule,
 * tests that depend on SecretsManager methods (push/pull/sync) are integration tests
 * that test the actual behavior. They use a real SecretsManager but spy on console output.
 */

import { describe, it, expect, jest, beforeEach, afterEach, beforeAll } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { Command } from 'commander';

// Dynamic import for init_secrets
let init_secrets: (program: Command) => Promise<void>;

describe('Secrets CLI Commands', () => {
  let testDir: string;
  let originalCwd: string;
  let consoleLogSpy: jest.SpiedFunction<typeof console.log>;
  let consoleErrorSpy: jest.SpiedFunction<typeof console.error>;
  let processExitSpy: jest.SpiedFunction<typeof process.exit>;

  beforeAll(async () => {
    const module = await import('../src/services/secrets/secrets.js');
    init_secrets = module.init_secrets;
  });

  beforeEach(() => {
    // Create unique temp directory for each test
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lsh-secrets-cli-test-'));
    originalCwd = process.cwd();
    process.chdir(testDir);

    // Spy on console methods
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    processExitSpy = jest.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('process.exit called');
    }) as never);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    processExitSpy.mockRestore();

    try {
      fs.rmSync(testDir, { recursive: true, force: true });
    } catch (_e) {
      // Ignore cleanup errors
    }
  });

  describe('list command', () => {
    it('should list secrets from .env file', async () => {
      // Create test .env file
      fs.writeFileSync(path.join(testDir, '.env'), 'KEY1=value1\nKEY2=value2\n');

      const program = new Command();
      await init_secrets(program);

      // Parse and execute
      await program.parseAsync(['node', 'test', 'list']);

      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('should show keys only with --keys-only flag', async () => {
      fs.writeFileSync(path.join(testDir, '.env'), 'KEY1=value1\nKEY2=value2\n');

      const program = new Command();
      await init_secrets(program);

      await program.parseAsync(['node', 'test', 'list', '--keys-only']);

      // Should show keys but not values
      const calls = consoleLogSpy.mock.calls.flat().join(' ');
      expect(calls).toContain('KEY1');
      expect(calls).toContain('KEY2');
      expect(calls).toContain('Total: 2 keys');
    });

    it('should error if .env file not found', async () => {
      const program = new Command();
      await init_secrets(program);

      await expect(async () => {
        await program.parseAsync(['node', 'test', 'list']);
      }).rejects.toThrow('process.exit called');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('File not found')
      );
    });

    it('should skip comments and empty lines', async () => {
      fs.writeFileSync(path.join(testDir, '.env'), '# Comment\n\nKEY=value\n# Another comment\n');

      const program = new Command();
      await init_secrets(program);

      await program.parseAsync(['node', 'test', 'list', '--keys-only']);

      const calls = consoleLogSpy.mock.calls.flat().join(' ');
      expect(calls).toContain('Total: 1 keys');
    });

    it('should handle quoted values', async () => {
      fs.writeFileSync(path.join(testDir, '.env'), 'KEY1="value with spaces"\nKEY2=\'single quoted\'\n');

      const program = new Command();
      await init_secrets(program);

      await program.parseAsync(['node', 'test', 'list', '--keys-only']);

      const calls = consoleLogSpy.mock.calls.flat().join(' ');
      expect(calls).toContain('Total: 2 keys');
    });
  });

  describe('key command', () => {
    it('should generate a new encryption key', async () => {
      const program = new Command();
      await init_secrets(program);

      await program.parseAsync(['node', 'test', 'key']);

      const calls = consoleLogSpy.mock.calls.flat().join(' ');
      expect(calls).toContain('LSH_SECRETS_KEY');
      expect(calls).toContain('encryption key');
    });

    it('should output export format with --export flag', async () => {
      const program = new Command();
      await init_secrets(program);

      await program.parseAsync(['node', 'test', 'key', '--export']);

      const calls = consoleLogSpy.mock.calls.flat();
      const exportLine = calls.find(c => String(c).startsWith('export LSH_SECRETS_KEY='));
      expect(exportLine).toBeDefined();
    });

    it('should generate a 64-character hex key', async () => {
      const program = new Command();
      await init_secrets(program);

      await program.parseAsync(['node', 'test', 'key', '--export']);

      const calls = consoleLogSpy.mock.calls.flat();
      const exportLine = calls.find(c => String(c).startsWith('export LSH_SECRETS_KEY='));
      expect(exportLine).toBeDefined();

      // Extract the key value
      const match = String(exportLine).match(/export LSH_SECRETS_KEY='([a-f0-9]+)'/);
      expect(match).not.toBeNull();
      expect(match![1]).toHaveLength(64); // 32 bytes = 64 hex chars
    });
  });

  describe('create command', () => {
    it('should create a new .env file', async () => {
      const program = new Command();
      await init_secrets(program);

      await program.parseAsync(['node', 'test', 'create']);

      expect(fs.existsSync(path.join(testDir, '.env'))).toBe(true);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Created .env file')
      );
    });

    it('should create with template when --template flag is used', async () => {
      const program = new Command();
      await init_secrets(program);

      await program.parseAsync(['node', 'test', 'create', '--template']);

      const content = fs.readFileSync(path.join(testDir, '.env'), 'utf8');
      expect(content).toContain('NODE_ENV=');
      expect(content).toContain('DATABASE_URL=');
      expect(content).toContain('API_KEY=');
    });

    it('should error if file already exists', async () => {
      // Create existing file
      fs.writeFileSync(path.join(testDir, '.env'), 'existing=content\n');

      const program = new Command();
      await init_secrets(program);

      await expect(async () => {
        await program.parseAsync(['node', 'test', 'create']);
      }).rejects.toThrow('process.exit called');

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('File already exists')
      );
    });

    it('should create with custom path', async () => {
      const program = new Command();
      await init_secrets(program);

      await program.parseAsync(['node', 'test', 'create', '-f', '.env.custom']);

      expect(fs.existsSync(path.join(testDir, '.env.custom'))).toBe(true);
    });

    it('should create empty file without template', async () => {
      const program = new Command();
      await init_secrets(program);

      await program.parseAsync(['node', 'test', 'create']);

      const content = fs.readFileSync(path.join(testDir, '.env'), 'utf8');
      expect(content).toBe('');
    });
  });

  describe('get command', () => {
    it('should get a specific secret value', async () => {
      fs.writeFileSync(path.join(testDir, '.env'), 'API_KEY=secret123\nDB_URL=postgres://localhost\n');

      const program = new Command();
      await init_secrets(program);

      await program.parseAsync(['node', 'test', 'get', 'API_KEY']);

      const calls = consoleLogSpy.mock.calls.flat();
      expect(calls).toContain('secret123');
    });

    it('should handle quoted values in get', async () => {
      fs.writeFileSync(path.join(testDir, '.env'), 'MESSAGE="Hello World"\n');

      const program = new Command();
      await init_secrets(program);

      await program.parseAsync(['node', 'test', 'get', 'MESSAGE']);

      const calls = consoleLogSpy.mock.calls.flat();
      expect(calls).toContain('Hello World');
    });

    it('should error if key not found with --exact', async () => {
      fs.writeFileSync(path.join(testDir, '.env'), 'API_KEY=secret123\n');

      const program = new Command();
      await init_secrets(program);

      await expect(async () => {
        await program.parseAsync(['node', 'test', 'get', 'NONEXISTENT', '--exact']);
      }).rejects.toThrow('process.exit called');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('not found')
      );
    });

    it('should get all secrets with --all flag', async () => {
      fs.writeFileSync(path.join(testDir, '.env'), 'KEY1=value1\nKEY2=value2\n');

      const program = new Command();
      await init_secrets(program);

      await program.parseAsync(['node', 'test', 'get', '--all']);

      const calls = consoleLogSpy.mock.calls.flat().join('\n');
      expect(calls).toContain('KEY1');
      expect(calls).toContain('KEY2');
    });
  });

  describe('set command', () => {
    it('should set a new secret value', async () => {
      // Create empty .env file first
      fs.writeFileSync(path.join(testDir, '.env'), '');

      const program = new Command();
      await init_secrets(program);

      await program.parseAsync(['node', 'test', 'set', 'NEW_KEY', 'new_value']);

      const content = fs.readFileSync(path.join(testDir, '.env'), 'utf8');
      expect(content).toContain('NEW_KEY=new_value');
    });

    it('should update existing secret value', async () => {
      fs.writeFileSync(path.join(testDir, '.env'), 'EXISTING_KEY=old_value\n');

      const program = new Command();
      await init_secrets(program);

      await program.parseAsync(['node', 'test', 'set', 'EXISTING_KEY', 'new_value']);

      const content = fs.readFileSync(path.join(testDir, '.env'), 'utf8');
      expect(content).toContain('EXISTING_KEY=new_value');
      expect(content).not.toContain('old_value');
    });

    it('should create .env file if it does not exist', async () => {
      const program = new Command();
      await init_secrets(program);

      await program.parseAsync(['node', 'test', 'set', 'NEW_KEY', 'value']);

      expect(fs.existsSync(path.join(testDir, '.env'))).toBe(true);
      const content = fs.readFileSync(path.join(testDir, '.env'), 'utf8');
      expect(content).toContain('NEW_KEY=value');
    });

    it('should quote values with spaces', async () => {
      const program = new Command();
      await init_secrets(program);

      await program.parseAsync(['node', 'test', 'set', 'MESSAGE', 'hello world']);

      const content = fs.readFileSync(path.join(testDir, '.env'), 'utf8');
      expect(content).toContain('MESSAGE="hello world"');
    });
  });

  describe('delete command', () => {
    it('should error if file not found', async () => {
      const program = new Command();
      await init_secrets(program);

      await expect(async () => {
        await program.parseAsync(['node', 'test', 'delete', '-y']);
      }).rejects.toThrow('process.exit called');

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('File not found')
      );
    });
  });

  describe('clear command', () => {
    it('should error if no --repo or --all specified', async () => {
      const program = new Command();
      await init_secrets(program);

      await expect(async () => {
        await program.parseAsync(['node', 'test', 'clear']);
      }).rejects.toThrow('process.exit called');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Please specify either --repo <name> or --all')
      );
    });
  });
});
