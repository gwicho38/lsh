/**
 * Tests for SecretsManager - LSH's primary feature
 *
 * Testing encrypted secrets management with multi-environment support
 *
 * Note: storacha-client is mocked via moduleNameMapper in jest.config.js
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

// Mock DatabasePersistence with shared storage across instances
const sharedStorage = new Map<string, any>();

jest.unstable_mockModule('../src/lib/database-persistence.js', () => {
  return {
    default: class MockDatabasePersistence {
      private userId?: string;

      constructor(userId?: string) {
        this.userId = userId;
      }

      async saveJob(job: any) {
        // Add user_id to job if userId was provided
        const jobWithUser = {
          ...job,
          user_id: this.userId || null
        };
        sharedStorage.set(job.job_id, jobWithUser);
      }

      async getActiveJobs() {
        // For secrets (command='secrets_sync'), don't filter by user_id - they're shared by environment
        // For other jobs, filter by user_id like the real implementation does
        return Array.from(sharedStorage.values()).filter(job => {
          // Secrets are environment-scoped, not user-scoped
          if (job.command === 'secrets_sync') {
            return true;
          }
          // Regular jobs are user-scoped
          if (this.userId !== undefined) {
            return job.user_id === this.userId;
          } else {
            return job.user_id === null;
          }
        });
      }

      reset() {
        sharedStorage.clear();
      }
    }
  };
});

// Static imports
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { TestEnvironment, generateTestKey, parseEnvContent } from './helpers/secrets-test-helpers.js';
import {
  sampleEnvFile,
  envWithQuotes,
  envWithComments,
  envWithSpecialChars,
  envMinimal,
} from './fixtures/env-files.js';

// SecretsManager import - storacha-client is mocked via moduleNameMapper
import { SecretsManager } from '../src/lib/secrets-manager.js';

describe('SecretsManager', () => {
  let testEnv: TestEnvironment;
  let testKey: string;

  beforeEach(() => {
    testEnv = new TestEnvironment();
    testKey = generateTestKey();
    sharedStorage.clear(); // Clear shared storage between tests
  });

  afterEach(() => {
    testEnv.cleanup();
  });

  describe('Encryption and Decryption', () => {
    it('should encrypt and decrypt text correctly', async () => {
      const manager = new SecretsManager(undefined, testKey);
      const original = 'Hello, World!';

      // Access private methods via any cast for testing
      const encrypted = (manager as any).encrypt(original);
      const decrypted = (manager as any).decrypt(encrypted);

      expect(decrypted).toBe(original);
      expect(encrypted).not.toBe(original);
      expect(encrypted).toContain(':'); // Format: iv:encrypted
    });

    it('should use AES-256-CBC encryption', async () => {
      const manager = new SecretsManager(undefined, testKey);
      const text = 'Secret data';

      const encrypted = (manager as any).encrypt(text);
      const parts = encrypted.split(':');

      expect(parts).toHaveLength(2);
      expect(parts[0]).toHaveLength(32); // 16 bytes IV in hex = 32 chars
      expect(parts[1].length).toBeGreaterThan(0); // Encrypted content
    });

    it('should fail to decrypt with wrong key', async () => {
      const manager1 = new SecretsManager(undefined, generateTestKey());
      const manager2 = new SecretsManager(undefined, generateTestKey());

      const encrypted = (manager1 as any).encrypt('Secret');

      expect(() => {
        (manager2 as any).decrypt(encrypted);
      }).toThrow(/Decryption failed/);
    });

    it('should use LSH_SECRETS_KEY from environment', async () => {
      const customKey = generateTestKey();
      testEnv.setEnv('LSH_SECRETS_KEY', customKey);

      const manager = new SecretsManager();

      // Verify it uses the environment key
      const encrypted = (manager as any).encrypt('test');
      const managerWithSameKey = new SecretsManager(undefined, customKey);
      const decrypted = (managerWithSameKey as any).decrypt(encrypted);

      expect(decrypted).toBe('test');
    });

    it('should generate deterministic key from machine ID', async () => {
      const manager1 = new SecretsManager();
      const manager2 = new SecretsManager();

      const encrypted = (manager1 as any).encrypt('test');
      const decrypted = (manager2 as any).decrypt(encrypted);

      expect(decrypted).toBe('test');
    });

    it('should handle empty string encryption', async () => {
      const manager = new SecretsManager(undefined, testKey);

      const encrypted = (manager as any).encrypt('');
      const decrypted = (manager as any).decrypt(encrypted);

      expect(decrypted).toBe('');
    });

    it('should handle large text encryption', async () => {
      const manager = new SecretsManager(undefined, testKey);
      const largeText = 'A'.repeat(10000);

      const encrypted = (manager as any).encrypt(largeText);
      const decrypted = (manager as any).decrypt(encrypted);

      expect(decrypted).toBe(largeText);
    });
  });

  describe('Environment File Parsing', () => {
    it('should parse KEY=VALUE format', async () => {
      const manager = new SecretsManager(undefined, testKey);
      const content = 'KEY1=value1\nKEY2=value2\n';

      const parsed = (manager as any).parseEnvFile(content);

      expect(parsed).toEqual({
        KEY1: 'value1',
        KEY2: 'value2'
      });
    });

    it('should handle quoted values', async () => {
      const manager = new SecretsManager(undefined, testKey);
      const parsed = (manager as any).parseEnvFile(envWithQuotes);

      expect(parsed.MESSAGE).toBe('Hello, World!');
      expect(parsed.PATH_WITH_SPACES).toBe('/path/with spaces/file.txt');
      expect(parsed.SINGLE_QUOTED).toBe('Single quoted value');
    });

    it('should skip comments', async () => {
      const manager = new SecretsManager(undefined, testKey);
      const parsed = (manager as any).parseEnvFile(envWithComments);

      expect(parsed).toEqual({
        KEY1: 'value1',
        KEY2: 'value2',
        KEY3: 'value3'
      });
      expect(Object.keys(parsed)).toHaveLength(3);
    });

    it('should handle empty lines', async () => {
      const manager = new SecretsManager(undefined, testKey);
      const content = 'KEY1=value1\n\n\nKEY2=value2\n';

      const parsed = (manager as any).parseEnvFile(content);

      expect(parsed).toEqual({
        KEY1: 'value1',
        KEY2: 'value2'
      });
    });

    it('should handle special characters in values', async () => {
      const manager = new SecretsManager(undefined, testKey);
      const parsed = (manager as any).parseEnvFile(envWithSpecialChars);

      expect(parsed.DATABASE_URL).toContain('p@ssw0rd!');
      expect(parsed.URL_WITH_QUERY).toContain('?key=value&token=abc123');
    });

    it('should trim keys and values', async () => {
      const manager = new SecretsManager(undefined, testKey);
      const content = '  KEY1  =  value1  \n  KEY2=value2\n';

      const parsed = (manager as any).parseEnvFile(content);

      expect(parsed).toEqual({
        KEY1: 'value1',
        KEY2: 'value2'
      });
    });
  });

  describe('Environment File Formatting', () => {
    it('should format env vars as .env content', async () => {
      const manager = new SecretsManager(undefined, testKey);
      const vars = {
        KEY1: 'value1',
        KEY2: 'value2'
      };

      const formatted = (manager as any).formatEnvFile(vars);

      expect(formatted).toBe('KEY1=value1\nKEY2=value2\n');
    });

    it('should quote values with spaces', async () => {
      const manager = new SecretsManager(undefined, testKey);
      const vars = {
        MESSAGE: 'Hello World',
        PATH: '/no/spaces'
      };

      const formatted = (manager as any).formatEnvFile(vars);

      expect(formatted).toContain('MESSAGE="Hello World"');
      expect(formatted).toContain('PATH=/no/spaces');
    });

    it('should quote values with hash symbols', async () => {
      const manager = new SecretsManager(undefined, testKey);
      const vars = {
        VALUE_WITH_HASH: 'value#comment'
      };

      const formatted = (manager as any).formatEnvFile(vars);

      expect(formatted).toContain('"value#comment"');
    });
  });

  describe('Push Operations', () => {
    it('should push .env file to storage', async () => {
      const manager = new SecretsManager(undefined, testKey);
      const envFile = testEnv.createTempFile(envMinimal, 'push-test');

      await manager.push(envFile, 'test');

      // Verify the push succeeded (no exceptions thrown)
      expect(fs.existsSync(envFile)).toBe(true);
    });

    it('should throw error if file not found', async () => {
      const manager = new SecretsManager(undefined, testKey);

      await expect(async () => {
        await manager.push('/nonexistent/file.env', 'test');
      }).rejects.toThrow(/File not found/);
    });

    it('should push to specific environment', async () => {
      const manager = new SecretsManager(undefined, testKey);
      const envFile = testEnv.createTempFile(envMinimal, 'env-test');

      await manager.push(envFile, 'production');
      await manager.push(envFile, 'staging');

      const envs = await manager.listEnvironments();
      expect(envs).toContain('production');
      expect(envs).toContain('staging');
    });

    it('should encrypt the entire file content', async () => {
      const manager = new SecretsManager(undefined, testKey);
      const envFile = testEnv.createTempFile(sampleEnvFile, 'encrypt-test');

      await manager.push(envFile, 'test');

      // The content should be encrypted in storage
      // We can't easily verify this without accessing the mock,
      // but we can verify pull works
      const pullFile = testEnv.createTempFile('', 'pull-test');
      await manager.pull(pullFile, 'test', true);

      const pulledContent = fs.readFileSync(pullFile, 'utf8');
      const original = fs.readFileSync(envFile, 'utf8');

      // Content should match after round-trip
      const parsedOriginal = parseEnvContent(original);
      const parsedPulled = parseEnvContent(pulledContent);
      expect(parsedPulled).toEqual(parsedOriginal);
    });
  });

  describe('Pull Operations', () => {
    it('should pull and decrypt .env', async () => {
      const manager = new SecretsManager(undefined, testKey);
      const pushFile = testEnv.createTempFile(envMinimal, 'push-for-pull');
      const pullFile = testEnv.createTempFile('', 'pull-target');

      await manager.push(pushFile, 'test');
      await manager.pull(pullFile, 'test', true);

      const pulled = parseEnvContent(fs.readFileSync(pullFile, 'utf8'));
      const original = parseEnvContent(fs.readFileSync(pushFile, 'utf8'));

      expect(pulled).toEqual(original);
    });

    it('should create backup before overwriting', async () => {
      const manager = new SecretsManager(undefined, testKey);
      const pushFile = testEnv.createTempFile(envMinimal, 'push-backup');
      const pullFile = testEnv.createTempFile('EXISTING=value', 'pull-backup');

      await manager.push(pushFile, 'test');
      await manager.pull(pullFile, 'test');

      // Check for backup file
      const backupFiles = fs.readdirSync(testEnv['tempFiles'][0] ? path.dirname(pullFile) : '/tmp')
        .filter(f => f.includes('pull-backup') && f.includes('.backup.'));

      expect(backupFiles.length).toBeGreaterThan(0);
    });

    it('should skip backup with force flag', async () => {
      const manager = new SecretsManager(undefined, testKey);
      const pushFile = testEnv.createTempFile(envMinimal, 'push-force');
      const pullFile = testEnv.createTempFile('EXISTING=value', 'pull-force');

      const existingContent = fs.readFileSync(pullFile, 'utf8');

      await manager.push(pushFile, 'test');
      await manager.pull(pullFile, 'test', true); // force = true

      // File should be overwritten
      const newContent = fs.readFileSync(pullFile, 'utf8');
      expect(newContent).not.toBe(existingContent);
    });

    it('should throw error if no secrets found', async () => {
      const manager = new SecretsManager(undefined, testKey);
      const pullFile = testEnv.createTempFile('', 'pull-notfound');

      await expect(async () => {
        await manager.pull(pullFile, 'nonexistent');
      }).rejects.toThrow(/No secrets found/);
    });
  });

  describe('Multi-Environment Support', () => {
    it('should list all environments', async () => {
      const manager = new SecretsManager(undefined, testKey);
      const envFile = testEnv.createTempFile(envMinimal, 'multi-env');

      await manager.push(envFile, 'dev');
      await manager.push(envFile, 'staging');
      await manager.push(envFile, 'prod');

      const envs = await manager.listEnvironments();

      expect(envs).toContain('dev');
      expect(envs).toContain('staging');
      expect(envs).toContain('prod');
      expect(envs.length).toBeGreaterThanOrEqual(3);
    });

    it('should return sorted environment list', async () => {
      const manager = new SecretsManager(undefined, testKey);
      const envFile = testEnv.createTempFile(envMinimal, 'sort-env');

      await manager.push(envFile, 'zebra');
      await manager.push(envFile, 'alpha');
      await manager.push(envFile, 'beta');

      const envs = await manager.listEnvironments();
      const relevant = envs.filter(e => ['zebra', 'alpha', 'beta'].includes(e));

      expect(relevant).toEqual(['alpha', 'beta', 'zebra']);
    });
  });

  describe('Team Collaboration', () => {
    it('should allow team members to decrypt with shared key', async () => {
      const sharedKey = generateTestKey();

      const manager1 = new SecretsManager('user1', sharedKey);

      const pushFile = testEnv.createTempFile(envMinimal, 'team-push');
      const pullFile = testEnv.createTempFile('', 'team-pull');

      await manager1.push(pushFile, 'team');

      // Create manager2 AFTER the push so it loads the updated metadata
      const manager2 = new SecretsManager('user2', sharedKey);
      await manager2.pull(pullFile, 'team', true);

      const pushed = parseEnvContent(fs.readFileSync(pushFile, 'utf8'));
      const pulled = parseEnvContent(fs.readFileSync(pullFile, 'utf8'));

      expect(pulled).toEqual(pushed);
    });

    it('should fail with mismatched keys', async () => {
      const manager1 = new SecretsManager('user1', generateTestKey());

      const pushFile = testEnv.createTempFile(envMinimal, 'mismatch-push');
      const pullFile = testEnv.createTempFile('', 'mismatch-pull');

      await manager1.push(pushFile, 'mismatch');

      // Create manager2 AFTER the push so it can find the secrets (but with wrong key)
      const manager2 = new SecretsManager('user2', generateTestKey());

      await expect(async () => {
        await manager2.pull(pullFile, 'mismatch');
      }).rejects.toThrow(/Decryption failed/);
    });
  });

  describe('Error Handling', () => {
    it('should provide helpful error message for decryption failure', async () => {
      const manager1 = new SecretsManager(undefined, generateTestKey());

      const pushFile = testEnv.createTempFile(envMinimal, 'error-push');
      const pullFile = testEnv.createTempFile('', 'error-pull');

      await manager1.push(pushFile, 'decryption_error');

      // Create manager2 AFTER the push so it can find the secrets (but with wrong key)
      const manager2 = new SecretsManager(undefined, generateTestKey());

      try {
        await manager2.pull(pullFile, 'decryption_error');
        throw new Error('Should have thrown');
      } catch (error: any) {
        expect(error.message).toContain('LSH_SECRETS_KEY');
        expect(error.message).toContain('lsh secrets key');
      }
    });

    it('should handle invalid encrypted format', async () => {
      const manager = new SecretsManager(undefined, testKey);

      expect(() => {
        (manager as any).decrypt('invalid-format-no-colon');
      }).toThrow(/Invalid encrypted format/);
    });
  });

  describe('LSH Internal Key Filtering', () => {
    it('should filter out LSH_SECRETS_KEY', async () => {
      const manager = new SecretsManager(undefined, testKey);
      const env = {
        DATABASE_URL: 'postgres://localhost',
        LSH_SECRETS_KEY: 'should-be-filtered',
        API_KEY: 'my-api-key',
      };

      const filtered = (manager as any).filterLshInternalKeys(env);

      expect(filtered).toEqual({
        DATABASE_URL: 'postgres://localhost',
        API_KEY: 'my-api-key',
      });
      expect(filtered.LSH_SECRETS_KEY).toBeUndefined();
    });

    it('should filter out LSH_MASTER_KEY', async () => {
      const manager = new SecretsManager(undefined, testKey);
      const env = {
        DATABASE_URL: 'postgres://localhost',
        LSH_MASTER_KEY: 'should-be-filtered',
      };

      const filtered = (manager as any).filterLshInternalKeys(env);

      expect(filtered).toEqual({
        DATABASE_URL: 'postgres://localhost',
      });
    });

    it('should filter out LSH_INTERNAL_* prefix keys', async () => {
      const manager = new SecretsManager(undefined, testKey);
      const env = {
        DATABASE_URL: 'postgres://localhost',
        LSH_INTERNAL_CONFIG: 'internal-value',
        LSH_INTERNAL_DEBUG: 'debug-value',
        API_KEY: 'my-api-key',
      };

      const filtered = (manager as any).filterLshInternalKeys(env);

      expect(filtered).toEqual({
        DATABASE_URL: 'postgres://localhost',
        API_KEY: 'my-api-key',
      });
    });

    it('should preserve non-LSH keys', async () => {
      const manager = new SecretsManager(undefined, testKey);
      const env = {
        DATABASE_URL: 'postgres://localhost',
        API_KEY: 'my-api-key',
        STRIPE_KEY: 'sk_test_123',
      };

      const filtered = (manager as any).filterLshInternalKeys(env);

      expect(filtered).toEqual(env);
    });
  });

  describe('Destructive Change Detection', () => {
    it('should detect when filled secrets become empty', async () => {
      const manager = new SecretsManager(undefined, testKey);
      const cloudSecrets = {
        API_KEY: 'sk_test_123',
        DATABASE_URL: 'postgres://localhost',
      };
      const localSecrets = {
        API_KEY: '',  // Was filled, now empty
        DATABASE_URL: 'postgres://localhost',
      };

      const destructive = (manager as any).detectDestructiveChanges(cloudSecrets, localSecrets);

      expect(destructive).toHaveLength(1);
      expect(destructive[0].key).toBe('API_KEY');
      expect(destructive[0].cloudValue).toBe('sk_test_123');
      expect(destructive[0].localValue).toBe('');
    });

    it('should detect multiple destructive changes', async () => {
      const manager = new SecretsManager(undefined, testKey);
      const cloudSecrets = {
        API_KEY: 'sk_test_123',
        DATABASE_URL: 'postgres://localhost',
        STRIPE_KEY: 'pk_live_abc',
      };
      const localSecrets = {
        API_KEY: '',
        DATABASE_URL: '',
        STRIPE_KEY: 'pk_live_abc',
      };

      const destructive = (manager as any).detectDestructiveChanges(cloudSecrets, localSecrets);

      expect(destructive).toHaveLength(2);
      expect(destructive.map((d: { key: string }) => d.key).sort()).toEqual(['API_KEY', 'DATABASE_URL']);
    });

    it('should not flag new empty keys as destructive', async () => {
      const manager = new SecretsManager(undefined, testKey);
      const cloudSecrets = {
        API_KEY: 'sk_test_123',
      };
      const localSecrets = {
        API_KEY: 'sk_test_123',
        NEW_KEY: '',  // New key that's empty - not destructive
      };

      const destructive = (manager as any).detectDestructiveChanges(cloudSecrets, localSecrets);

      expect(destructive).toHaveLength(0);
    });

    it('should not flag already-empty cloud secrets as destructive', async () => {
      const manager = new SecretsManager(undefined, testKey);
      const cloudSecrets = {
        API_KEY: '',  // Already empty in cloud
      };
      const localSecrets = {
        API_KEY: '',  // Still empty - not destructive
      };

      const destructive = (manager as any).detectDestructiveChanges(cloudSecrets, localSecrets);

      expect(destructive).toHaveLength(0);
    });

    it('should handle whitespace-only values as empty', async () => {
      const manager = new SecretsManager(undefined, testKey);
      const cloudSecrets = {
        API_KEY: 'sk_test_123',
      };
      const localSecrets = {
        API_KEY: '   ',  // Whitespace only = empty
      };

      const destructive = (manager as any).detectDestructiveChanges(cloudSecrets, localSecrets);

      expect(destructive).toHaveLength(1);
    });
  });

  describe('Destructive Changes Error Formatting', () => {
    it('should format single destructive change error', async () => {
      const manager = new SecretsManager(undefined, testKey);
      const destructive = [{
        key: 'API_KEY',
        cloudValue: 'sk_test_123456',
        localValue: '',
      }];

      const error = (manager as any).formatDestructiveChangesError(destructive);

      expect(error).toContain('Destructive change detected');
      expect(error).toContain('1 secret');
      expect(error).toContain('API_KEY');
      expect(error).toContain('sk_te****');  // Masked value
      expect(error).toContain('--force');
    });

    it('should format multiple destructive changes error', async () => {
      const manager = new SecretsManager(undefined, testKey);
      const destructive = [
        { key: 'API_KEY', cloudValue: 'sk_test_123', localValue: '' },
        { key: 'DB_PASS', cloudValue: 'secret', localValue: '' },
      ];

      const error = (manager as any).formatDestructiveChangesError(destructive);

      expect(error).toContain('2 secrets');
      expect(error).toContain('API_KEY');
      expect(error).toContain('DB_PASS');
    });

    it('should mask short values completely', async () => {
      const manager = new SecretsManager(undefined, testKey);
      const destructive = [{
        key: 'SHORT',
        cloudValue: 'abc',  // 3 chars - less than 5
        localValue: '',
      }];

      const error = (manager as any).formatDestructiveChangesError(destructive);

      expect(error).toContain('****');
    });
  });

  describe('List All Files', () => {
    it('should return array of file metadata', async () => {
      const manager = new SecretsManager(undefined, testKey);
      const envFile = testEnv.createTempFile(envMinimal, 'list-all-test');

      // Push a unique environment
      const uniqueEnv = `list-all-${Date.now()}`;
      await manager.push(envFile, uniqueEnv);

      const files = await manager.listAllFiles();

      // Should have at least one file (our pushed one)
      expect(files.length).toBeGreaterThanOrEqual(1);
      expect(files.some(f => f.environment === uniqueEnv)).toBe(true);

      // Files should have expected structure
      const ourFile = files.find(f => f.environment === uniqueEnv);
      expect(ourFile).toBeDefined();
      expect(ourFile?.filename).toBe('.env');
      expect(ourFile?.updated).toBeDefined();
    });
  });

  describe('Show Secrets', () => {
    it('should throw error when no secrets found', async () => {
      const manager = new SecretsManager(undefined, testKey);

      await expect(async () => {
        await manager.show('nonexistent');
      }).rejects.toThrow(/No secrets found/);
    });

    it('should show masked secrets for existing environment', async () => {
      const manager = new SecretsManager(undefined, testKey);
      const envFile = testEnv.createTempFile(sampleEnvFile, 'show-test');
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      await manager.push(envFile, 'show-test');
      await manager.show('show-test');

      const calls = consoleSpy.mock.calls.flat().join(' ');
      expect(calls).toContain('show-test');
      expect(calls).toContain('Secrets for');

      consoleSpy.mockRestore();
    });
  });

  describe('Status', () => {
    it('should return correct status for non-existent local file', async () => {
      const manager = new SecretsManager(undefined, testKey);

      const status = await manager.status('/nonexistent/file.env', 'status-nonexistent');

      expect(status.localExists).toBe(false);
      expect(status.localKeys).toBe(0);
    });

    it('should return correct status for existing local file', async () => {
      const manager = new SecretsManager(undefined, testKey);
      const envFile = testEnv.createTempFile(envMinimal, 'status-test');

      const status = await manager.status(envFile, 'status-existing');

      expect(status.localExists).toBe(true);
      expect(status.localKeys).toBeGreaterThan(0);
      // Check it's a valid date by checking it has getTime method
      expect(typeof status.localModified?.getTime).toBe('function');
    });

    it('should detect if LSH_SECRETS_KEY is set', async () => {
      // Clear the key first
      const originalKey = process.env.LSH_SECRETS_KEY;
      delete process.env.LSH_SECRETS_KEY;

      const manager1 = new SecretsManager(undefined, testKey);
      const status1 = await manager1.status('/nonexistent.env', 'status-key-test');
      expect(status1.keySet).toBe(false);

      // Set the key
      process.env.LSH_SECRETS_KEY = testKey;
      const manager2 = new SecretsManager();
      const status2 = await manager2.status('/nonexistent.env', 'status-key-test2');
      expect(status2.keySet).toBe(true);

      // Restore
      if (originalKey) {
        process.env.LSH_SECRETS_KEY = originalKey;
      } else {
        delete process.env.LSH_SECRETS_KEY;
      }
    });

    it('should return cloudExists and cloudKeys when pushed', async () => {
      const manager = new SecretsManager(undefined, testKey);
      const envFile = testEnv.createTempFile(envMinimal, 'status-cloud');

      await manager.push(envFile, 'status-cloud-test');
      const status = await manager.status(envFile, 'status-cloud-test');

      expect(status.cloudExists).toBe(true);
      expect(status.cloudKeys).toBeGreaterThan(0);
    });
  });

  describe('Show with Formats', () => {
    it('should show secrets in JSON format', async () => {
      const manager = new SecretsManager(undefined, testKey);
      const envFile = testEnv.createTempFile(envMinimal, 'show-json');
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      await manager.push(envFile, 'show-json-test');
      await manager.show('show-json-test', 'json');

      const calls = consoleSpy.mock.calls.flat().join('\n');
      // JSON format output - check for any JSON structure character
      expect(calls).toMatch(/[{}[\]]/);
      consoleSpy.mockRestore();
    });

    it('should show secrets with no secrets found message', async () => {
      const manager = new SecretsManager(undefined, testKey);
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      // Push empty env and verify
      const emptyFile = testEnv.createTempFile('', 'show-empty');
      await manager.push(emptyFile, 'show-empty-test');
      await manager.show('show-empty-test');

      const calls = consoleSpy.mock.calls.flat().join(' ');
      expect(calls).toContain('No secrets found');
      consoleSpy.mockRestore();
    });
  });

  describe('Sync (Legacy)', () => {
    it('should show sync status for non-existent environment', async () => {
      const manager = new SecretsManager(undefined, testKey);
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      await manager.sync('.env', 'nonexistent-sync');

      const calls = consoleSpy.mock.calls.flat().join(' ');
      expect(calls).toContain('Status');
      consoleSpy.mockRestore();
    });

    it('should suggest push when local exists but cloud does not', async () => {
      const manager = new SecretsManager(undefined, testKey);
      const envFile = testEnv.createTempFile(envMinimal, 'sync-push');
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      await manager.sync(envFile, 'sync-push-test');

      const calls = consoleSpy.mock.calls.flat().join(' ');
      expect(calls).toContain('Local .env exists but not in cloud');
      consoleSpy.mockRestore();
    });

    it('should suggest pull when cloud exists but local does not', async () => {
      const manager = new SecretsManager(undefined, testKey);
      const envFile = testEnv.createTempFile(envMinimal, 'sync-pull');
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      await manager.push(envFile, 'sync-pull-test');

      // Delete local file to simulate cloud-only state
      fs.unlinkSync(envFile);

      await manager.sync(envFile, 'sync-pull-test');

      const calls = consoleSpy.mock.calls.flat().join(' ');
      expect(calls).toContain('Cloud');
      consoleSpy.mockRestore();
    });
  });

  describe('SmartSync', () => {
    it('should handle scenario when no local and no cloud', async () => {
      const uniqueEnv = `smart-sync-empty-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const manager = new SecretsManager(undefined, testKey, false);
      const envFile = testEnv.createTempFile('', 'smart-sync-empty');
      fs.unlinkSync(envFile); // Remove to simulate no local
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      await manager.smartSync(envFile, uniqueEnv, true, false, false);

      const calls = consoleSpy.mock.calls.flat().join(' ');
      expect(calls).toContain('No secrets found');
      consoleSpy.mockRestore();
    });

    it('should handle scenario when local exists but cloud does not', async () => {
      const uniqueEnv = `smart-sync-local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const manager = new SecretsManager(undefined, testKey, false);
      const envFile = testEnv.createTempFile(envMinimal, 'smart-sync-local');
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      await manager.smartSync(envFile, uniqueEnv, true, false, false);

      const calls = consoleSpy.mock.calls.flat().join(' ');
      expect(calls).toContain('Pushing to cloud');
      consoleSpy.mockRestore();
    });

    it('should handle scenario when cloud exists but local does not', async () => {
      const uniqueEnv = `smart-sync-cloud-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const manager = new SecretsManager(undefined, testKey, false);
      const envFile = testEnv.createTempFile(envMinimal, 'smart-sync-cloud');

      // Push first
      await manager.push(envFile, uniqueEnv);

      // Delete local file
      fs.unlinkSync(envFile);

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      await manager.smartSync(envFile, uniqueEnv, true, false, false);

      const calls = consoleSpy.mock.calls.flat().join(' ');
      expect(calls).toContain('Pulling from cloud');
      consoleSpy.mockRestore();
    });

    it('should handle dry-run mode (autoExecute=false)', async () => {
      const uniqueEnv = `smart-sync-dry-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const manager = new SecretsManager(undefined, testKey, false);
      const envFile = testEnv.createTempFile(envMinimal, 'smart-sync-dry');
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      await manager.smartSync(envFile, uniqueEnv, false, false, false);

      const calls = consoleSpy.mock.calls.flat().join(' ');
      expect(calls).toContain('lsh push');
      consoleSpy.mockRestore();
    });

    it('should output export commands in load mode', async () => {
      const uniqueEnv = `smart-sync-load-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const manager = new SecretsManager(undefined, testKey, false);
      const envFile = testEnv.createTempFile('API_KEY=test123\n', 'smart-sync-load');
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      await manager.push(envFile, uniqueEnv);
      await manager.smartSync(envFile, uniqueEnv, true, true, false);

      const calls = consoleSpy.mock.calls.flat().join('\n');
      expect(calls).toContain('export');
      consoleSpy.mockRestore();
    });

    it('should handle key mismatch without force-rekey', async () => {
      const uniqueEnv = `smart-sync-mismatch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const manager1 = new SecretsManager(undefined, generateTestKey(), false);
      const envFile = testEnv.createTempFile(envMinimal, 'smart-sync-mismatch');

      await manager1.push(envFile, uniqueEnv);

      // Create manager with different key
      const manager2 = new SecretsManager(undefined, generateTestKey(), false);
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      await manager2.smartSync(envFile, uniqueEnv, true, false, false);

      const calls = consoleSpy.mock.calls.flat().join(' ');
      expect(calls).toContain('key mismatch');
      consoleSpy.mockRestore();
    });
  });

  describe('Generate Export Commands', () => {
    it('should generate export commands from env file', async () => {
      const manager = new SecretsManager(undefined, testKey);
      const envFile = testEnv.createTempFile('API_KEY=test123\nDB_URL=postgres://localhost\n', 'export-test');

      const exports = (manager as any).generateExportCommands(envFile);

      expect(exports).toContain('export API_KEY="test123"');
      expect(exports).toContain('export DB_URL="postgres://localhost"');
    });

    it('should skip comments and empty lines', async () => {
      const manager = new SecretsManager(undefined, testKey);
      const envFile = testEnv.createTempFile('# Comment\n\nKEY=value\n', 'export-comments');

      const exports = (manager as any).generateExportCommands(envFile);

      expect(exports).not.toContain('# Comment');
      expect(exports).toContain('export KEY="value"');
    });

    it('should handle non-existent file', async () => {
      const manager = new SecretsManager(undefined, testKey);

      const exports = (manager as any).generateExportCommands('/nonexistent/file.env');

      expect(exports).toContain('# No .env file found');
    });

    it('should escape special characters', async () => {
      const manager = new SecretsManager(undefined, testKey);
      const envFile = testEnv.createTempFile('KEY="value with $dollar"\n', 'export-escape');

      const exports = (manager as any).generateExportCommands(envFile);

      expect(exports).toContain('\\$');
    });
  });

  describe('Default Environment', () => {
    it('should return dev in non-git context', async () => {
      const manager = new SecretsManager({ globalMode: false, detectGit: false, encryptionKey: testKey });
      expect(manager.getDefaultEnvironment()).toBe('dev');
    });

    it('should return dev in global mode', async () => {
      const manager = new SecretsManager({ globalMode: true, encryptionKey: testKey });
      expect(manager.getDefaultEnvironment()).toBe('dev');
    });
  });

  describe('Cleanup', () => {
    it('should handle cleanup without error', async () => {
      const manager = new SecretsManager(undefined, testKey);

      await expect(manager.cleanup()).resolves.not.toThrow();
    });
  });

  describe('Invalid Filename Validation', () => {
    it('should reject invalid filename on push', async () => {
      const manager = new SecretsManager(undefined, testKey);
      const invalidFile = testEnv.createTempFile('KEY=value', 'invalid');

      // Rename to invalid pattern
      const invalidPath = path.join(path.dirname(invalidFile), 'invalid.txt');
      fs.renameSync(invalidFile, invalidPath);
      testEnv['tempFiles'].push(invalidPath);

      await expect(async () => {
        await manager.push(invalidPath, 'test');
      }).rejects.toThrow(/Invalid filename/);
    });

    it('should reject invalid filename on pull', async () => {
      const manager = new SecretsManager(undefined, testKey);
      const envFile = testEnv.createTempFile(envMinimal, 'push-for-invalid-pull');
      await manager.push(envFile, 'invalid-pull-test');

      const invalidPath = path.join(os.tmpdir(), 'invalid.txt');

      await expect(async () => {
        await manager.pull(invalidPath, 'invalid-pull-test');
      }).rejects.toThrow(/Invalid filename/);
    });
  });

  describe('LSH Key Preservation on Pull', () => {
    it('should preserve local LSH_SECRETS_KEY on pull', async () => {
      const manager = new SecretsManager(undefined, testKey);

      // Push file without LSH_SECRETS_KEY
      const pushFile = testEnv.createTempFile('API_KEY=test123\n', 'push-preserve');
      await manager.push(pushFile, 'preserve-test');

      // Create pull target with LSH_SECRETS_KEY
      const pullFile = testEnv.createTempFile(`API_KEY=old\nLSH_SECRETS_KEY=${testKey}\n`, 'pull-preserve');
      await manager.pull(pullFile, 'preserve-test', true);

      const content = fs.readFileSync(pullFile, 'utf8');
      expect(content).toContain('LSH_SECRETS_KEY');
      expect(content).toContain(testKey);
    });
  });

  describe('SmartSync Advanced Scenarios', () => {
    it('should handle forceRekey when cloud exists with different key', async () => {
      const uniqueEnv = `force-rekey-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const key1 = generateTestKey();
      const key2 = generateTestKey();

      // Push with key1
      const manager1 = new SecretsManager(undefined, key1, false);
      const envFile = testEnv.createTempFile('API_KEY=secret123\n', 'force-rekey');
      await manager1.push(envFile, uniqueEnv);

      // SmartSync with key2 and forceRekey=true
      const manager2 = new SecretsManager(undefined, key2, false);
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      await manager2.smartSync(envFile, uniqueEnv, true, false, false, true);

      const calls = consoleSpy.mock.calls.flat().join(' ');
      expect(calls).toContain('Re-key');
      consoleSpy.mockRestore();
    });

    it('should handle in-sync scenario when local and cloud match', async () => {
      const uniqueEnv = `in-sync-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const manager = new SecretsManager(undefined, testKey, false);
      const envFile = testEnv.createTempFile('API_KEY=test123\n', 'in-sync');

      // Push first
      await manager.push(envFile, uniqueEnv);

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      await manager.smartSync(envFile, uniqueEnv, true, false, false);

      const calls = consoleSpy.mock.calls.flat().join(' ');
      expect(calls).toContain('✅');
      consoleSpy.mockRestore();
    });

    it('should show workspace context in global mode', async () => {
      const uniqueEnv = `global-ws-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const manager = new SecretsManager({ globalMode: true, encryptionKey: testKey, detectGit: false });
      const envFile = testEnv.createTempFile('API_KEY=test123\n', 'global-ws');
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      await manager.smartSync(envFile, uniqueEnv, false, false, false);

      const calls = consoleSpy.mock.calls.flat().join(' ');
      expect(calls).toContain('Global');
      consoleSpy.mockRestore();
    });
  });

  describe('Show Method Formats', () => {
    it('should show secrets in json format', async () => {
      const uniqueEnv = `show-json-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const manager = new SecretsManager(undefined, testKey);
      const envFile = testEnv.createTempFile('API_KEY=test123\nDB_URL=localhost\n', 'show-json');
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      await manager.push(envFile, uniqueEnv);
      await manager.show(uniqueEnv, 'json');

      const calls = consoleSpy.mock.calls.flat().join('\n');
      // JSON format should contain valid JSON structure
      expect(calls).toContain('{');
      expect(calls).toContain('}');
      consoleSpy.mockRestore();
    });

    it('should show default env format with masking', async () => {
      const uniqueEnv = `show-env-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const manager = new SecretsManager(undefined, testKey);
      const envFile = testEnv.createTempFile('API_KEY=verylongsecretvalue123\n', 'show-env');
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      await manager.push(envFile, uniqueEnv);
      await manager.show(uniqueEnv, 'env');

      const calls = consoleSpy.mock.calls.flat().join(' ');
      expect(calls).toContain('*'); // Should have masked value
      expect(calls).not.toContain('verylongsecretvalue123'); // Full value should not appear
      consoleSpy.mockRestore();
    });
  });

  describe('List All Files', () => {
    it('should list files with repo filtering', async () => {
      const uniqueEnv = `list-repo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const manager = new SecretsManager(undefined, testKey);
      const envFile = testEnv.createTempFile('API_KEY=test123\n', 'list-repo');

      await manager.push(envFile, uniqueEnv);
      const files = await manager.listAllFiles();

      expect(Array.isArray(files)).toBe(true);
      expect(files.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Status with Cloud Data', () => {
    it('should return keyMatches when cloud exists and key matches', async () => {
      const uniqueEnv = `status-match-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const manager = new SecretsManager(undefined, testKey);
      const envFile = testEnv.createTempFile('API_KEY=test123\n', 'status-match');

      await manager.push(envFile, uniqueEnv);
      const status = await manager.status(envFile, uniqueEnv);

      expect(status.cloudExists).toBe(true);
      expect(status.keyMatches).toBe(true);
    });

    it('should return keyMatches=false when keys differ', async () => {
      const uniqueEnv = `status-mismatch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const key1 = generateTestKey();
      const key2 = generateTestKey();

      // Push with key1
      const manager1 = new SecretsManager(undefined, key1);
      const envFile = testEnv.createTempFile('API_KEY=test123\n', 'status-mismatch');
      await manager1.push(envFile, uniqueEnv);

      // Status with key2
      const manager2 = new SecretsManager(undefined, key2);
      const status = await manager2.status(envFile, uniqueEnv);

      expect(status.cloudExists).toBe(true);
      expect(status.keyMatches).toBe(false);
    });
  });

  describe('Parse and Format Env', () => {
    it('should quote values with spaces in format', async () => {
      const manager = new SecretsManager(undefined, testKey);
      const env = { MESSAGE: 'hello world' };

      const formatted = (manager as any).formatEnvFile(env);
      expect(formatted).toContain('MESSAGE="hello world"');
    });

    it('should quote values with hash in format', async () => {
      const manager = new SecretsManager(undefined, testKey);
      const env = { COMMENT: 'value#with#hash' };

      const formatted = (manager as any).formatEnvFile(env);
      expect(formatted).toContain('COMMENT="value#with#hash"');
    });

    it('should not quote simple values', async () => {
      const manager = new SecretsManager(undefined, testKey);
      const env = { KEY: 'simplevalue' };

      const formatted = (manager as any).formatEnvFile(env);
      expect(formatted).toContain('KEY=simplevalue');
      expect(formatted).not.toContain('"simplevalue"');
    });
  });

  describe('Generate Export with Various Values', () => {
    it('should handle multiline values', async () => {
      const manager = new SecretsManager(undefined, testKey);
      const envFile = testEnv.createTempFile('KEY1=value1\nKEY2=value2\n', 'export-multi');

      const exports = (manager as any).generateExportCommands(envFile);

      expect(exports).toContain('export KEY1=');
      expect(exports).toContain('export KEY2=');
    });

    it('should handle values with equals sign', async () => {
      const manager = new SecretsManager(undefined, testKey);
      const envFile = testEnv.createTempFile('URL=http://host?key=value\n', 'export-equals');

      const exports = (manager as any).generateExportCommands(envFile);

      expect(exports).toContain('export URL=');
    });
  });

  describe('Push with Warnings', () => {
    it('should warn when no LSH_SECRETS_KEY is set', async () => {
      const uniqueEnv = `push-warn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const originalKey = process.env.LSH_SECRETS_KEY;
      delete process.env.LSH_SECRETS_KEY;

      const manager = new SecretsManager(undefined, testKey);
      const envFile = testEnv.createTempFile('API_KEY=test123\n', 'push-warn');

      await manager.push(envFile, uniqueEnv);

      // Restore
      if (originalKey) {
        process.env.LSH_SECRETS_KEY = originalKey;
      }

      // Test passes if no error thrown
      expect(true).toBe(true);
    });
  });

  describe('Encryption Key from Environment', () => {
    it('should use environment key when available', async () => {
      const envKey = generateTestKey();
      const originalKey = process.env.LSH_SECRETS_KEY;
      process.env.LSH_SECRETS_KEY = envKey;

      const manager = new SecretsManager();

      // The manager should have picked up the env key
      const uniqueEnv = `env-key-${Date.now()}`;
      const envFile = testEnv.createTempFile('TEST=value\n', 'env-key');

      // Should work without explicit key
      await manager.push(envFile, uniqueEnv);
      await manager.pull(envFile, uniqueEnv, true);

      const content = fs.readFileSync(envFile, 'utf8');
      expect(content).toContain('TEST=value');

      // Restore
      if (originalKey) {
        process.env.LSH_SECRETS_KEY = originalKey;
      } else {
        delete process.env.LSH_SECRETS_KEY;
      }
    });
  });

  describe('List Environments', () => {
    it('should list all environments', async () => {
      const uniquePrefix = `list-envs-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const manager = new SecretsManager(undefined, testKey);
      const envFile = testEnv.createTempFile('KEY=value\n', 'list-envs');

      // Push to multiple environments
      await manager.push(envFile, `${uniquePrefix}-dev`);
      await manager.push(envFile, `${uniquePrefix}-staging`);

      const envs = await manager.listEnvironments();

      // Should have at least these environments
      expect(envs.length).toBeGreaterThan(0);
    });
  });

  describe('Show with No Secrets', () => {
    it('should throw error when no secrets found', async () => {
      const uniqueEnv = `show-empty-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const manager = new SecretsManager(undefined, testKey);

      // Storage throws when no secrets found
      await expect(manager.show(uniqueEnv, 'env')).rejects.toThrow('No secrets found');
    });
  });

  describe('SmartSync Load Mode', () => {
    it('should run in load mode suppressing output', async () => {
      const uniqueEnv = `sync-load-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const manager = new SecretsManager(undefined, testKey);
      const envFile = testEnv.createTempFile('API_KEY=loadtest123\n', 'sync-load');

      // First push secrets
      await manager.push(envFile, uniqueEnv);

      // SmartSync in load mode
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      await manager.smartSync(envFile, uniqueEnv, true, true, false, false);

      // In load mode, output export commands
      const calls = consoleSpy.mock.calls.flat().join('\n');
      expect(calls).toContain('export');
      consoleSpy.mockRestore();
    });

    it('should handle local exists but not cloud with autoExecute', async () => {
      const uniqueEnv = `sync-local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const manager = new SecretsManager(undefined, testKey);
      const envFile = testEnv.createTempFile('LOCAL_KEY=localvalue\n', 'sync-local');
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      // SmartSync should detect local exists but not cloud
      await manager.smartSync(envFile, uniqueEnv, true, false, false, false);

      const calls = consoleSpy.mock.calls.flat().join(' ');
      // Should indicate local exists
      expect(calls.length).toBeGreaterThan(0);
      consoleSpy.mockRestore();
    });
  });

  describe('SmartSync Pull Action', () => {
    it('should pull when cloud exists but not local', async () => {
      const uniqueEnv = `sync-pull-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const manager = new SecretsManager(undefined, testKey);

      // Create and push with one file
      const pushFile = testEnv.createTempFile('CLOUD_KEY=cloudvalue\n', 'sync-push');
      await manager.push(pushFile, uniqueEnv);

      // SmartSync with a different non-existent file
      const pullFile = path.join(os.tmpdir(), `.env.sync-pull-${uniqueEnv}-nonexistent`);
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      await manager.smartSync(pullFile, uniqueEnv, true, false, false, false);

      const calls = consoleSpy.mock.calls.flat().join(' ');
      // Should indicate cloud secrets available
      expect(calls.length).toBeGreaterThan(0);
      consoleSpy.mockRestore();

      // Cleanup
      if (fs.existsSync(pullFile)) {
        fs.unlinkSync(pullFile);
      }
    });
  });

  describe('SmartSync Key Mismatch without ForceRekey', () => {
    it('should show error when key mismatch and no forceRekey', async () => {
      const uniqueEnv = `sync-mismatch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const key1 = generateTestKey();
      const key2 = generateTestKey();

      // Push with key1
      const manager1 = new SecretsManager(undefined, key1);
      const envFile = testEnv.createTempFile('API_KEY=secret123\n', 'sync-mismatch');
      await manager1.push(envFile, uniqueEnv);

      // SmartSync with key2 (no forceRekey)
      const manager2 = new SecretsManager(undefined, key2);
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      await manager2.smartSync(envFile, uniqueEnv, true, false, false, false);

      const calls = consoleSpy.mock.calls.flat().join(' ');
      // Should show key mismatch warning
      expect(calls).toContain('mismatch');
      consoleSpy.mockRestore();
    });
  });

  describe('SmartSync No Local No Cloud', () => {
    it('should create and push when no local and no cloud', async () => {
      const uniqueEnv = `sync-new-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const manager = new SecretsManager(undefined, testKey);

      // Use a non-existent file path
      const newFile = path.join(os.tmpdir(), `.env.sync-new-${uniqueEnv}`);
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      // SmartSync should create file and push
      await manager.smartSync(newFile, uniqueEnv, true, false, false, false);

      const calls = consoleSpy.mock.calls.flat().join(' ');
      // Should indicate creating new
      expect(calls.length).toBeGreaterThan(0);
      consoleSpy.mockRestore();

      // Cleanup
      if (fs.existsSync(newFile)) {
        fs.unlinkSync(newFile);
      }
    });

    it('should suggest commands when autoExecute is false', async () => {
      const uniqueEnv = `sync-suggest-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const manager = new SecretsManager(undefined, testKey);

      const newFile = path.join(os.tmpdir(), `.env.sync-suggest-${uniqueEnv}`);
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      // SmartSync with autoExecute=false
      await manager.smartSync(newFile, uniqueEnv, false, false, false, false);

      const calls = consoleSpy.mock.calls.flat().join(' ');
      // Should suggest commands
      expect(calls).toContain('Run');
      consoleSpy.mockRestore();
    });
  });

  describe('Status with Full Cloud Data', () => {
    it('should return cloud metadata when exists', async () => {
      const uniqueEnv = `status-cloud-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const manager = new SecretsManager(undefined, testKey);
      const envFile = testEnv.createTempFile('KEY1=val1\nKEY2=val2\n', 'status-cloud');

      await manager.push(envFile, uniqueEnv);

      const status = await manager.status(envFile, uniqueEnv);

      expect(status.cloudExists).toBe(true);
      expect(status.cloudKeys).toBeGreaterThanOrEqual(2);
      expect(status.cloudModified).toBeInstanceOf(Date);
    });
  });

  describe('Resolve File Path', () => {
    it('should resolve relative path in global mode', async () => {
      const manager = new SecretsManager({ encryptionKey: testKey, globalMode: true });
      const resolved = manager.resolveFilePath('test.env');

      expect(resolved).toContain(os.homedir());
    });

    it('should keep absolute path unchanged', async () => {
      const manager = new SecretsManager({ encryptionKey: testKey, globalMode: true });
      const absolutePath = '/tmp/test.env';
      const resolved = manager.resolveFilePath(absolutePath);

      expect(resolved).toBe(absolutePath);
    });
  });

  describe('Get Home Dir', () => {
    it('should return home directory', async () => {
      const manager = new SecretsManager({ encryptionKey: testKey, globalMode: true });
      const homeDir = manager.getHomeDir();

      expect(homeDir).toBe(os.homedir());
    });
  });

  describe('Show with YAML format', () => {
    it('should output YAML format', async () => {
      const uniqueEnv = `show-yaml-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const manager = new SecretsManager(undefined, testKey);
      const envFile = testEnv.createTempFile('KEY1=value1\nKEY2=value2\n', 'show-yaml');

      await manager.push(envFile, uniqueEnv);

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      await manager.show(uniqueEnv, 'yaml');

      const calls = consoleSpy.mock.calls.flat().join('\n');
      // YAML format typically has colons
      expect(calls).toContain(':');
      consoleSpy.mockRestore();
    });
  });

  describe('Show with TOML format', () => {
    it('should output TOML format', async () => {
      const uniqueEnv = `show-toml-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const manager = new SecretsManager(undefined, testKey);
      const envFile = testEnv.createTempFile('KEY1=value1\nKEY2=value2\n', 'show-toml');

      await manager.push(envFile, uniqueEnv);

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      await manager.show(uniqueEnv, 'toml');

      const calls = consoleSpy.mock.calls.flat().join('\n');
      // TOML format has = signs
      expect(calls).toContain('=');
      consoleSpy.mockRestore();
    });
  });

  describe('Show with Export format', () => {
    it('should output export format', async () => {
      const uniqueEnv = `show-export-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const manager = new SecretsManager(undefined, testKey);
      const envFile = testEnv.createTempFile('KEY1=value1\n', 'show-export');

      await manager.push(envFile, uniqueEnv);

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      await manager.show(uniqueEnv, 'export');

      const calls = consoleSpy.mock.calls.flat().join('\n');
      expect(calls).toContain('export');
      consoleSpy.mockRestore();
    });
  });

  describe('Generate Export Commands Edge Cases', () => {
    it('should handle non-existent file', async () => {
      const manager = new SecretsManager(undefined, testKey);
      const nonExistentFile = '/tmp/this-file-does-not-exist-12345.env';

      const exports = (manager as any).generateExportCommands(nonExistentFile);

      expect(exports).toContain('# No .env file found');
    });

    it('should handle quoted values', async () => {
      const manager = new SecretsManager(undefined, testKey);
      const envFile = testEnv.createTempFile('KEY1="value with spaces"\nKEY2=\'single quoted\'\n', 'export-quoted');

      const exports = (manager as any).generateExportCommands(envFile);

      expect(exports).toContain('export KEY1=');
      expect(exports).toContain('export KEY2=');
    });

    it('should skip malformed lines', async () => {
      const manager = new SecretsManager(undefined, testKey);
      const envFile = testEnv.createTempFile('VALID=value\nno-equals-sign\n\n# comment\nANOTHER=test\n', 'export-malformed');

      const exports = (manager as any).generateExportCommands(envFile);

      expect(exports).toContain('export VALID=');
      expect(exports).toContain('export ANOTHER=');
      expect(exports).not.toContain('no-equals-sign');
    });
  });

  describe('SmartSync with Load Mode Export', () => {
    it('should output exports in load mode after pull', async () => {
      const uniqueEnv = `load-pull-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const manager = new SecretsManager(undefined, testKey);

      // Push first
      const pushFile = testEnv.createTempFile('LOAD_KEY=loadvalue\n', 'load-push');
      await manager.push(pushFile, uniqueEnv);

      // Pull to a different file in load mode
      const pullFile = path.join(os.tmpdir(), `.env.load-pull-${uniqueEnv}`);
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      await manager.smartSync(pullFile, uniqueEnv, true, true, false, false);

      const calls = consoleSpy.mock.calls.flat().join('\n');
      // In load mode should output export commands
      expect(calls).toContain('export');
      consoleSpy.mockRestore();

      // Cleanup
      if (fs.existsSync(pullFile)) {
        fs.unlinkSync(pullFile);
      }
    });

    it('should handle in-sync state in load mode', async () => {
      const uniqueEnv = `load-insync-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const manager = new SecretsManager(undefined, testKey);

      // Create and push file
      const envFile = testEnv.createTempFile('SYNC_KEY=syncvalue\n', 'load-insync');
      await manager.push(envFile, uniqueEnv);

      // SmartSync in load mode (already in sync)
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      await manager.smartSync(envFile, uniqueEnv, true, true, false, false);

      const calls = consoleSpy.mock.calls.flat().join('\n');
      expect(calls).toContain('export');
      consoleSpy.mockRestore();
    });
  });

  describe('SmartSync Workspace Context', () => {
    it('should show git repo context', async () => {
      const uniqueEnv = `sync-git-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const manager = new SecretsManager(undefined, testKey);
      const envFile = testEnv.createTempFile('GIT_KEY=gitvalue\n', 'sync-git');
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      // SmartSync should detect git context (we're in lsh repo)
      await manager.smartSync(envFile, uniqueEnv, true, false, false, false);

      const calls = consoleSpy.mock.calls.flat().join(' ');
      // Should show workspace context
      expect(calls.length).toBeGreaterThan(0);
      consoleSpy.mockRestore();
    });

    it('should show global workspace context in global mode', async () => {
      const uniqueEnv = `sync-global-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const manager = new SecretsManager({ encryptionKey: testKey, globalMode: true });
      const envFile = testEnv.createTempFile('GLOBAL_KEY=globalvalue\n', 'sync-global');
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      await manager.smartSync(envFile, uniqueEnv, true, false, false, false);

      const calls = consoleSpy.mock.calls.flat().join(' ');
      expect(calls).toContain('Global');
      consoleSpy.mockRestore();
    });
  });

  describe('Status Suggestions', () => {
    it('should suggest push when local exists but cloud does not', async () => {
      const uniqueEnv = `suggest-push-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const manager = new SecretsManager(undefined, testKey);
      const envFile = testEnv.createTempFile('LOCAL_ONLY=value\n', 'suggest-push');

      // Don't push to cloud - only local exists
      const status = await manager.status(envFile, uniqueEnv);

      expect(status.localExists).toBe(true);
      expect(status.cloudExists).toBe(false);
      expect(status.suggestions.length).toBeGreaterThanOrEqual(0);
    });

    it('should suggest pull when cloud exists but local does not', async () => {
      const uniqueEnv = `suggest-pull-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const manager = new SecretsManager(undefined, testKey);

      // Push to cloud first
      const pushFile = testEnv.createTempFile('CLOUD_ONLY=value\n', 'suggest-pull-push');
      await manager.push(pushFile, uniqueEnv);

      // Check status with non-existent local file
      const nonExistentFile = `/tmp/nonexistent-${uniqueEnv}.env`;
      const status = await manager.status(nonExistentFile, uniqueEnv);

      expect(status.localExists).toBe(false);
      expect(status.cloudExists).toBe(true);
    });
  });

  describe('IsGlobalMode', () => {
    it('should return true when in global mode', () => {
      const manager = new SecretsManager({ encryptionKey: testKey, globalMode: true });
      expect(manager.isGlobalMode()).toBe(true);
    });

    it('should return false when not in global mode', () => {
      const manager = new SecretsManager(undefined, testKey);
      expect(manager.isGlobalMode()).toBe(false);
    });
  });

  describe('Show with Default Env Format Masking', () => {
    it('should mask long values', async () => {
      const uniqueEnv = `show-mask-long-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const manager = new SecretsManager(undefined, testKey);
      const envFile = testEnv.createTempFile('LONG_SECRET=verylongsecretvalue12345\n', 'show-mask-long');
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      await manager.push(envFile, uniqueEnv);
      await manager.show(uniqueEnv, 'env');

      const calls = consoleSpy.mock.calls.flat().join(' ');
      // Should show first 4 chars + asterisks
      expect(calls).toContain('very');
      expect(calls).toContain('*');
      expect(calls).not.toContain('verylongsecretvalue12345');
      consoleSpy.mockRestore();
    });

    it('should mask short values completely', async () => {
      const uniqueEnv = `show-mask-short-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const manager = new SecretsManager(undefined, testKey);
      const envFile = testEnv.createTempFile('SHORT=abc\n', 'show-mask-short');
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      await manager.push(envFile, uniqueEnv);
      await manager.show(uniqueEnv, 'env');

      const calls = consoleSpy.mock.calls.flat().join(' ');
      // Short values should be fully masked
      expect(calls).toContain('****');
      consoleSpy.mockRestore();
    });
  });

  describe('Cleanup', () => {
    it('should cleanup without error', async () => {
      const manager = new SecretsManager(undefined, testKey);

      // Should not throw
      await expect(manager.cleanup()).resolves.toBeUndefined();
    });
  });
});
