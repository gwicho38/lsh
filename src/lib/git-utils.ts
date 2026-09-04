/**
 * Git Utilities
 * Helper functions for git repository detection and information extraction
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { createLogger } from './logger.js';
import { ENV_GITIGNORE_PATTERNS, ENV_GITIGNORE_HEADER } from '../constants/paths.js';

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
 * Add each pattern in ENV_GITIGNORE_PATTERNS, plus any caller-supplied `extraPatterns`, to
 * .gitignore that isn't already there as an exact line. Unlike isEnvIgnored's fuzzy "is .env
 * covered by something" check, this compares per pattern so a .gitignore that already has a
 * bare `.env` line still gains the newer `.env.copyfrom.*` / `.env.backup.*` patterns instead
 * of being skipped wholesale. Only ever appends — an existing line is never touched, reordered,
 * or duplicated.
 */
export function ensureEnvInGitignore(dir: string = process.cwd(), extraPatterns: readonly string[] = []): void {
  const gitignorePath = path.join(dir, '.gitignore');

  try {
    let content = fs.existsSync(gitignorePath) ? fs.readFileSync(gitignorePath, 'utf8') : '';

    const existingLines = new Set(content.split('\n').map((line) => line.trim()));
    const patterns = Array.from(new Set([...ENV_GITIGNORE_PATTERNS, ...extraPatterns]));
    const missing = patterns.filter((pattern) => !existingLines.has(pattern));
    if (missing.length === 0) {
      return; // Every pattern is already an exact line in the file.
    }

    if (content && !content.endsWith('\n')) {
      content += '\n';
    }
    if (!existingLines.has(ENV_GITIGNORE_HEADER)) {
      content += `\n${ENV_GITIGNORE_HEADER}\n`;
    }
    content += `${missing.join('\n')}\n`;

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
