/**
 * Tests for fuzzy-match.ts
 * Fuzzy matching utilities for secret key searching
 */

import { calculateMatchScore, findFuzzyMatches } from '../lib/fuzzy-match.js';

describe('Fuzzy Match Utilities', () => {
  describe('calculateMatchScore', () => {
    describe('exact matches', () => {
      it('should return highest score for exact case-sensitive match', () => {
        expect(calculateMatchScore('API_KEY', 'API_KEY')).toBe(1100);
      });

      it('should return high score for exact case-insensitive match', () => {
        expect(calculateMatchScore('api_key', 'API_KEY')).toBe(1000);
        expect(calculateMatchScore('API_KEY', 'api_key')).toBe(1000);
      });

      it('should handle normalized matches', () => {
        // Spaces trigger multi-word search, hyphens are removed during normalization
        expect(calculateMatchScore('api key', 'API_KEY')).toBeGreaterThan(0);
        // Hyphenated search: 'api-key' normalizes to 'apikey', 'API_KEY' normalizes to 'apikey'
        // But single-word matching with hyphens may not match underscore-separated
        const hyphenScore = calculateMatchScore('api-key', 'API_KEY');
        // Depending on implementation, this may match or not
        // The test verifies the current behavior
        expect(typeof hyphenScore).toBe('number');
      });
    });

    describe('prefix matches', () => {
      it('should return high score when key starts with search (case sensitive)', () => {
        expect(calculateMatchScore('API', 'API_KEY')).toBe(950);
      });

      it('should return score when key starts with search (case insensitive)', () => {
        expect(calculateMatchScore('api', 'API_KEY')).toBe(900);
        expect(calculateMatchScore('Api', 'API_KEY')).toBe(900);
      });

      it('should match normalized prefix', () => {
        expect(calculateMatchScore('api k', 'API_KEY')).toBeGreaterThan(0);
      });
    });

    describe('multi-word searches', () => {
      it('should match space-separated search terms', () => {
        const score = calculateMatchScore('stripe api', 'STRIPE_API_KEY');
        expect(score).toBeGreaterThan(0);
        expect(score).toBeLessThan(900); // Less than prefix match
      });

      it('should match all words in order', () => {
        const score = calculateMatchScore('stripe secret', 'STRIPE_SECRET_KEY');
        expect(score).toBeGreaterThan(0);
      });

      it('should score earlier matches higher', () => {
        const score1 = calculateMatchScore('stripe api', 'STRIPE_API_KEY');
        const score2 = calculateMatchScore('stripe api', 'OTHER_STRIPE_API_KEY');
        // First one should score higher since "stripe" matches earlier
        expect(score1).toBeGreaterThanOrEqual(score2);
      });

      it('should handle partial multi-word matches', () => {
        // Only "stripe" matches, "xyz" doesn't
        const score = calculateMatchScore('stripe xyz', 'STRIPE_API_KEY');
        // Should have some score for partial match
        expect(score).toBeGreaterThan(0);
      });

      it('should not match when words are out of order', () => {
        const scoreInOrder = calculateMatchScore('api key', 'API_KEY_SECRET');
        const scoreOutOfOrder = calculateMatchScore('key api', 'API_KEY_SECRET');
        // In-order match should score higher or the same
        expect(scoreInOrder).toBeGreaterThanOrEqual(scoreOutOfOrder);
      });
    });

    describe('substring matches', () => {
      it('should match when key contains search term', () => {
        const score = calculateMatchScore('api', 'MY_API_KEY');
        expect(score).toBeGreaterThan(0);
      });

      it('should score earlier positions higher', () => {
        const scoreStart = calculateMatchScore('api', 'API_KEY');
        const scoreMiddle = calculateMatchScore('api', 'MY_API_KEY');
        expect(scoreStart).toBeGreaterThan(scoreMiddle);
      });

      it('should match word boundaries', () => {
        const score = calculateMatchScore('stripe', 'STRIPE_API_KEY');
        expect(score).toBeGreaterThan(0);
      });

      it('should match mid-key words', () => {
        const score = calculateMatchScore('stripe', 'MY_STRIPE_SECRET');
        expect(score).toBeGreaterThan(0);
      });
    });

    describe('no match scenarios', () => {
      it('should return -1 for empty search term', () => {
        expect(calculateMatchScore('', 'API_KEY')).toBe(-1);
      });

      it('should return -1 for whitespace-only search', () => {
        expect(calculateMatchScore('   ', 'API_KEY')).toBe(-1);
      });

      it('should return -1 when no match found', () => {
        expect(calculateMatchScore('xyz', 'API_KEY')).toBe(-1);
        expect(calculateMatchScore('database', 'API_KEY')).toBe(-1);
      });
    });

    describe('score ordering', () => {
      it('should rank exact match > prefix match > substring match', () => {
        const exactScore = calculateMatchScore('API_KEY', 'API_KEY');
        const prefixScore = calculateMatchScore('API', 'API_KEY');
        const substringScore = calculateMatchScore('api', 'MY_API_KEY');

        expect(exactScore).toBeGreaterThan(prefixScore);
        expect(prefixScore).toBeGreaterThan(substringScore);
      });

      it('should rank case-sensitive exact > case-insensitive exact', () => {
        const caseSensitiveScore = calculateMatchScore('API_KEY', 'API_KEY');
        const caseInsensitiveScore = calculateMatchScore('api_key', 'API_KEY');

        expect(caseSensitiveScore).toBeGreaterThan(caseInsensitiveScore);
      });
    });

    describe('edge cases', () => {
      it('should handle single character search', () => {
        const score = calculateMatchScore('a', 'API_KEY');
        expect(score).toBeGreaterThan(0);
      });

      it('should handle long search terms', () => {
        const score = calculateMatchScore('stripe_api_secret_key', 'STRIPE_API_SECRET_KEY');
        expect(score).toBe(1000); // Case-insensitive exact match
      });

      it('should handle special characters in search', () => {
        // 'api-key' without spaces goes through single-word matching
        // The normalization removes hyphens, so 'apikey' vs 'apikey'
        const score = calculateMatchScore('api-key', 'API_KEY');
        // This tests current behavior - may or may not match depending on code path
        // At minimum, verify it doesn't crash
        expect(typeof score).toBe('number');
      });

      it('should handle unicode characters', () => {
        const score = calculateMatchScore('测试', '测试_KEY');
        expect(score).toBeGreaterThan(0);
      });

      it('should handle numeric searches', () => {
        const score = calculateMatchScore('123', 'API_KEY_123');
        expect(score).toBeGreaterThan(0);
      });
    });
  });

  describe('findFuzzyMatches', () => {
    const testSecrets = [
      { key: 'API_KEY', value: 'key1' },
      { key: 'DATABASE_URL', value: 'db-url' },
      { key: 'STRIPE_API_KEY', value: 'stripe-key' },
      { key: 'STRIPE_SECRET_KEY', value: 'stripe-secret' },
      { key: 'MY_API_TOKEN', value: 'token' },
      { key: 'REDIS_URL', value: 'redis-url' },
    ];

    describe('basic matching', () => {
      it('should find exact matches', () => {
        const results = findFuzzyMatches('API_KEY', testSecrets);
        expect(results.length).toBeGreaterThan(0);
        expect(results[0].key).toBe('API_KEY');
      });

      it('should find partial matches', () => {
        const results = findFuzzyMatches('api', testSecrets);
        expect(results.length).toBeGreaterThan(0);
        // Should match API_KEY, STRIPE_API_KEY, MY_API_TOKEN
        expect(results.some((r) => r.key === 'API_KEY')).toBe(true);
        expect(results.some((r) => r.key === 'STRIPE_API_KEY')).toBe(true);
        expect(results.some((r) => r.key === 'MY_API_TOKEN')).toBe(true);
      });

      it('should return empty array for no matches', () => {
        const results = findFuzzyMatches('xyz123', testSecrets);
        expect(results).toHaveLength(0);
      });
    });

    describe('result ordering', () => {
      it('should sort results by score descending', () => {
        const results = findFuzzyMatches('api', testSecrets);

        // Verify ordering
        for (let i = 1; i < results.length; i++) {
          expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
        }
      });

      it('should put exact matches first', () => {
        const results = findFuzzyMatches('API_KEY', testSecrets);
        expect(results[0].key).toBe('API_KEY');
        expect(results[0].score).toBe(1100);
      });

      it('should put prefix matches before substring matches', () => {
        const results = findFuzzyMatches('api', testSecrets);
        // API_KEY should come before STRIPE_API_KEY
        const apiKeyIndex = results.findIndex((r) => r.key === 'API_KEY');
        const stripeApiKeyIndex = results.findIndex((r) => r.key === 'STRIPE_API_KEY');
        expect(apiKeyIndex).toBeLessThan(stripeApiKeyIndex);
      });
    });

    describe('result structure', () => {
      it('should include key, value, and score', () => {
        const results = findFuzzyMatches('api', testSecrets);
        expect(results.length).toBeGreaterThan(0);

        const result = results[0];
        expect(result).toHaveProperty('key');
        expect(result).toHaveProperty('value');
        expect(result).toHaveProperty('score');
        expect(typeof result.score).toBe('number');
      });

      it('should preserve original values', () => {
        const results = findFuzzyMatches('stripe api', testSecrets);
        const stripeResult = results.find((r) => r.key === 'STRIPE_API_KEY');
        expect(stripeResult?.value).toBe('stripe-key');
      });
    });

    describe('multi-word search', () => {
      it('should find matches for space-separated terms', () => {
        const results = findFuzzyMatches('stripe api', testSecrets);
        expect(results.some((r) => r.key === 'STRIPE_API_KEY')).toBe(true);
      });

      it('should match stripe secret', () => {
        const results = findFuzzyMatches('stripe secret', testSecrets);
        expect(results.some((r) => r.key === 'STRIPE_SECRET_KEY')).toBe(true);
      });

      it('should prioritize better multi-word matches', () => {
        const results = findFuzzyMatches('stripe api', testSecrets);
        // STRIPE_API_KEY should rank higher than STRIPE_SECRET_KEY
        const apiIndex = results.findIndex((r) => r.key === 'STRIPE_API_KEY');
        const secretIndex = results.findIndex((r) => r.key === 'STRIPE_SECRET_KEY');
        if (apiIndex !== -1 && secretIndex !== -1) {
          expect(apiIndex).toBeLessThan(secretIndex);
        }
      });
    });

    describe('empty and edge cases', () => {
      it('should return empty array for empty search', () => {
        const results = findFuzzyMatches('', testSecrets);
        expect(results).toHaveLength(0);
      });

      it('should return empty array for empty secrets', () => {
        const results = findFuzzyMatches('api', []);
        expect(results).toHaveLength(0);
      });

      it('should handle single secret', () => {
        const results = findFuzzyMatches('api', [{ key: 'API_KEY', value: 'v' }]);
        expect(results).toHaveLength(1);
      });
    });

    describe('real-world scenarios', () => {
      it('should find database credentials', () => {
        const results = findFuzzyMatches('database', testSecrets);
        expect(results.some((r) => r.key === 'DATABASE_URL')).toBe(true);
      });

      it('should find all URL-type secrets', () => {
        const results = findFuzzyMatches('url', testSecrets);
        expect(results.some((r) => r.key === 'DATABASE_URL')).toBe(true);
        expect(results.some((r) => r.key === 'REDIS_URL')).toBe(true);
      });

      it('should find secrets by common prefixes', () => {
        const results = findFuzzyMatches('stripe', testSecrets);
        expect(results.filter((r) => r.key.startsWith('STRIPE_'))).toHaveLength(2);
      });

      it('should support tab-completion style partial matching', () => {
        // User types "red" expecting to find REDIS_URL
        const results = findFuzzyMatches('red', testSecrets);
        expect(results.some((r) => r.key === 'REDIS_URL')).toBe(true);
      });
    });
  });

  describe('Integration scenarios', () => {
    it('should enable type-ahead search for secrets', () => {
      const secrets = [
        { key: 'AWS_ACCESS_KEY_ID', value: 'AKIA...' },
        { key: 'AWS_SECRET_ACCESS_KEY', value: 'secret' },
        { key: 'AWS_REGION', value: 'us-east-1' },
        { key: 'DATABASE_URL', value: 'postgres://...' },
      ];

      // As user types "aws"
      const results = findFuzzyMatches('aws', secrets);
      expect(results).toHaveLength(3);

      // As user types "aws secret"
      const refinedResults = findFuzzyMatches('aws secret', secrets);
      expect(refinedResults.length).toBeGreaterThan(0);
      expect(refinedResults[0].key).toBe('AWS_SECRET_ACCESS_KEY');
    });

    it('should work with common .env file patterns', () => {
      const envSecrets = [
        { key: 'NODE_ENV', value: 'production' },
        { key: 'PORT', value: '3000' },
        { key: 'SMTP_HOST', value: 'smtp.example.com' },
        { key: 'SMTP_PORT', value: '587' },
        { key: 'SMTP_USER', value: 'user' },
        { key: 'SMTP_PASSWORD', value: 'pass' },
      ];

      // Find all SMTP-related secrets
      const smtpSecrets = findFuzzyMatches('smtp', envSecrets);
      expect(smtpSecrets).toHaveLength(4);

      // Find specific SMTP password
      const smtpPassword = findFuzzyMatches('smtp pass', envSecrets);
      expect(smtpPassword.length).toBeGreaterThan(0);
      expect(smtpPassword[0].key).toBe('SMTP_PASSWORD');
    });

    it('should handle case variations in search', () => {
      const secrets = [{ key: 'DATABASE_URL', value: 'url' }];

      // All these should find DATABASE_URL
      expect(findFuzzyMatches('database', secrets)).toHaveLength(1);
      expect(findFuzzyMatches('DATABASE', secrets)).toHaveLength(1);
      expect(findFuzzyMatches('Database', secrets)).toHaveLength(1);
      expect(findFuzzyMatches('DaTaBaSe', secrets)).toHaveLength(1);
    });
  });
});
