/**
 * Git Utilities
 * Helper functions for git repository detection and information extraction
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { createLogger } from './logger.js';

const logger = createLogger('GitUtils');

export interface GitRepoInfo {
  isGitRepo: boolean;
  rootPath?: string;
  repoName?: string;
  remoteUrl?: string;
  currentBranch?: string;
}

/**
 * Check if a directory is inside a git repository
 */
// TODO(@gwicho38): Review - isInGitRepo
export function isInGitRepo(dir: string = process.cwd()): boolean {
  try {
    execSync('git rev-parse --is-inside-work-tree', {
      cwd: dir,
      stdio: 'pipe',
      encoding: 'utf8',
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get git repository root path
 */
// TODO(@gwicho38): Review - getGitRootPath
export function getGitRootPath(dir: string = process.cwd()): string | undefined {
  try {
    const output = execSync('git rev-parse --show-toplevel', {
      cwd: dir,
      stdio: 'pipe',
      encoding: 'utf8',
    });
    return output.trim();
  } catch {
    return undefined;
  }
}

/**
 * Get git remote URL
 */
// TODO(@gwicho38): Review - getGitRemoteUrl
export function getGitRemoteUrl(dir: string = process.cwd()): string | undefined {
  try {
    const output = execSync('git remote get-url origin', {
      cwd: dir,
      stdio: 'pipe',
      encoding: 'utf8',
    });
    return output.trim();
  } catch {
    return undefined;
  }
}

/**
 * Extract repository name from git remote URL or directory name
 */
// TODO(@gwicho38): Review - extractRepoName
export function extractRepoName(remoteUrl?: string, rootPath?: string): string | undefined {
  if (remoteUrl) {
    // Extract from URL patterns:
    // git@github.com:user/repo.git -> repo
    // https://github.com/user/repo.git -> repo
    const match = remoteUrl.match(/[/:]([\w-]+?)(\.git)?$/);
    if (match) {
      return match[1];
    }
  }

  if (rootPath) {
    // Use directory name as fallback
    return path.basename(rootPath);
  }

  return undefined;
}

/**
 * Get current git branch
 */
// TODO(@gwicho38): Review - getCurrentBranch
export function getCurrentBranch(dir: string = process.cwd()): string | undefined {
  try {
    const output = execSync('git rev-parse --abbrev-ref HEAD', {
      cwd: dir,
      stdio: 'pipe',
      encoding: 'utf8',
    });
    return output.trim();
  } catch {
    return undefined;
  }
}

/**
 * Get comprehensive git repository information
 */
// TODO(@gwicho38): Review - getGitRepoInfo
export function getGitRepoInfo(dir: string = process.cwd()): GitRepoInfo {
  const isGitRepo = isInGitRepo(dir);

  if (!isGitRepo) {
    return { isGitRepo: false };
  }

  const rootPath = getGitRootPath(dir);
  const remoteUrl = getGitRemoteUrl(dir);
  const repoName = extractRepoName(remoteUrl, rootPath);
  const currentBranch = getCurrentBranch(dir);

  return {
    isGitRepo: true,
    rootPath,
    repoName,
    remoteUrl,
    currentBranch,
  };
}

/**
 * Check if .env.example exists in the repo
 */
// TODO(@gwicho38): Review - hasEnvExample
export function hasEnvExample(dir: string = process.cwd()): string | undefined {
  const patterns = ['.env.example', '.env.sample', '.env.template'];

  for (const pattern of patterns) {
    const filePath = path.join(dir, pattern);
    if (fs.existsSync(filePath)) {
      return filePath;
    }
  }

  return undefined;
}

/**
 * Check if .gitignore exists and contains .env
 */
// TODO(@gwicho38): Review - isEnvIgnored
export function isEnvIgnored(dir: string = process.cwd()): boolean {
  const gitignorePath = path.join(dir, '.gitignore');

  if (!fs.existsSync(gitignorePath)) {
    return false;
  }

  try {
    const content = fs.readFileSync(gitignorePath, 'utf8');
    const lines = content.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      // Check for .env or *.env patterns
      if (trimmed === '.env' || trimmed === '*.env' || trimmed.includes('.env')) {
        return true;
      }
    }

    return false;
  } catch (error) {
    const err = error as Error;
    logger.warn(`Failed to read .gitignore: ${err.message}`);
    return false;
  }
}

/**
 * Add .env to .gitignore if not already present
 */
// TODO(@gwicho38): Review - ensureEnvInGitignore
export function ensureEnvInGitignore(dir: string = process.cwd()): void {
  const gitignorePath = path.join(dir, '.gitignore');

  if (isEnvIgnored(dir)) {
    return; // Already ignored
  }

  try {
    let content = '';

    if (fs.existsSync(gitignorePath)) {
      content = fs.readFileSync(gitignorePath, 'utf8');
      // Ensure newline at end
      if (!content.endsWith('\n')) {
        content += '\n';
      }
    }

    content += '\n# Environment variables (managed by LSH)\n.env\n.env.local\n.env.*.local\n';

    fs.writeFileSync(gitignorePath, content, 'utf8');
    logger.info('✅ Added .env to .gitignore');
  } catch (error) {
    const err = error as Error;
    logger.warn(`Failed to update .gitignore: ${err.message}`);
  }
}

export default {
  isInGitRepo,
  getGitRootPath,
  getGitRemoteUrl,
  extractRepoName,
  getCurrentBranch,
  getGitRepoInfo,
  hasEnvExample,
  isEnvIgnored,
  ensureEnvInGitignore,
};
