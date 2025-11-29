/**
 * Format Utils Tests
 * Tests for secret export formatting utilities
 */

import { describe, it, expect, beforeAll } from '@jest/globals';

describe('FormatUtils', () => {
  let maskSecret: typeof import('../src/lib/format-utils.js').maskSecret;
  let maskSecrets: typeof import('../src/lib/format-utils.js').maskSecrets;
  let detectNamespaces: typeof import('../src/lib/format-utils.js').detectNamespaces;
  let formatAsEnv: typeof import('../src/lib/format-utils.js').formatAsEnv;
  let formatAsJSON: typeof import('../src/lib/format-utils.js').formatAsJSON;
  let formatAsYAML: typeof import('../src/lib/format-utils.js').formatAsYAML;
  let formatAsTOML: typeof import('../src/lib/format-utils.js').formatAsTOML;
  let formatAsExport: typeof import('../src/lib/format-utils.js').formatAsExport;
  let formatSecrets: typeof import('../src/lib/format-utils.js').formatSecrets;

  beforeAll(async () => {
    const module = await import('../src/lib/format-utils.js');
    maskSecret = module.maskSecret;
    maskSecrets = module.maskSecrets;
    detectNamespaces = module.detectNamespaces;
    formatAsEnv = module.formatAsEnv;
    formatAsJSON = module.formatAsJSON;
    formatAsYAML = module.formatAsYAML;
    formatAsTOML = module.formatAsTOML;
    formatAsExport = module.formatAsExport;
    formatSecrets = module.formatSecrets;
  });

  describe('maskSecret', () => {
    it('should mask long secrets', () => {
      const result = maskSecret('sk_test_1234567890');
      expect(result).toBe('sk_***890');
    });

    it('should fully mask short secrets', () => {
      expect(maskSecret('abc')).toBe('***');
      expect(maskSecret('123456')).toBe('***');
    });

    it('should handle 7 character secrets', () => {
      const result = maskSecret('1234567');
      expect(result).toBe('123***567');
    });
  });

  describe('maskSecrets', () => {
    it('should mask array of secrets', () => {
      const secrets = [
        { key: 'API_KEY', value: 'sk_test_1234567890' },
        { key: 'TOKEN', value: 'short' }
      ];
      const result = maskSecrets(secrets);
      expect(result[0].value).toBe('sk_***890');
      expect(result[1].value).toBe('***');
    });

    it('should preserve keys', () => {
      const secrets = [{ key: 'MY_KEY', value: 'myvalue123' }];
      const result = maskSecrets(secrets);
      expect(result[0].key).toBe('MY_KEY');
    });
  });

  describe('detectNamespaces', () => {
    it('should group secrets by prefix', () => {
      const secrets = [
        { key: 'DATABASE_URL', value: 'postgres://localhost' },
        { key: 'DATABASE_PORT', value: '5432' },
        { key: 'REDIS_URL', value: 'redis://localhost' }
      ];
      const namespaces = detectNamespaces(secrets);
      expect(namespaces.has('database')).toBe(true);
      expect(namespaces.get('database')?.length).toBe(2);
    });

    it('should not group single-item namespaces', () => {
      const secrets = [
        { key: 'DATABASE_URL', value: 'postgres://localhost' },
        { key: 'REDIS_URL', value: 'redis://localhost' }
      ];
      const namespaces = detectNamespaces(secrets);
      // Both are single items, so they should be in _root
      expect(namespaces.has('_root')).toBe(true);
    });

    it('should handle ungrouped keys', () => {
      const secrets = [
        { key: 'SIMPLE_KEY', value: 'value' }
      ];
      const namespaces = detectNamespaces(secrets);
      expect(namespaces.has('_root')).toBe(true);
    });
  });

  describe('formatAsEnv', () => {
    it('should format as KEY=value pairs', () => {
      const secrets = [
        { key: 'API_KEY', value: 'test123' },
        { key: 'SECRET', value: 'mysecret' }
      ];
      const result = formatAsEnv(secrets);
      expect(result).toBe('API_KEY=test123\nSECRET=mysecret');
    });

    it('should handle empty array', () => {
      const result = formatAsEnv([]);
      expect(result).toBe('');
    });

    it('should handle values with special characters', () => {
      const secrets = [{ key: 'URL', value: 'https://example.com?foo=bar' }];
      const result = formatAsEnv(secrets);
      expect(result).toBe('URL=https://example.com?foo=bar');
    });
  });

  describe('formatAsJSON', () => {
    it('should format as valid JSON', () => {
      const secrets = [
        { key: 'API_KEY', value: 'test123' }
      ];
      const result = formatAsJSON(secrets);
      const parsed = JSON.parse(result);
      expect(parsed.API_KEY).toBe('test123');
    });

    it('should format multiple keys', () => {
      const secrets = [
        { key: 'KEY1', value: 'val1' },
        { key: 'KEY2', value: 'val2' }
      ];
      const result = formatAsJSON(secrets);
      const parsed = JSON.parse(result);
      expect(parsed.KEY1).toBe('val1');
      expect(parsed.KEY2).toBe('val2');
    });

    it('should handle empty array', () => {
      const result = formatAsJSON([]);
      expect(JSON.parse(result)).toEqual({});
    });
  });

  describe('formatAsYAML', () => {
    it('should format as valid YAML', () => {
      const secrets = [
        { key: 'API_KEY', value: 'test123' }
      ];
      const result = formatAsYAML(secrets);
      expect(result).toContain('API_KEY:');
      expect(result).toContain('test123');
    });

    it('should handle multiple keys', () => {
      const secrets = [
        { key: 'KEY1', value: 'val1' },
        { key: 'KEY2', value: 'val2' }
      ];
      const result = formatAsYAML(secrets);
      expect(result).toContain('KEY1:');
      expect(result).toContain('KEY2:');
    });
  });

  describe('formatAsTOML', () => {
    it('should format as valid TOML', () => {
      const secrets = [
        { key: 'API_KEY', value: 'test123' }
      ];
      const result = formatAsTOML(secrets);
      expect(result).toContain('API_KEY');
      expect(result).toContain('"test123"');
    });

    it('should group by namespace', () => {
      const secrets = [
        { key: 'DATABASE_URL', value: 'postgres://localhost' },
        { key: 'DATABASE_PORT', value: '5432' }
      ];
      const result = formatAsTOML(secrets);
      expect(result).toContain('[database]');
      expect(result).toContain('URL');
      expect(result).toContain('PORT');
    });
  });

  describe('formatAsExport', () => {
    it('should format as shell export statements', () => {
      const secrets = [
        { key: 'API_KEY', value: 'test123' }
      ];
      const result = formatAsExport(secrets);
      expect(result).toBe("export API_KEY='test123'");
    });

    it('should escape single quotes in values', () => {
      const secrets = [
        { key: 'MSG', value: "hello'world" }
      ];
      const result = formatAsExport(secrets);
      expect(result).toContain("'hello'\\''world'");
    });

    it('should handle multiple exports', () => {
      const secrets = [
        { key: 'KEY1', value: 'val1' },
        { key: 'KEY2', value: 'val2' }
      ];
      const result = formatAsExport(secrets);
      expect(result).toContain("export KEY1='val1'");
      expect(result).toContain("export KEY2='val2'");
    });
  });

  describe('formatSecrets', () => {
    const testSecrets = [
      { key: 'API_KEY', value: 'sk_test_1234567890' }
    ];

    it('should format as env', () => {
      const result = formatSecrets(testSecrets, 'env', false);
      expect(result).toContain('API_KEY=');
    });

    it('should format as json', () => {
      const result = formatSecrets(testSecrets, 'json');
      expect(() => JSON.parse(result)).not.toThrow();
    });

    it('should format as yaml', () => {
      const result = formatSecrets(testSecrets, 'yaml');
      expect(result).toContain('API_KEY:');
    });

    it('should format as toml', () => {
      const result = formatSecrets(testSecrets, 'toml');
      expect(result).toContain('API_KEY');
    });

    it('should format as export', () => {
      const result = formatSecrets(testSecrets, 'export');
      expect(result).toContain('export API_KEY=');
    });

    it('should throw for unsupported format', () => {
      expect(() => formatSecrets(testSecrets, 'xml' as any)).toThrow('Unsupported format');
    });

    it('should mask values when mask is true', () => {
      const result = formatSecrets(testSecrets, 'json', true);
      const parsed = JSON.parse(result);
      expect(parsed.API_KEY).toBe('sk_***890');
    });

    it('should auto-mask for env format', () => {
      const result = formatSecrets(testSecrets, 'env');
      expect(result).toContain('***');
    });
  });
});
