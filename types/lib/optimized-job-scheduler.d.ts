/**
 * Optimized Job Scheduler
 *
 * A priority queue-based job scheduler that efficiently manages scheduled jobs.
 * Instead of linearly scanning all jobs every 2 seconds, this scheduler uses
 * a min-heap to only check jobs that are actually due.
 *
 * Performance Improvements:
 * - O(log n) job insertion/removal vs O(n) linear scan
 * - O(1) to check if any jobs are due
 * - Only processes jobs that are actually due
 * - Smart sleep intervals based on next job time
 *
 * @see Issue #108: PERFORMANCE: Optimize daemon job scheduling algorithm
 */
import { BaseJobSpec } from './base-job-manager.js';
import { EventEmitter } from 'events';
/**
 * Entry in the scheduler's priority queue
 */
export interface SchedulerEntry {
    /** Job ID for lookup */
    jobId: string;
    /** Job name for logging */
    jobName: string;
    /** Next scheduled run time (epoch ms) */
    nextRun: number;
    /** Original job specification */
    job: BaseJobSpec;
}
/**
 * Scheduler metrics for monitoring
 */
export interface SchedulerMetrics {
    /** Total jobs in scheduler */
    totalJobs: number;
    /** Jobs currently due */
    dueJobs: number;
    /** Timestamp of next scheduled check */
    nextCheckTime: number;
    /** Average check duration in ms */
    averageCheckTime: number;
    /** Memory usage estimate in bytes */
    memoryUsage: number;
    /** Total checks performed */
    totalChecks: number;
    /** Total jobs executed */
    totalExecuted: number;
}
/**
 * Configuration for the optimized scheduler
 */
export interface SchedulerConfig {
    /** Minimum check interval in ms (default: 100) */
    minCheckInterval: number;
    /** Maximum check interval in ms (default: 60000) */
    maxCheckInterval: number;
    /** Buffer time before job is due in ms (default: 50) */
    dueBuffer: number;
    /** Enable debug logging (default: false) */
    debug: boolean;
}
export declare class OptimizedJobScheduler extends EventEmitter {
    private heap;
    private jobMap;
    private config;
    private logger;
    private checkTimer?;
    private isRunning;
    private lastRunTimes;
    private metrics;
    private checkTimings;
    private readonly MAX_TIMING_SAMPLES;
    constructor(config?: Partial<SchedulerConfig>);
    /**
     * Start the scheduler
     */
    start(): void;
    /**
     * Stop the scheduler
     */
    stop(): void;
    /**
     * Add a job to the scheduler
     * @param job The job specification
     */
    addJob(job: BaseJobSpec): void;
    /**
     * Remove a job from the scheduler
     * @param jobId The job ID to remove
     * @returns true if removed, false if not found
     */
    removeJob(jobId: string): boolean;
    /**
     * Update a job in the scheduler
     * @param job Updated job specification
     */
    updateJob(job: BaseJobSpec): void;
    /**
     * Get jobs that are currently due
     * @returns Array of jobs ready to execute
     */
    getDueJobs(): BaseJobSpec[];
    /**
     * Check and execute due jobs
     * Emits 'jobDue' event for each job that should be executed
     */
    checkScheduledJobs(): BaseJobSpec[];
    /**
     * Get scheduler metrics
     */
    getMetrics(): SchedulerMetrics;
    /**
     * Calculate the next run time for a job
     * @param job The job specification
     * @param fromDate Optional date to calculate from (used for rescheduling after due)
     * @param forceRecalculate If true, ignore existing nextRun and calculate fresh
     */
    private calculateNextRun;
    /**
     * Calculate next cron run time
     */
    private getNextCronRun;
    /**
     * Match a single cron field against a value
     */
    private matchesCronField;
    /**
     * Schedule the next check based on when jobs are due
     */
    private scheduleNextCheck;
    /**
     * Record check timing for metrics
     */
    private recordCheckTiming;
    /**
     * Estimate memory usage
     */
    private estimateMemoryUsage;
    /**
     * Get time until next job is due
     */
    getTimeUntilNextJob(): number | null;
    /**
     * Get all scheduled jobs (for debugging/status)
     */
    getAllJobs(): SchedulerEntry[];
}
export default OptimizedJobScheduler;
