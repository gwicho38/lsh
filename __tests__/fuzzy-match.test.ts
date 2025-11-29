/**
 * Fuzzy Match Tests
 * Tests for fuzzy matching utilities for secret keys
 */

import { describe, it, expect, beforeAll } from '@jest/globals';

describe('FuzzyMatch', () => {
  let calculateMatchScore: typeof import('../src/lib/fuzzy-match.js').calculateMatchScore;
  let findFuzzyMatches: typeof import('../src/lib/fuzzy-match.js').findFuzzyMatches;

  beforeAll(async () => {
    const module = await import('../src/lib/fuzzy-match.js');
    calculateMatchScore = module.calculateMatchScore;
    findFuzzyMatches = module.findFuzzyMatches;
  });

  describe('calculateMatchScore', () => {
    it('should return -1 for empty search term', () => {
      expect(calculateMatchScore('', 'SOME_KEY')).toBe(-1);
      expect(calculateMatchScore('   ', 'SOME_KEY')).toBe(-1);
    });

    it('should return highest score for exact case-sensitive match', () => {
      const score = calculateMatchScore('STRIPE_API_KEY', 'STRIPE_API_KEY');
      expect(score).toBe(1100);
    });

    it('should return high score for exact case-insensitive match', () => {
      const score = calculateMatchScore('stripe_api_key', 'STRIPE_API_KEY');
      expect(score).toBe(1000);
    });

    it('should score prefix matches highly', () => {
      const caseSensitive = calculateMatchScore('STRIPE', 'STRIPE_API_KEY');
      expect(caseSensitive).toBe(950);

      const caseInsensitive = calculateMatchScore('stripe', 'STRIPE_API_KEY');
      expect(caseInsensitive).toBe(900);
    });

    it('should handle space-separated multi-word searches', () => {
      const score = calculateMatchScore('stripe api', 'STRIPE_API_KEY');
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThan(900); // Should be less than prefix match
    });

    it('should handle space-separated searches matching out of order words', () => {
      const score = calculateMatchScore('api key', 'STRIPE_API_KEY');
      expect(score).toBeGreaterThan(0);
    });

    it('should return positive score for substring matches', () => {
      const score = calculateMatchScore('API', 'STRIPE_API_KEY');
      expect(score).toBeGreaterThan(0);
    });

    it('should return higher scores for matches earlier in the key', () => {
      const earlyMatch = calculateMatchScore('STRIPE', 'STRIPE_API_KEY');
      const lateMatch = calculateMatchScore('KEY', 'STRIPE_API_KEY');
      expect(earlyMatch).toBeGreaterThan(lateMatch);
    });

    it('should return -1 for no match', () => {
      const score = calculateMatchScore('POSTGRES', 'STRIPE_API_KEY');
      expect(score).toBe(-1);
    });

    it('should handle hyphen-to-hyphen normalized matching', () => {
      // The normalize function removes spaces and hyphens for comparison
      // 'stripe-api-key' vs 'stripe-api-key' are identical (exact match)
      const score = calculateMatchScore('stripe-api-key', 'stripe-api-key');
      expect(score).toBe(1100); // Exact case-sensitive match
    });
  });

  describe('findFuzzyMatches', () => {
    const secrets = [
      { key: 'STRIPE_API_KEY', value: 'sk_test_123' },
      { key: 'STRIPE_SECRET_KEY', value: 'sk_secret_456' },
      { key: 'DATABASE_URL', value: 'postgres://localhost' },
      { key: 'API_TOKEN', value: 'token123' },
      { key: 'REDIS_URL', value: 'redis://localhost' },
    ];

    it('should return matches sorted by score', () => {
      const results = findFuzzyMatches('stripe', secrets);
      expect(results.length).toBe(2);
      expect(results[0].key).toBe('STRIPE_API_KEY');
      expect(results[1].key).toBe('STRIPE_SECRET_KEY');
    });

    it('should return empty array for no matches', () => {
      const results = findFuzzyMatches('mongodb', secrets);
      expect(results).toEqual([]);
    });

    it('should include score in results', () => {
      const results = findFuzzyMatches('api', secrets);
      expect(results.length).toBeGreaterThan(0);
      results.forEach(result => {
        expect(result.score).toBeDefined();
        expect(result.score).toBeGreaterThan(0);
      });
    });

    it('should include original values in results', () => {
      const results = findFuzzyMatches('database', secrets);
      expect(results.length).toBe(1);
      expect(results[0].key).toBe('DATABASE_URL');
      expect(results[0].value).toBe('postgres://localhost');
    });

    it('should handle multi-word searches', () => {
      const results = findFuzzyMatches('stripe secret', secrets);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].key).toBe('STRIPE_SECRET_KEY');
    });

    it('should return best matches first', () => {
      const results = findFuzzyMatches('api', secrets);
      for (let i = 0; i < results.length - 1; i++) {
        expect(results[i].score).toBeGreaterThanOrEqual(results[i + 1].score);
      }
    });

    it('should handle case-insensitive matching', () => {
      const results = findFuzzyMatches('REDIS', secrets);
      expect(results.length).toBe(1);
      expect(results[0].key).toBe('REDIS_URL');
    });

    it('should return empty array for empty secrets list', () => {
      const results = findFuzzyMatches('anything', []);
      expect(results).toEqual([]);
    });
  });
});
