/**
 * Log File Extractor
 * Utility for extracting relevant log entries from log files
 * based on patterns and filters.
 */
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
export declare function extractRelevantLogs(filePath: string, options: LogFileExtractorOptions): Promise<string[]>;
/**
 * Extract error logs from a file
 */
export declare function extractErrors(filePath: string, options?: Partial<LogFileExtractorOptions>): Promise<string[]>;
/**
 * Extract warning logs from a file
 */
export declare function extractWarnings(filePath: string, options?: Partial<LogFileExtractorOptions>): Promise<string[]>;
/**
 * Extract logs from the last N minutes
 */
export declare function extractRecent(filePath: string, minutes: number, options?: Partial<LogFileExtractorOptions>): Promise<string[]>;
/**
 * Get summary statistics from a log file
 */
export declare function getLogStatistics(filePath: string): Promise<{
    totalLines: number;
    errorCount: number;
    warningCount: number;
    infoCount: number;
    debugCount: number;
}>;
declare const _default: {
    extractRelevantLogs: typeof extractRelevantLogs;
    extractErrors: typeof extractErrors;
    extractWarnings: typeof extractWarnings;
    extractRecent: typeof extractRecent;
    getLogStatistics: typeof getLogStatistics;
};
export default _default;
