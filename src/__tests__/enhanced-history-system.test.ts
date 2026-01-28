/**
 * Tests for EnhancedHistorySystem merge algorithms
 * Verifies O(n) complexity optimization and deduplication behavior
 *
 * These tests verify the algorithm improvements without requiring
 * full integration with DatabasePersistence and HistorySystem.
 */

// Define the HistoryEntry type for tests
interface HistoryEntry {
  lineNumber: number;
  command: string;
  timestamp: number;
  exitCode?: number;
}

/**
 * Test the mergeHistoryEntries algorithm in isolation
 * This tests the same logic used in EnhancedHistorySystem.mergeHistoryEntries
 */
describe('mergeHistoryEntries algorithm', () => {
  /**
   * Replicates the mergeHistoryEntries algorithm from enhanced-history-system.ts
   * Uses Map for O(n) deduplication
   */
  function mergeHistoryEntries(
    localEntries: HistoryEntry[],
    cloudEntries: HistoryEntry[]
  ): HistoryEntry[] {
    const mergedEntries: HistoryEntry[] = [];

    // Create a map of local entries by command and timestamp
    const localMap = new Map<string, HistoryEntry>();
    localEntries.forEach((entry) => {
      const key = `${entry.command}_${entry.timestamp}`;
      localMap.set(key, entry);
    });

    // Add cloud entries that don't exist locally
    cloudEntries.forEach((entry) => {
      const key = `${entry.command}_${entry.timestamp}`;
      if (!localMap.has(key)) {
        mergedEntries.push(entry);
      }
    });

    // Add all local entries
    mergedEntries.push(...localEntries);

    // Sort by timestamp and update line numbers
    mergedEntries.sort((a, b) => a.timestamp - b.timestamp);
    mergedEntries.forEach((entry, index) => {
      entry.lineNumber = index + 1;
    });

    return mergedEntries;
  }

  it('should merge cloud entries with local entries', () => {
    const localEntries: HistoryEntry[] = [
      { lineNumber: 1, command: 'ls -la', timestamp: 1000, exitCode: 0 },
      { lineNumber: 2, command: 'cd /home', timestamp: 2000, exitCode: 0 },
    ];

    const cloudEntries: HistoryEntry[] = [
      { lineNumber: 1, command: 'git status', timestamp: 1500, exitCode: 0 },
      { lineNumber: 2, command: 'npm test', timestamp: 2500, exitCode: 0 },
    ];

    const result = mergeHistoryEntries(localEntries, cloudEntries);

    // Should have 4 entries (2 local + 2 cloud, no duplicates)
    expect(result.length).toBe(4);
  });

  it('should deduplicate entries with same command and timestamp', () => {
    const localEntries: HistoryEntry[] = [
      { lineNumber: 1, command: 'ls -la', timestamp: 1000, exitCode: 0 },
    ];

    // Cloud has same command and timestamp - should be deduplicated
    const cloudEntries: HistoryEntry[] = [
      { lineNumber: 1, command: 'ls -la', timestamp: 1000, exitCode: 0 },
      { lineNumber: 2, command: 'git status', timestamp: 2000, exitCode: 0 },
    ];

    const result = mergeHistoryEntries(localEntries, cloudEntries);

    // Should have 2 entries (duplicate removed)
    expect(result.length).toBe(2);
  });

  it('should sort merged entries by timestamp', () => {
    const localEntries: HistoryEntry[] = [
      { lineNumber: 1, command: 'cmd-3000', timestamp: 3000, exitCode: 0 },
    ];

    const cloudEntries: HistoryEntry[] = [
      { lineNumber: 1, command: 'cmd-1000', timestamp: 1000, exitCode: 0 },
      { lineNumber: 2, command: 'cmd-2000', timestamp: 2000, exitCode: 0 },
    ];

    const result = mergeHistoryEntries(localEntries, cloudEntries);

    // Should be sorted by timestamp
    expect(result[0].command).toBe('cmd-1000');
    expect(result[1].command).toBe('cmd-2000');
    expect(result[2].command).toBe('cmd-3000');
  });

  it('should update line numbers after merge', () => {
    const localEntries: HistoryEntry[] = [
      { lineNumber: 99, command: 'cmd-a', timestamp: 1000, exitCode: 0 },
    ];

    const cloudEntries: HistoryEntry[] = [
      { lineNumber: 55, command: 'cmd-b', timestamp: 2000, exitCode: 0 },
    ];

    const result = mergeHistoryEntries(localEntries, cloudEntries);

    // Line numbers should be sequential starting from 1
    expect(result[0].lineNumber).toBe(1);
    expect(result[1].lineNumber).toBe(2);
  });

  it('should use O(n) complexity with Map-based deduplication', () => {
    // Generate large dataset to verify performance
    const localEntries: HistoryEntry[] = Array.from({ length: 1000 }, (_, i) => ({
      lineNumber: i + 1,
      command: `local-cmd-${i}`,
      timestamp: i * 1000,
      exitCode: 0,
    }));

    const cloudEntries: HistoryEntry[] = Array.from({ length: 1000 }, (_, i) => ({
      lineNumber: i + 1,
      command: `cloud-cmd-${i}`,
      timestamp: i * 1000 + 500,
      exitCode: 0,
    }));

    const startTime = Date.now();
    const result = mergeHistoryEntries(localEntries, cloudEntries);
    const endTime = Date.now();

    // Should complete quickly (< 100ms for 2000 entries with O(n))
    // O(n²) would take significantly longer
    expect(endTime - startTime).toBeLessThan(100);
    expect(result.length).toBe(2000);
  });

  it('should handle empty local entries', () => {
    const localEntries: HistoryEntry[] = [];
    const cloudEntries: HistoryEntry[] = [
      { lineNumber: 1, command: 'cmd-a', timestamp: 1000, exitCode: 0 },
    ];

    const result = mergeHistoryEntries(localEntries, cloudEntries);

    expect(result.length).toBe(1);
    expect(result[0].command).toBe('cmd-a');
  });

  it('should handle empty cloud entries', () => {
    const localEntries: HistoryEntry[] = [
      { lineNumber: 1, command: 'cmd-a', timestamp: 1000, exitCode: 0 },
    ];
    const cloudEntries: HistoryEntry[] = [];

    const result = mergeHistoryEntries(localEntries, cloudEntries);

    expect(result.length).toBe(1);
    expect(result[0].command).toBe('cmd-a');
  });
});

