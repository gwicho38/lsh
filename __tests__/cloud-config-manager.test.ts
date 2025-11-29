/**
 * Cloud Config Manager Tests
 * Tests for cloud configuration management and type utilities
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('CloudConfigManager', () => {
  let CloudConfigManager: typeof import('../src/lib/cloud-config-manager.js').CloudConfigManager;
  let tempDir: string;
  let configPath: string;

  beforeAll(async () => {
    const module = await import('../src/lib/cloud-config-manager.js');
    CloudConfigManager = module.CloudConfigManager;
  });

  beforeEach(() => {
    // Create a temporary directory for test configs
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cloud-config-test-'));
    configPath = path.join(tempDir, '.lshrc');
  });

  afterEach(() => {
    // Clean up temp directory
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('Constructor', () => {
    it('should create instance with defaults', () => {
      const manager = new CloudConfigManager({
        enableCloudSync: false,
        localConfigPath: configPath,
      });
      expect(manager).toBeDefined();
    });

    it('should create instance with custom options', () => {
      const manager = new CloudConfigManager({
        userId: 'test-user',
        enableCloudSync: false,
        localConfigPath: configPath,
        syncInterval: 30000,
      });
      expect(manager).toBeDefined();
    });
  });

  describe('Local Config', () => {
    it('should load local config from file', () => {
      // Create a config file
      const config = { key1: 'value1', key2: 42 };
      fs.writeFileSync(configPath, JSON.stringify(config));

      const manager = new CloudConfigManager({
        enableCloudSync: false,
        localConfigPath: configPath,
      });

      expect(manager.get('key1')).toBe('value1');
      expect(manager.get('key2')).toBe(42);
    });

    it('should handle non-existent config file', () => {
      const nonExistentPath = path.join(tempDir, 'non-existent');
      const manager = new CloudConfigManager({
        enableCloudSync: false,
        localConfigPath: nonExistentPath,
      });
      expect(manager).toBeDefined();
      expect(manager.get('anyKey')).toBeUndefined();
    });

    it('should handle invalid JSON in config file', () => {
      fs.writeFileSync(configPath, 'not valid json');
      // Should not throw, just log error
      expect(() => {
        new CloudConfigManager({
          enableCloudSync: false,
          localConfigPath: configPath,
        });
      }).not.toThrow();
    });

    it('should set and get config values', () => {
      const manager = new CloudConfigManager({
        enableCloudSync: false,
        localConfigPath: configPath,
      });

      manager.set('newKey', 'newValue');
      expect(manager.get('newKey')).toBe('newValue');
    });

    it('should save config to file automatically on set', () => {
      const manager = new CloudConfigManager({
        enableCloudSync: false,
        localConfigPath: configPath,
      });

      manager.set('persistKey', 'persistValue');

      // Read the file directly to verify
      const savedConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      expect(savedConfig.persistKey).toBe('persistValue');
    });

    it('should delete config values', () => {
      const manager = new CloudConfigManager({
        enableCloudSync: false,
        localConfigPath: configPath,
      });

      manager.set('toRemove', 'value');
      expect(manager.get('toRemove')).toBe('value');

      manager.delete('toRemove');
      expect(manager.get('toRemove')).toBeUndefined();
    });

    it('should check if key exists with has()', () => {
      const manager = new CloudConfigManager({
        enableCloudSync: false,
        localConfigPath: configPath,
      });

      expect(manager.has('newKey')).toBe(false);
      manager.set('newKey', 'value');
      expect(manager.has('newKey')).toBe(true);
    });
  });

  describe('Type Detection via getAll', () => {
    it('should detect string type', () => {
      const manager = new CloudConfigManager({
        enableCloudSync: false,
        localConfigPath: configPath,
      });
      manager.set('stringKey', 'hello');
      const all = manager.getAll();
      const meta = all.find(c => c.key === 'stringKey');
      expect(meta?.type).toBe('string');
    });

    it('should detect number type', () => {
      const manager = new CloudConfigManager({
        enableCloudSync: false,
        localConfigPath: configPath,
      });
      manager.set('numberKey', 42);
      const all = manager.getAll();
      const meta = all.find(c => c.key === 'numberKey');
      expect(meta?.type).toBe('number');
    });

    it('should detect boolean type', () => {
      const manager = new CloudConfigManager({
        enableCloudSync: false,
        localConfigPath: configPath,
      });
      manager.set('boolKey', true);
      const all = manager.getAll();
      const meta = all.find(c => c.key === 'boolKey');
      expect(meta?.type).toBe('boolean');
    });

    it('should detect array type', () => {
      const manager = new CloudConfigManager({
        enableCloudSync: false,
        localConfigPath: configPath,
      });
      manager.set('arrayKey', [1, 2, 3]);
      const all = manager.getAll();
      const meta = all.find(c => c.key === 'arrayKey');
      expect(meta?.type).toBe('array');
    });

    it('should detect object type', () => {
      const manager = new CloudConfigManager({
        enableCloudSync: false,
        localConfigPath: configPath,
      });
      manager.set('objectKey', { nested: 'value' });
      const all = manager.getAll();
      const meta = all.find(c => c.key === 'objectKey');
      expect(meta?.type).toBe('object');
    });
  });

  describe('getKeys', () => {
    it('should list all config keys', () => {
      const manager = new CloudConfigManager({
        enableCloudSync: false,
        localConfigPath: configPath,
      });

      manager.set('key1', 'value1');
      manager.set('key2', 'value2');
      manager.set('key3', 'value3');

      const keys = manager.getKeys();
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
      expect(keys).toContain('key3');
    });

    it('should return empty array for no keys', () => {
      const manager = new CloudConfigManager({
        enableCloudSync: false,
        localConfigPath: configPath,
      });

      const keys = manager.getKeys();
      expect(Array.isArray(keys)).toBe(true);
      expect(keys.length).toBe(0);
    });
  });

  describe('getAll', () => {
    it('should return all config entries', () => {
      const manager = new CloudConfigManager({
        enableCloudSync: false,
        localConfigPath: configPath,
      });

      manager.set('key1', 'value1');
      manager.set('key2', 42);

      const all = manager.getAll();
      expect(Array.isArray(all)).toBe(true);
      expect(all.length).toBe(2);
    });
  });
});
