/**
 * IPFS Client Manager Tests
 * Tests for the IPFSClientManager class - unit tests without network access
 */

import { describe, it, expect, beforeAll, beforeEach, jest } from '@jest/globals';
import * as os from 'os';
import * as path from 'path';

describe('IPFSClientManager', () => {
  let IPFSClientManager: typeof import('../src/lib/ipfs-client-manager.js').IPFSClientManager;

  beforeAll(async () => {
    const module = await import('../src/lib/ipfs-client-manager.js');
    IPFSClientManager = module.IPFSClientManager;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should create instance', () => {
      const manager = new IPFSClientManager();
      expect(manager).toBeDefined();
    });

    it('should set up directory paths', () => {
      const manager = new IPFSClientManager();
      // Instance should have internal directory paths
      const privateManager = manager as any;
      expect(privateManager.lshDir).toBe(path.join(os.homedir(), '.lsh'));
      expect(privateManager.ipfsDir).toBe(path.join(os.homedir(), '.lsh', 'ipfs'));
      expect(privateManager.binDir).toBe(path.join(os.homedir(), '.lsh', 'ipfs', 'bin'));
    });
  });

  describe('detect', () => {
    it('should return IPFSClientInfo object', async () => {
      const manager = new IPFSClientManager();
      const info = await manager.detect();

      expect(info).toBeDefined();
      expect(typeof info.installed).toBe('boolean');
    });

    it('should have correct structure when not installed', async () => {
      const manager = new IPFSClientManager();
      const info = await manager.detect();

      // May or may not have IPFS installed
      expect(info).toHaveProperty('installed');
      if (!info.installed) {
        expect(info.version).toBeUndefined();
        expect(info.path).toBeUndefined();
        expect(info.type).toBeUndefined();
      }
    });

    it('should have correct structure when installed', async () => {
      const manager = new IPFSClientManager();
      const info = await manager.detect();

      if (info.installed) {
        expect(info.version).toBeDefined();
        expect(info.path).toBeDefined();
        expect(info.type).toBe('kubo');
      }
    });
  });

  describe('Directory Structure', () => {
    it('should reference ~/.lsh directory', () => {
      const manager = new IPFSClientManager();
      const privateManager = manager as any;
      expect(privateManager.lshDir).toContain('.lsh');
    });

    it('should have nested ipfs directory', () => {
      const manager = new IPFSClientManager();
      const privateManager = manager as any;
      expect(privateManager.ipfsDir).toContain('ipfs');
    });

    it('should have bin directory under ipfs', () => {
      const manager = new IPFSClientManager();
      const privateManager = manager as any;
      expect(privateManager.binDir).toContain('bin');
    });
  });

  describe('install', () => {
    it('should have install method', () => {
      const manager = new IPFSClientManager();
      expect(typeof manager.install).toBe('function');
    });

    it('should accept install options', () => {
      const manager = new IPFSClientManager();
      // Just verify the method signature, don't actually install
      expect(manager.install).toBeDefined();
    });
  });

  describe('uninstall', () => {
    it('should have uninstall method', () => {
      const manager = new IPFSClientManager();
      expect(typeof manager.uninstall).toBe('function');
    });

    it('should handle uninstall when nothing is installed', async () => {
      const manager = new IPFSClientManager();
      // Should not throw
      await expect(manager.uninstall()).resolves.toBeUndefined();
    });
  });

  describe('init', () => {
    it('should have init method', () => {
      const manager = new IPFSClientManager();
      expect(typeof manager.init).toBe('function');
    });

    it('should throw error if IPFS not installed', async () => {
      const manager = new IPFSClientManager();
      const info = await manager.detect();

      if (!info.installed) {
        await expect(manager.init()).rejects.toThrow('IPFS client not installed');
      }
    });
  });

  describe('start', () => {
    it('should have start method', () => {
      const manager = new IPFSClientManager();
      expect(typeof manager.start).toBe('function');
    });

    it('should throw error if IPFS not installed', async () => {
      const manager = new IPFSClientManager();
      const info = await manager.detect();

      if (!info.installed) {
        await expect(manager.start()).rejects.toThrow('IPFS client not installed');
      }
    });
  });

  describe('stop', () => {
    it('should have stop method', () => {
      const manager = new IPFSClientManager();
      expect(typeof manager.stop).toBe('function');
    });

    it('should not throw when daemon not running', async () => {
      const manager = new IPFSClientManager();
      await expect(manager.stop()).resolves.toBeUndefined();
    });
  });

  describe('Private Methods', () => {
    it('should have getLatestKuboVersion method', () => {
      const manager = new IPFSClientManager();
      const privateManager = manager as any;
      expect(typeof privateManager.getLatestKuboVersion).toBe('function');
    });

    it('should have ensureDirectories method', () => {
      const manager = new IPFSClientManager();
      const privateManager = manager as any;
      expect(typeof privateManager.ensureDirectories).toBe('function');
    });

    it('should have installKuboMacOS method', () => {
      const manager = new IPFSClientManager();
      const privateManager = manager as any;
      expect(typeof privateManager.installKuboMacOS).toBe('function');
    });

    it('should have installKuboLinux method', () => {
      const manager = new IPFSClientManager();
      const privateManager = manager as any;
      expect(typeof privateManager.installKuboLinux).toBe('function');
    });

    it('should have installKuboWindows method', () => {
      const manager = new IPFSClientManager();
      const privateManager = manager as any;
      expect(typeof privateManager.installKuboWindows).toBe('function');
    });
  });

  describe('getLatestKuboVersion', () => {
    it('should return a version string', async () => {
      const manager = new IPFSClientManager();
      const privateManager = manager as any;

      // May fail network request but should return fallback
      const version = await privateManager.getLatestKuboVersion();

      expect(typeof version).toBe('string');
      // Should match semver pattern (fallback is 0.26.0)
      expect(version).toMatch(/^\d+\.\d+\.\d+$/);
    });
  });

  describe('Interface Exports', () => {
    it('should export IPFSClientManager class', async () => {
      const module = await import('../src/lib/ipfs-client-manager.js');
      expect(module.IPFSClientManager).toBeDefined();
    });
  });
});
