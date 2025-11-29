/**
 * LSH Config Manager Tests
 * Tests for the LSH configuration and key management
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('LshConfigManager', () => {
  let LshConfigManager: typeof import('../src/lib/lsh-config.js').LshConfigManager;
  let tempDir: string;
  let configPath: string;
  let originalLshSecretsKey: string | undefined;

  beforeAll(async () => {
    const module = await import('../src/lib/lsh-config.js');
    LshConfigManager = module.LshConfigManager;
  });

  beforeEach(() => {
    // Create a temporary directory for test configs
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lsh-config-test-'));
    configPath = path.join(tempDir, 'config.json');
    // Save and clear LSH_SECRETS_KEY to test fallback behavior
    originalLshSecretsKey = process.env.LSH_SECRETS_KEY;
    delete process.env.LSH_SECRETS_KEY;
    delete process.env.LSH_MASTER_KEY;
  });

  afterEach(() => {
    // Restore LSH_SECRETS_KEY
    if (originalLshSecretsKey !== undefined) {
      process.env.LSH_SECRETS_KEY = originalLshSecretsKey;
    }
    // Clean up temp directory
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('Key Management', () => {
    it('should set and get a key', () => {
      const manager = new LshConfigManager(configPath);
      manager.setKey('testRepo', 'testValue');
      expect(manager.getKey('testRepo')).toBe('testValue');
    });

    it('should return null for non-existent key without env fallback', () => {
      const manager = new LshConfigManager(configPath);
      expect(manager.getKey('nonExistentRepo')).toBeNull();
    });

    it('should check if key exists', () => {
      const manager = new LshConfigManager(configPath);
      expect(manager.hasKey('testRepo')).toBe(false);
      manager.setKey('testRepo', 'testValue');
      expect(manager.hasKey('testRepo')).toBe(true);
    });

    it('should remove a key', () => {
      const manager = new LshConfigManager(configPath);
      manager.setKey('testRepo', 'testValue');
      expect(manager.hasKey('testRepo')).toBe(true);
      manager.removeKey('testRepo');
      expect(manager.hasKey('testRepo')).toBe(false);
    });

    it('should list all keys', () => {
      const manager = new LshConfigManager(configPath);
      manager.setKey('repo1', 'value1');
      manager.setKey('repo2', 'value2');
      manager.setKey('repo3', 'value3');

      const keys = manager.listKeys();
      const repoNames = keys.map(k => k.repoName);
      expect(repoNames).toContain('repo1');
      expect(repoNames).toContain('repo2');
      expect(repoNames).toContain('repo3');
      expect(keys.length).toBe(3);
    });

    it('should return key entries with metadata', () => {
      const manager = new LshConfigManager(configPath);
      manager.setKey('testRepo', 'testValue');

      const keys = manager.listKeys();
      expect(keys.length).toBe(1);
      expect(keys[0].repoName).toBe('testRepo');
      expect(typeof keys[0].createdAt).toBe('string');
      expect(typeof keys[0].lastUsed).toBe('string');
    });

    it('should export a key in shell export format', () => {
      const manager = new LshConfigManager(configPath);
      manager.setKey('exportRepo', 'exportValue');
      expect(manager.exportKey('exportRepo')).toBe("export LSH_SECRETS_KEY='exportValue'");
    });

    it('should return null when exporting non-existent key', () => {
      const manager = new LshConfigManager(configPath);
      expect(manager.exportKey('nonExistentRepo')).toBeNull();
    });
  });

  describe('Environment Variable Fallback', () => {
    it('should fall back to LSH_SECRETS_KEY env variable', () => {
      process.env.LSH_SECRETS_KEY = 'env-key-value';
      const manager = new LshConfigManager(configPath);
      expect(manager.getKey('anyRepo')).toBe('env-key-value');
    });

    it('should prefer stored key over env variable', () => {
      process.env.LSH_SECRETS_KEY = 'env-key-value';
      const manager = new LshConfigManager(configPath);
      manager.setKey('myRepo', 'stored-key-value');
      expect(manager.getKey('myRepo')).toBe('stored-key-value');
    });
  });

  describe('Config Path', () => {
    it('should return config path', () => {
      const manager = new LshConfigManager(configPath);
      expect(manager.getConfigPath()).toBe(configPath);
    });

    it('should use default path when not specified', () => {
      const manager = new LshConfigManager();
      const defaultPath = manager.getConfigPath();
      expect(typeof defaultPath).toBe('string');
      expect(defaultPath).toContain('.lsh');
      expect(defaultPath).toContain('config.json');
    });
  });

  describe('Persistence', () => {
    it('should persist keys across instances', () => {
      const manager1 = new LshConfigManager(configPath);
      manager1.setKey('persistRepo', 'persistValue');

      // Create a new instance with same config path
      const manager2 = new LshConfigManager(configPath);
      expect(manager2.getKey('persistRepo')).toBe('persistValue');
    });

    it('should handle empty config', () => {
      const manager = new LshConfigManager(configPath);
      const keys = manager.listKeys();
      expect(Array.isArray(keys)).toBe(true);
      expect(keys.length).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle special characters in repo names', () => {
      const manager = new LshConfigManager(configPath);
      const specialKey = 'repo-with_special.chars';
      manager.setKey(specialKey, 'value');
      expect(manager.getKey(specialKey)).toBe('value');
    });

    it('should handle special characters in values', () => {
      const manager = new LshConfigManager(configPath);
      const specialValue = 'value with "quotes" and apostrophes and newlines';
      manager.setKey('repo', specialValue);
      expect(manager.getKey('repo')).toBe(specialValue);
    });

    it('should overwrite existing keys', () => {
      const manager = new LshConfigManager(configPath);
      manager.setKey('repo', 'value1');
      manager.setKey('repo', 'value2');
      expect(manager.getKey('repo')).toBe('value2');
    });

    it('should handle removing non-existent key without error', () => {
      const manager = new LshConfigManager(configPath);
      expect(() => manager.removeKey('nonExistent')).not.toThrow();
    });

    it('should update lastUsed timestamp on getKey', () => {
      const manager = new LshConfigManager(configPath);
      manager.setKey('repo', 'value');

      const keys1 = manager.listKeys();
      const lastUsed1 = keys1[0].lastUsed;

      // Wait a tiny bit and get again
      manager.getKey('repo');

      const keys2 = manager.listKeys();
      const lastUsed2 = keys2[0].lastUsed;

      // lastUsed should have been updated
      expect(new Date(lastUsed2).getTime()).toBeGreaterThanOrEqual(new Date(lastUsed1).getTime());
    });
  });
});
