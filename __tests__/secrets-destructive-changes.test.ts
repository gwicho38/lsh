/**
 * Tests for Destructive Change Detection in SecretsManager
 *
 * Ensures that secrets with values don't accidentally get replaced with empty values
 * unless explicitly forced by the user
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { SecretsManager } from '../src/lib/secrets-manager.js';
import * as fs from 'fs';
import { TestEnvironment, generateTestKey } from './helpers/secrets-test-helpers.js';

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
        const jobWithUser = {
          ...job,
          user_id: this.userId || null
        };
        sharedStorage.set(job.job_id, jobWithUser);
      }

      async getActiveJobs() {
        return Array.from(sharedStorage.values()).filter(job => {
          if (job.command === 'secrets_sync') {
            return true;
          }
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

describe('Destructive Change Detection', () => {
  let testEnv: TestEnvironment;
  let testKey: string;

  beforeEach(() => {
    testEnv = new TestEnvironment();
    testKey = generateTestKey();
    sharedStorage.clear();
  });

  afterEach(() => {
    testEnv.cleanup();
  });

  describe('detectDestructiveChanges', () => {
    it('should detect when a filled secret becomes empty', async () => {
      const manager = new SecretsManager(undefined, testKey);

      const cloudSecrets = {
        API_KEY: 'sk_live_abc123',
        DATABASE_URL: 'postgres://user:pass@host/db',
        SECRET_TOKEN: 'secret123'
      };

      const localSecrets = {
        API_KEY: '',  // DESTRUCTIVE: was filled, now empty
        DATABASE_URL: 'postgres://user:pass@host/db',
        SECRET_TOKEN: 'secret123'
      };

      const destructive = (manager as any).detectDestructiveChanges(cloudSecrets, localSecrets);

      expect(destructive).toHaveLength(1);
      expect(destructive[0]).toEqual({
        key: 'API_KEY',
        cloudValue: 'sk_live_abc123',
        localValue: ''
      });
    });

    it('should detect multiple destructive changes', async () => {
      const manager = new SecretsManager(undefined, testKey);

      const cloudSecrets = {
        API_KEY: 'sk_live_abc123',
        DATABASE_URL: 'postgres://user:pass@host/db',
        SECRET_TOKEN: 'secret123',
        STRIPE_KEY: 'sk_stripe_xyz'
      };

      const localSecrets = {
        API_KEY: '',  // DESTRUCTIVE
        DATABASE_URL: '',  // DESTRUCTIVE
        SECRET_TOKEN: 'secret123',
        STRIPE_KEY: ''  // DESTRUCTIVE
      };

      const destructive = (manager as any).detectDestructiveChanges(cloudSecrets, localSecrets);

      expect(destructive).toHaveLength(3);
      expect(destructive.map((d: any) => d.key)).toEqual(['API_KEY', 'DATABASE_URL', 'STRIPE_KEY']);
    });

    it('should NOT flag when adding new keys', async () => {
      const manager = new SecretsManager(undefined, testKey);

      const cloudSecrets = {
        API_KEY: 'sk_live_abc123',
        DATABASE_URL: 'postgres://user:pass@host/db'
      };

      const localSecrets = {
        API_KEY: 'sk_live_abc123',
        DATABASE_URL: 'postgres://user:pass@host/db',
        NEW_KEY: 'new_value'  // This is OK - new key added
      };

      const destructive = (manager as any).detectDestructiveChanges(cloudSecrets, localSecrets);

      expect(destructive).toHaveLength(0);
    });

    it('should NOT flag when updating existing values', async () => {
      const manager = new SecretsManager(undefined, testKey);

      const cloudSecrets = {
        API_KEY: 'sk_live_abc123',
        DATABASE_URL: 'postgres://old:pass@host/db'
      };

      const localSecrets = {
        API_KEY: 'sk_live_xyz789',  // Updated value - OK
        DATABASE_URL: 'postgres://new:pass@host/db'  // Updated value - OK
      };

      const destructive = (manager as any).detectDestructiveChanges(cloudSecrets, localSecrets);

      expect(destructive).toHaveLength(0);
    });

    it('should NOT flag when both cloud and local are empty', async () => {
      const manager = new SecretsManager(undefined, testKey);

      const cloudSecrets = {
        API_KEY: 'sk_live_abc123',
        OPTIONAL_KEY: ''  // Already empty in cloud
      };

      const localSecrets = {
        API_KEY: 'sk_live_abc123',
        OPTIONAL_KEY: ''  // Still empty locally - OK
      };

      const destructive = (manager as any).detectDestructiveChanges(cloudSecrets, localSecrets);

      expect(destructive).toHaveLength(0);
    });

    it('should NOT flag when key is removed entirely from local', async () => {
      const manager = new SecretsManager(undefined, testKey);

      const cloudSecrets = {
        API_KEY: 'sk_live_abc123',
        OLD_KEY: 'old_value'
      };

      const localSecrets = {
        API_KEY: 'sk_live_abc123'
        // OLD_KEY intentionally removed - this is OK (explicit deletion)
      };

      const destructive = (manager as any).detectDestructiveChanges(cloudSecrets, localSecrets);

      expect(destructive).toHaveLength(0);
    });

    it('should flag when value becomes empty string', async () => {
      const manager = new SecretsManager(undefined, testKey);

      const cloudSecrets = {
        API_KEY: 'sk_live_abc123'
      };

      const localSecrets = {
        API_KEY: ''  // Empty string - DESTRUCTIVE
      };

      const destructive = (manager as any).detectDestructiveChanges(cloudSecrets, localSecrets);

      expect(destructive).toHaveLength(1);
    });

    it('should flag when value becomes whitespace only', async () => {
      const manager = new SecretsManager(undefined, testKey);

      const cloudSecrets = {
        API_KEY: 'sk_live_abc123'
      };

      const localSecrets = {
        API_KEY: '   '  // Whitespace only - DESTRUCTIVE
      };

      const destructive = (manager as any).detectDestructiveChanges(cloudSecrets, localSecrets);

      expect(destructive).toHaveLength(1);
      expect(destructive[0].localValue.trim()).toBe('');
    });
  });

  describe('Push with Destructive Change Protection', () => {
    it('should block push when destructive changes detected without force', async () => {
      const manager = new SecretsManager(undefined, testKey);

      // First push with filled values
      const envFile = testEnv.createTempFile(
        'API_KEY=sk_live_abc123\nDATABASE_URL=postgres://user:pass@host/db\n',
        'push-test'
      );
      await manager.push(envFile, 'test');

      // Small delay to ensure cloud metadata is persisted
      await new Promise(resolve => setTimeout(resolve, 100));

      // Modify the SAME file to have empty value (destructive)
      fs.writeFileSync(envFile, 'API_KEY=\nDATABASE_URL=postgres://user:pass@host/db\n', 'utf8');

      await expect(async () => {
        await manager.push(envFile, 'test', false); // force = false
      }).rejects.toThrow(/destructive change/i);
    });

    it('should allow push with destructive changes when force=true', async () => {
      const manager = new SecretsManager(undefined, testKey);

      // First push with filled values
      const envFile = testEnv.createTempFile(
        'API_KEY=sk_live_abc123\nDATABASE_URL=postgres://user:pass@host/db\n',
        'force-push-test'
      );
      await manager.push(envFile, 'test');

      // Modify the SAME file to have empty value but force=true (should work)
      fs.writeFileSync(envFile, 'API_KEY=\nDATABASE_URL=postgres://user:pass@host/db\n', 'utf8');

      // Should NOT throw
      await expect(manager.push(envFile, 'test', true)).resolves.not.toThrow();
    });

    it('should show helpful error message with affected keys', async () => {
      const manager = new SecretsManager(undefined, testKey);

      // First push with filled values
      const envFile = testEnv.createTempFile(
        'API_KEY=sk_live_abc123\nSTRIPE_KEY=sk_stripe_xyz\nDATABASE_URL=postgres://user:pass@host/db\n',
        'multi-key-test'
      );
      await manager.push(envFile, 'test');

      // Modify the SAME file to have multiple empty values
      fs.writeFileSync(envFile, 'API_KEY=\nSTRIPE_KEY=\nDATABASE_URL=postgres://user:pass@host/db\n', 'utf8');

      try {
        await manager.push(envFile, 'test', false);
        throw new Error('Should have thrown');
      } catch (error: any) {
        expect(error.message).toContain('API_KEY');
        expect(error.message).toContain('STRIPE_KEY');
        expect(error.message).toContain('--force');
      }
    });

    it('should allow first-time push without destructive check', async () => {
      const manager = new SecretsManager(undefined, testKey);

      // First push can have empty values (no comparison needed)
      const initialFile = testEnv.createTempFile(
        'API_KEY=\nDATABASE_URL=postgres://user:pass@host/db\n',
        'first-time-push'
      );

      // Should NOT throw
      await expect(manager.push(initialFile, 'new-env')).resolves.not.toThrow();
    });
  });

  describe('SmartSync with Destructive Change Protection', () => {
    it('should block smartSync push when local has destructive changes', async () => {
      const manager = new SecretsManager(undefined, testKey, false);

      // Setup: Push initial secrets
      const envFile = testEnv.createTempFile(
        'API_KEY=sk_live_abc123\nDATABASE_URL=postgres://user:pass@host/db\n',
        'smart-sync-test'
      );
      await manager.push(envFile, 'test');

      // Wait to ensure cloud timestamp is set
      await new Promise(resolve => setTimeout(resolve, 200));

      // Modify the SAME file to have destructive change
      const destructiveContent = 'API_KEY=\nDATABASE_URL=postgres://user:pass@host/db\n';
      fs.writeFileSync(envFile, destructiveContent, 'utf8');

      // Set file timestamp to be 5 minutes in the future to ensure it's newer
      const futureTime = Date.now() + (5 * 60 * 1000);
      const futureDate = new Date(futureTime);
      fs.utimesSync(envFile, futureDate, futureDate);

      // Verify the timestamp was set correctly
      const stats = fs.statSync(envFile);
      const timeDiff = stats.mtime.getTime() - Date.now();
      expect(timeDiff).toBeGreaterThan(4 * 60 * 1000); // At least 4 minutes in future

      // SmartSync should detect destructive change and block
      await expect(async () => {
        await manager.smartSync(envFile, 'test', true, false, false);
      }).rejects.toThrow(/destructive change/i);
    });

    it('should proceed with smartSync when no destructive changes', async () => {
      const manager = new SecretsManager(undefined, testKey, false);

      // Setup: Push initial secrets
      const initialFile = testEnv.createTempFile(
        'API_KEY=sk_live_abc123\nDATABASE_URL=postgres://user:pass@host/db\n',
        'smart-sync-safe'
      );
      await manager.push(initialFile, 'test');

      await new Promise(resolve => setTimeout(resolve, 10));

      // Modify local file with safe changes (update + add)
      const safeContent = 'API_KEY=sk_live_xyz789\nDATABASE_URL=postgres://user:pass@host/db\nNEW_KEY=new_value\n';
      fs.writeFileSync(initialFile, safeContent, 'utf8');

      // Should NOT throw
      await expect(manager.smartSync(initialFile, 'test', true, false)).resolves.not.toThrow();
    });

    it('should allow smartSync with force flag when destructive changes exist', async () => {
      const manager = new SecretsManager(undefined, testKey, false);

      // Setup: Push initial secrets
      const initialFile = testEnv.createTempFile(
        'API_KEY=sk_live_abc123\nDATABASE_URL=postgres://user:pass@host/db\n',
        'smart-sync-force'
      );
      await manager.push(initialFile, 'test');

      await new Promise(resolve => setTimeout(resolve, 10));

      // Modify local file to have destructive change
      const destructiveContent = 'API_KEY=\nDATABASE_URL=postgres://user:pass@host/db\n';
      fs.writeFileSync(initialFile, destructiveContent, 'utf8');

      // SmartSync with force should work
      await expect(manager.smartSync(initialFile, 'test', true, false, true)).resolves.not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should handle when cloud has no secrets yet', async () => {
      const manager = new SecretsManager(undefined, testKey);

      const destructive = (manager as any).detectDestructiveChanges({}, {
        API_KEY: '',  // Empty in first push - OK
        DATABASE_URL: 'postgres://user:pass@host/db'
      });

      expect(destructive).toHaveLength(0);
    });

    it('should handle when all keys are new', async () => {
      const manager = new SecretsManager(undefined, testKey);

      const cloudSecrets = {
        OLD_KEY: 'old_value'
      };

      const localSecrets = {
        NEW_KEY1: 'value1',
        NEW_KEY2: ''  // Empty but new - OK
      };

      const destructive = (manager as any).detectDestructiveChanges(cloudSecrets, localSecrets);

      expect(destructive).toHaveLength(0);
    });

    it('should handle special characters in values', async () => {
      const manager = new SecretsManager(undefined, testKey);

      const cloudSecrets = {
        DATABASE_URL: 'postgres://user:p@ssw0rd!@host:5432/db?ssl=true'
      };

      const localSecrets = {
        DATABASE_URL: ''  // DESTRUCTIVE
      };

      const destructive = (manager as any).detectDestructiveChanges(cloudSecrets, localSecrets);

      expect(destructive).toHaveLength(1);
      expect(destructive[0].cloudValue).toContain('p@ssw0rd!');
    });

    it('should handle very long secret values', async () => {
      const manager = new SecretsManager(undefined, testKey);

      const longValue = 'x'.repeat(1000);
      const cloudSecrets = {
        LONG_SECRET: longValue
      };

      const localSecrets = {
        LONG_SECRET: ''  // DESTRUCTIVE
      };

      const destructive = (manager as any).detectDestructiveChanges(cloudSecrets, localSecrets);

      expect(destructive).toHaveLength(1);
      expect(destructive[0].cloudValue).toHaveLength(1000);
    });
  });

  describe('Error Messages', () => {
    it('should format single destructive change clearly', async () => {
      const manager = new SecretsManager(undefined, testKey);

      const destructive = [{
        key: 'API_KEY',
        cloudValue: 'sk_live_abc123',
        localValue: ''
      }];

      const message = (manager as any).formatDestructiveChangesError(destructive);

      expect(message).toContain('1 secret');
      expect(message).toContain('API_KEY');
      expect(message).toContain('sk_li****'); // Masked value
      expect(message).toContain('--force');
    });

    it('should format multiple destructive changes clearly', async () => {
      const manager = new SecretsManager(undefined, testKey);

      const destructive = [
        { key: 'API_KEY', cloudValue: 'sk_live_abc123', localValue: '' },
        { key: 'STRIPE_KEY', cloudValue: 'sk_stripe_xyz', localValue: '' },
        { key: 'DATABASE_URL', cloudValue: 'postgres://...', localValue: '' }
      ];

      const message = (manager as any).formatDestructiveChangesError(destructive);

      expect(message).toContain('3 secrets');
      expect(message).toContain('API_KEY');
      expect(message).toContain('STRIPE_KEY');
      expect(message).toContain('DATABASE_URL');
      expect(message).toContain('--force');
    });

    it('should mask sensitive values in error messages', async () => {
      const manager = new SecretsManager(undefined, testKey);

      const destructive = [{
        key: 'API_KEY',
        cloudValue: 'sk_live_very_long_secret_key_1234567890',
        localValue: ''
      }];

      const message = (manager as any).formatDestructiveChangesError(destructive);

      // Should show masked preview
      expect(message).toMatch(/sk_l.*\*\*\*\*/);
      // Should NOT show full value
      expect(message).not.toContain('very_long_secret_key_1234567890');
    });
  });
});
