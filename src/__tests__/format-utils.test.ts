/**
 * Tests for format-utils.ts
 * Secret export formatting utilities
 */

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
  type OutputFormat,
} from '../lib/format-utils.js';
import { LSHError, ErrorCodes } from '../lib/lsh-error.js';

describe('Format Utilities', () => {
  describe('maskSecret', () => {
    it('should mask values longer than 6 characters', () => {
      expect(maskSecret('secretvalue')).toBe('sec***lue');
    });

    it('should show first 3 and last 3 characters', () => {
      expect(maskSecret('abcdefghij')).toBe('abc***hij');
    });

    it('should return *** for short values', () => {
      expect(maskSecret('short')).toBe('***');
      expect(maskSecret('123456')).toBe('***');
      expect(maskSecret('ab')).toBe('***');
      expect(maskSecret('')).toBe('***');
    });

    it('should handle exactly 7 character values', () => {
      expect(maskSecret('1234567')).toBe('123***567');
    });

    it('should handle unicode characters', () => {
      // '你好世界测试密码' is 8 characters, so first 3 + *** + last 3
      expect(maskSecret('你好世界测试密码')).toBe('你好世***试密码');
    });

    it('should handle special characters', () => {
      expect(maskSecret('!@#$%^&*()_+-=')).toBe('!@#***+-=');
    });
  });

  describe('maskSecrets', () => {
    it('should mask all secrets in array', () => {
      const secrets: SecretEntry[] = [
        { key: 'API_KEY', value: 'sk_live_1234567890' },
        { key: 'PASSWORD', value: 'mysupersecretpassword' },
      ];

      const masked = maskSecrets(secrets);

      expect(masked).toHaveLength(2);
      expect(masked[0]).toEqual({ key: 'API_KEY', value: 'sk_***890' });
      expect(masked[1]).toEqual({ key: 'PASSWORD', value: 'mys***ord' });
    });

    it('should handle empty array', () => {
      expect(maskSecrets([])).toEqual([]);
    });

    it('should preserve key names', () => {
      const secrets: SecretEntry[] = [{ key: 'MY_SECRET', value: 'secretvalue' }];
      const masked = maskSecrets(secrets);
      expect(masked[0].key).toBe('MY_SECRET');
    });

    it('should mask short values as ***', () => {
      const secrets: SecretEntry[] = [{ key: 'SHORT', value: 'abc' }];
      expect(maskSecrets(secrets)[0].value).toBe('***');
    });
  });

  describe('detectNamespaces', () => {
    it('should group secrets by prefix', () => {
      const secrets: SecretEntry[] = [
        { key: 'DATABASE_URL', value: 'postgres://...' },
        { key: 'DATABASE_PORT', value: '5432' },
        { key: 'DATABASE_NAME', value: 'mydb' },
      ];

      const namespaces = detectNamespaces(secrets);

      expect(namespaces.has('database')).toBe(true);
      expect(namespaces.get('database')).toHaveLength(3);
      expect(namespaces.get('database')).toContainEqual({ key: 'URL', value: 'postgres://...' });
    });

    it('should put single-prefix secrets in _root', () => {
      const secrets: SecretEntry[] = [
        { key: 'DATABASE_URL', value: 'postgres://...' },
        { key: 'API_KEY', value: 'key123' }, // Only one API_ prefix
      ];

      const namespaces = detectNamespaces(secrets);

      // DATABASE only has 1 entry, so it goes to _root too
      expect(namespaces.has('_root')).toBe(true);
      const root = namespaces.get('_root')!;
      expect(root.some((s) => s.key === 'DATABASE_URL')).toBe(true);
      expect(root.some((s) => s.key === 'API_KEY')).toBe(true);
    });

    it('should handle secrets without underscore', () => {
      const secrets: SecretEntry[] = [{ key: 'APIKEY', value: 'value' }];

      const namespaces = detectNamespaces(secrets);

      expect(namespaces.has('_root')).toBe(true);
      expect(namespaces.get('_root')).toContainEqual({ key: 'APIKEY', value: 'value' });
    });

    it('should create multiple namespaces', () => {
      const secrets: SecretEntry[] = [
        { key: 'DB_URL', value: 'url1' },
        { key: 'DB_PORT', value: '5432' },
        { key: 'REDIS_URL', value: 'url2' },
        { key: 'REDIS_PORT', value: '6379' },
      ];

      const namespaces = detectNamespaces(secrets);

      expect(namespaces.has('db')).toBe(true);
      expect(namespaces.has('redis')).toBe(true);
      expect(namespaces.get('db')).toHaveLength(2);
      expect(namespaces.get('redis')).toHaveLength(2);
    });

    it('should handle empty array', () => {
      const namespaces = detectNamespaces([]);
      expect(namespaces.size).toBe(0);
    });

    it('should lowercase namespace names', () => {
      const secrets: SecretEntry[] = [
        { key: 'AWS_ACCESS_KEY', value: 'key' },
        { key: 'AWS_SECRET_KEY', value: 'secret' },
      ];

      const namespaces = detectNamespaces(secrets);

      expect(namespaces.has('aws')).toBe(true);
      expect(namespaces.has('AWS')).toBe(false);
    });
  });

  describe('formatAsEnv', () => {
    it('should format as KEY=value', () => {
      const secrets: SecretEntry[] = [
        { key: 'API_KEY', value: 'secret123' },
        { key: 'DATABASE_URL', value: 'postgres://localhost' },
      ];

      const result = formatAsEnv(secrets);

      expect(result).toBe('API_KEY=secret123\nDATABASE_URL=postgres://localhost');
    });

    it('should handle empty array', () => {
      expect(formatAsEnv([])).toBe('');
    });

    it('should handle single entry', () => {
      const secrets: SecretEntry[] = [{ key: 'KEY', value: 'value' }];
      expect(formatAsEnv(secrets)).toBe('KEY=value');
    });

    it('should preserve values with special characters', () => {
      const secrets: SecretEntry[] = [
        { key: 'URL', value: 'https://user:pass@host.com/path?query=1' },
      ];
      expect(formatAsEnv(secrets)).toBe('URL=https://user:pass@host.com/path?query=1');
    });

    it('should handle values with spaces', () => {
      const secrets: SecretEntry[] = [{ key: 'MSG', value: 'hello world' }];
      expect(formatAsEnv(secrets)).toBe('MSG=hello world');
    });

    it('should handle empty values', () => {
      const secrets: SecretEntry[] = [{ key: 'EMPTY', value: '' }];
      expect(formatAsEnv(secrets)).toBe('EMPTY=');
    });
  });

  describe('formatAsJSON', () => {
    it('should format as JSON object', () => {
      const secrets: SecretEntry[] = [
        { key: 'API_KEY', value: 'secret123' },
        { key: 'PORT', value: '3000' },
      ];

      const result = formatAsJSON(secrets);
      const parsed = JSON.parse(result);

      expect(parsed).toEqual({
        API_KEY: 'secret123',
        PORT: '3000',
      });
    });

    it('should produce valid JSON', () => {
      const secrets: SecretEntry[] = [{ key: 'KEY', value: 'value' }];
      expect(() => JSON.parse(formatAsJSON(secrets))).not.toThrow();
    });

    it('should handle empty array', () => {
      expect(formatAsJSON([])).toBe('{}');
    });

    it('should properly escape special characters', () => {
      const secrets: SecretEntry[] = [
        { key: 'MSG', value: 'Hello "World"' },
        { key: 'PATH', value: 'C:\\Users\\name' },
      ];

      const result = formatAsJSON(secrets);
      const parsed = JSON.parse(result);

      expect(parsed.MSG).toBe('Hello "World"');
      expect(parsed.PATH).toBe('C:\\Users\\name');
    });

    it('should be pretty printed with 2-space indent', () => {
      const secrets: SecretEntry[] = [{ key: 'KEY', value: 'value' }];
      const result = formatAsJSON(secrets);
      expect(result).toContain('\n');
      expect(result).toContain('  ');
    });
  });

  describe('formatAsYAML', () => {
    it('should format as YAML', () => {
      const secrets: SecretEntry[] = [
        { key: 'API_KEY', value: 'secret123' },
        { key: 'PORT', value: '3000' },
      ];

      const result = formatAsYAML(secrets);

      expect(result).toContain('API_KEY: secret123');
      expect(result).toContain('PORT: \'3000\'');
    });

    it('should handle empty array', () => {
      const result = formatAsYAML([]);
      expect(result.trim()).toBe('{}');
    });

    it('should quote strings that look like numbers', () => {
      const secrets: SecretEntry[] = [{ key: 'PORT', value: '3000' }];
      const result = formatAsYAML(secrets);
      // js-yaml should quote numeric strings to preserve type
      expect(result).toContain("'3000'");
    });

    it('should handle multiline values', () => {
      const secrets: SecretEntry[] = [{ key: 'CERT', value: 'line1\nline2\nline3' }];
      const result = formatAsYAML(secrets);
      expect(result).toContain('CERT:');
    });

    it('should handle special YAML characters', () => {
      const secrets: SecretEntry[] = [{ key: 'MSG', value: 'value: with colon' }];
      const result = formatAsYAML(secrets);
      // Should be properly quoted/escaped
      expect(result).toContain('MSG:');
    });
  });

  describe('formatAsTOML', () => {
    it('should format as TOML with namespaces', () => {
      const secrets: SecretEntry[] = [
        { key: 'DB_URL', value: 'postgres://localhost' },
        { key: 'DB_PORT', value: '5432' },
      ];

      const result = formatAsTOML(secrets);

      expect(result).toContain('[db]');
      expect(result).toContain('URL = "postgres://localhost"');
      expect(result).toContain('PORT = "5432"');
    });

    it('should put ungrouped secrets at root level', () => {
      const secrets: SecretEntry[] = [
        { key: 'SINGLE_KEY', value: 'value' },
        { key: 'ANOTHER', value: 'val2' },
      ];

      const result = formatAsTOML(secrets);

      // Should not have sections, just root keys
      expect(result).not.toContain('[');
      expect(result).toContain('SINGLE_KEY = "value"');
    });

    it('should handle empty array', () => {
      expect(formatAsTOML([])).toBe('');
    });

    it('should escape quotes in values', () => {
      const secrets: SecretEntry[] = [{ key: 'MSG', value: 'Hello "World"' }];
      const result = formatAsTOML(secrets);
      expect(result).toContain('MSG = "Hello \\"World\\""');
    });

    it('should create separate sections for different prefixes', () => {
      const secrets: SecretEntry[] = [
        { key: 'DB_URL', value: 'db-url' },
        { key: 'DB_NAME', value: 'mydb' },
        { key: 'REDIS_URL', value: 'redis-url' },
        { key: 'REDIS_PORT', value: '6379' },
      ];

      const result = formatAsTOML(secrets);

      expect(result).toContain('[db]');
      expect(result).toContain('[redis]');
    });
  });

  describe('formatAsExport', () => {
    it('should format as shell export statements', () => {
      const secrets: SecretEntry[] = [
        { key: 'API_KEY', value: 'secret123' },
        { key: 'PORT', value: '3000' },
      ];

      const result = formatAsExport(secrets);

      expect(result).toBe("export API_KEY='secret123'\nexport PORT='3000'");
    });

    it('should handle empty array', () => {
      expect(formatAsExport([])).toBe('');
    });

    it('should escape single quotes in values', () => {
      const secrets: SecretEntry[] = [{ key: 'MSG', value: "it's a test" }];
      const result = formatAsExport(secrets);
      expect(result).toBe("export MSG='it'\\''s a test'");
    });

    it('should handle multiple single quotes', () => {
      const secrets: SecretEntry[] = [{ key: 'MSG', value: "a'b'c" }];
      const result = formatAsExport(secrets);
      expect(result).toBe("export MSG='a'\\''b'\\''c'");
    });

    it('should preserve double quotes without escaping', () => {
      const secrets: SecretEntry[] = [{ key: 'MSG', value: 'say "hello"' }];
      const result = formatAsExport(secrets);
      expect(result).toBe("export MSG='say \"hello\"'");
    });

    it('should handle values with special shell characters', () => {
      const secrets: SecretEntry[] = [{ key: 'CMD', value: 'echo $HOME && ls' }];
      const result = formatAsExport(secrets);
      // Inside single quotes, $HOME should not expand
      expect(result).toBe("export CMD='echo $HOME && ls'");
    });
  });

  describe('formatSecrets', () => {
    const testSecrets: SecretEntry[] = [
      { key: 'API_KEY', value: 'supersecretkey123' },
      { key: 'PORT', value: '3000' },
    ];

    describe('format selection', () => {
      it('should format as env', () => {
        const result = formatSecrets(testSecrets, 'env', false);
        expect(result).toContain('API_KEY=');
        expect(result).toContain('PORT=');
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
        expect(result).toContain('=');
      });

      it('should format as export', () => {
        const result = formatSecrets(testSecrets, 'export');
        expect(result).toContain('export API_KEY=');
      });
    });

    describe('masking behavior', () => {
      it('should auto-mask for env format by default', () => {
        const result = formatSecrets(testSecrets, 'env');
        expect(result).toContain('***'); // Should be masked
      });

      it('should not auto-mask for json format', () => {
        const result = formatSecrets(testSecrets, 'json');
        const parsed = JSON.parse(result);
        expect(parsed.API_KEY).toBe('supersecretkey123');
      });

      it('should not auto-mask for yaml format', () => {
        const result = formatSecrets(testSecrets, 'yaml');
        expect(result).toContain('supersecretkey123');
      });

      it('should not auto-mask for toml format', () => {
        const result = formatSecrets(testSecrets, 'toml');
        expect(result).toContain('supersecretkey123');
      });

      it('should not auto-mask for export format', () => {
        const result = formatSecrets(testSecrets, 'export');
        expect(result).toContain('supersecretkey123');
      });

      it('should mask when explicitly set to true', () => {
        const result = formatSecrets(testSecrets, 'json', true);
        const parsed = JSON.parse(result);
        expect(parsed.API_KEY).toContain('***');
      });

      it('should not mask when explicitly set to false', () => {
        const result = formatSecrets(testSecrets, 'env', false);
        expect(result).not.toContain('***');
        expect(result).toContain('supersecretkey123');
      });
    });

    describe('error handling', () => {
      it('should throw LSHError for unsupported format', () => {
        expect(() => formatSecrets(testSecrets, 'xml' as OutputFormat)).toThrow(LSHError);
      });

      it('should include supported formats in error context', () => {
        try {
          formatSecrets(testSecrets, 'invalid' as OutputFormat);
        } catch (error) {
          expect(error).toBeInstanceOf(LSHError);
          if (error instanceof LSHError) {
            expect(error.code).toBe(ErrorCodes.VALIDATION_INVALID_FORMAT);
            expect(error.context?.supportedFormats).toContain('env');
            expect(error.context?.supportedFormats).toContain('json');
            expect(error.context?.supportedFormats).toContain('yaml');
            expect(error.context?.supportedFormats).toContain('toml');
            expect(error.context?.supportedFormats).toContain('export');
          }
        }
      });
    });

    describe('empty secrets', () => {
      it('should handle empty array for all formats', () => {
        expect(() => formatSecrets([], 'env')).not.toThrow();
        expect(() => formatSecrets([], 'json')).not.toThrow();
        expect(() => formatSecrets([], 'yaml')).not.toThrow();
        expect(() => formatSecrets([], 'toml')).not.toThrow();
        expect(() => formatSecrets([], 'export')).not.toThrow();
      });
    });
  });

  describe('Integration scenarios', () => {
    it('should round-trip env format (unmasked)', () => {
      const secrets: SecretEntry[] = [
        { key: 'KEY1', value: 'value1' },
        { key: 'KEY2', value: 'value2' },
      ];

      const formatted = formatSecrets(secrets, 'env', false);
      const lines = formatted.split('\n');

      expect(lines).toHaveLength(2);
      expect(lines[0]).toBe('KEY1=value1');
      expect(lines[1]).toBe('KEY2=value2');
    });

    it('should format CI/CD secrets properly', () => {
      const secrets: SecretEntry[] = [
        { key: 'CI_DEPLOY_TOKEN', value: 'glpat-xxx' },
        { key: 'CI_REGISTRY_URL', value: 'registry.example.com' },
        { key: 'CI_BUILD_ID', value: '12345' },
      ];

      // JSON for API
      const json = formatSecrets(secrets, 'json');
      const parsed = JSON.parse(json);
      expect(Object.keys(parsed)).toHaveLength(3);

      // Export for shell sourcing
      const exported = formatSecrets(secrets, 'export');
      expect(exported.split('\n').every((line) => line.startsWith('export '))).toBe(true);
    });

    it('should group database secrets in TOML', () => {
      const secrets: SecretEntry[] = [
        { key: 'DATABASE_HOST', value: 'localhost' },
        { key: 'DATABASE_PORT', value: '5432' },
        { key: 'DATABASE_NAME', value: 'myapp' },
        { key: 'DATABASE_USER', value: 'admin' },
        { key: 'API_KEY', value: 'secret' },
      ];

      const toml = formatAsTOML(secrets);

      expect(toml).toContain('[database]');
      expect(toml).toContain('HOST = "localhost"');
      expect(toml).toContain('PORT = "5432"');
      // API_KEY should be at root since it's the only one with API prefix
      expect(toml).toContain('API_KEY = "secret"');
    });
  });
});
