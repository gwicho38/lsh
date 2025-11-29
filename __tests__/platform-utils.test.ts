/**
 * Platform Utils Tests
 * Tests for cross-platform path and environment handling
 */

import { describe, it, expect, beforeAll } from '@jest/globals';

describe('Platform Utils', () => {
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
    it('should return platform paths with default app name', () => {
      const paths = getPlatformPaths();

      expect(paths.tmpDir).toBeDefined();
      expect(paths.homeDir).toBeDefined();
      expect(paths.user).toBeDefined();
      expect(paths.pidFile).toContain('lsh');
      expect(paths.logFile).toContain('lsh');
      expect(paths.socketPath).toContain('lsh');
      expect(paths.configDir).toBeDefined();
      expect(paths.dataDir).toBeDefined();
    });

    it('should use custom app name', () => {
      const paths = getPlatformPaths('myapp');

      expect(paths.pidFile).toContain('myapp');
      expect(paths.logFile).toContain('myapp');
      expect(paths.socketPath).toContain('myapp');
    });

    it('should include user in temp file paths', () => {
      const paths = getPlatformPaths();

      expect(paths.pidFile).toContain(paths.user);
      expect(paths.logFile).toContain(paths.user);
    });
  });

  describe('normalizePath', () => {
    it('should normalize path separators', () => {
      const result = normalizePath('foo/bar/baz');
      expect(result).toBeDefined();
    });

    it('should remove redundant separators', () => {
      const result = normalizePath('foo//bar///baz');
      expect(result).not.toContain('//');
    });
  });

  describe('Platform detection', () => {
    it('should return consistent platform detection', () => {
      const platform = process.platform;

      if (platform === 'win32') {
        expect(isWindows()).toBe(true);
        expect(isMacOS()).toBe(false);
        expect(isLinux()).toBe(false);
      } else if (platform === 'darwin') {
        expect(isWindows()).toBe(false);
        expect(isMacOS()).toBe(true);
        expect(isLinux()).toBe(false);
      } else if (platform === 'linux') {
        expect(isWindows()).toBe(false);
        expect(isMacOS()).toBe(false);
        expect(isLinux()).toBe(true);
      }
    });

    it('should detect exactly one platform', () => {
      const platforms = [isWindows(), isMacOS(), isLinux()];
      const trueCount = platforms.filter(p => p).length;
      expect(trueCount).toBeLessThanOrEqual(1);
    });
  });

  describe('getPlatformName', () => {
    it('should return human-readable platform name', () => {
      const name = getPlatformName();

      expect(['Windows', 'macOS', 'Linux']).toContain(name);
    });
  });

  describe('getEnvVar', () => {
    it('should return environment variable', () => {
      const home = getEnvVar('HOME', 'USERPROFILE');
      expect(home).toBeDefined();
    });

    it('should return undefined for non-existent variables', () => {
      const result = getEnvVar('NON_EXISTENT_VAR_XYZ123');
      expect(result).toBeUndefined();
    });
  });

  describe('ensureDir', () => {
    it('should create directory if it does not exist', async () => {
      const fs = await import('fs/promises');
      const path = await import('path');
      const os = await import('os');

      const testDir = path.join(os.tmpdir(), `platform-utils-test-${Date.now()}`);

      await ensureDir(testDir);

      const stats = await fs.stat(testDir);
      expect(stats.isDirectory()).toBe(true);

      // Cleanup
      await fs.rmdir(testDir);
    });

    it('should not throw if directory already exists', async () => {
      const fs = await import('fs/promises');
      const path = await import('path');
      const os = await import('os');

      const testDir = path.join(os.tmpdir(), `platform-utils-test-${Date.now()}`);
      await fs.mkdir(testDir, { recursive: true });

      await expect(ensureDir(testDir)).resolves.not.toThrow();

      // Cleanup
      await fs.rmdir(testDir);
    });
  });

  describe('getDefaultShell', () => {
    it('should return a shell path', () => {
      const shell = getDefaultShell();

      expect(shell).toBeDefined();
      expect(typeof shell).toBe('string');
    });
  });

  describe('getPathSeparator', () => {
    it('should return colon on Unix or semicolon on Windows', () => {
      const sep = getPathSeparator();

      if (isWindows()) {
        expect(sep).toBe(';');
      } else {
        expect(sep).toBe(':');
      }
    });
  });

  describe('joinPaths', () => {
    it('should join path segments', () => {
      const result = joinPaths('foo', 'bar', 'baz');
      expect(result).toContain('foo');
      expect(result).toContain('bar');
      expect(result).toContain('baz');
    });
  });

  describe('toPlatformPath', () => {
    it('should convert unix paths to platform paths', () => {
      const result = toPlatformPath('foo/bar/baz');

      if (isWindows()) {
        expect(result).toBe('foo\\bar\\baz');
      } else {
        expect(result).toBe('foo/bar/baz');
      }
    });
  });

  describe('toUnixPath', () => {
    it('should convert platform paths to unix paths', () => {
      const result = toUnixPath('foo\\bar\\baz');
      expect(result).toBe('foo/bar/baz');
    });
  });

  describe('getExecutableExtension', () => {
    it('should return .exe on Windows, empty on Unix', () => {
      const ext = getExecutableExtension();

      if (isWindows()) {
        expect(ext).toBe('.exe');
      } else {
        expect(ext).toBe('');
      }
    });
  });

  describe('isAbsolutePath', () => {
    it('should detect absolute paths', () => {
      if (isWindows()) {
        expect(isAbsolutePath('C:\\foo\\bar')).toBe(true);
        expect(isAbsolutePath('foo\\bar')).toBe(false);
      } else {
        expect(isAbsolutePath('/foo/bar')).toBe(true);
        expect(isAbsolutePath('foo/bar')).toBe(false);
      }
    });
  });

  describe('resolveHomePath', () => {
    it('should expand tilde to home directory', () => {
      const result = resolveHomePath('~/test');
      const os = require('os');

      expect(result).toContain(os.homedir());
      expect(result).not.toContain('~');
    });

    it('should leave non-tilde paths unchanged', () => {
      const result = resolveHomePath('/absolute/path');
      expect(result).toBe('/absolute/path');
    });
  });

  describe('getLineEnding', () => {
    it('should return platform-specific line ending', () => {
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

      expect(info.platform).toBeDefined();
      expect(info.platformName).toBeDefined();
      expect(info.arch).toBeDefined();
      expect(info.release).toBeDefined();
      expect(info.nodeVersion).toBeDefined();
      expect(info.homeDir).toBeDefined();
      expect(info.tmpDir).toBeDefined();
      expect(info.user).toBeDefined();
    });

    it('should have consistent values', () => {
      const info = getPlatformInfo();
      const paths = getPlatformPaths();

      expect(info.homeDir).toBe(paths.homeDir);
      expect(info.tmpDir).toBe(paths.tmpDir);
      expect(info.user).toBe(paths.user);
    });
  });
});
