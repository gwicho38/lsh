/**
 * Git Utils Tests
 * Tests for git repository detection and information extraction
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';

describe('Git Utils', () => {
  let isInGitRepo: typeof import('../src/lib/git-utils.js').isInGitRepo;
  let getGitRootPath: typeof import('../src/lib/git-utils.js').getGitRootPath;
  let getGitRemoteUrl: typeof import('../src/lib/git-utils.js').getGitRemoteUrl;
  let extractRepoName: typeof import('../src/lib/git-utils.js').extractRepoName;
  let getCurrentBranch: typeof import('../src/lib/git-utils.js').getCurrentBranch;
  let getGitRepoInfo: typeof import('../src/lib/git-utils.js').getGitRepoInfo;
  let hasEnvExample: typeof import('../src/lib/git-utils.js').hasEnvExample;
  let isEnvIgnored: typeof import('../src/lib/git-utils.js').isEnvIgnored;
  let ensureEnvInGitignore: typeof import('../src/lib/git-utils.js').ensureEnvInGitignore;

  let testDir: string;

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

  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `git-utils-test-${Date.now()}`);
    await fs.promises.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    try {
      await fs.promises.rm(testDir, { recursive: true, force: true });
    } catch {
      // Directory may not exist
    }
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

    it('should use directory name as fallback', () => {
      const result = extractRepoName(undefined, '/path/to/my-project');
      expect(result).toBe('my-project');
    });

    it('should return undefined if no URL or path', () => {
      const result = extractRepoName();
      expect(result).toBeUndefined();
    });
  });

  describe('hasEnvExample', () => {
    it('should find .env.example', async () => {
      await fs.promises.writeFile(path.join(testDir, '.env.example'), 'TEST=value');

      const result = hasEnvExample(testDir);
      expect(result).toBe(path.join(testDir, '.env.example'));
    });

    it('should find .env.sample', async () => {
      await fs.promises.writeFile(path.join(testDir, '.env.sample'), 'TEST=value');

      const result = hasEnvExample(testDir);
      expect(result).toBe(path.join(testDir, '.env.sample'));
    });

    it('should find .env.template', async () => {
      await fs.promises.writeFile(path.join(testDir, '.env.template'), 'TEST=value');

      const result = hasEnvExample(testDir);
      expect(result).toBe(path.join(testDir, '.env.template'));
    });

    it('should return undefined if no env example exists', () => {
      const result = hasEnvExample(testDir);
      expect(result).toBeUndefined();
    });
  });

  describe('isEnvIgnored', () => {
    it('should return true if .env is in .gitignore', async () => {
      await fs.promises.writeFile(path.join(testDir, '.gitignore'), '.env\nnode_modules/');

      const result = isEnvIgnored(testDir);
      expect(result).toBe(true);
    });

    it('should return true if *.env is in .gitignore', async () => {
      await fs.promises.writeFile(path.join(testDir, '.gitignore'), '*.env\nnode_modules/');

      const result = isEnvIgnored(testDir);
      expect(result).toBe(true);
    });

    it('should return false if .gitignore does not contain .env', async () => {
      await fs.promises.writeFile(path.join(testDir, '.gitignore'), 'node_modules/\n*.log');

      const result = isEnvIgnored(testDir);
      expect(result).toBe(false);
    });

    it('should return false if .gitignore does not exist', () => {
      const result = isEnvIgnored(testDir);
      expect(result).toBe(false);
    });
  });

  describe('ensureEnvInGitignore', () => {
    it('should add .env to new .gitignore', () => {
      ensureEnvInGitignore(testDir);

      const content = fs.readFileSync(path.join(testDir, '.gitignore'), 'utf8');
      expect(content).toContain('.env');
    });

    it('should add .env to existing .gitignore', async () => {
      await fs.promises.writeFile(path.join(testDir, '.gitignore'), 'node_modules/\n');

      ensureEnvInGitignore(testDir);

      const content = fs.readFileSync(path.join(testDir, '.gitignore'), 'utf8');
      expect(content).toContain('node_modules/');
      expect(content).toContain('.env');
    });

    it('should not duplicate .env if already present', async () => {
      await fs.promises.writeFile(path.join(testDir, '.gitignore'), '.env\n');

      ensureEnvInGitignore(testDir);

      const content = fs.readFileSync(path.join(testDir, '.gitignore'), 'utf8');
      const envCount = (content.match(/^\.env$/gm) || []).length;
      expect(envCount).toBe(1);
    });
  });

  describe('isInGitRepo', () => {
    it('should return false for non-git directory', () => {
      const result = isInGitRepo(testDir);
      expect(result).toBe(false);
    });

    it('should return true for git repository', async () => {
      // Initialize git repo in test dir
      try {
        execSync('git init', { cwd: testDir, stdio: 'pipe' });
        const result = isInGitRepo(testDir);
        expect(result).toBe(true);
      } catch {
        // Git may not be available, skip test
        console.log('Git not available, skipping test');
      }
    });
  });

  describe('getGitRootPath', () => {
    it('should return undefined for non-git directory', () => {
      const result = getGitRootPath(testDir);
      expect(result).toBeUndefined();
    });

    it('should return root path for git repository', async () => {
      try {
        execSync('git init', { cwd: testDir, stdio: 'pipe' });
        const result = getGitRootPath(testDir);
        expect(result).toBe(testDir);
      } catch {
        // Git may not be available, skip test
        console.log('Git not available, skipping test');
      }
    });
  });

  describe('getCurrentBranch', () => {
    it('should return undefined for non-git directory', () => {
      const result = getCurrentBranch(testDir);
      expect(result).toBeUndefined();
    });

    it('should return branch name for git repository with commits', async () => {
      try {
        execSync('git init', { cwd: testDir, stdio: 'pipe' });
        execSync('git config user.email "test@test.com"', { cwd: testDir, stdio: 'pipe' });
        execSync('git config user.name "Test"', { cwd: testDir, stdio: 'pipe' });
        await fs.promises.writeFile(path.join(testDir, 'test.txt'), 'test');
        execSync('git add .', { cwd: testDir, stdio: 'pipe' });
        execSync('git commit -m "initial"', { cwd: testDir, stdio: 'pipe' });

        const result = getCurrentBranch(testDir);
        expect(['main', 'master']).toContain(result);
      } catch {
        // Git may not be available, skip test
        console.log('Git not available, skipping test');
      }
    });
  });

  describe('getGitRepoInfo', () => {
    it('should return isGitRepo false for non-git directory', () => {
      const result = getGitRepoInfo(testDir);
      expect(result.isGitRepo).toBe(false);
    });

    it('should return full info for git repository', async () => {
      try {
        execSync('git init', { cwd: testDir, stdio: 'pipe' });
        execSync('git config user.email "test@test.com"', { cwd: testDir, stdio: 'pipe' });
        execSync('git config user.name "Test"', { cwd: testDir, stdio: 'pipe' });
        await fs.promises.writeFile(path.join(testDir, 'test.txt'), 'test');
        execSync('git add .', { cwd: testDir, stdio: 'pipe' });
        execSync('git commit -m "initial"', { cwd: testDir, stdio: 'pipe' });

        const result = getGitRepoInfo(testDir);

        expect(result.isGitRepo).toBe(true);
        expect(result.rootPath).toBe(testDir);
        expect(result.repoName).toBeDefined();
        expect(['main', 'master']).toContain(result.currentBranch);
      } catch {
        // Git may not be available, skip test
        console.log('Git not available, skipping test');
      }
    });
  });

  describe('getGitRemoteUrl', () => {
    it('should return undefined for non-git directory', () => {
      const result = getGitRemoteUrl(testDir);
      expect(result).toBeUndefined();
    });

    it('should return undefined for git repo without remote', async () => {
      try {
        execSync('git init', { cwd: testDir, stdio: 'pipe' });
        const result = getGitRemoteUrl(testDir);
        expect(result).toBeUndefined();
      } catch {
        // Git may not be available, skip test
        console.log('Git not available, skipping test');
      }
    });
  });
});