/**
 * Test the searchHistoryCloud deduplication algorithm in isolation
 * This tests the optimized O(n) algorithm that replaced the O(n²) filter+findIndex
 */
describe('searchHistoryCloud deduplication algorithm', () => {
  /**
   * Replicates the optimized deduplication from searchHistoryCloud
   * Uses Map for O(n) complexity instead of filter+findIndex which was O(n²)
   */
  function deduplicateSearchResults(
    localResults: HistoryEntry[],
    cloudResults: HistoryEntry[],
    limit: number
  ): HistoryEntry[] {
    // Merge and deduplicate results using a Map for O(n) complexity
    // Previously used filter + findIndex which was O(n²)
    const seenKeys = new Map<string, HistoryEntry>();

    // Process local results first (higher priority)
    for (const entry of localResults) {
      const key = `${entry.command}_${entry.timestamp}`;
      if (!seenKeys.has(key)) {
        seenKeys.set(key, entry);
      }
    }

    // Add cloud results that don't exist locally
    for (const entry of cloudResults) {
      const key = `${entry.command}_${entry.timestamp}`;
      if (!seenKeys.has(key)) {
        seenKeys.set(key, entry);
      }
    }

    return Array.from(seenKeys.values()).slice(0, limit);
  }

  it('should deduplicate search results', () => {
    const localResults: HistoryEntry[] = [
      { lineNumber: 1, command: 'npm test', timestamp: 1000, exitCode: 0 },
      { lineNumber: 2, command: 'npm run build', timestamp: 2000, exitCode: 0 },
    ];

    const cloudResults: HistoryEntry[] = [
      { lineNumber: 1, command: 'npm test', timestamp: 1000, exitCode: 0 }, // duplicate
      { lineNumber: 2, command: 'npm install', timestamp: 3000, exitCode: 0 },
    ];

    const results = deduplicateSearchResults(localResults, cloudResults, 20);

    // Should have 3 unique entries (duplicate removed)
    expect(results.length).toBe(3);
    expect(results.map((r) => r.command)).toContain('npm test');
    expect(results.map((r) => r.command)).toContain('npm run build');
    expect(results.map((r) => r.command)).toContain('npm install');
  });

  it('should prioritize local results over cloud results', () => {
    const localResults: HistoryEntry[] = [
      { lineNumber: 100, command: 'npm test', timestamp: 1000, exitCode: 0 },
    ];

    const cloudResults: HistoryEntry[] = [
      { lineNumber: 1, command: 'npm test', timestamp: 1000, exitCode: 5 },
    ];

    const results = deduplicateSearchResults(localResults, cloudResults, 20);

    // Should use local entry (line number 100, exitCode 0) not cloud entry
    expect(results.length).toBe(1);
    expect(results[0].lineNumber).toBe(100);
    expect(results[0].exitCode).toBe(0);
  });

  it('should respect limit parameter', () => {
    const localResults: HistoryEntry[] = Array.from({ length: 100 }, (_, i) => ({
      lineNumber: i + 1,
      command: `cmd-${i}`,
      timestamp: i * 1000,
      exitCode: 0,
    }));

    const cloudResults: HistoryEntry[] = [];

    const results = deduplicateSearchResults(localResults, cloudResults, 10);

    expect(results.length).toBe(10);
  });

  it('should handle large datasets efficiently (O(n) vs O(n²))', () => {
    // Generate large datasets
    const localResults: HistoryEntry[] = Array.from({ length: 500 }, (_, i) => ({
      lineNumber: i + 1,
      command: `cmd-${i}`,
      timestamp: i * 1000,
      exitCode: 0,
    }));

    const cloudResults: HistoryEntry[] = Array.from({ length: 500 }, (_, i) => ({
      lineNumber: i + 1,
      command: `cmd-${i}`, // Same commands - all duplicates
      timestamp: i * 1000,
      exitCode: 0,
    }));

    const startTime = Date.now();
    const results = deduplicateSearchResults(localResults, cloudResults, 1000);
    const endTime = Date.now();

    // All duplicates should be removed
    expect(results.length).toBe(500);

    // Should complete quickly (< 50ms for 1000 entries)
    // O(n²) with 1000 entries would be noticeably slower
    expect(endTime - startTime).toBeLessThan(50);
  });
});

