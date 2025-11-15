/**
 * Tests for fuzzy matching functionality
 */

import { describe, it, expect } from '@jest/globals';
import { calculateMatchScore, findFuzzyMatches } from '../src/lib/fuzzy-match.js';

describe('calculateMatchScore', () => {
  it('should return highest score for exact case-sensitive match', () => {
    const score = calculateMatchScore('STRIPE_API_KEY', 'STRIPE_API_KEY');
    expect(score).toBe(1100);
  });

  it('should return high score for exact case-insensitive match', () => {
    const score = calculateMatchScore('stripe', 'STRIPE');
    expect(score).toBe(1000);
  });

  it('should return high score for case-sensitive prefix match', () => {
    const score = calculateMatchScore('STRIPE', 'STRIPE_API_KEY');
    expect(score).toBe(950);
  });

  it('should return high score for case-insensitive prefix match', () => {
    const score = calculateMatchScore('stripe', 'STRIPE_API_KEY');
    expect(score).toBe(900);
  });

  it('should return positive score for contains match', () => {
    const score = calculateMatchScore('stripe', 'MY_STRIPE_KEY');
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(900);
  });

  it('should return higher score for matches earlier in string', () => {
    const score1 = calculateMatchScore('key', 'KEY_VALUE');
    const score2 = calculateMatchScore('key', 'MY_VALUE_KEY');
    expect(score1).toBeGreaterThan(score2);
  });

  it('should return high score for word boundary matches', () => {
    const score = calculateMatchScore('stripe', 'MY_STRIPE_KEY');
    expect(score).toBeGreaterThan(400);
  });

  it('should return -1 for non-matching strings', () => {
    const score = calculateMatchScore('xyz', 'STRIPE_API_KEY');
    expect(score).toBe(-1);
  });

  it('should match partial words at word boundaries', () => {
    const score = calculateMatchScore('api', 'STRIPE_API_KEY');
    expect(score).toBeGreaterThan(0);
  });

  it('should be case-insensitive by default', () => {
    const score1 = calculateMatchScore('stripe', 'STRIPE_API_KEY');
    const score2 = calculateMatchScore('STRIPE', 'stripe_api_key');
    expect(score1).toBeGreaterThan(0);
    expect(score2).toBeGreaterThan(0);
  });
});

describe('findFuzzyMatches', () => {
  const testSecrets = [
    { key: 'STRIPE_API_KEY', value: 'sk_test_123' },
    { key: 'STRIPE_SECRET_KEY', value: 'sk_secret_456' },
    { key: 'STRIPE_WEBHOOK_SECRET', value: 'whsec_789' },
    { key: 'DATABASE_URL', value: 'postgres://...' },
    { key: 'MY_STRIPE_TOKEN', value: 'token_abc' },
    { key: 'API_KEY', value: 'api_xyz' },
  ];

  it('should find exact matches', () => {
    const matches = findFuzzyMatches('STRIPE_API_KEY', testSecrets);
    expect(matches).toHaveLength(1);
    expect(matches[0].key).toBe('STRIPE_API_KEY');
    expect(matches[0].value).toBe('sk_test_123');
  });

  it('should find case-insensitive matches', () => {
    const matches = findFuzzyMatches('stripe', testSecrets);
    expect(matches.length).toBeGreaterThan(0);

    // All matches should contain 'stripe' (case-insensitive)
    for (const match of matches) {
      expect(match.key.toLowerCase()).toContain('stripe');
    }
  });

  it('should sort matches by relevance (best first)', () => {
    const matches = findFuzzyMatches('stripe', testSecrets);

    // First match should be better than subsequent matches
    for (let i = 0; i < matches.length - 1; i++) {
      expect(matches[i].score).toBeGreaterThanOrEqual(matches[i + 1].score);
    }
  });

  it('should return empty array for non-matching search', () => {
    const matches = findFuzzyMatches('nonexistent', testSecrets);
    expect(matches).toHaveLength(0);
  });

  it('should prefer prefix matches', () => {
    const matches = findFuzzyMatches('stripe', testSecrets);

    // STRIPE_API_KEY or STRIPE_SECRET_KEY should be first (prefix match)
    // MY_STRIPE_TOKEN should be later (not a prefix)
    const topMatch = matches[0];
    expect(topMatch.key.startsWith('STRIPE')).toBe(true);
  });

  it('should find partial word matches', () => {
    const matches = findFuzzyMatches('api', testSecrets);
    expect(matches.length).toBeGreaterThan(0);

    // Should include both STRIPE_API_KEY and API_KEY
    const keys = matches.map(m => m.key);
    expect(keys).toContain('STRIPE_API_KEY');
    expect(keys).toContain('API_KEY');
  });

  it('should handle single character searches', () => {
    const matches = findFuzzyMatches('s', testSecrets);
    // Should find secrets with 's' or 'S'
    expect(matches.length).toBeGreaterThan(0);
  });

  it('should handle searches with underscores', () => {
    const matches = findFuzzyMatches('api_key', testSecrets);
    expect(matches.length).toBeGreaterThan(0);

    const keys = matches.map(m => m.key);
    expect(keys).toContain('API_KEY');
  });

  it('should preserve original values in results', () => {
    const matches = findFuzzyMatches('stripe', testSecrets);

    for (const match of matches) {
      const original = testSecrets.find(s => s.key === match.key);
      expect(match.value).toBe(original?.value);
    }
  });

  it('should handle empty secrets list', () => {
    const matches = findFuzzyMatches('stripe', []);
    expect(matches).toHaveLength(0);
  });

  it('should handle empty search term', () => {
    const matches = findFuzzyMatches('', testSecrets);
    // Empty search should match nothing
    expect(matches).toHaveLength(0);
  });
});

