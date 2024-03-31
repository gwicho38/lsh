declare enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3,
    SILENT = 4
}
declare const isLogLevel: (level: string) => level is "DEBUG" | "INFO" | "WARN" | "ERROR" | "SILENT";
type LoggerConfig = {
    prefix: string;
    timestamps: boolean;
    colors: boolean;
};
/**
 * Logger for messages with color, tags and log level support
 */
declare class Logger {
    minLevel: LogLevel;
    prefix: string;
    timestamps: boolean;
    colors: boolean;
    constructor(minLevel?: LogLevel, config?: LoggerConfig);
    private log;
    debug(message: string): void;
    info(message: string): void;
    warn(message: string): void;
    error(message: string): void;
}
export { LogLevel, Logger, isLogLevel };
export default Logger;
