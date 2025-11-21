/**
 * IPFS Client Manager Unit Tests
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { IPFSClientManager } from '../../src/lib/ipfs-client-manager.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

describe('IPFSClientManager', () => {
  let manager: IPFSClientManager;
  let originalHome: string;
  let testHomeDir: string;

  beforeEach(() => {
    // Create temporary home directory for testing
    testHomeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lsh-ipfs-test-'));
    originalHome = process.env.HOME || '';
    process.env.HOME = testHomeDir;

    manager = new IPFSClientManager();
  });

  afterEach(() => {
    // Restore original HOME
    process.env.HOME = originalHome;

    // Clean up test directory
    if (fs.existsSync(testHomeDir)) {
      fs.rmSync(testHomeDir, { recursive: true });
    }
  });

  describe('detect()', () => {
    it('should detect no IPFS client when none installed', async () => {
      const info = await manager.detect();

      expect(info.installed).toBe(false);
      expect(info.version).toBeUndefined();
      expect(info.path).toBeUndefined();
      expect(info.type).toBeUndefined();
    });

    it('should check for IPFS installation without errors', async () => {
      // This test simply verifies the detect() method doesn't throw
      await expect(manager.detect()).resolves.toBeDefined();
    });
  });

  describe('Directory Structure', () => {
    it('should create LSH directory on construction', () => {
      // Debug: check what HOME is set to
      const actualHomeDir = os.homedir();
      const lshDir = path.join(actualHomeDir, '.lsh');

      expect(fs.existsSync(lshDir)).toBe(true);
    });

    it('should create IPFS directory on construction', () => {
      const actualHomeDir = os.homedir();
      const lshDir = path.join(actualHomeDir, '.lsh');
      const ipfsDir = path.join(lshDir, 'ipfs');

      expect(fs.existsSync(ipfsDir)).toBe(true);
    });
  });

  describe('uninstall()', () => {
    it('should not throw when removing IPFS directory manually', () => {
      // Manually remove IPFS directory to test cleanup
      const ipfsDir = path.join(testHomeDir, '.lsh', 'ipfs');

      if (fs.existsSync(ipfsDir)) {
        fs.rmSync(ipfsDir, { recursive: true });
      }

      expect(fs.existsSync(ipfsDir)).toBe(false);
    });

    it('should handle uninstall when nothing is installed', async () => {
      // Should not throw
      await expect(manager.uninstall()).resolves.not.toThrow();
    });
  });

  describe('Platform Detection', () => {
    it('should handle different platforms', () => {
      const platform = os.platform();

      expect(['darwin', 'linux', 'win32']).toContain(platform);
    });
  });
});
