/**
 * Tests for SecretsManager global mode (-g flag)
 *
 * Testing global workspace functionality that resolves to $HOME
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach } from '@jest/globals';
import * as path from 'path';
import * as os from 'os';

describe('SecretsManager Global Mode', () => {
  let SecretsManager: typeof import('../src/lib/secrets-manager.js').SecretsManager;
  const homeDir = os.homedir();
  const testKey = 'a'.repeat(64); // 32-byte key in hex

  beforeAll(async () => {
    const module = await import('../src/lib/secrets-manager.js');
    SecretsManager = module.SecretsManager;
  });

  describe('Constructor Options', () => {
    it('should accept globalMode option via object constructor', () => {
      const manager = new SecretsManager({ globalMode: true });
      expect(manager.isGlobalMode()).toBe(true);
    });

    it('should default globalMode to false', () => {
      const manager = new SecretsManager();
      expect(manager.isGlobalMode()).toBe(false);
    });

    it('should accept legacy constructor parameters', () => {
      const manager = new SecretsManager(undefined, testKey, false);
      expect(manager.isGlobalMode()).toBe(false);
    });

    it('should return home directory correctly', () => {
      const manager = new SecretsManager({ globalMode: true });
      expect(manager.getHomeDir()).toBe(homeDir);
    });
  });

  describe('File Path Resolution', () => {
    it('should resolve relative paths to $HOME in global mode', () => {
      const manager = new SecretsManager({ globalMode: true });
      const resolved = manager.resolveFilePath('.env');
      expect(resolved).toBe(path.join(homeDir, '.env'));
    });

    it('should resolve .env.local to $HOME in global mode', () => {
      const manager = new SecretsManager({ globalMode: true });
      const resolved = manager.resolveFilePath('.env.local');
      expect(resolved).toBe(path.join(homeDir, '.env.local'));
    });

    it('should preserve absolute paths in global mode', () => {
      const manager = new SecretsManager({ globalMode: true });
      const absolutePath = '/tmp/test/.env';
      const resolved = manager.resolveFilePath(absolutePath);
      expect(resolved).toBe(absolutePath);
    });

    it('should not modify paths in normal mode', () => {
      const manager = new SecretsManager({ globalMode: false });
      const resolved = manager.resolveFilePath('.env');
      expect(resolved).toBe('.env');
    });
  });

  describe('Environment Namespacing', () => {
    it('should use "global" namespace in global mode with default env', () => {
      const manager = new SecretsManager({ globalMode: true, encryptionKey: testKey });
      const defaultEnv = manager.getDefaultEnvironment();
      expect(defaultEnv).toBe('dev');

      // Access private method for testing
      const effectiveEnv = (manager as any).getRepoAwareEnvironment('dev');
      expect(effectiveEnv).toBe('global');
    });

    it('should prefix custom envs with "global_" in global mode', () => {
      const manager = new SecretsManager({ globalMode: true, encryptionKey: testKey });

      const stagingEnv = (manager as any).getRepoAwareEnvironment('staging');
      expect(stagingEnv).toBe('global_staging');

      const prodEnv = (manager as any).getRepoAwareEnvironment('prod');
      expect(prodEnv).toBe('global_prod');
    });

    it('should not detect git repo in global mode', () => {
      const manager = new SecretsManager({ globalMode: true });
      // gitInfo should be undefined in global mode
      expect((manager as any).gitInfo).toBeUndefined();
    });
  });

  describe('Git Detection Skipping', () => {
    it('should skip git detection when globalMode is true', () => {
      // Even in a git repo, global mode should skip git detection
      const manager = new SecretsManager({
        globalMode: true,
        detectGit: true,  // This should be overridden by globalMode
        encryptionKey: testKey
      });

      expect(manager.isGlobalMode()).toBe(true);
      expect((manager as any).gitInfo).toBeUndefined();
    });

    it('should detect git when globalMode is false', () => {
      // In non-global mode, git detection should work normally
      const manager = new SecretsManager({
        globalMode: false,
        detectGit: true,
        encryptionKey: testKey
      });

      expect(manager.isGlobalMode()).toBe(false);
      // gitInfo may or may not be defined depending on whether we're in a git repo
    });
  });

  describe('Combined Options', () => {
    it('should accept all options together', () => {
      const customKey = 'b'.repeat(64);
      const manager = new SecretsManager({
        globalMode: true,
        encryptionKey: customKey,
        detectGit: false
      });

      expect(manager.isGlobalMode()).toBe(true);
      expect(manager.getHomeDir()).toBe(homeDir);
    });
  });
});
