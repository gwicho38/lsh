/**
 * Logging Framework
 * Centralized logging utility with support for different log levels,
 * structured logging, and environment-based configuration.
 */
export declare enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3,
    NONE = 4
}
export interface LogEntry {
    timestamp: Date;
    level: LogLevel;
    message: string;
    context?: string;
    metadata?: Record<string, unknown>;
    error?: Error;
}
export interface LoggerConfig {
    level: LogLevel;
    enableTimestamp: boolean;
    enableColors: boolean;
    enableJSON: boolean;
    context?: string;
}
/**
 * Logger class for structured logging
 */
export declare class Logger {
    private config;
    constructor(config?: Partial<LoggerConfig>);
    /**
     * Create a child logger with a specific context
     */
    child(context: string): Logger;
    /**
     * Set log level dynamically
     */
    setLevel(level: LogLevel): void;
    /**
     * Check if a log level is enabled
     */
    private isLevelEnabled;
    /**
     * Format timestamp
     */
    private formatTimestamp;
    /**
     * Get level name string
     */
    private getLevelName;
    /**
     * Get color for log level
     */
    private getLevelColor;
    /**
     * Format log entry as JSON
     */
    private formatJSON;
    /**
     * Format log entry as text
     */
    private formatText;
    /**
     * Core logging method
     */
    private log;
    /**
     * Debug level logging
     */
    debug(message: string, metadata?: Record<string, unknown>): void;
    /**
     * Info level logging
     */
    info(message: string, metadata?: Record<string, unknown>): void;
    /**
     * Warning level logging
     */
    warn(message: string, metadata?: Record<string, unknown>): void;
    /**
     * Error level logging
     */
    error(message: string, error?: Error | unknown, metadata?: Record<string, unknown>): void;
}
/**
 * Default logger instance
 */
export declare const logger: Logger;
/**
 * Create a logger with a specific context
 */
export declare function createLogger(context: string, config?: Partial<LoggerConfig>): Logger;
/**
 * Export for default usage
 */
export default logger;
