/**
 * Git Utilities Tests
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';
import {
  isInGitRepo,
  getGitRootPath,
  getGitRemoteUrl,
  extractRepoName,
  getCurrentBranch,
  getGitRepoInfo,
  hasEnvExample,
  isEnvIgnored,
  ensureEnvInGitignore,
} from '../lib/git-utils.js';

describe('Git Utilities', () => {
  let testDir: string;
  let originalCwd: string;

  beforeEach(() => {
    // Create temp directory for tests
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lsh-git-test-'));
    originalCwd = process.cwd();
    process.chdir(testDir);
  });

  afterEach(() => {
    // Restore original directory
    process.chdir(originalCwd);

    // Clean up test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('isInGitRepo', () => {
    it('should return false for non-git directory', () => {
      expect(isInGitRepo(testDir)).toBe(false);
    });

    it('should return true for git repository', () => {
      execSync('git init', { cwd: testDir, stdio: 'pipe' });
      expect(isInGitRepo(testDir)).toBe(true);
    });
  });

  describe('getGitRootPath', () => {
    it('should return undefined for non-git directory', () => {
      expect(getGitRootPath(testDir)).toBeUndefined();
    });

    it('should return root path for git repository', () => {
      execSync('git init', { cwd: testDir, stdio: 'pipe' });
      const root = getGitRootPath(testDir);
      // Use fs.realpathSync to resolve symlinks (macOS has /var -> /private/var symlink)
      expect(fs.realpathSync(root!)).toBe(fs.realpathSync(testDir));
    });

    it('should return root path from subdirectory', () => {
      execSync('git init', { cwd: testDir, stdio: 'pipe' });
      const subDir = path.join(testDir, 'subdir');
      fs.mkdirSync(subDir);

      const root = getGitRootPath(subDir);
      // Use fs.realpathSync to resolve symlinks (macOS has /var -> /private/var symlink)
      expect(fs.realpathSync(root!)).toBe(fs.realpathSync(testDir));
    });
  });

  describe('getGitRemoteUrl', () => {
    it('should return undefined for repo without remote', () => {
      execSync('git init', { cwd: testDir, stdio: 'pipe' });
      expect(getGitRemoteUrl(testDir)).toBeUndefined();
    });

    it('should return remote URL when set', () => {
      execSync('git init', { cwd: testDir, stdio: 'pipe' });
      execSync('git remote add origin https://github.com/user/test-repo.git', {
        cwd: testDir,
        stdio: 'pipe',
      });

      const remoteUrl = getGitRemoteUrl(testDir);
      expect(remoteUrl).toBe('https://github.com/user/test-repo.git');
    });
  });

  describe('extractRepoName', () => {
    it('should extract name from HTTPS URL', () => {
      expect(extractRepoName('https://github.com/user/my-repo.git')).toBe('my-repo');
    });

    it('should extract name from SSH URL', () => {
      expect(extractRepoName('git@github.com:user/another-repo.git')).toBe('another-repo');
    });

    it('should extract name from URL without .git', () => {
      expect(extractRepoName('https://github.com/user/test-repo')).toBe('test-repo');
    });

    it('should use directory name as fallback', () => {
      expect(extractRepoName(undefined, '/path/to/my-project')).toBe('my-project');
    });

    it('should return undefined if no URL or path', () => {
      expect(extractRepoName(undefined, undefined)).toBeUndefined();
    });
  });

  describe('getCurrentBranch', () => {
    it('should return undefined for non-git directory', () => {
      expect(getCurrentBranch(testDir)).toBeUndefined();
    });

    it('should return branch name for git repository', () => {
      execSync('git init', { cwd: testDir, stdio: 'pipe' });
      execSync('git config user.email "test@example.com"', { cwd: testDir, stdio: 'pipe' });
      execSync('git config user.name "Test User"', { cwd: testDir, stdio: 'pipe' });

      // Create initial commit to establish branch
      fs.writeFileSync(path.join(testDir, 'test.txt'), 'test');
      execSync('git add .', { cwd: testDir, stdio: 'pipe' });
      execSync('git commit -m "Initial commit"', { cwd: testDir, stdio: 'pipe' });

      const branch = getCurrentBranch(testDir);
      expect(branch).toBeTruthy();
      // Default branch could be 'main' or 'master' depending on git config
      expect(['main', 'master', 'dev']).toContain(branch);
    });
  });

  describe('getGitRepoInfo', () => {
    it('should return isGitRepo: false for non-git directory', () => {
      const info = getGitRepoInfo(testDir);
      expect(info.isGitRepo).toBe(false);
      expect(info.rootPath).toBeUndefined();
      expect(info.repoName).toBeUndefined();
    });

    it('should return complete info for git repository', () => {
      execSync('git init', { cwd: testDir, stdio: 'pipe' });
      execSync('git remote add origin https://github.com/user/test-repo.git', {
        cwd: testDir,
        stdio: 'pipe',
      });
      execSync('git config user.email "test@example.com"', { cwd: testDir, stdio: 'pipe' });
      execSync('git config user.name "Test User"', { cwd: testDir, stdio: 'pipe' });

      // Create initial commit
      fs.writeFileSync(path.join(testDir, 'test.txt'), 'test');
      execSync('git add .', { cwd: testDir, stdio: 'pipe' });
      execSync('git commit -m "Initial commit"', { cwd: testDir, stdio: 'pipe' });

      const info = getGitRepoInfo(testDir);
      expect(info.isGitRepo).toBe(true);
      // Use fs.realpathSync to resolve symlinks (macOS has /var -> /private/var symlink)
      expect(fs.realpathSync(info.rootPath!)).toBe(fs.realpathSync(testDir));
      expect(info.repoName).toBe('test-repo');
      expect(info.remoteUrl).toBe('https://github.com/user/test-repo.git');
      expect(info.currentBranch).toBeTruthy();
    });
  });

  describe('hasEnvExample', () => {
    it('should return undefined when no example files exist', () => {
      expect(hasEnvExample(testDir)).toBeUndefined();
    });

    it('should detect .env.example', () => {
      const examplePath = path.join(testDir, '.env.example');
      fs.writeFileSync(examplePath, 'TEST=value\n');

      const result = hasEnvExample(testDir);
      expect(result).toBe(examplePath);
    });

    it('should detect .env.sample', () => {
      const samplePath = path.join(testDir, '.env.sample');
      fs.writeFileSync(samplePath, 'TEST=value\n');

      const result = hasEnvExample(testDir);
      expect(result).toBe(samplePath);
    });

    it('should detect .env.template', () => {
      const templatePath = path.join(testDir, '.env.template');
      fs.writeFileSync(templatePath, 'TEST=value\n');

      const result = hasEnvExample(testDir);
      expect(result).toBe(templatePath);
    });

    it('should prioritize .env.example over others', () => {
      fs.writeFileSync(path.join(testDir, '.env.example'), 'TEST=value\n');
      fs.writeFileSync(path.join(testDir, '.env.sample'), 'TEST=value\n');

      const result = hasEnvExample(testDir);
      expect(result).toBe(path.join(testDir, '.env.example'));
    });
  });

  describe('isEnvIgnored', () => {
    it('should return false when no .gitignore exists', () => {
      expect(isEnvIgnored(testDir)).toBe(false);
    });

    it('should return true when .env is in .gitignore', () => {
      fs.writeFileSync(path.join(testDir, '.gitignore'), '.env\n');
      expect(isEnvIgnored(testDir)).toBe(true);
    });

    it('should return true when *.env pattern is in .gitignore', () => {
      fs.writeFileSync(path.join(testDir, '.gitignore'), '*.env\n');
      expect(isEnvIgnored(testDir)).toBe(true);
    });

    it('should return false when .env is not in .gitignore', () => {
      fs.writeFileSync(path.join(testDir, '.gitignore'), 'node_modules/\n');
      expect(isEnvIgnored(testDir)).toBe(false);
    });
  });

  describe('ensureEnvInGitignore', () => {
    it('should create .gitignore with .env if it does not exist', () => {
      ensureEnvInGitignore(testDir);

      const gitignorePath = path.join(testDir, '.gitignore');
      expect(fs.existsSync(gitignorePath)).toBe(true);

      const content = fs.readFileSync(gitignorePath, 'utf8');
      expect(content).toContain('.env');
    });

    it('should add .env to existing .gitignore', () => {
      const gitignorePath = path.join(testDir, '.gitignore');
      fs.writeFileSync(gitignorePath, 'node_modules/\n');

      ensureEnvInGitignore(testDir);

      const content = fs.readFileSync(gitignorePath, 'utf8');
      expect(content).toContain('node_modules/');
      expect(content).toContain('.env');
    });

    it('should not duplicate .env if already present', () => {
      const gitignorePath = path.join(testDir, '.gitignore');
      fs.writeFileSync(gitignorePath, '.env\n');

      ensureEnvInGitignore(testDir);

      const content = fs.readFileSync(gitignorePath, 'utf8');
      const matches = (content.match(/\.env/g) || []).length;
      expect(matches).toBeLessThanOrEqual(3); // .env, .env.local, .env.*.local
    });
  });
});
