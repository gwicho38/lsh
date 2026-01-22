/**
 * Log File Extractor
 * Utility for extracting relevant log entries from log files
 * based on patterns and filters.
 */

import fs from 'fs/promises';
import readline from 'readline';
import { createReadStream as _createReadStream } from 'fs';

export interface LogFileExtractorOptions {
  /** Regular expression pattern to match log lines */
  pattern: RegExp;

  /** Maximum number of matching lines to extract */
  maxLines?: number;

  /** Number of lines to read from the end of the file (tail) */
  tailLines?: number;

  /** Number of context lines to include before each match */
  contextBefore?: number;

  /** Number of context lines to include after each match */
  contextAfter?: number;
}

/**
 * Extract relevant log entries from a log file
 */
// TODO(@gwicho38): Review - extractRelevantLogs
export async function extractRelevantLogs(
  filePath: string,
  options: LogFileExtractorOptions
): Promise<string[]> {
  const {
    pattern,
    maxLines = 1000,
    tailLines,
    contextBefore = 0,
    contextAfter = 0,
  } = options;

  // Read the file
  const fileHandle = await fs.open(filePath, 'r');
  const stream = fileHandle.createReadStream();
  const rl = readline.createInterface({
    input: stream,
    crlfDelay: Infinity,
  });

  const allLines: string[] = [];
  const matchingIndices: number[] = [];
  const result: string[] = [];

  // If tailLines is specified, we need to buffer all lines first
  if (tailLines !== undefined) {
    for await (const line of rl) {
      allLines.push(line);
    }

    // Only process last N lines
    const startIndex = Math.max(0, allLines.length - tailLines);
    const linesToProcess = allLines.slice(startIndex);

    // Find matching lines
    linesToProcess.forEach((line, index) => {
      if (pattern.test(line)) {
        matchingIndices.push(startIndex + index);
      }
    });
  } else {
    // Process line by line without buffering all
    let lineIndex = 0;
    for await (const line of rl) {
      allLines.push(line);

      if (pattern.test(line)) {
        matchingIndices.push(lineIndex);
      }

      lineIndex++;

      // Stop if we have enough matches (considering context)
      if (matchingIndices.length >= maxLines) {
        break;
      }
    }
  }

  await fileHandle.close();

  // Extract lines with context
  const includedIndices = new Set<number>();

  for (const matchIndex of matchingIndices) {
    if (result.length >= maxLines) {
      break;
    }

    // Calculate range of lines to include
    const startIndex = Math.max(0, matchIndex - contextBefore);
    const endIndex = Math.min(allLines.length - 1, matchIndex + contextAfter);

    for (let i = startIndex; i <= endIndex; i++) {
      if (!includedIndices.has(i)) {
        result.push(allLines[i]);
        includedIndices.add(i);
      }
    }
  }

  return result.slice(0, maxLines);
}

/**
 * Extract error logs from a file
 */
// TODO(@gwicho38): Review - extractErrors
export async function extractErrors(
  filePath: string,
  options?: Partial<LogFileExtractorOptions>
): Promise<string[]> {
  return extractRelevantLogs(filePath, {
    pattern: /ERROR|FATAL|CRITICAL/i,
    maxLines: 100,
    contextBefore: 2,
    contextAfter: 2,
    ...options,
  });
}

/**
 * Extract warning logs from a file
 */
// TODO(@gwicho38): Review - extractWarnings
export async function extractWarnings(
  filePath: string,
  options?: Partial<LogFileExtractorOptions>
): Promise<string[]> {
  return extractRelevantLogs(filePath, {
    pattern: /WARN|WARNING/i,
    maxLines: 100,
    contextBefore: 1,
    contextAfter: 1,
    ...options,
  });
}

/**
 * Extract logs from the last N minutes
 */
// TODO(@gwicho38): Review - extractRecent
export async function extractRecent(
  filePath: string,
  minutes: number,
  options?: Partial<LogFileExtractorOptions>
): Promise<string[]> {
  const now = new Date();
  const cutoffTime = new Date(now.getTime() - minutes * 60 * 1000);

  // Common timestamp patterns
  const timestampPattern = /\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}/;

  return extractRelevantLogs(filePath, {
    pattern: timestampPattern,
    maxLines: 1000,
    ...options,
  }).then((lines) => {
    // Filter lines by timestamp
    return lines.filter((line) => {
      const match = line.match(timestampPattern);
      if (match) {
        try {
          const lineTime = new Date(match[0].replace(' ', 'T'));
          return lineTime >= cutoffTime;
        } catch (_error) {
          return false;
        }
      }
      return false;
    });
  });
}

/**
 * Get summary statistics from a log file
 */
// TODO(@gwicho38): Review - getLogStatistics
export async function getLogStatistics(filePath: string): Promise<{
  totalLines: number;
  errorCount: number;
  warningCount: number;
  infoCount: number;
  debugCount: number;
}> {
  const fileHandle = await fs.open(filePath, 'r');
  const stream = fileHandle.createReadStream();
  const rl = readline.createInterface({
    input: stream,
    crlfDelay: Infinity,
  });

  let totalLines = 0;
  let errorCount = 0;
  let warningCount = 0;
  let infoCount = 0;
  let debugCount = 0;

  for await (const line of rl) {
    totalLines++;

    if (/ERROR|FATAL|CRITICAL/i.test(line)) {
      errorCount++;
    } else if (/WARN|WARNING/i.test(line)) {
      warningCount++;
    } else if (/INFO/i.test(line)) {
      infoCount++;
    } else if (/DEBUG|TRACE/i.test(line)) {
      debugCount++;
    }
  }

  await fileHandle.close();

  return {
    totalLines,
    errorCount,
    warningCount,
    infoCount,
    debugCount,
  };
}

export default {
  extractRelevantLogs,
  extractErrors,
  extractWarnings,
  extractRecent,
  getLogStatistics,
};
