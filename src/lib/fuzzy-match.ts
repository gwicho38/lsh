/**
 * Fuzzy matching utilities for secret keys
 */

export interface FuzzyMatchResult {
  key: string;
  value: string;
  score: number; // Higher score = better match
}

/**
 * Normalize a string for fuzzy matching by removing spaces and special chars
 */
function normalizeForMatching(str: string): string {
  // Remove spaces, hyphens, and convert to lowercase
  return str.toLowerCase().replace(/[\s-]/g, '');
}

/**
 * Calculate fuzzy match score between search string and key
 * Returns a score where higher is better, or -1 if no match
 *
 * Supports space-separated searches:
 *  - "stripe api" matches "STRIPE_API_KEY"
 *  - "stripe secret" matches "STRIPE_SECRET_KEY"
 */
export function calculateMatchScore(searchTerm: string, key: string): number {
  // Empty search term matches nothing
  if (!searchTerm || searchTerm.trim() === '') {
    return -1;
  }

  const searchLower = searchTerm.toLowerCase();
  const keyLower = key.toLowerCase();

  // Normalize both for space-insensitive matching
  const searchNormalized = normalizeForMatching(searchTerm);
  const keyNormalized = normalizeForMatching(key);

  // Exact match (case sensitive) - highest priority
  if (searchTerm === key) {
    return 1100;
  }

  // Exact match (case insensitive)
  if (searchLower === keyLower || searchNormalized === keyNormalized) {
    return 1000;
  }

  // Key starts with search term (case sensitive)
  if (key.startsWith(searchTerm)) {
    return 950;
  }

  // Key starts with search term (case insensitive, normalized)
  if (keyLower.startsWith(searchLower) || keyNormalized.startsWith(searchNormalized)) {
    return 900;
  }

  // Check if search with spaces can match multiple words in key
  // e.g., "stripe api" should match "STRIPE_API_KEY"
  // Only do multi-word matching if user provided spaces (not underscores)
  const hasSpaces = /\s/.test(searchTerm);

  if (hasSpaces) {
    const searchWords = searchTerm.toLowerCase().split(/[\s_-]+/).filter(w => w.length > 0);
    const keyWords = key.toLowerCase().split(/[_-]/).filter(w => w.length > 0);

    if (searchWords.length > 1) {
      // Try to match all search words in order within key words
      let matchCount = 0;
      let lastMatchIndex = -1;

      for (const searchWord of searchWords) {
        let found = false;
        for (let i = lastMatchIndex + 1; i < keyWords.length; i++) {
          if (keyWords[i].startsWith(searchWord) || keyWords[i].includes(searchWord)) {
            matchCount++;
            lastMatchIndex = i;
            found = true;
            break;
          }
        }
        if (!found) {
          break; // If any word doesn't match, stop
        }
      }

      // If all search words matched, score based on how many matched
      if (matchCount === searchWords.length) {
        // Perfect multi-word match - higher than substring matches
        return 850 - (lastMatchIndex * 10); // Earlier matches score higher
      } else if (matchCount > 0) {
        // Partial multi-word match
        return 300 + (matchCount * 50);
      }
    }
  }

  // Key contains search term (case insensitive, normalized)
  // Only apply this for single-word searches (no spaces)
  if (!hasSpaces && (keyLower.includes(searchLower) || keyNormalized.includes(searchNormalized))) {
    // Score based on position (earlier is better)
    const position = keyNormalized.indexOf(searchNormalized);
    const relativePosition = position / keyNormalized.length;
    return 500 - (relativePosition * 100);
  }

  // Substring match with underscores/boundaries
  // e.g., "stripe" matches "STRIPE_API_KEY" or "MY_STRIPE_SECRET"
  const words = keyLower.split('_');
  for (let i = 0; i < words.length; i++) {
    if (words[i].startsWith(searchLower)) {
      // Earlier words get higher scores
      return 700 - (i * 50);
    }
    if (words[i].includes(searchLower)) {
      return 400 - (i * 50);
    }
  }

  // No match
  return -1;
}

/**
 * Find fuzzy matches for a search term in a list of key-value pairs
 * Returns matches sorted by relevance (best match first)
 */
export function findFuzzyMatches(
  searchTerm: string,
  secrets: Array<{ key: string; value: string }>
): FuzzyMatchResult[] {
  const results: FuzzyMatchResult[] = [];

  for (const secret of secrets) {
    const score = calculateMatchScore(searchTerm, secret.key);
    if (score >= 0) {
      results.push({
        key: secret.key,
        value: secret.value,
        score,
      });
    }
  }

  // Sort by score (descending - best match first)
  results.sort((a, b) => b.score - a.score);

  return results;
}
