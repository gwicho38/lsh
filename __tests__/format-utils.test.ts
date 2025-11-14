/**
 * Tests for Format Utilities
 * Tests all output format converters
 */

import { describe, it, expect } from '@jest/globals';
import {
  maskSecret,
  maskSecrets,
  detectNamespaces,
  formatAsEnv,
  formatAsJSON,
  formatAsYAML,
  formatAsTOML,
  formatAsExport,
  formatSecrets,
  type SecretEntry,
} from '../src/lib/format-utils';

describe('Format Utilities', () => {
  const testSecrets: SecretEntry[] = [
    { key: 'API_KEY', value: 'sk_test_1234567890' },
    { key: 'DATABASE_URL', value: 'postgresql://localhost/mydb' },
    { key: 'DATABASE_PORT', value: '5432' },
    { key: 'REDIS_HOST', value: 'localhost' },
    { key: 'REDIS_PORT', value: '6379' },
    { key: 'SECRET_TOKEN', value: 'abc123' },
  ];

  describe('maskSecret', () => {
    it('should mask values longer than 6 characters', () => {
      const result = maskSecret('1234567890');
      expect(result).toBe('123***890');
    });

    it('should show *** for values 6 characters or less', () => {
      expect(maskSecret('123456')).toBe('***');
      expect(maskSecret('12345')).toBe('***');
      expect(maskSecret('abc')).toBe('***');
    });

    it('should handle very long values', () => {
      const longValue = 'a'.repeat(100);
      const result = maskSecret(longValue);
      expect(result).toBe('aaa***aaa');
    });

    it('should handle empty strings', () => {
      const result = maskSecret('');
      expect(result).toBe('***');
    });
  });

  describe('maskSecrets', () => {
    it('should mask all secret values', () => {
      const result = maskSecrets(testSecrets);
      expect(result).toHaveLength(testSecrets.length);
      expect(result[0].value).toBe('sk_***890');
      expect(result[1].value).toBe('pos***ydb');
    });

    it('should preserve keys unchanged', () => {
      const result = maskSecrets(testSecrets);
      expect(result.map(s => s.key)).toEqual(testSecrets.map(s => s.key));
    });

    it('should handle empty array', () => {
      const result = maskSecrets([]);
      expect(result).toEqual([]);
    });
  });

  describe('detectNamespaces', () => {
    it('should detect common prefixes and group them', () => {
      const result = detectNamespaces(testSecrets);

      expect(result.has('database')).toBe(true);
      expect(result.has('redis')).toBe(true);

      const dbSecrets = result.get('database')!;
      expect(dbSecrets).toHaveLength(2);
      expect(dbSecrets[0].key).toBe('URL');
      expect(dbSecrets[1].key).toBe('PORT');
    });

    it('should put ungrouped keys in _root', () => {
      const result = detectNamespaces(testSecrets);

      expect(result.has('_root')).toBe(true);
      const rootSecrets = result.get('_root')!;
      expect(rootSecrets.length).toBeGreaterThan(0);
      expect(rootSecrets.some(s => s.key === 'API_KEY')).toBe(true);
    });

    it('should not create namespace for single-item groups', () => {
      const secrets: SecretEntry[] = [
        { key: 'DATABASE_URL', value: 'test' },
        { key: 'API_KEY', value: 'test' },
      ];

      const result = detectNamespaces(secrets);
      expect(result.has('database')).toBe(false);
      expect(result.has('_root')).toBe(true);
    });

    it('should handle secrets without underscores', () => {
      const secrets: SecretEntry[] = [
        { key: 'api', value: 'test' },
        { key: 'secret', value: 'value' },
      ];

      const result = detectNamespaces(secrets);
      expect(result.has('_root')).toBe(true);
      expect(result.get('_root')).toHaveLength(2);
    });

    it('should handle empty array', () => {
      const result = detectNamespaces([]);
      expect(result.size).toBe(0);
    });
  });

  describe('formatAsEnv', () => {
    it('should format secrets as KEY=value pairs', () => {
      const result = formatAsEnv(testSecrets);
      const lines = result.split('\n');

      expect(lines).toHaveLength(testSecrets.length);
      expect(lines[0]).toBe('API_KEY=sk_test_1234567890');
      expect(lines[1]).toBe('DATABASE_URL=postgresql://localhost/mydb');
    });

    it('should handle empty array', () => {
      const result = formatAsEnv([]);
      expect(result).toBe('');
    });

    it('should handle special characters in values', () => {
      const secrets: SecretEntry[] = [
        { key: 'TEST', value: 'value with spaces' },
        { key: 'SPECIAL', value: 'value=with=equals' },
      ];

      const result = formatAsEnv(secrets);
      expect(result).toContain('TEST=value with spaces');
      expect(result).toContain('SPECIAL=value=with=equals');
    });
  });

  describe('formatAsJSON', () => {
    it('should format secrets as JSON object', () => {
      const result = formatAsJSON(testSecrets);
      const parsed = JSON.parse(result);

      expect(parsed.API_KEY).toBe('sk_test_1234567890');
      expect(parsed.DATABASE_URL).toBe('postgresql://localhost/mydb');
      expect(Object.keys(parsed)).toHaveLength(testSecrets.length);
    });

    it('should produce pretty-printed JSON', () => {
      const result = formatAsJSON(testSecrets);
      expect(result).toContain('\n');
      expect(result).toContain('  '); // Indentation
    });

    it('should handle empty array', () => {
      const result = formatAsJSON([]);
      const parsed = JSON.parse(result);
      expect(parsed).toEqual({});
    });
  });

  describe('formatAsYAML', () => {
    it('should format secrets as YAML', () => {
      const result = formatAsYAML(testSecrets);

      expect(result).toContain('API_KEY: sk_test_1234567890');
      expect(result).toContain('DATABASE_URL: postgresql://localhost/mydb');
    });

    it('should handle empty array', () => {
      const result = formatAsYAML([]);
      expect(result).toBe('{}\n');
    });

    it('should handle values with special characters', () => {
      const secrets: SecretEntry[] = [
        { key: 'TEST', value: 'value: with: colons' },
        { key: 'QUOTE', value: "value with 'quotes'" },
      ];

      const result = formatAsYAML(secrets);
      expect(result).toBeTruthy();
      expect(result).toContain('TEST:');
      expect(result).toContain('QUOTE:');
    });
  });

  describe('formatAsTOML', () => {
    it('should format secrets as TOML with namespace detection', () => {
      const result = formatAsTOML(testSecrets);

      expect(result).toContain('[database]');
      expect(result).toContain('[redis]');
      expect(result).toContain('URL = ');
      expect(result).toContain('PORT = ');
    });

    it('should put ungrouped keys at the top', () => {
      const result = formatAsTOML(testSecrets);
      const lines = result.split('\n');

      // API_KEY and SECRET_TOKEN should be before first section
      const firstSectionIndex = lines.findIndex(l => l.startsWith('['));
      const apiKeyIndex = lines.findIndex(l => l.startsWith('API_KEY'));

      expect(apiKeyIndex).toBeGreaterThan(-1);
      expect(apiKeyIndex).toBeLessThan(firstSectionIndex);
    });

    it('should handle empty array', () => {
      const result = formatAsTOML([]);
      expect(result).toBe('');
    });

    it('should quote string values properly', () => {
      const secrets: SecretEntry[] = [
        { key: 'TEST', value: 'simple' },
        { key: 'SPECIAL', value: 'with "quotes"' },
      ];

      const result = formatAsTOML(secrets);
      expect(result).toContain('TEST = "simple"');
      expect(result).toBeTruthy();
    });

    it('should add blank lines between sections', () => {
      const result = formatAsTOML(testSecrets);
      const sections = result.split('\n\n');

      expect(sections.length).toBeGreaterThan(1);
    });
  });

  describe('formatAsExport', () => {
    it('should format secrets as shell export statements', () => {
      const result = formatAsExport(testSecrets);
      const lines = result.split('\n');

      expect(lines).toHaveLength(testSecrets.length);
      expect(lines[0]).toBe("export API_KEY='sk_test_1234567890'");
      expect(lines[1]).toBe("export DATABASE_URL='postgresql://localhost/mydb'");
    });

    it('should escape single quotes in values', () => {
      const secrets: SecretEntry[] = [
        { key: 'TEST', value: "value with 'single' quotes" },
      ];

      const result = formatAsExport(secrets);
      expect(result).toContain("'\\''");
    });

    it('should handle empty array', () => {
      const result = formatAsExport([]);
      expect(result).toBe('');
    });

    it('should handle values with special characters', () => {
      const secrets: SecretEntry[] = [
        { key: 'SPECIAL', value: '$PATH:/usr/bin' },
        { key: 'QUOTED', value: '"double quotes"' },
      ];

      const result = formatAsExport(secrets);
      expect(result).toContain("export SPECIAL='$PATH:/usr/bin'");
      expect(result).toContain('export QUOTED=\'"double quotes"\'');
    });
  });

  describe('formatSecrets', () => {
    it('should format with env format', () => {
      const result = formatSecrets(testSecrets, 'env');
      expect(result).toContain('API_KEY=');
    });

    it('should format with json format', () => {
      const result = formatSecrets(testSecrets, 'json');
      const parsed = JSON.parse(result);
      expect(parsed.API_KEY).toBeTruthy();
    });

    it('should format with yaml format', () => {
      const result = formatSecrets(testSecrets, 'yaml');
      expect(result).toContain('API_KEY:');
    });

    it('should format with toml format', () => {
      const result = formatSecrets(testSecrets, 'toml');
      expect(result).toBeTruthy();
    });

    it('should format with export format', () => {
      const result = formatSecrets(testSecrets, 'export');
      expect(result).toContain('export API_KEY=');
    });

    it('should auto-mask for env format', () => {
      const result = formatSecrets(testSecrets, 'env');
      expect(result).toContain('***');
    });

    it('should not auto-mask for json format', () => {
      const result = formatSecrets(testSecrets, 'json');
      expect(result).not.toContain('***');
      expect(result).toContain('sk_test_1234567890');
    });

    it('should respect explicit mask=true', () => {
      const result = formatSecrets(testSecrets, 'json', true);
      expect(result).toContain('***');
    });

    it('should respect explicit mask=false', () => {
      const result = formatSecrets(testSecrets, 'env', false);
      expect(result).not.toContain('***');
      expect(result).toContain('sk_test_1234567890');
    });

    it('should throw error for unsupported format', () => {
      expect(() => {
        formatSecrets(testSecrets, 'xml' as any);
      }).toThrow('Unsupported format');
    });
  });

  describe('Integration Tests', () => {
    it('should produce valid output for all formats', () => {
      const formats: Array<'env' | 'json' | 'yaml' | 'toml' | 'export'> = [
        'env',
        'json',
        'yaml',
        'toml',
        'export',
      ];

      for (const format of formats) {
        const result = formatSecrets(testSecrets, format, false);
        expect(result).toBeTruthy();
        expect(result.length).toBeGreaterThan(0);
      }
    });

    it('should handle complex real-world secrets', () => {
      const realWorldSecrets: SecretEntry[] = [
        { key: 'DATABASE_URL', value: 'postgresql://user:pass@localhost:5432/db' },
        { key: 'DATABASE_POOL_SIZE', value: '10' },
        { key: 'REDIS_URL', value: 'redis://localhost:6379' },
        { key: 'AWS_ACCESS_KEY_ID', value: 'AKIAIOSFODNN7EXAMPLE' },
        { key: 'AWS_SECRET_ACCESS_KEY', value: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY' },
        { key: 'STRIPE_SECRET_KEY', value: 'sk_test_123456789' },
        { key: 'JWT_SECRET', value: 'super-secret-jwt-key-12345' },
        { key: 'API_ENDPOINT', value: 'https://api.example.com/v1' },
      ];

      const formats: Array<'env' | 'json' | 'yaml' | 'toml' | 'export'> = [
        'env',
        'json',
        'yaml',
        'toml',
        'export',
      ];

      for (const format of formats) {
        const result = formatSecrets(realWorldSecrets, format, false);
        expect(result).toBeTruthy();

        // Verify all keys are present (except for TOML which transforms them)
        if (format !== 'toml') {
          for (const secret of realWorldSecrets) {
            expect(result).toContain(secret.key);
          }
        } else {
          // For TOML, just verify sections and values exist
          expect(result).toContain('[database]');
          expect(result).toContain('[aws]');
          expect(result).toContain('STRIPE_SECRET_KEY');
        }
      }
    });
  });
});