describe('fuzzy matching edge cases', () => {
  it('should handle secrets with special characters', () => {
    const secrets = [
      { key: 'MY-API-KEY', value: 'value1' },
      { key: 'MY.API.KEY', value: 'value2' },
    ];

    const matches = findFuzzyMatches('api', secrets);
    expect(matches.length).toBeGreaterThan(0);
  });

  it('should handle very long key names', () => {
    const secrets = [
      { key: 'A'.repeat(1000) + '_STRIPE_KEY', value: 'value1' },
    ];

    const matches = findFuzzyMatches('stripe', secrets);
    expect(matches).toHaveLength(1);
  });

  it('should handle numeric search terms', () => {
    const secrets = [
      { key: 'API_V2_KEY', value: 'value1' },
      { key: 'API_V3_KEY', value: 'value2' },
    ];

    const matches = findFuzzyMatches('v2', secrets);
    expect(matches.length).toBeGreaterThan(0);
  });

  it('should prioritize exact matches over partial matches', () => {
    const secrets = [
      { key: 'STRIPE', value: 'exact' },
      { key: 'MY_STRIPE_KEY', value: 'partial' },
      { key: 'STRIPE_API_KEY', value: 'prefix' },
    ];

    const matches = findFuzzyMatches('stripe', secrets);

    // Exact match should be first
    expect(matches[0].key).toBe('STRIPE');
  });
});

describe('space-separated fuzzy matching', () => {
  const testSecrets = [
    { key: 'STRIPE_API_KEY', value: 'sk_test_123' },
    { key: 'STRIPE_SECRET_KEY', value: 'sk_secret_456' },
    { key: 'STRIPE_WEBHOOK_SECRET', value: 'whsec_789' },
    { key: 'DATABASE_URL', value: 'postgres://...' },
    { key: 'MY_STRIPE_TOKEN', value: 'token_abc' },
    { key: 'API_KEY', value: 'api_xyz' },
    { key: 'SUPABASE_ANON_KEY', value: 'anon_key' },
  ];

  it('should match "stripe api" to STRIPE_API_KEY', () => {
    const matches = findFuzzyMatches('stripe api', testSecrets);
    expect(matches.length).toBeGreaterThan(0);

    // Should include STRIPE_API_KEY
    const keys = matches.map(m => m.key);
    expect(keys).toContain('STRIPE_API_KEY');

    // STRIPE_API_KEY should be high in the results
    expect(matches[0].key).toBe('STRIPE_API_KEY');
  });

  it('should match "stripe secret" to STRIPE_SECRET_KEY', () => {
    const matches = findFuzzyMatches('stripe secret', testSecrets);
    expect(matches.length).toBeGreaterThan(0);

    const keys = matches.map(m => m.key);
    expect(keys).toContain('STRIPE_SECRET_KEY');
  });

  it('should match "stripe webhook" to STRIPE_WEBHOOK_SECRET', () => {
    const matches = findFuzzyMatches('stripe webhook', testSecrets);
    expect(matches.length).toBeGreaterThan(0);

    const keys = matches.map(m => m.key);
    expect(keys).toContain('STRIPE_WEBHOOK_SECRET');
  });

  it('should match "api key" to multiple results', () => {
    const matches = findFuzzyMatches('api key', testSecrets);
    expect(matches.length).toBeGreaterThan(0);

    const keys = matches.map(m => m.key);
    // Should match both STRIPE_API_KEY and API_KEY
    expect(keys).toContain('STRIPE_API_KEY');
    expect(keys).toContain('API_KEY');
  });

  it('should handle mixed case with spaces', () => {
    const matches = findFuzzyMatches('StRiPe ApI', testSecrets);
    expect(matches.length).toBeGreaterThan(0);

    const keys = matches.map(m => m.key);
    expect(keys).toContain('STRIPE_API_KEY');
  });

  it('should match "database url" to DATABASE_URL', () => {
    const matches = findFuzzyMatches('database url', testSecrets);
    expect(matches.length).toBeGreaterThan(0);

    expect(matches[0].key).toBe('DATABASE_URL');
  });

  it('should prefer multi-word exact matches', () => {
    const matches = findFuzzyMatches('stripe api key', testSecrets);

    // STRIPE_API_KEY should be the best match
    expect(matches[0].key).toBe('STRIPE_API_KEY');
  });

  it('should handle partial multi-word matches', () => {
    const matches = findFuzzyMatches('supa anon', testSecrets);
    expect(matches.length).toBeGreaterThan(0);

    const keys = matches.map(m => m.key);
    expect(keys).toContain('SUPABASE_ANON_KEY');
  });
});
