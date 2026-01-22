/**
 * Logging Framework
 * Centralized logging utility with support for different log levels,
 * structured logging, and environment-based configuration.
 */

import { ENV_VARS } from '../constants/index.js';

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
 * ANSI color codes for terminal output
 */
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',

  // Foreground colors
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',

  // Background colors
  bgBlack: '\x1b[40m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
  bgWhite: '\x1b[47m',
};

/**
 * Get log level from environment variable
 */
// TODO(@gwicho38): Review - getLogLevelFromEnv
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
  // TODO(@gwicho38): Review - child
  child(context: string): Logger {
    return new Logger({
      ...this.config,
      context: this.config.context ? `${this.config.context}:${context}` : context,
    });
  }

  /**
   * Set log level dynamically
   */
  // TODO(@gwicho38): Review - setLevel
  setLevel(level: LogLevel): void {
    this.config.level = level;
  }

  /**
   * Check if a log level is enabled
   */
  // TODO(@gwicho38): Review - isLevelEnabled
  private isLevelEnabled(level: LogLevel): boolean {
    return level >= this.config.level;
  }

  /**
   * Format timestamp
   */
  // TODO(@gwicho38): Review - formatTimestamp
  private formatTimestamp(): string {
    const now = new Date();
    return now.toISOString();
  }

  /**
   * Get level name string
   */
  // TODO(@gwicho38): Review - getLevelName
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
  // TODO(@gwicho38): Review - getLevelColor
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
  // TODO(@gwicho38): Review - formatJSON
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
  // TODO(@gwicho38): Review - formatText
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
  // TODO(@gwicho38): Review - log
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
  // TODO(@gwicho38): Review - debug
  debug(message: string, metadata?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, message, metadata);
  }

  /**
   * Info level logging
   */
  // TODO(@gwicho38): Review - info
  info(message: string, metadata?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, message, metadata);
  }

  /**
   * Warning level logging
   */
  // TODO(@gwicho38): Review - warn
  warn(message: string, metadata?: Record<string, unknown>): void {
    this.log(LogLevel.WARN, message, metadata);
  }

  /**
   * Error level logging
   */
  // TODO(@gwicho38): Review - error
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
// TODO(@gwicho38): Review - createLogger
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
