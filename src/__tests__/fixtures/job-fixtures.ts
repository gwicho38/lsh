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

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Create a test job specification with sensible defaults.
 */
export function createTestJob(overrides: Partial<BaseJobSpec> = {}): BaseJobSpec {
  const id = `job_${Math.random().toString(36).substr(2, 9)}`;
  return {
    id,
    name: 'test-job',
    command: 'echo "test"',
    args: [],
    status: 'created',
    createdAt: new Date(),
    tags: [],
    priority: 5,
    maxRetries: 3,
    retryCount: 0,
    databaseSync: false, // Disable DB sync in tests by default
    ...overrides,
  };
}

/**
 * Create a test job execution record.
 */
export function createTestExecution(
  overrides: Partial<BaseJobExecution> = {}
): BaseJobExecution {
  const executionId = `exec_${Math.random().toString(36).substr(2, 9)}`;
  return {
    executionId,
    jobId: `job_${Math.random().toString(36).substr(2, 9)}`,
    jobName: 'test-job',
    command: 'echo "test"',
    startTime: new Date(),
    status: 'completed',
    exitCode: 0,
    ...overrides,
  };
}

/**
 * Create a scheduled job with cron expression.
 */
export function createScheduledJob(
  cronExpression: string,
  overrides: Partial<BaseJobSpec> = {}
): BaseJobSpec {
  return createTestJob({
    name: 'scheduled-job',
    command: './scripts/scheduled.sh',
    schedule: {
      cron: cronExpression,
    },
    ...overrides,
  });
}

/**
 * Create a job with interval scheduling.
 */
export function createIntervalJob(
  intervalMs: number,
  overrides: Partial<BaseJobSpec> = {}
): BaseJobSpec {
  return createTestJob({
    name: 'interval-job',
    command: './scripts/interval.sh',
    schedule: {
      interval: intervalMs,
    },
    ...overrides,
  });
}

// ============================================================================
// SAMPLE DATA
// ============================================================================

/**
 * Collection of sample jobs for different test scenarios.
 */
export const SAMPLE_JOBS = {
  /** Simple echo job */
  simple: createTestJob({
    id: 'job_simple',
    name: 'simple-job',
    command: 'echo "hello"',
  }),

  /** Job with environment variables */
  withEnv: createTestJob({
    id: 'job_with_env',
    name: 'env-job',
    command: 'printenv',
    env: {
      MY_VAR: 'test_value',
      ANOTHER_VAR: '123',
    },
  }),

  /** Job with arguments */
  withArgs: createTestJob({
    id: 'job_with_args',
    name: 'args-job',
    command: 'ls',
    args: ['-la', '/tmp'],
  }),

  /** Scheduled job (daily at midnight) */
  scheduled: createScheduledJob('0 0 * * *', {
    id: 'job_scheduled',
    name: 'daily-job',
  }),

  /** Interval job (every 5 minutes) */
  interval: createIntervalJob(5 * 60 * 1000, {
    id: 'job_interval',
    name: 'frequent-job',
  }),

  /** Long-running job with timeout */
  longRunning: createTestJob({
    id: 'job_long',
    name: 'long-running-job',
    command: 'sleep 300',
    timeout: 60000, // 1 minute timeout
  }),

  /** Job that will fail */
  failing: createTestJob({
    id: 'job_failing',
    name: 'failing-job',
    command: 'exit 1',
    maxRetries: 2,
  }),

  /** Completed job */
  completed: createTestJob({
    id: 'job_completed',
    name: 'completed-job',
    command: 'echo "done"',
    status: 'completed',
    startedAt: new Date(Date.now() - 1000),
    completedAt: new Date(),
    exitCode: 0,
    stdout: 'done\n',
  }),

  /** Failed job */
  failed: createTestJob({
    id: 'job_failed',
    name: 'failed-job',
    command: 'false',
    status: 'failed',
    startedAt: new Date(Date.now() - 1000),
    completedAt: new Date(),
    exitCode: 1,
    stderr: 'Command failed\n',
    retryCount: 3,
  }),

  /** Secrets rotation job (realistic example) */
  secretsRotation: createScheduledJob('0 2 1 * *', {
    id: 'job_secrets_rotation',
    name: 'rotate-api-keys',
    command: './examples/secrets-rotation/rotate-api-keys.sh',
    description: 'Monthly API key rotation',
    tags: ['secrets', 'maintenance', 'security'],
    env: {
      LSH_ENVIRONMENT: 'production',
      LOG_LEVEL: 'info',
    },
    timeout: 300000, // 5 minutes
  }),
};

/**
 * Sample execution records for testing history/statistics.
 */
export const SAMPLE_EXECUTIONS = {
  success: createTestExecution({
    executionId: 'exec_success',
    jobId: 'job_simple',
    status: 'completed',
    exitCode: 0,
    duration: 150,
    stdout: 'hello\n',
  }),

  failure: createTestExecution({
    executionId: 'exec_failure',
    jobId: 'job_failing',
    status: 'failed',
    exitCode: 1,
    duration: 50,
    stderr: 'Error: Command failed\n',
    errorMessage: 'Process exited with code 1',
  }),

  timeout: createTestExecution({
    executionId: 'exec_timeout',
    jobId: 'job_long',
    status: 'timeout',
    duration: 60000,
    errorMessage: 'Job exceeded timeout of 60000ms',
  }),

  killed: createTestExecution({
    executionId: 'exec_killed',
    jobId: 'job_simple',
    status: 'killed',
    duration: 5000,
    errorMessage: 'Process killed by signal SIGTERM',
  }),
};
