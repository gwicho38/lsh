/**
 * Tests for SecretsManager - LSH's primary feature
 *
 * Testing encrypted secrets management with multi-environment support
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { SecretsManager } from '../src/lib/secrets-manager.js';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { TestEnvironment, generateTestKey, parseEnvContent } from './helpers/secrets-test-helpers.js';
import {
  sampleEnvFile,
  envWithQuotes,
  envWithComments,
  envWithSpecialChars,
  envMinimal,
} from './fixtures/env-files.js';

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
      const manager2 = new SecretsManager('user2', sharedKey);

      const pushFile = testEnv.createTempFile(envMinimal, 'team-push');
      const pullFile = testEnv.createTempFile('', 'team-pull');

      await manager1.push(pushFile, 'team');
      await manager2.pull(pullFile, 'team', true);

      const pushed = parseEnvContent(fs.readFileSync(pushFile, 'utf8'));
      const pulled = parseEnvContent(fs.readFileSync(pullFile, 'utf8'));

      expect(pulled).toEqual(pushed);
    });

    it('should fail with mismatched keys', async () => {
      const manager1 = new SecretsManager('user1', generateTestKey());
      const manager2 = new SecretsManager('user2', generateTestKey());

      const pushFile = testEnv.createTempFile(envMinimal, 'mismatch-push');
      const pullFile = testEnv.createTempFile('', 'mismatch-pull');

      await manager1.push(pushFile, 'test');

      await expect(async () => {
        await manager2.pull(pullFile, 'test');
      }).rejects.toThrow(/Decryption failed/);
    });
  });

  describe('Error Handling', () => {
    it('should provide helpful error message for decryption failure', async () => {
      const manager1 = new SecretsManager(undefined, generateTestKey());
      const manager2 = new SecretsManager(undefined, generateTestKey());

      const pushFile = testEnv.createTempFile(envMinimal, 'error-push');
      const pullFile = testEnv.createTempFile('', 'error-pull');

      await manager1.push(pushFile, 'test');

      try {
        await manager2.pull(pullFile, 'test');
        fail('Should have thrown');
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
});
