/**
 * Fuzzy matching utilities for secret keys
 */
export interface FuzzyMatchResult {
    key: string;
    value: string;
    score: number;
}
/**
 * Calculate fuzzy match score between search string and key
 * Returns a score where higher is better, or -1 if no match
 *
 * Supports space-separated searches:
 *  - "stripe api" matches "STRIPE_API_KEY"
 *  - "stripe secret" matches "STRIPE_SECRET_KEY"
 */
export declare function calculateMatchScore(searchTerm: string, key: string): number;
/**
 * Find fuzzy matches for a search term in a list of key-value pairs
 * Returns matches sorted by relevance (best match first)
 */
export declare function findFuzzyMatches(searchTerm: string, secrets: Array<{
    key: string;
    value: string;
}>): FuzzyMatchResult[];
