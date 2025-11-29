/**
 * Config Manager Tests
 * Tests for the ConfigManager class and helper functions
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as path from 'path';
import * as os from 'os';

// Store original env
const originalEnv = { ...process.env };

describe('Config Manager', () => {
  let ConfigManager: typeof import('../src/lib/config-manager.js').ConfigManager;
  let parseEnvFile: typeof import('../src/lib/config-manager.js').parseEnvFile;
  let serializeConfig: typeof import('../src/lib/config-manager.js').serializeConfig;
  let DEFAULT_CONFIG_TEMPLATE: typeof import('../src/lib/config-manager.js').DEFAULT_CONFIG_TEMPLATE;

  let testConfigDir: string;
  let testConfigFile: string;

  beforeAll(async () => {
    const module = await import('../src/lib/config-manager.js');
    ConfigManager = module.ConfigManager;
    parseEnvFile = module.parseEnvFile;
    serializeConfig = module.serializeConfig;
    DEFAULT_CONFIG_TEMPLATE = module.DEFAULT_CONFIG_TEMPLATE;
  });

  beforeEach(async () => {
    // Create temporary config directory
    testConfigDir = path.join(os.tmpdir(), `lsh-test-${Date.now()}`);
    testConfigFile = path.join(testConfigDir, 'lshrc');

    // Ensure clean state
    try {
      await fs.rm(testConfigDir, { recursive: true, force: true });
    } catch {
      // Directory may not exist
    }
  });

  afterEach(async () => {
    // Clean up test config directory
    try {
      await fs.rm(testConfigDir, { recursive: true, force: true });
    } catch {
      // Directory may not exist
    }

    // Restore original env
    process.env = { ...originalEnv };
  });

  describe('parseEnvFile', () => {
    it('should parse simple KEY=VALUE', () => {
      const content = 'KEY=value';
      const config = parseEnvFile(content);
      expect(config.KEY).toBe('value');
    });

    it('should parse multiple lines', () => {
      const content = `KEY1=value1
KEY2=value2
KEY3=value3`;
      const config = parseEnvFile(content);
      expect(config.KEY1).toBe('value1');
      expect(config.KEY2).toBe('value2');
      expect(config.KEY3).toBe('value3');
    });

    it('should skip comments', () => {
      const content = `# This is a comment
KEY=value
# Another comment`;
      const config = parseEnvFile(content);
      expect(Object.keys(config)).toHaveLength(1);
      expect(config.KEY).toBe('value');
    });

    it('should skip empty lines', () => {
      const content = `KEY1=value1

KEY2=value2`;
      const config = parseEnvFile(content);
      expect(Object.keys(config)).toHaveLength(2);
    });

    it('should remove double quotes', () => {
      const content = 'KEY="quoted value"';
      const config = parseEnvFile(content);
      expect(config.KEY).toBe('quoted value');
    });

    it('should remove single quotes', () => {
      const content = "KEY='single quoted'";
      const config = parseEnvFile(content);
      expect(config.KEY).toBe('single quoted');
    });

    it('should handle values with equals sign', () => {
      const content = 'URL=https://example.com?param=value';
      const config = parseEnvFile(content);
      expect(config.URL).toBe('https://example.com?param=value');
    });

    it('should trim whitespace', () => {
      const content = '  KEY  =  value  ';
      const config = parseEnvFile(content);
      expect(config.KEY).toBe('value');
    });
  });

  describe('serializeConfig', () => {
    it('should serialize simple config', () => {
      const config = { KEY: 'value' };
      const result = serializeConfig(config);
      expect(result).toBe('KEY=value');
    });

    it('should serialize multiple values', () => {
      const config = { KEY1: 'value1', KEY2: 'value2' };
      const result = serializeConfig(config);
      expect(result).toContain('KEY1=value1');
      expect(result).toContain('KEY2=value2');
    });

    it('should skip undefined values', () => {
      const config = { KEY1: 'value1', KEY2: undefined };
      const result = serializeConfig(config);
      expect(result).toBe('KEY1=value1');
    });

    it('should skip empty string values', () => {
      const config = { KEY1: 'value1', KEY2: '' };
      const result = serializeConfig(config);
      expect(result).toBe('KEY1=value1');
    });

    it('should quote values with spaces', () => {
      const config = { KEY: 'value with spaces' };
      const result = serializeConfig(config);
      expect(result).toBe('KEY="value with spaces"');
    });

    it('should quote values with special characters', () => {
      const config = { KEY: 'value#comment' };
      const result = serializeConfig(config);
      expect(result).toBe('KEY="value#comment"');
    });
  });

  describe('ConfigManager', () => {
    let configManager: InstanceType<typeof ConfigManager>;

    beforeEach(() => {
      configManager = new ConfigManager(testConfigFile);
    });

    describe('getConfigPath', () => {
      it('should return the config file path', () => {
        expect(configManager.getConfigPath()).toBe(testConfigFile);
      });
    });

    describe('exists', () => {
      it('should return false if config does not exist', async () => {
        const exists = await configManager.exists();
        expect(exists).toBe(false);
      });

      it('should return true if config exists', async () => {
        await fs.mkdir(testConfigDir, { recursive: true });
        await fs.writeFile(testConfigFile, 'KEY=value');

        const exists = await configManager.exists();
        expect(exists).toBe(true);
      });
    });

    describe('existsSync', () => {
      it('should return false if config does not exist', () => {
        expect(configManager.existsSync()).toBe(false);
      });

      it('should return true if config exists', async () => {
        await fs.mkdir(testConfigDir, { recursive: true });
        await fs.writeFile(testConfigFile, 'KEY=value');

        expect(configManager.existsSync()).toBe(true);
      });
    });

    describe('initialize', () => {
      it('should create config file with default template', async () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

        await configManager.initialize();

        const content = await fs.readFile(testConfigFile, 'utf-8');
        expect(content).toContain('LSH Configuration File');

        consoleSpy.mockRestore();
      });

      it('should not overwrite existing config', async () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

        await fs.mkdir(testConfigDir, { recursive: true });
        await fs.writeFile(testConfigFile, 'EXISTING=config');

        await configManager.initialize();

        const content = await fs.readFile(testConfigFile, 'utf-8');
        expect(content).toBe('EXISTING=config');

        consoleSpy.mockRestore();
      });
    });

    describe('load', () => {
      it('should load config from file', async () => {
        await fs.mkdir(testConfigDir, { recursive: true });
        await fs.writeFile(testConfigFile, 'KEY1=value1\nKEY2=value2');

        const config = await configManager.load();

        expect(config.KEY1).toBe('value1');
        expect(config.KEY2).toBe('value2');
      });

      it('should initialize if config does not exist', async () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

        const config = await configManager.load();

        // Default template is loaded
        expect(config).toBeDefined();

        consoleSpy.mockRestore();
      });

      it('should return empty config on error', async () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        // Create a directory where file should be (will cause read error)
        await fs.mkdir(testConfigFile, { recursive: true });

        const config = await configManager.load();

        expect(config).toEqual({});

        consoleSpy.mockRestore();
      });
    });

    describe('loadSync', () => {
      it('should load config synchronously', async () => {
        await fs.mkdir(testConfigDir, { recursive: true });
        await fs.writeFile(testConfigFile, 'SYNC_KEY=sync_value');

        const config = configManager.loadSync();

        expect(config.SYNC_KEY).toBe('sync_value');
      });

      it('should return empty config if file does not exist', () => {
        const config = configManager.loadSync();
        expect(config).toEqual({});
      });
    });

    describe('save', () => {
      it('should save config to file', async () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

        await configManager.save({ NEW_KEY: 'new_value' });

        const content = await fs.readFile(testConfigFile, 'utf-8');
        expect(content).toContain('NEW_KEY=new_value');

        consoleSpy.mockRestore();
      });

      it('should merge with existing config', async () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

        await fs.mkdir(testConfigDir, { recursive: true });
        await fs.writeFile(testConfigFile, 'OLD_KEY=old_value');

        await configManager.load();
        await configManager.save({ NEW_KEY: 'new_value' });

        const content = await fs.readFile(testConfigFile, 'utf-8');
        expect(content).toContain('OLD_KEY=old_value');
        expect(content).toContain('NEW_KEY=new_value');

        consoleSpy.mockRestore();
      });
    });

    describe('get/set/delete', () => {
      beforeEach(async () => {
        await fs.mkdir(testConfigDir, { recursive: true });
        await fs.writeFile(testConfigFile, 'EXISTING=value');
        await configManager.load();
      });

      it('should get a config value', () => {
        expect(configManager.get('EXISTING')).toBe('value');
      });

      it('should return undefined for missing key', () => {
        expect(configManager.get('MISSING')).toBeUndefined();
      });

      it('should set a config value', async () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

        await configManager.set('NEW_KEY', 'new_value');

        expect(configManager.get('NEW_KEY')).toBe('new_value');

        consoleSpy.mockRestore();
      });

      it('should delete a config value', async () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

        await configManager.delete('EXISTING');

        expect(configManager.get('EXISTING')).toBeUndefined();

        consoleSpy.mockRestore();
      });
    });

    describe('getAll', () => {
      it('should return copy of all config values', async () => {
        await fs.mkdir(testConfigDir, { recursive: true });
        await fs.writeFile(testConfigFile, 'KEY1=value1\nKEY2=value2');
        await configManager.load();

        const all = configManager.getAll();

        expect(all.KEY1).toBe('value1');
        expect(all.KEY2).toBe('value2');

        // Should be a copy, not the original
        all.KEY1 = 'modified';
        expect(configManager.get('KEY1')).toBe('value1');
      });
    });

    describe('mergeWithEnv', () => {
      it('should merge config with process.env', async () => {
        await fs.mkdir(testConfigDir, { recursive: true });
        await fs.writeFile(testConfigFile, 'LSH_TEST_VAR=from_config');
        await configManager.load();

        configManager.mergeWithEnv();

        expect(process.env.LSH_TEST_VAR).toBe('from_config');
      });

      it('should not override existing env vars', async () => {
        process.env.LSH_TEST_VAR = 'from_env';

        await fs.mkdir(testConfigDir, { recursive: true });
        await fs.writeFile(testConfigFile, 'LSH_TEST_VAR=from_config');
        await configManager.load();

        configManager.mergeWithEnv();

        expect(process.env.LSH_TEST_VAR).toBe('from_env');
      });
    });
  });

  describe('DEFAULT_CONFIG_TEMPLATE', () => {
    it('should be defined', () => {
      expect(DEFAULT_CONFIG_TEMPLATE).toBeDefined();
      expect(typeof DEFAULT_CONFIG_TEMPLATE).toBe('string');
    });

    it('should contain key configuration sections', () => {
      expect(DEFAULT_CONFIG_TEMPLATE).toContain('Storage Backend');
      expect(DEFAULT_CONFIG_TEMPLATE).toContain('Secrets Management');
      expect(DEFAULT_CONFIG_TEMPLATE).toContain('API Server');
      expect(DEFAULT_CONFIG_TEMPLATE).toContain('Webhooks');
      expect(DEFAULT_CONFIG_TEMPLATE).toContain('Security');
    });
  });
});
