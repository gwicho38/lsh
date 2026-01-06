/**
 * IPFS Secrets Storage Tests
 * Tests for the IPFSSecretsStorage class
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Mock storacha client
jest.mock('../src/lib/storacha-client.js', () => ({
  getStorachaClient: () => ({
    isEnabled: () => false,
    isAuthenticated: async () => false,
  }),
}));

// Dynamic import for IPFSSecretsStorage
let IPFSSecretsStorage: typeof import('../src/lib/ipfs-secrets-storage.js').IPFSSecretsStorage;

describe('IPFS Secrets Storage', () => {
  let storage: InstanceType<typeof IPFSSecretsStorage>;
  let testDir: string;
  let originalHome: string | undefined;

  beforeAll(async () => {
    const module = await import('../src/lib/ipfs-secrets-storage.js');
    IPFSSecretsStorage = module.IPFSSecretsStorage;
  });

  beforeEach(async () => {
    // Save original HOME
    originalHome = process.env.HOME;

    // Create unique temp directory
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lsh-ipfs-test-'));

    // Set HOME to temp dir so storage uses it
    process.env.HOME = testDir;

    // Create .lsh directory structure
    fs.mkdirSync(path.join(testDir, '.lsh', 'secrets-cache'), { recursive: true });

    storage = new IPFSSecretsStorage();
    await storage.initialize();
  });

  afterEach(() => {
    // Restore HOME
    if (originalHome) {
      process.env.HOME = originalHome;
    }

    // Clean up temp directory
    try {
      fs.rmSync(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('Encryption and Decryption', () => {
    const testSecrets = [
      { key: 'API_KEY', value: 'sk_test_123456' },
      { key: 'DATABASE_URL', value: 'postgres://localhost:5432/db' },
    ];
    const encryptionKey = 'test-encryption-key-32-chars-long!';

    it('should generate unique CIDs due to random IV', async () => {
      // Push secrets twice with same key - CIDs will differ due to random IV
      const cid1 = await storage.push(testSecrets, 'test-env-1', encryptionKey);
      const cid2 = await storage.push(testSecrets, 'test-env-2', encryptionKey);

      // CIDs should be different because encryption uses random IV
      expect(cid1).not.toBe(cid2);
      // But both should be valid IPFS-like CIDs
      expect(cid1).toMatch(/^bafkrei[a-z0-9]+$/);
      expect(cid2).toMatch(/^bafkrei[a-z0-9]+$/);
    });

    it('should decrypt secrets correctly', async () => {
      await storage.push(testSecrets, 'decrypt-test', encryptionKey);

      const retrieved = await storage.pull('decrypt-test', encryptionKey);

      expect(retrieved).toHaveLength(2);
      expect(retrieved[0].key).toBe('API_KEY');
      expect(retrieved[0].value).toBe('sk_test_123456');
      expect(retrieved[1].key).toBe('DATABASE_URL');
      expect(retrieved[1].value).toBe('postgres://localhost:5432/db');
    });

    it('should fail decryption with wrong key', async () => {
      await storage.push(testSecrets, 'wrong-key-test', encryptionKey);

      await expect(storage.pull('wrong-key-test', 'wrong-key')).rejects.toThrow(
        /Decryption failed|Unexpected token|bad decrypt/
      );
    });
  });

  describe('CID Generation', () => {
    it('should generate IPFS-like CID', async () => {
      const secrets = [{ key: 'TEST', value: 'value' }];
      const cid = await storage.push(secrets, 'cid-test', 'test-key');

      expect(cid).toMatch(/^bafkrei[a-z0-9]+$/);
      expect(cid.length).toBeGreaterThan(20);
    });

    it('should generate different CIDs for different content', async () => {
      const key = 'test-key';

      const cid1 = await storage.push([{ key: 'A', value: '1' }], 'cid-test-1', key);
      const cid2 = await storage.push([{ key: 'B', value: '2' }], 'cid-test-2', key);

      expect(cid1).not.toBe(cid2);
    });
  });

  describe('Metadata Management', () => {
    it('should store metadata for pushed secrets', async () => {
      const secrets = [{ key: 'TEST', value: 'value' }];
      const cid = await storage.push(secrets, 'metadata-test', 'key');

      const metadata = storage.getMetadata('metadata-test');

      expect(metadata).toBeDefined();
      expect(metadata?.environment).toBe('metadata-test');
      expect(metadata?.cid).toBe(cid);
      expect(metadata?.keys_count).toBe(1);
      expect(metadata?.encrypted).toBe(true);
    });

    it('should store metadata with git repo info', async () => {
      const secrets = [{ key: 'TEST', value: 'value' }];
      await storage.push(secrets, 'dev', 'key', 'my-org/my-repo', 'main');

      const metadata = storage.getMetadata('dev', 'my-org/my-repo');

      expect(metadata).toBeDefined();
      expect(metadata?.git_repo).toBe('my-org/my-repo');
      expect(metadata?.git_branch).toBe('main');
    });

    it('should list all environments', async () => {
      await storage.push([{ key: 'A', value: '1' }], 'env1', 'key');
      await storage.push([{ key: 'B', value: '2' }], 'env2', 'key');

      const environments = storage.listEnvironments();

      expect(environments.length).toBeGreaterThanOrEqual(2);
      expect(environments.some(e => e.environment === 'env1')).toBe(true);
      expect(environments.some(e => e.environment === 'env2')).toBe(true);
    });

    it('should check if environment exists', async () => {
      await storage.push([{ key: 'TEST', value: 'value' }], 'exists-test', 'key');

      expect(storage.exists('exists-test')).toBe(true);
      expect(storage.exists('nonexistent')).toBe(false);
    });
  });

  describe('Local Storage', () => {
    it('should cache secrets locally', async () => {
      const secrets = [{ key: 'CACHED', value: 'data' }];
      const cid = await storage.push(secrets, 'cache-test', 'key');

      // Check cache file exists
      const cachePath = path.join(testDir, '.lsh', 'secrets-cache', `${cid}.encrypted`);
      expect(fs.existsSync(cachePath)).toBe(true);
    });

    it('should retrieve secrets from local cache', async () => {
      const secrets = [{ key: 'LOCAL', value: 'cached' }];
      const key = 'cache-key';

      await storage.push(secrets, 'local-test', key);

      // Create new storage instance to test loading from cache
      const newStorage = new IPFSSecretsStorage();
      const retrieved = await newStorage.pull('local-test', key);

      expect(retrieved).toHaveLength(1);
      expect(retrieved[0].key).toBe('LOCAL');
      expect(retrieved[0].value).toBe('cached');
    });
  });

  describe('Delete Operations', () => {
    it('should delete secrets and metadata', async () => {
      const secrets = [{ key: 'DELETE', value: 'me' }];
      const cid = await storage.push(secrets, 'delete-test', 'key');

      await storage.delete('delete-test');

      // Metadata should be gone
      expect(storage.exists('delete-test')).toBe(false);

      // Cache file should be gone
      const cachePath = path.join(testDir, '.lsh', 'secrets-cache', `${cid}.encrypted`);
      expect(fs.existsSync(cachePath)).toBe(false);
    });

    it('should handle deleting non-existent environment', async () => {
      // Should not throw
      await expect(storage.delete('nonexistent')).resolves.not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should throw error when pulling non-existent environment', async () => {
      await expect(storage.pull('nonexistent', 'key')).rejects.toThrow(
        /No secrets found/
      );
    });

    it('should provide helpful error message for missing secrets', async () => {
      try {
        await storage.pull('missing-env', 'key');
        expect.fail('Should have thrown');
      } catch (error) {
        const err = error as Error;
        expect(err.message).toContain('No secrets found');
        expect(err.message).toContain('lsh env');
        expect(err.message).toContain('lsh push');
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty secrets array', async () => {
      const cid = await storage.push([], 'empty-test', 'key');

      expect(cid).toBeDefined();

      const retrieved = await storage.pull('empty-test', 'key');
      expect(retrieved).toEqual([]);
    });

    it('should handle secrets with special characters', async () => {
      const secrets = [
        { key: 'SPECIAL', value: 'value with "quotes" and \'apostrophes\'' },
        { key: 'NEWLINE', value: 'line1\nline2\nline3' },
        { key: 'UNICODE', value: '🔐 encrypted 日本語' },
      ];

      await storage.push(secrets, 'special-chars', 'key');
      const retrieved = await storage.pull('special-chars', 'key');

      expect(retrieved).toHaveLength(3);
      expect(retrieved[0].value).toBe('value with "quotes" and \'apostrophes\'');
      expect(retrieved[1].value).toBe('line1\nline2\nline3');
      expect(retrieved[2].value).toBe('🔐 encrypted 日本語');
    });

    it('should handle very long secret values', async () => {
      const longValue = 'x'.repeat(10000);
      const secrets = [{ key: 'LONG', value: longValue }];

      await storage.push(secrets, 'long-value', 'key');
      const retrieved = await storage.pull('long-value', 'key');

      expect(retrieved[0].value).toBe(longValue);
      expect(retrieved[0].value.length).toBe(10000);
    });

    it('should handle secrets with empty values', async () => {
      const secrets = [
        { key: 'EMPTY', value: '' },
        { key: 'NOTEMPTY', value: 'has value' },
      ];

      await storage.push(secrets, 'empty-value', 'key');
      const retrieved = await storage.pull('empty-value', 'key');

      expect(retrieved[0].value).toBe('');
      expect(retrieved[1].value).toBe('has value');
    });
  });
});
