/**
 * Platform Utilities
 * Cross-platform path and environment handling for Windows, macOS, and Linux
 */
export interface PlatformPaths {
    tmpDir: string;
    homeDir: string;
    user: string;
    pidFile: string;
    logFile: string;
    socketPath: string;
    configDir: string;
    dataDir: string;
}
/**
 * Get platform-specific paths
 * Handles differences between Windows, macOS, and Linux
 */
export declare function getPlatformPaths(appName?: string): PlatformPaths;
/**
 * Normalize path for current platform
 */
export declare function normalizePath(inputPath: string): string;
/**
 * Check if running on Windows
 */
export declare function isWindows(): boolean;
/**
 * Check if running on macOS
 */
export declare function isMacOS(): boolean;
/**
 * Check if running on Linux
 */
export declare function isLinux(): boolean;
/**
 * Get platform name
 */
export declare function getPlatformName(): string;
/**
 * Get environment variable with fallback
 * Handles Windows vs Unix differences (e.g., HOME vs USERPROFILE)
 */
export declare function getEnvVar(unixVar: string, windowsVar?: string): string | undefined;
/**
 * Ensure directory exists, create if needed (cross-platform)
 */
export declare function ensureDir(dirPath: string): Promise<void>;
/**
 * Get shell executable path for current platform
 */
export declare function getDefaultShell(): string;
/**
 * Get path separator for current platform
 */
export declare function getPathSeparator(): string;
/**
 * Join paths with platform-appropriate separator
 */
export declare function joinPaths(...paths: string[]): string;
/**
 * Convert Unix-style path to platform path
 */
export declare function toPlatformPath(unixPath: string): string;
/**
 * Convert platform path to Unix-style path
 */
export declare function toUnixPath(platformPath: string): string;
/**
 * Get executable extension for current platform
 */
export declare function getExecutableExtension(): string;
/**
 * Check if a path is absolute (cross-platform)
 */
export declare function isAbsolutePath(inputPath: string): boolean;
/**
 * Resolve path relative to home directory
 */
export declare function resolveHomePath(relativePath: string): string;
/**
 * Get platform-specific line ending
 */
export declare function getLineEnding(): string;
/**
 * Platform information for debugging
 */
export interface PlatformInfo {
    platform: string;
    platformName: string;
    arch: string;
    release: string;
    nodeVersion: string;
    homeDir: string;
    tmpDir: string;
    user: string;
}
/**
 * Get comprehensive platform information
 */
export declare function getPlatformInfo(): PlatformInfo;
