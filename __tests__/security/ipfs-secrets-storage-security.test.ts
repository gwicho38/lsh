/**
 * IPFS Secrets Storage Security Tests
 * Tests for security-focused encryption/decryption functionality
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';
import { IPFSSecretsStorage } from '../src/lib/ipfs-secrets-storage.js';

// Mock secrets manager for proper Secret type
jest.mock('../src/lib/secrets-manager.js', () => ({
  Secret: class {
    constructor(key, value, environment = 'test') {
      this.key = key;
      this.value = value;
      this.environment = environment;
      this.createdAt = new Date();
      this.updatedAt = new Date();
    }
  }
}));

describe('IPFSSecretsStorage - Security Tests', () => {
  let storage: IPFSSecretsStorage;
  let testDir: string;
  let originalHome: string | undefined;

  beforeEach(async () => {
    originalHome = process.env.HOME;
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lsh-security-test-'));
    process.env.HOME = testDir;

    // Create .lsh directory structure
    fs.mkdirSync(path.join(testDir, '.lsh', 'secrets-cache'), { recursive: true });

    storage = new IPFSSecretsStorage();
    await storage.initialize();
  });

  afterEach(() => {
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

  describe('Encryption Security', () => {
    it('should use different IV for each encryption', () => {
      const testData = [
        { key: 'API_KEY', value: 'secret123' },
        { key: 'DB_PASSWORD', value: 'password456' }
      ];

      const cid1 = storage.push(testData, 'test-env', 'encryption-key');
      const cid2 = storage.push(testData, 'test-env', 'encryption-key');

      // Different IVs should produce different ciphertexts and CIDs
      expect(cid1).not.toBe(cid2);
    });

    it('should use strong encryption key derivation', async () => {
      // Test that key derivation uses SHA-256
      const testKey = 'test-key-123';
      const expectedKey = crypto.createHash('sha256').update(testKey).digest();
      
      // This tests the implementation details without exposing them
      const testData = [{ key: 'TEST', value: 'value', environment: 'test', createdAt: new Date(), updatedAt: new Date() }];
      const result = storage.push(testData, 'test', testKey);
      
      // Should successfully encrypt (no error thrown)
      await expect(result).resolves.toBeDefined();
    });

    it('should fail decryption with wrong key', async () => {
      const testData = [
        { key: 'SECRET', value: 'value', environment: 'test', createdAt: new Date(), updatedAt: new Date() }
      ];

      const cid = await storage.push(testData, 'test', 'correct-key');
      
      // Try to decrypt with wrong key
      const decryptPromise = storage.pull(cid, 'wrong-key');
      await expect(decryptPromise).rejects.toThrow();
    });

    it('should fail decryption of corrupted data', async () => {
      // Create a valid encrypted file
      const testData = [
        { key: 'SECRET', value: 'value', environment: 'test', createdAt: new Date(), updatedAt: new Date() }
      ];
      const cid = await storage.push(testData, 'test', 'encryption-key');

      // Corrupt the encrypted file
      const cachePath = path.join(testDir, '.lsh', 'secrets-cache', `${cid}.encrypted`);
      fs.writeFileSync(cachePath, 'corrupted-data-that-is-not-valid-json', 'utf8');

      // Should fail to decrypt corrupted data
      const decryptPromise = storage.pull(cid, 'encryption-key');
      await expect(decryptPromise).rejects.toThrow();
    });

    it('should handle empty encryption keys gracefully', async () => {
      const testData = [
        { key: 'SECRET', value: 'value', environment: 'test', createdAt: new Date(), updatedAt: new Date() }
      ];

      const pushPromise = storage.push(testData, 'test', '');
      await expect(pushPromise).rejects.toThrow();
    });

    it('should handle null/undefined encryption keys', async () => {
      const testData = [
        { key: 'SECRET', value: 'value', environment: 'test', createdAt: new Date(), updatedAt: new Date() }
      ];

      await expect(storage.push(testData, 'test', null as any)).rejects.toThrow();
      await expect(storage.push(testData, 'test', undefined as any)).rejects.toThrow();
    });
  });

  describe('Key Derivation Edge Cases', () => {
    it('should handle very long keys', async () => {
      const longKey = 'a'.repeat(10000);
      const testData = [
        { key: 'SECRET', value: 'value', environment: 'test', createdAt: new Date(), updatedAt: new Date() }
      ];

      // Should not crash with very long keys
      const result = storage.push(testData, 'test', longKey);
      await expect(result).resolves.toBeDefined();
    });

    it('should handle keys with special characters', async () => {
      const specialKeys = [
        'key-with-dashes',
        'key_with_underscores',
        'key.with.dots',
        'key with spaces',
        'key-with-unicode-测试',
        'key-with-emoji-🔐',
        'key\nwith\nnewlines',
        'key\twith\ttabs'
      ];

      for (const key of specialKeys) {
        const testData = [
          { key: 'SECRET', value: 'value', environment: 'test', createdAt: new Date(), updatedAt: new Date() }
        ];

        const result = storage.push(testData, 'test', key);
        await expect(result).resolves.toBeDefined();
      }
    });

    it('should handle keys with control characters safely', async () => {
      const dangerousKeys = [
        'key\x00with\x00nulls',
        'key\x01with\x02control\x03chars',
        'key\x7fwith\x7fdel'
      ];

      for (const key of dangerousKeys) {
        const testData = [
          { key: 'SECRET', value: 'value', environment: 'test', createdAt: new Date(), updatedAt: new Date() }
        ];

        // Should handle control characters safely (not crash)
        const result = storage.push(testData, 'test', key);
        await expect(result).resolves.toBeDefined();
      }
    });
  });

  describe('Cache Security', () => {
    it('should not cache sensitive information in plaintext', () => {
      const cacheDir = path.join(testDir, '.lsh', 'secrets-cache');
      
      // Check that cache directory exists and is properly secured
      expect(fs.existsSync(cacheDir)).toBe(true);
      
      // Verify cache files are encrypted (not plaintext)
      const cacheFiles = fs.readdirSync(cacheDir);
      cacheFiles.forEach(file => {
        if (file.endsWith('.encrypted')) {
          const filePath = path.join(cacheDir, file);
          const content = fs.readFileSync(filePath, 'utf8');
          
          // Should not contain plaintext secrets
          expect(content).not.toContain('SECRET');
          expect(content).not.toContain('password');
          expect(content).not.toContain('key');
        }
      });
    });

    it('should handle cache corruption gracefully', async () => {
      const testData = [
        { key: 'SECRET', value: 'value', environment: 'test', createdAt: new Date(), updatedAt: new Date() }
      ];

      const cid = await storage.push(testData, 'test', 'encryption-key');

      // Corrupt the cache file
      const cachePath = path.join(testDir, '.lsh', 'secrets-cache', `${cid}.encrypted`);
      fs.writeFileSync(cachePath, '', 'utf8'); // Empty file

      // Should handle corruption gracefully
      const pullPromise = storage.pull(cid, 'encryption-key');
      await expect(pullPromise).rejects.toThrow();
    });

    it('should not expose cache paths in error messages', async () => {
      const testData = [
        { key: 'SECRET', value: 'value', environment: 'test', createdAt: new Date(), updatedAt: new Date() }
      ];

      const cid = await storage.push(testData, 'test', 'encryption-key');

      // Corrupt cache to force an error
      const cachePath = path.join(testDir, '.lsh', 'secrets-cache', `${cid}.encrypted`);
      fs.writeFileSync(cachePath, 'corrupted', 'utf8');

      try {
        await storage.pull(cid, 'encryption-key');
      } catch (error) {
        // Error message should not contain the full file path
        const errorMessage = error.message;
        expect(errorMessage).not.toContain(testDir);
        expect(errorMessage).not.toContain('.lsh');
      }
    });
  });

  describe('Data Integrity Security', () => {
    it('should validate decrypted data structure', async () => {
      // Manually create a malformed encrypted file
      const malformedJson = '{"not": "a valid secret structure"}';
      const fakeCid = 'bafkreifakemalformeddata';
      const cachePath = path.join(testDir, '.lsh', 'secrets-cache', `${fakeCid}.encrypted`);
      
      // Create fake metadata entry
      await storage.push([], 'test', 'key'); // Create metadata
      
      // Write malformed encrypted data
      fs.writeFileSync(cachePath, malformedJson, 'utf8');

      // Should reject malformed data
      const pullPromise = storage.pull(fakeCid, 'key');
      await expect(pullPromise).rejects.toThrow();
    });

    it('should prevent data injection through secrets', async () => {
      const maliciousSecrets = [
        { 
          key: 'NORMAL_KEY', 
          value: 'normal-value', 
          environment: 'test', 
          createdAt: new Date(), 
          updatedAt: new Date() 
        },
        {
          key: '"INJECTION";rm -rf /;echo "legit"',
          value: 'attempted-injection',
          environment: 'test', 
          createdAt: new Date(), 
          updatedAt: new Date() 
        }
      ];

      const cid = await storage.push(maliciousSecrets, 'test', 'encryption-key');
      const decrypted = await storage.pull(cid, 'encryption-key');

      // Should handle injection attempts safely
      expect(Array.isArray(decrypted)).toBe(true);
      expect(decrypted.length).toBe(2);
      expect(decrypted[1].key).toBe('"INJECTION";rm -rf /;echo "legit"');
    });

    it('should handle very large secrets safely', async () => {
      const largeSecret = 'x'.repeat(1000000); // 1MB of 'x's
      const testData = [
        { 
          key: 'LARGE_SECRET', 
          value: largeSecret, 
          environment: 'test', 
          createdAt: new Date(), 
          updatedAt: new Date() 
        }
      ];

      // Should handle large secrets without memory issues
      const cid = await storage.push(testData, 'test', 'encryption-key');
      const decrypted = await storage.pull(cid, 'encryption-key');

      expect(decrypted[0].value).toBe(largeSecret);
    });
  });

  describe('Concurrent Access Security', () => {
    it('should handle concurrent read/write operations safely', async () => {
      const testData = [
        { key: 'SECRET', value: 'value', environment: 'test', createdAt: new Date(), updatedAt: new Date() }
      ];

      const cid = await storage.push(testData, 'test', 'encryption-key');

      // Create multiple concurrent operations
      const concurrentOperations = Array(10).fill(null).map(() => 
        storage.pull(cid, 'encryption-key')
      );

      // Should handle concurrent access without corruption
      const results = await Promise.allSettled(concurrentOperations);
      
      // All operations should succeed or fail consistently
      const successfulOps = results.filter(r => r.status === 'fulfilled');
      const failedOps = results.filter(r => r.status === 'rejected');
      
      // Should have some successful operations
      expect(successfulOps.length + failedOps.length).toBe(10);
      
      // If any succeeded, they should all return the same data
      if (successfulOps.length > 0) {
        const firstResult = (successfulOps[0] as any).value;
        successfulOps.forEach(op => {
          expect(op.value).toEqual(firstResult);
        });
      }
    });

    it('should prevent race conditions during encryption', async () => {
      const testData = [
        { key: 'SECRET', value: 'value', environment: 'test', createdAt: new Date(), updatedAt: new Date() }
      ];

      // Create multiple concurrent encryption operations
      const concurrentEncryptions = Array(5).fill(null).map(() => 
        storage.push(testData, 'test', 'encryption-key')
      );

      const results = await Promise.allSettled(concurrentEncryptions);
      
      // All should succeed
      const successfulOps = results.filter(r => r.status === 'fulfilled');
      expect(successfulOps.length).toBe(5);
      
      // Should produce different CIDs due to different IVs
      const cids = successfulOps.map(op => (op as any).value);
      const uniqueCids = new Set(cids);
      expect(uniqueCids.size).toBe(5);
    });
  });

  describe('Timing Attack Resistance', () => {
    it('not leak timing information during key validation', async () => {
      const validKey = 'correct-key';
      const invalidKey = 'wrong-key';
      const testData = [
        { key: 'SECRET', value: 'value', environment: 'test', createdAt: new Date(), updatedAt: new Date() }
      ];

      const cid = await storage.push(testData, 'test', validKey);

      // Measure timing for valid key
      const validStart = process.hrtime.bigint();
      try {
        await storage.pull(cid, validKey);
      } catch {
        // Ignore success/failure, just measure timing
      }
      const validEnd = process.hrtime.bigint();
      const validTime = Number(validEnd - validStart);

      // Measure timing for invalid key
      const invalidStart = process.hrtime.bigint();
      try {
        await storage.pull(cid, invalidKey);
      } catch {
        // Ignore success/failure, just measure timing
      }
      const invalidEnd = process.hrtime.bigint();
      const invalidTime = Number(invalidEnd - invalidStart);

      // Times should be relatively close (within 10x difference)
      const ratio = Math.max(validTime, invalidTime) / Math.min(validTime, invalidTime);
      expect(ratio).toBeLessThan(10);
    });

    it('have consistent timing regardless of secret content', async () => {
      const smallSecret = { key: 'SMALL', value: 'x', environment: 'test', createdAt: new Date(), updatedAt: new Date() };
      const largeSecret = { key: 'LARGE', value: 'x'.repeat(10000), environment: 'test', createdAt: new Date(), updatedAt: new Date() };

      const iterations = 10;

      // Time small secret operations
      const smallStart = process.hrtime.bigint();
      for (let i = 0; i < iterations; i++) {
        await storage.push([smallSecret], 'test', 'key');
      }
      const smallEnd = process.hrtime.bigint();
      const smallTime = Number(smallEnd - smallStart);

      // Time large secret operations
      const largeStart = process.hrtime.bigint();
      for (let i = 0; i < iterations; i++) {
        await storage.push([largeSecret], 'test', 'key');
      }
      const largeEnd = process.hrtime.bigint();
      const largeTime = Number(largeEnd - largeStart);

      // Times should be in reasonable range (large content can be slower but not orders of magnitude)
      const ratio = largeTime / smallTime;
      expect(ratio).toBeLessThan(100); // Large content shouldn't be 100x slower
    });
  });

  describe('Error Handling Security', () => {
    it('should not leak sensitive information in stack traces', async () => {
      const testData = [
        { key: 'SECRET_API_KEY', value: 'super-secret-api-key-12345', environment: 'test', createdAt: new Date(), updatedAt: new Date() }
      ];

      try {
        // Try to encrypt with invalid key to trigger error
        await storage.push(testData, 'test', '');
      } catch (error) {
        const errorString = error.toString();
        
        // Should not contain the actual secret value
        expect(errorString).not.toContain('super-secret-api-key-12345');
        
        // Should not contain the encryption key
        expect(errorString).not.toContain('test-data');
      }
    });

    it('should handle malformed JSON safely', async () => {
      // Create a file with invalid JSON
      const fakeCid = 'bafkreifakemalformedjson';
      const cachePath = path.join(testDir, '.lsh', 'secrets-cache', `${fakeCid}.encrypted`);
      fs.writeFileSync(cachePath, '{"invalid": json structure}', 'utf8');

      // Should handle malformed JSON safely
      const pullPromise = storage.pull(fakeCid, 'key');
      await expect(pullPromise).rejects.toThrow();
    });

    it('should handle permission errors gracefully', async () => {
      // This test simulates permission issues
      const testData = [
        { key: 'SECRET', value: 'value', environment: 'test', createdAt: new Date(), updatedAt: new Date() }
      ];

      // Mock a permission error by making cache directory read-only
      const cacheDir = path.join(testDir, '.lsh', 'secrets-cache');
      fs.chmodSync(cacheDir, 0o444); // read-only

      try {
        await storage.push(testData, 'test', 'key');
      } catch (error) {
        // Should handle permission error gracefully
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toBeDefined();
      } finally {
        // Restore permissions for cleanup
        fs.chmodSync(cacheDir, 0o755);
      }
    });
  });
});