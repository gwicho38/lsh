/**
 * Git Utils Tests
 * Tests for git repository detection and information extraction
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('GitUtils', () => {
  let isInGitRepo: typeof import('../src/lib/git-utils.js').isInGitRepo;
  let getGitRootPath: typeof import('../src/lib/git-utils.js').getGitRootPath;
  let getGitRemoteUrl: typeof import('../src/lib/git-utils.js').getGitRemoteUrl;
  let extractRepoName: typeof import('../src/lib/git-utils.js').extractRepoName;
  let getCurrentBranch: typeof import('../src/lib/git-utils.js').getCurrentBranch;
  let getGitRepoInfo: typeof import('../src/lib/git-utils.js').getGitRepoInfo;
  let hasEnvExample: typeof import('../src/lib/git-utils.js').hasEnvExample;
  let isEnvIgnored: typeof import('../src/lib/git-utils.js').isEnvIgnored;
  let ensureEnvInGitignore: typeof import('../src/lib/git-utils.js').ensureEnvInGitignore;

  let tempDir: string;

  beforeAll(async () => {
    const module = await import('../src/lib/git-utils.js');
    isInGitRepo = module.isInGitRepo;
    getGitRootPath = module.getGitRootPath;
    getGitRemoteUrl = module.getGitRemoteUrl;
    extractRepoName = module.extractRepoName;
    getCurrentBranch = module.getCurrentBranch;
    getGitRepoInfo = module.getGitRepoInfo;
    hasEnvExample = module.hasEnvExample;
    isEnvIgnored = module.isEnvIgnored;
    ensureEnvInGitignore = module.ensureEnvInGitignore;
  });

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'git-utils-test-'));
  });

  afterEach(() => {
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('isInGitRepo', () => {
    it('should return true for actual git repo', () => {
      // The lsh project itself is a git repo
      const result = isInGitRepo(process.cwd());
      expect(result).toBe(true);
    });

    it('should return false for non-git directory', () => {
      const result = isInGitRepo(tempDir);
      expect(result).toBe(false);
    });
  });

  describe('getGitRootPath', () => {
    it('should return root path for git repo', () => {
      const result = getGitRootPath(process.cwd());
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should return undefined for non-git directory', () => {
      const result = getGitRootPath(tempDir);
      expect(result).toBeUndefined();
    });
  });

  describe('getGitRemoteUrl', () => {
    it('should return remote url for git repo with remote', () => {
      const result = getGitRemoteUrl(process.cwd());
      // May or may not have a remote depending on setup
      expect(result === undefined || typeof result === 'string').toBe(true);
    });

    it('should return undefined for non-git directory', () => {
      const result = getGitRemoteUrl(tempDir);
      expect(result).toBeUndefined();
    });
  });

  describe('extractRepoName', () => {
    it('should extract repo name from SSH URL', () => {
      const result = extractRepoName('git@github.com:user/my-repo.git');
      expect(result).toBe('my-repo');
    });

    it('should extract repo name from HTTPS URL', () => {
      const result = extractRepoName('https://github.com/user/my-repo.git');
      expect(result).toBe('my-repo');
    });

    it('should extract repo name from URL without .git suffix', () => {
      const result = extractRepoName('https://github.com/user/my-repo');
      expect(result).toBe('my-repo');
    });

    it('should fallback to directory name', () => {
      const result = extractRepoName(undefined, '/home/user/my-project');
      expect(result).toBe('my-project');
    });

    it('should return undefined when no info available', () => {
      const result = extractRepoName(undefined, undefined);
      expect(result).toBeUndefined();
    });
  });

  describe('getCurrentBranch', () => {
    it('should return branch name for git repo', () => {
      const result = getCurrentBranch(process.cwd());
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should return undefined for non-git directory', () => {
      const result = getCurrentBranch(tempDir);
      expect(result).toBeUndefined();
    });
  });

  describe('getGitRepoInfo', () => {
    it('should return comprehensive info for git repo', () => {
      const result = getGitRepoInfo(process.cwd());
      expect(result.isGitRepo).toBe(true);
      expect(result.rootPath).toBeDefined();
      expect(result.currentBranch).toBeDefined();
    });

    it('should return minimal info for non-git directory', () => {
      const result = getGitRepoInfo(tempDir);
      expect(result.isGitRepo).toBe(false);
      expect(result.rootPath).toBeUndefined();
    });
  });

  describe('hasEnvExample', () => {
    it('should find .env.example file', () => {
      fs.writeFileSync(path.join(tempDir, '.env.example'), 'KEY=value');
      const result = hasEnvExample(tempDir);
      expect(result).toBeDefined();
      expect(result).toContain('.env.example');
    });

    it('should find .env.sample file', () => {
      fs.writeFileSync(path.join(tempDir, '.env.sample'), 'KEY=value');
      const result = hasEnvExample(tempDir);
      expect(result).toBeDefined();
      expect(result).toContain('.env.sample');
    });

    it('should find .env.template file', () => {
      fs.writeFileSync(path.join(tempDir, '.env.template'), 'KEY=value');
      const result = hasEnvExample(tempDir);
      expect(result).toBeDefined();
      expect(result).toContain('.env.template');
    });

    it('should return undefined when no env example exists', () => {
      const result = hasEnvExample(tempDir);
      expect(result).toBeUndefined();
    });
  });

  describe('isEnvIgnored', () => {
    it('should return false when no .gitignore exists', () => {
      const result = isEnvIgnored(tempDir);
      expect(result).toBe(false);
    });

    it('should return true when .env is in gitignore', () => {
      fs.writeFileSync(path.join(tempDir, '.gitignore'), '.env\n');
      const result = isEnvIgnored(tempDir);
      expect(result).toBe(true);
    });

    it('should return true when *.env pattern is in gitignore', () => {
      fs.writeFileSync(path.join(tempDir, '.gitignore'), '*.env\n');
      const result = isEnvIgnored(tempDir);
      expect(result).toBe(true);
    });

    it('should return false when .env is not in gitignore', () => {
      fs.writeFileSync(path.join(tempDir, '.gitignore'), 'node_modules/\n');
      const result = isEnvIgnored(tempDir);
      expect(result).toBe(false);
    });
  });

  describe('ensureEnvInGitignore', () => {
    it('should create gitignore with .env if not exists', () => {
      ensureEnvInGitignore(tempDir);
      const gitignorePath = path.join(tempDir, '.gitignore');
      expect(fs.existsSync(gitignorePath)).toBe(true);
      const content = fs.readFileSync(gitignorePath, 'utf8');
      expect(content).toContain('.env');
    });

    it('should add .env to existing gitignore', () => {
      fs.writeFileSync(path.join(tempDir, '.gitignore'), 'node_modules/\n');
      ensureEnvInGitignore(tempDir);
      const content = fs.readFileSync(path.join(tempDir, '.gitignore'), 'utf8');
      expect(content).toContain('node_modules/');
      expect(content).toContain('.env');
    });

    it('should not duplicate .env if already present', () => {
      fs.writeFileSync(path.join(tempDir, '.gitignore'), '.env\n');
      ensureEnvInGitignore(tempDir);
      const content = fs.readFileSync(path.join(tempDir, '.gitignore'), 'utf8');
      const envCount = (content.match(/^\.env$/gm) || []).length;
      expect(envCount).toBe(1);
    });
  });
});