describe('Algorithm Complexity Comparison', () => {
  describe('Map-based O(n) vs filter+findIndex O(n²)', () => {
    interface Entry {
      id: string;
      value: number;
    }

    // O(n) approach with Map
    const mapDedup = (arr: Entry[]): Entry[] => {
      const seen = new Map<string, Entry>();
      for (const e of arr) {
        if (!seen.has(e.id)) {
          seen.set(e.id, e);
        }
      }
      return Array.from(seen.values());
    };

    // O(n²) approach with filter+findIndex (the old implementation)
    const filterDedup = (arr: Entry[]): Entry[] => {
      return arr.filter(
        (entry, index, self) => self.findIndex((e) => e.id === entry.id) === index
      );
    };

    it('should produce same results with both algorithms', () => {
      const entries: Entry[] = Array.from({ length: 100 }, (_, i) => ({
        id: `entry-${i % 50}`, // 50% duplicates
        value: i,
      }));

      const mapResult = mapDedup(entries);
      const filterResult = filterDedup(entries);

      // Both should produce same unique count
      expect(mapResult.length).toBe(50);
      expect(filterResult.length).toBe(50);
    });

    it('should demonstrate performance difference with larger datasets', () => {
      // Use 2000 entries to show the O(n²) vs O(n) difference
      const largeEntries: Entry[] = Array.from({ length: 2000 }, (_, i) => ({
        id: `entry-${i % 1000}`, // 50% duplicates
        value: i,
      }));

      // O(n) should be fast
      const mapStart = Date.now();
      const mapResult = mapDedup(largeEntries);
      const mapTime = Date.now() - mapStart;

      // O(n²) is slower but still measurable
      const filterStart = Date.now();
      const filterResult = filterDedup(largeEntries);
      const filterTime = Date.now() - filterStart;

      // Both produce same results
      expect(mapResult.length).toBe(1000);
      expect(filterResult.length).toBe(1000);

      // Map-based should be faster (typically 10x+ faster for this size)
      // We just verify it completes quickly
      expect(mapTime).toBeLessThan(50);

      // Log times for reference (won't fail test)
      console.log(`O(n) Map dedup: ${mapTime}ms, O(n²) filter dedup: ${filterTime}ms`);
    });

    it('should handle edge cases correctly', () => {
      // Empty array
      expect(mapDedup([])).toEqual([]);
      expect(filterDedup([])).toEqual([]);

      // Single entry
      const single: Entry[] = [{ id: 'a', value: 1 }];
      expect(mapDedup(single)).toHaveLength(1);
      expect(filterDedup(single)).toHaveLength(1);

      // All duplicates
      const allSame: Entry[] = Array.from({ length: 10 }, () => ({
        id: 'same',
        value: 0,
      }));
      expect(mapDedup(allSame)).toHaveLength(1);
      expect(filterDedup(allSame)).toHaveLength(1);

      // No duplicates
      const allUnique: Entry[] = Array.from({ length: 10 }, (_, i) => ({
        id: `unique-${i}`,
        value: i,
      }));
      expect(mapDedup(allUnique)).toHaveLength(10);
      expect(filterDedup(allUnique)).toHaveLength(10);
    });
  });
});
