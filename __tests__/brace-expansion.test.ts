/**
 * Tests for Brace Expansion
 * Tests patterns like {a,b,c}, {1..5}, {a..z}, etc.
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { BraceExpander } from '../src/lib/brace-expansion';

describe('Brace Expansion', () => {
  let expander: BraceExpander;

  beforeEach(() => {
    expander = new BraceExpander();
  });

  describe('Basic Expansion', () => {
    it('should expand simple comma-separated list', () => {
      const result = expander.expandBraces('file{a,b,c}.txt');
      expect(result).toEqual(['filea.txt', 'fileb.txt', 'filec.txt']);
    });

    it('should expand at the beginning', () => {
      const result = expander.expandBraces('{a,b,c}file.txt');
      expect(result).toEqual(['afile.txt', 'bfile.txt', 'cfile.txt']);
    });

    it('should expand at the end', () => {
      const result = expander.expandBraces('file.{txt,md,js}');
      expect(result).toEqual(['file.txt', 'file.md', 'file.js']);
    });

    it('should handle single element (no expansion)', () => {
      // Single element in braces doesn't expand (POSIX behavior)
      const result = expander.expandBraces('file{a}.txt');
      expect(result).toEqual(['file{a}.txt']);
    });

    it('should return original string when no braces', () => {
      const result = expander.expandBraces('file.txt');
      expect(result).toEqual(['file.txt']);
    });

    it('should handle empty braces', () => {
      const result = expander.expandBraces('file{}.txt');
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('Nested Expansion', () => {
    it('should handle nested braces', () => {
      const result = expander.expandBraces('{a,b{1,2}}.txt');
      expect(result).toContain('a.txt');
      expect(result).toContain('b1.txt');
      expect(result).toContain('b2.txt');
    });

    it('should handle multiple expansions', () => {
      const result = expander.expandBraces('file{1,2}.{txt,md}');
      expect(result).toContain('file1.txt');
      expect(result).toContain('file1.md');
      expect(result).toContain('file2.txt');
      expect(result).toContain('file2.md');
    });
  });

  describe('Numeric Range Expansion', () => {
    it('should expand numeric range', () => {
      const result = expander.expandBraces('file{1..3}.txt');
      expect(result).toEqual(['file1.txt', 'file2.txt', 'file3.txt']);
    });

    it('should expand reverse numeric range', () => {
      const result = expander.expandBraces('file{3..1}.txt');
      expect(result).toEqual(['file3.txt', 'file2.txt', 'file1.txt']);
    });

    it('should handle zero-padded numbers', () => {
      const result = expander.expandBraces('file{01..03}.txt');
      expect(result.length).toBe(3);
    });

    it('should handle negative numbers', () => {
      const result = expander.expandBraces('file{-2..2}.txt');
      expect(result.length).toBe(5);
    });
  });

  describe('Alphabetic Range Expansion', () => {
    it('should expand alphabetic range', () => {
      const result = expander.expandBraces('file{a..c}.txt');
      expect(result).toEqual(['filea.txt', 'fileb.txt', 'filec.txt']);
    });

    it('should expand reverse alphabetic range', () => {
      const result = expander.expandBraces('file{c..a}.txt');
      expect(result).toEqual(['filec.txt', 'fileb.txt', 'filea.txt']);
    });

    it('should handle uppercase letters', () => {
      const result = expander.expandBraces('file{A..C}.txt');
      expect(result).toEqual(['fileA.txt', 'fileB.txt', 'fileC.txt']);
    });
  });

  describe('Edge Cases', () => {
    it('should handle unmatched opening brace', () => {
      const result = expander.expandBraces('file{a,b.txt');
      expect(result.length).toBe(1);
    });

    it('should handle unmatched closing brace', () => {
      const result = expander.expandBraces('filea,b}.txt');
      expect(result.length).toBe(1);
    });

    it('should handle empty string', () => {
      const result = expander.expandBraces('');
      expect(result).toEqual(['']);
    });

    it('should handle just braces', () => {
      const result = expander.expandBraces('{a,b,c}');
      expect(result).toEqual(['a', 'b', 'c']);
    });

    it('should handle whitespace in expansions', () => {
      const result = expander.expandBraces('file{a, b, c}.txt');
      expect(result.length).toBe(3);
    });
  });

  describe('Excessive Expansion Protection', () => {
    it('should limit expansions with custom max', () => {
      const limitedExpander = new BraceExpander({ maxExpansions: 10 });
      const result = limitedExpander.expandBraces('{1..100}.{a..z}.txt');
      // Should return original pattern if too many expansions
      expect(result.length).toBeLessThanOrEqual(10);
    });

    it('should handle default max expansions', () => {
      const result = expander.expandBraces('{1..5}.txt');
      expect(result.length).toBe(5);
    });
  });

  describe('Real World Use Cases', () => {
    it('should expand backup file patterns', () => {
      const result = expander.expandBraces('backup{-2024-01-{01..03}}.tar.gz');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should expand log file patterns', () => {
      const result = expander.expandBraces('app.log.{1..7}');
      expect(result).toEqual([
        'app.log.1',
        'app.log.2',
        'app.log.3',
        'app.log.4',
        'app.log.5',
        'app.log.6',
        'app.log.7',
      ]);
    });

    it('should expand directory patterns', () => {
      const result = expander.expandBraces('/var/log/{apache,nginx}/access.log');
      expect(result).toEqual([
        '/var/log/apache/access.log',
        '/var/log/nginx/access.log',
      ]);
    });

    it('should expand test file patterns', () => {
      const result = expander.expandBraces('test{1..3}.spec.{ts,js}');
      expect(result).toContain('test1.spec.ts');
      expect(result).toContain('test1.spec.js');
      expect(result).toContain('test2.spec.ts');
      expect(result).toContain('test2.spec.js');
      expect(result).toContain('test3.spec.ts');
      expect(result).toContain('test3.spec.js');
    });
  });

  describe('Complex Patterns', () => {
    it('should handle multiple comma-separated expansions', () => {
      const result = expander.expandBraces('{a,b,c,d,e}.txt');
      expect(result.length).toBe(5);
    });

    it('should handle mixed patterns', () => {
      const result = expander.expandBraces('file-{prod,dev}-{1..2}.log');
      expect(result).toContain('file-prod-1.log');
      expect(result).toContain('file-prod-2.log');
      expect(result).toContain('file-dev-1.log');
      expect(result).toContain('file-dev-2.log');
    });

    it('should preserve order in expansions', () => {
      const result = expander.expandBraces('{z,a,m}.txt');
      expect(result).toEqual(['z.txt', 'a.txt', 'm.txt']);
    });
  });
});
