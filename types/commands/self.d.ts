/**
 * Self-management commands for LSH
 * Provides utilities for updating and maintaining the CLI
 */
import { Command } from 'commander';
/** GitHub workflow run (minimal interface for CI check) */
interface GitHubWorkflowRun {
    head_branch: string;
    status: string;
    conclusion: string;
    html_url: string;
}
declare const selfCommand: Command;
/**
 * Decide build status from the build workflow's runs (pure, unit-testable).
 *
 * Only a real `failure` on the most recent COMPLETED run blocks an update.
 * `cancelled` / `skipped` / `null` are infra noise — the build is frequently
 * cancelled by concurrency on the self-hosted runner — and must NOT be reported
 * as a failing build. No completed runs → treat as passing (don't block).
 */
export declare function evaluateBuildRuns(runs: GitHubWorkflowRun[]): {
    passing: boolean;
    url?: string;
};
export default selfCommand;
