/**
 * Platform Utilities
 * Cross-platform path and environment handling for Windows, macOS, and Linux
 */

import * as path from 'path';
import * as os from 'os';
import { ENV_VARS } from '../constants/index.js';

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
// TODO(@gwicho38): Review - getPlatformPaths
export function getPlatformPaths(appName: string = 'lsh'): PlatformPaths {
  const isWindows = process.platform === 'win32';
  const isMac = process.platform === 'darwin';

  // Temporary directory
  const tmpDir = os.tmpdir();

  // Home directory
  const homeDir = os.homedir();

  // Username
  const user = os.userInfo().username;

  // Application-specific temporary file paths
  const pidFile = path.join(tmpDir, `${appName}-daemon-${user}.pid`);
  const logFile = path.join(tmpDir, `${appName}-daemon-${user}.log`);

  // Socket/IPC path (platform-specific)
  // Windows uses Named Pipes, Unix systems use Unix Domain Sockets
  const socketPath = isWindows
    ? `\\\\.\\pipe\\${appName}-daemon-${user}`
    : path.join(tmpDir, `${appName}-daemon-${user}.sock`);

  // Configuration directory
  // Windows: %APPDATA%\lsh
  // macOS: ~/Library/Application Support/lsh
  // Linux: ~/.config/lsh
  let configDir: string;
  if (isWindows) {
    configDir = path.join(process.env[ENV_VARS.APPDATA] || path.join(homeDir, 'AppData', 'Roaming'), appName);
  } else if (isMac) {
    configDir = path.join(homeDir, 'Library', 'Application Support', appName);
  } else {
    configDir = path.join(homeDir, '.config', appName);
  }

  // Data directory
  // Windows: %LOCALAPPDATA%\lsh
  // macOS: ~/Library/Application Support/lsh
  // Linux: ~/.local/share/lsh
  let dataDir: string;
  if (isWindows) {
    dataDir = path.join(process.env[ENV_VARS.LOCALAPPDATA] || path.join(homeDir, 'AppData', 'Local'), appName);
  } else if (isMac) {
    dataDir = path.join(homeDir, 'Library', 'Application Support', appName);
  } else {
    dataDir = path.join(homeDir, '.local', 'share', appName);
  }

  return {
    tmpDir,
    homeDir,
    user,
    pidFile,
    logFile,
    socketPath,
    configDir,
    dataDir,
  };
}

/**
 * Normalize path for current platform
 */
// TODO(@gwicho38): Review - normalizePath
export function normalizePath(inputPath: string): string {
  return path.normalize(inputPath);
}

/**
 * Check if running on Windows
 */
// TODO(@gwicho38): Review - isWindows
export function isWindows(): boolean {
  return process.platform === 'win32';
}

/**
 * Check if running on macOS
 */
// TODO(@gwicho38): Review - isMacOS
export function isMacOS(): boolean {
  return process.platform === 'darwin';
}

/**
 * Check if running on Linux
 */
// TODO(@gwicho38): Review - isLinux
export function isLinux(): boolean {
  return process.platform === 'linux';
}

/**
 * Get platform name
 */
// TODO(@gwicho38): Review - getPlatformName
export function getPlatformName(): string {
  const platform = process.platform;
  switch (platform) {
    case 'win32':
      return 'Windows';
    case 'darwin':
      return 'macOS';
    case 'linux':
      return 'Linux';
    default:
      return platform;
  }
}

/**
 * Get environment variable with fallback
 * Handles Windows vs Unix differences (e.g., HOME vs USERPROFILE)
 */
// TODO(@gwicho38): Review - getEnvVar
export function getEnvVar(unixVar: string, windowsVar?: string): string | undefined {
  if (isWindows() && windowsVar) {
    return process.env[windowsVar] || process.env[unixVar];
  }
  return process.env[unixVar];
}

/**
 * Ensure directory exists, create if needed (cross-platform)
 */
// TODO(@gwicho38): Review - ensureDir
export async function ensureDir(dirPath: string): Promise<void> {
  const fs = await import('fs/promises');
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error) {
    // Ignore if directory already exists
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
      throw error;
    }
  }
}

/**
 * Get shell executable path for current platform
 */
// TODO(@gwicho38): Review - getDefaultShell
export function getDefaultShell(): string {
  if (isWindows()) {
    return process.env[ENV_VARS.COMSPEC] || 'cmd.exe';
  }
  return process.env[ENV_VARS.SHELL] || '/bin/sh';
}

/**
 * Get path separator for current platform
 */
// TODO(@gwicho38): Review - getPathSeparator
export function getPathSeparator(): string {
  return path.delimiter; // : on Unix, ; on Windows
}

/**
 * Join paths with platform-appropriate separator
 */
// TODO(@gwicho38): Review - joinPaths
export function joinPaths(...paths: string[]): string {
  return path.join(...paths);
}

/**
 * Convert Unix-style path to platform path
 */
// TODO(@gwicho38): Review - toPlatformPath
export function toPlatformPath(unixPath: string): string {
  if (isWindows()) {
    return unixPath.replace(/\//g, '\\');
  }
  return unixPath;
}

/**
 * Convert platform path to Unix-style path
 */
// TODO(@gwicho38): Review - toUnixPath
export function toUnixPath(platformPath: string): string {
  return platformPath.replace(/\\/g, '/');
}

/**
 * Get executable extension for current platform
 */
// TODO(@gwicho38): Review - getExecutableExtension
export function getExecutableExtension(): string {
  return isWindows() ? '.exe' : '';
}

/**
 * Check if a path is absolute (cross-platform)
 */
// TODO(@gwicho38): Review - isAbsolutePath
export function isAbsolutePath(inputPath: string): boolean {
  return path.isAbsolute(inputPath);
}

/**
 * Resolve path relative to home directory
 */
// TODO(@gwicho38): Review - resolveHomePath
export function resolveHomePath(relativePath: string): string {
  if (relativePath.startsWith('~')) {
    const homeDir = os.homedir();
    return path.join(homeDir, relativePath.slice(1));
  }
  return relativePath;
}

/**
 * Get platform-specific line ending
 */
// TODO(@gwicho38): Review - getLineEnding
export function getLineEnding(): string {
  return isWindows() ? '\r\n' : '\n';
}

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
// TODO(@gwicho38): Review - getPlatformInfo
export function getPlatformInfo(): PlatformInfo {
  const paths = getPlatformPaths();
  return {
    platform: process.platform,
    platformName: getPlatformName(),
    arch: process.arch,
    release: os.release(),
    nodeVersion: process.version,
    homeDir: paths.homeDir,
    tmpDir: paths.tmpDir,
    user: paths.user,
  };
}
