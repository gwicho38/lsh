/**
 * Platform Utils Tests
 * Tests for cross-platform path and environment handling
 */

import { describe, it, expect, beforeAll } from '@jest/globals';
import * as os from 'os';
import * as path from 'path';

describe('PlatformUtils', () => {
  let getPlatformPaths: typeof import('../src/lib/platform-utils.js').getPlatformPaths;
  let normalizePath: typeof import('../src/lib/platform-utils.js').normalizePath;
  let isWindows: typeof import('../src/lib/platform-utils.js').isWindows;
  let isMacOS: typeof import('../src/lib/platform-utils.js').isMacOS;
  let isLinux: typeof import('../src/lib/platform-utils.js').isLinux;
  let getPlatformName: typeof import('../src/lib/platform-utils.js').getPlatformName;
  let getEnvVar: typeof import('../src/lib/platform-utils.js').getEnvVar;
  let ensureDir: typeof import('../src/lib/platform-utils.js').ensureDir;
  let getDefaultShell: typeof import('../src/lib/platform-utils.js').getDefaultShell;
  let getPathSeparator: typeof import('../src/lib/platform-utils.js').getPathSeparator;
  let joinPaths: typeof import('../src/lib/platform-utils.js').joinPaths;
  let toPlatformPath: typeof import('../src/lib/platform-utils.js').toPlatformPath;
  let toUnixPath: typeof import('../src/lib/platform-utils.js').toUnixPath;
  let getExecutableExtension: typeof import('../src/lib/platform-utils.js').getExecutableExtension;
  let isAbsolutePath: typeof import('../src/lib/platform-utils.js').isAbsolutePath;
  let resolveHomePath: typeof import('../src/lib/platform-utils.js').resolveHomePath;
  let getLineEnding: typeof import('../src/lib/platform-utils.js').getLineEnding;
  let getPlatformInfo: typeof import('../src/lib/platform-utils.js').getPlatformInfo;

  beforeAll(async () => {
    const module = await import('../src/lib/platform-utils.js');
    getPlatformPaths = module.getPlatformPaths;
    normalizePath = module.normalizePath;
    isWindows = module.isWindows;
    isMacOS = module.isMacOS;
    isLinux = module.isLinux;
    getPlatformName = module.getPlatformName;
    getEnvVar = module.getEnvVar;
    ensureDir = module.ensureDir;
    getDefaultShell = module.getDefaultShell;
    getPathSeparator = module.getPathSeparator;
    joinPaths = module.joinPaths;
    toPlatformPath = module.toPlatformPath;
    toUnixPath = module.toUnixPath;
    getExecutableExtension = module.getExecutableExtension;
    isAbsolutePath = module.isAbsolutePath;
    resolveHomePath = module.resolveHomePath;
    getLineEnding = module.getLineEnding;
    getPlatformInfo = module.getPlatformInfo;
  });

  describe('getPlatformPaths', () => {
    it('should return all required paths', () => {
      const paths = getPlatformPaths();
      expect(paths.tmpDir).toBeDefined();
      expect(paths.homeDir).toBeDefined();
      expect(paths.user).toBeDefined();
      expect(paths.pidFile).toBeDefined();
      expect(paths.logFile).toBeDefined();
      expect(paths.socketPath).toBeDefined();
      expect(paths.configDir).toBeDefined();
      expect(paths.dataDir).toBeDefined();
    });

    it('should use custom app name', () => {
      const paths = getPlatformPaths('myapp');
      expect(paths.pidFile).toContain('myapp');
      expect(paths.logFile).toContain('myapp');
    });

    it('should include username in paths', () => {
      const paths = getPlatformPaths();
      const user = os.userInfo().username;
      expect(paths.pidFile).toContain(user);
      expect(paths.logFile).toContain(user);
    });
  });

  describe('normalizePath', () => {
    it('should normalize path', () => {
      const result = normalizePath('/foo/bar/../baz');
      expect(result).toBe(path.normalize('/foo/bar/../baz'));
    });

    it('should handle simple paths', () => {
      const result = normalizePath('/simple/path');
      expect(result).toBe('/simple/path');
    });
  });

  describe('Platform detection', () => {
    it('should detect current platform', () => {
      const platformCount = [isWindows(), isMacOS(), isLinux()].filter(Boolean).length;
      expect(platformCount).toBeLessThanOrEqual(1);
    });

    it('isWindows should match process.platform', () => {
      expect(isWindows()).toBe(process.platform === 'win32');
    });

    it('isMacOS should match process.platform', () => {
      expect(isMacOS()).toBe(process.platform === 'darwin');
    });

    it('isLinux should match process.platform', () => {
      expect(isLinux()).toBe(process.platform === 'linux');
    });
  });

  describe('getPlatformName', () => {
    it('should return readable platform name', () => {
      const name = getPlatformName();
      expect(['Windows', 'macOS', 'Linux']).toContain(name);
    });
  });

  describe('getEnvVar', () => {
    it('should get environment variable', () => {
      process.env.TEST_VAR_PLATFORM = 'test_value';
      const result = getEnvVar('TEST_VAR_PLATFORM');
      expect(result).toBe('test_value');
      delete process.env.TEST_VAR_PLATFORM;
    });

    it('should return undefined for missing var', () => {
      const result = getEnvVar('NONEXISTENT_VAR_12345');
      expect(result).toBeUndefined();
    });
  });

  describe('ensureDir', () => {
    it('should not throw if directory exists', async () => {
      const existingDir = os.tmpdir();
      await expect(ensureDir(existingDir)).resolves.not.toThrow();
    });
  });

  describe('getDefaultShell', () => {
    it('should return shell path', () => {
      const shell = getDefaultShell();
      expect(typeof shell).toBe('string');
      expect(shell.length).toBeGreaterThan(0);
    });
  });

  describe('getPathSeparator', () => {
    it('should return path delimiter', () => {
      const sep = getPathSeparator();
      expect(sep).toBe(path.delimiter);
    });
  });

  describe('joinPaths', () => {
    it('should join paths correctly', () => {
      const result = joinPaths('foo', 'bar', 'baz');
      expect(result).toBe(path.join('foo', 'bar', 'baz'));
    });

    it('should handle single path', () => {
      const result = joinPaths('foo');
      expect(result).toBe('foo');
    });
  });

  describe('toUnixPath', () => {
    it('should convert backslashes to forward slashes', () => {
      const result = toUnixPath('foo\\bar\\baz');
      expect(result).toBe('foo/bar/baz');
    });

    it('should leave forward slashes as is', () => {
      const result = toUnixPath('foo/bar/baz');
      expect(result).toBe('foo/bar/baz');
    });
  });

  describe('isAbsolutePath', () => {
    it('should detect absolute paths', () => {
      expect(isAbsolutePath('/foo/bar')).toBe(true);
    });

    it('should detect relative paths', () => {
      expect(isAbsolutePath('foo/bar')).toBe(false);
      expect(isAbsolutePath('./foo')).toBe(false);
      expect(isAbsolutePath('../foo')).toBe(false);
    });
  });

  describe('resolveHomePath', () => {
    it('should expand tilde to home directory', () => {
      const result = resolveHomePath('~/test');
      expect(result).toBe(path.join(os.homedir(), 'test'));
    });

    it('should leave non-tilde paths unchanged', () => {
      const result = resolveHomePath('/foo/bar');
      expect(result).toBe('/foo/bar');
    });

    it('should handle tilde only', () => {
      const result = resolveHomePath('~');
      expect(result).toBe(os.homedir());
    });
  });

  describe('getLineEnding', () => {
    it('should return platform line ending', () => {
      const ending = getLineEnding();
      if (isWindows()) {
        expect(ending).toBe('\r\n');
      } else {
        expect(ending).toBe('\n');
      }
    });
  });

  describe('getPlatformInfo', () => {
    it('should return comprehensive platform info', () => {
      const info = getPlatformInfo();
      expect(info.platform).toBe(process.platform);
      expect(info.platformName).toBeDefined();
      expect(info.arch).toBe(process.arch);
      expect(info.release).toBeDefined();
      expect(info.nodeVersion).toBe(process.version);
      expect(info.homeDir).toBeDefined();
      expect(info.tmpDir).toBeDefined();
      expect(info.user).toBeDefined();
    });
  });
});
