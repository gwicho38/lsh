/**
 * Logging Framework
 * Centralized logging utility with support for different log levels,
 * structured logging, and environment-based configuration.
 */

import { ENV_VARS, ANSI } from '../constants/index.js';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4,
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
 * Color mapping for logger using centralized ANSI constants
 */
const colors = {
  reset: ANSI.RESET,
  bright: ANSI.BRIGHT,
  dim: ANSI.DIM,

  // Foreground colors
  black: ANSI.FG_BLACK,
  red: ANSI.FG_RED,
  green: ANSI.FG_GREEN,
  yellow: ANSI.FG_YELLOW,
  blue: ANSI.FG_BLUE,
  magenta: ANSI.FG_MAGENTA,
  cyan: ANSI.FG_CYAN,
  white: ANSI.FG_WHITE,

  // Background colors
  bgBlack: ANSI.BG_BLACK,
  bgRed: ANSI.BG_RED,
  bgGreen: ANSI.BG_GREEN,
  bgYellow: ANSI.BG_YELLOW,
  bgBlue: ANSI.BG_BLUE,
  bgMagenta: ANSI.BG_MAGENTA,
  bgCyan: ANSI.BG_CYAN,
  bgWhite: ANSI.BG_WHITE,
};

/**
 * Get log level from environment variable
 */
function getLogLevelFromEnv(): LogLevel {
  const level = process.env[ENV_VARS.LSH_LOG_LEVEL]?.toUpperCase();
  switch (level) {
    case 'DEBUG':
      return LogLevel.DEBUG;
    case 'INFO':
      return LogLevel.INFO;
    case 'WARN':
      return LogLevel.WARN;
    case 'ERROR':
      return LogLevel.ERROR;
    case 'NONE':
      return LogLevel.NONE;
    default:
      return process.env[ENV_VARS.NODE_ENV] === 'production' ? LogLevel.INFO : LogLevel.DEBUG;
  }
}

/**
 * Logger class for structured logging
 */
export class Logger {
  private config: LoggerConfig;

  constructor(config?: Partial<LoggerConfig>) {
    this.config = {
      level: config?.level ?? getLogLevelFromEnv(),
      enableTimestamp: config?.enableTimestamp ?? true,
      enableColors: config?.enableColors ?? (!process.env[ENV_VARS.NO_COLOR] && process.stdout.isTTY),
      enableJSON: config?.enableJSON ?? (process.env[ENV_VARS.LSH_LOG_FORMAT] === 'json'),
      context: config?.context,
    };
  }

  /**
   * Create a child logger with a specific context
   */
  child(context: string): Logger {
    return new Logger({
      ...this.config,
      context: this.config.context ? `${this.config.context}:${context}` : context,
    });
  }

  /**
   * Set log level dynamically
   */
  setLevel(level: LogLevel): void {
    this.config.level = level;
  }

  /**
   * Check if a log level is enabled
   */
  private isLevelEnabled(level: LogLevel): boolean {
    return level >= this.config.level;
  }

  /**
   * Format timestamp
   */
  private formatTimestamp(): string {
    const now = new Date();
    return now.toISOString();
  }

  /**
   * Get level name string
   */
  private getLevelName(level: LogLevel): string {
    switch (level) {
      case LogLevel.DEBUG:
        return 'DEBUG';
      case LogLevel.INFO:
        return 'INFO';
      case LogLevel.WARN:
        return 'WARN';
      case LogLevel.ERROR:
        return 'ERROR';
      default:
        return 'UNKNOWN';
    }
  }

  /**
   * Get color for log level
   */
  private getLevelColor(level: LogLevel): string {
    switch (level) {
      case LogLevel.DEBUG:
        return colors.cyan;
      case LogLevel.INFO:
        return colors.green;
      case LogLevel.WARN:
        return colors.yellow;
      case LogLevel.ERROR:
        return colors.red;
      default:
        return colors.white;
    }
  }

  /**
   * Format log entry as JSON
   */
  private formatJSON(entry: LogEntry): string {
    const obj: Record<string, unknown> = {
      timestamp: entry.timestamp.toISOString(),
      level: this.getLevelName(entry.level),
      message: entry.message,
    };

    if (entry.context) {
      obj.context = entry.context;
    }

    if (entry.metadata && Object.keys(entry.metadata).length > 0) {
      obj.metadata = entry.metadata;
    }

    if (entry.error) {
      obj.error = {
        name: entry.error.name,
        message: entry.error.message,
        stack: entry.error.stack,
      };
    }

    return JSON.stringify(obj);
  }

  /**
   * Format log entry as text
   */
  private formatText(entry: LogEntry): string {
    const parts: string[] = [];

    // Timestamp
    if (this.config.enableTimestamp) {
      const timestamp = this.formatTimestamp();
      parts.push(this.config.enableColors ? `${colors.dim}${timestamp}${colors.reset}` : timestamp);
    }

    // Level
    const levelName = this.getLevelName(entry.level);
    const levelColor = this.getLevelColor(entry.level);
    const formattedLevel = this.config.enableColors
      ? `${levelColor}${levelName.padEnd(5)}${colors.reset}`
      : levelName.padEnd(5);
    parts.push(formattedLevel);

    // Context
    if (entry.context) {
      const formattedContext = this.config.enableColors
        ? `${colors.magenta}[${entry.context}]${colors.reset}`
        : `[${entry.context}]`;
      parts.push(formattedContext);
    }

    // Message
    parts.push(entry.message);

    // Metadata
    if (entry.metadata && Object.keys(entry.metadata).length > 0) {
      const metadataStr = JSON.stringify(entry.metadata);
      const formattedMetadata = this.config.enableColors
        ? `${colors.dim}${metadataStr}${colors.reset}`
        : metadataStr;
      parts.push(formattedMetadata);
    }

    return parts.join(' ');
  }

  /**
   * Core logging method
   */
  private log(level: LogLevel, message: string, metadata?: Record<string, unknown>, error?: Error): void {
    if (!this.isLevelEnabled(level)) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      context: this.config.context,
      metadata,
      error,
    };

    const output = this.config.enableJSON
      ? this.formatJSON(entry)
      : this.formatText(entry);

    // Output to appropriate stream
    if (level >= LogLevel.ERROR) {
      console.error(output);
      if (error?.stack) {
        console.error(error.stack);
      }
    } else if (level >= LogLevel.WARN) {
      console.warn(output);
    } else {
      // INFO and DEBUG go to stdout
      // Using console.log here is intentional for the logger itself
       
      console.log(output);
    }
  }

  /**
   * Debug level logging
   */
  debug(message: string, metadata?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, message, metadata);
  }

  /**
   * Info level logging
   */
  info(message: string, metadata?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, message, metadata);
  }

  /**
   * Warning level logging
   */
  warn(message: string, metadata?: Record<string, unknown>): void {
    this.log(LogLevel.WARN, message, metadata);
  }

  /**
   * Error level logging
   */
  error(message: string, error?: Error | unknown, metadata?: Record<string, unknown>): void {
    const err = error instanceof Error ? error : undefined;
    const errorMetadata = error && !(error instanceof Error) ? { error } : undefined;
    this.log(LogLevel.ERROR, message, { ...metadata, ...errorMetadata }, err);
  }
}

/**
 * Default logger instance
 */
export const logger = new Logger();

/**
 * Create a logger with a specific context
 */
export function createLogger(context: string, config?: Partial<LoggerConfig>): Logger {
  return new Logger({
    ...config,
    context,
  });
}

/**
 * Export for default usage
 */
export default logger;
