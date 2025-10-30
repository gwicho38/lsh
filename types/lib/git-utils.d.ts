/**
 * Git Utilities
 * Helper functions for git repository detection and information extraction
 */
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
export declare function isInGitRepo(dir?: string): boolean;
/**
 * Get git repository root path
 */
export declare function getGitRootPath(dir?: string): string | undefined;
/**
 * Get git remote URL
 */
export declare function getGitRemoteUrl(dir?: string): string | undefined;
/**
 * Extract repository name from git remote URL or directory name
 */
export declare function extractRepoName(remoteUrl?: string, rootPath?: string): string | undefined;
/**
 * Get current git branch
 */
export declare function getCurrentBranch(dir?: string): string | undefined;
/**
 * Get comprehensive git repository information
 */
export declare function getGitRepoInfo(dir?: string): GitRepoInfo;
/**
 * Check if .env.example exists in the repo
 */
export declare function hasEnvExample(dir?: string): string | undefined;
/**
 * Check if .gitignore exists and contains .env
 */
export declare function isEnvIgnored(dir?: string): boolean;
/**
 * Add .env to .gitignore if not already present
 */
export declare function ensureEnvInGitignore(dir?: string): void;
declare const _default: {
    isInGitRepo: typeof isInGitRepo;
    getGitRootPath: typeof getGitRootPath;
    getGitRemoteUrl: typeof getGitRemoteUrl;
    extractRepoName: typeof extractRepoName;
    getCurrentBranch: typeof getCurrentBranch;
    getGitRepoInfo: typeof getGitRepoInfo;
    hasEnvExample: typeof hasEnvExample;
    isEnvIgnored: typeof isEnvIgnored;
    ensureEnvInGitignore: typeof ensureEnvInGitignore;
};
export default _default;
