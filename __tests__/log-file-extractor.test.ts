/**
 * Tests for Log File Extractor utility
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { extractRelevantLogs, LogFileExtractorOptions } from '../src/services/log-file-extractor.js';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

describe('Log File Extractor', () => {
  let tempDir: string;
  let testLogFile: string;

  beforeEach(async () => {
    // Create temp directory for test files
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'log-extractor-test-'));
    testLogFile = path.join(tempDir, 'test.log');
  });

  afterEach(async () => {
    // Clean up temp directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (_error) {
      // Ignore cleanup errors
    }
  });

  describe('extractRelevantLogs', () => {
    it('should extract logs matching a pattern', async () => {
      const logContent = `
2025-01-15 10:00:00 INFO  Application started
2025-01-15 10:00:01 DEBUG User logged in
2025-01-15 10:00:02 ERROR Database connection failed
2025-01-15 10:00:03 WARN  Slow query detected
2025-01-15 10:00:04 ERROR File not found
      `.trim();

      await fs.writeFile(testLogFile, logContent);

      const options: LogFileExtractorOptions = {
        pattern: /ERROR/,
      };

      const result = await extractRelevantLogs(testLogFile, options);

      expect(result).toHaveLength(2);
      expect(result[0]).toContain('Database connection failed');
      expect(result[1]).toContain('File not found');
    });

    it('should limit number of extracted lines', async () => {
      const logLines = Array.from({ length: 100 }, (_, i) =>
        `2025-01-15 10:00:${i.toString().padStart(2, '0')} ERROR Error ${i}`
      );

      await fs.writeFile(testLogFile, logLines.join('\n'));

      const options: LogFileExtractorOptions = {
        pattern: /ERROR/,
        maxLines: 10,
      };

      const result = await extractRelevantLogs(testLogFile, options);

      expect(result).toHaveLength(10);
    });

    it('should extract logs from last N lines only', async () => {
      const logLines = Array.from({ length: 100 }, (_, i) =>
        `2025-01-15 10:00:${i.toString().padStart(2, '0')} INFO Line ${i}`
      );

      await fs.writeFile(testLogFile, logLines.join('\n'));

      const options: LogFileExtractorOptions = {
        pattern: /Line 9/,
        tailLines: 20, // Only look at last 20 lines
      };

      const result = await extractRelevantLogs(testLogFile, options);

      // Should only find "Line 90-99" in last 20 lines
      expect(result.length).toBeGreaterThan(0);
      expect(result.every(line => /Line 9[0-9]/.test(line))).toBe(true);
    });

    it('should include context lines before and after matches', async () => {
      const logContent = `
Line 1
Line 2
Line 3
ERROR: Critical failure
Line 5
Line 6
Line 7
      `.trim();

      await fs.writeFile(testLogFile, logContent);

      const options: LogFileExtractorOptions = {
        pattern: /ERROR/,
        contextBefore: 2,
        contextAfter: 2,
      };

      const result = await extractRelevantLogs(testLogFile, options);

      // Should get: Line 2, Line 3, ERROR line, Line 5, Line 6
      expect(result).toHaveLength(5);
      expect(result[0]).toContain('Line 2');
      expect(result[2]).toContain('ERROR');
      expect(result[4]).toContain('Line 6');
    });

    it('should handle non-existent file', async () => {
      const nonExistent = path.join(tempDir, 'does-not-exist.log');

      const options: LogFileExtractorOptions = {
        pattern: /ERROR/,
      };

      await expect(extractRelevantLogs(nonExistent, options)).rejects.toThrow();
    });

    it('should handle empty file', async () => {
      await fs.writeFile(testLogFile, '');

      const options: LogFileExtractorOptions = {
        pattern: /ERROR/,
      };

      const result = await extractRelevantLogs(testLogFile, options);

      expect(result).toHaveLength(0);
    });

    it('should handle case-insensitive patterns', async () => {
      const logContent = `
error: lowercase
ERROR: uppercase
ErRoR: mixed case
      `.trim();

      await fs.writeFile(testLogFile, logContent);

      const options: LogFileExtractorOptions = {
        pattern: /error/i, // case-insensitive
      };

      const result = await extractRelevantLogs(testLogFile, options);

      expect(result).toHaveLength(3);
    });

    it('should handle multiple patterns', async () => {
      const logContent = `
INFO: Normal operation
ERROR: Something failed
WARN: Be careful
CRITICAL: System down
DEBUG: Debugging info
      `.trim();

      await fs.writeFile(testLogFile, logContent);

      const options: LogFileExtractorOptions = {
        pattern: /(ERROR|CRITICAL|WARN)/,
      };

      const result = await extractRelevantLogs(testLogFile, options);

      expect(result).toHaveLength(3);
      expect(result.some(line => line.includes('ERROR'))).toBe(true);
      expect(result.some(line => line.includes('WARN'))).toBe(true);
      expect(result.some(line => line.includes('CRITICAL'))).toBe(true);
    });

    it('should handle very large files efficiently', async () => {
      // Create a large log file (10,000 lines)
      const logLines = Array.from({ length: 10000 }, (_, i) =>
        i % 100 === 0 ? `ERROR Line ${i}` : `INFO Line ${i}`
      );

      await fs.writeFile(testLogFile, logLines.join('\n'));

      const options: LogFileExtractorOptions = {
        pattern: /ERROR/,
        maxLines: 50,
      };

      const startTime = Date.now();
      const result = await extractRelevantLogs(testLogFile, options);
      const duration = Date.now() - startTime;

      expect(result).toHaveLength(50);
      // Should complete reasonably fast (< 1 second for 10k lines)
      expect(duration).toBeLessThan(1000);
    });

    it('should preserve line formatting', async () => {
      const logContent = `
2025-01-15 10:00:00 ERROR   Spaced correctly
\t2025-01-15 10:00:01 ERROR\tWith tabs
      `.trim();

      await fs.writeFile(testLogFile, logContent);

      const options: LogFileExtractorOptions = {
        pattern: /ERROR/,
      };

      const result = await extractRelevantLogs(testLogFile, options);

      expect(result[0]).toContain('   Spaced correctly');
      expect(result[1]).toContain('\tWith tabs');
    });
  });
});
