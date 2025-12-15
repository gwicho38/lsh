/**
 * Job Fixtures for Testing
 *
 * Provides factory functions and sample data for testing job-related functionality.
 *
 * @example
 * ```typescript
 * import { createTestJob, SAMPLE_JOBS } from '../fixtures/job-fixtures';
 *
 * const job = createTestJob({ name: 'my-test-job', command: 'echo test' });
 * ```
 */
import type { BaseJobSpec, BaseJobExecution } from '../../lib/base-job-manager.js';
/**
 * Create a test job specification with sensible defaults.
 */
export declare function createTestJob(overrides?: Partial<BaseJobSpec>): BaseJobSpec;
/**
 * Create a test job execution record.
 */
export declare function createTestExecution(overrides?: Partial<BaseJobExecution>): BaseJobExecution;
/**
 * Create a scheduled job with cron expression.
 */
export declare function createScheduledJob(cronExpression: string, overrides?: Partial<BaseJobSpec>): BaseJobSpec;
/**
 * Create a job with interval scheduling.
 */
export declare function createIntervalJob(intervalMs: number, overrides?: Partial<BaseJobSpec>): BaseJobSpec;
/**
 * Collection of sample jobs for different test scenarios.
 */
export declare const SAMPLE_JOBS: {
    /** Simple echo job */
    simple: BaseJobSpec;
    /** Job with environment variables */
    withEnv: BaseJobSpec;
    /** Job with arguments */
    withArgs: BaseJobSpec;
    /** Scheduled job (daily at midnight) */
    scheduled: BaseJobSpec;
    /** Interval job (every 5 minutes) */
    interval: BaseJobSpec;
    /** Long-running job with timeout */
    longRunning: BaseJobSpec;
    /** Job that will fail */
    failing: BaseJobSpec;
    /** Completed job */
    completed: BaseJobSpec;
    /** Failed job */
    failed: BaseJobSpec;
    /** Secrets rotation job (realistic example) */
    secretsRotation: BaseJobSpec;
};
/**
 * Sample execution records for testing history/statistics.
 */
export declare const SAMPLE_EXECUTIONS: {
    success: BaseJobExecution;
    failure: BaseJobExecution;
    timeout: BaseJobExecution;
    killed: BaseJobExecution;
};
